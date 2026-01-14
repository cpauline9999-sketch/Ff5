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
            log('info', 'Starting login process (with proper JS event sequence)...');
            
            // Click Login button to open modal
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
            
            await humanDelay(500, 800);
            let screenshot = await takeScreenshot(this.page, '04_login_clicked');
            if (screenshot) this.screenshots.push(screenshot);
            
            // Wait for modal to appear
            log('info', 'Waiting for login modal...');
            await humanDelay(500, 1000);
            
            // Fill Player ID with PROPER EVENT SEQUENCE (React/Vue compatible)
            log('info', `Filling Player ID: ${playerUid} with proper JS events...`);
            
            // First, find and focus the input
            const inputSelector = 'input[name="user_id"], input[placeholder*="Player" i], input[placeholder*="player" i]';
            
            try {
                await this.page.waitForSelector(inputSelector, { timeout: 5000 });
                await this.page.focus(inputSelector);
                await humanDelay(100, 200);
            } catch (e) {
                log('warning', `Could not focus input: ${e.message}`);
            }
            
            // Clear the input first
            await this.page.evaluate((selector) => {
                const input = document.querySelector(selector);
                if (input) {
                    input.value = '';
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }, inputSelector);
            
            // Type the Player ID using Puppeteer's type method (which properly triggers events)
            await this.page.type(inputSelector, playerUid, { delay: 50 });
            
            // Also dispatch events manually for React compatibility
            const fillResult = await this.page.evaluate((uid, selector) => {
                const input = document.querySelector(selector);
                if (!input) {
                    return { success: false, error: 'Input not found' };
                }
                
                // For React/Vue controlled components, we need to set the value
                // and trigger React's synthetic events
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLInputElement.prototype, 'value'
                ).set;
                
                nativeInputValueSetter.call(input, uid);
                
                // Dispatch events that React listens to
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                
                return { success: true, value: input.value };
            }, playerUid, inputSelector);
            
            log('info', `Player ID fill result: ${JSON.stringify(fillResult)}`);
            
            await humanDelay(500, 800);
            screenshot = await takeScreenshot(this.page, '05_player_id_filled');
            if (screenshot) this.screenshots.push(screenshot);
            
            // Note: CAPTCHA appears AFTER clicking Login, not before
            // So we check and solve it after clicking
            
            await humanDelay(500, 800);
            screenshot = await takeScreenshot(this.page, '06_before_login_click');
            if (screenshot) this.screenshots.push(screenshot);
            
            // Click Login button with PROPER MOUSE EVENT SEQUENCE
            log('info', 'Clicking Login button with proper mouse events...');
            
            const loginClicked = await this.clickLoginButtonWithMouseEvents();
            
            if (!loginClicked) {
                log('error', 'Failed to click login button');
                return false;
            }
            
            await humanDelay(1500, 2000);
            screenshot = await takeScreenshot(this.page, '07_after_login_click');
            if (screenshot) this.screenshots.push(screenshot);
            
            // NOW check for and solve CAPTCHA (it appears AFTER clicking Login)
            log('info', 'Checking for CAPTCHA (appears after clicking Login)...');
            const captchaResult = await this.solveCaptchaIfPresent();
            
            if (captchaResult === 'solved') {
                log('info', 'CAPTCHA solved, waiting for login to process...');
                await humanDelay(3000, 5000);
                screenshot = await takeScreenshot(this.page, '07b_after_captcha_solved');
                if (screenshot) this.screenshots.push(screenshot);
            } else if (captchaResult === 'unsolved') {
                log('warning', 'CAPTCHA could not be solved automatically');
                screenshot = await takeScreenshot(this.page, '07b_captcha_unsolved');
                if (screenshot) this.screenshots.push(screenshot);
            }
            
            // Wait for login to process
            log('info', 'Waiting for login to complete...');
            await humanDelay(3000, 5000);
            
            // Check if login was successful
            const loginStatus = await this.page.evaluate(() => {
                // SUCCESS: Player ID input is removed OR hidden
                const playerIdInput = document.querySelector('input[name="user_id"], input[placeholder*="Player" i]');
                const inputVisible = playerIdInput && 
                    playerIdInput.offsetParent !== null &&
                    window.getComputedStyle(playerIdInput).display !== 'none' &&
                    window.getComputedStyle(playerIdInput).visibility !== 'hidden';
                
                // SUCCESS: Username element becomes visible
                const usernameSelectors = ['.username', '.user-name', '[data-username]'];
                let usernameEl = null;
                for (const sel of usernameSelectors) {
                    usernameEl = document.querySelector(sel);
                    if (usernameEl && usernameEl.textContent.trim()) break;
                }
                
                // Check for "Welcome" text
                const hasWelcome = document.body.textContent.includes('Welcome');
                
                if (!inputVisible || usernameEl || hasWelcome) {
                    return { 
                        success: true, 
                        username: usernameEl ? usernameEl.textContent.trim() : 'unknown',
                        reason: !inputVisible ? 'input hidden' : 'username visible'
                    };
                }
                
                return { success: false, error: 'Player ID input still visible' };
            });
            
            log('info', `Login status: ${JSON.stringify(loginStatus)}`);
            
            screenshot = await takeScreenshot(this.page, '08_login_result');
            if (screenshot) this.screenshots.push(screenshot);
            
            if (loginStatus.success) {
                log('info', `LOGIN SUCCESSFUL! Username: ${loginStatus.username}`);
                return true;
            } else {
                log('error', `LOGIN FAILED: ${loginStatus.error}`);
                return false;
            }
            
        } catch (e) {
            log('error', `Login failed with exception: ${e.message}`);
            const screenshot = await takeScreenshot(this.page, 'error_login');
            if (screenshot) this.screenshots.push(screenshot);
            return false;
        }
    }
    
    /**
     * Submit image to solvecaptcha.com API for solving
     * @param {string} base64Image - Base64 encoded image
     * @param {string} instructions - Instructions for solver
     * @returns {Promise<object|null>} - Solution coordinates or null
     */
    async submitToSolveCaptcha(base64Image, instructions = 'Click on the slider button/handle that needs to be dragged') {
        try {
            log('info', 'Submitting CAPTCHA to solvecaptcha.com...');
            
            // Step 1: Submit the CAPTCHA
            const submitResponse = await axios.post(`${CONFIG.SOLVECAPTCHA_BASE_URL}/in.php`, {
                key: CONFIG.SOLVECAPTCHA_API_KEY,
                method: 'base64',
                body: base64Image,
                coordinatescaptcha: 1,
                textinstructions: instructions,
                json: 1
            });
            
            log('info', `SolveCaptcha submit response: ${JSON.stringify(submitResponse.data)}`);
            
            if (submitResponse.data.status !== 1) {
                log('error', `SolveCaptcha submit failed: ${submitResponse.data.request}`);
                return null;
            }
            
            const captchaId = submitResponse.data.request;
            log('info', `CAPTCHA submitted, ID: ${captchaId}`);
            
            // Step 2: Poll for result (max 120 seconds)
            const maxAttempts = 24;
            const pollInterval = 5000;
            
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                await sleep(pollInterval);
                
                log('info', `Polling for result, attempt ${attempt}/${maxAttempts}...`);
                
                const resultResponse = await axios.get(`${CONFIG.SOLVECAPTCHA_BASE_URL}/res.php`, {
                    params: {
                        key: CONFIG.SOLVECAPTCHA_API_KEY,
                        action: 'get',
                        id: captchaId,
                        json: 1
                    }
                });
                
                log('info', `SolveCaptcha result response: ${JSON.stringify(resultResponse.data)}`);
                
                if (resultResponse.data.status === 1) {
                    // Success! Parse coordinates
                    const solution = resultResponse.data.request;
                    log('info', `CAPTCHA solved! Solution: ${solution}`);
                    
                    // Parse coordinates from response (format: "x=123,y=456" or "coordinates:x=123,y=456")
                    const coordMatch = solution.match(/x[=:]?\s*(\d+)[,;]?\s*y[=:]?\s*(\d+)/i);
                    if (coordMatch) {
                        return {
                            x: parseInt(coordMatch[1]),
                            y: parseInt(coordMatch[2])
                        };
                    }
                    
                    // Alternative format: just numbers
                    const numMatch = solution.match(/(\d+)[,\s]+(\d+)/);
                    if (numMatch) {
                        return {
                            x: parseInt(numMatch[1]),
                            y: parseInt(numMatch[2])
                        };
                    }
                    
                    log('warning', `Could not parse coordinates from: ${solution}`);
                    return null;
                    
                } else if (resultResponse.data.request === 'CAPCHA_NOT_READY') {
                    continue;
                } else {
                    log('error', `SolveCaptcha error: ${resultResponse.data.request}`);
                    return null;
                }
            }
            
            log('error', 'SolveCaptcha timeout - exceeded max polling attempts');
            return null;
            
        } catch (e) {
            log('error', `SolveCaptcha API error: ${e.message}`);
            return null;
        }
    }
    
    /**
     * Take screenshot of CAPTCHA element and solve using solvecaptcha.com
     */
    async solveCaptchaWithAPI(captchaElement, frameOffset = { x: 0, y: 0 }) {
        try {
            log('info', 'Taking CAPTCHA screenshot for API solving...');
            
            // Take screenshot of the CAPTCHA element or full page
            let base64Image;
            
            if (captchaElement) {
                const screenshotBuffer = await captchaElement.screenshot({ encoding: 'base64' });
                base64Image = screenshotBuffer;
            } else {
                // Full page screenshot
                const screenshotBuffer = await this.page.screenshot({ encoding: 'base64', fullPage: false });
                base64Image = screenshotBuffer;
            }
            
            // Submit to API
            const coordinates = await this.submitToSolveCaptcha(base64Image);
            
            if (coordinates) {
                log('info', `Got coordinates from API: x=${coordinates.x}, y=${coordinates.y}`);
                
                // Adjust for iframe offset if needed
                let clickX = coordinates.x + frameOffset.x;
                let clickY = coordinates.y + frameOffset.y;
                
                log('info', `Adjusted coordinates: x=${clickX}, y=${clickY}`);
                return coordinates;
            }
            
            return null;
        } catch (e) {
            log('error', `Error in solveCaptchaWithAPI: ${e.message}`);
            return null;
        }
    }
    
    async solveCaptchaIfPresent() {
        try {
            // Wait a moment for any dynamic content to load
            await humanDelay(500, 1000);
            
            // Take screenshot first to see current state
            let screenshot = await takeScreenshot(this.page, '07a_checking_captcha');
            if (screenshot) this.screenshots.push(screenshot);
            
            // The CAPTCHA might be in an IFRAME! Check main page AND all iframes
            log('info', 'Checking for CAPTCHA in main page and iframes...');
            
            // First check if there are iframes
            const frames = this.page.frames();
            log('info', `Found ${frames.length} frame(s)`);
            
            // Check main page first
            let captchaCheck = await this.checkCaptchaInFrame(this.page);
            let captchaFrame = this.page;
            let iframeElement = null;
            
            // If not found in main page, check iframes
            if (!captchaCheck.exists && frames.length > 1) {
                for (let i = 1; i < frames.length; i++) {
                    const frame = frames[i];
                    try {
                        const frameCheck = await this.checkCaptchaInFrame(frame);
                        if (frameCheck.exists) {
                            log('info', `CAPTCHA found in iframe ${i}`);
                            captchaCheck = frameCheck;
                            captchaFrame = frame;
                            iframeElement = await frame.frameElement();
                            break;
                        }
                    } catch (e) {
                        log('warning', `Error checking iframe ${i}: ${e.message}`);
                    }
                }
            }
            
            log('info', `CAPTCHA check result: exists=${captchaCheck.exists}, hasText=${captchaCheck.hasSliderText}, hasDiv=${captchaCheck.hasCaptchaDiv}, hasHandle=${captchaCheck.hasSliderHandle}`);
            
            if (!captchaCheck.exists) {
                log('info', 'No CAPTCHA/slider verification detected');
                return 'none';
            }
            
            log('info', 'Slider verification detected! Attempting to solve with SolveCaptcha API...');
            
            screenshot = await takeScreenshot(this.page, '07a_slider_detected');
            if (screenshot) this.screenshots.push(screenshot);
            
            // IMPORTANT: Even if CAPTCHA is detected in iframe, we need to find the actual 
            // visual position on the main page for mouse operations
            
            // Get iframe offset if CAPTCHA is in iframe
            let frameOffset = { x: 0, y: 0 };
            if (iframeElement) {
                const iframeBox = await iframeElement.boundingBox();
                if (iframeBox) {
                    frameOffset = { x: iframeBox.x, y: iframeBox.y };
                    log('info', `Iframe offset: (${frameOffset.x}, ${frameOffset.y})`);
                }
            }
            
            // STRATEGY: Find slider handle in multiple ways
            let handleRect = captchaCheck.handleRect;
            let sliderContainer = null;
            
            // Step 1: Try to find the slider handle using ElementHandle and boundingBox on MAIN page
            // This gives us absolute coordinates for mouse operations
            log('info', 'Searching for slider handle using Puppeteer ElementHandle...');
            
            const sliderHandleSelectors = [
                'span.nc_iconfont',
                'span[class*="nc_iconfont"]',
                '.nc_iconfont',
                'span.btn_slide',
                '[class*="slider"] span:first-child',
                'div[class*="nc_"] > span',
                'span.nc_bg',
                '.nc_wrapper span'
            ];
            
            for (const selector of sliderHandleSelectors) {
                try {
                    // Try main page first
                    let handle = await this.page.$(selector);
                    if (handle) {
                        const bbox = await handle.boundingBox();
                        if (bbox && bbox.width > 5 && bbox.height > 5) {
                            handleRect = { 
                                x: bbox.x, 
                                y: bbox.y, 
                                width: bbox.width, 
                                height: bbox.height,
                                selector: selector,
                                source: 'main-page-element'
                            };
                            log('info', `Found handle via main page: ${selector} at (${bbox.x}, ${bbox.y})`);
                            break;
                        }
                    }
                    
                    // Try iframe if exists
                    if (captchaFrame !== this.page) {
                        handle = await captchaFrame.$(selector);
                        if (handle) {
                            const bbox = await handle.boundingBox();
                            if (bbox && bbox.width > 5 && bbox.height > 5) {
                                // Adjust for iframe offset
                                handleRect = { 
                                    x: bbox.x + frameOffset.x, 
                                    y: bbox.y + frameOffset.y, 
                                    width: bbox.width, 
                                    height: bbox.height,
                                    selector: selector,
                                    source: 'iframe-element'
                                };
                                log('info', `Found handle via iframe: ${selector} at (${handleRect.x}, ${handleRect.y})`);
                                break;
                            }
                        }
                    }
                } catch (e) {
                    // Continue to next selector
                }
            }
            
            // Step 2: If still not found, try using evaluate to get coordinates
            if (!handleRect || handleRect.width === 0) {
                log('info', 'ElementHandle method failed, trying evaluate method...');
                
                // Try finding in the frame using evaluate
                const evalRect = await captchaFrame.evaluate(() => {
                    const selectors = [
                        'span[class*="nc_iconfont"]',
                        '.nc_iconfont',
                        'span.btn_slide',
                        'span[class*="nc_"]',
                        '[class*="slider"] span'
                    ];
                    
                    for (const sel of selectors) {
                        const elements = document.querySelectorAll(sel);
                        for (const el of elements) {
                            const rect = el.getBoundingClientRect();
                            // Handle is usually 30-50px wide
                            if (rect.width >= 20 && rect.width <= 70 && rect.height >= 20) {
                                return { 
                                    x: rect.x, 
                                    y: rect.y, 
                                    width: rect.width, 
                                    height: rect.height,
                                    selector: sel,
                                    className: el.className
                                };
                            }
                        }
                    }
                    return null;
                });
                
                if (evalRect) {
                    // Add iframe offset
                    handleRect = {
                        ...evalRect,
                        x: evalRect.x + frameOffset.x,
                        y: evalRect.y + frameOffset.y,
                        source: 'evaluate'
                    };
                    log('info', `Found handle via evaluate: ${evalRect.selector} at (${handleRect.x}, ${handleRect.y}), class: ${evalRect.className}`);
                }
            }
            
            // Step 3: Try to find the slider container/track to help with coordinates
            log('info', 'Looking for slider container/track...');
            const containerInfo = await this.page.evaluate(() => {
                // Find the CAPTCHA container
                const containerSelectors = [
                    '#nc_1_wrapper',
                    'div[class*="nc_wrapper"]',
                    '.nc-container',
                    'div[class*="slider-verify"]',
                    'div[class*="captcha"]'
                ];
                
                for (const sel of containerSelectors) {
                    const container = document.querySelector(sel);
                    if (container) {
                        const rect = container.getBoundingClientRect();
                        if (rect.width > 100 && rect.height > 20) {
                            // Also find the track within
                            const track = container.querySelector('[class*="scale"], [class*="track"], [class*="_bg"]');
                            const trackRect = track ? track.getBoundingClientRect() : null;
                            
                            return {
                                container: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                                track: trackRect ? { x: trackRect.x, y: trackRect.y, width: trackRect.width, height: trackRect.height } : null,
                                selector: sel
                            };
                        }
                    }
                }
                return null;
            });
            
            if (containerInfo) {
                log('info', `Found slider container: ${containerInfo.selector}, rect: ${JSON.stringify(containerInfo.container)}`);
                sliderContainer = containerInfo.container;
                
                // If we still don't have handle coordinates, estimate from container
                if (!handleRect) {
                    // Handle is typically at the left side of the container
                    handleRect = {
                        x: containerInfo.container.x + 10,
                        y: containerInfo.container.y + containerInfo.container.height / 2 - 15,
                        width: 30,
                        height: 30,
                        selector: 'estimated-from-container',
                        source: 'estimated'
                    };
                    log('info', `Estimated handle position from container: (${handleRect.x}, ${handleRect.y})`);
                }
            }
            
            // Also try to get the slider track/container to understand drag distance
            const sliderTrack = await captchaFrame.evaluate(() => {
                const trackSelectors = [
                    'div[class*="nc-lang-cnt"]',
                    'div[class*="scale_text"]',
                    'div[class*="slider_track"]',
                    'div[class*="_bg"]',
                    'div[class*="nc_scale"]'
                ];
                
                for (const sel of trackSelectors) {
                    const track = document.querySelector(sel);
                    if (track) {
                        const rect = track.getBoundingClientRect();
                        if (rect.width > 100) {
                            return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
                        }
                    }
                }
                
                return null;
            });
            
            if (sliderTrack) {
                log('info', `Slider track found: x=${sliderTrack.x}, width=${sliderTrack.width}`);
            }
            
            // Attempt 1: Use found handle coordinates
            if (handleRect && handleRect.x !== undefined && !isNaN(handleRect.x)) {
                log('info', `Found slider handle at: x=${handleRect.x}, y=${handleRect.y}, selector=${handleRect.selector || 'unknown'}, source=${handleRect.source || 'unknown'}`);
                
                const startX = handleRect.x + handleRect.width / 2;
                const startY = handleRect.y + handleRect.height / 2;
                
                // Calculate drag distance using container/track info
                let dragDistance = 280;
                if (sliderContainer) {
                    // Drag from current position to right edge of container (minus padding)
                    dragDistance = (sliderContainer.x + sliderContainer.width - 30) - startX;
                    log('info', `Calculated drag distance from container: ${dragDistance}px`);
                }
                if (sliderTrack && dragDistance < 100) {
                    dragDistance = sliderTrack.width - (handleRect.x - sliderTrack.x) - handleRect.width - 10;
                }
                if (dragDistance < 100 || dragDistance > 500) {
                    dragDistance = 280;
                    log('info', `Using default drag distance: ${dragDistance}px`);
                }
                
                log('info', `Dragging slider from (${startX.toFixed(0)}, ${startY.toFixed(0)}) by ${dragDistance}px...`);
                
                // Perform human-like drag
                const result = await this.performSliderDrag(startX, startY, dragDistance);
                
                if (result === 'solved') {
                    return 'solved';
                }
                
                // If first attempt failed, try again with adjusted distance
                log('info', 'First drag attempt may have failed, trying with different distance...');
                await humanDelay(1000, 2000);
                
                const result2 = await this.performSliderDrag(startX, startY, dragDistance * 0.9);
                if (result2 === 'solved') {
                    return 'solved';
                }
                
                // Try with slightly different Y position (sometimes handle detection is off vertically)
                await humanDelay(500, 1000);
                const result3 = await this.performSliderDrag(startX, startY - 5, dragDistance);
                if (result3 === 'solved') {
                    return 'solved';
                }
            }
            
            // Attempt 2: Use solvecaptcha.com API with screenshot
            log('info', 'Local detection failed or slider not solved. Trying SolveCaptcha API...');
            
            // Take screenshot of CAPTCHA area
            let captchaScreenshot = null;
            
            if (iframeElement) {
                try {
                    captchaScreenshot = await iframeElement.screenshot({ encoding: 'base64' });
                } catch (e) {
                    log('warning', `Could not screenshot iframe: ${e.message}`);
                }
            }
            
            if (!captchaScreenshot) {
                captchaScreenshot = await this.page.screenshot({ encoding: 'base64', fullPage: false });
            }
            
            // Submit to SolveCaptcha API
            const apiCoords = await this.submitToSolveCaptcha(
                captchaScreenshot,
                'Click on the center of the slider button/handle that needs to be dragged to the right. The slider is usually a small icon or arrow on the left side of a track.'
            );
            
            if (apiCoords) {
                log('info', `SolveCaptcha returned coordinates: x=${apiCoords.x}, y=${apiCoords.y}`);
                
                // Adjust for iframe offset
                const clickX = apiCoords.x + frameOffset.x;
                const clickY = apiCoords.y + frameOffset.y;
                
                const dragDist = sliderTrack ? sliderTrack.width - 50 : 280;
                
                log('info', `Using API coordinates with offset: (${clickX}, ${clickY}), drag distance: ${dragDist}`);
                
                const apiResult = await this.performSliderDrag(clickX, clickY, dragDist);
                if (apiResult === 'solved') {
                    return 'solved';
                }
            }
            
            // Attempt 3: Fallback to center-screen guess
            log('info', 'All methods failed. Trying fallback center-screen position...');
            
            const viewport = this.page.viewport();
            const fallbackX = (viewport?.width || 1920) / 2 - 150;
            const fallbackY = (viewport?.height || 1080) / 2;
            
            const fallbackResult = await this.performSliderDrag(fallbackX, fallbackY, 300);
            
            screenshot = await takeScreenshot(this.page, '07b_after_all_attempts');
            if (screenshot) this.screenshots.push(screenshot);
            
            return fallbackResult === 'solved' ? 'solved' : 'unsolved';
            
        } catch (e) {
            log('error', `Error in CAPTCHA check: ${e.message}`);
            return 'error';
        }
    }
    
    /**
     * Perform human-like slider drag
     */
    async performSliderDrag(startX, startY, dragDistance) {
        try {
            log('info', `Performing slider drag from (${startX.toFixed(0)}, ${startY.toFixed(0)}) distance=${dragDistance}...`);
            
            // Move to start position
            await this.page.mouse.move(startX, startY);
            await humanDelay(100, 200);
            
            // Mouse down
            await this.page.mouse.down();
            await humanDelay(50, 100);
            
            // Human-like drag with acceleration/deceleration and slight vertical wobble
            const steps = 30;
            for (let i = 1; i <= steps; i++) {
                const progress = i / steps;
                
                // Ease-out curve for more natural movement
                const easeProgress = 1 - Math.pow(1 - progress, 3);
                const xOffset = dragDistance * easeProgress;
                
                // Slight vertical wobble for human-like movement
                const yOffset = Math.sin(progress * Math.PI * 2) * 2;
                
                await this.page.mouse.move(startX + xOffset, startY + yOffset);
                
                // Variable delay for human-like speed
                const delay = progress < 0.3 ? randomDelay(10, 25) : randomDelay(5, 15);
                await sleep(delay);
            }
            
            // Small pause before release
            await humanDelay(50, 150);
            
            // Mouse up
            await this.page.mouse.up();
            
            log('info', 'Slider drag completed');
            await humanDelay(2000, 3000);
            
            // Take screenshot after drag
            const screenshot = await takeScreenshot(this.page, '07b_after_slider_drag');
            if (screenshot) this.screenshots.push(screenshot);
            
            // Check if CAPTCHA is solved
            const isSolved = await this.checkIfCaptchaSolved();
            
            if (isSolved) {
                log('info', 'Slider verification solved!');
                return 'solved';
            } else {
                log('warning', 'Slider drag completed but CAPTCHA may not be solved');
                return 'unsolved';
            }
            
        } catch (e) {
            log('error', `Error in performSliderDrag: ${e.message}`);
            return 'error';
        }
    }
    
    /**
     * Check if CAPTCHA has been solved
     */
    async checkIfCaptchaSolved() {
        try {
            // Check main page
            const mainPageCheck = await this.page.evaluate(() => {
                const text = document.body.innerText || document.body.textContent || '';
                
                // Check for slider CAPTCHA text (if present, not solved)
                const hasCaptchaText = text.includes('Slide right') || 
                                       text.includes('slide to verify') ||
                                       text.includes('secure your access') ||
                                       text.includes('验证');
                
                // Check for success indicators
                const hasSuccess = text.includes('Verification passed') ||
                                  text.includes('Success') ||
                                  text.includes('验证通过');
                
                // Check if CAPTCHA elements are still visible
                const captchaElement = document.querySelector('div[class*="nc_wrapper"], div[class*="slider_verify"]');
                const isVisible = captchaElement && 
                    captchaElement.offsetParent !== null &&
                    window.getComputedStyle(captchaElement).display !== 'none';
                
                return {
                    hasCaptchaText,
                    hasSuccess,
                    captchaVisible: isVisible
                };
            });
            
            log('info', `CAPTCHA solved check: hasCaptchaText=${mainPageCheck.hasCaptchaText}, hasSuccess=${mainPageCheck.hasSuccess}, captchaVisible=${mainPageCheck.captchaVisible}`);
            
            // CAPTCHA is solved if success message appears OR if captcha text is gone
            if (mainPageCheck.hasSuccess) {
                return true;
            }
            
            if (!mainPageCheck.hasCaptchaText && !mainPageCheck.captchaVisible) {
                return true;
            }
            
            // Also check all iframes
            const frames = this.page.frames();
            for (const frame of frames) {
                try {
                    const frameCheck = await frame.evaluate(() => {
                        const text = document.body.innerText || '';
                        return !text.includes('Slide right') && !text.includes('secure your access');
                    });
                    
                    if (frameCheck) {
                        // Frame doesn't have CAPTCHA text anymore
                        continue;
                    }
                } catch (e) {
                    continue;
                }
            }
            
            return false;
            
        } catch (e) {
            log('error', `Error checking if CAPTCHA solved: ${e.message}`);
            return false;
        }
    }
    
    async checkCaptchaInFrame(frame) {
        try {
            return await frame.evaluate(() => {
                const pageText = document.body.innerText || document.body.textContent || '';
                const hasSliderText = pageText.includes('Slide right') || 
                                      pageText.includes('slide to verify') ||
                                      pageText.includes('secure your access');
                
                const captchaSelectors = [
                    'div[class*="captcha"]', 'div[class*="slider"]', 'div[class*="verify"]',
                    'div[class*="nc_"]', 'div[class*="geetest"]'
                ];
                
                let captchaDiv = null;
                for (const sel of captchaSelectors) {
                    captchaDiv = document.querySelector(sel);
                    if (captchaDiv) break;
                }
                
                const handleSelectors = [
                    'div[class*="slider"] span', '[class*="nc_iconfont"]', 
                    '[class*="slider-btn"]', 'span[class*="btn"]'
                ];
                
                let sliderHandle = null;
                let handleRect = null;
                for (const sel of handleSelectors) {
                    sliderHandle = document.querySelector(sel);
                    if (sliderHandle) {
                        handleRect = sliderHandle.getBoundingClientRect();
                        if (handleRect.width > 0) break;
                    }
                }
                
                return {
                    exists: hasSliderText || !!captchaDiv,
                    hasSliderText: hasSliderText,
                    hasCaptchaDiv: !!captchaDiv,
                    hasSliderHandle: !!sliderHandle,
                    handleRect: handleRect,
                    debugInfo: { pageTextLength: pageText.length }
                };
            });
        } catch (e) {
            return { exists: false, error: e.message };
        }
    }
    
    async clickLoginButtonWithMouseEvents() {
        try {
            // Find the CORRECT login button (the one next to Player ID input)
            // It should be at the same Y position as the Player ID input
            
            const buttonInfo = await this.page.evaluate(() => {
                // First, find the Player ID input position
                const playerIdInput = document.querySelector('input[placeholder*="player" i], input[name="user_id"]');
                const inputY = playerIdInput ? playerIdInput.getBoundingClientRect().y : 0;
                
                // Find all Login buttons
                const allButtons = document.querySelectorAll('button');
                const loginButtons = [];
                
                for (const btn of allButtons) {
                    const text = (btn.textContent || '').trim().toLowerCase();
                    if (text === 'login' && !btn.disabled) {
                        const rect = btn.getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0) {  // Only visible buttons
                            loginButtons.push({
                                x: rect.x,
                                y: rect.y,
                                width: rect.width,
                                height: rect.height,
                                distanceFromInput: Math.abs(rect.y - inputY),
                                classes: btn.className,
                                testId: btn.getAttribute('data-testid')
                            });
                        }
                    }
                }
                
                // Sort by distance from Player ID input - closest first
                loginButtons.sort((a, b) => a.distanceFromInput - b.distanceFromInput);
                
                // Return the closest Login button to the Player ID input
                if (loginButtons.length > 0) {
                    const closest = loginButtons[0];
                    return {
                        ...closest,
                        inputY: inputY,
                        totalButtons: loginButtons.length
                    };
                }
                
                return null;
            });
            
            if (!buttonInfo) {
                log('error', 'Could not find any Login button');
                return false;
            }
            
            log('info', `Found ${buttonInfo.totalButtons} Login button(s). Using closest to input (Y=${buttonInfo.y.toFixed(0)}, inputY=${buttonInfo.inputY.toFixed(0)}, distance=${buttonInfo.distanceFromInput.toFixed(0)}px)`);
            
            // Calculate center of button
            const centerX = buttonInfo.x + buttonInfo.width / 2;
            const centerY = buttonInfo.y + buttonInfo.height / 2;
            
            log('info', `Clicking Login button at (${centerX.toFixed(0)}, ${centerY.toFixed(0)}) with mouse events...`);
            
            // MANDATORY CLICK SEQUENCE:
            // 1. mousemove to center of button
            await this.page.mouse.move(centerX, centerY);
            await humanDelay(50, 100);
            
            // 2. mousedown
            await this.page.mouse.down();
            await humanDelay(30, 60);
            
            // 3. mouseup
            await this.page.mouse.up();
            await humanDelay(30, 60);
            
            // 4. click
            await this.page.mouse.click(centerX, centerY);
            
            log('info', 'Login button clicked with mouse event sequence');
            return true;
            
        } catch (e) {
            log('error', `Error clicking login button: ${e.message}`);
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
            log('info', 'Looking for UniPin payment Login button that redirects to unipin.com...');
            
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
            
            // Set up listener for new pages/popups or navigation BEFORE clicking
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
            
            // Look for UniPin Login link/button that redirects to unipin.com
            log('info', 'Looking for UniPin Login link that goes to unipin.com...');
            
            try {
                // First, try to find a direct link to unipin.com/login
                const clickResult = await this.page.evaluate(() => {
                    // Strategy 1: Find direct UniPin login link
                    const unipinLinks = document.querySelectorAll('a[href*="unipin.com"], a[href*="unipin"]');
                    for (const link of unipinLinks) {
                        const href = link.href || '';
                        if (href.includes('login') || href.includes('unipin')) {
                            link.click();
                            return { clicked: true, method: 'direct unipin link', href: href };
                        }
                    }
                    
                    // Strategy 2: Find Login buttons in UniPin section
                    const allElements = document.querySelectorAll('button, a, div[role="button"], span');
                    const loginElements = [];
                    
                    for (const el of allElements) {
                        const text = (el.textContent || el.innerText || '').trim();
                        if (text.toLowerCase() === 'login') {
                            const section = el.closest('div');
                            if (section) {
                                const sectionText = section.textContent || '';
                                loginElements.push({
                                    element: el,
                                    section: sectionText.substring(0, 100),
                                    isUniPin: sectionText.includes('UniPin'),
                                    href: el.href || el.getAttribute('href') || ''
                                });
                            }
                        }
                    }
                    
                    // Prioritize UniPin login with href to unipin.com
                    for (const item of loginElements) {
                        if (item.isUniPin && item.href.includes('unipin')) {
                            item.element.click();
                            return { clicked: true, method: 'unipin section with href', href: item.href };
                        }
                    }
                    
                    // Fallback: Click UniPin section login
                    for (const item of loginElements) {
                        if (item.isUniPin) {
                            item.element.click();
                            return { clicked: true, method: 'unipin section login', section: item.section.substring(0, 50) };
                        }
                    }
                    
                    return { clicked: false };
                });
                
                if (clickResult.clicked) {
                    log('info', `Clicked: ${clickResult.method} ${clickResult.href || clickResult.section || ''}`);
                } else {
                    log('warning', 'Could not find UniPin Login link');
                }
            } catch (e) {
                log('error', `Error clicking UniPin Login: ${e.message}`);
            }
            
            // Wait for navigation or new page (UniPin login page)
            log('info', 'Waiting for navigation to UniPin login page...');
            
            // First wait for potential new page
            const newPage = await pagePromise;
            
            if (newPage) {
                log('info', 'New page opened! Switching to it...');
                this.page = newPage;
                try {
                    await this.page.setViewport({ width: 1920, height: 1080 });
                    await humanDelay(3000, 5000);
                    const newUrl = this.page.url();
                    log('info', `New page URL: ${newUrl}`);
                    
                    // Check if we're on UniPin login page
                    if (newUrl.includes('unipin.com')) {
                        log('info', 'Successfully navigated to UniPin login page!');
                        screenshot = await takeScreenshot(this.page, '13_unipin_login_page');
                        if (screenshot) this.screenshots.push(screenshot);
                        return true;
                    }
                } catch (e) {
                    log('warning', `Error setting up new page: ${e.message}`);
                }
            }
            
            // Check if current page navigated to UniPin
            await humanDelay(3000, 5000);
            
            try {
                currentUrl = this.page.url();
                log('info', `Current URL after wait: ${currentUrl}`);
                
                if (currentUrl.includes('unipin.com')) {
                    log('info', 'Page navigated to UniPin login!');
                    screenshot = await takeScreenshot(this.page, '13_unipin_login_page');
                    if (screenshot) this.screenshots.push(screenshot);
                    return true;
                }
                
                // Check all pages for UniPin
                const pages = await this.browser.pages();
                log('info', `Total browser pages: ${pages.length}`);
                
                for (let i = pages.length - 1; i >= 0; i--) {
                    try {
                        const pageUrl = pages[i].url();
                        log('info', `Page ${i} URL: ${pageUrl}`);
                        
                        if (pageUrl.includes('unipin.com')) {
                            this.page = pages[i];
                            log('info', `Found UniPin page at index ${i}`);
                            screenshot = await takeScreenshot(this.page, '13_unipin_login_page');
                            if (screenshot) this.screenshots.push(screenshot);
                            return true;
                        }
                    } catch (e) {
                        log('warning', `Page ${i} error: ${e.message}`);
                    }
                }
                
                // If still on shop.garena.my, check if modal appeared
                if (currentUrl.includes('shop.garena.my')) {
                    log('warning', 'Still on Garena shop - UniPin redirect may have failed');
                    
                    // Check for Free Fire modal (session reset indicator)
                    const hasModal = await this.page.evaluate(() => {
                        const modal = document.querySelector('.modal, [role="dialog"]');
                        if (modal) {
                            const text = modal.textContent || '';
                            return text.includes('Player ID') && text.includes('Free Fire');
                        }
                        return false;
                    });
                    
                    if (hasModal) {
                        log('warning', 'Free Fire modal appeared - this means session reset, need to re-login');
                        // Handle re-login if needed
                        await this.handleModalReLogin();
                    }
                }
                
                screenshot = await takeScreenshot(this.page, '13_after_payment_attempt');
                if (screenshot) this.screenshots.push(screenshot);
                
            } catch (e) {
                log('error', `Error checking pages: ${e.message}`);
            }
            
            return true;
        } catch (e) {
            log('error', `Failed to select payment: ${e.message}`);
            return true;
        }
    }
    
    async handleModalReLogin() {
        try {
            log('info', 'Handling modal re-login (session reset)...');
            
            // Fill Player ID in modal
            const filled = await this.page.evaluate((playerId) => {
                const modal = document.querySelector('.modal, [role="dialog"]');
                if (modal) {
                    const input = modal.querySelector('input[type="text"], input[placeholder*="player" i]');
                    if (input) {
                        input.value = playerId;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        return true;
                    }
                }
                return false;
            }, this.playerUid);
            
            if (filled) {
                log('info', 'Filled Player ID in modal');
                await humanDelay(500, 1000);
                
                // Click Login in modal
                await this.page.evaluate(() => {
                    const modal = document.querySelector('.modal, [role="dialog"]') || document;
                    const buttons = modal.querySelectorAll('button, a');
                    for (const btn of buttons) {
                        if ((btn.textContent || '').trim().toLowerCase() === 'login') {
                            btn.click();
                            return;
                        }
                    }
                });
                
                await humanDelay(3000, 5000);
            }
        } catch (e) {
            log('error', `Error in modal re-login: ${e.message}`);
        }
    }
    
    async selectUPPoints() {
        try {
            log('info', 'Checking if we are on UniPin login page...');
            
            await humanDelay(2000, 3000);
            
            const screenshot = await takeScreenshot(this.page, '14_current_state');
            if (screenshot) this.screenshots.push(screenshot);
            
            // Check current URL
            const currentUrl = this.page.url();
            log('info', `Current URL: ${currentUrl}`);
            
            // If we're on UniPin login page, return true to proceed to authentication
            if (currentUrl.includes('unipin.com')) {
                log('info', 'On UniPin login page - ready for authentication');
                return true;
            }
            
            // Check all pages for UniPin
            const pages = await this.browser.pages();
            log('info', `Number of browser pages: ${pages.length}`);
            
            for (let i = pages.length - 1; i >= 0; i--) {
                try {
                    const pageUrl = pages[i].url();
                    if (pageUrl.includes('unipin.com')) {
                        this.page = pages[i];
                        log('info', `Switched to UniPin page at index ${i}`);
                        return true;
                    }
                } catch (e) {
                    continue;
                }
            }
            
            // If still on Garena shop, the redirect didn't work
            if (currentUrl.includes('shop.garena.my')) {
                log('warning', 'Still on Garena shop - UniPin redirect may not have worked');
            }
            
            return true;
        } catch (e) {
            log('error', `Error in selectUPPoints: ${e.message}`);
            return true;
        }
    }
    
    async signInToUniPin() {
        try {
            log('info', 'Signing in to UniPin...');
            
            await humanDelay(2000, 3000);
            
            const currentUrl = this.page.url();
            log('info', `Current URL: ${currentUrl}`);
            
            let screenshot = await takeScreenshot(this.page, '15_unipin_auth');
            if (screenshot) this.screenshots.push(screenshot);
            
            // Check if we're on UniPin login page
            if (!currentUrl.includes('unipin.com')) {
                log('warning', 'Not on UniPin page - cannot authenticate');
                return false;
            }
            
            // Look for email input on UniPin page
            const emailSelectors = [
                'input[name="email"]',
                'input[type="email"]',
                'input[placeholder*="Email" i]',
                'input[placeholder*="email" i]'
            ];
            
            let emailFilled = false;
            for (const selector of emailSelectors) {
                try {
                    const element = await this.page.$(selector);
                    if (element) {
                        await this.page.click(selector);
                        await humanDelay(100, 200);
                        await this.page.type(selector, CONFIG.GARENA_EMAIL, { delay: randomDelay(20, 50) });
                        log('info', `UniPin email entered using: ${selector}`);
                        emailFilled = true;
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }
            
            if (!emailFilled) {
                log('warning', 'Could not find email input on UniPin page');
            }
            
            await humanDelay(500, 1000);
            
            // Look for password input
            const passwordSelectors = [
                'input[name="password"]',
                'input[type="password"]',
                'input[placeholder*="Password" i]'
            ];
            
            let passwordFilled = false;
            for (const selector of passwordSelectors) {
                try {
                    const element = await this.page.$(selector);
                    if (element) {
                        await this.page.click(selector);
                        await humanDelay(100, 200);
                        await this.page.type(selector, CONFIG.GARENA_PASSWORD, { delay: randomDelay(20, 50) });
                        log('info', `UniPin password entered using: ${selector}`);
                        passwordFilled = true;
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }
            
            screenshot = await takeScreenshot(this.page, '16_unipin_credentials_entered');
            if (screenshot) this.screenshots.push(screenshot);
            
            await humanDelay(500, 1000);
            
            // Click Sign In button
            const signInSelectors = [
                'button[type="submit"]',
                'button:has-text("Sign in")',
                'button:has-text("Login")',
                'input[type="submit"]'
            ];
            
            for (const selector of signInSelectors) {
                try {
                    await this.page.click(selector, { timeout: 3000 });
                    log('info', `Clicked UniPin Sign In using: ${selector}`);
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
                    if (text.includes('sign in') || text.includes('login') || text.includes('submit')) {
                        btn.click();
                        return;
                    }
                }
            });
            
            await humanDelay(5000, 8000);
            
            screenshot = await takeScreenshot(this.page, '17_after_unipin_signin');
            if (screenshot) this.screenshots.push(screenshot);
            
            // Check new URL - should be on checkout or confirmation page
            const newUrl = this.page.url();
            log('info', `URL after UniPin login: ${newUrl}`);
            
            return true;
        } catch (e) {
            log('error', `Failed to sign in to UniPin: ${e.message}`);
            return false;
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
            log('info', 'Checking for checkout/payment confirmation page...');
            
            let screenshot = await takeScreenshot(this.page, '19_checkout_page');
            if (screenshot) this.screenshots.push(screenshot);
            
            const currentUrl = this.page.url();
            log('info', `Current URL: ${currentUrl}`);
            
            // Check page content
            const pageContent = await this.page.content();
            
            // Look for checkout/confirm/pay button
            const checkoutSelectors = [
                'button[type="submit"]',
                'button:has-text("Pay")',
                'button:has-text("Confirm")',
                'button:has-text("Complete")',
                'button:has-text("Checkout")'
            ];
            
            // Try to find and click checkout button
            for (const selector of checkoutSelectors) {
                try {
                    const btn = await this.page.$(selector);
                    if (btn) {
                        await btn.click();
                        log('info', `Clicked checkout button: ${selector}`);
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }
            
            // Also try using page.evaluate
            await this.page.evaluate(() => {
                const buttons = document.querySelectorAll('button, input[type="submit"]');
                for (const btn of buttons) {
                    const text = (btn.textContent || btn.value || '').toLowerCase();
                    if (text.includes('pay') || text.includes('confirm') || text.includes('complete') || text.includes('checkout')) {
                        btn.click();
                        return;
                    }
                }
            });
            
            await humanDelay(5000, 8000);
            
            screenshot = await takeScreenshot(this.page, '20_after_checkout');
            if (screenshot) this.screenshots.push(screenshot);
            
            return true;
        } catch (e) {
            log('error', `Failed at checkout: ${e.message}`);
            const screenshot = await takeScreenshot(this.page, 'error_checkout');
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
        // Store playerUid for use in other methods
        this.playerUid = playerUid;
        this.diamondAmount = diamondAmount;
        
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
