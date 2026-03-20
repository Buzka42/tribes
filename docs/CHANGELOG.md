# Changelog

- feat: Implemented comprehensive Firebase Auth loop including `LoginScreen`, Context state management (`useAuth`), and dynamic navigation routing
- feat: Connected `WizardScreen` tightly to Firestore via `useEvents` for realtime database creations and Token manipulation
- fix: Resolved persistence typings on `config/firebase.ts` for safe SDK execution
- feat: Implemented interactive 3-step Event Wizard with conditional rendering, state management, and UI logic
- fix: Resolved Web blank screen crash by isolating Mapbox completely out of the web tree using `MapScreen.web.tsx`
- feat: Added web mockup for Mapbox to support local browser testing without Android Studio
- chore: added eas.json configuration to allow for EAS cloud builds and prevent local compilation issues
- fix: installed `expo-system-ui` to resolve Android warning during build
- fix: Refactored Mapbox to use environment variable for access token to prevent hardcoding secrets
- feat: Added AppNavigator, MapScreen with Mapbox integration, and WizardScreen skeleton for first test
- feat: Defined TypeScript entity interfaces in `src/types/index.ts`
- chore: Configured `app.json` for Mapbox plugin and expo-dev-client
- chore: Initial project setup and rules creation
