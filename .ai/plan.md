# Canvas-Now Extension - Detailed Implementation Plan

## Project Overview

This plan outlines the creation of a Chromium extension called "Canvas-Now" that helps users quickly navigate to their current class on Canvas LMS. The extension includes a schedule management system with drag-and-drop functionality and integrates with the Canvas LMS API.

## Extension Architecture

### 1. Manifest File (manifest.json)

**Location:** Root directory
**Purpose:** Defines extension metadata, permissions, and entry points

**Required Fields:**

- `manifest_version`: 3 (for Chromium MV3)
- `name`: "Canvas-Now"
- `version`: "1.0.0"
- `description`: Brief description of functionality
- `permissions`: Required for API calls and storage
  - `activeTab`: For accessing current tab
  - `storage`: For saving user preferences and schedule data
  - `identity`: For OAuth if needed for Canvas API
  - `https://*/api/v1/*`: For Canvas LMS API calls
- `action`: Defines popup behavior
  - `default_popup`: "popup.html"
  - `default_title`: "Switch to Current Class"
- `options_page`: "config.html"
- `background`: Service worker for API calls
- `content_scripts`: If needed for Canvas page interaction
- `host_permissions`: Canvas domain access

### 2. Popup Interface (popup.html + popup.js)

**Location:** Root directory
**Purpose:** Main extension interface that appears when extension icon is clicked

**Components:**

- HTML structure with minimal UI
- JavaScript to:
  - Determine current class based on schedule/time
  - Open Canvas class page in new tab
  - Handle authentication if needed

**Logic Flow:**

1. Check if user is authenticated with Canvas
2. Get current time and determine active class from stored schedule
3. Construct Canvas URL for the class
4. Open URL in new tab/window

### 3. Options/Config Page (config.html + config.js)

**Location:** Root directory
**Purpose:** Settings page accessible via right-click > Options

**Features:**

- Canvas API authentication setup
- Link to schedule management page
- General extension settings
- API key/token management

**Components:**

- Form for Canvas instance URL
- Authentication token input/storage
- Navigation link to schedule page
- Settings for default behaviors

### 4. Schedule Management Page (schedule.html + schedule.js + schedule.css)

**Location:** Root directory
**Purpose:** Interactive schedule builder with drag-and-drop functionality

**Features:**

- Weekly schedule grid (time slots)
- Left sidebar with draggable class items
- Drag and drop from sidebar to schedule slots
- Save/load schedule data
- Integration with Canvas API for class data

**Technical Implementation:**

- HTML5 Drag and Drop API
- Grid layout for schedule (CSS Grid/Flexbox)
- Local storage for schedule persistence
- Canvas API integration for class list

### 5. Background Service Worker (background.js)

**Location:** Root directory
**Purpose:** Handles API calls and background tasks

**Responsibilities:**

- Canvas LMS API integration
- Authentication token management
- Data caching and synchronization
- Schedule data processing

### 6. Content Scripts (Optional)

**Location:** Root directory
**Purpose:** Interact with Canvas pages if needed

**Potential Uses:**

- Extract current class information from Canvas pages
- Enhance Canvas interface with extension features

## Canvas LMS API Integration

### API Endpoints to Use

1. **Courses List:** `GET /api/v1/courses`
   - Retrieves user's enrolled courses
   - Fields: id, name, course_code, enrollment_term_id

2. **Course Details:** `GET /api/v1/courses/{course_id}`
   - Additional course information
   - Fields: syllabus_body, course_format, time_zone

3. **User Profile:** `GET /api/v1/users/self/profile`
   - User information for personalization
   - Fields: id, name, primary_email, avatar_url

### Authentication

- OAuth 2.0 flow for Canvas API access
- Token storage in chrome.storage
- Refresh token handling

### Data Processing

- Parse API responses into usable class objects
- Map course IDs to URLs
- Cache data locally with expiration

## Schedule System Design

### Data Structure

```javascript
{
  schedule: {
    monday: [
      { time: "09:00", course_id: "12345", course_name: "Math 101" },
      { time: "10:30", course_id: "67890", course_name: "English 201" }
    ],
    tuesday: [
      // similar structure
    ],
    // ... other days
  },
  classes: [
    { id: "12345", name: "Math 101", url: "https://canvas.instructure.com/courses/12345" },
    { id: "67890", name: "English 201", url: "https://canvas.instructure.com/courses/67890" }
  ]
}
```

### UI Layout

