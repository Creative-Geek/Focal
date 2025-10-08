# React Native Conversion Plan for Focal

## Overview

This document outlines the comprehensive plan for converting the existing Focal web application (React + Vite + TypeScript + shadcn/ui) to a React Native mobile application. The conversion will require substantial changes to the frontend while keeping the Cloudflare Worker backend intact.

## Architecture Assessment

- **Frontend**: React 18 + Vite + TypeScript + shadcn/ui (Radix UI) + Tailwind CSS
- **Backend**: Cloudflare Worker (Hono) with D1 SQLite DB
- **Key Features**:
  - Receipt scanning with AI (Gemini API)
  - Expense tracking with line items
  - User authentication (JWT)
  - Email verification and password reset
  - Charts and analytics (Recharts)
  - PWA capabilities
  - Theme switching (light/dark)
  - model selection for AI processing
- **Data Flow**: Camera/Upload → expenseService.processReceipt() → /api/receipts/process → Gemini AI → user review → /api/expenses → D1 DB
- **Authentication**: JWT stored in localStorage (dev) or cookie (prod)

## Security Considerations

- **Token Storage**: Replace localStorage/cookie storage with secure storage solutions:
  - iOS: Use Keychain (`react-native-keychain`)
  - Android: Use Keystore (`react-native-keychain`)
- **Sensitive Data**:
  - API keys should be stored using secure storage mechanisms
  - Never store plaintext sensitive data in AsyncStorage
  - Implement proper encryption for any locally stored sensitive information
- **Communication Security**:
  - Ensure all API calls use HTTPS
  - Implement certificate pinning for critical API endpoints
  - Add proper SSL validation
- **Biometric Authentication**:
  - Consider implementing biometric authentication for accessing sensitive features
  - Use `react-native-keychain` for biometric integration
- **App Permissions**:
  - Request minimal permissions necessary
  - Implement proper permission handling for camera and storage access
  - Provide clear explanations to users about why permissions are needed

## Conversion Steps

### 1. Project Setup

- Initialize React Native project with TypeScript and Expo CLI
- Configure project structure to mirror current web app organization:

```bash
mobile/
├── src/
│   ├── components/
│   ├── screens/
│   ├── navigation/
│   ├── services/
│   ├── hooks/
│   ├── contexts/
│   └── utils/
├── assets/
└── types/
```

- Set up React Navigation v6 with stack and tab navigators
- Configure TypeScript paths and aliases
- Set up development environment (iOS Simulator/Android Emulator)

### 2. Backend Integration

- Adapt `src/lib/expense-service.ts` for React Native networking
- Replace localStorage with secure storage for tokens (e.g., `react-native-keychain`)
- Implement secure storage for sensitive data (API keys, tokens)
- Update authentication flow to work with mobile storage
- Handle mobile network conditions and offline scenarios
- Configure API base URL for different environments (dev/prod)

### 3. UI Component Migration

- Replace all shadcn/ui components with React Native equivalents:
  - Dialog/Modal → Modal or react-native-modal
  - Button → TouchableOpacity or Pressable
  - Input → TextInput
  - Card → View with styling
  - Table → FlatList or SectionList
  - Alert/Toast → react-native-toast-message
- Convert Tailwind CSS classes to React Native StyleSheet
- Implement responsive design for various mobile screen sizes
- Create mobile-specific components for touch interactions
- Adapt form components (ExpenseForm, AuthForm) for mobile UX

### 4. Platform-Specific Features

- Replace `react-webcam` with `react-native-image-picker` and `react-native-camera`
- Implement camera permissions and photo library access
- Adapt image resizing functionality for mobile (`resizeImage` utility)
- Update file handling for mobile file system
- Implement native sharing capabilities for receipts

### 5. Navigation and Routing

- Replace `react-router-dom` with `@react-navigation/native`
- Implement stack navigation for authentication flow
- Create tab navigation for main app sections (Home, Expenses, Settings)
- Adapt protected route handling for mobile navigation guards
- Implement deep linking support for email verification

### 6. State Management and Storage

- Replace localStorage usage with AsyncStorage for non-sensitive data:
  - Theme preferences (light/dark mode)
  - AI model selection
  - User settings
- Implement secure storage for sensitive data using `react-native-keychain`:
  - Authentication tokens
  - API keys
- Adapt authentication context for mobile lifecycle management
- Handle app background/foreground state changes

### 7. Advanced Features Migration

- Replace Recharts with react-native-chart-kit or victory-native
- Adapt Framer Motion animations to React Native Animated API
- Implement mobile-specific gestures and interactions
- Convert PWA offline capabilities to React Native offline support
- Adapt email verification flow for mobile deep linking

### 8. Testing and Validation

- Set up React Native Testing Library for component testing
- Test all API integrations on physical devices
- Validate camera and image processing functionality
- Test authentication flows and token persistence
- Verify expense tracking and data synchronization
- Test on both iOS and Android platforms

