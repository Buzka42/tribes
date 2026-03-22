# Database Schema: Tribes (Firestore)

## Collections

### 1. `users`
- `uid` (string) - Firebase Auth UID
- `displayName` (string)
- `locationName` (string)
- `homeLocation` (object)
  - `latitude` (number)
  - `longitude` (number)
- `interests` (array of strings)
- `tokens` (number)
- `createdAt` (timestamp)

### 2. `events`
- `id` (string)
- `creatorId` (string) - Reference to users collection
- `title` (string)
- `interest` (string) - legacy fallback
- `categoryId` (string) - Master Group filter (e.g. 'sports')
- `categorySub` (array of strings) - Up to 3 selectable sub-group strings
- `location` (Geopoint / Address data)
  - `latitude` (number)
  - `longitude` (number)
  - `address` (string)
- `time` (timestamp)
- `participants` (array of strings) - user UIDs
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
