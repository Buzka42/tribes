export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface User {
  uid: string;
  displayName: string;
  locationName?: string;
  homeLocation?: LocationData;
  interests: string[];
  tokens: number;
  createdAt: Date;
  isDev?: boolean;
  hasSeenTutorial?: boolean;
}

export interface Event {
  id: string;
  creatorId: string;
  title: string;
  interest: string;
  location: LocationData;
  time: Date;
  isPrivate: boolean;
  participantLimit: number;
  tokenCost: number;
  isExternal: boolean;
  externalUrl?: string;
}

export interface Announcement {
  text: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
}

export interface Tribe {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  creatorId: string;
  creatorName: string;
  members: string[];
  memberNames: Record<string, string>;
  pendingApplicants: string[];
  announcements: Announcement[];
  location?: LocationData;
  createdAt: Date;
  isPublic: boolean;
}
