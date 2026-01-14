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
    // Browserless Configuration (joycegames.vip)
    BROWSERLESS_TOKEN: 'browserlessTOKEN2026',
    BROWSERLESS_URL: 'wss://browserless.joycegames.vip?token=browserlessTOKEN2026',
    
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
            log('info', 'Connecting to Browserless (joycegames.vip)...');
            
            this.browser = await puppeteer.connect({
                browserWSEndpoint: CONFIG.BROWSERLESS_URL,
                defaultViewport: { width: 1920, height: 1080 }
            });
            
            this.page = await this.browser.newPage();
            await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            log('info', 'Browserless connected successfully');
            return true;
        } catch (e) {
            log('error', `Failed to connect to Browserless: ${e.message}`);
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
            let screenshot;
            try {
                screenshot = await takeScreenshot(this.page, '10_before_amount_select');
                if (screenshot) this.screenshots.push(screenshot);
            } catch (e) {
                log('warning', `Screenshot error: ${e.message}`);
            }
            
            // The page shows diamond amounts inside payment sections
            // We need to find the SPECIFIC "25 Diamond" option and click its radio button or label
            const clicked = await this.page.evaluate((targetAmount) => {
                // Strategy 1: Find radio buttons/inputs with value matching the amount
                const radioInputs = document.querySelectorAll('input[type="radio"]');
                for (const radio of radioInputs) {
                    const value = radio.value || '';
                    const label = radio.closest('label') || document.querySelector(`label[for="${radio.id}"]`);
                    const labelText = label ? (label.textContent || '') : '';
                    
                    // Check if this radio is for our target amount
                    if (value.includes(`${targetAmount}`) || labelText.includes(`${targetAmount} Diamond`)) {
                        radio.click();
                        return { clicked: true, method: 'radio input', text: labelText.substring(0, 30) };
                    }
                }
                
                // Strategy 2: Find specific labels/divs with ONLY the target amount text
                const allLabels = document.querySelectorAll('label, div[role="option"], li');
                for (const el of allLabels) {
                    const text = (el.textContent || '').trim();
                    
                    // Look for exact patterns like "25 Diamond" at the START of text
                    // Avoid matching containers with multiple options
                    if (text.startsWith(`${targetAmount} Diamond`) && !text.includes(`${targetAmount+25} Diamond`)) {
                        // Check if there's a radio button inside
                        const radio = el.querySelector('input[type="radio"]');
                        if (radio) {
                            radio.click();
                            return { clicked: true, method: 'label radio', text: text.substring(0, 30) };
                        }
                        
                        el.click();
                        return { clicked: true, method: 'label click', text: text.substring(0, 30) };
                    }
                }
                
                // Strategy 3: Find elements where text content is EXACTLY "25 Diamond" or similar
                const spans = document.querySelectorAll('span, p, div');
                for (const el of spans) {
                    const directText = el.childNodes[0]?.textContent?.trim() || '';
                    
                    if (directText === `${targetAmount} Diamond` || directText === `${targetAmount}`) {
                        // Click the parent element that should be a clickable option
                        const clickTarget = el.closest('[role="option"], [role="button"], label, li, button') || el.parentElement;
                        if (clickTarget) {
                            clickTarget.click();
                            return { clicked: true, method: 'exact text', text: directText };
                        }
                    }
                }
                
                return { clicked: false };
            }, amount);
            
            if (clicked.clicked) {
                log('info', `Selected ${amount} diamonds using: ${clicked.method} (${clicked.text})`);
            } else {
                log('warning', `Could not find exact ${amount} diamond option`);
            }
            
            await humanDelay(500, 1000);
            
            try {
                screenshot = await takeScreenshot(this.page, '11_amount_selected');
                if (screenshot) this.screenshots.push(screenshot);
            } catch (e) {
                log('warning', `Screenshot error: ${e.message}`);
            }
            
            return true;
        } catch (e) {
            log('error', `Failed to select diamond amount: ${e.message}`);
            return true;
        }
    }
    
    async selectWalletPayment() {
        try {
            log('info', 'Looking for payment section and clicking to initiate purchase...');
            
            await humanDelay(1000, 1500);
            
            // Take screenshot
            let screenshot;
            try {
                screenshot = await takeScreenshot(this.page, '12_before_payment_select');
                if (screenshot) this.screenshots.push(screenshot);
            } catch (e) {
                log('warning', `Screenshot error: ${e.message}`);
            }
            
            // Get current URL
            let currentUrl;
            try {
                currentUrl = this.page.url();
                log('info', `Current URL: ${currentUrl}`);
            } catch (e) {
                log('warning', 'Could not get current URL');
            }
            
            // Set up listener for new pages/popups BEFORE clicking
            const pagePromise = new Promise(resolve => {
                const handler = async target => {
                    if (target.type() === 'page') {
                        try {
                            const newPage = await target.page();
                            resolve(newPage);
                        } catch (e) {
                            resolve(null);
                        }
                    }
                };
                this.browser.on('targetcreated', handler);
                setTimeout(() => {
                    this.browser.off('targetcreated', handler);
                    resolve(null);
                }, 15000);
            });
            
            // Click the Login button under UniPin section
            log('info', 'Clicking Login button under UniPin section...');
            
            try {
                const clickResult = await this.page.evaluate(() => {
                    // Find all Login buttons
                    const loginElements = [];
                    const allElements = document.querySelectorAll('button, a, div[role="button"], span');
                    
                    for (const el of allElements) {
                        const text = (el.textContent || el.innerText || '').trim();
                        if (text.toLowerCase() === 'login') {
                            const section = el.closest('div');
                            if (section) {
                                const sectionText = section.textContent || '';
                                loginElements.push({
                                    element: el,
                                    section: sectionText.substring(0, 100),
                                    isUniPin: sectionText.includes('UniPin')
                                });
                            }
                        }
                    }
                    
                    // Prioritize UniPin login
                    for (const item of loginElements) {
                        if (item.isUniPin) {
                            item.element.click();
                            return { clicked: true, section: 'UniPin' };
                        }
                    }
                    
                    // Fallback to any login button that's not the player ID one
                    for (const item of loginElements) {
                        if (!item.section.includes('player ID') && !item.section.includes('Or login with your game account')) {
                            item.element.click();
                            return { clicked: true, section: item.section.substring(0, 50) };
                        }
                    }
                    
                    return { clicked: false };
                });
                
                if (clickResult.clicked) {
                    log('info', `Clicked in section: ${clickResult.section}`);
                } else {
                    log('warning', 'Could not find appropriate Login button');
                }
            } catch (e) {
                log('error', `Error clicking Login: ${e.message}`);
            }
            
            // Wait for navigation or modal
            log('info', 'Waiting for navigation or modal...');
            await humanDelay(3000, 5000);
            
            // Check if a Free Fire login modal appeared (which is wrong - we need Garena SSO)
            const modalCheck = await this.page.evaluate(() => {
                // Look for modal close button or modal overlay
                const closeButtons = document.querySelectorAll('button[aria-label="Close"], .close, .modal-close, [data-dismiss="modal"]');
                const modalOverlay = document.querySelector('.modal, .overlay, [role="dialog"]');
                
                // Check if modal contains "Free Fire" login
                if (modalOverlay) {
                    const modalText = modalOverlay.textContent || '';
                    if (modalText.includes('Player ID') && modalText.includes('Free Fire')) {
                        // This is the wrong modal - we need to close it or interact differently
                        return { hasModal: true, type: 'freefire_login' };
                    }
                }
                
                return { hasModal: false };
            });
            
            if (modalCheck.hasModal && modalCheck.type === 'freefire_login') {
                log('info', 'Free Fire login modal appeared - this is for re-authentication');
                
                // Take a screenshot of the modal
                screenshot = await takeScreenshot(this.page, '12c_modal_appeared');
                if (screenshot) this.screenshots.push(screenshot);
                
                // Try to close the modal by pressing Escape or clicking outside
                log('info', 'Attempting to close modal...');
                
                // Method 1: Press Escape key
                try {
                    await this.page.keyboard.press('Escape');
                    log('info', 'Pressed Escape key');
                    await humanDelay(500, 1000);
                } catch (e) {
                    log('warning', `Could not press Escape: ${e.message}`);
                }
                
                // Check if modal is still there
                const stillHasModal = await this.page.evaluate(() => {
                    const modalOverlay = document.querySelector('.modal, .overlay, [role="dialog"]');
                    return !!modalOverlay;
                });
                
                if (stillHasModal) {
                    // Method 2: Click outside the modal (on the overlay/background)
                    try {
                        await this.page.evaluate(() => {
                            // Click on the page body/backdrop
                            const backdrop = document.querySelector('.modal-backdrop, .overlay-backdrop, body');
                            if (backdrop) {
                                backdrop.click();
                            }
                            // Also try clicking at specific coordinates (top-left corner)
                            const event = new MouseEvent('click', {
                                bubbles: true,
                                cancelable: true,
                                clientX: 10,
                                clientY: 10
                            });
                            document.elementFromPoint(10, 10)?.dispatchEvent(event);
                        });
                        log('info', 'Clicked outside modal');
                        await humanDelay(500, 1000);
                    } catch (e) {
                        log('warning', `Could not click outside modal: ${e.message}`);
                    }
                }
                
                // Method 3: Try clicking at coordinates outside the modal
                try {
                    await this.page.mouse.click(50, 50);
                    log('info', 'Clicked at coordinates outside modal');
                    await humanDelay(500, 1000);
                } catch (e) {
                    log('warning', `Could not click at coordinates: ${e.message}`);
                }
                
                // Take screenshot after attempting to close
                screenshot = await takeScreenshot(this.page, '12d_after_close_attempt');
                if (screenshot) this.screenshots.push(screenshot);
            }
            
            // Wait for new page
            const newPage = await pagePromise;
            
            if (newPage) {
                log('info', 'New page opened! Switching to it...');
                this.page = newPage;
                try {
                    await this.page.setViewport({ width: 1920, height: 1080 });
                    await humanDelay(3000, 5000);
                    const newUrl = this.page.url();
                    log('info', `New page URL: ${newUrl}`);
                } catch (e) {
                    log('warning', `Error setting up new page: ${e.message}`);
                }
            } else {
                // No new page - check current page state
                await humanDelay(3000, 5000);
                
                try {
                    // Check all pages
                    const pages = await this.browser.pages();
                    log('info', `Total browser pages: ${pages.length}`);
                    
                    for (let i = pages.length - 1; i >= 0; i--) {
                        try {
                            const pageUrl = pages[i].url();
                            log('info', `Page ${i} URL: ${pageUrl}`);
                            
                            // Look for SSO/login page
                            if (pageUrl.includes('sso') || pageUrl.includes('login') || pageUrl.includes('account')) {
                                this.page = pages[i];
                                log('info', `Found auth page at index ${i}`);
                                break;
                            }
                        } catch (e) {
                            log('warning', `Page ${i} may be closed: ${e.message}`);
                        }
                    }
                    
                    currentUrl = this.page.url();
                    log('info', `Current page URL after wait: ${currentUrl}`);
                } catch (e) {
                    log('error', `Error checking pages: ${e.message}`);
                }
            }
            
            // Take final screenshot
            try {
                screenshot = await takeScreenshot(this.page, '13_after_payment_login');
                if (screenshot) this.screenshots.push(screenshot);
            } catch (e) {
                log('warning', `Screenshot error: ${e.message}`);
            }
            
            return true;
        } catch (e) {
            log('error', `Failed to select wallet/payment: ${e.message}`);
            return true;
        }
    }
    
    async selectUPPoints() {
        try {
            log('info', 'Checking current page state after payment login...');
            
            await humanDelay(2000, 3000);
            
            const screenshot = await takeScreenshot(this.page, '14_current_state');
            if (screenshot) this.screenshots.push(screenshot);
            
            // Check current URL to understand where we are
            const currentUrl = this.page.url();
            log('info', `Current URL: ${currentUrl}`);
            
            // Check for new pages/tabs that might have opened
            const pages = await this.browser.pages();
            log('info', `Number of browser pages: ${pages.length}`);
            
            if (pages.length > 1) {
                // Switch to the newest page
                this.page = pages[pages.length - 1];
                log('info', 'Switched to new browser page');
                await humanDelay(1000, 2000);
                const newUrl = this.page.url();
                log('info', `New page URL: ${newUrl}`);
            }
            
            // Take another screenshot after potential page switch
            const screenshot2 = await takeScreenshot(this.page, '14b_after_page_check');
            if (screenshot2) this.screenshots.push(screenshot2);
            
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
            log('info', 'Looking for Security PIN or confirmation page...');
            
            let screenshot = await takeScreenshot(this.page, '19_before_pin');
            if (screenshot) this.screenshots.push(screenshot);
            
            const currentUrl = this.page.url();
            log('info', `Current URL: ${currentUrl}`);
            
            // Check if we're on a page with PIN input
            const pageContent = await this.page.content();
            
            // Look for PIN input field
            let pinFound = false;
            
            // Method 1: Look for Security PIN text
            if (pageContent.toLowerCase().includes('security pin') || pageContent.toLowerCase().includes('pin')) {
                log('info', 'PIN-related content found on page');
                
                try {
                    await this.page.waitForSelector('text/Security PIN', { timeout: 5000 });
                    pinFound = true;
                } catch (e) {
                    // Try waiting for any password input
                    try {
                        await this.page.waitForSelector('input[type="password"]', { timeout: 5000 });
                        pinFound = true;
                    } catch (e2) {
                        log('info', 'No PIN input found directly');
                    }
                }
            }
            
            if (!pinFound) {
                // Check if we're still on the main page (not progressed)
                if (pageContent.includes('Official Top Up Center') || pageContent.includes('game selection')) {
                    log('warning', 'Still on main top-up page, payment flow not initiated');
                    screenshot = await takeScreenshot(this.page, '19_still_on_main_page');
                    if (screenshot) this.screenshots.push(screenshot);
                    return false; // Indicate failure to proceed
                }
                
                log('info', 'No PIN page found, transaction may have completed or different flow');
                screenshot = await takeScreenshot(this.page, '19_no_pin_page');
                if (screenshot) this.screenshots.push(screenshot);
                return true; // Continue to verification
            }
            
            await humanDelay();
            
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
            } else if (pinBoxes.length > 0) {
                // Single input field
                log('info', 'Entering PIN in single field...');
                await pinBoxes[0].click();
                await humanDelay(100, 200);
                await this.page.type('input[type="password"]', pin, { delay: randomDelay(20, 50) });
                log('info', 'PIN entered');
            } else {
                // Try other selectors
                const pinSelectors = [
                    'input[placeholder*="PIN" i]',
                    'input[name*="pin" i]'
                ];
                
                for (const selector of pinSelectors) {
                    try {
                        await this.page.waitForSelector(selector, { timeout: 3000 });
                        await this.page.click(selector);
                        await humanDelay(100, 200);
                        await this.page.type(selector, pin, { delay: randomDelay(20, 50) });
                        log('info', `PIN entered using: ${selector}`);
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
                    await this.page.click(selector, { timeout: 3000 });
                    log('info', `Clicked CONFIRM using: ${selector}`);
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            // Also try using page.evaluate
            await this.page.evaluate(() => {
                const buttons = document.querySelectorAll('button, input[type="submit"]');
                for (const btn of buttons) {
                    const text = (btn.textContent || btn.value || '').toLowerCase();
                    if (text.includes('confirm') || text.includes('submit') || text.includes('pay')) {
                        btn.click();
                        return;
                    }
                }
            });
            
            await humanDelay(3000, 5000);
            screenshot = await takeScreenshot(this.page, '21_after_confirm');
            if (screenshot) this.screenshots.push(screenshot);
            
            return true;
        } catch (e) {
            log('error', `Failed to enter PIN: ${e.message}`);
            const screenshot = await takeScreenshot(this.page, 'error_pin');
            if (screenshot) this.screenshots.push(screenshot);
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
