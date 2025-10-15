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
    document.getElementById('importPDF').addEventListener('click', importPDFFile);

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

    document.getElementById('lunchPeriodA').addEventListener('change', function() {
        scheduleSettings.lunchPeriodA = parseInt(this.value);
        generateScheduleTable();
    });

    document.getElementById('lunchPeriodB').addEventListener('change', function() {
        scheduleSettings.lunchPeriodB = parseInt(this.value);
        generateScheduleTable();
    });

    document.getElementById('lunchPeriodC').addEventListener('change', function() {
        scheduleSettings.lunchPeriodC = parseInt(this.value);
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
                lunchPeriodA: 4,
                lunchPeriodB: 4,
                lunchPeriodC: 4,
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

    // Update individual lunch periods
    if (scheduleSettings.lunchPeriodA) document.getElementById('lunchPeriodA').value = scheduleSettings.lunchPeriodA;
    if (scheduleSettings.lunchPeriodB) document.getElementById('lunchPeriodB').value = scheduleSettings.lunchPeriodB;
    if (scheduleSettings.lunchPeriodC) document.getElementById('lunchPeriodC').value = scheduleSettings.lunchPeriodC;

    document.getElementById('lunchLength').value = scheduleSettings.lunchLength;
}

// Generate schedule table based on settings
function generateScheduleTable() {
    const tbody = document.getElementById('scheduleBody');
    tbody.innerHTML = '';

    const dayNames = ['A', 'B', 'C'];
    let currentTime = new Date(`2000-01-01T${scheduleSettings.startTime}`);

    for (let period = 1; period <= scheduleSettings.periods; period++) {
        const row = document.createElement('tr');

        // Time cell
        const timeCell = document.createElement('td');
        timeCell.className = 'time-cell';

        // Check if this period is lunch time for any day
        const lunchDay = dayNames.find(dayName => {
            const lunchPeriod = scheduleSettings[`lunchPeriod${dayName}`];
            return period === lunchPeriod + 1;
        });

        if (lunchDay) {
            // Lunch period for this specific day
            const lunchPeriod = scheduleSettings[`lunchPeriod${lunchDay}`];
            const lunchStartTime = new Date(currentTime.getTime() + ((lunchPeriod - 1) * (scheduleSettings.periodLength + scheduleSettings.passingTime) * 60000));
            const lunchEndTime = new Date(lunchStartTime.getTime() + (scheduleSettings.lunchLength * 60000));

            timeCell.innerHTML = `
                <div>PAWS</div>
                <div style="font-size: 10px; opacity: 0.7;">${formatTime(lunchStartTime)} - ${formatTime(lunchEndTime)}</div>
            `;
            row.appendChild(timeCell);

            // Add cells for each day
            dayNames.forEach(dayName => {
                const cell = document.createElement('td');
                cell.className = 'period-cell';

                const lunchPeriodForDay = scheduleSettings[`lunchPeriod${dayName}`];
                if (period === lunchPeriodForDay + 1) {
                    // This is lunch time for this day
                    cell.className = 'period-cell passing-period';
                    cell.textContent = 'PAWS';
                } else {
                    // Regular period for this day
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
                }

                row.appendChild(cell);
            });
        } else {
            // Regular period
            const periodStartTime = new Date(currentTime.getTime());
            const periodEndTime = new Date(periodStartTime.getTime() + (scheduleSettings.periodLength * 60000));

            timeCell.innerHTML = `
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
        if (e.target.classList.contains('period-cell')) {
            const daySchedule = schedule[e.target.dataset.day] || [];
            const existingClass = daySchedule.find(item => item.period === parseInt(e.target.dataset.period));

            if (!existingClass) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                e.target.style.backgroundColor = '#e8f4fd';
            }
        }
    });

    // Drag leave
    document.addEventListener('dragleave', function(e) {
        if (e.target.classList.contains('period-cell')) {
            e.target.style.backgroundColor = '';
        }
    });

    // Drop
    document.addEventListener('drop', function(e) {
        e.preventDefault();

        if (e.target.classList.contains('period-cell') && draggedClass) {
            const day = e.target.dataset.day;
            const period = parseInt(e.target.dataset.period);

            // Check if this period is already occupied
            const daySchedule = schedule[day] || [];
            const existingClass = daySchedule.find(item => item.period === period);

            if (!existingClass) {
                // Add class to schedule
                addClassToPeriod(day, period, draggedClass);
            }

            draggedClass = null;
        }

        // Reset background color
        e.target.style.backgroundColor = '';
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

// Import PDF file and parse schedule
async function importPDFFile() {
    const fileInput = document.getElementById('pdfImport');
    const file = fileInput.files[0];

    if (!file) {
        showStatus('Please select a PDF file first.', 'error');
        return;
    }

    try {
        showStatus('Processing PDF...', '');

        // Read file as array buffer
        const arrayBuffer = await file.arrayBuffer();

        // Send to background script for processing (since we need Python there)
        const response = await chrome.runtime.sendMessage({
            action: 'processPDF',
            data: arrayBuffer
        });

        if (response.error) {
            throw new Error(response.error);
        }

        // Parse the extracted text and create schedule
        const scheduleData = parsePDFScheduleText(response.text);

        if (scheduleData.length === 0) {
            throw new Error('No schedule data found in PDF');
        }

        // Apply the parsed schedule
        applyParsedSchedule(scheduleData);

        showStatus(`Successfully imported schedule with ${scheduleData.length} classes.`, 'success');

    } catch (error) {
        console.error('Error importing PDF:', error);
        showStatus(`Error importing PDF: ${error.message}`, 'error');
    }
}

// Parse PDF text to extract schedule information
function parsePDFScheduleText(text) {
    const scheduleData = [];

    // Split by day patterns
    const dayPatterns = [
        { pattern: /Day A \(MS\)/i, day: 'A' },
        { pattern: /Day B \(MS\)/i, day: 'B' },
        { pattern: /Day C \(MS\)/i, day: 'C' }
    ];

    dayPatterns.forEach(({ pattern, day }) => {
        const dayMatch = text.match(new RegExp(pattern.source + '(.*?)(?:Day|$)', 'is'));
        if (dayMatch) {
            const dayContent = dayMatch[1];

            // Extract classes for each period
            const classMatches = dayContent.match(/([A-Z]\d+[a-z]?\s*-\s*[^-\n]+)(?:\s*-|$)/g);

            if (classMatches) {
                classMatches.forEach((classText, index) => {
                    const period = index + 1;

                    // Extract course code and name
                    const parts = classText.split(' - ');
                    if (parts.length >= 2) {
                        const courseCode = parts[0].trim();
                        const courseName = parts[1].trim();

                        // Extract teacher and room from the next line if available
                        const lines = dayContent.split('\n');
                        let teacher = '';
                        let room = '';

                        // Look for teacher and room info in subsequent lines
                        for (let i = 0; i < lines.length; i++) {
                            if (lines[i].includes(courseCode)) {
                                // Check next few lines for teacher/room info
                                for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
                                    const line = lines[j].trim();
                                    if (line && !line.match(/^\d|AM|PM|Period|Day/i)) {
                                        if (!teacher && line.match(/^[A-Z][a-z]+/)) {
                                            teacher = line;
                                        } else if (!room && line.match(/Room/i)) {
                                            const roomMatch = line.match(/Room\s*(\d+)/i);
                                            if (roomMatch) {
                                                room = `Room ${roomMatch[1]}`;
                                            }
                                        }
                                    }
                                }
                                break;
                            }
                        }

                        scheduleData.push({
                            day: day,
                            period: period,
                            course_code: courseCode,
                            course_name: courseName,
                            teacher: teacher,
                            room: room
                        });
                    }
                });
            }
        }
    });

    return scheduleData;
}

// Apply parsed schedule data to the current schedule
function applyParsedSchedule(scheduleData) {
    // Clear existing schedule
    schedule = {};

    // Group by day
    const dayGroups = {
        'A': [],
        'B': [],
        'C': []
    };

    scheduleData.forEach(item => {
        if (dayGroups[item.day]) {
            dayGroups[item.day].push({
                period: item.period,
                course_id: item.course_code,
                course_name: item.course_name,
                teacher: item.teacher,
                room: item.room,
                url: '' // PDF imports don't have URLs
            });
        }
    });

    // Apply to schedule object
    Object.keys(dayGroups).forEach(day => {
        if (dayGroups[day].length > 0) {
            schedule[day] = dayGroups[day];
        }
    });

    // Save and regenerate table
    saveSchedule();
    generateScheduleTable();

    // Update student info if found in PDF
    updateStudentInfoFromPDF(text);
}

// Extract and update student information from PDF
function updateStudentInfoFromPDF(text) {
    // Try to extract student name
    const nameMatch = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*—\s*MS/i);
    if (nameMatch) {
        const fullName = nameMatch[1];
        document.getElementById('studentName').textContent = fullName;

        // Also try to extract grade
        const gradeMatch = text.match(/Grade\s+(\d+)/i);
        if (gradeMatch) {
            const grade = gradeMatch[1];
            document.getElementById('studentDetails').textContent = `Grade ${grade} • Advisor: Available in full profile`;
        }
    }
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
