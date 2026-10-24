import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { C, FONT } from './theme.js';

export const ease = Easing.inOut(Easing.cubic);
const clampOpts = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };

// Progreso 0..1 entre dos fotogramas, con suavizado.
export const prog = (frame, from, to) => interpolate(frame, [from, to], [0, 1], { ...clampOpts, easing: ease });

// Entrada y salida de una escena (fade de 10 fotogramas).
export const Scene = ({ duration, children }) => {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [0, 10, duration - 10, duration], [0, 1, 1, 0], clampOpts);
  return <AbsoluteFill style={{ opacity, background: C.bg, fontFamily: FONT, color: C.text }}>{children}</AbsoluteFill>;
};

// Mezcla entre estados: states[i] = { clave: número | arreglo de números }; starts[i] = fotograma en que empieza la transición hacia el estado i.
export const mix = (states, starts, move, frame) => {
  let i = 0;
  for (let j = 0; j < starts.length; j++) if (frame >= starts[j]) i = j;
  const from = states[Math.max(0, i - 1)], to = states[i];
  const t = i === 0 ? 1 : prog(frame, starts[i], starts[i] + move);
  const lerp = (a, b) => (Array.isArray(a) ? a.map((v, n) => v + (b[n] - v) * t) : a + (b - a) * t);
  const out = { idx: i };
  for (const key of Object.keys(to)) out[key] = lerp(from[key], to[key]);
  return out;
};

// Texto que aparece con un pequeño desplazamiento hacia arriba.
export const Rise = ({ at = 0, children, style }) => {
  const f = useCurrentFrame();
  const t = prog(f, at, at + 18);
  return <div style={{ opacity: t, transform: `translateY(${(1 - t) * 24}px)`, ...style }}>{children}</div>;
};

export const Left = ({ children }) => (
  <div style={{ position: 'absolute', left: 110, top: 0, bottom: 0, width: 800, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 26 }}>
    {children}
  </div>
);

export const H2 = ({ children, color = C.text }) => <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, color }}>{children}</div>;
export const P = ({ children, size = 42, color = C.text, weight = 500 }) => <div style={{ fontSize: size, lineHeight: 1.3, fontWeight: weight, color }}>{children}</div>;

export const Chip = ({ color, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 32, color: C.text }}>
    <div style={{ width: 28, height: 28, borderRadius: 6, background: color }} />
    {children}
  </div>
);

// Subtítulo grande y estable: cambia con un fundido corto entre pasos.
export const Caption = ({ text, step, startOfStep }) => {
  const f = useCurrentFrame();
  const t = prog(f, startOfStep, startOfStep + 14);
  return <div key={step} style={{ opacity: t, fontSize: 44, lineHeight: 1.3, minHeight: 190, fontWeight: 500 }}>{text}</div>;
};
