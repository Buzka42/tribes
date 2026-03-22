# The Tribes - Event Categories Architecture

## Overview
Tribes groups user events into top-level functional categories with corresponding UI aesthetics (icon and base color). Secondary specificity is provided by "subgroups". Events can have up to 3 subcategories assigned.

## Definitions

### 1. Sport & Active (`sports`)
- **Icon**: `activity` (`#FF5722`)
- **Subgroups**: Cycling, Rollerblading, Ice Skating, Running, Gym / Fitness, Nordic Walking, Football / Soccer, Basketball, Swimming, Volleyball, Bouldering, Yoga, Dance, Zumba, Skateboarding, BMX, Martial Arts, Handball, Tennis, Badminton, Squash, Padel, Skiing, Gymnastics, Aerobics, Calisthenics, MTB, Scooters, Longboarding, SUP, Paintball, Water Parks, Winter Swimming / Cold Plunge, Parkour, Frisbee & Ultimate, Pole Dancing

### 2. Tech & Gaming (`tech`)
- **Icon**: `cpu` (`#3F51B5`)
- **Subgroups**: Programming, Hackathon, Board Games, RPG, Wargames, TCG, LARP, LAN Party, VR Gaming, Retro Gaming, E-Sports, Escape Room, AI & Machine Learning

### 3. Social (`social`)
- **Icon**: `users` (`#E91E63`)
- **Subgroups**: Billiards / Pool, Darts, Bowling, Networking, Paintball, Pub Quiz, Trivia, Bingo, Card Games, Geocaching, Go-Karts, Trampoline Park, Escape Room, Water Parks, Amusement Parks, Language Exchange, Lectures & Discussions, Meditation, Board Games, RPG, LARP, Picnic, Dogwalking, Karaoke Party, Stand-up, Improv, Speed Dating, Singles Meetups, Parades & Marches, Demonstrations / Protests, Volunteering / Charity, Craft Beer & Wine, AI & Machine Learning, LGBTQIA+ Meetups

### 4. Arts & Culture (`arts`)
- **Icon**: `camera` (`#9C27B0`)
- **Subgroups**: Painting, Drawing, Ceramics / Pottery, Sculpture, Crafts & DIY, Photography, Graphics & Design, Concerts, Music Production, Choir & Singing, Audio Dramas, Podcasts, Stand-up, Improv, Cabaret, Cinema & Screenings, Theater, Opera, Museums, Galleries, Book Club, Poetry Readings, Author Meetups, Historical Walks, Street Art, Dance, Lectures & Discussions, Parades & Marches, Pole Dancing

### 5. Food (`food`)
- **Icon**: `coffee` (`#795548`)
- **Subgroups**: Restaurants, Brunch, Coffee, Tea, Picnic, Bakery / Sweets, Cooking Classes, Tastings, BBQ & Bonfire, Vegetarian / Vegan Cuisine, Cooking Together, Food Truck, Craft Beer & Wine

### 6. Outdoor (`outdoor`)
- **Icon**: `map` (`#4CAF50`)
- **Subgroups**: Hiking, Camping, Travel, Exploration, Urbex, Survival, Kayaking, Sailing, Off-road, ATVs, Stargazing, Dogwalking, Geocaching, Paintball, Picnic, BBQ & Bonfire, Photography, Historical Walks, Garden Party, Beach Party, Winter Swimming / Cold Plunge, Volunteering / Charity, Parkour, Frisbee & Ultimate

### 7. Party (`party`)
- **Icon**: `music` (`#E11584`)
- **Subgroups**: House Party, Clubbing, Pub Crawl, Karaoke Party, Silent Disco, Rave, Concert, Ball & Banquet, Garden Party, Beach Party, Bonfire, Birthdays & Name Days, Speed Dating, Singles Meetups, Dance, Pub Quiz, Trivia, Stand-up, Cabaret, Craft Beer & Wine, LGBTQIA+ Meetups

### 8. Time-limited Events (`time_limited`)
- **Icon**: `clock` (`#607D8B`)
- **Subgroups**: (Main category only, intended for events like: exhibitions, festivals, pop-up stores, etc.)

## Usage Integration
- **Map Pins**: The event's `categoryId` dynamically dictates what `Feather` icon is rendered inside map marker pin.
- **Filters**: The filter dashboard uses Accordion arrays matching records against the `categorySub` selections. Selected groups inherit dynamic category colors resolving overlaps gracefully.
