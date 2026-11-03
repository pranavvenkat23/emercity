# Video edit plan

Plan for producing the Congressional App Challenge video from `docs/video/script.md`. Style reference: `~/Developer/Emercity-Video/reference/elect-connect.mp4` (a past CAC submission the team likes). Analysis below.

## Where things live

- Script and plan: `docs/video/` in this repo (small text files only).
- Raw footage, project files and renders: `~/Developer/Emercity-Video` (outside the repo; video files must not go into git).

## What the team provides

1. Each person's talking clips, named by scene and speaker, for example `scene3-siva.mov`. Mark a favorite take in the name if there is one (`scene3-siva-best.mov`). Timestamps are not needed.
2. Live-action shots a Simulator can't produce: the Scene 1 blackout shots, a phone in someone's hand, and a real camera scanning a medicine box if wanted.
3. Music, or approval to use royalty-free music (CAC requires rights-cleared audio).

## What Claude produces

- App footage recorded directly from the iOS Simulator (`xcrun simctl io booted recordVideo`), driven through the scripted demos. Hide the Expo dev tools button first. Two Simulators side by side for the Scene 5 sync shot.
- Tap ripples added in post so viewers can see what was pressed.
- Floating, rounded, drop-shadowed phone frames that slide in beside the speaker during on-camera lines; the speaker shifts or scales to make room.
- Motion graphics: stat cards, on-screen labels from the script, the Scene 6 architecture diagram, scene transitions, smooth zooms into app details.
- Dead-space removal: transcribe each clip, match lines to the script, cut pauses, false starts and filler.
- Audio: level matching across speakers, music with ducking under voices, a few sound effects (power-off click, haptic tap).
- Burned-in captions.
- 1080p export, then revision rounds with the team.

## Tools (installed and tested)

- ffmpeg 9 (Homebrew): cutting, audio, encoding.
- whisper.cpp (`whisper-cli`) with the `small.en` model at `~/Developer/Emercity-Video/models/ggml-small.en.bin`: transcription with timestamps.
- Remotion project at `~/Developer/Emercity-Video/motion` (React, 1920x1080). Render: `npx remotion render src/index.ts <CompositionId> ../renders/<file>.mp4`. A 3-second test rendered fine.

Folders: `raw/talking`, `raw/broll`, `raw/app`, `reference`, `work` (transcripts, frames, cut lists), `renders`.

## Removing dead space and repeated lines

1. Transcribe each talking clip with word timestamps; also run ffmpeg `silencedetect`.
2. Cut pauses longer than about 0.4 s, keeping a short breath.
3. Match the transcript to the script line by line. For repeated lines, keep the cleanest complete take (default: the last full take). Flag ad-libbed lines instead of guessing.
4. Cut filler ("um", "uh") and the lead-in before the first word.
5. Short audio crossfades at every cut; hide jump cuts under the floating app screen or a slight zoom.
6. Before rendering, give the team a cut list per clip (clip, removed range, reason) to approve.

Tip for filming: after a mistake, pause a second and restart the whole sentence.

## Limits to remember

- Claude reviews video through extracted frames and transcripts, not by watching; the team should judge pacing, music and feel.
- Footage that is blurry, badly lit or has poor audio can't be fully fixed.
- Before the Airplane Mode or "works with no signal" shots, test offline behavior on the filming phone.

## Reference video analysis (Elect Connect, 3:00, 1080p 60 fps)

- Pacing: about 175 spoken words per minute (524 words in 3:00). Our script is about 420 words, so we have room for visual-only moments.
- 0:00 to 0:36: cinematic skit. Real locations, varied angles (close-ups, top-down), lower-third caption cards ("Election day", "Gautam has forgotten to vote"). Strongest part.
- 0:36 to 1:06: phone-in-hand shots, with app screens composited beside the hand; app recordings centered on black.
- 1:06 to 3:00 (about 65% of the runtime): static slides. Gray background, blue arrows, logos and code screenshots, with a small webcam of the speaker in a corner and a phone recording on the left. Each slide holds 15 to 25 seconds with almost no motion. Only about 15 hard cuts in the whole video.
- Every feature is explained the same way: input, processing step, data source, output to the user.

What we keep: the strong cinematic opening, the steady pacing, and explaining each feature as a clear pipeline.
What we do better:
- Animated diagrams instead of static slides. Pieces build in step by step as the speaker names them, with motion matched to the words.
- The speaker full frame or large, with a floating phone frame that animates in, instead of a small webcam in the corner.
- A visual change every 3 to 6 seconds: zooms into app details, label callouts, stat cards, cutaways.
- A consistent look from the app's design system: navy, teal and the severity colors, dark backgrounds for Emergency scenes.
- Captions throughout, plus the cinematic hook in Scene 1.

## To start in a new session

Say: "Read docs/video and let's start the video edit."

## Progress (October 25)

