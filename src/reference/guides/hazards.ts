import type { Guide } from './types';

const READY_FLOOD = { name: 'Ready.gov: Floods', url: 'https://www.ready.gov/floods' };
const NWS_TADD = { name: 'NWS: Turn Around Don’t Drown', url: 'https://www.weather.gov/safety/flood-turn-around-dont-drown' };
const READY_FIRE = { name: 'Ready.gov: Home Fires', url: 'https://www.ready.gov/home-fires' };
const NFPA_ALARMS = { name: 'NFPA: Smoke alarms', url: 'https://www.nfpa.org/education-and-research/home-fire-safety/smoke-alarms' };
const NFPA_ESCAPE = { name: 'NFPA: Escape planning', url: 'https://www.nfpa.org/education-and-research/home-fire-safety/escape-planning' };
const NFPA_OXYGEN = { name: 'NFPA: Smoking and home fire safety (medical oxygen)', url: 'https://www.nfpa.org/downloadable-resources/safety-tip-sheets/smoking-home-fire-safety' };
const READY_CHEM = { name: 'Ready.gov: Chemical Emergencies', url: 'https://www.ready.gov/chemical' };
const READY_HURRICANE = { name: 'Ready.gov: Hurricanes', url: 'https://www.ready.gov/hurricanes' };
const READY_TORNADO = { name: 'Ready.gov: Tornadoes', url: 'https://www.ready.gov/tornadoes' };

