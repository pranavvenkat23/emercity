import { ageInYears, displayName } from '@/domain/members';
import type { ConditionType, HouseholdSnapshot, Member, Tier } from '@/models/types';

/**
 * Lock-screen card content (§14). The image is rendered on the device; this
 * module decides what goes on it.
 */
export type CardBlock = 'header' | 'meeting' | 'contacts' | 'critical' | 'myMedical' | 'pets' | 'address' | 'qr';

export const BLOCK_LABEL: Record<CardBlock, string> = {
  header: 'Header',
  meeting: 'Meeting points',
  contacts: 'Emergency contacts',
  critical: 'Critical needs',
  myMedical: 'My medical info',
  pets: 'Pets',
  address: 'Address',
  qr: 'QR code',
};

/** §14.2 defaults (same for adults and teens). */
export const DEFAULT_BLOCKS: Record<CardBlock, boolean> = {
  header: true,
  meeting: true,
  contacts: true,
  critical: true,
  myMedical: false,
  pets: true,
  address: false,
  qr: true,
};

export const DEFAULT_ORDER: CardBlock[] = ['header', 'meeting', 'contacts', 'critical', 'myMedical', 'pets', 'address', 'qr'];

export interface CardSettings {
  ownerId: string;
  blocks: Record<CardBlock, boolean>;
  order: CardBlock[];
  theme: 'dark' | 'light' | 'contrast';
  textSize: 'standard' | 'large';
  /** Hash of the content when last saved; a change makes the card "out of date" (§14.5). */
  savedContentKey?: string | null;
}

const PHRASE: Partial<Record<ConditionType, string>> = {
  'oxygen-dependent': 'oxygen',
  ventilator: 'ventilator',
  'dialysis-home': 'home dialysis',
  'dialysis-center': 'dialysis',
  'diabetes-insulin': 'insulin-dependent diabetes',
  bedbound: 'bedbound',
  'mobility-wheelchair': 'wheelchair user',
  'cognitive-dementia': 'dementia',
  'seizure-disorder': 'seizures',
  'severe-allergy-epipen': 'severe allergy (EpiPen)',
  'hearing-loss': 'Deaf / hard of hearing',
  'vision-loss': 'low vision',
  'heart-condition': 'heart condition',
  'infant-formula': 'baby, formula-fed',
};

/** "oxygen 24/7", "insulin-dependent diabetes", short need phrases for one member. */
export function needPhrases(m: Member): string[] {
  const out: string[] = [];
  for (const c of m.conditions) {
    const p = PHRASE[c.type];
    if (!p) continue;
    out.push(c.type === 'oxygen-dependent' && c.oxygenUsage !== 'night-or-activity' ? 'oxygen 24/7' : p);
  }
  return out;
}

export interface CriticalLine {
  memberId: string;
  text: string;
}

/**
 * Top Critical items (§14.2): members whose highest tier is Critical, in
 * that order, as "Grandma (82): oxygen 24/7". At most `max`, plus a count
 * of the rest ("+N more in the app", §25.4).
 */
export function criticalLines(snap: HouseholdSnapshot, topTiers: Map<string, Tier>, now: Date, max = 3): { lines: CriticalLine[]; more: number } {
  const crit = snap.members.filter((m) => topTiers.get(m.id) === 'critical' && needPhrases(m).length);
  const lines = crit.map((m) => {
    const age = ageInYears(m.birthDate, now);
    const who = `${displayName(m)}${age != null && age >= 65 ? ` (${age})` : ''}`;
    return { memberId: m.id, text: `${who}: ${needPhrases(m).slice(0, 2).join(', ')}` };
  });
  return { lines: lines.slice(0, max), more: Math.max(0, lines.length - max) };
}

/** Microchip shown by last digits only by default (§14.2). */
export function maskChip(id: string | undefined): string | null {
  if (!id) return null;
  return `…${id.slice(-4)}`;
}

export interface CardContent {
  household: string;
  meeting: string[];
  contacts: { name: string; phone: string; outOfArea: boolean }[];
  critical: CriticalLine[];
  moreCritical: number;
  myMedical: string[];
  pets: string[];
  address: string;
  qrText: string;
}

export function buildCardContent(snap: HouseholdSnapshot, owner: Member, topTiers: Map<string, Tier>, now: Date): CardContent {
  const meeting = ['near-home', 'neighborhood', 'out-of-area']
    .map((type) => snap.meetingPoints.find((p) => p.type === type))
    .filter(Boolean)
    .map((p) => p!.name);
  const local = snap.contacts.filter((c) => c.type === 'emergency').slice(0, 2);
  const away = snap.contacts.find((c) => c.isOutOfArea || c.type === 'out-of-area');
  const contacts = [...local, ...(away && !local.includes(away) ? [away] : [])].map((c) => ({ name: c.name, phone: c.phone, outOfArea: c.isOutOfArea || c.type === 'out-of-area' }));
  const { lines, more } = criticalLines(snap, topTiers, now);
  const myMedical = [
    ...needPhrases(owner),
    ...(owner.allergies.length ? [`Allergies: ${owner.allergies.join(', ')}`] : []),
    ...(owner.bloodType && owner.bloodType !== 'unknown' ? [`Blood type ${owner.bloodType}`] : []),
  ];
  // "Biscuit (dog)"; a placeholder name like "Dog 1" already says the species.
  const species = (p: (typeof snap.pets)[number]) => p.species.replace('-', ' ');
  const pets = snap.pets.map((p) => `${p.name.toLowerCase().startsWith(species(p)) ? p.name : `${p.name} (${species(p)})`}${p.microchipId ? `, microchip ${maskChip(p.microchipId)}` : ''}`);
  const a = snap.household.address;
  const address = [a.line1, a.city, a.state, a.zip].filter(Boolean).join(', ');
  const qrText = [
    'EMERCITY HOUSEHOLD',
    meeting.length ? `Meet: ${meeting.join(' / ')}` : null,
    contacts.length ? `Contacts: ${contacts.map((c) => `${c.name}${c.outOfArea ? ' (out of area)' : ''} ${c.phone}`).join(', ')}` : null,
    lines.length ? `Critical: ${lines.map((l) => l.text.replace(/ \(\d+\)/, '')).join('; ')}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return { household: snap.household.name, meeting, contacts, critical: lines, moreCritical: more, myMedical, pets, address, qrText };
}

/** Stable key of what's on the card; a change marks it out of date (§14.5). */
export function contentKey(c: CardContent): string {
  return JSON.stringify([c.meeting, c.contacts, c.critical.map((x) => x.text), c.pets]);
}
