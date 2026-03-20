export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface User {
  uid: string;
  displayName: string;
  interests: string[];
  tokens: number;
  createdAt: Date;
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