export const HAZARD_GUIDES: Guide[] = [
  // ───── Flood ─────
  {
    id: 'turn-around',
    title: 'Turn around, don’t drown',
    hazards: ['flood', 'hurricane'],
    topics: [],
    readMinutes: 1,
    doNow: ['Never drive or walk through floodwater.', 'Turn around and find another way.', 'Get to higher ground if water is rising.', 'Call 911 if anyone is trapped.'],
    sections: [
      {
        heading: 'Why water is so dangerous',
        body: 'Just 6 inches of fast-moving water can knock you down. One foot of moving water can sweep a vehicle away. You can’t see if the road under the water is gone.',
        callout: { tier: 'critical', text: 'Never drive through floodwater. Turn around, don’t drown.' },
      },
    ],
    sources: [NWS_TADD],
  },
  {
    id: 'flash-floods',
    title: 'Flash floods near creeks',
    hazards: ['flood'],
    topics: [],
    readMinutes: 2,
    doNow: ['If water is rising around your home, get to higher ground now.', 'Do not wait for instructions.', 'Grab the go-bag and critical meds.', 'Stay away from creeks and storm drains.'],
    sections: [
      {
        heading: 'Flash floods move fast',
        body: 'Small creeks can rise in minutes during heavy rain. River gauges measure the stream, not your street, so small creeks and storm drains can flood faster than gauges show.',
      },
      {
        heading: 'Watches and warnings',
        body: 'A Flash Flood Watch means flooding is possible. A Flash Flood Warning means it is happening or about to happen. Act right away on a warning.',
      },
    ],
    sources: [READY_FLOOD],
  },
  {
    id: 'basements',
    title: 'Basements and flooding',
    hazards: ['flood'],
    topics: [],
    readMinutes: 1,
    doNow: ['Get everyone out of the basement.', 'Move to a higher floor.', 'Do not go into a flooded basement.', 'Turn off power only if you are not standing in water.'],
    sections: [
      {
        heading: 'Electric shock risk',
        body: 'Water in a basement can touch outlets and appliances. Never step into a flooded basement unless the power has been turned off by a professional.',
        callout: { tier: 'critical', text: 'Do not enter a flooded basement while the power is on.' },
      },
    ],
    sources: [READY_FLOOD],
  },
  {
    id: 'after-flood',
    title: 'After a flood: what’s safe',
    hazards: ['flood', 'hurricane'],
    topics: ['After the emergency'],
    readMinutes: 2,
    doNow: ['Stay out of floodwater.', 'Throw out food that touched floodwater.', 'Wash hands with clean water.', 'Return home only when officials say it’s safe.'],
    sections: [
      {
        heading: 'Hidden hazards',
        body: 'Floodwater can hide sharp objects, carry sewage and chemicals, and be electrified by downed lines.',
      },
      {
        heading: 'Cleaning up',
        body: 'Wear boots and gloves. Dry the home quickly to limit mold. Throw out medicines that got wet.',
      },
    ],
    sources: [READY_FLOOD],
  },
  // ───── Fire ─────
  {
    id: 'fire-escape-plan',
    title: 'Make a fire escape plan',
    hazards: ['fire'],
    topics: ['Kids'],
    readMinutes: 2,
    doNow: ['Get out, stay out. Call 911 from outside.', 'Know two ways out of every room.', 'Pick a meeting spot outside.', 'Practice your plan.'],
    sections: [
      {
        heading: 'During a fire',
        body: 'Crawl low under smoke. Feel doors with the back of your hand before opening; if hot, use another way out. Close doors behind you to slow the fire.',
        callout: { tier: 'critical', text: 'Never go back inside, even for pets. Tell firefighters who is missing.' },
      },
      {
        heading: 'Practice',
        body: 'Practice your escape plan with everyone in your home. Make sure people who need help have a helper assigned.',
      },
    ],
    sources: [NFPA_ESCAPE, READY_FIRE],
  },
  {
    id: 'smoke-alarms-deaf',
    title: 'Smoke alarms and Deaf/hard-of-hearing members',
    hazards: ['fire'],
    topics: ['Disabilities'],
    readMinutes: 2,
    doNow: ['Test smoke alarms every month.', 'Put alarms on every level and near bedrooms.', 'Use alarms with strobe lights or bed shakers.', 'Wake anyone who may not hear the alarm.'],
    sections: [
      {
        heading: 'Alarms for people who can’t hear them',
        body: 'Alarms with strobe lights and bed or pillow shakers can wake people who are Deaf or hard of hearing. Ask your local fire department about programs that help.',
      },
    ],
    sources: [NFPA_ALARMS],
    match: { conditions: ['hearing-loss'] },
  },
  {
    id: 'oxygen-fire',
    title: 'Home oxygen and fire safety',
    hazards: ['fire'],
    topics: ['Medical devices'],
    readMinutes: 2,
    doNow: ['Shut off oxygen if safe, then get out.', 'Never smoke where oxygen is used.', 'Keep oxygen away from flames and heat.', 'Post “No smoking” signs.'],
    sections: [
      {
        heading: 'Why oxygen raises fire risk',
        body: 'Oxygen makes fire start more easily and burn hotter and faster. Keep oxygen cylinders at least 5 feet from heat, open flames, and electrical devices. Never use candles where oxygen is used.',
        callout: { tier: 'critical', text: 'No smoking anywhere oxygen is in use.' },
      },
    ],
    sources: [NFPA_OXYGEN],
    match: { conditions: ['oxygen-dependent'], devices: ['oxygen-concentrator'] },
  },
  {
    id: 'kids-pets-fire',
    title: 'Getting kids and pets out',
    hazards: ['fire'],
    topics: ['Kids', 'Pets'],
    readMinutes: 1,
    doNow: ['Assign an adult to each baby or young child.', 'Teach kids to get out and go to the meeting spot.', 'Keep pet carriers near an exit.', 'Never go back inside for a pet.'],
    sections: [
      {
        heading: 'Kids hide',
        body: 'Young children may hide under beds or in closets. Practice so they know to get out and go to the meeting spot.',
      },
    ],
    sources: [NFPA_ESCAPE],
    match: { children: true, pets: true },
  },
  // ───── Hazmat ─────
  {
    id: 'shelter-in-place',
    title: 'Shelter in place step by step',
    hazards: ['hazmat'],
    topics: [],
    readMinutes: 2,
    doNow: ['Get inside now and stay inside.', 'Close and lock all windows and doors.', 'Turn off heating, AC, and fans that pull in outside air.', 'Go to an interior room with few windows, above ground.', "Listen for official updates and stay until told it's safe."],
    sections: [
      {
        heading: 'Why shelter in place',
        body: 'During a chemical release, staying inside a closed room can protect you better than going outside. Officials will tell you when it is safe or if you need to evacuate.',
      },
    ],
    sources: [READY_CHEM],
  },
  {
    id: 'seal-room',
    title: 'How to seal a room',
    hazards: ['hazmat'],
    topics: [],
    readMinutes: 1,
    doNow: ['Only seal a room if officials tell you to.', 'Cover windows and vents with plastic sheeting.', 'Tape around doors, windows, and vents.', 'Bring water and a radio.'],
    sections: [
      {
        heading: 'Supplies',
        body: 'Keep plastic sheeting and duct tape with your home kit if you live near rail lines, highways, or chemical facilities.',
      },
    ],
    sources: [READY_CHEM],
  },
  {
    id: 'hazmat-car',
    title: 'If you’re in the car',
    hazards: ['hazmat'],
    topics: [],
    readMinutes: 1,
    doNow: ['Close windows and vents.', 'Set air to recirculate.', 'Follow official routes away from the area.', 'Get inside a building if told to.'],
    sections: [
      {
        heading: 'Driving during a release',
        body: 'Listen to the radio for instructions. Do not drive toward the area of the release.',
      },
    ],
    sources: [READY_CHEM],
  },
  // ───── Hurricane / wind ─────
  {
    id: 'inland-hurricane',
    title: 'Inland hurricane effects',
    hazards: ['hurricane'],
    topics: [],
    readMinutes: 2,
    doNow: ['Before it arrives: charge everything, fill water, gather meds for 7+ days.', 'Bring in or tie down outdoor furniture.', 'Expect power outages.', 'Watch for flooding.'],
    sections: [
      {
        heading: 'Far from the coast',
        body: 'Hurricanes can bring heavy rain, flooding, tornadoes, and long power outages hundreds of miles inland.',
      },
    ],
    sources: [READY_HURRICANE],
  },
  {
    id: 'device-72h',
    title: '72 hours of backup power for medical devices',
    hazards: ['hurricane', 'outage'],
    topics: ['Medical devices'],
    readMinutes: 2,
    doNow: ['Check that every life-sustaining device has 72+ hours of backup.', 'Ask your supplier about extra batteries.', 'Plan a place to go if backup runs low.', 'Charge everything before the storm.'],
    sections: [
      {
        heading: 'Why 72 hours',
        body: 'Power can stay out for days after a hurricane. Plan for at least 72 hours of backup, or a place with power you can reach.',
      },
    ],
    sources: [READY_HURRICANE],
    match: { devices: ['oxygen-concentrator', 'home-ventilator', 'feeding-pump', 'home-dialysis', 'cpap-bipap'] },
  },
  {
    id: 'tornado',
    title: 'Tornado warning: where to go',
    hazards: ['hurricane'],
    topics: [],
    readMinutes: 1,
    doNow: ['Go to the lowest floor, interior room, away from windows.', 'Cover your head and neck.', 'Mobile home: leave for a sturdy building before winds arrive.', 'Stay until the warning ends.'],
    sections: [
      {
        heading: 'Mobile homes',
        body: 'Mobile and manufactured homes are not safe in a tornado. Know where a sturdy building is before storms come.',
        callout: { tier: 'critical', text: 'Mobile homes are not safe in tornadoes. Go to a sturdy building.' },
      },
    ],
    sources: [READY_TORNADO],
  },
];
