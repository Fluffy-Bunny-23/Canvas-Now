// background.js - Service worker for Canvas-Now extension

// Canvas API configuration - will be set dynamically
let CANVAS_API_BASE = 'https://canvas.instructure.com/api/v1';

// Store authentication token
let authToken = null;

// Initialize extension
chrome.runtime.onInstalled.addListener(function() {
    console.log('Canvas-Now extension installed');

    // Initialize storage with default values
    chrome.storage.local.set({
        canvasInstance: 'https://canvas.instructure.com',
        schedule: {},
        classes: []
    });

    // Load auth token on startup
    loadAuthToken();

    // Create context menu
    createContextMenu();
});

// Create context menu
function createContextMenu() {
    // Remove existing context menus first
    chrome.contextMenus.removeAll(function() {
        // Create new context menu items
        chrome.contextMenus.create({
            id: "open-schedule",
            title: "Schedule",
            contexts: ["all"]
        });

        chrome.contextMenus.create({
            id: "current-class",
            title: "Go to Current Class",
            contexts: ["all"]
        });
    });
}

// Load auth token and canvas instance from storage
async function loadAuthToken() {
    const result = await chrome.storage.local.get(['authToken', 'canvasInstance']);
    authToken = result.authToken;
    CANVAS_API_BASE = `${result.canvasInstance || 'https://canvas.instructure.com'}/api/v1`;
}

// Handle messages from popup and other parts
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    switch (request.action) {
        case 'getCurrentUser':
            getCurrentUser().then(sendResponse).catch(error => {
                console.error('Error getting current user:', error);
                sendResponse({ error: error.message });
            });
            return true; // Keep message channel open for async response

        case 'getCourses':
            getCourses().then(sendResponse).catch(error => {
                console.error('Error getting courses:', error);
                sendResponse({ error: error.message });
            });
            return true; // Keep message channel open for async response

        case 'authenticate':
            authenticate().then(sendResponse).catch(error => {
                console.error('Authentication error:', error);
                sendResponse({ error: error.message });
            });
            return true;

        case 'processPDF':
            processPDF(request.data).then(sendResponse).catch(error => {
                console.error('Error processing PDF:', error);
                sendResponse({ error: error.message });
            });
            return true;

        default:
            sendResponse({ error: 'Unknown action' });
    }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(function(info, tab) {
    switch (info.menuItemId) {
        case "open-schedule":
            // Open schedule page in new tab
            chrome.tabs.create({
                url: chrome.runtime.getURL('schedule.html')
            });
            break;

        case "current-class":
            // Handle current class navigation
            handleCurrentClassNavigation(tab);
            break;
    }
});

// Handle current class navigation
async function handleCurrentClassNavigation(tab) {
    try {
        // Get current time and determine what period we're in
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour * 60 + currentMinute;

        // Get schedule settings and current schedule
        const result = await chrome.storage.local.get(['scheduleSettings', 'schedule']);
        const settings = result.scheduleSettings;
        const schedule = result.schedule;

        if (!settings || !schedule) {
            console.log('No schedule settings or schedule found');
            return;
        }

        // Calculate current period based on settings
        const currentPeriod = calculateCurrentPeriod(currentTime, settings);

        if (currentPeriod) {
            // Get current day (A, B, or C)
            const currentDay = getCurrentDay();

            // Find the class for current period and day
            const daySchedule = schedule[currentDay];
            if (daySchedule) {
                const currentClass = daySchedule.find(item => item.period === currentPeriod);
                if (currentClass && currentClass.url) {
                    // Open the class URL
                    chrome.tabs.create({
                        url: currentClass.url
                    });
                    return;
                }
            }
        }

        // If no specific class found, open Canvas homepage
        chrome.tabs.create({
            url: settings.canvasInstance || 'https://canvas.instructure.com'
        });

    } catch (error) {
        console.error('Error in handleCurrentClassNavigation:', error);
    }
}

