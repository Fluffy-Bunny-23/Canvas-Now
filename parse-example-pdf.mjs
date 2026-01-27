import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Read and parse the example_schedule.pdf
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pdfPath = path.join(__dirname, 'example_schedule.pdf');
const data = new Uint8Array(fs.readFileSync(pdfPath));

const loadingTask = pdfjsLib.getDocument({data});
const pdf = await loadingTask.promise;
const page = await pdf.getPage(1);
const textContent = await page.getTextContent();

// Extract text with newlines to preserve structure
const allText = textContent.items.map(item => item.str).join('\n');
const allLines = allText.split('\n').filter(line => line.trim());

// Parse schedule data
const scheduleData = [];
const lunchPeriods = {};

// Look for period markers for Day A, B, and C using a single parsing path
const dayPatterns = ['A', 'B', 'C'];
const processedPeriods = { 'A': new Set(), 'B': new Set(), 'C': new Set() };

for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    
    // Skip empty lines
    if (!line) continue;
    
    for (const day of dayPatterns) {
        const periodRegex = new RegExp(`Period ABC ${day}(\\d+)`, 'i');
        const periodMatch = line.match(periodRegex);
        
        if (periodMatch) {
            const periodNum = parseInt(periodMatch[1]);
            
            // Skip if we've already processed this period for this day
            if (processedPeriods[day].has(periodNum)) {
                continue;
            }
            processedPeriods[day].add(periodNum);
            
            // Look back for course line (should be previous line)
            if (i >= 1) {
                const courseLine = allLines[i - 1];
                
                // Check if this is a course line (CourseCode - CourseName)
                const courseMatch = courseLine.match(/^([A-Z]\d+[a-z]?)\s*-\s*(.+)$/);
                
                if (courseMatch) {
                    const courseCode = courseMatch[1];
                    const courseName = courseMatch[2];
                    
                    // Look ahead for teacher/room (should be on next line)
                    let teacher = '';
                    let room = '';
                    
                    if (i + 1 < allLines.length) {
                        const teacherLine = allLines[i + 1];
                        // Skip lines that are times, empty, PAWS, or other course codes
                        if (teacherLine && 
                            !teacherLine.match(/^\d{1,2}:\d{2}/) && 
                            teacherLine !== 'PAWS' &&
                            !teacherLine.match(/^[A-Z]\d+[a-z]?\s*-/)) {
                            const teacherMatch = teacherLine.match(/^([^-]+?)(?:\s*-\s*(.+))?$/);
                            if (teacherMatch) {
                                teacher = teacherMatch[1].trim();
                                room = teacherMatch[2] ? teacherMatch[2].trim() : '';
                            }
                        }
                    }
                    
                    // Check if this is a lunch period and record it
                    if (courseName.match(/Lunch/i)) {
                        lunchPeriods[day] = periodNum;
                        // Don't add lunch to scheduleData, but do track it
                    } else {
                        scheduleData.push({
                            day: day,
                            period: periodNum,
                            course_code: courseCode,
                            course_name: courseName,
                            teacher: teacher,
                            room: room
                        });
                    }
                    
                    break; // Break after finding match to avoid duplicate processing
                }
            }
        }
    }
}

// Output the parsed data
console.log('=== PARSED SCHEDULE DATA ===\n');
console.log(JSON.stringify({
    classes: scheduleData,
    lunchPeriods: lunchPeriods,
    totalClasses: scheduleData.length
}, null, 2));

console.log('\n\n=== SUMMARY ===');
console.log(`Total classes extracted: ${scheduleData.length}`);
console.log(`Day A classes: ${scheduleData.filter(c => c.day === 'A').length}`);
console.log(`Day B classes: ${scheduleData.filter(c => c.day === 'B').length}`);
console.log(`Day C classes: ${scheduleData.filter(c => c.day === 'C').length}`);
console.log(`Detected lunch periods:`, lunchPeriods);
