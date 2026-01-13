/**
 * Garena Free Fire Top-Up Automation
 * Using Puppeteer + BrowserCloud.io (15 min sessions)
 * With SolveCaptcha CAPTCHA solving support
 */

const puppeteer = require('puppeteer-core');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// ===== CONFIGURATION =====
const CONFIG = {
    // BrowserCloud.io Configuration
    BROWSERCLOUD_TOKEN: 'CIAQ4UYVDLOT6fgC',
    BROWSERCLOUD_URL: 'wss://chrome-v2.browsercloud.io/?token=CIAQ4UYVDLOT6fgC&proxy=datacenter&proxyCountry=US',
    
    // SolveCaptcha Configuration
    SOLVECAPTCHA_API_KEY: 'a19f74499d6680dcd821a74c9a5d079e',
    SOLVECAPTCHA_BASE_URL: 'https://api.solvecaptcha.com',
    
    // Garena Credentials
    GARENA_EMAIL: 'Nayankarki92@gmail.com',
    GARENA_PASSWORD: 'Nayan@980',
    GARENA_PIN: '121212',
    
    // Test Configuration
    TEST_PLAYER_UID: '301372144',
    TEST_DIAMOND_AMOUNT: 25,
    
    // Timeouts (ms)
    DEFAULT_TIMEOUT: 60000,
    NAVIGATION_TIMEOUT: 90000,
    
    // Delays for human-like behavior (ms)
    DELAY_MIN: 200,
    DELAY_MAX: 500,
    
    // Screenshot directory
    SCREENSHOT_DIR: '/tmp/garena_screenshots'
};

// ===== UTILITY FUNCTIONS =====
function log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message, ...(data && { data }) };
    console.error(JSON.stringify(logEntry));
}

function randomDelay(min = CONFIG.DELAY_MIN, max = CONFIG.DELAY_MAX) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function humanDelay(min, max) {
    await sleep(randomDelay(min || CONFIG.DELAY_MIN, max || CONFIG.DELAY_MAX));
}

async function takeScreenshot(page, name, orderId) {
    try {
        await fs.mkdir(CONFIG.SCREENSHOT_DIR, { recursive: true });
        const filename = `${name}_${Date.now()}.png`;
        const filepath = path.join(CONFIG.SCREENSHOT_DIR, filename);
        await page.screenshot({ path: filepath, fullPage: true });
        log('info', `Screenshot saved: ${filename}`);
        return filepath;
    } catch (e) {
        log('error', `Failed to take screenshot: ${e.message}`);
        return null;
    }
}

// ===== MAIN AUTOMATION CLASS =====
class GarenaAutomation {
    constructor() {
        this.browser = null;
        this.page = null;
        this.screenshots = [];
    }
    
    async getCurrentPage() {
        try {
            // Get all pages and return the most recent active one
            const pages = await this.browser.pages();
            if (pages.length === 0) {
                log('error', 'No pages available in browser');
                return this.page;
            }
            
            // Return the last non-closed page
            for (let i = pages.length - 1; i >= 0; i--) {
                if (!pages[i].isClosed()) {
                    return pages[i];
                }
            }
            
            return pages[0];
        } catch (e) {
            log('error', `Error getting current page: ${e.message}`);
            return this.page;
        }
    }
    
    async updateToCurrentPage() {
        const newPage = await this.getCurrentPage();
        if (newPage && newPage !== this.page) {
            log('info', 'Switched to new page');
            this.page = newPage;
        }
    }
    
    async connectBrowser() {
        try {
            log('info', 'Connecting to BrowserCloud.io...');
            
            this.browser = await puppeteer.connect({
                browserWSEndpoint: CONFIG.BROWSERCLOUD_URL,
                defaultViewport: { width: 1920, height: 1080 }
            });
            
            this.page = await this.browser.newPage();
            await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            log('info', 'BrowserCloud.io connected successfully (15 min session)');
            return true;
        } catch (e) {
            log('error', `Failed to connect to BrowserCloud.io: ${e.message}`);
            return false;
        }
    }
    
