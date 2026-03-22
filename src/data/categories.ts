import { Feather } from '@expo/vector-icons';

export type CategoryGroupId = 'sports' | 'tech' | 'social' | 'arts' | 'food' | 'outdoor' | 'party' | 'time_limited';

export interface CategoryGroup {
  id: CategoryGroupId;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  subgroups: string[];
}

export const EVENT_CATEGORIES: CategoryGroup[] = [
  { id: 'arts', label: 'Arts & Culture', icon: 'camera', color: '#9C27B0', subgroups: ['Audio Dramas', 'Author Meetups', 'Book Club', 'Cabaret', 'Ceramics / Pottery', 'Choir & Singing', 'Cinema & Screenings', 'Concerts', 'Crafts & DIY', 'Dance', 'Drawing', 'Galleries', 'Graphics & Design', 'Historical Walks', 'Improv', 'Lectures & Discussions', 'Museums', 'Music Production', 'Opera', 'Painting', 'Parades & Marches', 'Photography', 'Podcasts', 'Poetry Readings', 'Pole Dancing', 'Sculpture', 'Stand-up', 'Street Art', 'Theater'] },
  { id: 'food', label: 'Food', icon: 'coffee', color: '#795548', subgroups: ['BBQ & Bonfire', 'Bakery / Sweets', 'Brunch', 'Coffee', 'Cooking Classes', 'Cooking Together', 'Craft Beer & Wine', 'Food Truck', 'Picnic', 'Restaurants', 'Tastings', 'Tea', 'Vegetarian / Vegan Cuisine'] },
  { id: 'outdoor', label: 'Outdoor', icon: 'map', color: '#4CAF50', subgroups: ['ATVs', 'BBQ & Bonfire', 'Beach Party', 'Camping', 'Dogwalking', 'Exploration', 'Frisbee & Ultimate', 'Garden Party', 'Geocaching', 'Hiking', 'Historical Walks', 'Kayaking', 'Off-road', 'Paintball', 'Parkour', 'Photography', 'Picnic', 'Sailing', 'Stargazing', 'Survival', 'Travel', 'Urbex', 'Volunteering / Charity', 'Winter Swimming / Cold Plunge'] },
  { id: 'party', label: 'Party', icon: 'music', color: '#E11584', subgroups: ['Ball & Banquet', 'Beach Party', 'Birthdays & Name Days', 'Bonfire', 'Cabaret', 'Clubbing', 'Concert', 'Craft Beer & Wine', 'Dance', 'Garden Party', 'House Party', 'Karaoke Party', 'LGBTQIA+ Meetups', 'Pub Crawl', 'Pub Quiz', 'Rave', 'Silent Disco', 'Singles Meetups', 'Speed Dating', 'Stand-up', 'Trivia'] },
  { id: 'social', label: 'Social', icon: 'users', color: '#E91E63', subgroups: ['AI & Machine Learning', 'Amusement Parks', 'Billiards / Pool', 'Bingo', 'Board Games', 'Bowling', 'Card Games', 'Craft Beer & Wine', 'Darts', 'Demonstrations / Protests', 'Dogwalking', 'Escape Room', 'Geocaching', 'Go-Karts', 'Improv', 'Karaoke Party', 'LARP', 'LGBTQIA+ Meetups', 'Language Exchange', 'Lectures & Discussions', 'Meditation', 'Networking', 'Paintball', 'Parades & Marches', 'Picnic', 'Pub Quiz', 'RPG', 'Singles Meetups', 'Speed Dating', 'Stand-up', 'Trampoline Park', 'Trivia', 'Volunteering / Charity', 'Water Parks'] },
  { id: 'sports', label: 'Sport & Active', icon: 'activity', color: '#FF5722', subgroups: ['Aerobics', 'BMX', 'Badminton', 'Basketball', 'Bouldering', 'Calisthenics', 'Cycling', 'Dance', 'Football / Soccer', 'Frisbee & Ultimate', 'Gym / Fitness', 'Gymnastics', 'Handball', 'Ice Skating', 'Longboarding', 'MTB', 'Martial Arts', 'Nordic Walking', 'Padel', 'Paintball', 'Parkour', 'Pole Dancing', 'Rollerblading', 'Running', 'SUP', 'Scooters', 'Skateboarding', 'Skiing', 'Squash', 'Swimming', 'Tennis', 'Volleyball', 'Water Parks', 'Winter Swimming / Cold Plunge', 'Yoga', 'Zumba'] },
  { id: 'tech', label: 'Tech & Gaming', icon: 'cpu', color: '#3F51B5', subgroups: ['AI & Machine Learning', 'Board Games', 'E-Sports', 'Escape Room', 'Hackathon', 'LAN Party', 'LARP', 'Programming', 'RPG', 'Retro Gaming', 'TCG', 'VR Gaming', 'Wargames'] },
  { id: 'time_limited', label: 'Time-limited Events', icon: 'clock', color: '#607D8B', subgroups: [] }
];
