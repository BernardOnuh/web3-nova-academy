// lib/programme.ts — public-facing programme wording (one place to change it)

/** Every track opens with a one-week introduction. */
export const INTRO_LABEL = '7-day introduction';

/** Full programme dates/length are not fixed yet. */
export const SCHEDULE_TBD = 'Full programme schedule to be announced';

/** The bonus task: invite friends to the boot camp. */
export const BOOTCAMP_NAME = 'Web3Nova 7-Day Boot Camp';
export const INVITE_POINTS = 100;
export const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/DATyVP11k0jGIjfQhprvQ2?mode=gi_t';

/** After the final test: students who want to work and earn with their skill join this group. */
export const EARN_GROUP_URL = WHATSAPP_GROUP_URL;
/** Last step of the final test flow. */
export const BOOTCAMP_LENGTH = '3-month';
export const BOOTCAMP_URL = WHATSAPP_GROUP_URL;

/** Welcome anthems (trimmed clips in /public/sounds). */
export const ANTHEMS = {
  MALE: { src: '/sounds/anthem-born-winner.mp3', title: 'Born Winner', artist: 'Burna Boy' },
  FEMALE: { src: '/sounds/anthem-commas.mp3', title: 'Commas', artist: 'Ayra Starr' },
} as const;
export type Gender = keyof typeof ANTHEMS;
