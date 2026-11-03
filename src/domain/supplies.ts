import { ageBand, displayName, hasCondition } from '@/domain/members';
import type { Hazard, HouseholdSnapshot, SupplyCategory, SupplyItem, SupplyLocation, Tier } from '@/models/types';

/**
 * Supply list generation (§17.2). Home kit = 7 days, go-bag = 3 days.
 * Each template item has a stable `templateRuleId` so regeneration keeps
 * what the user has checked off. Manual items are never removed.
 */
export const HOME_DAYS = 7;
export const GO_BAG_DAYS = 3;

export interface SupplyTemplate {
  templateRuleId: string;
  category: SupplyCategory;
  name: string;
  quantityNeeded: number;
  unit: string;
  location: SupplyLocation;
  tier?: Tier;
  linkedMemberId?: string | null;
  linkedPetId?: string | null;
  /** One line: why it's on the list (§17.3). */
  why: string;
  guideId?: string;
}

export function generateSupplies(snap: HouseholdSnapshot, scores: Record<Hazard, number>, now = new Date()): SupplyTemplate[] {
  const out: SupplyTemplate[] = [];
  const people = snap.members.length;
  const both = (t: Omit<SupplyTemplate, 'location' | 'quantityNeeded' | 'templateRuleId'> & { id: string; home: number; bag: number }) => {
    if (t.home > 0) out.push({ ...t, templateRuleId: `${t.id}:home`, location: 'home-kit', quantityNeeded: t.home });
    if (t.bag > 0) out.push({ ...t, templateRuleId: `${t.id}:bag`, location: 'go-bag', quantityNeeded: t.bag });
  };

  if (people) {
    both({ id: 'water', category: 'water', name: 'Drinking water', unit: 'gal', home: people * HOME_DAYS, bag: people * GO_BAG_DAYS, why: `1 gallon per person per day for ${people} ${people === 1 ? 'person' : 'people'}` });
    both({ id: 'food', category: 'food', name: 'Non-perishable food', unit: 'person-days', home: people * HOME_DAYS, bag: people * GO_BAG_DAYS, why: `${HOME_DAYS} days at home, ${GO_BAG_DAYS} in the go-bag, for ${people}` });
    both({ id: 'flashlight', category: 'light-power', name: 'Flashlight and batteries', unit: 'each', home: people, bag: people, why: '1 per person' });
  }

  for (const p of snap.pets) {
    const water = p.species === 'dog' || p.species === 'cat' ? 0.5 : 0;
    if (water) both({ id: `pet-water-${p.id}`, category: 'pet', name: `${p.name}'s water`, unit: 'gal', home: water * HOME_DAYS, bag: water * GO_BAG_DAYS, linkedPetId: p.id, why: '0.5 gallon per day for a dog or cat (default, editable)' });
    out.push({ templateRuleId: `pet-kit-${p.id}`, category: 'pet', name: `${p.name}: ${p.needsCarrier ? 'carrier, ' : ''}leash, food, meds, vaccination record copy, photo`, unit: 'set', quantityNeeded: 1, location: 'go-bag', linkedPetId: p.id, why: '1 set per pet', guideId: 'pets-evacuation' });
  }

  for (const m of snap.members) {
    const band = ageBand(m, now);
    if (band === 'infant' && hasCondition(m, 'infant-formula')) {
      both({ id: `formula-${m.id}`, category: 'baby', name: `${displayName(m)}: ready-to-feed formula`, unit: 'days', home: HOME_DAYS, bag: GO_BAG_DAYS, tier: 'critical', linkedMemberId: m.id, why: 'Daily feeds × days; ready-to-feed needs no water or heat', guideId: 'babies' });
    }
    if (band === 'infant' || band === 'toddler') {
      both({ id: `diapers-${m.id}`, category: 'baby', name: `${displayName(m)}: diapers and wipes`, unit: 'diapers', home: 8 * HOME_DAYS, bag: 8 * GO_BAG_DAYS, linkedMemberId: m.id, why: '8 diapers a day (default, editable)' });
    }
    if (hasCondition(m, 'hearing-loss')) {
      both({ id: `hearing-${m.id}`, category: 'medical', name: `${displayName(m)}: spare hearing-aid batteries, visual or vibrating alarm`, unit: 'set', home: 1, bag: 1, linkedMemberId: m.id, why: 'Hearing loss', guideId: 'smoke-alarms-deaf' });
    }
    if (hasCondition(m, 'vision-loss')) {
      out.push({ templateRuleId: `vision-${m.id}`, category: 'medical', name: `${displayName(m)}: spare glasses, white cane`, unit: 'set', quantityNeeded: 1, location: 'go-bag', linkedMemberId: m.id, why: 'Low vision' });
    }
  }

  const fridgeCritical = snap.medications.filter((x) => x.needsRefrigeration);
  for (const med of snap.medications.filter((x) => x.isCritical)) {
    const owner = snap.members.find((m) => m.id === med.ownerId);
    both({
      id: `med-${med.id}`,
      category: 'medical',
      name: `${owner ? `${displayName(owner)}: ` : ''}${med.genericName ?? med.brandName}`,
      unit: 'days',
      home: HOME_DAYS,
      bag: GO_BAG_DAYS,
      tier: 'critical',
      linkedMemberId: owner?.id ?? null,
      why: 'At least 7 days on hand; the go-bag holds 3',
    });
  }
  if (fridgeCritical.length) {
    const insulin = fridgeCritical.some((x) => /insulin/i.test(`${x.genericName} ${x.brandName}`));
    out.push({ templateRuleId: 'cooler', category: 'medical', name: 'Cooler, ice packs and a thermometer', unit: 'set', quantityNeeded: 1, location: 'home-kit', tier: insulin ? 'critical' : 'urgent', why: 'Refrigerated medicine', guideId: 'insulin-outage' });
  }

  for (const d of snap.devices) {
    const owner = snap.members.find((m) => m.id === d.memberId);
    const who = owner ? `${displayName(owner)}'s ` : '';
    if (d.lifeSustaining) {
      out.push({ templateRuleId: `device-${d.id}`, category: 'light-power', name: `${who}${(d.label ?? 'device').toLowerCase()}: spare batteries, backup supply, charger cables`, unit: 'set', quantityNeeded: 1, location: 'home-kit', tier: 'critical', linkedMemberId: owner?.id ?? null, why: `${d.label ?? 'Device'} backup plan`, guideId: 'devices-outage' });
    } else if (d.type === 'cpap-bipap') {
      out.push({ templateRuleId: `cpap-${d.id}`, category: 'light-power', name: `${who}CPAP battery pack or DC adapter`, unit: 'each', quantityNeeded: 1, location: 'home-kit', tier: 'urgent', linkedMemberId: owner?.id ?? null, why: 'CPAP' });
    }
  }

  const electricHeat = snap.household.heatingType === 'electric' || snap.household.heatingType === 'heat-pump';
  if (electricHeat || scores.outage >= 70) {
    out.push({ templateRuleId: 'blankets', category: 'clothing', name: 'Blankets, warm layers, hand warmers', unit: 'blankets', quantityNeeded: people + 1, location: 'home-kit', why: '1 blanket per person plus an extra', guideId: 'stay-warm' });
  }
  if (scores.winter >= 40) {
    out.push({ templateRuleId: 'ice-melt', category: 'tools', name: 'Ice melt', unit: 'each', quantityNeeded: 1, location: 'home-kit', why: 'Winter storm risk' });
    out.push({ templateRuleId: 'shovel', category: 'tools', name: 'Snow shovel', unit: 'each', quantityNeeded: 1, location: 'home-kit', why: 'Winter storm risk', guideId: 'shoveling' });
  }
  if (scores.flood >= 70 || snap.household.hasBasement) {
    out.push({ templateRuleId: 'sandbags', category: 'tools', name: 'Sandbags or water-filled barriers', unit: 'each', quantityNeeded: 1, location: 'home-kit', why: snap.household.hasBasement ? 'Basement' : 'High flood risk', guideId: 'basements' });
    out.push({ templateRuleId: 'sump', category: 'tools', name: 'Sump pump battery backup check', unit: 'check', quantityNeeded: 1, location: 'home-kit', why: snap.household.hasBasement ? 'Basement' : 'High flood risk' });
  }
  const levels = snap.household.hasBasement ? 3 : 2;
  out.push({ templateRuleId: 'smoke-alarms', category: 'tools', name: 'Smoke alarms (tested)', unit: 'each', quantityNeeded: levels, location: 'home-kit', why: '1 per level; test monthly', guideId: 'smoke-alarms-deaf' });
  out.push({ templateRuleId: 'co-alarms', category: 'tools', name: 'Carbon monoxide alarms (tested)', unit: 'each', quantityNeeded: levels, location: 'home-kit', why: '1 per level', guideId: 'generator-safety' });
  out.push({ templateRuleId: 'extinguisher', category: 'tools', name: 'Fire extinguisher', unit: 'each', quantityNeeded: 1, location: 'home-kit', why: 'Every home', guideId: 'fire-escape-plan' });
  if (snap.household.hasGenerator) {
    out.push({ templateRuleId: 'gen-fuel', category: 'light-power', name: 'Generator fuel (stored safely outside the home)', unit: 'hours', quantityNeeded: snap.household.generatorFuelHours ?? 24, location: 'home-kit', why: 'Fuel for the hours you entered', guideId: 'generator-safety' });
  }
  out.push({ templateRuleId: 'radio', category: 'light-power', name: 'Battery or hand-crank NOAA Weather Radio', unit: 'each', quantityNeeded: 1, location: 'home-kit', why: 'Every household' });
  const holders = Math.max(1, snap.members.filter((m) => m.linkedUserId).length);
  out.push({ templateRuleId: 'power-banks', category: 'light-power', name: 'Phone power banks', unit: 'each', quantityNeeded: holders, location: 'go-bag', why: '1 per account holder' });
  out.push({ templateRuleId: 'documents', category: 'documents', name: 'IDs, insurance, medicine list, prescription copies in a waterproof pouch', unit: 'pouch', quantityNeeded: 1, location: 'go-bag', why: 'Every household' });
  if (scores.hazmat >= 40) {
    out.push({ templateRuleId: 'seal-room', category: 'tools', name: 'Plastic sheeting and duct tape', unit: 'roll each', quantityNeeded: 1, location: 'home-kit', why: 'Chemical risk nearby', guideId: 'seal-room' });
  }
  return out;
}

