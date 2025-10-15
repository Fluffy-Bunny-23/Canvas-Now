// schedule.js - Redesigned schedule management

let classes = [];
let schedule = {};
let scheduleSettings = {};
let draggedClass = null;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize
    loadUserInfo();
    loadDevMode();
    loadScheduleSettings();
    loadSchedule();
    loadClasses();
    generateScheduleTable();

    // Event listeners
    document.getElementById('refreshClasses').addEventListener('click', loadClasses);
    document.getElementById('generateSchedule').addEventListener('click', generateScheduleTable);
    document.getElementById('saveSchedule').addEventListener('click', saveSchedule);
    document.getElementById('clearSchedule').addEventListener('click', clearSchedule);

    // Settings event listeners
    document.querySelectorAll('.day-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            scheduleSettings.days = parseInt(this.dataset.days);
            generateScheduleTable();
        });
    });

    document.getElementById('periodsPerDay').addEventListener('change', function() {
        scheduleSettings.periods = parseInt(this.value);
        generateScheduleTable();
    });

    document.getElementById('startTime').addEventListener('change', function() {
        scheduleSettings.startTime = this.value;
        generateScheduleTable();
    });

    document.getElementById('periodLength').addEventListener('input', function() {
        scheduleSettings.periodLength = parseInt(this.value);
        generateScheduleTable();
    });

    document.getElementById('passingTime').addEventListener('input', function() {
        scheduleSettings.passingTime = parseInt(this.value);
        generateScheduleTable();
    });

    document.getElementById('lunchPeriod').addEventListener('change', function() {
        scheduleSettings.lunchPeriod = parseInt(this.value);
        generateScheduleTable();
    });

    document.getElementById('lunchLength').addEventListener('input', function() {
        scheduleSettings.lunchLength = parseInt(this.value);
        generateScheduleTable();
    });

    // Drag and drop setup
    setupDragAndDrop();
});

// Load user info from API
async function loadUserInfo() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'getCurrentUser' });
        if (response.error) {
            throw new Error(response.error);
        }

        document.getElementById('studentName').textContent = response.name;
        document.getElementById('studentDetails').textContent = 'Grade 7 • Advisor: Available in full profile';
    } catch (error) {
        console.error('Error loading user info:', error);
        document.getElementById('studentName').textContent = 'Student Name';
        document.getElementById('studentDetails').textContent = 'Grade 7 • Advisor: Available in full profile';
    }
}

// Load classes from storage/Canvas API
async function loadClasses() {
    try {
        showStatus('Loading classes...', '');

        // Try to get from storage first
        const result = await chrome.storage.local.get(['classes']);
        if (result.classes && result.classes.length > 0) {
            classes = result.classes;
            renderClassList();
            showStatus('Classes loaded from cache.', 'success');
            return;
        }

        // If not in storage, fetch from API
        const response = await chrome.runtime.sendMessage({ action: 'getCourses' });

        if (response.error) {
            throw new Error(response.error);
        }

        classes = response;
        renderClassList();
        showStatus(`Loaded ${classes.length} classes from Canvas.`, 'success');
    } catch (error) {
        console.error('Error loading classes:', error);
        showStatus(`Error loading classes: ${error.message}`, 'error');
    }
}

// Render class list in sidebar
function renderClassList() {
    const classList = document.getElementById('classList');
    classList.innerHTML = '';

    if (classes.length === 0) {
        classList.innerHTML = '<p>No classes found. Make sure you\'re authenticated with Canvas.</p>';
        return;
    }

    classes.forEach(classItem => {
        const div = document.createElement('div');
        div.className = 'class-item';
        div.draggable = true;
        div.dataset.classId = classItem.id;
        div.dataset.className = classItem.name;
        div.dataset.classUrl = classItem.url;
        div.textContent = classItem.name;
        classList.appendChild(div);
    });
}

// Load schedule settings
function loadScheduleSettings() {
    chrome.storage.local.get(['scheduleSettings'], function(result) {
        if (result.scheduleSettings) {
            scheduleSettings = result.scheduleSettings;
        } else {
            // Default settings matching the image
            scheduleSettings = {
                days: 3,
                periods: 7,
                startTime: '07:00',
                periodLength: 55,
                passingTime: 5,
                lunchPeriod: 4,
                lunchLength: 40
            };
        }
        updateSettingsUI();
    });
}

