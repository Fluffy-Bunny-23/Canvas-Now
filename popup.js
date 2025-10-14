// popup.js - Main popup functionality for Canvas-Now extension

document.addEventListener('DOMContentLoaded', function() {
    const switchClassBtn = document.getElementById('switchClass');
    const openScheduleBtn = document.getElementById('openSchedule');
    const statusDiv = document.getElementById('status');

    // Switch to current class
    switchClassBtn.addEventListener('click', async function() {
        try {
            statusDiv.textContent = 'Finding current class...';

            // Get current class from schedule
            const currentClass = await getCurrentClass();

            if (currentClass) {
                // Open Canvas class page
                chrome.tabs.create({ url: currentClass.url });
                statusDiv.textContent = `Opening ${currentClass.name}...`;
                window.close();
            } else {
                statusDiv.textContent = 'No current class found. Check your schedule.';
            }
        } catch (error) {
            console.error('Error switching to class:', error);
            statusDiv.textContent = 'Error: Could not switch to class.';
        }
    });

    // Open schedule management page
    openScheduleBtn.addEventListener('click', function() {
        chrome.tabs.create({ url: chrome.runtime.getURL('schedule.html') });
        window.close();
    });
});

// Get current class based on time and schedule
async function getCurrentClass() {
    try {
        // Get stored schedule
        const result = await chrome.storage.local.get(['schedule']);
        const schedule = result.schedule || {};

        // Get current day and time
        const now = new Date();
        const dayOfWeek = now.toLocaleLowerCase('en-US', { weekday: 'long' });
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

        // Find classes for today
        const todayClasses = schedule[dayOfWeek] || [];

        // Find current or next class
        for (const classItem of todayClasses) {
            if (currentTime <= classItem.time) {
                return {
                    name: classItem.course_name,
                    url: classItem.url || `https://canvas.instructure.com/courses/${classItem.course_id}`
                };
            }
        }

        return null;
    } catch (error) {
        console.error('Error getting current class:', error);
        return null;
    }
}
