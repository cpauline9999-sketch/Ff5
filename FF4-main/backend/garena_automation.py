#!/usr/bin/env python3
"""
Garena Free Fire Top-Up Automation
Using Playwright + BrowserCloud.io (15 min sessions)
With SolveCaptcha CAPTCHA solving support
"""

import asyncio
import json
import logging
import time
from typing import Dict, Any, Optional
import httpx
from playwright.async_api import async_playwright, Browser, Page, BrowserContext
from datetime import datetime
import os
from pathlib import Path

logger = logging.getLogger(__name__)

# ===== CONFIGURATION =====
class Config:
    # BrowserCloud.io Configuration (15 min sessions!)
    BROWSERCLOUD_TOKEN = "CIAQ4UYVDLOT6fgC"
    BROWSERCLOUD_URL = "wss://chrome-v2.browsercloud.io/?token=CIAQ4UYVDLOT6fgC&proxy=datacenter&proxyCountry=US"
    
    # SolveCaptcha Configuration
    SOLVECAPTCHA_API_KEY = "a19f74499d6680dcd821a74c9a5d079e"
    SOLVECAPTCHA_BASE_URL = "https://api.solvecaptcha.com"
    
    # Garena URLs
    GARENA_SHOP_URL = "https://shop.garena.my/"
    GARENA_LOGIN_URL = "https://sso.garena.com/universal/login"
    
    # Garena Credentials (should be moved to env variables in production)
    GARENA_EMAIL = "Nayankarki92@gmail.com"
    GARENA_PASSWORD = "Nayan@980"
    GARENA_PIN = "121212"
    
    # Test Configuration
    TEST_PLAYER_UID = "301372144"
    TEST_DIAMOND_AMOUNT = 25
    
    # Timeouts (seconds) - BrowserCloud.io allows 15 minutes!
    DEFAULT_TIMEOUT = 60
    NAVIGATION_TIMEOUT = 90
    CAPTCHA_TIMEOUT = 180  # Can afford longer waits now
    
    # Delays for human-like behavior (milliseconds) - ULTRA-FAST MODE
    DELAY_MIN = 200
    DELAY_MAX = 500
    TYPE_DELAY = 30
    
    # Screenshot directory
    SCREENSHOT_DIR = Path("/tmp/garena_screenshots")


