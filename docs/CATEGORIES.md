# The Tribes - Event Categories Architecture

## Overview
Tribes groups user events into top-level functional categories with corresponding UI aesthetics (icon and base color). Secondary specificity is provided by "subgroups". Events can have up to 3 subcategories assigned. All fields are formally sorted alphabetically (A-Z) in arrays.

## Definitions

### 1. Arts & Culture (`arts`)
- **Icon**: `camera` (`#9C27B0`)
- **Subgroups**: Audio Dramas, Author Meetups, Book Club, Cabaret, Ceramics / Pottery, Choir & Singing, Cinema & Screenings, Concerts, Crafts & DIY, Dance, Drawing, Galleries, Graphics & Design, Historical Walks, Improv, Lectures & Discussions, Museums, Music Production, Opera, Painting, Parades & Marches, Photography, Podcasts, Poetry Readings, Pole Dancing, Sculpture, Stand-up, Street Art, Theater

### 2. Food (`food`)
- **Icon**: `coffee` (`#795548`)
- **Subgroups**: BBQ & Bonfire, Bakery / Sweets, Brunch, Coffee, Cooking Classes, Cooking Together, Craft Beer & Wine, Food Truck, Picnic, Restaurants, Tastings, Tea, Vegetarian / Vegan Cuisine

### 3. Outdoor (`outdoor`)
- **Icon**: `map` (`#4CAF50`)
- **Subgroups**: ATVs, BBQ & Bonfire, Beach Party, Camping, Dogwalking, Exploration, Frisbee & Ultimate, Garden Party, Geocaching, Hiking, Historical Walks, Kayaking, Off-road, Paintball, Parkour, Photography, Picnic, Sailing, Stargazing, Survival, Travel, Urbex, Volunteering / Charity, Winter Swimming / Cold Plunge

### 4. Party (`party`)
- **Icon**: `music` (`#E11584`)
- **Subgroups**: Ball & Banquet, Beach Party, Birthdays & Name Days, Bonfire, Cabaret, Clubbing, Concert, Craft Beer & Wine, Dance, Garden Party, House Party, Karaoke Party, LGBTQIA+ Meetups, Pub Crawl, Pub Quiz, Rave, Silent Disco, Singles Meetups, Speed Dating, Stand-up, Trivia

### 5. Social (`social`)
- **Icon**: `users` (`#E91E63`)
- **Subgroups**: AI & Machine Learning, Amusement Parks, Billiards / Pool, Bingo, Board Games, Bowling, Card Games, Craft Beer & Wine, Darts, Demonstrations / Protests, Dogwalking, Escape Room, Geocaching, Go-Karts, Improv, Karaoke Party, LARP, LGBTQIA+ Meetups, Language Exchange, Lectures & Discussions, Meditation, Networking, Paintball, Parades & Marches, Picnic, Pub Quiz, RPG, Singles Meetups, Speed Dating, Stand-up, Trampoline Park, Trivia, Volunteering / Charity, Water Parks

### 6. Sport & Active (`sports`)
- **Icon**: `activity` (`#FF5722`)
- **Subgroups**: Aerobics, BMX, Badminton, Basketball, Bouldering, Calisthenics, Cycling, Dance, Football / Soccer, Frisbee & Ultimate, Gym / Fitness, Gymnastics, Handball, Ice Skating, Longboarding, MTB, Martial Arts, Nordic Walking, Padel, Paintball, Parkour, Pole Dancing, Rollerblading, Running, SUP, Scooters, Skateboarding, Skiing, Squash, Swimming, Tennis, Volleyball, Water Parks, Winter Swimming / Cold Plunge, Yoga, Zumba

### 7. Tech & Gaming (`tech`)
- **Icon**: `cpu` (`#3F51B5`)
- **Subgroups**: AI & Machine Learning, Board Games, E-Sports, Escape Room, Hackathon, LAN Party, LARP, Programming, RPG, Retro Gaming, TCG, VR Gaming, Wargames

### 8. Time-limited Events (`time_limited`)
- **Icon**: `clock` (`#607D8B`)
- **Subgroups**: (Main category only, intended for events like: exhibitions, festivals, pop-up stores, etc.)

## Usage Integration
- **Map Pins**: The event's `categoryId` dynamically dictates what `Feather` icon is rendered inside map marker pin.
- **Filters**: The filter dashboard uses Accordion arrays matching records against the `categorySub` selections. Selected groups inherit dynamic category colors resolving overlaps gracefully.
