import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { Explainer, TOTAL } from './Explainer.jsx';
import { FPS, H, W } from './theme.js';

const Root = () => (
  <Composition id="Explainer" component={Explainer} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
);

registerRoot(Root);
