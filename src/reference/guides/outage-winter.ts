import type { Guide } from './types';

const READY_OUTAGE = { name: 'Ready.gov: Power Outages', url: 'https://www.ready.gov/power-outages' };
const READY_WINTER = { name: 'Ready.gov: Winter Weather', url: 'https://www.ready.gov/winter-weather' };
const FDA_INSULIN = {
  name: 'FDA: Insulin storage in an emergency',
  url: 'https://www.fda.gov/drugs/emergency-preparedness-drugs/information-regarding-insulin-storage-and-switching-between-products-emergency',
};
const FOODSAFETY = { name: 'USDA FSIS: Keep your food safe during emergencies', url: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/emergencies/keep-your-food-safe-during-emergencies' };
const CDC_CO = { name: 'CDC: Carbon monoxide poisoning basics', url: 'https://www.cdc.gov/carbon-monoxide/about/index.html' };
const CDC_COLD = { name: 'CDC: Preventing hypothermia', url: 'https://www.cdc.gov/winter-weather/prevention/index.html' };
const CDC_HEAT = { name: 'CDC: Symptoms of heat-related illnesses', url: 'https://www.cdc.gov/extreme-heat/signs-symptoms/index.html' };

export const OUTAGE_WINTER_GUIDES: Guide[] = [
  {
    id: 'insulin-outage',
    title: 'Keep insulin and refrigerated meds safe',
    hazards: ['outage', 'winter', 'hurricane'],
    topics: ['Medications'],
    readMinutes: 2,
    doNow: [
      'Keep the fridge closed.',
      'Move insulin to a cooler before the 4-hour mark. Never put it directly on ice.',
      'Check the safe time on your medicine’s label.',
      'Call your pharmacist if it got too warm or froze.',
    ],
    sections: [
      {
        heading: 'How long insulin lasts without a fridge',
        body: 'FDA says insulin in its original vial or cartridge may be kept unrefrigerated between 59°F and 86°F for up to 28 days, opened or not. Some products last longer or shorter. Emercity shows the limit for your product when it has one on file.',
      },
      {
        heading: 'Using a cooler',
        body: 'Wrap insulin in a towel or put it in a bag before it goes in a cooler. Keep it cold but not frozen. A thermometer in the cooler helps you check.',
        callout: { tier: 'urgent', text: 'Never let insulin touch ice directly. Do not use insulin that has frozen.' },
      },
      {
        heading: 'When power comes back',
        body: 'Look for clumps, frost, crystals, or color changes. If the insulin got too warm or froze, or you are not sure, call your pharmacist before using it. Under emergency conditions you may still need to use insulin stored above 86°F; ask a pharmacist or doctor.',
      },
      {
        heading: 'Insulin pumps',
        body: 'FDA says to throw out insulin in a pump that was exposed to temperatures above 98.6°F.',
      },
    ],
    sources: [FDA_INSULIN],
    match: { conditions: ['diabetes-insulin'] },
  },
  {
    id: 'devices-outage',
    title: 'Oxygen and other medical devices in an outage',
    hazards: ['outage', 'winter', 'hurricane'],
    topics: ['Medical devices'],
    readMinutes: 3,
    doNow: [
      'Check how much battery is left.',
      'Switch to backup before the battery runs out.',
      'Call your medical equipment supplier.',
      'Call 911 if you have under 30 minutes of backup and no other source.',
    ],
    sections: [
      {
        heading: 'Know your backup time',
        body: 'Add up your device’s internal battery, spare batteries, generator time, and any non-electric backup like oxygen cylinders. Emercity counts this down for you, but it only knows the numbers you entered. Check them against your device manual or supplier.',
      },
      {
        heading: 'Line up more power or a place to go',
        body: 'Options include a generator run safely outside, a neighbor with power, your equipment supplier, a public place with power, or a hospital as a last resort. Decide this early, while you still have backup time.',
        callout: { tier: 'critical', text: 'If the device keeps someone alive and backup is almost gone, call 911.' },
      },
      {
        heading: 'Tell your utility',
        body: 'Some utilities keep a list of customers who use medical equipment. Being on the list does not mean power comes back faster, so you still need a backup plan.',
      },
    ],
    sources: [READY_OUTAGE],
    match: { devices: ['oxygen-concentrator', 'home-ventilator', 'cpap-bipap', 'feeding-pump', 'home-dialysis', 'suction-machine', 'iv-infusion-pump', 'nebulizer'] },
  },
  {
    id: 'food-outage',
    title: 'Food safety when the power is out',
    hazards: ['outage', 'winter', 'hurricane', 'flood'],
    topics: ['Food and water'],
    readMinutes: 2,
    doNow: ['Keep the fridge and freezer closed.', 'Note when the power went out.', 'Use a thermometer to check food.', 'When in doubt, throw it out.'],
    sections: [
      {
        heading: 'How long food stays safe',
        body: 'A closed fridge keeps food safe for about 4 hours. A full freezer holds about 48 hours, and a half-full freezer about 24 hours, if the door stays closed.',
      },
      {
        heading: 'What to throw out',
        body: 'Throw out meat, poultry, fish, eggs, milk, and leftovers that were above 40°F for 2 hours or more. Never taste food to check if it is safe.',
        callout: { tier: 'important', text: 'When in doubt, throw it out.' },
      },
    ],
    sources: [FOODSAFETY],
  },
  {
    id: 'generator-safety',
    title: 'Using a generator safely',
    hazards: ['outage', 'winter', 'hurricane'],
    topics: ['Generators and safety'],
    readMinutes: 2,
    doNow: [
      'Run it outside, at least 20 ft from windows and doors.',
      'Never run it indoors or in a garage.',
      'Use a battery carbon monoxide alarm.',
      'Get fresh air and call 911 if anyone feels sick or dizzy.',
    ],
    sections: [
      {
        heading: 'Carbon monoxide',
        body: 'Generators, grills, and camp stoves make carbon monoxide, a gas you can’t see or smell. It can kill in minutes. Even an open garage door does not make it safe.',
        callout: { tier: 'critical', text: 'Never use a generator, grill, or camp stove indoors or in a garage.' },
      },
      {
        heading: 'Plugging in',
        body: 'Plug devices into the generator with heavy-duty outdoor extension cords. Do not plug a generator into a wall outlet; it can hurt utility workers and neighbors.',
      },
    ],
    sources: [CDC_CO, READY_OUTAGE],
  },
  {
    id: 'stay-warm',
    title: 'Staying warm without power',
    hazards: ['outage', 'winter'],
    topics: ['Older adults', 'Kids'],
    readMinutes: 2,
    doNow: ['Gather everyone in one room and close the doors.', 'Layer clothing and use blankets.', 'Watch babies and older adults for cold signs.', 'Never heat your home with an oven or stove.'],
    sections: [
      {
        heading: 'Signs of hypothermia',
        body: 'Shivering, tiredness, confusion, fumbling hands, slurred speech, and sleepiness. Babies may have bright red, cold skin and very low energy. Call 911 if body temperature is below 95°F or someone is very confused.',
        callout: { tier: 'critical', text: 'Very cold with no heat is dangerous for babies and older adults. Get them warm first.' },
      },
      {
        heading: 'Warming centers',
        body: 'Your county may open warming centers. Check official updates before you go, and bring medicines and chargers.',
      },
    ],
    sources: [CDC_COLD, READY_WINTER],
    match: { infants: true, olderAdults: true, conditions: ['temperature-sensitive'] },
  },
  {
    id: 'stay-cool',
    title: 'Staying cool without power',
    hazards: ['outage', 'hurricane'],
    topics: ['Older adults', 'Kids'],
    readMinutes: 2,
    doNow: ['Drink water often.', 'Stay in the coolest room, out of the sun.', 'Use cool cloths or a cool shower.', 'Go to a cooling center if it gets too hot.'],
    sections: [
      {
        heading: 'Signs of heat illness',
        body: 'Heavy sweating, cold clammy skin, nausea, and dizziness can mean heat exhaustion. Hot red skin, confusion, or passing out can mean heat stroke.',
        callout: { tier: 'critical', text: 'Heat stroke is an emergency. Call 911, move the person somewhere cooler, and cool them with cool cloths. Do not give them anything to drink.' },
      },
    ],
    sources: [CDC_HEAT],
    match: { infants: true, olderAdults: true, conditions: ['pregnancy', 'temperature-sensitive'] },
  },
  {
    id: 'before-winter-storm',
    title: 'Before a winter storm',
    hazards: ['winter'],
    topics: [],
    readMinutes: 2,
    doNow: ['Charge phones and power banks.', 'Fill water containers in case pipes freeze.', 'Get 7+ days of critical medicines.', 'Gather blankets and warm clothes in one room.'],
    sections: [
      {
        heading: 'Stay off the roads',
        body: 'Most winter storm injuries happen in cars. Stay home if you can, and keep a winter kit in your car if you must drive.',
      },
      {
        heading: 'Plan for an outage',
        body: 'Winter storms often cut power. Make sure medical device batteries are charged and you know how long they last.',
      },
    ],
    sources: [READY_WINTER],
  },
  {
    id: 'frozen-pipes',
    title: 'Frozen pipes',
    hazards: ['winter'],
    topics: [],
    readMinutes: 1,
    doNow: ['Let cold water drip from faucets.', 'Open cabinet doors under sinks.', 'Know where your main water shutoff is.', 'Never thaw pipes with an open flame.'],
    sections: [
      {
        heading: 'If a pipe freezes',
        body: 'Keep the faucet open. Warm the pipe with a hair dryer or warm towels. If a pipe bursts, shut off the main water valve.',
      },
    ],
    sources: [READY_WINTER],
  },
  {
    id: 'winter-driving',
    title: 'Driving in snow (and when not to)',
    hazards: ['winter'],
    topics: [],
    readMinutes: 1,
    doNow: ['Stay home when roads are bad.', 'Keep a winter kit in the car.', 'Tell someone your route.', 'If stuck, stay with the car.'],
    sections: [
      {
        heading: 'If you get stuck',
        body: 'Stay in the car. Run the engine about 10 minutes each hour for heat, and keep the tailpipe clear of snow so exhaust doesn’t build up inside.',
        callout: { tier: 'critical', text: 'A blocked tailpipe can fill the car with carbon monoxide.' },
      },
    ],
    sources: [READY_WINTER],
  },
  {
    id: 'shoveling',
    title: 'Shoveling and heart safety',
    hazards: ['winter'],
    topics: ['Older adults'],
    readMinutes: 1,
    doNow: ['Take breaks often.', 'Push snow instead of lifting it.', 'Stop if you feel chest pain or short of breath.', 'Call 911 for chest pain.'],
    sections: [
      {
        heading: 'Why shoveling is risky',
        body: 'Shoveling heavy snow in the cold strains the heart. People with heart conditions should ask someone else to shovel.',
        callout: { tier: 'critical', text: 'Chest pain while shoveling can be a heart attack. Call 911.' },
      },
    ],
    sources: [CDC_COLD],
    match: { conditions: ['heart-condition'] },
  },
];