    async navigateToShop() {
        try {
            log('info', 'Navigating to shop.garena.my...');
            await this.page.goto('https://shop.garena.my/', {
                waitUntil: 'domcontentloaded',
                timeout: CONFIG.NAVIGATION_TIMEOUT
            });
            
            const screenshot = await takeScreenshot(this.page, '01_shop_homepage');
            if (screenshot) this.screenshots.push(screenshot);
            
            await humanDelay(300, 600);
            log('info', 'Successfully navigated to shop');
            return true;
        } catch (e) {
            log('error', `Failed to navigate to shop: ${e.message}`);
            return false;
        }
    }
    
    async selectFreeFire() {
        try {
            log('info', 'Selecting Free Fire game...');
            
            await this.page.waitForSelector('text/Free Fire', { timeout: 10000 });
            
            const selectors = [
                'text/Free Fire',
                'button:has-text("Free Fire")'
            ];
            
            for (const selector of selectors) {
                try {
                    await this.page.click(selector);
                    log('info', `Clicked Free Fire using: ${selector}`);
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            const screenshot = await takeScreenshot(this.page, '02_freefire_selected');
            if (screenshot) this.screenshots.push(screenshot);
            
            await humanDelay(300, 600);
            return true;
        } catch (e) {
            log('error', `Failed to select Free Fire: ${e.message}`);
            return false;
        }
    }
    
    async clickRedeem() {
        try {
            log('info', 'Clicking Redeem button...');
            
            const selectors = [
                'text/Redeem',
                'button:has-text("Redeem")'
            ];
            
            for (const selector of selectors) {
                try {
                    await this.page.click(selector);
                    log('info', `Clicked Redeem using: ${selector}`);
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            await humanDelay(300, 600);
            const screenshot = await takeScreenshot(this.page, '03_redeem_clicked');
            if (screenshot) this.screenshots.push(screenshot);
            
            return true;
        } catch (e) {
            log('error', `Failed to click Redeem: ${e.message}`);
            return false;
        }
    }
    
    async performLogin(playerUid) {
        try {
            log('info', 'Starting login process...');
            
            // Click Login button
            const loginSelectors = [
                'text/Login',
                'button:has-text("Login")'
            ];
            
            for (const selector of loginSelectors) {
                try {
                    await this.page.click(selector);
                    log('info', `Clicked Login using: ${selector}`);
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            await humanDelay(300, 600);
            let screenshot = await takeScreenshot(this.page, '04_login_clicked');
            if (screenshot) this.screenshots.push(screenshot);
            
            // Wait for modal
            log('info', 'Waiting for login modal...');
            await humanDelay(500, 800);
            
            // Fill Player ID
            log('info', `Filling Player ID: ${playerUid}`);
            const uidSelectors = [
                'input[placeholder*="player ID" i]',
                'input[placeholder*="Player ID" i]',
                'input[type="text"]'
            ];
            
            for (const selector of uidSelectors) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 5000 });
                    await this.page.click(selector);
                    await humanDelay(100, 200);
                    await this.page.type(selector, playerUid, { delay: randomDelay(20, 50) });
                    log('info', `Player ID filled using: ${selector}`);
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            screenshot = await takeScreenshot(this.page, '05_player_id_filled');
            if (screenshot) this.screenshots.push(screenshot);
            
            await humanDelay(300, 500);
            
            // Click Login in modal
            log('info', 'Clicking Login button in modal...');
            const modalLoginSelectors = [
                'button:has-text("Login")',
                'text/Login'
            ];
            
            for (const selector of modalLoginSelectors) {
                try {
                    await this.page.click(selector);
                    log('info', `Clicked modal Login using: ${selector}`);
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            await humanDelay(1000, 1500);
            screenshot = await takeScreenshot(this.page, '06_modal_login_clicked');
            if (screenshot) this.screenshots.push(screenshot);
            
            // Wait for login to complete
            log('info', 'Waiting for login to complete...');
            await humanDelay(2000, 2500);
            
            screenshot = await takeScreenshot(this.page, '07_after_login');
            if (screenshot) this.screenshots.push(screenshot);
            
            log('info', 'Login completed');
            return true;
        } catch (e) {
            log('error', `Login failed: ${e.message}`);
            const screenshot = await takeScreenshot(this.page, 'error_login');
            if (screenshot) this.screenshots.push(screenshot);
            return false;
        }
    }
    
    async proceedToPayment() {
        try {
            log('info', 'Clicking Proceed to Payment...');
            
            const selectors = [
                'button:has-text("Proceed to Payment")',
                'text/Proceed to Payment'
            ];
            
            for (const selector of selectors) {
                try {
                    await this.page.click(selector);
                    log('info', `Clicked Proceed to Payment using: ${selector}`);
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            await humanDelay(1000, 1500);
            const screenshot = await takeScreenshot(this.page, '09_payment_page');
            if (screenshot) this.screenshots.push(screenshot);
            
            return true;
        } catch (e) {
            log('error', `Failed to proceed to payment: ${e.message}`);
            return false;
        }
    }
    
    async selectDiamondAmount(amount) {
        try {
            log('info', `Selecting ${amount} diamonds...`);
            
            await humanDelay(1000, 1500);
            let screenshot = await takeScreenshot(this.page, '10_before_amount_select');
            if (screenshot) this.screenshots.push(screenshot);
            
            // The page shows diamond amounts like "25 Diamond", "50 Diamond" etc.
            // Need to find and click the exact amount
            const amountSelectors = [
                `text/${amount} Diamond`,
                `text/${amount}`,
                `div:has-text("${amount} Diamond")`,
                `label:has-text("${amount}")`,
                `span:has-text("${amount}")`
            ];
            
            let clicked = false;
            
            // Method 1: Try direct selectors
            for (const selector of amountSelectors) {
                try {
                    await this.page.click(selector, { timeout: 3000 });
                    log('info', `Selected ${amount} diamonds using: ${selector}`);
                    clicked = true;
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            // Method 2: Use page.evaluate to find exact element
            if (!clicked) {
                clicked = await this.page.evaluate((targetAmount) => {
                    // Find all elements that contain the diamond amount
                    const elements = document.querySelectorAll('*');
                    for (const el of elements) {
                        const text = el.textContent || '';
                        // Look for exact match like "25 Diamond" or just "25"
                        if (text.includes(`${targetAmount} Diamond`) || text.trim() === `${targetAmount}`) {
                            // Check if it's a clickable element or radio button nearby
                            const parent = el.closest('label, div, button');
                            if (parent) {
                                const radio = parent.querySelector('input[type="radio"]');
                                if (radio) {
                                    radio.click();
                                    return true;
                                }
                                parent.click();
                                return true;
                            }
                            el.click();
                            return true;
                        }
                    }
                    return false;
                }, amount);
                
                if (clicked) {
                    log('info', `Selected ${amount} diamonds using page.evaluate`);
                }
            }
            
            await humanDelay();
            screenshot = await takeScreenshot(this.page, '11_amount_selected');
            if (screenshot) this.screenshots.push(screenshot);
            
            return true; // Continue even if not sure about selection
        } catch (e) {
            log('error', `Failed to select diamond amount: ${e.message}`);
            return true; // Continue anyway
        }
    }
    
    async selectWalletPayment() {
        try {
            log('info', 'Selecting payment method and clicking Login...');
            
            await humanDelay(1000, 1500);
            let screenshot = await takeScreenshot(this.page, '12_before_wallet_select');
            if (screenshot) this.screenshots.push(screenshot);
            
            // Strategy: Find a payment section (like UniPin, Boost) and click its Login button
            // The page has multiple Login buttons - one under each payment section
            
            // First, try to find and click on the Boost section (as it's a wallet)
            // or UniPin Credits section
            const paymentSections = [
                { name: 'Boost', text: 'Boost' },
                { name: 'UniPin', text: 'UniPin Credits' },
                { name: 'Garena', text: 'Garena Prepaid' }
            ];
            
            // Use page.evaluate to find the Login button inside a payment section
            const loginClicked = await this.page.evaluate(() => {
                // Strategy: Find all Login buttons and click the one under a valid payment section
                const loginButtons = document.querySelectorAll('button, a');
                
                for (const btn of loginButtons) {
                    const text = btn.textContent || btn.innerText || '';
                    if (text.trim().toLowerCase() === 'login') {
                        // Check if this Login button is in a payment section
                        const parent = btn.closest('div, section');
                        if (parent) {
                            const parentText = parent.textContent || '';
                            // Check if parent section is a payment method
                            if (parentText.includes('UniPin') || parentText.includes('Boost') || 
                                parentText.includes('Diamond') || parentText.includes('Credit')) {
                                btn.click();
                                return { clicked: true, section: parentText.substring(0, 50) };
                            }
                        }
                    }
                }
                
                // Fallback: Click the first Login button found
                for (const btn of loginButtons) {
                    const text = btn.textContent || btn.innerText || '';
                    if (text.trim().toLowerCase() === 'login') {
                        btn.click();
                        return { clicked: true, section: 'first found' };
                    }
                }
                
                return { clicked: false };
            });
            
            if (loginClicked.clicked) {
                log('info', `Clicked Login button in section: ${loginClicked.section}`);
            } else {
                log('warning', 'Could not find Login button to click');
            }
            
            await humanDelay(3000, 5000);
            
            screenshot = await takeScreenshot(this.page, '13_after_payment_login');
            if (screenshot) this.screenshots.push(screenshot);
            
            return true;
        } catch (e) {
            log('error', `Failed to select wallet/payment: ${e.message}`);
            return true; // Continue anyway
        }
    }
    
    async selectUPPoints() {
        try {
            log('info', 'Checking current page state...');
            
            await humanDelay(1500, 2000);
            
            const screenshot = await takeScreenshot(this.page, '14_payment_state');
            if (screenshot) this.screenshots.push(screenshot);
            
            // Check current URL to understand where we are
            const currentUrl = this.page.url();
            log('info', `Current URL: ${currentUrl}`);
            
            // If we're on a Garena/SSO login page, proceed to authentication
            if (currentUrl.includes('garena') || currentUrl.includes('sso') || currentUrl.includes('login')) {
                log('info', 'On authentication page, proceeding to login...');
                return true;
            }
            
            // Check page content for authentication forms
            const pageContent = await this.page.content();
            if (pageContent.includes('Email') || pageContent.includes('Password') || 
                pageContent.includes('Sign in') || pageContent.includes('Login')) {
                log('info', 'Authentication form detected, proceeding...');
                return true;
            }
            
            return true;
        } catch (e) {
            log('error', `Error in selectUPPoints: ${e.message}`);
            return true;
        }
    }
    
    async signInToUniPin() {
        try {
            log('info', 'Checking for authentication page...');
            
            // Wait for page to load
            await humanDelay(2000, 3000);
            
            let screenshot = await takeScreenshot(this.page, '15_auth_page');
            if (screenshot) this.screenshots.push(screenshot);
            
            // Check current URL and page content
            const currentUrl = this.page.url();
            log('info', `Current URL: ${currentUrl}`);
            
            // Look for email/password inputs on the page
            const emailSelectors = [
                'input[placeholder*="Email" i]',
                'input[type="email"]',
                'input[name="email"]',
                'input[id*="email" i]'
            ];
            
            const passwordSelectors = [
                'input[placeholder*="Password" i]',
                'input[type="password"]',
                'input[name="password"]',
                'input[id*="password" i]'
            ];
            
            // Find email input
            let emailFound = false;
            for (const selector of emailSelectors) {
                try {
                    const element = await this.page.$(selector);
                    if (element) {
                        await this.page.click(selector);
                        await humanDelay(100, 200);
                        await this.page.type(selector, CONFIG.GARENA_EMAIL, { delay: randomDelay(20, 50) });
                        log('info', `Email entered using: ${selector}`);
                        emailFound = true;
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }
            
            if (!emailFound) {
                log('info', 'No email input found, may not need authentication');
                return true;
            }
            
            await humanDelay();
            
            // Find and fill password
            for (const selector of passwordSelectors) {
                try {
                    const element = await this.page.$(selector);
                    if (element) {
                        await this.page.click(selector);
                        await humanDelay(100, 200);
                        await this.page.type(selector, CONFIG.GARENA_PASSWORD, { delay: randomDelay(20, 50) });
                        log('info', `Password entered using: ${selector}`);
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }
            
            screenshot = await takeScreenshot(this.page, '16_credentials_entered');
            if (screenshot) this.screenshots.push(screenshot);
            
            await humanDelay();
            
            // Click Sign in/Login button
            const signinSelectors = [
                'button[type="submit"]',
                'button:has-text("Sign in")',
                'button:has-text("Login")',
                'input[type="submit"]'
            ];
            
            for (const selector of signinSelectors) {
                try {
                    await this.page.click(selector, { timeout: 3000 });
                    log('info', `Clicked Sign in using: ${selector}`);
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            // Also try clicking by evaluating page
            await this.page.evaluate(() => {
                const buttons = document.querySelectorAll('button, input[type="submit"]');
                for (const btn of buttons) {
                    const text = btn.textContent || btn.value || '';
                    if (text.toLowerCase().includes('sign') || text.toLowerCase().includes('login') || 
                        text.toLowerCase().includes('submit')) {
                        btn.click();
                        return;
                    }
                }
            });
            
            await humanDelay(3000, 5000);
            screenshot = await takeScreenshot(this.page, '17_after_signin');
            if (screenshot) this.screenshots.push(screenshot);
            
            return true;
        } catch (e) {
            log('error', `Failed to sign in: ${e.message}`);
            return true; // Continue anyway
        }
    }
    
    async handleOTPIfPresent() {
        try {
            log('info', 'Checking for OTP requirement...');
            
            try {
                await this.page.waitForSelector('text/One-Time Password', { timeout: 5000 });
                log('warning', 'OTP required - needs manual intervention');
                const screenshot = await takeScreenshot(this.page, '18_otp_required');
                if (screenshot) this.screenshots.push(screenshot);
                return false; // Trigger manual_pending
            } catch (e) {
                log('info', 'No OTP required, proceeding...');
                return true;
            }
        } catch (e) {
            log('error', `Error checking OTP: ${e.message}`);
            return true; // Continue anyway
        }
    }
    
    async enterSecurityPINAndConfirm() {
        try {
            log('info', 'Entering security PIN...');
            
            await this.page.waitForSelector('text/Security PIN', { timeout: 10000 });
            await humanDelay();
            
            let screenshot = await takeScreenshot(this.page, '19_pin_page');
            if (screenshot) this.screenshots.push(screenshot);
            
            const pin = CONFIG.GARENA_PIN; // "121212"
            
            // Try to find PIN input boxes
            const pinBoxes = await this.page.$$('input[type="password"]');
            
            if (pinBoxes.length >= 6) {
                // Separate boxes for each digit
                log('info', 'Entering PIN in separate boxes...');
                for (let i = 0; i < pin.length; i++) {
                    await pinBoxes[i].click();
                    await humanDelay(50, 100);
                    await pinBoxes[i].type(pin[i]);
                }
            } else {
                // Single input field
                log('info', 'Entering PIN in single field...');
                const pinSelectors = [
                    'input[placeholder*="PIN" i]',
                    'input[type="password"]',
                    'input[name*="pin" i]'
                ];
                
                for (const selector of pinSelectors) {
                    try {
                        await this.page.waitForSelector(selector, { timeout: 5000 });
                        await this.page.click(selector);
                        await humanDelay(100, 200);
                        await this.page.type(selector, pin, { delay: randomDelay(20, 50) });
                        log('info', 'PIN entered');
                        break;
                    } catch (e) {
                        continue;
                    }
                }
            }
            
            screenshot = await takeScreenshot(this.page, '20_pin_entered');
            if (screenshot) this.screenshots.push(screenshot);
            
            await humanDelay();
            
            // Click CONFIRM
            const confirmSelectors = [
                'button:has-text("CONFIRM")',
                'button:has-text("Confirm")',
                'button[type="submit"]'
            ];
            
            for (const selector of confirmSelectors) {
                try {
                    await this.page.click(selector, { timeout: 5000 });
                    log('info', `Clicked CONFIRM using: ${selector}`);
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            await humanDelay(2500, 3500);
            screenshot = await takeScreenshot(this.page, '21_after_confirm');
            if (screenshot) this.screenshots.push(screenshot);
            
            return true;
        } catch (e) {
            log('error', `Failed to enter PIN: ${e.message}`);
            return false;
        }
    }
    
    async verifyTransactionSuccess() {
        try {
            log('info', 'Verifying transaction success...');
            
            const successIndicators = [
                'text/Transaction successful',
                'text/Success',
                'text/Payment successful',
                'text/completed'
            ];
            
            for (const indicator of successIndicators) {
                try {
                    await this.page.waitForSelector(indicator, { timeout: 10000 });
                    log('info', 'Transaction successful!');
                    const screenshot = await takeScreenshot(this.page, '22_transaction_success');
                    if (screenshot) this.screenshots.push(screenshot);
                    return true;
                } catch (e) {
                    continue;
                }
            }
            
            // Check for failure
            const failureIndicators = [
                'text/failed',
                'text/error',
                'text/insufficient'
            ];
            
            for (const indicator of failureIndicators) {
                try {
                    await this.page.waitForSelector(indicator, { timeout: 3000 });
                    log('error', 'Transaction failed!');
                    const screenshot = await takeScreenshot(this.page, '22_transaction_failed');
                    if (screenshot) this.screenshots.push(screenshot);
                    return false;
                } catch (e) {
                    continue;
                }
            }
            
            log('warning', 'Could not verify transaction status');
            const screenshot = await takeScreenshot(this.page, '22_transaction_unknown');
            if (screenshot) this.screenshots.push(screenshot);
            
            return false;
        } catch (e) {
            log('error', `Error verifying transaction: ${e.message}`);
            return false;
        }
    }
    
    async cleanup() {
        try {
            if (this.browser) {
                await this.browser.close();
            }
            log('info', 'Cleanup complete');
        } catch (e) {
            log('error', `Error during cleanup: ${e.message}`);
        }
    }
    
    async runTopUp(playerUid, diamondAmount) {
        const result = {
            success: false,
            message: '',
            screenshots: [],
            error: null
        };
        
        try {
            log('info', `Starting top-up automation for UID: ${playerUid}, Amount: ${diamondAmount}`);
            
            // Step 1: Connect to browser
            if (!await this.connectBrowser()) {
                result.message = 'Failed to connect to browser';
                result.error = 'browser_connection_failed';
                return result;
            }
            
            // Step 2: Navigate to shop
            if (!await this.navigateToShop()) {
                result.message = 'Failed to navigate to shop';
                result.error = 'navigation_failed';
                return result;
            }
            
            // Step 3: Select Free Fire
            if (!await this.selectFreeFire()) {
                result.message = 'Failed to select Free Fire';
                result.error = 'game_selection_failed';
                return result;
            }
            
            // Step 4: Click Redeem
            if (!await this.clickRedeem()) {
                result.message = 'Failed to click Redeem';
                result.error = 'redeem_click_failed';
                return result;
            }
            
            // Step 5: Perform login
            if (!await this.performLogin(playerUid)) {
                result.message = 'Login failed';
                result.error = 'login_failed';
                return result;
            }
            
            // Step 6: Proceed to Payment
            if (!await this.proceedToPayment()) {
                result.message = 'Failed to proceed to payment';
                result.error = 'proceed_payment_failed';
                return result;
            }
            
            // Step 7: Select diamond amount
            if (!await this.selectDiamondAmount(diamondAmount)) {
                result.message = 'Failed to select diamond amount';
                result.error = 'diamond_selection_failed';
                return result;
            }
            
            // Step 8: Select Wallet
            if (!await this.selectWalletPayment()) {
                result.message = 'Failed to select wallet payment';
                result.error = 'wallet_selection_failed';
                return result;
            }
            
            // Step 9: Select UP Points
            if (!await this.selectUPPoints()) {
                result.message = 'Failed to select UP Points';
                result.error = 'up_points_selection_failed';
                return result;
            }
            
            // Step 10: Sign in to UniPin
            if (!await this.signInToUniPin()) {
                result.message = 'Failed to sign in to UniPin';
                result.error = 'unipin_signin_failed';
                return result;
            }
            
            // Step 11: Handle OTP
            if (!await this.handleOTPIfPresent()) {
                result.message = 'OTP required - manual intervention needed';
                result.error = 'otp_required';
                result.screenshots = this.screenshots;
                return result;
            }
            
            // Step 12: Enter PIN and confirm
            if (!await this.enterSecurityPINAndConfirm()) {
                result.message = 'Failed to enter PIN and confirm';
                result.error = 'pin_confirmation_failed';
                return result;
            }
            
            // Step 13: Verify success
            if (!await this.verifyTransactionSuccess()) {
                result.message = 'Transaction failed or could not be verified';
                result.error = 'transaction_failed';
                result.screenshots = this.screenshots;
                return result;
            }
            
            // Success!
            result.success = true;
            result.message = `Successfully topped up ${diamondAmount} diamonds for UID ${playerUid}`;
            result.screenshots = this.screenshots;
            
            log('info', 'Automation completed successfully!');
            return result;
            
        } catch (e) {
            log('error', `Automation failed with error: ${e.message}`);
            result.message = `Automation failed: ${e.message}`;
            result.error = 'automation_exception';
            result.screenshots = this.screenshots;
            return result;
        } finally {
            await this.cleanup();
        }
    }
}

// ===== CLI ENTRY POINT =====
async function main() {
    // Read arguments from command line
    const args = process.argv.slice(2);
    let playerUid = CONFIG.TEST_PLAYER_UID;
    let diamondAmount = CONFIG.TEST_DIAMOND_AMOUNT;
    
    if (args.length > 0) {
        try {
            const config = JSON.parse(args[0]);
            playerUid = config.playerUid || playerUid;
            diamondAmount = config.diamondAmount || diamondAmount;
        } catch (e) {
            log('warning', 'Failed to parse arguments, using defaults');
        }
    }
    
    const automation = new GarenaAutomation();
    const result = await automation.runTopUp(playerUid, diamondAmount);
    
    // Output result as JSON for Python to parse
    console.log(JSON.stringify(result));
    process.exit(result.success ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
    main().catch(err => {
        log('error', `Fatal error: ${err.message}`);
        console.log(JSON.stringify({
            success: false,
            message: `Fatal error: ${err.message}`,
            error: 'fatal_exception',
            screenshots: []
        }));
        process.exit(1);
    });
}

module.exports = { GarenaAutomation };