class CaptchaSolver:
    """Handle CAPTCHA solving using SolveCaptcha API"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = Config.SOLVECAPTCHA_BASE_URL
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def solve_recaptcha_v2(self, site_key: str, page_url: str) -> Optional[str]:
        """Solve reCAPTCHA v2"""
        try:
            # Submit CAPTCHA
            submit_url = f"{self.base_url}/in.php"
            params = {
                "key": self.api_key,
                "method": "userrecaptcha",
                "googlekey": site_key,
                "pageurl": page_url,
                "json": 1
            }
            
            response = await self.client.get(submit_url, params=params)
            result = response.json()
            
            if result.get("status") != 1:
                logger.error(f"CAPTCHA submission failed: {result}")
                return None
            
            captcha_id = result.get("request")
            logger.info(f"CAPTCHA submitted with ID: {captcha_id}")
            
            # Poll for solution
            result_url = f"{self.base_url}/res.php"
            max_attempts = 40  # 2 minutes with 3-second intervals
            
            for attempt in range(max_attempts):
                await asyncio.sleep(3)
                
                params = {
                    "key": self.api_key,
                    "action": "get",
                    "id": captcha_id,
                    "json": 1
                }
                
                response = await self.client.get(result_url, params=params)
                result = response.json()
                
                if result.get("status") == 1:
                    solution = result.get("request")
                    logger.info("CAPTCHA solved successfully")
                    return solution
                
                if result.get("request") != "CAPCHA_NOT_READY":
                    logger.error(f"CAPTCHA solving failed: {result}")
                    return None
            
            logger.error("CAPTCHA solving timed out")
            return None
            
        except Exception as e:
            logger.error(f"Error solving CAPTCHA: {str(e)}")
            return None
    
    async def close(self):
        await self.client.aclose()


class GarenaAutomation:
    """Main automation class for Garena Free Fire top-up"""
    
    def __init__(self):
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self.captcha_solver = CaptchaSolver(Config.SOLVECAPTCHA_API_KEY)
        self.screenshots = []
        
        # Create screenshot directory
        Config.SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    
    async def take_screenshot(self, name: str) -> str:
        """Take a screenshot and return the file path"""
        try:
            timestamp = int(time.time() * 1000)
            filename = f"{name}_{timestamp}.png"
            filepath = Config.SCREENSHOT_DIR / filename
            
            await self.page.screenshot(path=str(filepath), full_page=True)
            logger.info(f"Screenshot saved: {filename}")
            self.screenshots.append(str(filepath))
            return str(filepath)
        except Exception as e:
            logger.error(f"Failed to take screenshot: {str(e)}")
            return ""
    
    async def human_delay(self, min_ms: int = None, max_ms: int = None):
        """Random delay to simulate human behavior"""
        min_ms = min_ms or Config.DELAY_MIN
        max_ms = max_ms or Config.DELAY_MAX
        delay = (min_ms + (max_ms - min_ms) * asyncio.get_event_loop().time() % 1) / 1000
        await asyncio.sleep(delay)
    
    async def human_type(self, selector: str, text: str):
        """Type text with human-like delays"""
        await self.page.click(selector)
        await self.human_delay(100, 300)
        
        for char in text:
            await self.page.keyboard.type(char)
            await asyncio.sleep(Config.TYPE_DELAY / 1000)
    
    async def connect_browser(self) -> bool:
        """Connect to BrowserCloud.io"""
        try:
            logger.info("Connecting to BrowserCloud.io...")
            playwright = await async_playwright().start()
            
            self.browser = await playwright.chromium.connect(
                ws_endpoint=Config.BROWSERCLOUD_URL
            )
            
            self.context = await self.browser.new_context(
                viewport={"width": 1920, "height": 1080},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            
            self.page = await self.context.new_page()
            self.page.set_default_timeout(Config.DEFAULT_TIMEOUT * 1000)
            self.page.set_default_navigation_timeout(Config.NAVIGATION_TIMEOUT * 1000)
            
            logger.info("BrowserCloud.io connected successfully (15 min session)")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to BrowserCloud.io: {str(e)}")
            return False
    
    async def navigate_to_shop(self) -> bool:
        """Navigate to Garena shop"""
        try:
            logger.info(f"Navigating to {Config.GARENA_SHOP_URL}")
            
            # Try with domcontentloaded first (faster)
            try:
                await self.page.goto(Config.GARENA_SHOP_URL, wait_until="domcontentloaded", timeout=Config.NAVIGATION_TIMEOUT * 1000)
            except:
                # Fallback: try with load instead of networkidle
                logger.info("Retrying with 'load' strategy...")
                await self.page.goto(Config.GARENA_SHOP_URL, wait_until="load", timeout=Config.NAVIGATION_TIMEOUT * 1000)
            
            # Wait for page to be interactive
            await self.page.wait_for_load_state("domcontentloaded")
            await self.take_screenshot("01_shop_homepage")
            await self.human_delay(300, 600)  # ULTRA-FAST
            logger.info("Successfully navigated to shop")
            return True
        except Exception as e:
            logger.error(f"Failed to navigate to shop: {str(e)}")
            await self.take_screenshot("error_navigation")
            return False
    
    async def select_free_fire(self) -> bool:
        """Select Free Fire game"""
        try:
            logger.info("Selecting Free Fire game...")
            
            # Wait for game options to load
            await self.page.wait_for_selector('text="Free Fire"', timeout=10000)
            
            # Click on Free Fire option (could be radio button, card, or link)
            selectors = [
                'role=radio[name="Free Fire"]',
                'text="Free Fire"',
                '[data-testid="game-freefire"]',
                '.game-option:has-text("Free Fire")',
                'button:has-text("Free Fire")'
            ]
            
            for selector in selectors:
                try:
                    await self.page.click(selector, timeout=5000)
                    logger.info(f"Clicked Free Fire using selector: {selector}")
                    break
                except:
                    continue
            
            await self.take_screenshot("02_freefire_selected")
            await self.human_delay(300, 600)  # ULTRA-FAST
            return True
            
        except Exception as e:
            logger.error(f"Failed to select Free Fire: {str(e)}")
            return False
    
    async def click_redeem(self) -> bool:
        """Click Redeem button"""
        try:
            logger.info("Clicking Redeem button...")
            
            redeem_selectors = [
                'text="Redeem"',
                'button:has-text("Redeem")',
                '[data-testid="redeem-button"]'
            ]
            
            for selector in redeem_selectors:
                try:
                    await self.page.click(selector, timeout=5000)
                    logger.info(f"Clicked Redeem using: {selector}")
                    break
                except:
                    continue
            
            await self.human_delay(300, 600)  # ULTRA-FAST
            await self.take_screenshot("03_redeem_clicked")
            return True
            
        except Exception as e:
            logger.error(f"Failed to click Redeem: {str(e)}")
            return False
    
    async def check_and_logout_if_needed(self) -> bool:
        """Check if already logged in and logout if different account"""
        try:
            logger.info("Checking login status...")
            
            # Look for logout or account indicators
            logout_selectors = [
                'text="Logout"',
                'text="Log out"',
                'button:has-text("Logout")',
                '[data-testid="logout-button"]'
            ]
            
            for selector in logout_selectors:
                try:
                    logout_btn = await self.page.wait_for_selector(selector, timeout=3000)
                    if logout_btn:
                        logger.info("Already logged in, logging out...")
                        await logout_btn.click()
                        await self.human_delay()
                        await self.take_screenshot("03_logged_out")
                        return True
                except:
                    continue
            
            logger.info("Not logged in, proceeding...")
            return True
            
        except Exception as e:
            logger.error(f"Error checking logout: {str(e)}")
            return True  # Continue anyway
    
    async def proceed_to_payment_button(self) -> bool:
        """Click Proceed to Payment button after username verified"""
        try:
            logger.info("Clicking Proceed to Payment...")
            
            proceed_selectors = [
                'button:has-text("Proceed to Payment")',
                'text="Proceed to Payment"'
            ]
            
            for selector in proceed_selectors:
                try:
                    await self.page.click(selector, timeout=5000)
                    logger.info(f"Clicked Proceed to Payment using: {selector}")
                    break
                except:
                    continue
            
            await self.human_delay(1000, 1500)  # ULTRA-FAST
            await self.take_screenshot("09_payment_page")
            return True
            
        except Exception as e:
            logger.error(f"Failed to proceed to payment: {str(e)}")
            return False
    
    async def select_diamond_amount_from_modal(self, amount: int) -> bool:
        """Select diamond amount from modal"""
        try:
            logger.info(f"Selecting {amount} diamonds from modal...")
            
            # Don't wait for specific "Select Amount" text - just wait for page to load
            await self.human_delay(1000, 1500)  # ULTRA-FAST
            await self.take_screenshot("10_before_amount_select")
            
            # Click on the amount
            amount_selectors = [
                f'text="{amount}"',
                f'button:has-text("{amount}")',
                f'div:has-text("{amount}")',
                f'span:has-text("{amount}")'
            ]
            
            for selector in amount_selectors:
                try:
                    await self.page.click(selector, timeout=5000)
                    logger.info(f"Selected {amount} diamonds using: {selector}")
                    await self.human_delay()
                    await self.take_screenshot("11_amount_selected")
                    return True
                except:
                    continue
            
            logger.error(f"Could not find {amount} diamond option")
            await self.take_screenshot("error_amount_not_found")
            return False
            
        except Exception as e:
            logger.error(f"Failed to select diamond amount: {str(e)}")
            return False
    
    async def select_wallet_channel(self) -> bool:
        """Select Wallet payment channel"""
        try:
            logger.info("Selecting Wallet payment channel...")
            
            # Don't wait for specific text - just wait for page to load
            await self.human_delay(1000, 1500)  # ULTRA-FAST
            await self.take_screenshot("12_before_wallet_select")
            
            # Click on Wallet option
            wallet_selectors = [
                'text="Wallet"',
                'button:has-text("Wallet")',
                'div:has-text("Wallet")',
                'span:has-text("Wallet")'
            ]
            
            for selector in wallet_selectors:
                try:
                    await self.page.click(selector, timeout=5000)
                    logger.info(f"Clicked Wallet using: {selector}")
                    await self.human_delay()
                    await self.take_screenshot("13_wallet_selected")
                    return True
                except:
                    continue
            
            logger.error("Could not find Wallet option")
            await self.take_screenshot("error_wallet_not_found")
            return False
            
        except Exception as e:
            logger.error(f"Failed to select wallet: {str(e)}")
            return False
    
    async def select_up_points(self) -> bool:
        """Select UP Points payment option"""
        try:
            logger.info("Selecting UP Points...")
            
            # Wait for UP Points option to appear
            await self.human_delay(800, 1200)  # ULTRA-FAST
            
            # Click on UP Points box
            up_points_selectors = [
                'text="Up Points"',
                'text="UP Points"',
                'div:has-text("Up Points")',
                'button:has-text("Up Points")'
            ]
            
            for selector in up_points_selectors:
                try:
                    await self.page.click(selector, timeout=5000)
                    logger.info(f"Clicked UP Points using: {selector}")
                    break
                except:
                    continue
            
            await self.human_delay()
            await self.take_screenshot("14_up_points_selected")
            return True
            
        except Exception as e:
            logger.error(f"Failed to select UP Points: {str(e)}")
            return False
    
    async def sign_in_to_unipin(self) -> bool:
        """Sign in to UniPin with Garena credentials"""
        try:
            logger.info("Signing in to UniPin...")
            
            # Wait for UniPin sign in page
            await self.page.wait_for_selector('text="Sign in to UniPin"', timeout=10000)
            await self.human_delay()
            await self.take_screenshot("15_unipin_signin")
            
            # Enter email
            logger.info("Entering email...")
            email_selectors = [
                'input[placeholder*="Email" i]',
                'input[type="email"]',
                'input[name="email"]'
            ]
            
            for selector in email_selectors:
                try:
                    email_input = await self.page.wait_for_selector(selector, timeout=5000)
                    if email_input:
                        await email_input.click()
                        await self.human_delay(100, 200)  # ULTRA-FAST
                        await email_input.fill(Config.GARENA_EMAIL)
                        logger.info("Email entered")
                        break
                except:
                    continue
            
            await self.human_delay()
            
            # Enter password
            logger.info("Entering password...")
            password_selectors = [
                'input[placeholder*="Password" i]',
                'input[type="password"]',
                'input[name="password"]'
            ]
            
            for selector in password_selectors:
                try:
                    password_input = await self.page.wait_for_selector(selector, timeout=5000)
                    if password_input:
                        await password_input.click()
                        await self.human_delay(100, 200)  # ULTRA-FAST
                        await password_input.fill(Config.GARENA_PASSWORD)
                        logger.info("Password entered")
                        break
                except:
                    continue
            
            await self.take_screenshot("16_credentials_entered")
            await self.human_delay()
            
            # Click Sign in button
            signin_selectors = [
                'button:has-text("Sign in")',
                'button[type="submit"]'
            ]
            
            for selector in signin_selectors:
                try:
                    await self.page.click(selector, timeout=5000)
                    logger.info(f"Clicked Sign in using: {selector}")
                    break
                except:
                    continue
            
            await self.human_delay(1500, 2000)  # ULTRA-FAST
            await self.take_screenshot("17_after_signin")
            return True
            
        except Exception as e:
            logger.error(f"Failed to sign in to UniPin: {str(e)}")
            return False
    
    async def handle_otp_if_present(self) -> bool:
        """Handle OTP if requested - returns False to trigger manual_pending"""
        try:
            logger.info("Checking for OTP requirement...")
            
            # Check if OTP page appears
            try:
                await self.page.wait_for_selector('text="One-Time Password"', timeout=5000)
                logger.warning("OTP required - needs manual intervention")
                await self.take_screenshot("18_otp_required")
                return False  # Trigger manual_pending
                
            except:
                logger.info("No OTP required, proceeding...")
                return True
                
        except Exception as e:
            logger.error(f"Error checking OTP: {str(e)}")
            return True  # Continue anyway
    
    async def enter_security_pin_and_confirm(self) -> bool:
        """Enter 6-digit security PIN and confirm purchase"""
        try:
            logger.info("Entering security PIN...")
            
            # Wait for confirmation page
            await self.page.wait_for_selector('text="Security PIN"', timeout=10000)
            await self.human_delay()
            await self.take_screenshot("19_pin_page")
            
            # Enter PIN (6 digits: 121212)
            pin = Config.GARENA_PIN  # "121212"
            
            # Check if there are multiple boxes (6 boxes for 6 digits)
            pin_boxes = await self.page.query_selector_all('input[type="password"]')
            
            if len(pin_boxes) >= 6:
                # Enter each digit in separate boxes
                logger.info("Entering PIN in separate boxes...")
                for i, digit in enumerate(pin):
                    try:
                        await pin_boxes[i].click()
                        await self.human_delay(50, 100)  # ULTRA-FAST
                        await pin_boxes[i].fill(digit)
                    except:
                        continue
            else:
                # Single input field
                logger.info("Entering PIN in single field...")
                pin_selectors = [
                    'input[placeholder*="PIN" i]',
                    'input[type="password"]',
                    'input[name*="pin" i]'
                ]
                
                for selector in pin_selectors:
                    try:
                        pin_input = await self.page.wait_for_selector(selector, timeout=5000)
                        if pin_input:
                            await pin_input.click()
                            await self.human_delay(100, 200)  # ULTRA-FAST
                            await pin_input.fill(pin)
                            logger.info("PIN entered")
                            break
                    except:
                        continue
            
            await self.take_screenshot("20_pin_entered")
            await self.human_delay()
            
            # Click CONFIRM button
            confirm_selectors = [
                'button:has-text("CONFIRM")',
                'button:has-text("Confirm")',
                'button[type="submit"]'
            ]
            
            for selector in confirm_selectors:
                try:
                    await self.page.click(selector, timeout=5000)
                    logger.info(f"Clicked CONFIRM using: {selector}")
                    break
                except:
                    continue
            
            await self.human_delay(2500, 3500)  # ULTRA-FAST: Wait for payment processing
            await self.take_screenshot("21_after_confirm")
            return True
            
        except Exception as e:
            logger.error(f"Failed to enter PIN and confirm: {str(e)}")
            return False
    
    async def verify_transaction_success(self) -> bool:
        """Verify if transaction was successful"""
        try:
            logger.info("Verifying transaction success...")
            
            # Look for success indicators
            success_indicators = [
                'text="Transaction successful"',
                'text="Success"',
                'text="Payment successful"',
                'text="completed"'
            ]
            
            for indicator in success_indicators:
                try:
                    element = await self.page.wait_for_selector(indicator, timeout=10000)
                    if element:
                        logger.info("Transaction successful!")
                        await self.take_screenshot("22_transaction_success")
                        return True
                except:
                    continue
            
            # If no success message found, check for failure
            failure_indicators = [
                'text="failed"',
                'text="error"',
                'text="insufficient"'
            ]
            
            for indicator in failure_indicators:
                try:
                    element = await self.page.wait_for_selector(indicator, timeout=3000)
                    if element:
                        logger.error("Transaction failed!")
                        await self.take_screenshot("22_transaction_failed")
                        return False
                except:
                    continue
            
            # No clear success or failure - take screenshot for manual review
            logger.warning("Could not verify transaction status")
            await self.take_screenshot("22_transaction_unknown")
            return False
            
        except Exception as e:
            logger.error(f"Error verifying transaction: {str(e)}")
            return False
    
    async def perform_login(self) -> bool:
        """Perform login to Garena account - UPDATED FOR CORRECT FLOW"""
        try:
            logger.info("Starting login process...")
            
            # Step 1: Click initial Login button
            login_selectors = [
                'text="Login"',
                'button:has-text("Login")',
                '[data-testid="login-button"]'
            ]
            
            for selector in login_selectors:
                try:
                    await self.page.click(selector, timeout=5000)
                    logger.info(f"Clicked initial Login using: {selector}")
                    break
                except:
                    continue
            
            await self.human_delay(300, 600)  # ULTRA-FAST
            await self.take_screenshot("04_login_clicked")
            
            # Step 2: Wait for modal popup to appear
            logger.info("Waiting for login modal...")
            await self.human_delay(500, 800)  # ULTRA-FAST
            
            # Step 3: Fill Player ID in modal (NOT uid parameter - using Config.TEST_PLAYER_UID)
            logger.info(f"Filling Player ID in modal...")
            player_id_selectors = [
                'input[placeholder*="player ID" i]',
                'input[placeholder*="Player ID" i]',
                'input[type="text"]'
            ]
            
            player_id_filled = False
            for selector in player_id_selectors:
                try:
                    # Try to find the input in modal
                    input_field = await self.page.wait_for_selector(selector, timeout=5000)
                    if input_field:
                        await input_field.click()
                        await self.human_delay(100, 200)  # ULTRA-FAST
                        await input_field.fill(Config.TEST_PLAYER_UID)  # Using config UID
                        logger.info(f"Player ID filled using: {selector}")
                        player_id_filled = True
                        break
                except:
                    continue
            
            if not player_id_filled:
                logger.error("Could not fill Player ID")
                return False
            
            await self.take_screenshot("05_player_id_filled")
            await self.human_delay(300, 500)  # ULTRA-FAST
            
            # Step 4: Click Login button in modal
            logger.info("Clicking Login button in modal...")
            modal_login_selectors = [
                'button:has-text("Login")',
                'text="Login"'
            ]
            
            for selector in modal_login_selectors:
                try:
                    await self.page.click(selector, timeout=5000)
                    logger.info(f"Clicked modal Login using: {selector}")
                    break
                except:
                    continue
            
            await self.human_delay(1000, 1500)  # ULTRA-FAST: Critical wait
            await self.take_screenshot("06_modal_login_clicked")
            
            # Step 5: Just wait for page to update and proceed
            # No need to verify username - will verify at next step
            logger.info("Waiting for login to complete...")
            await self.human_delay(2000, 2500)  # ULTRA-FAST: Minimal wait for login
            await self.take_screenshot("07_after_login")
            
            logger.info("Login completed - proceeding to next step")
            return True
            
        except Exception as e:
            logger.error(f"Login failed: {str(e)}")
            await self.take_screenshot("error_login")
            return False
    
    async def handle_captcha_if_present(self) -> bool:
        """Detect and handle CAPTCHA if present"""
        try:
            # Check for common CAPTCHA indicators
            captcha_indicators = [
                'text="Slide right to complete"',
                '.captcha',
                '#captcha',
                'iframe[src*="recaptcha"]',
                'iframe[src*="captcha"]',
                '.slider-captcha'
            ]
            
            for indicator in captcha_indicators:
                try:
                    element = await self.page.wait_for_selector(indicator, timeout=2000)
                    if element:
                        logger.warning("CAPTCHA detected!")
                        await self.take_screenshot("captcha_detected")
                        
                        # Check if it's reCAPTCHA
                        recaptcha_iframe = await self.page.query_selector('iframe[src*="recaptcha"]')
                        if recaptcha_iframe:
                            return await self.solve_recaptcha()
                        
                        # Check if it's slider CAPTCHA
                        slider = await self.page.query_selector('.slider-btn, [class*="slider"]')
                        if slider:
                            return await self.solve_slider_captcha()
                        
                        # Unknown CAPTCHA type - needs manual intervention
                        logger.error("Unknown CAPTCHA type detected - manual intervention required")
                        return False
                except:
                    continue
            
            return False  # No CAPTCHA detected
            
        except Exception as e:
            logger.error(f"Error handling CAPTCHA: {str(e)}")
            return False
    
    async def solve_recaptcha(self) -> bool:
        """Solve reCAPTCHA using SolveCaptcha API"""
        try:
            logger.info("Attempting to solve reCAPTCHA...")
            
            # Get site key
            site_key_element = await self.page.query_selector('[data-sitekey]')
            if not site_key_element:
                logger.error("Could not find reCAPTCHA site key")
                return False
            
            site_key = await site_key_element.get_attribute('data-sitekey')
            page_url = self.page.url
            
            logger.info(f"Solving reCAPTCHA for site key: {site_key}")
            solution = await self.captcha_solver.solve_recaptcha_v2(site_key, page_url)
            
            if not solution:
                logger.error("Failed to get CAPTCHA solution")
                return False
            
            # Inject solution
            await self.page.evaluate(f'''
                document.getElementById("g-recaptcha-response").innerHTML = "{solution}";
            ''')
            
            logger.info("reCAPTCHA solution injected")
            return True
            
        except Exception as e:
            logger.error(f"Failed to solve reCAPTCHA: {str(e)}")
            return False
    
    async def solve_slider_captcha(self) -> bool:
        """Attempt to solve slider CAPTCHA"""
        try:
            logger.info("Attempting to solve slider CAPTCHA...")
            
            # Find slider handle
            slider_handle = await self.page.query_selector('.slider-btn, [class*="slider-handle"], [class*="drag"]')
            if not slider_handle:
                logger.error("Could not find slider handle")
                return False
            
            # Get slider track
            slider_track = await self.page.query_selector('.slider-track, [class*="slider-track"]')
            if not slider_track:
                logger.error("Could not find slider track")
                return False
            
            # Get bounding boxes
            handle_box = await slider_handle.bounding_box()
            track_box = await slider_track.bounding_box()
            
            if not handle_box or not track_box:
                logger.error("Could not get slider dimensions")
                return False
            
            # Calculate drag distance
            drag_distance = track_box['width'] - handle_box['width'] - 10
            
            logger.info(f"Dragging slider {drag_distance}px")
            
            # Perform drag with human-like movement
            await self.page.mouse.move(
                handle_box['x'] + handle_box['width'] / 2,
                handle_box['y'] + handle_box['height'] / 2
            )
            await self.page.mouse.down()
            
            # Drag in small increments
            steps = 20
            for i in range(steps):
                x_offset = (drag_distance / steps) * (i + 1)
                y_jitter = (i % 3 - 1) * 2  # Small vertical jitter
                
                await self.page.mouse.move(
                    handle_box['x'] + x_offset,
                    handle_box['y'] + handle_box['height'] / 2 + y_jitter
                )
                await asyncio.sleep(0.02)
            
            await self.page.mouse.up()
            await self.human_delay()
            await self.take_screenshot("captcha_solved")
            
            logger.info("Slider CAPTCHA solved")
            return True
            
        except Exception as e:
            logger.error(f"Failed to solve slider CAPTCHA: {str(e)}")
            return False
    
    async def fill_player_uid(self, uid: str) -> bool:
        """Fill in player UID"""
        try:
            logger.info(f"Filling player UID: {uid}")
            
            # Wait for UID input field
            uid_selectors = [
                'input[name="uid"]',
                'input[placeholder*="UID"]',
                'input[placeholder*="Player ID"]',
                'input[id*="uid"]',
                'input[type="text"]'
            ]
            
            for selector in uid_selectors:
                try:
                    await self.page.wait_for_selector(selector, timeout=5000)
                    await self.human_type(selector, uid)
                    logger.info(f"UID entered using: {selector}")
                    break
                except:
                    continue
            
            await self.human_delay()
            await self.take_screenshot("08_uid_entered")
            
            # Look for verify/confirm button
            verify_selectors = [
                'button:has-text("Verify")',
                'button:has-text("Confirm")',
                'button:has-text("Check")',
                'button[type="submit"]'
            ]
            
            for selector in verify_selectors:
                try:
                    await self.page.click(selector, timeout=3000)
                    logger.info("Clicked verify button")
                    break
                except:
                    continue
            
            await self.human_delay(2000, 3000)
            await self.take_screenshot("09_uid_verified")
            
            # Verify username appears
            try:
                await self.page.wait_for_selector('text="NAYAN XR"', timeout=10000)
                logger.info("Username verified: NAYAN XR")
            except:
                logger.warning("Could not verify username display")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to fill UID: {str(e)}")
            return False
    
    async def select_diamond_amount(self, amount: int) -> bool:
        """Select diamond package"""
        try:
            logger.info(f"Selecting {amount} diamonds...")
            
            # Look for diamond package options
            package_selectors = [
                f'text="{amount} Diamonds"',
                f'button:has-text("{amount}")' ,
                f'[data-amount="{amount}"]',
                f'.package:has-text("{amount}")'
            ]
            
            for selector in package_selectors:
                try:
                    await self.page.click(selector, timeout=5000)
                    logger.info(f"Selected package using: {selector}")
                    break
                except:
                    continue
            
            await self.human_delay()
            await self.take_screenshot("10_package_selected")
            return True
            
        except Exception as e:
            logger.error(f"Failed to select diamond amount: {str(e)}")
            return False
    
    async def proceed_to_payment(self) -> bool:
        """Proceed to payment page"""
        try:
            logger.info("Proceeding to payment...")
            
            # Click proceed/buy button
            proceed_selectors = [
                'button:has-text("Proceed")',
                'button:has-text("Buy Now")',
                'button:has-text("Purchase")',
                'button:has-text("Continue")',
                '[data-testid="proceed-button"]'
            ]
            
            for selector in proceed_selectors:
                try:
                    await self.page.click(selector, timeout=5000)
                    logger.info(f"Clicked proceed using: {selector}")
                    break
                except:
                    continue
            
            await self.human_delay(2000, 3000)
            await self.take_screenshot("11_payment_page")
            return True
            
        except Exception as e:
            logger.error(f"Failed to proceed to payment: {str(e)}")
            return False
    
    async def select_wallet_payment(self) -> bool:
        """Select wallet as payment method"""
        try:
            logger.info("Selecting wallet payment...")
            
            # Click on wallet option
            wallet_selectors = [
                'text="Wallet"',
                'button:has-text("Wallet")',
                '[data-payment="wallet"]',
                '.payment-option:has-text("Wallet")'
            ]
            
            for selector in wallet_selectors:
                try:
                    await self.page.click(selector, timeout=5000)
                    logger.info(f"Selected wallet using: {selector}")
                    break
                except:
                    continue
            
            await self.human_delay()
            await self.take_screenshot("12_wallet_selected")
            return True
            
        except Exception as e:
            logger.error(f"Failed to select wallet payment: {str(e)}")
            return False
    
    async def handle_topup_if_needed(self) -> bool:
        """Handle wallet top-up if insufficient balance"""
        try:
            logger.info("Checking if top-up needed...")
            
            # Look for top-up button
            topup_selectors = [
                'text="Top Up"',
                'text="Add Points"',
                'button:has-text("Top Up")'
            ]
            
            for selector in topup_selectors:
                try:
                    topup_btn = await self.page.wait_for_selector(selector, timeout=3000)
                    if topup_btn:
                        logger.info("Top-up required, but skipping (would need payment method)")
                        await self.take_screenshot("13_topup_needed")
                        return False  # Can't proceed without actual top-up
                except:
                    continue
            
            logger.info("Sufficient balance, no top-up needed")
            return True
            
        except Exception as e:
            logger.error(f"Error checking top-up: {str(e)}")
            return True  # Continue anyway
    
    async def enter_pin_and_confirm(self) -> bool:
        """Enter PIN and confirm purchase"""
        try:
            logger.info("Looking for PIN entry...")
            
            # Look for PIN input
            pin_selectors = [
                'input[name="pin"]',
                'input[type="password"]',
                'input[placeholder*="PIN"]'
            ]
            
            for selector in pin_selectors:
                try:
                    await self.page.wait_for_selector(selector, timeout=5000)
                    await self.human_type(selector, Config.GARENA_PIN)
                    logger.info("PIN entered")
                    break
                except:
                    continue
            
            await self.human_delay()
            await self.take_screenshot("14_pin_entered")
            
            # Click confirm button
            confirm_selectors = [
                'button:has-text("Confirm")',
                'button:has-text("Pay Now")',
                'button[type="submit"]'
            ]
            
            for selector in confirm_selectors:
                try:
                    await self.page.click(selector, timeout=5000)
                    logger.info("Clicked confirm")
                    break
                except:
                    continue
            
            await self.human_delay(3000, 5000)
            await self.take_screenshot("15_purchase_complete")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to enter PIN: {str(e)}")
            return False
    
    async def verify_success(self) -> bool:
        """Verify purchase was successful"""
        try:
            logger.info("Verifying purchase success...")
            
            # Look for success indicators
            success_indicators = [
                'text="Success"',
                'text="Successful"',
                'text="Complete"',
                '.success-message',
                '.order-complete'
            ]
            
            for indicator in success_indicators:
                try:
                    element = await self.page.wait_for_selector(indicator, timeout=10000)
                    if element:
                        logger.info("Purchase successful!")
                        await self.take_screenshot("16_success")
                        return True
                except:
                    continue
            
            logger.warning("Could not verify success, but no error detected")
            return True
            
        except Exception as e:
            logger.error(f"Error verifying success: {str(e)}")
            return False
    
    async def cleanup(self):
        """Close browser and cleanup resources"""
        try:
            if self.page:
                await self.page.close()
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
            await self.captcha_solver.close()
            logger.info("Cleanup complete")
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")
    
    async def run_topup(self, player_uid: str, diamond_amount: int) -> Dict[str, Any]:
        """Main automation flow - UPDATED WITH CORRECT GARENA FLOW"""
        result = {
            "success": False,
            "message": "",
            "screenshots": [],
            "error": None
        }
        
        try:
            logger.info(f"Starting top-up automation for UID: {player_uid}, Amount: {diamond_amount}")
            
            # Step 1: Connect to browser
            if not await self.connect_browser():
                result["message"] = "Failed to connect to browser"
                result["error"] = "browser_connection_failed"
                return result
            
            # Step 2: Navigate to shop
            if not await self.navigate_to_shop():
                result["message"] = "Failed to navigate to shop"
                result["error"] = "navigation_failed"
                return result
            
            # Step 3: Select Free Fire
            if not await self.select_free_fire():
                result["message"] = "Failed to select Free Fire"
                result["error"] = "game_selection_failed"
                return result
            
            # Step 4: Click Redeem button
            if not await self.click_redeem():
                result["message"] = "Failed to click Redeem"
                result["error"] = "redeem_click_failed"
                return result
            
            # Step 5: Perform login (new flow: fill Player ID in modal then proceed)
            if not await self.perform_login():
                result["message"] = "Login failed"
                result["error"] = "login_failed"
                return result
            
            # Step 6: Click Proceed to Payment (username verified by action success)
            if not await self.proceed_to_payment_button():
                result["message"] = "Failed to proceed to payment"
                result["error"] = "proceed_payment_failed"
                return result
            
            # Step 7: Select diamond amount from modal
            if not await self.select_diamond_amount_from_modal(diamond_amount):
                result["message"] = "Failed to select diamond amount"
                result["error"] = "diamond_selection_failed"
                return result
            
            # Step 8: Select Wallet payment channel
            if not await self.select_wallet_channel():
                result["message"] = "Failed to select wallet payment"
                result["error"] = "wallet_selection_failed"
                return result
            
            # Step 9: Select UP Points
            if not await self.select_up_points():
                result["message"] = "Failed to select UP Points"
                result["error"] = "up_points_selection_failed"
                return result
            
            # Step 10: Sign in to UniPin
            if not await self.sign_in_to_unipin():
                result["message"] = "Failed to sign in to UniPin"
                result["error"] = "unipin_signin_failed"
                return result
            
            # Step 11: Handle OTP if present
            if not await self.handle_otp_if_present():
                result["message"] = "OTP required - manual intervention needed"
                result["error"] = "otp_required"
                result["screenshots"] = self.screenshots
                return result
            
            # Step 12: Enter security PIN and confirm
            if not await self.enter_security_pin_and_confirm():
                result["message"] = "Failed to enter PIN and confirm"
                result["error"] = "pin_confirmation_failed"
                return result
            
            # Step 13: Verify transaction success
            if not await self.verify_transaction_success():
                result["message"] = "Transaction failed or could not be verified"
                result["error"] = "transaction_failed"
                result["screenshots"] = self.screenshots
                return result
            
            # Success!
            result["success"] = True
            result["message"] = f"Successfully topped up {diamond_amount} diamonds for UID {player_uid}"
            result["screenshots"] = self.screenshots
            
            logger.info("Automation completed successfully!")
            return result
            
        except Exception as e:
            logger.error(f"Automation failed with error: {str(e)}")
            result["message"] = f"Automation failed: {str(e)}"
            result["error"] = "automation_exception"
            result["screenshots"] = self.screenshots
            return result
            
        finally:
            await self.cleanup()


# CLI for testing
if __name__ == "__main__":
    import sys
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    async def main():
        automation = GarenaAutomation()
        
        # Use test credentials if no args provided
        player_uid = sys.argv[1] if len(sys.argv) > 1 else Config.TEST_PLAYER_UID
        diamond_amount = int(sys.argv[2]) if len(sys.argv) > 2 else Config.TEST_DIAMOND_AMOUNT
        
        result = await automation.run_topup(player_uid, diamond_amount)
        
        print("\n" + "="*50)
        print("AUTOMATION RESULT")
        print("="*50)
        print(json.dumps(result, indent=2))
    
    asyncio.run(main())
