# Garena Free Fire Top-Up Automation System

## Overview
This is a fully automated system for Garena Free Fire diamond top-up using:
- **Playwright** for browser automation
- **Browserless BaaS v2** for cloud browser infrastructure
- **SolveCaptcha API** for CAPTCHA solving
- **FastAPI** backend with async operations
- **React** frontend for management interface

## Features

### ✅ Automated Flow
1. Navigate to shop.garena.my
2. Select Free Fire game
3. Handle logout if already logged in
4. Perform login with credentials
5. Solve CAPTCHA (slider/reCAPTCHA)
6. Fill player UID
7. Verify player username
8. Select diamond package
9. Proceed to payment
10. Select wallet payment
11. Enter PIN and confirm
12. Verify success

### 🔧 Backend Features
- Background task processing
- Order queue management
- Status tracking (queued, processing, completed, failed, manual_pending)
- Automatic retry mechanism
- Screenshot capture at each step
- Comprehensive error handling
- MongoDB integration for order persistence

### 🎨 Frontend Features
- Real-time order dashboard
- Statistics overview
- Order creation form
- Order history with filtering
- Retry button for failed orders
- Screenshot access
- Auto-refresh capability

## API Endpoints

### 1. Create Top-Up Order
```
POST /api/automation/topup
```
**Body:**
```json
{
  \"player_uid\": \"301372144\",
  \"diamond_amount\": 25,
  \"order_id\": \"optional-custom-id\"
}
```

**Response:**
```json
{
  \"order_id\": \"uuid\",
  \"status\": \"queued\",
  \"player_uid\": \"301372144\",
  \"diamond_amount\": 25,
  \"message\": \"Order queued for processing\",
  \"screenshots\": [],
  \"created_at\": \"2025-01-13T10:00:00Z\"
}
```

### 2. Get Orders
```
GET /api/automation/orders?status=completed&limit=50
```

**Response:**
```json
[
  {
    \"order_id\": \"uuid\",
    \"status\": \"completed\",
    \"player_uid\": \"301372144\",
    \"diamond_amount\": 25,
    \"message\": \"Successfully topped up 25 diamonds\",
    \"screenshots\": [\"/tmp/garena_screenshots/...\"],
    \"created_at\": \"2025-01-13T10:00:00Z\",
    \"completed_at\": \"2025-01-13T10:02:30Z\"
  }
]
```

### 3. Get Single Order
```
GET /api/automation/orders/{order_id}
```

### 4. Retry Failed Order
```
POST /api/automation/orders/{order_id}/retry
```

### 5. Get Statistics
```
GET /api/automation/stats
```

**Response:**
```json
{
  \"total_orders\": 100,
  \"completed\": 85,
  \"failed\": 10,
  \"manual_pending\": 5,
  \"processing\": 0,
  \"queued\": 0,
  \"success_rate\": 85.0
}
```

## Configuration

### Backend Configuration
File: `/app/backend/garena_automation.py`

```python
class Config:
    # Browserless
    BROWSERLESS_TOKEN = \"your-token\"
    
    # SolveCaptcha
    SOLVECAPTCHA_API_KEY = \"your-api-key\"
    
    # Garena Credentials (move to env in production)
    GARENA_EMAIL = \"email@gmail.com\"
    GARENA_PASSWORD = \"password\"
    GARENA_PIN = \"121212\"
    
    # Test Configuration
    TEST_PLAYER_UID = \"301372144\"
    TEST_DIAMOND_AMOUNT = 25
```

### Environment Variables
For production, move sensitive data to `.env` file:

```bash
# Backend .env
BROWSERLESS_TOKEN=your-token
SOLVECAPTCHA_API_KEY=your-api-key
GARENA_EMAIL=email@gmail.com
GARENA_PASSWORD=password
GARENA_PIN=121212
```

## Testing

### CLI Test
```bash
cd /app/backend
python test_automation.py
```

