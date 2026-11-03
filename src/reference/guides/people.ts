import type { Guide } from './types';

const READY_KIDS = { name: 'Ready.gov: Kids', url: 'https://www.ready.gov/kids' };
const READY_OLDER = { name: 'Ready.gov: Older Adults', url: 'https://www.ready.gov/older-adults' };
const READY_DISABILITY = { name: 'Ready.gov: People with Disabilities', url: 'https://www.ready.gov/disability' };
const READY_PETS = { name: 'Ready.gov: Pets', url: 'https://www.ready.gov/pets' };
const REDCROSS_PETS = { name: 'American Red Cross: Pet Disaster Preparedness', url: 'https://www.redcross.org/get-help/how-to-prepare-for-emergencies/pet-disaster-preparedness.html' };
const READY_OUTAGE = { name: 'Ready.gov: Power Outages', url: 'https://www.ready.gov/power-outages' };
const FDA_INSULIN = {
  name: 'FDA: Insulin storage in an emergency',
  url: 'https://www.fda.gov/drugs/emergency-preparedness-drugs/information-regarding-insulin-storage-and-switching-between-products-emergency',
};
const DISASTER_ASSIST = { name: 'DisasterAssistance.gov', url: 'https://www.disasterassistance.gov/' };
const FOODSAFETY = { name: 'USDA FSIS: Keep your food safe during emergencies', url: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/emergencies/keep-your-food-safe-during-emergencies' };

export const PEOPLE_GUIDES: Guide[] = [
  {
    id: 'babies',
    title: 'Babies and toddlers in emergencies',
    hazards: [],
    topics: ['Kids'],
    readMinutes: 2,
    doNow: ['Pack formula, diapers, and wipes in the go-bag.', 'Keep ready-to-feed formula on hand.', 'Keep babies warm and dry.', 'Assign an adult to carry each baby.'],
    sections: [
      {
        heading: 'Formula',
        body: 'Ready-to-feed formula doesn’t need water or heating, which helps when power or safe water is out. Use bottled or boiled water for powder.',
      },
      {
        heading: 'Cold and heat',
        body: 'Babies lose heat fast and can’t tell you they’re cold. Check their skin and energy often.',
      },
    ],
    sources: [READY_KIDS],
    match: { infants: true, conditions: ['infant-formula'] },
  },
  {
    id: 'older-adults',
    title: 'Older adults',
    hazards: [],
    topics: ['Older adults'],
    readMinutes: 2,
    doNow: ['Keep a list of medicines and doctors.', 'Keep 7+ days of critical medicines.', 'Plan who will check on them.', 'Keep a flashlight by the bed.'],
    sections: [
      {
        heading: 'A support network',
        body: 'Ask family, friends, or neighbors to check on older adults during emergencies. Share your plan with them.',
      },
    ],
    sources: [READY_OLDER],
    match: { olderAdults: true },
  },
  {
    id: 'dementia',
    title: 'Dementia and emergencies',
    hazards: [],
    topics: ['Older adults', 'Disabilities'],
    readMinutes: 2,
    doNow: ['Stay calm and speak simply.', 'Keep them with a familiar person.', 'Watch that they don’t go back inside or wander.', 'Bring comfort items and medicines.'],
    sections: [
      {
        heading: 'Changes cause confusion',
        body: 'Darkness, noise, and new places can be upsetting. Give one simple direction at a time and keep routines where you can.',
      },
    ],
    sources: [READY_DISABILITY],
    match: { conditions: ['cognitive-dementia'] },
  },
  {
    id: 'autism',
    title: 'Autism and sensory needs',
    hazards: [],
    topics: ['Kids', 'Disabilities'],
    readMinutes: 2,
    doNow: ['Pack noise-reducing headphones and comfort items.', 'Use simple words or pictures.', 'Practice drills so the steps feel familiar.', 'Keep them with a trusted person.'],
    sections: [
      {
        heading: 'Practice helps',
        body: 'Practicing your plan makes a real emergency less surprising. Emercity’s drills can help.',
      },
    ],
    sources: [READY_DISABILITY],
    match: { conditions: ['cognitive-autism'] },
  },
  {
    id: 'mobility',
    title: 'Wheelchair and mobility users',
    hazards: [],
    topics: ['Disabilities'],
    readMinutes: 2,
    doNow: ['Plan a route out without stairs if you can.', 'Assign a helper for each person who needs one.', 'Keep a manual backup if you use a power wheelchair.', 'Charge mobility devices every night.'],
    sections: [
      {
        heading: 'Elevators may stop',
        body: 'In an outage or fire, elevators may not work. If you live above the ground floor, plan how you would get out.',
      },
    ],
    sources: [READY_DISABILITY],
    match: { conditions: ['mobility-wheelchair', 'mobility-walker', 'bedbound'] },
  },
  {
    id: 'pregnancy',
    title: 'Pregnancy',
    hazards: [],
    topics: [],
    readMinutes: 1,
    doNow: ['Keep prenatal records and medicines in the go-bag.', 'Drink water and rest.', 'Know the nearest hospital with a maternity unit.', 'Call 911 for bleeding, severe pain, or early labor.'],
    sections: [
      {
        heading: 'Heat, smoke, and chemicals',
        body: 'Pregnant people are more sensitive to heat, smoke, and chemicals in the air. Get to a safe place early.',
      },
    ],
    sources: [READY_KIDS],
    match: { conditions: ['pregnancy'] },
  },
  {
    id: 'pets-evacuation',
    title: 'Pets in evacuations',
    hazards: [],
    topics: ['Pets'],
    readMinutes: 2,
    doNow: ['Take your pets with you.', 'Use a carrier or leash for each pet.', 'Bring food, water, medicine, and vaccination records.', 'Keep a current photo of each pet.'],
    sections: [
      {
        heading: 'Never leave pets behind',
        body: 'If it isn’t safe for you, it isn’t safe for your pets. Leave early so you have time to bring them.',
      },
    ],
    sources: [READY_PETS, REDCROSS_PETS],
    match: { pets: true },
  },
  {
    id: 'pet-shelters',
    title: 'Pet-friendly shelters',
    hazards: [],
    topics: ['Pets'],
    readMinutes: 1,
    doNow: ['Check which shelters accept pets before you go.', 'Bring vaccination records.', 'Bring a carrier for each pet.', 'Ask friends or hotels outside the area about pets.'],
    sections: [
      {
        heading: 'Service animals',
        body: 'Service animals are allowed in public shelters. Many shelters also accept pets, but check official updates first.',
      },
    ],
    sources: [READY_PETS],
    match: { pets: true },
  },
  {
    id: 'pet-first-aid',
    title: 'Pet first aid basics',
    hazards: [],
    topics: ['Pets'],
    readMinutes: 1,
    doNow: ['Keep your vet’s number handy.', 'Pack a pet first aid kit.', 'Keep pets calm and contained.', 'Call your vet or an emergency vet for injuries.'],
    sections: [
      {
        heading: 'Stressed animals',
        body: 'Scared or hurt pets may bite or hide. Approach slowly and keep them in a carrier or on a leash.',
      },
    ],
    sources: [REDCROSS_PETS],
    match: { pets: true },
  },
  {
    id: 'power-back',
    title: 'Power’s back: what to check',
    hazards: ['outage', 'winter', 'hurricane'],
    topics: ['After the emergency'],
    readMinutes: 2,
    doNow: ['Check medicines that needed the fridge.', 'Check food temperatures; when in doubt, throw it out.', 'Recharge device batteries now.', 'Unplug and replug electronics slowly.'],
    sections: [
      {
        heading: 'Medicines',
        body: 'If a refrigerated medicine may have gotten too warm or frozen, call your pharmacist before using it. Check insulin for clumps, frost, or color changes.',
      },
    ],
    sources: [READY_OUTAGE, FDA_INSULIN, FOODSAFETY],
  },
  {
    id: 'meds-after',
    title: 'Medications after an emergency',
    hazards: [],
    topics: ['Medications', 'After the emergency'],
    readMinutes: 1,
    doNow: ['Replace medicines that got wet, too hot, or frozen.', 'Ask your pharmacist about emergency refills.', 'Update your medicine list.', 'Restock your go-bag.'],
    sections: [
      {
        heading: 'Emergency refills',
        body: 'Pharmacies may be able to give an emergency supply during declared disasters. Call your pharmacy or doctor.',
      },
    ],
    sources: [FDA_INSULIN],
  },
  {
    id: 'getting-help',
    title: 'Getting help and recovery resources',
    hazards: [],
    topics: ['After the emergency'],
    readMinutes: 1,
    doNow: ['Call 911 for emergencies.', 'Call 211 for local help with food, shelter, and services.', 'Apply for disaster aid at DisasterAssistance.gov.', 'Take photos of damage for insurance.'],
    sections: [
      {
        heading: 'After a declared disaster',
        body: 'Federal and local programs may help with housing, repairs, and other needs after a major disaster.',
      },
    ],
    sources: [DISASTER_ASSIST],
  },
];