/**
 * Merges a freshly generated list into the stored one (§17.2): keeps the
 * user's have-counts, dates and notes; drops template items that no longer
 * apply; never touches manual items.
 */
export function mergeSupplies(existing: SupplyItem[], generated: SupplyTemplate[], ids: () => string, householdId: string, nowIso: string): { upsert: SupplyItem[]; remove: string[] } {
  const byRule = new Map(existing.filter((e) => e.isTemplateItem && e.templateRuleId).map((e) => [e.templateRuleId!, e]));
  const upsert: SupplyItem[] = [];
  for (const g of generated) {
    const prev = byRule.get(g.templateRuleId);
    const next: SupplyItem = {
      id: prev?.id ?? ids(),
      householdId,
      createdAt: prev?.createdAt ?? nowIso,
      updatedAt: nowIso,
      category: g.category,
      name: g.name,
      quantityNeeded: g.quantityNeeded,
      quantityHave: prev?.quantityHave ?? 0,
      unit: g.unit,
      location: g.location,
      expirationDate: prev?.expirationDate ?? null,
      isTemplateItem: true,
      templateRuleId: g.templateRuleId,
      linkedMemberId: g.linkedMemberId ?? null,
      linkedPetId: g.linkedPetId ?? null,
      lastCheckedDate: prev?.lastCheckedDate ?? null,
      locationNote: prev?.locationNote,
      tier: g.tier,
    };
    if (!prev || prev.name !== next.name || prev.quantityNeeded !== next.quantityNeeded || prev.tier !== next.tier || prev.linkedMemberId !== next.linkedMemberId) upsert.push(next);
  }
  const keep = new Set(generated.map((g) => g.templateRuleId));
  const remove = existing.filter((e) => e.isTemplateItem && e.templateRuleId && !keep.has(e.templateRuleId)).map((e) => e.id);
  return { upsert, remove };
}

export function whyFor(item: SupplyItem, generated: SupplyTemplate[]): string | null {
  return generated.find((g) => g.templateRuleId === item.templateRuleId)?.why ?? null;
}

/** Item status for the list: amber within 30 days of expiring, red if expired. */
export function expiryState(item: Pick<SupplyItem, 'expirationDate'>, now: Date): 'ok' | 'soon' | 'expired' | null {
  if (!item.expirationDate) return null;
  const exp = new Date(`${item.expirationDate}T23:59:59`).getTime();
  if (exp < now.getTime()) return 'expired';
  if (exp - now.getTime() <= 30 * 86_400_000) return 'soon';
  return 'ok';
}