### API Test
```bash
# Create order
curl -X POST http://localhost:8001/api/automation/topup \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"player_uid\":\"301372144\",\"diamond_amount\":25}'

# Get orders
curl http://localhost:8001/api/automation/orders

# Get stats
curl http://localhost:8001/api/automation/stats
```

### Frontend Test
1. Open browser: `http://localhost:3000`
2. Fill in Player UID: `301372144`
3. Select Diamond Amount: `25`
4. Click \"Create Order\"
5. Watch order progress in real-time

## Order Status Flow

```
queued → processing → completed ✅
                   → failed ❌ (can retry)
                   → manual_pending ⚠️ (needs manual intervention)
```

### Status Descriptions:
- **queued**: Order created, waiting to be processed
- **processing**: Automation is currently running
- **completed**: Top-up successful
- **failed**: Automation failed (can retry)
- **manual_pending**: Requires manual intervention (CAPTCHA failed, insufficient balance, etc.)

## CAPTCHA Handling

The system supports two types of CAPTCHA:

### 1. reCAPTCHA v2
- Automatically detected via iframe
- Solved using SolveCaptcha API
- Solution injected into page

### 2. Slider CAPTCHA
- Detected by slider elements
- Simulates human-like drag behavior
- Random movements for anti-detection

### Fallback Behavior
If CAPTCHA solving fails:
1. Order status → `manual_pending`
2. Screenshot captured
3. Admin can review and retry
4. Alert created with details

## Screenshots

All screenshots are saved to: `/tmp/garena_screenshots/`

Naming pattern: `{step_name}_{timestamp}.png`

Examples:
- `01_shop_homepage_1673612345678.png`
- `05_credentials_entered_1673612346789.png`
- `15_purchase_complete_1673612347890.png`

## Error Handling

### Automatic Retry Logic
Failed orders can be retried with:
```bash
POST /api/automation/orders/{order_id}/retry
```

### Manual Intervention Triggers
Orders set to `manual_pending` when:
- CAPTCHA solving fails
- Login credentials rejected
- Insufficient wallet balance
- Payment method unavailable
- Unexpected page structure changes

## Production Checklist

- [ ] Move credentials to environment variables
- [ ] Set up proper database backup
- [ ] Configure log rotation
- [ ] Add authentication to API endpoints
- [ ] Set up monitoring/alerts
- [ ] Configure rate limiting
- [ ] Add webhook notifications
- [ ] Set up SSL certificates
- [ ] Configure firewall rules
- [ ] Add request validation

## Troubleshooting

### Browser Connection Failed
```
Error: Failed to connect to browser
```
**Solution:** Check Browserless token is valid

### CAPTCHA Timeout
```
Error: CAPTCHA solving timed out
```
**Solution:** Check SolveCaptcha API key and balance

### Login Failed
```
Error: Login failed
```
**Solution:** Verify Garena credentials are correct

### Element Not Found
```
Error: Element not found: selector
```
**Solution:** Page structure may have changed, update selectors in automation script

## Architecture

```
┌─────────────┐      HTTP      ┌──────────────┐
│   React     │ ────────────>  │   FastAPI    │
│   Frontend  │ <────────────  │   Backend    │
└─────────────┘                └──────────────┘
                                       │
                                       │ Background Task
                                       v
                                ┌──────────────┐
                                │  Automation  │
                                │    Worker    │
                                └──────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    v                  v                  v
             ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
             │ Browserless │   │ SolveCaptcha│   │   MongoDB   │
             │   BaaS v2   │   │     API     │   │  Database   │
             └─────────────┘   └─────────────┘   └─────────────┘
```

## Dependencies

### Backend
- `fastapi==0.110.1` - Web framework
- `playwright==1.57.0` - Browser automation
- `httpx>=0.28.1` - HTTP client for CAPTCHA API
- `motor==3.3.1` - Async MongoDB driver
- `pydantic>=2.6.4` - Data validation

### Frontend
- `react` - UI framework
- `react-router-dom` - Routing
- `axios` - HTTP client
- `tailwindcss` - Styling

## License
MIT

## Support
For issues or questions, please contact support or check the documentation.