## Error Handling and Crash Reporting

- **Error Boundaries**: Implement React Native error boundaries to catch JavaScript errors:
  - Create custom error boundary components for different sections of the app
  - Implement a global error handler using a library like `react-native-exception-handler` or the handler provided by your crash reporting service.
  - Design fallback UI components for when errors occur
- **Native Crash Reporting**:
  - Integrate crash reporting tools (e.g., Sentry React Native SDK)
  - Configure proper error context and user information tracking
  - Set up alerting mechanisms for critical crashes
- **API Error Management**:
  - Handle network errors specific to mobile connectivity
  - Implement retry mechanisms for failed API requests
  - Add proper timeout handling for all network requests
  - Create user-friendly error messages for common API failures
- **Offline Error Handling**:
  - Implement graceful degradation when offline
  - Queue operations for sync when connectivity is restored
  - Provide clear feedback to users about offline status
- **Form Validation Errors**:
  - Adapt form validation error display for mobile screens
  - Ensure error messages are clear and actionable on small screens

## Technical Considerations

### Dependencies to Replace

| Web Dependency        | React Native Alternative                        | Notes                              |
| --------------------- | ----------------------------------------------- | ---------------------------------- |
| react-webcam          | react-native-image-picker + expo-camera         | Camera and gallery access          |
| @radix-ui/\*          | react-native-modal, @react-native-picker/picker | Native modal and picker components |
| react-router-dom      | @react-navigation/native                        | Mobile navigation                  |
| recharts              | react-native-chart-kit                          | Mobile-compatible charts           |
| framer-motion         | react-native-reanimated                         | Native animations                  |
| localStorage          | @react-native-async-storage/async-storage       | Persistent storage                 |
| react-hook-form + zod | react-hook-form + zod                           | Form validation (can be reused)    |
| sonner                | react-native-toast-message                      | Toast notifications                |
| lucide-react          | @expo/vector-icons or react-native-vector-icons | Icon library                       |

### File Structure Changes

- Convert page-based routing to screen-based navigation
- Restructure components to use React Native primitives (View, Text, etc.)
- Adapt hooks for mobile-specific functionality (useIsMobile becomes platform detection)
- Create platform-specific components where needed
- Implement proper error boundaries for React Native

### Performance Optimizations

- Implement proper image compression for mobile uploads
- Use FlatList with proper keyExtractor and optimization props
- Implement proper memoization for expensive operations
- Optimize bundle size by code splitting and tree shaking
- Add proper loading states and skeleton screens

### Platform-Specific Considerations

- **iOS**: Handle Safe Area insets, permissions, App Store guidelines
- **Android**: Handle back button navigation, permissions, Material Design
- **Camera**: Request permissions, handle different camera APIs
- **Storage**: Use appropriate storage solutions for each platform
- **Notifications**: Implement push notifications if needed

## Expected Challenges

1. **UI Component Parity**: Recreating complex shadcn/ui components with React Native equivalents while maintaining design consistency
2. **Camera Integration**: Mobile camera APIs are significantly different from web APIs, requiring platform-specific implementations
3. **Navigation Paradigm**: Converting from web routing to mobile navigation patterns
4. **Performance**: Ensuring smooth performance on mobile devices with limited resources
5. **Platform Differences**: Handling iOS vs Android differences in permissions, UI patterns, and APIs
6. **Offline Support**: Implementing robust offline capabilities that work across platforms
7. **Testing**: Testing on physical devices and handling device-specific edge cases

## Timeline Estimate

- **Project Setup & Architecture**: 2-3 days
- **Backend Integration & Auth**: 3-4 days
- **Core UI Components Migration**: 7-10 days
- **Platform-Specific Features (Camera, Storage)**: 4-5 days
- **Navigation & Advanced Features**: 3-4 days
- **Testing, Polish & Platform Optimization**: 4-5 days
- **Total Estimate**: 23-31 days

## Risk Assessment

### High Risk

- Camera integration complexity
- UI component fidelity maintenance
- Performance on lower-end devices

### Medium Risk

- Platform-specific differences
- Offline functionality
- Authentication token management

### Low Risk

- Backend API integration
- Basic navigation
- Data persistence

## Recommendations

1. **Use Expo**: Start with Expo for easier development and deployment, migrate to bare workflow if needed
2. **UI Library**: Consider React Native Paper or NativeBase for pre-built components to accelerate development
3. **State Management**: Keep simple state management initially, add Redux/MobX only if needed
4. **Testing Strategy**: Implement comprehensive testing from the start, including E2E tests with Detox
5. **Code Sharing**: Consider setting up a monorepo structure for shared business logic between web and mobile
6. **Progressive Migration**: Start with core features (auth, expense tracking) before advanced features (charts, offline capabilities)
7. **Platform Testing**: Test on both platforms simultaneously to catch differences early
8. **Performance Monitoring**: Implement performance monitoring from day one

