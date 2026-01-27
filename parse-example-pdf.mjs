import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';

// Read and parse the example_schedule.pdf
const pdfPath = '/home/runner/work/Canvas-Now/Canvas-Now/example_schedule.pdf';
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

for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    
    // Look for period markers for Day A
    const periodMatchA = line.match(/Period ABC A(\d+)/i);
    if (periodMatchA && i >= 1) {
        const periodNum = parseInt(periodMatchA[1]);
        const day = 'A';
        
        // Get course info from previous line
        const courseLine = allLines[i - 1];
        const courseMatch = courseLine.match(/^([A-Z]\d+[a-z]?)\s*-\s*(.+)$/);
        
        if (courseMatch) {
            const courseCode = courseMatch[1];
            const courseName = courseMatch[2];
            
            // Skip if it's a lunch period (we'll track it separately)
            if (courseName.match(/Lunch/i)) {
                lunchPeriods[day] = periodNum;
                continue;
            }
            
            // Get teacher and room from next lines
            let teacher = '';
            let room = '';
            if (i + 1 < allLines.length) {
                teacher = allLines[i + 1];
            }
            if (i + 2 < allLines.length) {
                room = allLines[i + 2];
            }
            
            scheduleData.push({
                day: day,
                period: periodNum,
                course_code: courseCode,
                course_name: courseName,
                teacher: teacher,
                room: room
            });
        }
    }
    
    // Look for period markers for Day B
    const periodMatchB = line.match(/Period ABC B(\d+)/i);
    if (periodMatchB && i >= 1) {
        const periodNum = parseInt(periodMatchB[1]);
        const day = 'B';
        
        const courseLine = allLines[i - 1];
        const courseMatch = courseLine.match(/^([A-Z]\d+[a-z]?)\s*-\s*(.+)$/);
        
        if (courseMatch) {
            const courseCode = courseMatch[1];
            const courseName = courseMatch[2];
            
            if (courseName.match(/Lunch/i)) {
                lunchPeriods[day] = periodNum;
                continue;
            }
            
            let teacher = '';
            let room = '';
            if (i + 1 < allLines.length) {
                teacher = allLines[i + 1];
            }
            if (i + 2 < allLines.length) {
                room = allLines[i + 2];
            }
            
            scheduleData.push({
                day: day,
                period: periodNum,
                course_code: courseCode,
                course_name: courseName,
                teacher: teacher,
                room: room
            });
        }
    }
    
    // Look for period markers for Day C
    const periodMatchC = line.match(/Period ABC C(\d+)/i);
    if (periodMatchC && i >= 1) {
        const periodNum = parseInt(periodMatchC[1]);
        const day = 'C';
        
        const courseLine = allLines[i - 1];
        const courseMatch = courseLine.match(/^([A-Z]\d+[a-z]?)\s*-\s*(.+)$/);
        
        if (courseMatch) {
            const courseCode = courseMatch[1];
            const courseName = courseMatch[2];
            
            if (courseName.match(/Lunch/i)) {
                lunchPeriods[day] = periodNum;
                continue;
            }
            
            let teacher = '';
            let room = '';
            if (i + 1 < allLines.length) {
                teacher = allLines[i + 1];
            }
            if (i + 2 < allLines.length) {
                room = allLines[i + 2];
            }
            
            scheduleData.push({
                day: day,
                period: periodNum,
                course_code: courseCode,
                course_name: courseName,
                teacher: teacher,
                room: room
            });
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
