import { Feather } from '@expo/vector-icons';

export type CategoryGroupId = 'sports' | 'tech' | 'social' | 'arts' | 'food' | 'outdoor';

export interface CategoryGroup {
  id: CategoryGroupId;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  subgroups: string[];
}

export const EVENT_CATEGORIES: CategoryGroup[] = [
  { id: 'sports', label: 'Sports & Active', icon: 'activity', color: '#FF5722', subgroups: ['Running', 'Gym', 'Yoga', 'Cycling', 'Football', 'Other'] },
  { id: 'tech', label: 'Tech & Gaming', icon: 'cpu', color: '#3F51B5', subgroups: ['Coding', 'E-Sports', 'Board Games', 'Hackathon', 'Other'] },
  { id: 'social', label: 'Social', icon: 'users', color: '#E91E63', subgroups: ['Clubbing', 'House Party', 'Bar/Pub', 'Networking', 'Other'] },
  { id: 'arts', label: 'Arts & Culture', icon: 'camera', color: '#9C27B0', subgroups: ['Photography', 'Museum', 'Theatre', 'Book Club', 'Other'] },
  { id: 'food', label: 'Food & Drink', icon: 'coffee', color: '#795548', subgroups: ['Dinner', 'Coffee', 'Tasting', 'Picnic', 'Other'] },
  { id: 'outdoor', label: 'Outdoor', icon: 'map', color: '#4CAF50', subgroups: ['Hiking', 'Camping', 'Travel', 'Exploration', 'Other'] },
];
