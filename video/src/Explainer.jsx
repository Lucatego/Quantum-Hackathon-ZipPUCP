import React from 'react';
import { Series } from 'remotion';
import { Challenge, Classic, Ending, Fair, Intro, Outro, Quantum, Trap } from './scenes.jsx';

// Duraciones en fotogramas a 30 fps. Total: 2340 = 78 s.
export const SCENES = [
  [Intro, 150], [Challenge, 270], [Classic, 360], [Quantum, 540],
  [Trap, 330], [Fair, 180], [Ending, 300], [Outro, 210],
];
export const TOTAL = SCENES.reduce((n, s) => n + s[1], 0);

export const Explainer = () => (
  <Series>
    {SCENES.map(([Scene, d], i) => (
      <Series.Sequence key={i} durationInFrames={d}><Scene duration={d} /></Series.Sequence>
    ))}
  </Series>
);
