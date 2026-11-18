# THE LAST FREQUENCY

An atmospheric 2.5D/3D pixel-art science-fiction adventure on the silent planet **Vesper-9**. The whole game lives in **one file**, `index.html`: HTML, CSS and JavaScript only, with no libraries, no external assets and no build step.

> *"If you're hearing this… don't answer."*

## Run it

- **Online:** every push to `main` deploys to GitHub Pages through `.github/workflows/pages.yml`.
  The first time only, Pages may need **Settings → Pages → Source: GitHub Actions** set in the repository settings.
- **Locally:** open `index.html` in a current Chrome, Edge, Firefox or Safari 15+. Serving it also works, for example `python3 -m http.server`.
- **Requires WebGL2.** If WebGL2 is missing, the game shows a clear message instead of failing silently.

## What's in the game

| Area | Contents |
|---|---|
| Campaign | 8 connected, fully playable regions and chapters: Ashen Frontier, Overgrown Settlement, Whispering Forest, Sunken Research Complex, Iron Wastelands, Echo Canyon, Silent Capital, Frequency Core |
| Story | Opening cinematic, 4 companions (Mara, Elias, Nova, Orin) with dialogue choices, relationships, personal quests and memory scenes, 24 recoverable records (evidence-tagged), a foreshadowed twist, and 3 endings plus 1 secret ending, each with its own epilogue scene, music and post-credit scene |
| Bosses | Unstable Guardian, Rootbound, The Warden, The Archivist, Forge Titan, The Resonant, The First Voice, The Chorus. Each has phases, readable telegraphs and a weakness system (scan phase-lock, arc pylons, shield-break burst, coolant thermal shock, harmonic node sequence) |
| Enemies | 8 Echoed types (Drifter, Stalker, Watcher, Burrower, Crawler, Mimic, Brute, Resonance Swarm). Their state AI covers idle, patrol, listen, investigate, chase, attack, evade, search, return and stagger. They use sight cones, hearing, light and weather, obstacle-aware steering and ally alerts |
| Mechanics | Walk, run, sprint, crouch-stealth, jump, double jump (Pulse Boots), dodge roll with i-frames, mantling, vine climbing, moving platforms. Combat: 3 weapons with heat management and venting, resonance burst, melee, lock-on, aim assist. Frequency scanner: reveals hidden structures, marks enemies, tracks signals, finds 8 hidden frequencies. Puzzles: frequency tuning (1–3 dials), power routing, resonator sequences, light/wind/mirror beams, observatory dish alignment, water drainage |
| World | Seeded procedural regions built from an authored object library (houses, towers, labs, factories, Vael architecture, flora and debris). Physics props, moving platforms and pistons, hazards. Weather shares one wind field (ash, dust, rain, spores, storms with lightning) and drives a day/night cycle |
| Cameras | 8 rigs over the same world: Isometric Diorama, Rear-Low Chase, Side-On, Top-Down, Cinematic Wide, Close Character, Over-the-Shoulder, Elevated. They blend smoothly and include camera collision, terrain lift, a dithered occlusion cut-out, shake, cinematic paths and contextual dialogue framing |
| UI | Title, slots (3 manual slots plus autosave), character creator with live 3D preview and 7 preview animations, field kit (inventory, character/suits, world and regional maps with fast travel, journal, objectives, upgrades, settings, save), dialogue, puzzles, loading, checkpoints, death and retry, chapter summary, endings and credits |
| Settings | Quality presets (auto/low/medium/high/ultra/custom), pixel resolution, dynamic resolution, shadows, reflections, AO, lights, particles, vegetation, draw distance, fog, post FX, grain, FPS cap. Audio buses. Camera and aim options, difficulty. Accessibility: subtitles (size and background), UI scale, high contrast, colour-blind indicators, reduced motion, audio-cue captions, simplified puzzle hints, hold/toggle options, touch size, opacity and left-handed layout, key remapping. All settings persist |
| Input | Keyboard and mouse (remappable, pointer-lock in orbit cameras), gamepad (Gamepad API, rumble where available, glyphs swap with the active device), touch (virtual stick, camera drag, pinch zoom, contextual buttons, landscape prompt, safe-area insets) |

## Default controls

