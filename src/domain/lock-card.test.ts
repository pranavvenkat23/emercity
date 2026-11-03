import { buildDemoHousehold, DEMO_IDS } from '@/data/demo-household';
import { FIXTURE_NOW } from '@/test-utils/household-builder';

import { buildCardContent, contentKey, criticalLines, DEFAULT_BLOCKS, maskChip, needPhrases } from './lock-card';
import { topTierAcrossHazards } from './priority/engine';

describe('lock-screen card (§14)', () => {
  const demo = buildDemoHousehold();
  const tiers = topTierAcrossHazards(demo, { now: FIXTURE_NOW });
  const mom = demo.members.find((m) => m.id === DEMO_IDS.mom)!;

  it('keeps sensitive blocks off by default', () => {
    expect(DEFAULT_BLOCKS.myMedical).toBe(false);
    expect(DEFAULT_BLOCKS.address).toBe(false);
    expect(DEFAULT_BLOCKS.qr).toBe(true);
  });

  it('describes needs in short phrases', () => {
    const gma = demo.members.find((m) => m.id === DEMO_IDS.grandma)!;
    expect(needPhrases(gma)).toEqual(['oxygen 24/7']);
  });

  it('lists the top Critical members, with age for older adults', () => {
    const { lines } = criticalLines(demo, tiers, FIXTURE_NOW);
    expect(lines[0].text).toBe('Grandma (82): oxygen 24/7');
    expect(lines.length).toBeLessThanOrEqual(3);
  });

  it('masks microchip numbers', () => {
    expect(maskChip('985000000012345')).toBe('…2345');
    expect(maskChip(undefined)).toBeNull();
  });

  it('builds a plain-text QR summary with meeting point, contacts and critical needs', () => {
    const c = buildCardContent(demo, mom, tiers, FIXTURE_NOW);
    expect(c.qrText.startsWith('EMERCITY HOUSEHOLD · Meet: The mailbox')).toBe(true);
    expect(c.qrText).toContain('Uncle Mike (out of area) 404-555-0199');
    expect(c.qrText).toContain('Grandma: oxygen 24/7');
    expect(c.qrText).not.toMatch(/http/);
  });

  it('changes its content key when a contact changes (§14.5 out of date)', () => {
    const a = contentKey(buildCardContent(demo, mom, tiers, FIXTURE_NOW));
    const changed = structuredClone(demo);
    changed.contacts[0].phone = '703-555-0199';
    expect(contentKey(buildCardContent(changed, mom, tiers, FIXTURE_NOW))).not.toBe(a);
  });
});

describe('pet line', () => {
  it('names the species once', () => {
    const demo = buildDemoHousehold();
    expect(buildCardContent(demo, demo.members.find((m) => m.id === DEMO_IDS.dad)!, new Map(), FIXTURE_NOW).pets[0]).toMatch(/^Biscuit \(dog\)/);
    const placeholder = { ...demo, pets: [{ ...demo.pets[0], name: 'Dog 1', microchipId: undefined }] };
    expect(buildCardContent(placeholder, demo.members.find((m) => m.id === DEMO_IDS.dad)!, new Map(), FIXTURE_NOW).pets).toEqual(['Dog 1']);
  });
});
