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
});

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
        // Convert array buffer to base64 for Python processing
        const bytes = new Uint8Array(arrayBuffer);
        const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
        const base64Data = btoa(binary);

        // Create a temporary file for Python processing
        const tempFileName = `temp_${Date.now()}.pdf`;

        // Use Python to extract text from PDF
        const pythonScript = `
import base64
import tempfile
import os
import pdfplumber
import sys

try:
    # Get base64 data from command line argument
    base64_data = sys.argv[1]

    # Decode base64
    pdf_data = base64.b64decode(base64_data)

    # Create temporary file
    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
        temp_file.write(pdf_data)
        temp_file_path = temp_file.name

    # Extract text using pdfplumber
    all_text = ''
    with pdfplumber.open(temp_file_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                all_text += text + '\\\\n'

    # Clean up temporary file
    os.unlink(temp_file_path)

    # Print the extracted text
    print(all_text)

except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;

        // Execute Python script
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        const { stdout, stderr } = await execAsync(`python -c "${pythonScript}" "${base64Data}"`);

        if (stderr) {
            throw new Error(stderr);
        }

        return { text: stdout.trim() };

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
