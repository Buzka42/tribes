// Mapbox style switches between the stock daytime look and the app's custom
// stylized dark/forest style at night, based on the device's local clock.
export const DEFAULT_STYLE_URL = 'mapbox://styles/mapbox/streets-v12';
export const NIGHT_STYLE_URL = 'mapbox://styles/tribes024/cmnr95i12000x01sc6y2845lo';

const DAY_START_HOUR = 6;  // 06:00 local time
const NIGHT_START_HOUR = 20; // 20:00 local time

export const isDaytime = (date: Date = new Date()): boolean => {
  const hour = date.getHours();
  return hour >= DAY_START_HOUR && hour < NIGHT_START_HOUR;
};

export const getMapStyleUrl = (date: Date = new Date()): string =>
  isDaytime(date) ? DEFAULT_STYLE_URL : NIGHT_STYLE_URL;
