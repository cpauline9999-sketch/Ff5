# NEW METHODS FOR CORRECT GARENA FLOW
# These will be added to garena_automation.py

async def proceed_to_payment_new(self) -> bool:
    """Click Proceed to Payment button after login"""
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
        
        await self.human_delay(2000, 3000)
        await self.take_screenshot("09_payment_page")
        return True
        
    except Exception as e:
        logger.error(f"Failed to proceed to payment: {str(e)}")
        return False

async def select_diamond_amount_new(self, amount: int) -> bool:
    """Select diamond amount from modal"""
    try:
        logger.info(f"Selecting {amount} diamonds...")
        
        # Wait for Select Amount modal
        await self.page.wait_for_selector('text="Select Amount"', timeout=10000)
        await self.human_delay()
        await self.take_screenshot("10_select_amount_modal")
        
        # Click on the amount
        amount_selectors = [
            f'text="{amount}"',
            f'button:has-text("{amount}")',
            f'div:has-text("{amount} Diamond")'
        ]
        
        for selector in amount_selectors:
            try:
                await self.page.click(selector, timeout=5000)
                logger.info(f"Selected {amount} diamonds using: {selector}")
                break
            except:
                continue
        
        await self.human_delay()
        await self.take_screenshot("11_amount_selected")
        return True
        
    except Exception as e:
        logger.error(f"Failed to select diamond amount: {str(e)}")
        return False

async def select_wallet_payment_new(self) -> bool:
    """Select Wallet payment method"""
    try:
        logger.info("Selecting Wallet payment...")
        
        # Wait for payment channel page
        await self.page.wait_for_selector('text="Select Payment Channel"', timeout=10000)
        await self.human_delay()
        await self.take_screenshot("12_payment_channels")
        
        # Click on Wallet option
        wallet_selectors = [
            'text="Wallet"',
            'button:has-text("Wallet")',
            'div:has-text("Wallet")'
        ]
        
        for selector in wallet_selectors:
            try:
                await self.page.click(selector, timeout=5000)
                logger.info(f"Clicked Wallet using: {selector}")
                break
            except:
                continue
        
        await self.human_delay()
        await self.take_screenshot("13_wallet_selected")
        return True
        
    except Exception as e:
        logger.error(f"Failed to select wallet: {str(e)}")
        return False

async def select_up_points(self) -> bool:
    """Select UP Points payment option"""
    try:
        logger.info("Selecting UP Points...")
        
        # Wait for UP Points option to appear
        await self.human_delay(1000, 2000)
        
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
                    await self.human_delay(200, 400)
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
                    await self.human_delay(200, 400)
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
        
        await self.human_delay(3000, 5000)
        await self.take_screenshot("17_after_signin")
        return True
        
    except Exception as e:
        logger.error(f"Failed to sign in to UniPin: {str(e)}")
        return False

async def handle_otp_if_present(self) -> bool:
    """Handle OTP if requested"""
    try:
        logger.info("Checking for OTP requirement...")
        
        # Check if OTP page appears
        try:
            await self.page.wait_for_selector('text="One-Time Password"', timeout=5000)
            logger.warning("OTP required - setting order to manual_pending")
            await self.take_screenshot("18_otp_required")
            
            # OTP needs manual intervention
            return False  # This will trigger manual_pending status
            
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
        # The PIN might be in separate input boxes or one input
        pin = Config.GARENA_PIN  # "121212"
        
        # Try to find PIN input fields
        pin_selectors = [
            'input[placeholder*="PIN" i]',
            'input[type="password"]',
            'input[name*="pin" i]'
        ]
        
        # Check if there are multiple boxes (6 boxes for 6 digits)
        pin_boxes = await self.page.query_selector_all('input[type="password"]')
        
        if len(pin_boxes) >= 6:
            # Enter each digit in separate boxes
            logger.info("Entering PIN in separate boxes...")
            for i, digit in enumerate(pin):
                try:
                    await pin_boxes[i].click()
                    await self.human_delay(100, 200)
                    await pin_boxes[i].fill(digit)
                except:
                    continue
        else:
            # Single input field
            logger.info("Entering PIN in single field...")
            for selector in pin_selectors:
                try:
                    pin_input = await self.page.wait_for_selector(selector, timeout=5000)
                    if pin_input:
                        await pin_input.click()
                        await self.human_delay(200, 400)
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
        
        await self.human_delay(5000, 7000)
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
