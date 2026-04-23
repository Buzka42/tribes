// ─── TRIBES DESIGN SYSTEM ──────────────────────────────────────────────────
// Aesthetic: Modern Nomad / Mystical Forest
// Light surface = map screen parchment; Dark surface = all menus + sheets

export const Colors = {
  // ── Backgrounds ────────────────────────────────────────────────────────────
  bg: '#1A2421',                        // Deep Forest Green — all sheets
  bgElevated: '#1F2C28',               // Slightly lifted surface
  bgInput: 'rgba(255,255,255,0.04)',    // Translucent input fill
  bgInputFocus: 'rgba(255,255,255,0.07)',

  // ── Dark Copper Glassmorphism (buttons, cards) ──────────────────────────────
  glassBtnBg: 'rgba(26,30,28,0.75)',    // Dark translucent button fill
  glassCardBg: 'rgba(26,30,28,0.65)',   // Tribe card / elevated panel
  glassCardBorder: 'rgba(217,160,111,0.38)', // Copper card border

  // ── Borders ────────────────────────────────────────────────────────────────
  hairline: 'rgba(217, 160, 111, 0.13)', // Gold hairline divider
  hairlineNeutral: 'rgba(255,255,255,0.07)',
  borderInput: 'rgba(217, 160, 111, 0.18)',

  // ── Text ───────────────────────────────────────────────────────────────────
  textPrimary: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(255,255,255,0.55)',
  textMuted: 'rgba(255,255,255,0.28)',
  textPlaceholder: 'rgba(255,255,255,0.25)',

  // ── Gold / Copper accent (primary actions) ──────────────────────────────────
  gold: '#D9A06F',
  goldDim: 'rgba(217, 160, 111, 0.18)',
  goldBorder: 'rgba(217, 160, 111, 0.32)',
  goldSheen: 'rgba(255, 220, 175, 0.22)', // 1-px sheen on pill buttons

  // ── Sage Green (leaf/nature accents, map) ──────────────────────────────────
  sage: '#6B8E6B',
  sageSoft: 'rgba(107, 142, 107, 0.18)',
  sageMap: '#F4F1EA',                  // Parchment for map tint reference

  // ── Danger ─────────────────────────────────────────────────────────────────
  danger: '#C0645C',
  dangerSoft: 'rgba(192, 100, 92, 0.12)',
  dangerBorder: 'rgba(192, 100, 92, 0.35)',

  // ── Legacy aliases (map + light UI) ────────────────────────────────────────
  primary: '#5E7153',
  primaryDark: '#3E4D36',
  accent: '#D9A06F',
  background: '#1A2421',
  surface: '#1F2C28',
  text: 'rgba(255,255,255,0.92)',
  textLight: 'rgba(255,255,255,0.5)',
  glassBg: 'rgba(26, 36, 33, 0.88)',
  glassBorder: 'rgba(217, 160, 111, 0.18)',
};

export const Typography = {
  // Merriweather — headlines, tribe names, screen titles
  headline: 'Merriweather_700Bold',
  headlineBold: 'Merriweather_900Black',

  // Outfit — all UI text
  bodyLight: 'Outfit_300Light',
  body: 'Outfit_400Regular',
  bodyMedium: 'Outfit_500Medium',
  bodySemibold: 'Outfit_500Medium',   // alias used throughout codebase
  bodyBold: 'Outfit_500Medium',       // alias used throughout codebase
  heading: 'Merriweather_700Bold',    // alias used throughout codebase
};
