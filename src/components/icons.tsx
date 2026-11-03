import {
  Baby,
  Drop,
  Ear,
  EyeSlash,
  Flame,
  Heart,
  Hurricane,
  LightningSlash,
  Person,
  Pill,
  Plug,
  Snowflake,
  Syringe,
  Thermometer,
  Translate,
  Waves,
  Wheelchair,
  Wind,
  WarningDiamond,
  Brain,
  PersonSimpleWalk,
  Bed,
  type Icon,
} from 'phosphor-react-native';

import type { ConditionType, Hazard } from '@/models/types';

/**
 * One consistent icon set (Phosphor, §2.6). Each hazard has one fixed icon:
 * water waves (flood), snowflake (winter), lightning bolt with slash
 * (outage), flame (fire), hazard diamond (hazmat), spiral (hurricane).
 */
export const HAZARD_ICON: Record<Hazard, Icon> = {
  flood: Waves,
  winter: Snowflake,
  outage: LightningSlash,
  fire: Flame,
  hazmat: WarningDiamond,
  hurricane: Hurricane,
};

/** Small condition glyphs for member cards (§7.1: up to three). */
export const CONDITION_ICON: Partial<Record<ConditionType, Icon>> = {
  'oxygen-dependent': Wind,
  ventilator: Wind,
  'diabetes-insulin': Syringe,
  'diabetes-oral': Pill,
  'mobility-wheelchair': Wheelchair,
  'mobility-walker': PersonSimpleWalk,
  bedbound: Bed,
  'hearing-loss': Ear,
  'vision-loss': EyeSlash,
  'cognitive-dementia': Brain,
  'cognitive-autism': Brain,
  'cognitive-intellectual': Brain,
  'heart-condition': Heart,
  'dialysis-home': Drop,
  'dialysis-center': Drop,
  'infant-formula': Baby,
  'temperature-sensitive': Thermometer,
  'limited-english': Translate,
  'severe-allergy-epipen': Syringe,
  pregnancy: Person,
};

export const CONDITION_LABEL: Record<ConditionType, string> = {
  'mobility-wheelchair': 'Wheelchair',
  'mobility-walker': 'Walker/cane',
  bedbound: 'Bedbound',
  'hearing-loss': 'Hard of hearing / Deaf',
  'vision-loss': 'Low vision / Blind',
  'cognitive-dementia': 'Dementia/memory loss',
  'cognitive-autism': 'Autism / sensory needs',
  'cognitive-intellectual': 'Intellectual disability',
  pregnancy: 'Pregnant',
  'infant-formula': 'Uses formula',
  'diabetes-insulin': 'Insulin',
  'diabetes-oral': 'Other diabetes meds',
  'dialysis-home': 'Home dialysis',
  'dialysis-center': 'Dialysis at a center',
  'oxygen-dependent': 'Oxygen',
  ventilator: 'Ventilator',
  'seizure-disorder': 'Seizures',
  'severe-allergy-epipen': 'Severe allergy (EpiPen)',
  'heart-condition': 'Heart condition',
  'respiratory-asthma': 'Asthma/COPD',
  'respiratory-copd': 'COPD',
  'temperature-sensitive': 'Heat or cold sensitive',
  'mental-health': 'Mental health',
  'limited-english': "Doesn't speak English well",
  'cannot-swim': "Can't swim",
  'critical-daily-meds': 'Takes daily critical meds',
  other: 'Other',
};

export { Plug, Pill };
