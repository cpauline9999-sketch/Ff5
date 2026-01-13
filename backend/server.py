from fastapi import FastAPI, APIRouter, BackgroundTasks, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import asyncio


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Garena Automation Models
class TopUpRequest(BaseModel):
    player_uid: str = Field(..., description="Free Fire Player UID")
    diamond_amount: int = Field(..., description="Diamond amount to top up")
    order_id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique order ID")

class TopUpResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    order_id: str
    status: str  # "processing", "completed", "failed", "manual_pending"
    player_uid: str
    diamond_amount: int
    message: str
    screenshots: List[str] = []
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

class AutomationLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    log_level: str  # "info", "warning", "error"
    message: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# ===== GARENA AUTOMATION ENDPOINTS =====

async def run_automation_task(order_id: str, player_uid: str, diamond_amount: int):
    """Background task to run Garena automation - Now using Node.js/Puppeteer"""
    try:
        # Update order status to processing
        await db.topup_orders.update_one(
            {"order_id": order_id},
            {"$set": {"status": "processing", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Run Node.js Puppeteer automation (V2 with improved selectors)
        import subprocess
        import json
        
        script_path = os.path.join(os.path.dirname(__file__), 'garena_automation_v2.js')
        config_json = json.dumps({"playerUid": player_uid, "diamondAmount": diamond_amount})
        
        logger.info(f"Running Node.js automation for order {order_id}")
        
        process = subprocess.Popen(
            ['node', script_path, config_json],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=os.path.dirname(__file__)
        )
        
        stdout, stderr = process.communicate(timeout=900)  # 15 min timeout
        
        # Parse result from Node.js
        try:
            result = json.loads(stdout.decode('utf-8').strip().split('\n')[-1])
        except:
            result = {
                "success": False,
                "message": "Failed to parse automation result",
                "error": "parse_error",
                "screenshots": []
            }
        
        # Update order with result
        update_data = {
            "status": "completed" if result["success"] else "failed",
            "message": result["message"],
            "screenshots": result.get("screenshots", []),
            "error": result.get("error"),
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # If CAPTCHA or manual intervention needed, set to manual_pending
        if result.get("error") in ["otp_required", "captcha_failed", "login_failed", "insufficient_balance"]:
            update_data["status"] = "manual_pending"
        
        await db.topup_orders.update_one(
            {"order_id": order_id},
            {"$set": update_data}
        )
        
        logger.info(f"Order {order_id} completed with status: {update_data['status']}")
        
    except subprocess.TimeoutExpired:
        logger.error(f"Automation task timed out for order {order_id}")
        await db.topup_orders.update_one(
            {"order_id": order_id},
            {"$set": {
                "status": "failed",
                "error": "timeout",
                "message": "Automation timed out after 15 minutes",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    except Exception as e:
        logger.error(f"Automation task failed for order {order_id}: {str(e)}")
        await db.topup_orders.update_one(
            {"order_id": order_id},
            {"$set": {
                "status": "failed",
                "error": str(e),
                "message": f"Automation exception: {str(e)}",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )

@api_router.post("/automation/topup", response_model=TopUpResponse)
async def trigger_topup(request: TopUpRequest, background_tasks: BackgroundTasks):
    """Trigger Garena Free Fire diamond top-up automation"""
    try:
        # Create order record
        order = TopUpResponse(
            order_id=request.order_id,
            status="queued",
            player_uid=request.player_uid,
            diamond_amount=request.diamond_amount,
            message="Order queued for processing"
        )
        
        # Save to database
        order_dict = order.model_dump()
        order_dict['created_at'] = order_dict['created_at'].isoformat()
        await db.topup_orders.insert_one(order_dict)
        
        # Add background task to run automation
        background_tasks.add_task(
            run_automation_task,
            request.order_id,
            request.player_uid,
            request.diamond_amount
        )
        
        logger.info(f"Top-up order {request.order_id} queued for UID: {request.player_uid}")
        return order
        
    except Exception as e:
        logger.error(f"Failed to trigger top-up: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/automation/orders", response_model=List[TopUpResponse])
async def get_orders(status: Optional[str] = None, limit: int = 50):
    """Get top-up orders with optional status filter"""
    try:
        query = {}
        if status:
            query["status"] = status
        
        orders = await db.topup_orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
        
        # Convert ISO strings back to datetime
        for order in orders:
            if isinstance(order.get('created_at'), str):
                order['created_at'] = datetime.fromisoformat(order['created_at'])
            if order.get('completed_at') and isinstance(order['completed_at'], str):
                order['completed_at'] = datetime.fromisoformat(order['completed_at'])
        
        return orders
        
    except Exception as e:
        logger.error(f"Failed to get orders: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/automation/orders/{order_id}", response_model=TopUpResponse)
async def get_order(order_id: str):
    """Get specific order details"""
    try:
        order = await db.topup_orders.find_one({"order_id": order_id}, {"_id": 0})
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Convert ISO strings back to datetime
        if isinstance(order.get('created_at'), str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
        if order.get('completed_at') and isinstance(order['completed_at'], str):
            order['completed_at'] = datetime.fromisoformat(order['completed_at'])
        
        return order
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get order: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/automation/orders/{order_id}/retry")
async def retry_order(order_id: str, background_tasks: BackgroundTasks):
    """Retry a failed or manual_pending order"""
    try:
        order = await db.topup_orders.find_one({"order_id": order_id}, {"_id": 0})
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        if order["status"] not in ["failed", "manual_pending"]:
            raise HTTPException(status_code=400, detail="Only failed or manual_pending orders can be retried")
        
        # Update status to queued
        await db.topup_orders.update_one(
            {"order_id": order_id},
            {"$set": {
                "status": "queued",
                "message": "Order re-queued for retry",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Add background task
        background_tasks.add_task(
            run_automation_task,
            order_id,
            order["player_uid"],
            order["diamond_amount"]
        )
        
        return {"message": "Order queued for retry", "order_id": order_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retry order: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/automation/stats")
async def get_automation_stats():
    """Get automation statistics"""
    try:
        total = await db.topup_orders.count_documents({})
        completed = await db.topup_orders.count_documents({"status": "completed"})
        failed = await db.topup_orders.count_documents({"status": "failed"})
        manual_pending = await db.topup_orders.count_documents({"status": "manual_pending"})
        processing = await db.topup_orders.count_documents({"status": "processing"})
        queued = await db.topup_orders.count_documents({"status": "queued"})
        
        return {
            "total_orders": total,
            "completed": completed,
            "failed": failed,
            "manual_pending": manual_pending,
            "processing": processing,
            "queued": queued,
            "success_rate": round((completed / total * 100) if total > 0 else 0, 2)
        }
        
    except Exception as e:
        logger.error(f"Failed to get stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()