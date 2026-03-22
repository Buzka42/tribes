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
  { id: 'sports', label: 'Sport & Active', icon: 'activity', color: '#FF5722', subgroups: ['Cycling', 'Rollerblading', 'Ice Skating', 'Running', 'Gym / Fitness', 'Nordic Walking', 'Football / Soccer', 'Basketball', 'Swimming', 'Volleyball', 'Bouldering', 'Yoga', 'Dance', 'Zumba', 'Skateboarding', 'BMX', 'Martial Arts', 'Handball', 'Tennis', 'Badminton', 'Squash', 'Padel', 'Skiing', 'Gymnastics', 'Aerobics', 'Calisthenics', 'MTB', 'Scooters', 'Longboarding', 'SUP', 'Paintball', 'Water Parks', 'Winter Swimming / Cold Plunge', 'Parkour', 'Frisbee & Ultimate', 'Pole Dancing'] },
  { id: 'tech', label: 'Tech & Gaming', icon: 'cpu', color: '#3F51B5', subgroups: ['Programming', 'Hackathon', 'Board Games', 'RPG', 'Wargames', 'TCG', 'LARP', 'LAN Party', 'VR Gaming', 'Retro Gaming', 'E-Sports', 'Escape Room', 'AI & Machine Learning'] },
  { id: 'social', label: 'Social', icon: 'users', color: '#E91E63', subgroups: ['Billiards / Pool', 'Darts', 'Bowling', 'Networking', 'Paintball', 'Pub Quiz', 'Trivia', 'Bingo', 'Card Games', 'Geocaching', 'Go-Karts', 'Trampoline Park', 'Escape Room', 'Water Parks', 'Amusement Parks', 'Language Exchange', 'Lectures & Discussions', 'Meditation', 'Board Games', 'RPG', 'LARP', 'Picnic', 'Dogwalking', 'Karaoke Party', 'Stand-up', 'Improv', 'Speed Dating', 'Singles Meetups', 'Parades & Marches', 'Demonstrations / Protests', 'Volunteering / Charity', 'Craft Beer & Wine', 'AI & Machine Learning', 'LGBTQIA+ Meetups'] },
  { id: 'arts', label: 'Arts & Culture', icon: 'camera', color: '#9C27B0', subgroups: ['Painting', 'Drawing', 'Ceramics / Pottery', 'Sculpture', 'Crafts & DIY', 'Photography', 'Graphics & Design', 'Concerts', 'Music Production', 'Choir & Singing', 'Audio Dramas', 'Podcasts', 'Stand-up', 'Improv', 'Cabaret', 'Cinema & Screenings', 'Theater', 'Opera', 'Museums', 'Galleries', 'Book Club', 'Poetry Readings', 'Author Meetups', 'Historical Walks', 'Street Art', 'Dance', 'Lectures & Discussions', 'Parades & Marches', 'Pole Dancing'] },
  { id: 'food', label: 'Food', icon: 'coffee', color: '#795548', subgroups: ['Restaurants', 'Brunch', 'Coffee', 'Tea', 'Picnic', 'Bakery / Sweets', 'Cooking Classes', 'Tastings', 'BBQ & Bonfire', 'Vegetarian / Vegan Cuisine', 'Cooking Together', 'Food Truck', 'Craft Beer & Wine'] },
  { id: 'outdoor', label: 'Outdoor', icon: 'map', color: '#4CAF50', subgroups: ['Hiking', 'Camping', 'Travel', 'Exploration', 'Urbex', 'Survival', 'Kayaking', 'Sailing', 'Off-road', 'ATVs', 'Stargazing', 'Dogwalking', 'Geocaching', 'Paintball', 'Picnic', 'BBQ & Bonfire', 'Photography', 'Historical Walks', 'Garden Party', 'Beach Party', 'Winter Swimming / Cold Plunge', 'Volunteering / Charity', 'Parkour', 'Frisbee & Ultimate'] },
  { id: 'party', label: 'Party', icon: 'music', color: '#E11584', subgroups: ['House Party', 'Clubbing', 'Pub Crawl', 'Karaoke Party', 'Silent Disco', 'Rave', 'Concert', 'Ball & Banquet', 'Garden Party', 'Beach Party', 'Bonfire', 'Birthdays & Name Days', 'Speed Dating', 'Singles Meetups', 'Dance', 'Pub Quiz', 'Trivia', 'Stand-up', 'Cabaret', 'Craft Beer & Wine', 'LGBTQIA+ Meetups'] },
  { id: 'time_limited', label: 'Time-limited Events', icon: 'clock', color: '#607D8B', subgroups: [] }
];
