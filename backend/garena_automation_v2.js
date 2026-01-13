/**
 * Garena Free Fire Top-Up Automation V2
 * Using Puppeteer + BrowserCloud.io (15 min sessions)
 * With SolveCaptcha CAPTCHA solving support
 * 
 * Updated selectors based on actual shop.garena.my page structure
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
    
    // URLs
    GARENA_SHOP_URL: 'https://shop.garena.my/',
    
    // Timeouts (ms)
    DEFAULT_TIMEOUT: 60000,
    NAVIGATION_TIMEOUT: 90000,
    
    // Delays for human-like behavior (ms)
    DELAY_MIN: 500,
    DELAY_MAX: 1500,
    
    // Screenshot directory
    SCREENSHOT_DIR: '/tmp/garena_screenshots_v2'
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

async function takeScreenshot(page, name) {
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

// ===== CAPTCHA SOLVER =====
class CaptchaSolver {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = CONFIG.SOLVECAPTCHA_BASE_URL;
    }
    
    async solveRecaptchaV2(siteKey, pageUrl) {
        try {
            log('info', `Solving reCAPTCHA v2 for ${pageUrl}`);
            
            // Submit CAPTCHA
            const submitUrl = `${this.baseUrl}/in.php`;
            const submitParams = new URLSearchParams({
                key: this.apiKey,
                method: 'userrecaptcha',
                googlekey: siteKey,
                pageurl: pageUrl,
                json: '1'
            });
            
            const submitResponse = await axios.get(`${submitUrl}?${submitParams.toString()}`);
            const submitResult = submitResponse.data;
            
            if (submitResult.status !== 1) {
                log('error', `CAPTCHA submission failed: ${JSON.stringify(submitResult)}`);
                return null;
            }
            
            const captchaId = submitResult.request;
            log('info', `CAPTCHA submitted with ID: ${captchaId}`);
            
            // Poll for solution
            const resultUrl = `${this.baseUrl}/res.php`;
            const maxAttempts = 60; // 3 minutes with 3-second intervals
            
            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                await sleep(3000);
                
                const resultParams = new URLSearchParams({
                    key: this.apiKey,
                    action: 'get',
                    id: captchaId,
                    json: '1'
                });
                
                const resultResponse = await axios.get(`${resultUrl}?${resultParams.toString()}`);
                const result = resultResponse.data;
                
                if (result.status === 1) {
                    log('info', 'CAPTCHA solved successfully');
                    return result.request;
                }
                
                if (result.request !== 'CAPCHA_NOT_READY') {
                    log('error', `CAPTCHA solving failed: ${JSON.stringify(result)}`);
                    return null;
                }
                
                log('info', `Waiting for CAPTCHA solution... attempt ${attempt + 1}`);
            }
            
            log('error', 'CAPTCHA solving timed out');
            return null;
        } catch (e) {
            log('error', `Error solving CAPTCHA: ${e.message}`);
            return null;
        }
    }
}

// ===== MAIN AUTOMATION CLASS =====
class GarenaAutomation {
    constructor() {
        this.browser = null;
        this.page = null;
        this.screenshots = [];
        this.captchaSolver = new CaptchaSolver(CONFIG.SOLVECAPTCHA_API_KEY);
    }
    
    async addScreenshot(name) {
        const screenshot = await takeScreenshot(this.page, name);
        if (screenshot) this.screenshots.push(screenshot);
        return screenshot;
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
    
    // STEP 1: LANDING PAGE - Navigate to shop.garena.my
    async step1_navigateToShop() {
        try {
            log('info', 'STEP 1: Navigating to shop.garena.my...');
            await this.page.goto(CONFIG.GARENA_SHOP_URL, {
                waitUntil: 'networkidle2',
                timeout: CONFIG.NAVIGATION_TIMEOUT
            });
            
            await this.addScreenshot('01_landing_page');
            await humanDelay(1000, 2000);
            
            log('info', 'STEP 1: Successfully navigated to shop');
            return true;
        } catch (e) {
            log('error', `STEP 1 Failed: ${e.message}`);
            await this.addScreenshot('error_step1');
            return false;
        }
    }
    
    // STEP 2: Select Free Fire game
    async step2_selectFreeFire() {
        try {
            log('info', 'STEP 2: Selecting Free Fire game...');
            
            // Primary: a[href*="freefire"]
            // Fallback: img[alt*="Free Fire"] -> closest('a')
            // Or: text containing "Free Fire"
            
            const selectors = [
                'a[href*="freefire"]',
                'a[href*="free-fire"]',
                '[data-game="freefire"]',
                'img[alt*="Free Fire"]'
            ];
            
            let clicked = false;
            for (const selector of selectors) {
                try {
                    const element = await this.page.$(selector);
                    if (element) {
                        // If it's an image, click the parent link
                        if (selector.includes('img')) {
                            await this.page.evaluate(el => {
                                const link = el.closest('a');
                                if (link) link.click();
                            }, element);
                        } else {
                            await element.click();
                        }
                        log('info', `STEP 2: Clicked Free Fire using: ${selector}`);
                        clicked = true;
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }
            
            // Try text-based selection
            if (!clicked) {
                try {
                    await this.page.evaluate(() => {
                        const elements = document.querySelectorAll('*');
                        for (const el of elements) {
                            if (el.textContent && el.textContent.includes('Free Fire') && 
                                (el.tagName === 'A' || el.tagName === 'BUTTON' || el.tagName === 'DIV')) {
                                el.click();
                                return true;
                            }
                        }
                        return false;
                    });
                    log('info', 'STEP 2: Clicked Free Fire using text match');
                    clicked = true;
                } catch (e) {
                    log('warning', 'Text-based Free Fire selection failed');
                }
            }
            
            await humanDelay(1000, 2000);
            await this.addScreenshot('02_freefire_selected');
            
            return clicked;
        } catch (e) {
            log('error', `STEP 2 Failed: ${e.message}`);
            await this.addScreenshot('error_step2');
            return false;
        }
    }
    
    // STEP 3: Click Redeem button
    async step3_clickRedeem() {
        try {
            log('info', 'STEP 3: Clicking Redeem button...');
            
            const selectors = [
                'a[href*="redeem"]',
                'button:has-text("Redeem")',
                '[data-action="redeem"]'
            ];
            
            let clicked = false;
            for (const selector of selectors) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 5000 });
                    await this.page.click(selector);
                    log('info', `STEP 3: Clicked Redeem using: ${selector}`);
                    clicked = true;
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            // Try text-based
            if (!clicked) {
                try {
                    clicked = await this.page.evaluate(() => {
                        const buttons = document.querySelectorAll('button, a');
                        for (const btn of buttons) {
                            if (btn.textContent && btn.textContent.trim() === 'Redeem') {
                                btn.click();
                                return true;
                            }
                        }
                        return false;
                    });
                    if (clicked) log('info', 'STEP 3: Clicked Redeem using text match');
                } catch (e) {
                    log('warning', 'Text-based Redeem click failed');
                }
            }
            
            await humanDelay(1000, 2000);
            await this.addScreenshot('03_redeem_clicked');
            
            return clicked;
        } catch (e) {
            log('error', `STEP 3 Failed: ${e.message}`);
            await this.addScreenshot('error_step3');
            return false;
        }
    }
    
    // STEP 4: Click Login button
    async step4_clickLogin() {
        try {
            log('info', 'STEP 4: Clicking Login button...');
            
            const selectors = [
                'a[href*="login"]',
                'button:has-text("Login")',
                '[data-action="login"]'
            ];
            
            let clicked = false;
            for (const selector of selectors) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 5000 });
                    await this.page.click(selector);
                    log('info', `STEP 4: Clicked Login using: ${selector}`);
                    clicked = true;
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            // Try text-based
            if (!clicked) {
                try {
                    clicked = await this.page.evaluate(() => {
                        const buttons = document.querySelectorAll('button, a');
                        for (const btn of buttons) {
                            if (btn.textContent && btn.textContent.trim() === 'Login') {
                                btn.click();
                                return true;
                            }
                        }
                        return false;
                    });
                    if (clicked) log('info', 'STEP 4: Clicked Login using text match');
                } catch (e) {
                    log('warning', 'Text-based Login click failed');
                }
            }
            
            await humanDelay(1000, 2000);
            await this.addScreenshot('04_login_clicked');
            
            return clicked;
        } catch (e) {
            log('error', `STEP 4 Failed: ${e.message}`);
            await this.addScreenshot('error_step4');
            return false;
        }
    }
    
    // STEP 5: Enter Player ID
    async step5_enterPlayerId(playerUid) {
        try {
            log('info', `STEP 5: Entering Player ID: ${playerUid}...`);
            
            // Primary: input[name="player_id"]
            // Fallback: input[placeholder*="Player"]
            const selectors = [
                'input[name="player_id"]',
                'input[name="playerId"]',
                'input[name="uid"]',
                'input[placeholder*="Player" i]',
                'input[placeholder*="player" i]',
                'input[placeholder*="ID" i]',
                'input[type="text"]'
            ];
            
            let filled = false;
            for (const selector of selectors) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 5000 });
                    await this.page.click(selector);
                    await this.page.type(selector, playerUid, { delay: randomDelay(30, 80) });
                    log('info', `STEP 5: Entered Player ID using: ${selector}`);
                    filled = true;
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            if (!filled) {
                log('error', 'STEP 5: Could not find Player ID input');
                return false;
            }
            
            await humanDelay(500, 1000);
            await this.addScreenshot('05_player_id_entered');
            
            // Click Login/Continue/Submit button
            const submitSelectors = [
                'button[type="submit"]',
                'button:has-text("Continue")',
                'button:has-text("Login")'
            ];
            
            for (const selector of submitSelectors) {
                try {
                    await this.page.click(selector);
                    log('info', `STEP 5: Clicked submit using: ${selector}`);
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            // Try text-based submit
            await this.page.evaluate(() => {
                const buttons = document.querySelectorAll('button');
                for (const btn of buttons) {
                    const text = btn.textContent.trim().toLowerCase();
                    if (text === 'login' || text === 'continue' || text === 'submit') {
                        btn.click();
                        return;
                    }
                }
            });
            
            await humanDelay(2000, 3000);
            await this.addScreenshot('05b_after_login_submit');
            
            return true;
        } catch (e) {
            log('error', `STEP 5 Failed: ${e.message}`);
            await this.addScreenshot('error_step5');
            return false;
        }
    }
    
    // STEP 6: Verify username is displayed
    async step6_verifyUsername() {
        try {
            log('info', 'STEP 6: Verifying username display...');
            
            // Check if username is displayed
            const usernameSelectors = [
                '.username',
                '.user-name',
                '[data-username]',
                '.player-name'
            ];
            
            let usernameFound = false;
            for (const selector of usernameSelectors) {
                try {
                    const element = await this.page.$(selector);
                    if (element) {
                        const text = await this.page.evaluate(el => el.textContent, element);
                        if (text && text.trim().length > 0) {
                            log('info', `STEP 6: Username found: ${text.trim()}`);
                            usernameFound = true;
                            break;
                        }
                    }
                } catch (e) {
                    continue;
                }
            }
            
            // Check for "Invalid" error
            const pageContent = await this.page.content();
            if (pageContent.toLowerCase().includes('invalid')) {
                log('error', 'STEP 6: Invalid Player ID detected');
                await this.addScreenshot('error_invalid_player_id');
                return false;
            }
            
            await this.addScreenshot('06_username_verified');
            
            // Even if username not explicitly found, continue if no error
            return true;
        } catch (e) {
            log('error', `STEP 6 Failed: ${e.message}`);
            await this.addScreenshot('error_step6');
            return false;
        }
    }
    
    // STEP 7: Select diamond amount
    async step7_selectDiamondAmount(amount) {
        try {
            log('info', `STEP 7: Selecting ${amount} diamonds...`);
            
            // Look for diamond amount options
            // Primary: input[type="radio"][name*="amount"]
            // Fallback: div[data-amount]
            const selectors = [
                `input[type="radio"][value="${amount}"]`,
                `input[type="radio"][data-amount="${amount}"]`,
                `[data-amount="${amount}"]`,
                `[data-diamonds="${amount}"]`
            ];
            
            let selected = false;
            for (const selector of selectors) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 5000 });
                    await this.page.click(selector);
                    log('info', `STEP 7: Selected ${amount} diamonds using: ${selector}`);
                    selected = true;
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            // Try text-based selection
            if (!selected) {
                try {
                    selected = await this.page.evaluate((amt) => {
                        const elements = document.querySelectorAll('*');
                        for (const el of elements) {
                            if (el.textContent && el.textContent.includes(`${amt}`) && 
                                el.textContent.toLowerCase().includes('diamond')) {
                                el.click();
                                return true;
                            }
                        }
                        // Try just the number
                        for (const el of elements) {
                            if (el.textContent && el.textContent.trim() === `${amt}`) {
                                el.click();
                                return true;
                            }
                        }
                        return false;
                    }, amount);
                    if (selected) log('info', `STEP 7: Selected ${amount} diamonds using text match`);
                } catch (e) {
                    log('warning', 'Text-based diamond selection failed');
                }
            }
            
            await humanDelay(1000, 2000);
            await this.addScreenshot('07_diamond_amount_selected');
            
            return selected || true; // Continue even if selection unclear
        } catch (e) {
            log('error', `STEP 7 Failed: ${e.message}`);
            await this.addScreenshot('error_step7');
            return false;
        }
    }
    
    // STEP 8: Select Payment Method (Wallet/UP Points)
    async step8_selectPaymentMethod() {
        try {
            log('info', 'STEP 8: Selecting payment method (Wallet/UP Points)...');
            
            // Based on screenshot analysis, look for UniPin/Wallet options
            const walletSelectors = [
                'input[type="radio"][value*="UP"]',
                'input[type="radio"][value*="wallet"]',
                '[data-payment="wallet"]',
                '[data-payment="unipin"]'
            ];
            
            let selected = false;
            for (const selector of walletSelectors) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 5000 });
                    await this.page.click(selector);
                    log('info', `STEP 8: Selected payment using: ${selector}`);
                    selected = true;
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            // Try text-based - look for UniPin, Wallet, UP Points
            if (!selected) {
                try {
                    selected = await this.page.evaluate(() => {
                        const keywords = ['UniPin', 'Wallet', 'UP Points', 'Up Points'];
                        const elements = document.querySelectorAll('div, button, label, span');
                        for (const el of elements) {
                            for (const keyword of keywords) {
                                if (el.textContent && el.textContent.includes(keyword)) {
                                    el.click();
                                    return true;
                                }
                            }
                        }
                        return false;
                    });
                    if (selected) log('info', 'STEP 8: Selected payment using text match');
                } catch (e) {
                    log('warning', 'Text-based payment selection failed');
                }
            }
            
            await humanDelay(1000, 2000);
            await this.addScreenshot('08_payment_method_selected');
            
            return true; // Continue even if selection unclear
        } catch (e) {
            log('error', `STEP 8 Failed: ${e.message}`);
            await this.addScreenshot('error_step8');
            return false;
        }
    }
    
    // STEP 9: Garena Authentication (if needed)
    async step9_garenaAuth() {
        try {
            log('info', 'STEP 9: Checking for Garena authentication...');
            
            // Check if Garena login page appeared
            const currentUrl = this.page.url();
            log('info', `Current URL: ${currentUrl}`);
            
            // Look for email/password inputs
            const emailSelectors = [
                'input[name="email"]',
                'input[type="email"]',
                'input[placeholder*="Email" i]',
                'input[type="text"]'
            ];
            
            const passwordSelectors = [
                'input[name="password"]',
                'input[type="password"]',
                'input[placeholder*="Password" i]'
            ];
            
            let emailInput = null;
            let passwordInput = null;
            
            for (const selector of emailSelectors) {
                try {
                    emailInput = await this.page.$(selector);
                    if (emailInput) break;
                } catch (e) {
                    continue;
                }
            }
            
            for (const selector of passwordSelectors) {
                try {
                    passwordInput = await this.page.$(selector);
                    if (passwordInput) break;
                } catch (e) {
                    continue;
                }
            }
            
            // If both inputs found, fill credentials
            if (emailInput && passwordInput) {
                log('info', 'STEP 9: Found login form, entering credentials...');
                
                await emailInput.click();
                await this.page.type('input[name="email"], input[type="email"], input[type="text"]', CONFIG.GARENA_EMAIL, { delay: randomDelay(30, 80) });
                
                await humanDelay(500, 1000);
                
                await passwordInput.click();
                await this.page.type('input[type="password"]', CONFIG.GARENA_PASSWORD, { delay: randomDelay(30, 80) });
                
                await this.addScreenshot('09_credentials_entered');
                await humanDelay(500, 1000);
                
                // Click Sign in button
                const signInSelectors = [
                    'button[type="submit"]',
                    'button:has-text("Sign in")',
                    'button:has-text("Login")'
                ];
                
                for (const selector of signInSelectors) {
                    try {
                        await this.page.click(selector);
                        log('info', `STEP 9: Clicked Sign in using: ${selector}`);
                        break;
                    } catch (e) {
                        continue;
                    }
                }
                
                // Try text-based
                await this.page.evaluate(() => {
                    const buttons = document.querySelectorAll('button');
                    for (const btn of buttons) {
                        const text = btn.textContent.trim().toLowerCase();
                        if (text.includes('sign in') || text.includes('login')) {
                            btn.click();
                            return;
                        }
                    }
                });
                
                await humanDelay(3000, 5000);
                await this.addScreenshot('09b_after_signin');
            } else {
                log('info', 'STEP 9: No login form found, may already be authenticated');
                await this.addScreenshot('09_no_auth_needed');
            }
            
            return true;
        } catch (e) {
            log('error', `STEP 9 Failed: ${e.message}`);
            await this.addScreenshot('error_step9');
            return false;
        }
    }
    
    // STEP 10: Handle OTP if present
    async step10_handleOTP() {
        try {
            log('info', 'STEP 10: Checking for OTP requirement...');
            
            const otpSelectors = [
                'input[name="otp"]',
                'input[placeholder*="OTP" i]',
                'input[placeholder*="One-Time" i]'
            ];
            
            for (const selector of otpSelectors) {
                try {
                    const otpInput = await this.page.$(selector);
                    if (otpInput) {
                        log('warning', 'STEP 10: OTP required - needs manual intervention');
                        await this.addScreenshot('10_otp_required');
                        return { otpRequired: true };
                    }
                } catch (e) {
                    continue;
                }
            }
            
            // Check page content for OTP text
            const pageContent = await this.page.content();
            if (pageContent.toLowerCase().includes('one-time password') || 
                pageContent.toLowerCase().includes('otp')) {
                log('warning', 'STEP 10: OTP page detected - needs manual intervention');
                await this.addScreenshot('10_otp_detected');
                return { otpRequired: true };
            }
            
            log('info', 'STEP 10: No OTP required');
            await this.addScreenshot('10_no_otp');
            return { otpRequired: false };
        } catch (e) {
            log('error', `STEP 10 Failed: ${e.message}`);
            await this.addScreenshot('error_step10');
            return { otpRequired: false };
        }
    }
    
    // STEP 11: Enter Security PIN
    async step11_enterPIN() {
        try {
            log('info', 'STEP 11: Entering security PIN...');
            
            // Look for PIN input
            const pinSelectors = [
                'input[name="pin"]',
                'input[type="password"][placeholder*="PIN" i]',
                'input[placeholder*="PIN" i]'
            ];
            
            let pinInput = null;
            for (const selector of pinSelectors) {
                try {
                    pinInput = await this.page.$(selector);
                    if (pinInput) break;
                } catch (e) {
                    continue;
                }
            }
            
            // Check for multiple PIN boxes (6 digits)
            const pinBoxes = await this.page.$$('input[type="password"]');
            
            if (pinBoxes && pinBoxes.length >= 6) {
                log('info', 'STEP 11: Found 6 PIN input boxes');
                const pin = CONFIG.GARENA_PIN;
                for (let i = 0; i < Math.min(pin.length, pinBoxes.length); i++) {
                    await pinBoxes[i].click();
                    await humanDelay(50, 100);
                    await pinBoxes[i].type(pin[i]);
                }
            } else if (pinInput) {
                log('info', 'STEP 11: Found single PIN input');
                await pinInput.click();
                await pinInput.type(CONFIG.GARENA_PIN, { delay: randomDelay(30, 80) });
            } else {
                log('info', 'STEP 11: No PIN input found, may not be required');
                await this.addScreenshot('11_no_pin_input');
                return true;
            }
            
            await this.addScreenshot('11_pin_entered');
            await humanDelay(500, 1000);
            
            // Click Confirm button
            const confirmSelectors = [
                'button[type="submit"]',
                'button:has-text("CONFIRM")',
                'button:has-text("Confirm")'
            ];
            
            for (const selector of confirmSelectors) {
                try {
                    await this.page.click(selector);
                    log('info', `STEP 11: Clicked Confirm using: ${selector}`);
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            // Try text-based
            await this.page.evaluate(() => {
                const buttons = document.querySelectorAll('button');
                for (const btn of buttons) {
                    const text = btn.textContent.trim().toLowerCase();
                    if (text.includes('confirm')) {
                        btn.click();
                        return;
                    }
                }
            });
            
            await humanDelay(3000, 5000);
            await this.addScreenshot('11b_after_confirm');
            
            return true;
        } catch (e) {
            log('error', `STEP 11 Failed: ${e.message}`);
            await this.addScreenshot('error_step11');
            return false;
        }
    }
    
    // STEP 12: Verify Transaction Result
    async step12_verifyResult() {
        try {
            log('info', 'STEP 12: Verifying transaction result...');
            
            await humanDelay(3000, 5000);
            await this.addScreenshot('12_result_page');
            
            const pageContent = await this.page.content().toLowerCase();
            
            // Check for success indicators
            const successKeywords = ['transaction successful', 'success', 'payment successful', 'completed', 'thank you'];
            for (const keyword of successKeywords) {
                if (pageContent.includes(keyword)) {
                    log('info', `STEP 12: Transaction successful! Found: ${keyword}`);
                    return { success: true };
                }
            }
            
            // Check for failure indicators
            const failureKeywords = ['failed', 'error', 'unsuccessful', 'insufficient'];
            for (const keyword of failureKeywords) {
                if (pageContent.includes(keyword)) {
                    log('error', `STEP 12: Transaction failed! Found: ${keyword}`);
                    return { success: false, reason: keyword };
                }
            }
            
            log('warning', 'STEP 12: Could not determine transaction status');
            return { success: false, reason: 'unknown' };
        } catch (e) {
            log('error', `STEP 12 Failed: ${e.message}`);
            await this.addScreenshot('error_step12');
            return { success: false, reason: e.message };
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
            
            // Step 1: Navigate to shop
            if (!await this.step1_navigateToShop()) {
                result.message = 'Failed to navigate to shop';
                result.error = 'navigation_failed';
                result.screenshots = this.screenshots;
                return result;
            }
            
            // Step 2: Select Free Fire
            if (!await this.step2_selectFreeFire()) {
                result.message = 'Failed to select Free Fire';
                result.error = 'game_selection_failed';
                result.screenshots = this.screenshots;
                return result;
            }
            
            // Step 3: Click Redeem
            await this.step3_clickRedeem();
            
            // Step 4: Click Login
            await this.step4_clickLogin();
            
            // Step 5: Enter Player ID
            if (!await this.step5_enterPlayerId(playerUid)) {
                result.message = 'Failed to enter Player ID';
                result.error = 'player_id_failed';
                result.screenshots = this.screenshots;
                return result;
            }
            
            // Step 6: Verify username
            await this.step6_verifyUsername();
            
            // Step 7: Select diamond amount
            await this.step7_selectDiamondAmount(diamondAmount);
            
            // Step 8: Select payment method
            await this.step8_selectPaymentMethod();
            
            // Step 9: Garena authentication
            await this.step9_garenaAuth();
            
            // Step 10: Handle OTP
            const otpResult = await this.step10_handleOTP();
            if (otpResult.otpRequired) {
                result.message = 'OTP required - manual intervention needed';
                result.error = 'otp_required';
                result.screenshots = this.screenshots;
                return result;
            }
            
            // Step 11: Enter PIN
            await this.step11_enterPIN();
            
            // Step 12: Verify result
            const txResult = await this.step12_verifyResult();
            
            if (txResult.success) {
                result.success = true;
                result.message = `Successfully topped up ${diamondAmount} diamonds for UID ${playerUid}`;
            } else {
                result.message = `Transaction failed: ${txResult.reason || 'unknown'}`;
                result.error = 'transaction_failed';
            }
            
            result.screenshots = this.screenshots;
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
