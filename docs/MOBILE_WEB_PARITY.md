# Mobile and Web Parity Refactor

## Overview
This document outlines the architectural and technical changes made to achieve 1:1 feature parity between the mobile (`MapScreen.tsx`) and web (`MapScreen.web.tsx`) applications for the Tribes project.

## Component Extraction & Unification
To eliminate code duplication and reduce the technical debt of the 5,000+ line `MapScreen.web.tsx` file, massive UI render blocks were extracted into shared React Native components located in `src/components/`. These components are now consumed universally by both map screens.

### Extracted Components
- `EventChat.tsx`: Handles event details, finalization for hosts, and participant feedback/rating flows (claiming leaves).
- `TribePanel.tsx`: Displays tribe information, campfire announcements, gatherings, and tribe management actions.
- `ProfileModal.tsx`: Renders user statistics, ratings, and spirit icons.
- `CreateTribeWizard.tsx`: Manages the multi-step tribe creation flow.
- `EventWizard.tsx`: Manages the event creation flow.
- `FiltersModal.tsx`: Provides UI for category, date, age, and gender filtering.

### Shared Assets & Utilities
- `src/utils/assets.ts`: Centralized `SPIRIT_ASSETS`, `SPIRIT_LABELS`, and `renderMoons` functions to be universally accessible by all UI components.

## State and Hook Synchronization
The mobile `MapScreen.tsx` was updated to include all state variables and hooks previously exclusive to the web version, ensuring the newly extracted components receive the necessary props to function:
- **State Variables**: Added `profileViewUid`, `wizardDraft`, `wizardStep`, `formTribeChecked`, `feedbackAnswer`, `finalizeChecked`, `feedbackSubmitted`, `userFeedbackCache`, `creatorStatsCache`, and `participantNamesCache`.
- **Backend Hooks**: Wired in `finalizeEvent` and `submitFeedback` from the `useEvents` hook.

## Platform-Specific Map Rendering
The underlying map engines remain platform-specific to ensure optimal performance and a native feel, while the unified UI components are cleanly overlaid on top of these map implementations:
- **Mobile (`MapScreen.tsx`)**: Utilizes `@rnmapbox/maps`.
- **Web (`MapScreen.web.tsx`)**: Utilizes `react-map-gl`.

## Deep Linking
Replaced web-specific `window.location.search` logic with Expo's universal `Linking` API (`expo-linking`). This ensures that deep-links for joining events (`?joinEvent=`) or tribes (`?invite=`) function correctly across both iOS/Android and Web platforms.

## TypeScript and Type Safety
Resolved TypeScript errors resulting from the extraction and unification process. Ensured proper typings for shared props, state setters, and external libraries, providing a strictly typed, error-free `src/` directory.