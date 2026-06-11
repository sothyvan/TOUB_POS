export const TONE_BADGE_CLASSES = {
  gold: 'bg-[#fdf7e7] text-[#785315] border-[#f4dfb5]',
  green: 'bg-[#e6f4eb] text-[#126149] border-[#b9dec9]',
  blue: 'bg-[#e6f2f7] text-[#1f6278] border-[#aed3df]',
  rose: 'bg-[#fdf0ec] text-[#8c3d2b] border-[#f4cfc3]',
};

export const TONE_SWATCH_CLASSES = {
  gold: 'bg-[#f8d36b]',
  green: 'bg-[#79b991]',
  blue: 'bg-[#8cb8c5]',
  rose: 'bg-[#e6a48f]',
};

export function getToneBadgeClass(tone) {
  return TONE_BADGE_CLASSES[tone] || TONE_BADGE_CLASSES.gold;
}

export function getToneSwatchClass(tone) {
  return TONE_SWATCH_CLASSES[tone] || '';
}