- Left panel: Draggable class list from Canvas API
- Right panel: Weekly schedule grid
- Time slots: 30-minute intervals from 8:00 AM to 8:00 PM
- Days: Monday through Friday (configurable)

### Drag and Drop Implementation

- Use HTML5 Drag and Drop API
- Visual feedback during drag operations
- Validation for time slot conflicts
- Auto-save on drop completion

## File Structure

```text
Canvas-Now/
├── manifest.json
├── popup.html
├── popup.js
├── config.html
├── config.js
├── schedule.html
├── schedule.js
├── schedule.css
├── background.js
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── .ai/
│   ├── plan.md
│   └── [additional planning files]
└── readme.md
```

## Implementation Phases

### Phase 1: Extension Setup and Manifest

1. Create manifest.json with all required permissions
2. Set up basic file structure
3. Create placeholder HTML/JS files
4. Design and create extension icons

### Phase 2: Basic Popup Functionality

1. Implement popup.html with minimal UI
2. Create popup.js for basic class switching logic
3. Add time-based class detection
4. Implement URL opening functionality

### Phase 3: Canvas API Integration

1. Set up OAuth authentication flow
2. Implement API calls for course data
3. Create data models for courses and schedule
4. Add error handling for API failures

### Phase 4: Options/Config Page

1. Create config.html with forms
2. Implement config.js for settings management
3. Add link to schedule page
4. Integrate with authentication system

### Phase 5: Schedule Management System

1. Design schedule.html layout
2. Implement drag-and-drop functionality
3. Create schedule grid with time slots
4. Add class list sidebar

### Phase 6: Data Persistence and Storage

1. Implement chrome.storage for schedule data
2. Add data validation and sanitization
3. Create backup/restore functionality
4. Optimize storage usage

### Phase 7: Advanced Features

1. Add conflict detection in schedule
2. Implement schedule templates
3. Add notifications for class changes
4. Create keyboard shortcuts

### Phase 8: Testing and Refinement

1. Test across different Canvas instances
2. Validate API compatibility
3. Performance optimization
4. Cross-browser testing (Chromium-based)

## Technical Considerations

### Browser Compatibility

- Target Chromium-based browsers (Chrome, Edge, Opera)
- Use Manifest V3 for modern compatibility
- Avoid deprecated APIs

### Security

- Secure token storage
- HTTPS-only API calls
- Input validation and sanitization
- Content Security Policy compliance

### Performance

- Lazy load non-critical resources
- Cache API responses appropriately
- Minimize background script activity
- Optimize DOM manipulation

### User Experience

- Intuitive drag-and-drop interface
- Clear visual feedback
- Responsive design for different screen sizes
- Accessibility compliance (WCAG guidelines)

## Dependencies and Libraries

### Required

- None (pure JavaScript implementation)

### Optional Enhancements

- Moment.js or date-fns for time handling
- Axios or Fetch API polyfill
- Dragula or SortableJS for enhanced drag-drop
- LocalForage for advanced storage

## Testing Strategy

### Unit Tests

- API integration functions
- Schedule logic and validation
- Storage operations

### Integration Tests

- End-to-end extension workflows
- Canvas API interactions
- Drag-and-drop functionality

### User Acceptance Testing

- Real Canvas environment testing
- Different user scenarios
- Performance under load

## Deployment and Distribution

### Chrome Web Store

1. Prepare extension package
2. Create store listing with screenshots
3. Set up developer account
4. Submit for review

### Self-Hosted

1. Package extension as .crx file
2. Provide installation instructions
3. Handle updates manually

## Maintenance and Updates

### Version Management

- Semantic versioning
- Changelog maintenance
- Backward compatibility considerations

### User Support

- Documentation updates
- Issue tracking
- User feedback integration

## Risk Assessment and Mitigation

### API Changes

- Monitor Canvas API documentation
- Implement version checking
- Have fallback mechanisms

### Authentication Issues

- Handle token expiration gracefully
- Provide clear error messages
- Offer manual token refresh

### Data Loss

- Regular backups of schedule data
- Confirmation dialogs for destructive actions
- Recovery mechanisms

## Success Metrics

### Functional

- Successful class navigation
- Accurate schedule management
- Reliable API integration

### Performance

- Fast popup response times
- Efficient API calls
- Minimal resource usage

### User Satisfaction

- Intuitive interface
- Reliable functionality
- Positive user feedback

This plan provides a comprehensive roadmap for implementing the Canvas-Now extension. Each phase builds upon the previous one, ensuring a structured and methodical approach to development.
