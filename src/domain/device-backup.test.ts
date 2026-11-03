import { deviceBackup } from './device-backup';

const noGen = { hasGenerator: false, generatorWatts: null, generatorFuelHours: null };

const base = {
  usesElectricity: true,
  hasInternalBattery: true,
  batteryRuntimeMinutes: 240,
  backupBatteryCount: 0,
  backupRuntimeMinutes: null,
  backupNonElectric: '',
  backupNonElectricMinutes: null,
  powerWatts: 300,
};

describe('deviceBackup (§11.3)', () => {
  it('uses the internal battery alone when that is all that is entered', () => {
    const r = deviceBackup(base, noGen);
    expect(r.totalMinutes).toBe(240);
    expect(r.stages.map((s) => s.kind)).toEqual(['internal']);
    expect(r.missing).toEqual([]);
  });

  it('adds spares, generator and non-electric backup in stage order', () => {
    const r = deviceBackup(
      {
        ...base,
        backupBatteryCount: 2,
        backupRuntimeMinutes: 60,
        backupNonElectric: '2 oxygen cylinders',
        backupNonElectricMinutes: 300,
      },
      { hasGenerator: true, generatorWatts: 3500, generatorFuelHours: 8 },
    );
    // 240 + 2·60 + 8·60 + 300
    expect(r.totalMinutes).toBe(240 + 120 + 480 + 300);
    expect(r.stages.map((s) => s.label)).toEqual([
      'Internal battery',
      'Spare battery 1 of 2',
      'Spare battery 2 of 2',
      'Generator',
      '2 oxygen cylinders',
    ]);
    expect(r.generatorCovers).toBe(true);
  });

  it('skips the generator when its watts do not cover the device', () => {
    const r = deviceBackup(
      { ...base, powerWatts: 1200 },
      { hasGenerator: true, generatorWatts: 1000, generatorFuelHours: 8 },
    );
    expect(r.generatorCovers).toBe(false);
    expect(r.totalMinutes).toBe(240);
  });

  it('never invents runtimes: missing values are reported, not defaulted', () => {
    const r = deviceBackup(
      { ...base, batteryRuntimeMinutes: null, backupBatteryCount: 2, backupRuntimeMinutes: null, powerWatts: null },
      { hasGenerator: true, generatorWatts: null, generatorFuelHours: null },
    );
    expect(r.totalMinutes).toBe(0);
    expect(r.missing).toEqual(['internal-runtime', 'spare-runtime', 'generator-watts', 'device-watts']);
    expect(r.generatorCovers).toBeNull();
  });

  it('flags missing generator fuel when the generator covers the device', () => {
    const r = deviceBackup(base, { hasGenerator: true, generatorWatts: 2000, generatorFuelHours: null });
    expect(r.generatorCovers).toBe(true);
    expect(r.missing).toEqual(['generator-fuel']);
  });

  it('ignores zero, negative and non-finite values', () => {
    const r = deviceBackup(
      { ...base, batteryRuntimeMinutes: -5, backupNonElectricMinutes: Number.NaN },
      noGen,
    );
    expect(r.totalMinutes).toBe(0);
    expect(r.missing).toEqual(['internal-runtime']);
  });
});
