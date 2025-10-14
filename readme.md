# Canvas-Now Extension

A Chromium extension that helps users quickly navigate to their current class on Canvas LMS with an integrated schedule management system.

## Features

- **Quick Class Navigation**: Click the extension icon to instantly switch to your current class based on your schedule
- **Schedule Management**: Drag-and-drop interface to build your weekly class schedule
- **Canvas API Integration**: Automatically syncs with your Canvas courses
- **Settings Page**: Configure Canvas instance and API authentication
- **Persistent Storage**: Your schedule and settings are saved locally

## Installation

### Development Setup

1. Clone or download this repository
2. Open Chrome/Edge and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the Canvas-Now folder
5. The extension should now appear in your extensions list

### Production Setup

1. Package the extension as a .crx file
2. Install via Chrome Web Store or manual installation

## Usage

### Initial Setup

1. Click the Canvas-Now extension icon
2. Click "Manage Schedule" to open the settings
3. Enter your Canvas instance URL (e.g., `https://canvas.instructure.com`)
4. Get your Canvas API token from Account Settings > Approved Integrations
5. Enter the API token and save settings
6. Test the connection to ensure it's working

### Building Your Schedule

1. In the schedule manager, your Canvas classes will appear in the left sidebar
2. Drag classes from the sidebar to the appropriate time slots in the weekly grid
3. Click "Save Schedule" to store your schedule
4. To remove a class, click on an occupied time slot

### Using the Extension

- Click the extension icon to quickly jump to your current/next class
- The extension determines your current class based on the current time and your saved schedule

## File Structure

```
Canvas-Now/
├── manifest.json          # Extension manifest
├── popup.html            # Main popup interface
├── popup.js              # Popup functionality
├── config.html           # Settings page
├── config.js             # Settings functionality
├── schedule.html         # Schedule management page
├── schedule.js           # Schedule drag-and-drop logic
├── schedule.css          # Schedule page styles
├── background.js         # Service worker for API calls
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── .ai/                  # Planning documents
│   └── plan.md
└── readme.md             # This file
```

## API Integration

The extension integrates with the Canvas LMS REST API:

- **Courses List**: `GET /api/v1/courses` - Retrieves enrolled courses
- **Authentication**: Bearer token authentication
- **Supported Instances**: Any Canvas LMS instance

## Permissions

The extension requires the following permissions:

- `activeTab`: Access current tab for navigation
- `storage`: Save schedule and settings data
- `identity`: OAuth authentication (future enhancement)
- `https://*/api/v1/*`: Canvas API access

## Browser Compatibility

- Chrome 88+
- Edge 88+
- Other Chromium-based browsers

## Development

### Adding Features

1. Update the implementation plan in `.ai/plan.md`
2. Implement changes following the existing code patterns
3. Test thoroughly across different Canvas instances
4. Update this README with new features

### Testing

- Test with different Canvas instances
- Verify API compatibility
- Test drag-and-drop functionality
- Validate schedule persistence

## Privacy

- All data is stored locally in browser storage
- No data is transmitted to external servers except Canvas LMS
- API tokens are stored securely using Chrome's storage API

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source. See LICENSE file for details.

## Support

For issues or questions:

1. Check the troubleshooting section below
2. Open an issue on GitHub
3. Contact the maintainers

## Troubleshooting

### Common Issues

**"No current class found"**
- Check that your schedule is set up correctly
- Verify the current time matches your class times
- Ensure your system clock is accurate

**"Error loading classes"**
- Verify your Canvas API token is correct
- Check that your Canvas instance URL is valid
- Ensure you have active course enrollments

**"Connection failed"**
- Test your internet connection
- Verify Canvas is accessible
- Check API token permissions

### Debug Mode

Enable verbose logging in the browser console for debugging.

## Roadmap

- [ ] OAuth 2.0 authentication flow
- [ ] Multiple schedule templates
- [ ] Class notifications and reminders
- [ ] Import/export schedule data
- [ ] Mobile responsive design improvements
- [ ] Keyboard shortcuts
- [ ] Dark mode theme

## Changelog

### Version 1.0.0
- Initial release
- Basic schedule management
- Canvas API integration
- Drag-and-drop interface
- Settings page
- Quick class navigation
