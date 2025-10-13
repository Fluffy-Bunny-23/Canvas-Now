# Canvas-Now Extension

This Chromium extension helps students quickly navigate to their current class on Canvas Learning Management System (LMS). When clicked, the extension automatically determines the user's current class based on their schedule and opens the corresponding Canvas page.

## Features

- **Quick Class Navigation**: Click the extension icon to instantly switch to your current class on Canvas
- **Schedule Management**: Interactive drag-and-drop interface to build and manage your weekly class schedule
- **Canvas API Integration**: Automatically fetches class information from your Canvas account
- **Settings Page**: Configure extension preferences and manage authentication
- **Time-Based Detection**: Automatically determines which class is currently active based on the time of day

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The extension should now appear in your browser toolbar

## Usage

### Basic Navigation

1. Click the extension icon in your browser toolbar
2. The extension will automatically open your current class page on Canvas

### Managing Your Schedule

1. Right-click the extension icon and select "Options"
2. Click the "Go to Schedule" link
3. Drag class items from the left sidebar onto the schedule grid
4. Drop classes into appropriate time slots for each day of the week

### Configuration

1. Right-click the extension icon and select "Options"
2. Enter your Canvas instance URL and authentication details
3. Configure any additional preferences as needed

## Permissions Required

- `activeTab`: Access current browser tab for navigation
- `storage`: Save schedule and settings data locally
- `identity`: Handle Canvas API authentication
- `https://*/api/v1/*`: Access Canvas LMS API endpoints

## Browser Compatibility

- Google Chrome (recommended)
- Microsoft Edge
- Other Chromium-based browsers

## Development

This extension is built using:

- Manifest V3 for modern browser compatibility
- Vanilla JavaScript for core functionality
- HTML5 Drag and Drop API for schedule management
- Canvas LMS REST API for data integration

## Privacy

The extension only accesses your Canvas data through the official API and stores information locally on your device. No data is transmitted to external servers except for Canvas API calls.

## Support

For issues or feature requests, please check the extension's settings page or create an issue in the repository.

## License

Canvas-Now  © 2025 by Fluffy-Bunny-23 is licensed under CC BY-NC-SA 4.0. To view a copy of this license, visit <https://creativecommons.org/licenses/by-nc-sa/4.0/>