## Success Metrics

- All core features functional on both iOS and Android
- Performance comparable to web version (startup time < 3s, smooth interactions)
- Camera functionality works reliably across devices
- Authentication and data sync work seamlessly
- App passes App Store/Play Store review guidelines

## Accessibility Considerations

- **Screen Reader Support**:
  - Implement proper accessibility labels for all interactive components
  - Ensure logical focus order for navigation
  - Add accessibility hints for complex interactions
- **Visual Accessibility**:
  - Support dynamic text sizing for users with visual impairments
  - Ensure sufficient color contrast for all UI elements
  - Implement proper support for bold text and reduced transparency
- **Motor Accessibility**:
  - Support voice control and switch control
  - Implement larger touch targets (minimum 44x44 pixels)
  - Add proper support for assistive touch
- **Hearing Accessibility**:
  - Provide visual alternatives for audio cues
  - Support closed captions for any video content

## Internationalization and Localization

- **Library Selection**: Use `react-native-localize` for device locale detection and `i18n-js` or `react-i18next` for translation management
- **Text Management**: Replace all hardcoded strings with translation keys
- **RTL Support**: Implement proper right-to-left layout support for languages like Arabic and Hebrew
- **Date/Number Formatting**: Use the built-in `Intl` API for date, number, and currency formatting to ensure proper localization without adding heavy dependencies.
- **Currency Handling**: Adapt currency display and formatting based on user locale
- **Migration Steps**: Set up translation infrastructure, extract strings, create translation files, implement locale switching

## Offline Support Strategy

- Implement network status detection using `@react-native-netinfo/netinfo`
- Use `@react-native-async-storage/async-storage` for local data persistence
- Queue user actions (expense creation, edits) for synchronization when online
- Display cached data when offline with clear offline indicators
- Handle data conflicts between local and server data during sync

## Deployment Process

### Pre-Deployment Checklist

- **App Configuration**:
  - Set unique bundle identifiers for iOS (`com.creativegeek.focal`) and Android (`com.creativegeek.focal`)
  - Configure app versioning strategy (semantic versioning)
  - Set up environment-specific configurations (dev, staging, prod)
- **Asset Preparation**:
  - Prepare app icons in all required sizes
  - Create splash screen assets
  - Optimize all images for mobile
- **Metadata Creation**:
  - Write app descriptions for both stores
  - Create screenshots for different device sizes
  - Prepare promotional text and keywords

### iOS Deployment (App Store)

- **Provisioning Profiles**:
  - Create distribution certificates in Apple Developer Portal
  - Set up App Store distribution provisioning profiles
  - Configure proper entitlements for features (camera, notifications)
- **App Store Connect Setup**:
  - Create app record in App Store Connect
  - Configure app information (description, keywords, screenshots)
  - Set up pricing and availability
- **Build Process**:
  - Generate iOS build using `eas build --platform ios` or EAS Build
  - Archive and upload build to App Store Connect
  - Complete app review submission

### Android Deployment (Play Store)

- **Signing Key Setup**:
  - Generate signing key for APK/AAB
  - Securely store signing key (preferably with Google Play App Signing)
- **Google Play Console Setup**:
  - Create app listing in Google Play Console
  - Configure app content rating and target audience
  - Set up store presence (description, screenshots, graphics)
- **Build Process**:
  - Generate Android build using `eas build --platform android` or EAS Build
  - Upload signed APK/AAB to Google Play Console
  - Complete app review submission

### Post-Deployment

- Monitor app store reviews and feedback
- Track crash reports and user complaints
- Set up app store analytics
- Configure automated deployment pipelines

## Deep Linking Configuration

### Universal Links (iOS) and App Links (Android)

- **Domain Setup**:
  - Configure associated domains for iOS in the app configuration
  - Set up asset links for Android with proper JSON verification files
  - Ensure web server can serve the verification files for both platforms
- **Link Structure**:
  - Email verification links: `/verify-email?token={token}`
  - Password reset links: `/reset-password?token={token}`
  - Expense sharing links: `/expense/{id}`
  - App invitation links: `/invite/{code}`

### Implementation Steps

- Configure deep linking in Expo configuration (`app.json` or `app.config.js`)
- Set up proper navigation handling in React Navigation to direct users to the correct screens
- Implement security checks for deep linked tokens (validate and expire appropriately)
- Add fallback handling for unrecognized deep links
- Test deep linking functionality with both cold start and warm start scenarios

### Security Considerations for Deep Linking

- Validate all deep linked tokens before processing
- Implement token expiration checks
- Sanitize all URL parameters to prevent injection attacks
- Add proper error handling for malformed or expired deep links