// Update settings UI to match current settings
function updateSettingsUI() {
    // Update day buttons
    document.querySelectorAll('.day-btn').forEach(btn => {
        if (parseInt(btn.dataset.days) === scheduleSettings.days) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update other settings
    document.getElementById('periodsPerDay').value = scheduleSettings.periods;
    document.getElementById('startTime').value = scheduleSettings.startTime;
    document.getElementById('periodLength').value = scheduleSettings.periodLength;
    document.getElementById('passingTime').value = scheduleSettings.passingTime;
    document.getElementById('lunchPeriod').value = scheduleSettings.lunchPeriod;
    document.getElementById('lunchLength').value = scheduleSettings.lunchLength;
}

// Generate schedule table based on settings
function generateScheduleTable() {
    const tbody = document.getElementById('scheduleBody');
    tbody.innerHTML = '';

    const dayNames = ['A', 'B', 'C'];
    let currentTime = new Date(`2000-01-01T${scheduleSettings.startTime}`);
    const lunchStartTime = new Date(currentTime.getTime() + (scheduleSettings.lunchPeriod * (scheduleSettings.periodLength + scheduleSettings.passingTime) * 60000));

    for (let period = 1; period <= scheduleSettings.periods; period++) {
        const row = document.createElement('tr');

        // Time cell
        const timeCell = document.createElement('td');
        timeCell.className = 'time-cell';

        if (period === scheduleSettings.lunchPeriod + 1) {
            // Lunch period
            const lunchEndTime = new Date(lunchStartTime.getTime() + (scheduleSettings.lunchLength * 60000));
            timeCell.innerHTML = `
                <div>PAWS</div>
                <div style="font-size: 10px; opacity: 0.7;">${formatTime(lunchStartTime)} - ${formatTime(lunchEndTime)}</div>
            `;
            row.appendChild(timeCell);

            // Add lunch cells for each day
            dayNames.forEach(dayName => {
                const cell = document.createElement('td');
                cell.className = 'period-cell passing-period';
                cell.textContent = 'PAWS';
                cell.colSpan = '1';
                row.appendChild(cell);
            });
        } else {
            // Regular period
            const periodStartTime = new Date(currentTime.getTime());
            const periodEndTime = new Date(periodStartTime.getTime() + (scheduleSettings.periodLength * 60000));

            timeCell.innerHTML = `
                <div class="period-label">${String.fromCharCode(64 + period)}</div>
                <div style="font-size: 10px; opacity: 0.7;">${formatTime(periodStartTime)} - ${formatTime(periodEndTime)}</div>
            `;
            row.appendChild(timeCell);

            // Add cells for each day
            dayNames.forEach(dayName => {
                const cell = document.createElement('td');
                cell.className = 'period-cell';
                cell.dataset.day = dayName;
                cell.dataset.period = period;

                // Check if this period has a class scheduled
                const daySchedule = schedule[dayName] || [];
                const scheduledClass = daySchedule.find(item => item.period === period);

                if (scheduledClass) {
                    cell.innerHTML = `
                        <div class="period-content">
                            <strong>${scheduledClass.course_name}</strong><br>
                            <span style="font-size: 10px;">${scheduledClass.teacher || ''}</span><br>
                            <span style="font-size: 10px; opacity: 0.7;">${scheduledClass.room || ''}</span>
                        </div>
                    `;
                    cell.style.backgroundColor = getPeriodColor(period);
                    cell.addEventListener('click', () => removeClassFromPeriod(dayName, period));
                } else {
                    cell.innerHTML = '<div class="period-content">Click to add class</div>';
                    cell.style.backgroundColor = getPeriodColor(period) + '40'; // Lighter opacity
                    cell.addEventListener('click', () => cell.classList.add('highlight'));
                }

                row.appendChild(cell);
            });

            // Move to next period
            currentTime = new Date(periodEndTime.getTime() + (scheduleSettings.passingTime * 60000));
        }

        tbody.appendChild(row);
    }

    // Save settings
    chrome.storage.local.set({ scheduleSettings: scheduleSettings });
}

// Helper function to format time
function formatTime(date) {
    return date.toTimeString().slice(0, 5);
}

// Get period color based on period number
function getPeriodColor(period) {
    const colors = [
        '#f8c471', // Light orange
        '#85c1e9', // Light blue
        '#82e0aa', // Light green
        '#f1948a', // Light red
        '#bb8fce', // Light purple
        '#f7dc6f', // Light yellow
        '#85c1e9'  // Light blue again
    ];
    return colors[(period - 1) % colors.length];
}

// Setup drag and drop functionality
function setupDragAndDrop() {
    // Drag start
    document.addEventListener('dragstart', function(e) {
        if (e.target.classList.contains('class-item')) {
            draggedClass = {
                id: e.target.dataset.classId,
                name: e.target.dataset.className,
                url: e.target.dataset.classUrl
            };
            e.dataTransfer.effectAllowed = 'copy';
        }
    });

    // Drag over
    document.addEventListener('dragover', function(e) {
        if (e.target.classList.contains('period-cell') && !e.target.textContent.includes('Click to add class')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        }
    });

    // Drop
    document.addEventListener('drop', function(e) {
        e.preventDefault();

        if (e.target.classList.contains('period-cell') && draggedClass) {
            const day = e.target.dataset.day;
            const period = parseInt(e.target.dataset.period);

            // Add class to schedule
            addClassToPeriod(day, period, draggedClass);
            draggedClass = null;
        }
    });
}

// Add class to specific period
function addClassToPeriod(day, period, classItem) {
    if (!schedule[day]) {
        schedule[day] = [];
    }

    // Remove any existing class in this period
    schedule[day] = schedule[day].filter(item => item.period !== period);

    // Add new class
    schedule[day].push({
        period: period,
        course_id: classItem.id,
        course_name: classItem.name,
        url: classItem.url
    });

    // Regenerate table
    generateScheduleTable();
    saveSchedule();
}

// Remove class from specific period
function removeClassFromPeriod(day, period) {
    if (schedule[day]) {
        schedule[day] = schedule[day].filter(item => item.period !== period);
        generateScheduleTable();
        saveSchedule();
    }
}

// Save schedule to storage
function saveSchedule() {
    chrome.storage.local.set({ schedule: schedule });
}

// Load schedule from storage
function loadSchedule() {
    chrome.storage.local.get(['schedule'], function(result) {
        if (result.schedule) {
            schedule = result.schedule;
        }
    });
}

// Clear all schedule
function clearSchedule() {
    if (confirm('Are you sure you want to clear your entire schedule?')) {
        schedule = {};
        generateScheduleTable();
        saveSchedule();
        showStatus('Schedule cleared.', 'success');
    }
}

// Load dev mode setting and show/hide dev mode indicator
function loadDevMode() {
    chrome.storage.local.get(['devMode'], function(result) {
        const devModeSection = document.getElementById('devModeSection');
        if (result.devMode) {
            devModeSection.style.display = 'block';
        } else {
            devModeSection.style.display = 'none';
        }
    });
}

// Show status message
function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + type;
    statusDiv.style.display = 'block';

    if (type === 'success') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }
}
