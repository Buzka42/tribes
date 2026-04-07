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
- `hasSeenTutorial` (boolean, optional) - Tracks MVP Cold Start induction.
- `ratingSum` (number, optional) - Aggregate moon phases awarded as host
- `ratingCount` (number, optional) - Total reviews received
- `dateOfBirth` (string, optional) 
- `sex` (string, optional)
- `description` (string, optional)

### 2. `events`
- `id` (string)
- `creatorId` (string) - Reference to users collection
- `title` (string)
- `interest` (string) - legacy fallback
- `categoryId` (string) - Master Group filter (e.g. 'sports')
- `categorySub` (array of strings) - Up to 5 selectable sub-group strings
- `ageGroup` (string) - MVP Demographic Target (e.g., 'All Ages', '18-25')
- `gender` (string) - MVP Gender Target (e.g., 'Anyone', 'Male')
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
- `status` (string, optional) - 'active' | 'finalized' | 'cancelled'
- `finalizedAttendees` (array of strings, optional) - participants marked as present
- `tribeId` (string, optional) - If an event is generated from a tribe or mapped to one
- `isTribePrivate` (boolean, optional) - Passed down from the parent tribe

### 3. `attendances`
- `id` (string)
- `eventId` (string)
- `userId` (string)
- `status` (string) - e.g., 'pending', 'accepted', 'attended', 'missed'
- `surveyCompleted` (boolean)

### 4. `tribes`
- `id` (string)
- `name` (string)
- `description` (string)
- `categoryId` (string)
- `categorySub` (array of strings)
- `creatorId` (string)
- `creatorName` (string)
- `members` (array of strings)
- `memberNames` (object string:string)
- `pendingApplicants` (array of strings)
- `announcements` (array of objects)
  - `text` (string)
  - `authorId` (string)
  - `authorName` (string)
  - `createdAt` (timestamp)
- `location` (Geopoint, optional)
- `leaders` (array of strings)
- `createdAt` (timestamp)
- `isPublic` (boolean)
- `spiritId` (string, optional) - e.g., 'forest', 'ocean'
- `isPrivateTribe` (boolean, optional) - Ensures tribe badge goes hidden on events

### 5. `event_feedback`
- `id` (string)
- `eventId` (string)
- `userId` (string)
- `eventHappened` (boolean)
- `rating` (number) - 1 to 5
- `createdAt` (timestamp)
