// schedule.js - Schedule management with drag and drop functionality

let classes = [];
let schedule = {};
let draggedClass = null;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize
    loadDevMode();
    loadSchedule();
    loadClasses();
    generateScheduleGrid();

    // Event listeners
    document.getElementById('refreshClasses').addEventListener('click', loadClasses);
    document.getElementById('saveSchedule').addEventListener('click', saveSchedule);
    document.getElementById('clearSchedule').addEventListener('click', clearSchedule);

    // Drag and drop setup
    setupDragAndDrop();
});

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

// Generate schedule grid
function generateScheduleGrid() {
    const container = document.getElementById('scheduleContainer');
    container.innerHTML = '';

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const startHour = 8;
    const endHour = 20; // 8 PM

    for (let hour = startHour; hour < endHour; hour++) {
        const row = document.createElement('div');
        row.className = 'schedule-row';
        row.style.display = 'flex';

        // Time column
        const timeCol = document.createElement('div');
        timeCol.className = 'time-column';
        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-label';
        timeLabel.textContent = `${hour}:00`;
        timeCol.appendChild(timeLabel);
        row.appendChild(timeCol);

        // Day columns
        days.forEach(day => {
            const dayCol = document.createElement('div');
            dayCol.className = 'day-column';

            // Create two slots per hour (30-minute intervals)
            for (let slot = 0; slot < 2; slot++) {
                const timeSlot = document.createElement('div');
                timeSlot.className = 'time-slot';
                timeSlot.dataset.day = day;
                timeSlot.dataset.time = `${hour.toString().padStart(2, '0')}:${slot === 0 ? '00' : '30'}`;

                // Check if this slot is occupied
                const daySchedule = schedule[day] || [];
                const occupiedClass = daySchedule.find(item => item.time === timeSlot.dataset.time);

                if (occupiedClass) {
                    timeSlot.className += ' occupied';
                    timeSlot.textContent = occupiedClass.course_name;
                    timeSlot.title = `Click to remove ${occupiedClass.course_name}`;
                    timeSlot.addEventListener('click', () => removeClassFromSlot(day, timeSlot.dataset.time));
                } else {
                    timeSlot.textContent = '';
                }

                dayCol.appendChild(timeSlot);
            }

            row.appendChild(dayCol);
        });

        container.appendChild(row);
    }
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
        if (e.target.classList.contains('time-slot') && !e.target.classList.contains('occupied')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            e.target.style.backgroundColor = '#e9ecef';
        }
    });

    // Drag leave
    document.addEventListener('dragleave', function(e) {
        if (e.target.classList.contains('time-slot')) {
            e.target.style.backgroundColor = '';
        }
    });

    // Drop
    document.addEventListener('drop', function(e) {
        e.preventDefault();

        if (e.target.classList.contains('time-slot') && !e.target.classList.contains('occupied') && draggedClass) {
            const day = e.target.dataset.day;
            const time = e.target.dataset.time;

            // Add class to schedule
            addClassToSchedule(day, time, draggedClass);

            // Reset drag state
            e.target.style.backgroundColor = '';
            draggedClass = null;
        }
    });
}

// Add class to schedule
function addClassToSchedule(day, time, classItem) {
    if (!schedule[day]) {
        schedule[day] = [];
    }

    // Check for conflicts (though we prevent dropping on occupied slots)
    const existing = schedule[day].find(item => item.time === time);
    if (existing) {
        return; // Slot already occupied
    }

    schedule[day].push({
        time: time,
        course_id: classItem.id,
        course_name: classItem.name,
        url: classItem.url
    });

    // Sort by time
    schedule[day].sort((a, b) => a.time.localeCompare(b.time));

    // Regenerate grid
    generateScheduleGrid();
}

// Remove class from slot
function removeClassFromSlot(day, time) {
    if (schedule[day]) {
        schedule[day] = schedule[day].filter(item => item.time !== time);
        generateScheduleGrid();
    }
}

// Save schedule to storage
function saveSchedule() {
    chrome.storage.local.set({ schedule: schedule }, function() {
        showStatus('Schedule saved successfully!', 'success');
    });
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
        generateScheduleGrid();
        saveSchedule();
        showStatus('Schedule cleared.', 'success');
    }
}

// Load dev mode setting and show/hide manual user ID input
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
