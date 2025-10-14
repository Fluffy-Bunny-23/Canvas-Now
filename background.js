// background.js - Service worker for Canvas-Now extension

// Canvas API configuration
const CANVAS_API_BASE = 'https://canvas.instructure.com/api/v1';

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
});

// Load auth token from storage
async function loadAuthToken() {
    const result = await chrome.storage.local.get(['authToken']);
    authToken = result.authToken;
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

        default:
            sendResponse({ error: 'Unknown action' });
    }
});

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

// Authenticate with Canvas (simplified - would need proper OAuth implementation)
async function authenticate() {
    // This is a placeholder - real implementation would use OAuth 2.0
    // For now, we'll assume the token is stored manually

    const result = await chrome.storage.local.get(['authToken']);
    authToken = result.authToken;

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

// Helper function to get current Canvas instance URL
async function getCanvasInstance() {
    const result = await chrome.storage.local.get(['canvasInstance']);
    return result.canvasInstance || 'https://canvas.instructure.com';
}
