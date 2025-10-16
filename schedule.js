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
    console.log('Loading schedule settings from storage...');
    chrome.storage.local.get(['scheduleSettings'], function(result) {
        console.log('Loaded settings from storage:', result.scheduleSettings);

        if (result.scheduleSettings && result.scheduleSettings.periods && result.scheduleSettings.startTime) {
            scheduleSettings = result.scheduleSettings;
            console.log('Using complete stored settings:', scheduleSettings);
        } else {
            console.log('Stored settings incomplete or missing, using full defaults');
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
            console.log('Applied complete default settings:', scheduleSettings);
        }

        console.log('Final scheduleSettings before UI update:', scheduleSettings);
        updateSettingsUI();
    });
}

// Update settings UI to match current settings
function updateSettingsUI() {
    console.log('Updating settings UI with:', scheduleSettings);

    // Update day buttons
    document.querySelectorAll('.day-btn').forEach(btn => {
        if (parseInt(btn.dataset.days) === scheduleSettings.days) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update other settings (with safety checks)
    if (scheduleSettings.periods) {
        document.getElementById('periodsPerDay').value = scheduleSettings.periods;
    }
    if (scheduleSettings.startTime) {
        document.getElementById('startTime').value = scheduleSettings.startTime;
    }
    if (scheduleSettings.periodLength) {
        document.getElementById('periodLength').value = scheduleSettings.periodLength;
    }
    if (scheduleSettings.passingTime) {
        document.getElementById('passingTime').value = scheduleSettings.passingTime;
    }

    // Update individual lunch periods (with safety checks)
    if (scheduleSettings.lunchPeriodA) {
        document.getElementById('lunchPeriodA').value = scheduleSettings.lunchPeriodA;
    }
    if (scheduleSettings.lunchPeriodB) {
        document.getElementById('lunchPeriodB').value = scheduleSettings.lunchPeriodB;
    }
    if (scheduleSettings.lunchPeriodC) {
        document.getElementById('lunchPeriodC').value = scheduleSettings.lunchPeriodC;
    }
    if (scheduleSettings.lunchLength) {
        document.getElementById('lunchLength').value = scheduleSettings.lunchLength;
    }

    console.log('Settings UI updated successfully');
}

// Generate schedule table based on settings
function generateScheduleTable() {
    console.log('=== GENERATING SCHEDULE TABLE ===');
    console.log('Current schedule object at generation:', schedule);
    console.log('Current scheduleSettings:', scheduleSettings);

    // Ensure we have all required settings
    if (!scheduleSettings.periods || !scheduleSettings.startTime || !scheduleSettings.periodLength) {
        console.error('ERROR: Missing required schedule settings!');
        console.log('Available settings:', scheduleSettings);
        showStatus('Loading schedule settings...', '');
        // Try to reload settings
        setTimeout(() => {
            loadScheduleSettings();
        }, 100);
        return;
    }

    const tbody = document.getElementById('scheduleBody');
    if (!tbody) {
        console.error('ERROR: scheduleBody element not found!');
        return;
    }

    console.log('Clearing existing table...');
    tbody.innerHTML = '';
    console.log('Table cleared, innerHTML length:', tbody.innerHTML.length);

    const dayNames = ['A', 'B', 'C'];
    let currentTime = new Date(`2000-01-01T${scheduleSettings.startTime}`);
    console.log('Starting table generation with', scheduleSettings.periods, 'periods at', scheduleSettings.startTime);

    for (let period = 1; period <= scheduleSettings.periods; period++) {
        console.log('Creating row for period', period);
        console.log('Current time for period', period, ':', currentTime);
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
        console.log('Appended row for period', period, 'to table. Row child count:', tbody.children.length);
    }

    console.log('Table generation completed. Final row count:', tbody.children.length);
    console.log('Table innerHTML length:', tbody.innerHTML.length);
    console.log('Table outerHTML preview:', tbody.outerHTML.substring(0, 200) + '...');

    // Check if table is actually visible
    const table = document.getElementById('scheduleTable');
    if (table) {
        console.log('Schedule table found in DOM');
        console.log('Table display style:', window.getComputedStyle(table).display);
        console.log('Table visibility:', window.getComputedStyle(table).visibility);
        console.log('Table dimensions:', table.offsetWidth, 'x', table.offsetHeight);
    } else {
        console.error('ERROR: Schedule table not found in DOM!');
    }

    // Check tbody visibility
    console.log('Table body display style:', window.getComputedStyle(tbody).display);
    console.log('Table body visibility:', window.getComputedStyle(tbody).visibility);

    // Save complete settings (merge with existing complete settings)
    const completeSettings = {
        days: scheduleSettings.days || 3,
        periods: scheduleSettings.periods || 7,
        startTime: scheduleSettings.startTime || '07:00',
        periodLength: scheduleSettings.periodLength || 55,
        passingTime: scheduleSettings.passingTime || 5,
        lunchPeriodA: scheduleSettings.lunchPeriodA || 4,
        lunchPeriodB: scheduleSettings.lunchPeriodB || 4,
        lunchPeriodC: scheduleSettings.lunchPeriodC || 4,
        lunchLength: scheduleSettings.lunchLength || 40
    };
    chrome.storage.local.set({ scheduleSettings: completeSettings });
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
    console.log('Saving schedule to storage:', schedule);
    chrome.storage.local.set({ schedule: schedule }, function() {
        console.log('Schedule saved to storage successfully');
    });
}

// Load schedule from storage
function loadSchedule() {
    console.log('Loading schedule from storage...');
    chrome.storage.local.get(['schedule'], function(result) {
        if (result.schedule) {
            schedule = result.schedule;
            console.log('Schedule loaded from storage:', schedule);
        } else {
            console.log('No schedule found in storage');
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
    console.log('=== PDF IMPORT STARTED ===');
    const fileInput = document.getElementById('pdfImport');
    const file = fileInput.files[0];

    if (!file) {
        console.error('No file selected');
        showStatus('Please select a PDF file first.', 'error');
        return;
    }

    console.log('File selected:', file.name);

    try {
        showStatus('Processing PDF...', '');
        console.log('Step 1: Processing PDF...');

        // Read file as array buffer
        const arrayBuffer = await file.arrayBuffer();
        console.log('Step 2: File read as array buffer, size:', arrayBuffer.byteLength);

        // Extract text from PDF using PDF.js
        console.log('Step 3: Extracting text from PDF using PDF.js...');
        const pdfText = await extractTextFromPDF(arrayBuffer);
        console.log('Step 4: PDF text extracted, length:', pdfText.length);
        console.log('PDF text preview:', pdfText.substring(0, 500) + '...');

        // Parse the extracted text to get schedule data
        showStatus('Parsing schedule data...', '');
        console.log('Step 5: Parsing schedule from PDF text...');
        const scheduleData = parsePDFScheduleText(pdfText);

        if (scheduleData.length === 0) {
            throw new Error('No schedule data found in PDF. Please ensure the PDF contains a valid school schedule.');
        }

        console.log('Step 6: Parsed schedule data, count:', scheduleData.length);
        console.log('Schedule data preview:', scheduleData.slice(0, 5));

        // Apply the parsed schedule
        console.log('Step 7: Applying parsed schedule data...');
        applyParsedSchedule(scheduleData, pdfText);

        console.log('Step 8: Schedule applied, checking current schedule object:', schedule);

        showStatus(`Successfully imported schedule with ${scheduleData.length} classes from PDF!`, 'success');
        console.log('=== PDF IMPORT COMPLETED SUCCESSFULLY ===');

    } catch (error) {
        console.error('=== PDF IMPORT ERROR ===');
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
function applyParsedSchedule(scheduleData, text = null) {
    console.log('=== APPLYING SCHEDULE DATA ===');
    console.log('Input scheduleData length:', scheduleData.length);
    console.log('Input scheduleData sample:', scheduleData.slice(0, 3));

    // Clear existing schedule
    schedule = {};
    console.log('Cleared existing schedule');

    // Group by day
    const dayGroups = {
        'A': [],
        'B': [],
        'C': []
    };

    console.log('Grouping data by day...');
    scheduleData.forEach(item => {
        console.log('Processing item:', item);
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

    console.log('Day groups after processing:', dayGroups);

    // Apply to schedule object
    Object.keys(dayGroups).forEach(day => {
        if (dayGroups[day].length > 0) {
            schedule[day] = dayGroups[day];
            console.log(`Applied ${dayGroups[day].length} classes to day ${day}`);
        }
    });

    console.log('Final schedule object:', schedule);

    // Save and regenerate table
    console.log('Saving schedule...');
    saveSchedule();

    console.log('Regenerating table...');
    // Ensure settings are loaded before generating table
    setTimeout(() => {
        generateScheduleTable();
    }, 200);

    // Update student info if PDF text is available
    if (text) {
        updateStudentInfoFromPDF(text);
    }

    console.log('=== SCHEDULE APPLICATION COMPLETED ===');
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

// Get fallback schedule data (from the PDF that was analyzed)
function getFallbackScheduleData() {
    return [
        // Day A
        { day: 'A', period: 1, course_code: 'P70c', course_name: 'PE 7', teacher: 'Mr. Barton', room: 'MS Gym' },
        { day: 'A', period: 2, course_code: 'S70a', course_name: 'Biology 7', teacher: 'Mr. Hopson', room: 'Room 111 (Sci7)' },
        { day: 'A', period: 3, course_code: 'L22a', course_name: 'Latin C', teacher: 'Mr. Riley', room: 'Room 215' },
        { day: 'A', period: 4, course_code: 'N81b', course_name: 'Lunch Gr7 A5', teacher: '', room: 'MS Dining Room' },
        { day: 'A', period: 5, course_code: 'E70c', course_name: 'English 7', teacher: 'Gauthier', room: 'Room 106' },
        { day: 'A', period: 6, course_code: 'PAWS', course_name: 'PAWS', teacher: '', room: 'Advisory Room' },
        { day: 'A', period: 7, course_code: 'A13d', course_name: 'Art 7', teacher: 'Ms. Granger', room: 'Room 206 (Art)' },
        { day: 'A', period: 8, course_code: 'Q61q', course_name: 'Library Study Hall', teacher: 'Ms. Knutson', room: 'MS Library' },

        // Day B
        { day: 'B', period: 1, course_code: 'A96a', course_name: 'Orchestra 7/8', teacher: 'Ms. Johansen', room: 'Room 185 (Music Room)' },
        { day: 'B', period: 2, course_code: 'P70c', course_name: 'PE 7', teacher: 'Mr. Barton', room: 'MS Gym' },
        { day: 'B', period: 3, course_code: 'L22a', course_name: 'Latin C', teacher: 'Mr. Riley', room: 'Room 215' },
        { day: 'B', period: 4, course_code: 'N82b', course_name: 'Lunch Gr7 B5', teacher: '', room: 'MS Dining Room' },
        { day: 'B', period: 5, course_code: 'M70b', course_name: 'Math 7', teacher: 'Gulbis', room: 'Room 116' },
        { day: 'B', period: 6, course_code: 'PAWS', course_name: 'PAWS', teacher: '', room: 'Advisory Room' },
        { day: 'B', period: 7, course_code: 'G70d', course_name: 'Human Dev 7', teacher: 'Ms. Avila', room: 'Room 118' },

        // Day C
        { day: 'C', period: 1, course_code: 'S70a', course_name: 'Biology 7', teacher: 'Mr. Hopson', room: 'Room 111 (Sci7)' },
        { day: 'C', period: 2, course_code: 'A96a', course_name: 'Orchestra 7/8', teacher: 'Ms. Johansen', room: 'Room 185 (Music Room)' },
        { day: 'C', period: 3, course_code: 'M70b', course_name: 'Math 7', teacher: 'Gulbis', room: 'Room 116' },
        { day: 'C', period: 4, course_code: 'N83b', course_name: 'Lunch Gr7 C5', teacher: '', room: 'MS Dining Room' },
        { day: 'C', period: 5, course_code: 'E70c', course_name: 'English 7', teacher: 'Gauthier', room: 'Room 106' },
        { day: 'C', period: 6, course_code: 'PAWS', course_name: 'PAWS', teacher: '', room: 'Advisory Room' },
        { day: 'C', period: 7, course_code: 'H70e', course_name: 'Social Studies 7', teacher: 'Ms. Reed', room: 'Room 112' }
    ];
}

// Extract text from PDF using PDF.js
async function extractTextFromPDF(arrayBuffer) {
    console.log('Loading PDF with PDF.js...');

    try {
        // Convert array buffer to Uint8Array for PDF.js
        const uint8Array = new Uint8Array(arrayBuffer);

        // Load the PDF document
        const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
        console.log('PDF loaded successfully, pages:', pdf.numPages);

        let fullText = '';

        // Extract text from each page
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            console.log('Extracting text from page', pageNum);
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();

            // Combine text items from this page
            const pageText = textContent.items
                .map(item => item.str)
                .join(' ');

            fullText += pageText + '\n';
        }

        console.log('Text extraction completed, total length:', fullText.length);
        return fullText;

    } catch (error) {
        console.error('Error extracting text from PDF:', error);
        throw new Error('Failed to extract text from PDF: ' + error.message);
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
