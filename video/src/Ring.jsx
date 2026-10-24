import React from 'react';
import { C, FONT, pct } from './theme.js';

// Sector i = cuña [i·45°, (i+1)·45°) desde +x en sentido horario de pantalla (y hacia abajo): igual que el juego.
const pt = (cx, cy, a, r) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
const wedge = (cx, cy, a0, a1, r0, r1) => {
  const [x0, y0] = pt(cx, cy, a0, r0), [x1, y1] = pt(cx, cy, a0, r1);
  const [x2, y2] = pt(cx, cy, a1, r1), [x3, y3] = pt(cx, cy, a1, r0);
  return `M${x0} ${y0} L${x1} ${y1} A${r1} ${r1} 0 0 1 ${x2} ${y2} L${x3} ${y3} A${r0} ${r0} 0 0 0 ${x0} ${y0} Z`;
};
const D = Math.PI / 4;
const GAP = (Math.PI / 180) * 1.5;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

export const Tank = ({ cx, cy, scale = 1 }) => (
  <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
    <rect x={-34} y={-24} width={68} height={48} rx={10} fill={C.text} />
    <rect x={0} y={-6} width={52} height={12} rx={4} fill="#c9d1e6" />
    <circle r={15} fill="#8e9dbf" />
  </g>
);

/**
 * Anillo de 8 sectores alrededor del tanque.
 *  mode 'quantum': cuña de amplitud (color por signo) + cono de probabilidad.
 *  mode 'classic': barras de probabilidad; `dead[i]` (0..1) las pasa a gris.
 *  mode 'outline': solo el contorno; `reveal` (0..8) cuántos sectores ya se ven.
 */
export const Ring = ({
  cx, cy, mode = 'quantum', amps, probs, dead, reveal = 8, highlight = -1,
  R0 = 70, L = 300, opacity = 1, labels = true, labelFn,
}) => {
  const items = [];
  for (let i = 0; i < 8; i++) {
    const a0 = i * D + GAP, a1 = (i + 1) * D - GAP, mid = (i + 0.5) * D;
    const p = clamp01(probs ? probs[i] : 0);
    const shown = clamp01(reveal - i);
    if (mode === 'outline') {
      items.push(<path key={'o' + i} d={wedge(cx, cy, a0, a1, R0, R0 + L)} fill="rgba(232,236,244,0.05)" stroke={C.guide} strokeWidth={2} opacity={shown} />);
    } else if (mode === 'quantum') {
      const a = amps ? amps[i] : 0;
      items.push(<path key={'a' + i} d={wedge(cx, cy, a0, a1, R0, R0 + Math.max(5, Math.min(1, Math.abs(a)) * L))} fill={a < 0 ? C.neg : C.pos} />);
      items.push(<path key={'p' + i} d={wedge(cx, cy, a0 + 0.07, a1 - 0.07, R0, R0 + Math.max(5, p * L))} fill={C.prob} opacity={0.6} />);
    } else {
      const d = dead ? clamp01(dead[i]) : 0;
      items.push(<path key={'l' + i} d={wedge(cx, cy, a0, a1, R0, R0 + Math.max(5, p * L))} fill={C.live} opacity={1 - d} />);
      if (d > 0) items.push(<path key={'d' + i} d={wedge(cx, cy, a0, a1, R0, R0 + 22)} fill={C.dead} opacity={d} />);
    }
    if (highlight === i) {
      items.push(<path key={'h' + i} d={wedge(cx, cy, a0, a1, R0 - 6, R0 + L + 8)} fill="none" stroke="#ffffff" strokeWidth={4} strokeDasharray="14 10" />);
    }
    if (labels && mode !== 'outline') {
      const [lx, ly] = pt(cx, cy, mid, R0 + L + 38);
      const isDead = mode === 'classic' && dead && dead[i] > 0.5;
      const txt = labelFn ? labelFn(i) : isDead ? '✕' : pct(p);
      items.push(<text key={'t' + i} x={lx} y={ly} fill={C.text} fontSize={30} fontFamily={FONT} textAnchor="middle" dominantBaseline="middle">{txt}</text>);
    }
  }
  return (
    <g opacity={opacity}>
      <circle cx={cx} cy={cy} r={R0 + L} fill="none" stroke={C.guide} strokeWidth={2} />
      {items}
      <Tank cx={cx} cy={cy} />
    </g>
  );
};