| Action | Keyboard / mouse | Controller |
|---|---|---|
| Move / sprint / crouch | WASD / Shift / Ctrl | L-stick / L3 / D-pad ↑ |
| Jump · mantle / dodge roll | Space / Alt | A / B |
| Interact / scanner (hold) | E / Q | X / LB |
| Fire / aim / melee / burst | LMB / RMB / V / F | RT / LT / RB / Y |
| Vent heat / lock-on / headlamp | R / T or MMB / L | — / R3 / D-pad ← |
| Camera cycle / rotate | C / Z, X (wheel zooms) | D-pad ↓ / R-stick |
| Inventory / map / journal / pause | Tab / M / J / Esc | Back / — / — / Start |

## Architecture (technical plan)

**Reference research.** I studied the rendering of [pixel-plays](https://github.com/amirmushichge/pixel-plays) (`engine.js`). It is a 360×280 software rasterizer with an orthographic projection and a depth buffer. Its look comes from five-step hue-shifted ramps (shadows drift violet, lights drift warm), 4×4 Bayer ordered dithering, ink and rim edges derived from depth discontinuities, baked contact occlusion, and wind stepped at 8 fps so it reads as hand-animated. Its licence could not be verified, so **no code was copied**. The *principles* were re-implemented on the GPU so they scale to a large 3D world viewed from 8 cameras.

**Renderer: WebGL2, chosen for broad support on desktop and Android with no optional features required.**
1. **Shadow pass:** directional shadow map, texel-snapped, with hardware PCF.
2. **Planar reflection pass:** a mirrored view matrix renders a clip-planed scene for water. Animated moving objects therefore reflect correctly. In later chapters the player's own reflection glitches, which is a story clue.
3. **Main pass:** writes low-res MRT (colour, normal + material flags, depth). It applies quantized hue-shifted lighting with Bayer dither (flat bands on characters), up to 8 point lights, fog with sun scattering, scanner rings, revealable geometry, and a dithered occlusion cut-out.
4. **Post pass:** depth/normal ink edges, SSAO, screen-space reflections for wet ground and metal, bloom, god rays, depth of field in cinematics, grading per region and per ending, signal interference, chromatic aberration, damage, fades, then a final palette quantize.
5. **Upscale:** an integer nearest-neighbour blit keeps pixels stable.

Static geometry is merged into 32 m chunks with a separate detail LOD buffer and is frustum-culled. Everything dynamic is GPU-instanced primitives. Particles are pooled GPU points and lines.

**Simulation.** A semi-fixed timestep (≤1/60 s substeps) drives a heightfield plus a spatially-hashed collider grid (step-up, slope limits, mantle and climb surfaces, moving platforms), lightweight rigid-body props, and procedural skeletal animation with blending and foot IK. AI is distance-LOD'd. Game data (regions, quests, dialogue, logs, items, upgrades, endings) is data-driven and kept separate from runtime state. Saves are versioned, checksummed and migrated, and each slot keeps a backup, so a corrupted save recovers instead of being lost.

**Audio.** Everything is synthesized with WebAudio: buses, HRTF spatial panners with occlusion low-pass, convolution reverb tuned per region, wind, rain and hum beds tied to the simulation, a large SFX catalogue, formant "voices", and an adaptive generative score (explore, combat, boss, ending). The five-note Vael leitmotif recurs in puzzles, story and endings.

## Honest limitations

- **No hardware ray tracing.** No standard browser API exposes it, and the game does not claim it. The "advanced" option only raises the quality of the screen-space effects. WebGPU is detected but never required.
- **WebGL2 is required.** There is no Canvas2D fallback renderer. Unsupported browsers get an explanatory screen.
- **Mobile was verified only in desktop browser emulation**, not on physical Android hardware. Real-device performance is unverified, although automatic tiering and dynamic resolution are designed for it.
- Worlds are seeded procedural compositions built from a hand-authored object library. They are not hand-sculpted levels.
- Dialogue is subtitled with synthesized "radio voice" babble. There is no recorded voice acting.

## Testing

Automated Playwright runs, using headless Chromium on SwiftShader (a CPU GPU emulator, so frame rates there are not representative), covered:
- Boot, title, every menu screen, settings tabs, slot screens, creator with preview animations, credits.
- The full opening cinematic, followed by a Chapter 1 playthrough driven by real keyboard and mouse input: movement, camera cycling, interaction, scanner, combat, burst, tune puzzle, boss, recruiting Mara, map, journal, objectives, and the chapter transition with autosave.
- A scripted run of Chapters 2–8: every main objective, puzzle (routing, sequence, beams, dishes, drainage, 3-dial tuning), every boss, the betrayal, memory chambers, and the ending cinematic, epilogue, credits and post-credit scene.
- Screenshots of all 8 regions in several camera rigs, a mobile-landscape emulation with touch controls, and console-error capture.

See the commit history for the details of each QA iteration.
