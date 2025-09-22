# Nexus Social Media Platform - Testing Guide

## Test Setup

This project uses Playwright for comprehensive testing of the social media platform.

### Prerequisites

1. **Install Dependencies**
   ```bash
   npm install
   npx playwright install
   ```

2. **Initialize Database**
   ```bash
   npm run init-db
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

## Test Commands

### Run All Tests
```bash
npm test
```

### Run Tests with UI
```bash
npm run test:ui
```

### Run Tests in Headed Mode
```bash
npm run test:headed
```

### Run Specific Test File
```bash
npx playwright test tests/home.spec.js
```

## Test Coverage

### 1. Home Page Tests (`tests/home.spec.js`)
- ✅ Page loading and navigation
- ✅ Post display functionality
- ✅ Navigation between pages
- ✅ Sample content rendering

### 2. Explore Page Tests (`tests/explore.spec.js`)
- ✅ Explore page functionality
- ✅ Chat room interface
- ✅ Responsive design testing
- ✅ Mobile compatibility

### 3. Authentication Tests (`tests/auth.spec.js`)
- ✅ UI component presence
- ✅ Real-time indicators
- ✅ Notification system

### 4. UI Component Tests (`tests/ui.spec.js`)
- ✅ Neumorphic design elements
- ✅ Interactive buttons and forms
- ✅ Navigation functionality
- ✅ Typography and accessibility
- ✅ Responsive layout

### 5. Real-time Feature Tests (`tests/realtime.spec.js`)
- ✅ Socket connection testing
- ✅ Presence indicator functionality
- ✅ Post creation and updates
- ✅ Chat room functionality
- ✅ Real-time notifications

### 6. API Tests (`tests/api.spec.js`)
- ✅ Feed API endpoint
- ✅ Authentication endpoints
- ✅ Error handling
- ✅ HTTP method validation

### 7. Performance Tests (`tests/performance.spec.js`)
- ✅ Page load time
- ✅ Meta tags and SEO
- ✅ Keyboard navigation
- ✅ ARIA accessibility
- ✅ Progressive enhancement

## Test Configuration

The Playwright configuration (`playwright.config.js`) includes:

- **Multiple Browsers**: Chrome, Firefox, Safari
- **Mobile Testing**: iPhone and Android devices
- **Parallel Execution**: Optimized for speed
- **Auto-start Server**: Development server management
- **Screenshot on Failure**: Visual debugging
- **HTML Reports**: Detailed test reports

## Continuous Integration

For CI/CD pipelines, the tests can be run with:

```bash
npm test
```

The configuration automatically:
- Runs tests in parallel for speed
- Retries failed tests on CI
- Generates HTML reports
- Captures screenshots on failure

## Debugging Tests

### Visual Debugging
```bash
npm run test:ui
```

### Headed Mode
```bash
npm run test:headed
```

### Debug Specific Test
```bash
npx playwright test tests/home.spec.js --debug
```

## Test Structure

```
tests/
├── home.spec.js          # Home page functionality
├── explore.spec.js       # Explore page and chat
├── auth.spec.js          # Authentication UI
├── ui.spec.js            # UI components and design
├── realtime.spec.js      # Real-time features
├── api.spec.js           # API endpoints
└── performance.spec.js   # Performance and accessibility
```

## Key Features Tested

- ✅ **Real-time Communication**: Socket.io integration
- ✅ **Responsive Design**: Mobile and desktop layouts
- ✅ **Accessibility**: ARIA labels, keyboard navigation
- ✅ **Performance**: Load times, progressive enhancement
- ✅ **User Experience**: Navigation, interactions
- ✅ **API Integration**: Backend connectivity
- ✅ **Cross-browser Compatibility**: Multiple browsers

## Reporting

Tests generate HTML reports in `playwright-report/` directory with:
- Detailed test results
- Screenshots of failures
- Performance metrics
- Browser compatibility status

## Best Practices

1. **Test Isolation**: Each test runs independently
2. **Realistic Scenarios**: Tests simulate actual user behavior
3. **Cross-browser Testing**: Ensures compatibility
4. **Performance Monitoring**: Tracks loading times
5. **Accessibility Testing**: Validates inclusive design
6. **Error Handling**: Tests failure scenarios
7. **Visual Regression**: Screenshots for UI changes

## Troubleshooting

### Port Conflicts
If you encounter port conflicts:
```bash
# Kill processes on common ports
pkill -f "next"
pkill -f "node"

# Clear Next.js cache
rm -rf .next

# Restart tests
npm test
```

### Database Issues
```bash
# Reinitialize database
npm run init-db
```

### Test Failures
- Check screenshots in `test-results/`
- Review HTML reports in `playwright-report/`
- Use `--debug` flag for step-by-step execution
- Verify development server is running

## Contributing

When adding new features:
1. Write corresponding tests
2. Update this documentation
3. Ensure tests pass in all browsers
4. Add performance benchmarks if needed
5. Include accessibility tests

---

*Happy Testing! 🚀*