Built in `~/Developer/Emercity-Video/motion/src` (git-tracked; media is ignored):
- `theme.ts`: the app's colors and the Inter font.
- `StatCard`: animated big number, label and source (Scene 2).
- `LabelBar`: on-screen technical labels as glassy pills (Scenes 3 to 6).
- `FloatingPhone`: iPhone frame that springs in from the side, floats, plays a recording, and shows tap ripples from a tap list.
- `ArchitectureDiagram`: four layers build in, data pulses flow down, the Firebase branch drops with "NO CONNECTION" while the core keeps running (Scene 6).
- `LogoReveal`: logo and tagline.

App recordings (Simulator, 1206x2622, status bar 9:41, developer button hidden). Originals with tap logs (`*.taps.txt`) are in `raw/app/`; 60 fps copies are in `motion/public/app/`.

| Clip | Shows | For |
|---|---|---|
| a01-home-overview | Home scrolling: readiness, who first, countdown preview | Scene 2 |
| a02-power-out | Tap "Power is out", sheet, Start countdowns | Scene 1 |
| a03-countdowns | Outage banner and live countdowns with sources | Scenes 1, 4 |
| a04-emergency-start | Hazard picker, Power outage, Emergency hub, step 1 Done | Scene 4 |
| a05-critical-step | Critical oxygen step, tap Done | Scene 4 |
| a06-priority-why | Outage and Flood orders, long-press "Why Grandma is here" | Scene 3 |
| a07-map | Map zooming into FEMA Zone AE around the home, gauges | Scene 5 |
| a08-flood-warning | Demo Flash Flood Warning prompt (trim the menu at the start) | Scene 5 |
| a09-supplies | Supply list by category | Scene 2 |
| a10-readiness | Readiness score breakdown | Scene 2 |
| a11-simple-contrast | Accessibility settings: Simple Mode on, then High Contrast on top | Scene 7 |
| a12-sync-phone-a | Mom's phone (iPhone 17 Pro). Changes to "Power out since" at 10.5 s with no touch | Scene 5 |
| a12-sync-phone-b | Dad's phone (iPhone 17). Taps "Power is out" at 3.0 s and "Start countdowns" at 10.0 s | Scene 5 |
| a02b-power-out-critical | Power out "2 hours ago": oxygen at 2:00 (orange) turns red at 32.3 s (1:59). Cut the wait between 20 s and 31 s | Scene 1 |
| a13-household | Household tab: five people, scroll to Biscuit, open Grandma's profile (#1 for all six hazards) | Scene 2 |
| a15-map-meeting | Turn on FEMA flood zones, zoom to the home in Zone AE, tap the meeting point just outside it | Scene 5 |
| a16-countdown-grid | Countdown list during the outage: oxygen (red), both insulin pens, fridge food, freezer food | Scene 4 |
| a17-read-aloud | Open step 1, tap the speaker at 6.2 s. Sound: `a17-read-aloud-voice.m4a` (macOS Samantha voice reading the same step text, since Simulator recordings have no audio) | Scene 7 |
| a14-assign-mom | Emergency step 2 (critical oxygen check): Assign someone at 3.6 s, Mom at 5.2 s, shows "Mom · Reassign" | Scene 4 |
| a14b-done | Same step, tap Done at 3.6 s, advances to step 3 (use with a14; add the haptic sound in post) | Scene 4 |
| a18-backup-30min | Grandma's oxygen backup changed from 4 h to 30 min (one tap per second from 9.4 s; speed up 9 s to 65 s), Save at 74.6 s, Home shows her countdown red at 0:00 "Safe time passed" (an outage was running) | Scene 3 |

The two a12 clips start at the same moment, so place them side by side with no offset. Phone A updates about half a second after Dad's tap. The script says Phone A taps and Phone B updates; in the footage Dad's phone (B) taps and Mom's (A) updates, so label the phones by person, not letter. They were recorded on the local Firebase emulator with test accounts, not the live project. Scene 4 barcode scan and Airplane Mode are motion graphics, not app footage: `renders/InsulinScan.mov` (4.4 s, generic unbranded box, scanner sweep, "FDA match found") and `renders/AirplaneMode.mov` (2.8 s, toggle pops in, turns on, fades out). Both are ProRes 4444 with transparency for layering over SONkar; `*-preview.mp4` copies are on a dark background. Bluetooth check-ins are cut from the script (not a feature of the app). Scanning a real box needs a phone camera (team footage). All clips re-recorded October 25 with The Doe Household (Grandma, Dad, Mom, Baby Jamie, Ben, Biscuit).

Recording helper: `work/rec.sh start <name>`, `work/rec.sh mark tap <x> <y>`, `work/rec.sh stop`. Before recording: `xcrun simctl status_bar booted override --time 9:41 ...` and `defaults write org.emercity.app EXDevMenuShowFloatingActionButton -bool NO` in the Simulator.
