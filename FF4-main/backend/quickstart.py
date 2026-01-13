#!/usr/bin/env python3
"""
Quick Start Guide for Garena Automation
Run this to see all available commands
"""

print("""
╔════════════════════════════════════════════════════════════════╗
║         GARENA FREE FIRE AUTOMATION - QUICK START              ║
╔════════════════════════════════════════════════════════════════╗

📋 SYSTEM STATUS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Backend API:     http://localhost:8001/api
✅ Frontend UI:     http://localhost:3000
✅ Database:        MongoDB (running)
✅ Automation:      Playwright + Browserless BaaS v2
✅ CAPTCHA:         SolveCaptcha API

📊 TEST CREDENTIALS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Player UID:       301372144
Expected Name:    NAYAN XR
Diamond Amount:   25 (for testing)

Garena Email:     Nayankarki92@gmail.com
Garena Password:  Nayan@980
Garena PIN:       121212

🚀 QUICK START COMMANDS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣  Test via Frontend (Easiest):
   → Open browser: http://localhost:3000
   → Fill in UID: 301372144
   → Select Diamonds: 25
   → Click \"Create Order\"
   → Watch progress in real-time

2️⃣  Test via API:
   cd /app/backend
   ./test_api.sh

3️⃣  Test via Python Script:
   cd /app/backend
   python test_automation.py

4️⃣  Create Single Order (cURL):
   curl -X POST http://localhost:8001/api/automation/topup \\\\
     -H \"Content-Type: application/json\" \\\\
     -d '{\"player_uid\":\"301372144\",\"diamond_amount\":25}'

5️⃣  Check All Orders:
   curl http://localhost:8001/api/automation/orders

6️⃣  Check Statistics:
   curl http://localhost:8001/api/automation/stats

7️⃣  Retry Failed Order:
   curl -X POST http://localhost:8001/api/automation/orders/{ORDER_ID}/retry

📸 VIEW SCREENSHOTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ls -lah /tmp/garena_screenshots/

📝 VIEW LOGS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   # Backend logs
   tail -f /var/log/supervisor/backend.err.log

   # All services
   sudo supervisorctl status

🔄 RESTART SERVICES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   sudo supervisorctl restart backend
   sudo supervisorctl restart frontend
   sudo supervisorctl restart all

📚 DOCUMENTATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   /app/README_AUTOMATION.md           - Full documentation
   /app/IMPLEMENTATION_COMPLETE.md     - Implementation summary
   /app/backend/garena_automation.py   - Automation script
   /app/backend/server.py              - API endpoints

🎯 ORDER STATUS FLOW:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   queued → processing → completed ✅
                      → failed ❌ (can retry)
                      → manual_pending ⚠️ (needs attention)

⚙️  API ENDPOINTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   POST   /api/automation/topup                 - Create order
   GET    /api/automation/orders                - List orders
   GET    /api/automation/orders/{id}           - Get order
   POST   /api/automation/orders/{id}/retry     - Retry order
   GET    /api/automation/stats                 - Get statistics

🐛 TROUBLESHOOTING:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Problem: Order fails immediately
   → Check logs: tail -n 50 /var/log/supervisor/backend.err.log
   → Verify Browserless token is valid
   → Check Playwright version (should be 1.56.0)

   Problem: CAPTCHA not solving
   → Check SolveCaptcha API key
   → Verify SolveCaptcha balance
   → Check screenshots to see CAPTCHA type

   Problem: Login fails
   → Verify Garena credentials
   → Check if account needs 2FA
   → Review login screenshots

   Problem: Frontend not loading
   → Check: sudo supervisorctl status frontend
   → Restart: sudo supervisorctl restart frontend

📞 GETTING HELP:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   1. Check documentation: /app/README_AUTOMATION.md
   2. Review logs for errors
   3. Check screenshots to see where it failed
   4. Test API health: curl http://localhost:8001/api/

═══════════════════════════════════════════════════════════════════
           🎮 Ready to automate Free Fire top-ups! 🎮
═══════════════════════════════════════════════════════════════════
""")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        print("\n🧪 Running quick API test...\n")
        import subprocess
        subprocess.run(["bash", "/app/backend/test_api.sh"])