// Screen and road layout (game units, scaled to fit the window)
export const W = 400;
export const H = 700;
export const ROAD_L = 30;
export const ROAD_R = 370;
export const ROAD_MID = (ROAD_L + ROAD_R) / 2;
export const PLAYER_SCREEN_Y = 560;

// Squad
export const SPACING = 7;
export const MAX_DRAWN = 60;
export const MAX_SHOOTERS = 16;
export const START_SOLDIERS = 6;
export const START_FIRE_RATE = 3; // volleys per second
export const RUN_SPEED = 140;
export const BULLET_SPEED = 520;

// Stage layout
export const STAGE_BASE_LENGTH = 3200;
export const STAGE_LENGTH_PER_LEVEL = 400;
export const GATE_GAP = 380;
export const WAVE_GAP = 420;

// Enemies
export const ENEMY_BASE_HP = 2;
export const ENEMY_HP_PER_STAGE = 1.3;
export const BRUTE_HP_MULT = 5;

// Loot
export const LOOT_CHANCE = 0.5;       // regular enemy; brutes always drop
export const LOOT_PICKUP_BONUS = 10;  // added to squad radius

export const COLORS = {
  squad: 0x2b7bff,
  enemy: 0xe8432e,
  brute: 0x8a2be2,
  good: 0x288cff,
  bad: 0xeb3c3c,
  stat: 0x28c86e,
  gold: 0xffd23f,
};
