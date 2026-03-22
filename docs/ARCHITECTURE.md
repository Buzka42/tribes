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
- **Map UI**: Fully Map-centric Single Page Architecture (SPA). Uses Mapbox rendering with interactive custom pins. Glassmorphic dynamic bottom sheets control the primary HUD.
- **Event Wizard**: Dynamic in-place map pin placement workflow allowing configuration (Categories/Demographics), Geocoding, and specific DateTime validations without screen transitions.
- **Token System**: Core gamification restricting generic flaking by gating Tribal Chats behind a 1 🍃 lock and Event Curation behind 5 🍃 via real-time transactions.
- **Privacy Model**: Public vs Private map representations modifying pin interactions and exact bounds vs general radiuses.
- **Settings & Profiling**: `SettingsScreen` enables dynamic modifications of display name and automatic base location mapping via Mapbox API search.
