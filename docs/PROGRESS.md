# Emercity progress

Status of every screen and system in `docs/emercity-spec.pdf`, kept up to date
with each milestone. **Verified** means it was exercised in the iPhone 17 Pro
Simulator, not only compiled.

Legend: ✅ built and verified · 🟡 built with a stated gap · ⛔ not built · 🔒 blocked by the free plan or an outside account

## Screens

### Onboarding (§5)
| Screen | Status | Notes |
|---|---|---|
| ONB-01 Welcome | ✅ | Language selector says only English is available yet |
| ONB-02 Create account / sign in | 🟡 | Email works (verified on the Auth emulator). Apple/Google need provider setup and a paid Apple account |
| ONB-03 Create or join | ✅ | Joining verified end to end against the emulator |
| ONB-04 Address | 🟡 | Census geocoder search (no autocomplete: the free service has none) or phone location; no map pin preview yet |
| ONB-05 Who lives here | ✅ | Chips, live strip, remove with undo |
| ONB-06 Member details | ✅ | Shared form with HH-03, health chip follow-ups |
| ONB-07 Pets | 🟡 | No photo (no image picker yet) |
| ONB-08 Medicines and devices | ✅ | Scan / Type it; unfinished life-sustaining items stay Critical |
| ONB-09 Risk reveal | ✅ | Live public data; offline says it will finish later |
| ONB-10 First priority order | ✅ | |
| ONB-11 Permissions | 🟡 | Notifications, location, camera. Contacts permission not asked (contacts are typed in) |
| ONB-12 Done | 🟡 | Offline package: guides and rules are bundled; the map is saved from the Map tab, not automatically |

### Home (§6)
| Screen | Status | Notes |
|---|---|---|
| HOME-01 Home | ✅ | Live NWS alerts and weather; never says "All clear" without a successful check |
| HOME-02 Alert detail | ✅ | |
| HOME-03 All countdowns | ✅ | Sourced rules only; unknowns say "No safe-time data" |
| ALERT-PROMPT | ✅ | Full screen for warnings; never starts Emergency Mode by itself |

### Household (§7)
| Screen | Status | Notes |
|---|---|---|
| HH-01 … HH-09 | ✅ | Scan uses openFDA directly with a device cache |
| HH-10 Invite | ✅ | Codes live in Firestore, expire in 7 days, can be turned off |

### Emergency Mode (§12)
| Screen | Status | Notes |
|---|---|---|
| EM-01 … EM-06, EM-08 | ✅ | Steps sync between phones; two phones marking steps merge (earliest wins) |
| EM-07 Family status | 🟡 | Check-ins sync; SMS fallback opens Messages. No push to closed phones (free plan) |

### Map (§16)
| Screen | Status | Notes |
|---|---|---|
| MAP-01 Map home | 🟡 | MapLibre + OpenFreeMap; flood zones, rail, chemical sites, alert areas, places, gauges, meeting points; offline save within 10 mi. No search bar or pharmacies/cooling centers layer yet |
| MAP-02 Place detail | ✅ | |
| MAP-03 Gauge detail | ✅ | |
| MAP-04 Meeting point editor | 🟡 | Phone location or address; no draggable pin yet |
| MAP-05 Risk on map | ✅ | PLAN-03 "See on map" opens with risk layers on |

### Plan (§8–18)
| Screen | Status | Notes |
|---|---|---|
| PLAN-01 … PLAN-11, PLAN-13 | ✅ | |
| PLAN-12 Ask | 🔒 | Grounded answers need a server (Cloud Functions are not on the free plan). Says so plainly |

### Settings (§22)
| Screen | Status | Notes |
|---|---|---|
| SET-01 Settings home | ✅ | Hidden demo menu: long-press the demo card |
| SET-02 Account and household | ✅ | Owner changes roles or removes access; members leave |
| SET-03 Notifications | ✅ | Category toggles and quiet hours apply to scheduled notifications |
| SET-04 Language | 🟡 | English and Spanish menus (Spanish unreviewed); safety text English-only by design |
| SET-05 Accessibility | ✅ | Simple Mode, High Contrast, text size, motion, vibration, read-aloud speed, critical flash |
| SET-06 Privacy and data | 🟡 | Export JSON works; deleting the cloud account/household needs server code |
| SET-07 Offline data | ✅ | |
| SET-08 Data sources | ✅ | |
| SET-09 About | ✅ | States rules are not professionally reviewed |

## Systems

| System | Status | Notes |
|---|---|---|
| Encrypted local database (SQLCipher) | ✅ | Verified on device |
| Priority engine (§8) | ✅ | 46 fixture households; pins; roles |
| Countdowns (§11) | ✅ | Pre-scheduled local notifications; shared outage start between phones |
| Readiness (§6.4) | ✅ | |
| Risk profile (§9) | 🟡 | Outage history (EAGLE-I) not available, so it shows Unknown |
| Alerts (§10) | 🔒 | Checked every 5 min while the app is open. Background push needs Cloud Functions (paid plan) |
| Cloud sync (§19) | ✅ | Local queue pushed to Firestore with field-level merge; real-time listeners; rules tested on the emulator and deployed |
| Drills, supplies, guides, lock-screen card | ✅ | |
| Demo household and scenarios (§26.3) | ✅ | |
| Translations (§20) | 🟡 | Catalog + Spanish menus; guides/steps need human translation |
| Accessibility (§20) | 🟡 | Settings done and verified; a full VoiceOver walkthrough has not been done |

## Testing

```bash
npm test             # Jest unit tests
npm run typecheck    # TypeScript
npm run test:rules   # Firestore rules on the emulator (needs Java)
```

## Needs the owner

- Firebase console, Authentication, Sign-in method: make sure **Email/Password** is on (free). Sign-up was verified on the Auth emulator, not yet on the live project.
- Apple/Google sign-in, real-device push and Critical Alerts need a paid Apple Developer account.
- A qualified reviewer for the emergency rules and guides before real use (§8.4, §12.8).
