# The Tribes - Event Categories Architecture

## Overview
Tribes groups user events into top-level functional categories with corresponding UI aesthetics (icon and base color). Secondary specificity is provided by "subgroups" strings tightly bound to their parent category.

## Definitions

### 1. Sports & Active (`sports`)
- **Icon**: `activity`
- **Color**: `#FF5722`
- **Subgroups**: Running, Gym, Yoga, Cycling, Football, Other

### 2. Tech & Gaming (`tech`)
- **Icon**: `cpu`
- **Color**: `#3F51B5`
- **Subgroups**: Coding, E-Sports, Board Games, Hackathon, Other

### 3. Social (`social`)
- **Icon**: `users`
- **Color**: `#E91E63`
- **Subgroups**: Clubbing, House Party, Bar/Pub, Networking, Other

### 4. Arts & Culture (`arts`)
- **Icon**: `camera`
- **Color**: `#9C27B0`
- **Subgroups**: Photography, Museum, Theatre, Book Club, Other

### 5. Food & Drink (`food`)
- **Icon**: `coffee`
- **Color**: `#795548`
- **Subgroups**: Dinner, Coffee, Tasting, Picnic, Other

### 6. Outdoor (`outdoor`)
- **Icon**: `map`
- **Color**: `#4CAF50`
- **Subgroups**: Hiking, Camping, Travel, Exploration, Other

## Usage Integration
- **Map Pins**: The event's `categoryId` dynamically dictates what `Feather` icon is rendered centrally inside the map marker pin.
- **Wizard Details**: Selecting a master category injects the predefined color into the active button outline, base background, and visually highlights subsequent active subgroup "pills".
- **Filter Menu**: The filter dashboard aggregates dynamic map markers filtering array comparisons via standard `react-map-gl` and native bounds to only render events matching active keys.
