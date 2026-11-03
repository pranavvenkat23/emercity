import type { Device, Household } from '@/models/types';

/**
 * §11.3 total backup time for a medical device:
 *
 *   T_backup = T_internal + n_spare · T_spare + T_generator + T_nonelectric
 *
 * Every term is a runtime the user entered, Emercity never supplies a
 * default battery runtime. The generator term applies only when the
 * household generator's watts cover the device's watts (§7.7). Unknown
 * terms are reported so the UI can say the total is incomplete instead of
 * presenting a partial sum as the whole story.
 */
export interface BackupStage {
  kind: 'internal' | 'spare' | 'generator' | 'non-electric';
  label: string;
  minutes: number;
}

export interface BackupResult {
  /** Sum of known stages, in minutes. */
  totalMinutes: number;
  stages: BackupStage[];
  /** Fields the user still needs to fill in for an honest total. */
  missing: ('internal-runtime' | 'spare-runtime' | 'generator-watts' | 'device-watts' | 'generator-fuel')[];
  generatorCovers: boolean | null;
}

export function deviceBackup(
  device: Pick<
    Device,
    | 'usesElectricity'
    | 'hasInternalBattery'
    | 'batteryRuntimeMinutes'
    | 'backupBatteryCount'
    | 'backupRuntimeMinutes'
    | 'backupNonElectric'
    | 'backupNonElectricMinutes'
    | 'powerWatts'
  >,
  household: Pick<Household, 'hasGenerator' | 'generatorWatts' | 'generatorFuelHours'>,
): BackupResult {
  const stages: BackupStage[] = [];
  const missing: BackupResult['missing'] = [];

  if (device.hasInternalBattery) {
    if (isPositive(device.batteryRuntimeMinutes)) {
      stages.push({ kind: 'internal', label: 'Internal battery', minutes: device.batteryRuntimeMinutes });
    } else {
      missing.push('internal-runtime');
    }
  }

  const spares = device.backupBatteryCount ?? 0;
  if (spares > 0) {
    if (isPositive(device.backupRuntimeMinutes)) {
      for (let i = 1; i <= spares; i++) {
        stages.push({ kind: 'spare', label: `Spare battery ${i} of ${spares}`, minutes: device.backupRuntimeMinutes });
      }
    } else {
      missing.push('spare-runtime');
    }
  }

  let generatorCovers: boolean | null = null;
  if (device.usesElectricity && household.hasGenerator) {
    if (!isPositive(household.generatorWatts)) missing.push('generator-watts');
    if (!isPositive(device.powerWatts)) missing.push('device-watts');
    if (isPositive(household.generatorWatts) && isPositive(device.powerWatts)) {
      generatorCovers = household.generatorWatts >= device.powerWatts;
      if (generatorCovers) {
        if (isPositive(household.generatorFuelHours)) {
          stages.push({ kind: 'generator', label: 'Generator', minutes: household.generatorFuelHours * 60 });
        } else {
          missing.push('generator-fuel');
        }
      }
    }
  }

  if (isPositive(device.backupNonElectricMinutes)) {
    stages.push({
      kind: 'non-electric',
      label: device.backupNonElectric?.trim() || 'Non-electric backup',
      minutes: device.backupNonElectricMinutes,
    });
  }

  return {
    totalMinutes: stages.reduce((sum, s) => sum + s.minutes, 0),
    stages,
    missing,
    generatorCovers,
  };
}

function isPositive(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}
