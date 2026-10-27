// Every 25 floors the world changes (and the climb gets a little faster).
export const LEVEL_FLOORS = 25;

export const LEVELS = [
  { name: 'Cairo Rooftops', props: ['dish', 'tank', 'plant', 'laundry', 'lantern', null, null, null] },
  { name: 'The Desert Road', props: ['palm', 'jar', 'camel', null, null, null] },
  { name: 'Pyramids of Giza', props: ['glyph', 'torch', 'jar', null, null, null] },
  { name: 'Temple of the Stars', props: ['ankh', 'torch', 'glyph', null, null] },
  { name: 'Above the Nile', props: ['star', 'lantern', null, null, null] }
];

export const levelOf = (floor) => Math.min(LEVELS.length - 1, Math.floor(Math.max(0, floor) / LEVEL_FLOORS));
