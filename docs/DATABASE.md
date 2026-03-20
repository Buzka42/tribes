# Database Schema: Tribes (Firestore)

## Collections

### 1. `users`
- `uid` (string) - Firebase Auth UID
- `displayName` (string)
- `interests` (array of strings)
- `tokens` (number)
- `createdAt` (timestamp)

### 2. `events`
- `id` (string)
- `creatorId` (string) - Reference to users collection
- `title` (string)
- `interest` (string)
- `location` (Geopoint / Address data)
  - `latitude` (number)
  - `longitude` (number)
  - `address` (string)
- `time` (timestamp)
- `isPrivate` (boolean)
- `participantLimit` (number)
- `tokenCost` (number)
- `isExternal` (boolean) - for MVP cold start
- `externalUrl` (string, optional)

### 3. `attendances`
- `id` (string)
- `eventId` (string)
- `userId` (string)
- `status` (string) - e.g., 'pending', 'accepted', 'attended', 'missed'
- `surveyCompleted` (boolean)
