# Architecture: Tribes App

## Tech Stack
- Frontend: React Native with Expo ( Managed Workflow )
- Language: TypeScript (Strict typing required)
- Backend & Database: Firebase (Firestore, Auth, Cloud Functions)
- Maps: Mapbox

## Core Structure
- `/src/components`: UI components, kept small and reusable.
- `/src/hooks`: Custom hooks encompassing all business logic (e.g., `useTokens.ts`, `useEvents.ts`).
- `/src/screens`: App screens and navigation views.
- `/src/types`: Interfaces for Firebase responses and component props.

## Key Features
- **Map UI**: Features Mapbox rendering, bottom slider for date filtering, top right icon for interests filters.
- **Event Wizard**: 3-step process (Details -> Map/Time/Privacy -> Cost Summary).
- **Token System**: Core mechanism limiting event joining/creation to deter flaking, with a refund mechanism.
- **Privacy Model**: Public vs Private map representations.
- **Settings & Profiling**: `SettingsScreen` enables dynamic modifications of display name and automatic base location mapping via Mapbox API search.
