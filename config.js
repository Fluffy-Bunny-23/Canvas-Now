// config.js - Settings page functionality

document.addEventListener('DOMContentLoaded', function() {
    const canvasInstanceInput = document.getElementById('canvasInstance');
    const authTokenInput = document.getElementById('authToken');
    const saveSettingsBtn = document.getElementById('saveSettings');
    const testConnectionBtn = document.getElementById('testConnection');
    const manageScheduleLink = document.getElementById('manageSchedule');
    const statusDiv = document.getElementById('status');

    // Load saved settings
    loadSettings();

    // Save settings
    saveSettingsBtn.addEventListener('click', function() {
        const canvasInstance = canvasInstanceInput.value.trim();
        const authToken = authTokenInput.value.trim();
        const devMode = document.getElementById('devMode').checked;

        if (!canvasInstance) {
            showStatus('Please enter a Canvas instance URL.', 'error');
            return;
        }

        if (!authToken) {
            showStatus('Please enter your Canvas API token.', 'error');
            return;
        }

        // Save settings
        chrome.storage.local.set({
            canvasInstance: canvasInstance,
            authToken: authToken,
            devMode: devMode
        }, function() {
            showStatus('Settings saved successfully!', 'success');

            // Update background script with new token
            chrome.runtime.sendMessage({ action: 'authenticate' });
        });
    });

    // Test connection
    testConnectionBtn.addEventListener('click', async function() {
        const canvasInstance = canvasInstanceInput.value.trim();
        const authToken = authTokenInput.value.trim();

        if (!canvasInstance || !authToken) {
            showStatus('Please fill in both fields before testing.', 'error');
            return;
        }

        showStatus('Testing connection...', '');

        try {
            // Save temporarily for testing
            await chrome.storage.local.set({
                canvasInstance: canvasInstance,
                authToken: authToken
            });

            // Test authentication
            const authResult = await chrome.runtime.sendMessage({ action: 'authenticate' });

            if (authResult.error) {
                throw new Error(authResult.error);
            }

            // Test getting current user
            const user = await chrome.runtime.sendMessage({ action: 'getCurrentUser' });

            if (user.error) {
                throw new Error(user.error);
            }

            showStatus(`Connection successful! Logged in as ${user.name} (${user.email}).`, 'success');
        } catch (error) {
            console.error('Connection test failed:', error);
            showStatus(`Connection failed: ${error.message}`, 'error');
        }
    });

    // Manage schedule link
    manageScheduleLink.addEventListener('click', function(e) {
        e.preventDefault();
        chrome.tabs.create({ url: chrome.runtime.getURL('schedule.html') });
    });
});

// Load saved settings
function loadSettings() {
    chrome.storage.local.get(['canvasInstance', 'authToken', 'devMode'], function(result) {
        if (result.canvasInstance) {
            document.getElementById('canvasInstance').value = result.canvasInstance;
        }
        if (result.authToken) {
            document.getElementById('authToken').value = result.authToken;
        }
        if (result.devMode) {
            document.getElementById('devMode').checked = result.devMode;
        }
    });
}

// Show status message
function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = type;
    statusDiv.style.display = 'block';

    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
}
