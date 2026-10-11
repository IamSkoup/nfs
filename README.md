# Savanna Underground

A playable browser racing prototype built with TypeScript, Vite, and Three.js. The first vertical slice includes a stylized savanna circuit, a procedural Fuli-inspired cheetah, three AI racers, keyboard/gamepad controls, synthesized Web Audio music and effects, a race HUD, event/stat screens, and LocalStorage records.

## Run locally

Requirements: Node.js 20.19+ or 22.12+ and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. For a production bundle, run `npm run build`; `npm run preview` serves that bundle locally.

## Controls

- W / Up: accelerate
- S / Down: brake
- A / Left and D / Right: steer
- Space: jump
- Shift: stamina burst
- R: restart the race
- Esc: pause
- Gamepad left stick: steer; right trigger: accelerate

The soundtrack and interface sounds are synthesized with Web Audio, so no commercial music files or external runtime assets are required. Progress is saved in the browser's LocalStorage.

## Current scope

This is Stage 1 of the supplied game brief: the menu, event-map and record screens, one three-lap circuit, three rival runners, camera, HUD, audio, and persistent results. Sprint, breath-rhythm drag, knockout, the full career, additional regions, detailed character animation, and the Azdat finale are later stages.
