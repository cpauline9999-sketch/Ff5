#!/usr/bin/env python3
"""
Test script for Garena automation
Run this to test the automation manually
"""

import asyncio
import logging
from garena_automation import GarenaAutomation, Config

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

async def main():
    print("="*60)
    print("GARENA FREE FIRE AUTOMATION TEST")
    print("="*60)
    print(f"\nTest Configuration:")
    print(f"  Player UID: {Config.TEST_PLAYER_UID}")
    print(f"  Diamond Amount: {Config.TEST_DIAMOND_AMOUNT}")
    print(f"  Garena Email: {Config.GARENA_EMAIL}")
    print(f"\nStarting automation...\n")
    
    automation = GarenaAutomation()
    result = await automation.run_topup(
        Config.TEST_PLAYER_UID,
        Config.TEST_DIAMOND_AMOUNT
    )
    
    print("\n" + "="*60)
    print("AUTOMATION RESULT")
    print("="*60)
    print(f"Success: {result['success']}")
    print(f"Message: {result['message']}")
    if result.get('error'):
        print(f"Error: {result['error']}")
    print(f"\nScreenshots taken: {len(result.get('screenshots', []))}")
    for i, screenshot in enumerate(result.get('screenshots', []), 1):
        print(f"  {i}. {screenshot}")
    print("="*60)

if __name__ == "__main__":
    asyncio.run(main())