// Calculate current period based on time and settings
function calculateCurrentPeriod(currentTime, settings) {
    const startTime = settings.startTime || '07:00';
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const startTimeMinutes = startHour * 60 + startMinute;

    const periodLength = settings.periodLength || 55;
    const passingTime = settings.passingTime || 5;

    if (currentTime < startTimeMinutes) {
        return null; // Before school starts
    }

    // Calculate which period we're in
    let periodStartTime = startTimeMinutes;

    for (let period = 1; period <= (settings.periods || 7); period++) {
        const periodEndTime = periodStartTime + periodLength;

        // Check if this is lunch time
        const dayNames = ['A', 'B', 'C'];
        const currentDay = getCurrentDay();
        const lunchPeriod = settings[`lunchPeriod${currentDay}`];

        if (period === (lunchPeriod || 4) + 1) {
            // This is lunch period
            const lunchStartTime = periodStartTime;
            const lunchEndTime = lunchStartTime + (settings.lunchLength || 40);

            if (currentTime >= lunchStartTime && currentTime < lunchEndTime) {
                return period; // Currently in lunch
            }

            periodStartTime = lunchEndTime + passingTime;
        } else {
            // Regular period
            if (currentTime >= periodStartTime && currentTime < periodEndTime) {
                return period; // Currently in this period
            }

            periodStartTime = periodEndTime + passingTime;
        }
    }

    return null; // After school or no period found
}

// Get current day (A, B, or C) - simplified logic
function getCurrentDay() {
    // For demo purposes, return 'A'
    // In a real implementation, you might use a rotating schedule
    // or get this information from a stored schedule
    return 'A';
}

// Get courses from Canvas API
async function getCourses() {
    if (!authToken) {
        throw new Error('Not authenticated with Canvas');
    }

    try {
        // Get courses
        const response = await fetch(`${CANVAS_API_BASE}/courses`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const courses = await response.json();

        // Transform to our format
        const transformedCourses = courses.map(course => ({
            id: course.id.toString(),
            name: course.name || course.course_code,
            url: course.html_url || `${CANVAS_API_BASE.replace('/api/v1', '')}/courses/${course.id}`
        }));

        // Store classes
        await chrome.storage.local.set({ classes: transformedCourses });

        return transformedCourses;
    } catch (error) {
        console.error('Error fetching courses:', error);
        throw error;
    }
}

// Authenticate with Canvas using stored API token
async function authenticate() {
    const result = await chrome.storage.local.get(['authToken', 'canvasInstance']);
    authToken = result.authToken;
    CANVAS_API_BASE = `${result.canvasInstance || 'https://canvas.instructure.com'}/api/v1`;

    if (!authToken) {
        throw new Error('No authentication token found. Please set it in the options page.');
    }

    return { success: true };
}

// Get current user from Canvas API
async function getCurrentUser() {
    if (!authToken) {
        throw new Error('Not authenticated with Canvas');
    }

    try {
        const response = await fetch(`${CANVAS_API_BASE}/users/self`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const user = await response.json();

        // Transform to our format
        const userInfo = {
            id: user.id.toString(),
            name: user.name,
            email: user.primary_email || user.email,
            avatar_url: user.avatar_url
        };

        return userInfo;
    } catch (error) {
        console.error('Error fetching current user:', error);
        throw error;
    }
}

// Process PDF file and extract text
async function processPDF(arrayBuffer) {
    try {
        // For browser extension context, we'll use a different approach
        // Since we can't directly access Python libraries in the service worker,
        // we'll return the raw data and handle parsing in the content script

        // Convert array buffer to base64 for transport
        const bytes = new Uint8Array(arrayBuffer);
        const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
        const base64Data = btoa(binary);

        // For now, we'll use a simple approach that works in browser context
        // In a production environment, you might want to use a PDF.js library
        // or send the data to a server-side processing endpoint

        return {
            text: base64Data,
            method: 'base64',
            success: true
        };

    } catch (error) {
        console.error('Error in processPDF:', error);
        throw error;
    }
}

// Helper function to get current Canvas instance URL
async function getCanvasInstance() {
    const result = await chrome.storage.local.get(['canvasInstance']);
    return result.canvasInstance || 'https://canvas.instructure.com';
}
