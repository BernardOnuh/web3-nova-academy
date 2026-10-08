// lib/programme.ts — public-facing programme wording (one place to change it)

/** Every track opens with a one-week introduction. */
export const INTRO_LABEL = '7-day introduction';

/** Full programme dates/length are not fixed yet. */
export const SCHEDULE_TBD = 'Full programme schedule to be announced';

/** The bonus task: invite friends to the boot camp. */
export const BOOTCAMP_NAME = 'Web3Nova 7-Day Boot Camp';
export const INVITE_POINTS = 100;
export const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/DATyVP11k0jGIjfQhprvQ2?mode=gi_t';

/** Welcome anthems (trimmed clips in /public/sounds). */
export const ANTHEMS = {
  MALE: { src: '/sounds/anthem-born-winner.mp3', title: 'Born Winner', artist: 'Burna Boy' },
  FEMALE: { src: '/sounds/anthem-commas.mp3', title: 'Commas', artist: 'Ayra Starr' },
} as const;
export type Gender = keyof typeof ANTHEMS;
