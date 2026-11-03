# Emercity

Emercity is a household emergency preparedness and response app for iPhone and Android, with plans that sync in real time across a family's phones. It knows who in a home is most at risk, for each hazard, at this address, right now, and tells the household what to do first, even with no signal.

It is built for Loudoun County, Virginia, and works anywhere in the United States with national data.

> **Safety notice.** Emercity's rules, emergency steps and guides have not been reviewed by a qualified professional. They are not medical advice. Always follow official instructions and call 911 in an emergency.

## What it does

- **Priority order.** Ranks every person and pet in the home for each hazard (power outage, winter storm, flood, fire, chemical spill, hurricane) using written, deterministic rules. No AI makes emergency decisions.
- **Countdowns.** In a power outage, shows how long refrigerated medicine, medical devices and food stay safe. Times come only from cited sources (FDA, product labels, USDA) or the user's own estimate, and say so.
- **Emergency Mode.** Step-by-step instructions built from the household's needs, with roles, check-ins and one-tap 911. Works offline.
- **Live conditions.** National Weather Service alerts, NOAA river gauges, FEMA flood zones and open shelters, labeled with their source and age.
- **Address risk profile.** Flood zone, nearby streams, rail lines, chemical sites, hospitals and the first-due fire station, from public data.
- **Shared plans.** Household members join with an invite code and see changes in real time.
- **Planning tools.** Supplies, drills, meeting points, a lock-screen emergency card and offline guides.
- **Accessibility.** Simple Mode, High Contrast, larger text, Reduce Motion, read-aloud and VoiceOver labels.

## Architecture highlights

- **Local-first and offline.** Every write lands in an encrypted SQLite database on the phone before anything touches the network, so the app works fully with no signal. The UI never waits on a request.
- **Reliable sync.** For shared households, each write also adds an entry to a `sync_queue` table in the same database transaction. The queue drains to Firestore when a connection is available, so edits made offline are never lost.
- **Real-time updates.** Household members' phones listen to Firestore and apply each other's changes as they arrive, including step check-offs during an active emergency.
- **Deterministic safety logic.** The priority engine, countdowns and playbooks are pure, rule-based functions in `src/domain` with injectable clocks, covered by unit tests and fixture households.
- **Locked-down data.** Firestore security rules limit each household's data to its members by role and are tested on the Firebase emulator.

## Tech stack

| Area | Choice |
|---|---|
| App | React Native 0.88, Expo SDK 58, TypeScript (strict), Expo Router |
| Local data | Encrypted SQLite (SQLCipher); the phone is the source of truth |
| State | Zustand |
| Cloud | Firebase Auth and Firestore on the free Spark plan |
| Map | MapLibre with OpenFreeMap tiles |
| Tests | Jest, plus Firestore security rules tests on the Firebase emulator |

## Getting started

Requirements: macOS with Xcode, Node.js 20 or later, CocoaPods, and Java (for the Firebase emulator).

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your Firebase web app config (Firebase console, Project settings, Your apps). The `.env` file is git-ignored.

3. Build and run on the iOS Simulator. Emercity uses native modules (SQLCipher, camera, maps), so it runs as a development build rather than in Expo Go:

   ```bash
   npm run ios
   ```

4. After the first build, start Metro on its own:

   ```bash
   npx expo start --dev-client
   ```

No account is needed to look around: tap **Explore a demo household** on the welcome screen.

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Start Metro for the installed development build |
| `npm run ios` | Build, install and launch on the iOS Simulator |
| `npm test` | Run the unit tests |
| `npm run typecheck` | Type-check the project |
| `npm run test:rules` | Test `firestore.rules` on the Firestore emulator |

## Local Firebase emulators

To test accounts and sync without touching the live project:

```bash
npx firebase emulators:start --only auth,firestore
```

Then add `EXPO_PUBLIC_FIREBASE_EMULATOR=1` to `.env.local` and restart Metro with `npx expo start --dev-client --clear`. Remove the line to go back to the live project.

## Project structure

```
src/
  app/          Routes (Expo Router), thin files that render screens
  screens/      Screen bodies, grouped by area
  components/   Reusable UI
  domain/       Pure, tested business rules (priority engine, countdowns, risk)
  data/         Encrypted SQLite, record store and sync queue
  services/     Firebase, public data sources, notifications
  stores/       App state
  reference/    Bundled, cited reference data (storage rules, guides, playbooks)
  theme/        Design tokens and contrast tests
docs/           Specification and progress
firestore.rules Security rules (deployed, emulator-tested)
```

## Status

See [`docs/PROGRESS.md`](docs/PROGRESS.md) for the status of every screen and system, and [`CLAUDE.md`](CLAUDE.md) for architecture decisions and known limitations.

## Data sources

Emercity uses public data from the National Weather Service, NOAA National Water Prediction Service, FEMA, USGS, U.S. DOT, EPA, the U.S. Census Bureau, openFDA, Loudoun County GIS, and OpenStreetMap contributors (via OpenFreeMap). The full list with links is in the app under **Settings, Data sources and credits**.

## How it was built

Emercity was designed and directed by Pranav Venkateswaran. Development used [Claude Code](https://claude.com/claude-code), Anthropic's AI coding assistant, for much of the implementation; commits it helped write carry a `Co-Authored-By` line. The app itself contains no generative AI in any emergency decision.

Built with React Native, Expo, TypeScript, Firebase, SQLite (SQLCipher), Zustand, MapLibre, Phosphor Icons and Jest.

## License

Private. All rights reserved.
