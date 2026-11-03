# EMERCITY
**Congressional App Challenge Video Script (about 2:58)**

Speakers: SONkar, Siva, Akshay, Pranav. Style rule for all on-screen text: no em dashes, no arrow symbols.

## SCENE 1: THE POWER GOES OUT
**0:00 to 0:33 | Cinematic introduction**

**0:00 to 0:04**
BLACK SCREEN. A faint electrical hum. A click. The hum stops.
CUT TO: SONkar at his desk. The room goes dark. He looks up.

**0:04 to 0:09**
Close-up: SONkar turns on his phone flashlight.
CUT TO: Siva searching a drawer for a flashlight.
CUT TO: Akshay checking an emergency supply kit.
Real room sounds. Quiet, tense music.

**0:09 to 0:15**
SONkar opens Emercity and taps **Power is out**.
The camera pushes toward the screen. MATCH CUT into a full-screen recording of Emercity.

**0:15 to 0:23**
A red card pulses: **CRITICAL: Grandma's oxygen concentrator needs electricity.**
A backup countdown starts: **3 h 59 m**.

PRANAV (VO): "When the power goes out, finding a flashlight is easy. Knowing who needs help first? That's harder."

**0:23 to 0:28**
CUT TO PRANAV, ON CAMERA: "That's why we built Emercity."

**0:28 to 0:33**
The priority list collapses into the Emercity logo.
PRANAV (VO): "An emergency plan built around the people who matter most."

## SCENE 2: THE PROBLEM AND OUR SOLUTION
**0:33 to 0:55 | Akshay**

AKSHAY (ON CAMERA):
"In 2024 alone, the United States had 27 billion-dollar weather disasters. But emergency alerts warn an entire county. They don't know that your grandmother uses oxygen, or that your dad's insulin needs a fridge. Emercity does. It combines your household's medical needs, your supplies and the real hazards at your address to find the weak spots before disaster strikes."

VISUALS:
- 0:33: Big type: **27 BILLION-DOLLAR DISASTERS**. Small label: NOAA NCEI, 2024.
- 0:40: A county-wide alert banner shrinks into a single house.
- 0:45: The house opens into the Emercity household screen.
- 0:48: Readiness ring fills to 40%.
- 0:51: Supplies list, then the risk map with flood zones.
- TRANSITION: zoom into Grandma's profile.

## SCENE 3: THE INTELLIGENCE BEHIND EMERCITY
**0:55 to 1:23 | Siva**

SIVA (ON CAMERA):
"At the core of Emercity is a deterministic decision engine that runs entirely on the phone. It weighs medical devices, mobility, age, medications and live conditions like outdoor temperature and active weather alerts, then ranks every person and pet across six different hazards in milliseconds. There's no black-box AI. Every ranking traces back to a written rule you can open and read. And we test it against 46 simulated households, so the same situation always gives the same answer."

DEMONSTRATION:
1. Open the priority order for a power outage.
2. Long-press Grandma. The "Why this rank" sheet shows her reasons.
3. Lower her oxygen backup from 4 hours to 30 minutes.
4. The list re-ranks instantly.

ON-SCREEN LABELS: **ON-DEVICE DECISION ENGINE · 6 HAZARDS · EVERY DECISION EXPLAINED · 46-HOUSEHOLD TEST SUITE**

## SCENE 4: EMERGENCY RESPONSE
**1:23 to 1:53 | SONkar**

SONkar (ON CAMERA):
"When disaster strikes, one tap opens Emergency Mode: a step-by-step plan for that exact hazard, assigned to the right family member. Scan a medicine box and Emercity reads the barcode, matches it against the FDA's drug database and starts a countdown from the manufacturer's own storage limits. Every countdown is scheduled on the phone ahead of time, so the warning still goes off with the app closed and no signal. Critical decisions should never depend on a stable internet connection."

DEMONSTRATION:
1. Tap the red Emergency button. The screen turns dark with larger text.
2. Step 1, assigned to Mom: **Check Grandma's oxygen concentrator.** Tap Done.
3. Scan an insulin box: **FDA match found**. The countdown appears with its source label.
4. Open an offline guide from inside a step.

ON-SCREEN LABELS: **HAZARD-SPECIFIC PLANS · FDA-SOURCED COUNTDOWNS · WORKS WITH NO SIGNAL**

## SCENE 5: CONNECTED HOUSEHOLD RESPONSE
**1:53 to 2:20 | Pranav**

PRANAV (ON CAMERA):
"Emercity connects the whole household. When Dad marks the power out on his phone, every family member's countdowns start within seconds. If two people check off steps at the same time, Emercity merges them instead of overwriting. And it pulls live data from nine public sources, including National Weather Service alerts, NOAA river gauge forecasts, FEMA flood maps and open shelters, so your family goes from a general warning to a personal plan."

DEMONSTRATION:
1. Two phones side by side. Tap **Power is out** on Phone A. Phone B updates seconds later.
2. A demo **FLASH FLOOD WARNING** appears full screen.
3. The map: flood zones, a river gauge, shelters and the family meeting point.
4. Quick flashes of drills, supplies and the lock-screen card.

ON-SCREEN LABELS: **REAL-TIME FAMILY SYNC · 9 LIVE PUBLIC DATA SOURCES · LOCATION-AWARE RISK**

## SCENE 6: THE ENGINEERING
**2:20 to 2:47 | Siva and Akshay**

SIVA (ON CAMERA):
"Emercity is built in React Native and strict TypeScript. Every household record is stored in an AES-256 encrypted database on the device, with the key locked in the phone's secure keychain. Health details never appear in notifications, links or logs."

AKSHAY (ON CAMERA):
"It's local-first. Every change saves to the phone and queues for sync in a single step, then syncs through Firebase with field-level merging. Our security rules decide exactly who can see and edit what, and we test them on a local emulator before they ever go live. With more than 450 automated tests, losing the internet never takes down the plan."

VISUAL: animated architecture diagram, stacked top to bottom:
1. **HOUSEHOLD DATA + LIVE HAZARD SIGNALS** (NWS · NOAA · FEMA · USGS · EPA)
2. **ON-DEVICE DECISION ENGINE**
3. **AES-256 ENCRYPTED LOCAL DATABASE**
4. **PERSONALIZED RESPONSE PLAN**

A side branch connects to **FIREBASE FAMILY SYNC (SECURED BY TESTED RULES)**. The connection flickers out with a "No connection" badge. The core keeps glowing and animating.

ON-SCREEN TEXT: **ON-DEVICE PROCESSING · ENCRYPTED BY DEFAULT · LOCAL-FIRST SYNC · 450+ AUTOMATED TESTS**

## SCENE 7: THE ENDING
**2:47 to 2:58 | SONkar and Pranav**

SONkar (VO): "Every emergency is different."
PRANAV (ON CAMERA): "Your plan should be too."

CUT TO BLACK.
**EMERCITY**
*Prepared for your people.*

---

## Accuracy notes

- Real and verified in the Simulator: on-device engine, 6 hazards, explanations, 46 test households, re-ranking; barcode to FDA countdowns, countdowns pre-scheduled as notifications; encrypted database with keychain key; local-first sync, field-level merge, merged steps; 9 public data sources; rules tested on the emulator; 470 tests at time of writing.
- Lightly polished: "in milliseconds" and "within seconds" are not measured. Offline use has not been tested on a real phone with the network cut; test Airplane Mode before filming.
- Verify the NOAA figure (27 billion-dollar disasters in 2024) on NOAA NCEI before filming.
- The draft's "only 5% of adults over 60 practiced drills" stat was removed because it couldn't be verified. Add it back only with an official FEMA source.
