import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import data from './data.json';
import { C, FONT, MONO, pct } from './theme.js';
import { Ring } from './Ring.jsx';
import { Caption, Chip, H2, Left, P, Rise, Scene, mix, prog } from './helpers.jsx';

const T = data.target;
const CX = 1400, CY = 540;

// ---------- 1. Portada ----------
export const Intro = ({ duration }) => {
  const f = useCurrentFrame();
  const k2 = data.quantum[2];
  const grow = prog(f, 20, 90);
  return (
    <Scene duration={duration}>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <Ring cx={CX} cy={CY} mode="quantum" amps={k2.amps.map((a) => a * grow)} probs={k2.probs.map((p) => p * grow)} labels={false} opacity={0.95} />
      </svg>
      <Left>
        <Rise at={0}><div style={{ fontSize: 34, letterSpacing: 6, fontWeight: 700, color: C.prob }}>CLÁSICO VS. CUÁNTICO</div></Rise>
        <Rise at={10}><div style={{ fontSize: 150, fontWeight: 900, letterSpacing: 6, lineHeight: 1 }}>COLLAPSE</div></Rise>
        <Rise at={30}><P size={48}>Encuentra al enemigo escondido en la niebla.</P></Rise>
      </Left>
    </Scene>
  );
};

// ---------- 2. El reto ----------
export const Challenge = ({ duration }) => {
  const f = useCurrentFrame();
  const reveal = interpolate(f, [10, 110], [0, 8], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const bars = prog(f, 120, 160);
  const eq = Array(8).fill(0.125 * bars);
  const q = prog(f, 110, 135);
  const [ex, ey] = [CX + Math.cos((T + 0.5) * Math.PI / 4) * 230, CY + Math.sin((T + 0.5) * Math.PI / 4) * 230];
  return (
    <Scene duration={duration}>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <Ring cx={CX} cy={CY} mode="outline" reveal={reveal} opacity={1 - bars} />
        <Ring cx={CX} cy={CY} mode="classic" probs={eq} dead={Array(8).fill(0)} opacity={bars} labelFn={() => '12,5 %'} />
        <g opacity={q} transform={`translate(${ex} ${ey})`}>
          <circle r={34} fill="none" stroke={C.neg} strokeWidth={4} strokeDasharray="10 8" />
          <text textAnchor="middle" dominantBaseline="central" fontSize={44} fontWeight={800} fill={C.neg} fontFamily={FONT}>?</text>
        </g>
      </svg>
      <Left>
        <Rise at={0}><H2>El reto</H2></Rise>
        <Rise at={20}><P>Un enemigo se esconde en la niebla.</P></Rise>
        <Rise at={55}><P>Está en <b style={{ color: C.prob }}>1 de 8 sectores</b> alrededor de tu tanque.</P></Rise>
        <Rise at={120}><P>A ciegas aciertas 1 de cada 8: <b style={{ color: C.prob }}>12,5 %</b>.</P></Rise>
      </Left>
    </Scene>
  );
};

// ---------- 3. Cañón clásico ----------
export const Classic = ({ duration }) => {
  const f = useCurrentFrame();
  const states = data.classic.map((c) => ({ probs: c.probs, dead: c.probs.map((p, i) => (c.discarded.includes(i) ? 1 : 0)) }));
  const starts = [0, 85, 175, 265];
  const s = mix(states, starts, 30, f);
  const caps = [
    'Sin consultas, el disparo va a ciegas: 12,5 %.',
    `Cada consulta revisa un sector y lo descarta. k = 1 → ${pct(data.classic[1].theory)}.`,
    `k = 2 → ${pct(data.classic[2].theory)}. La probabilidad se reparte entre los sectores que quedan.`,
    `k = 3 → ${pct(data.classic[3].theory)}. Siempre sube, pero despacio: (k+1)/8.`,
  ];
  return (
    <Scene duration={duration}>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <Ring cx={CX} cy={CY} mode="classic" probs={s.probs} dead={s.dead} />
      </svg>
      <Left>
        <Rise at={0}><H2>Cañón clásico</H2></Rise>
        <Rise at={0}><P color={C.live} weight={700}>Muestrear y descartar</P></Rise>
        <Caption text={caps[s.idx]} step={s.idx} startOfStep={starts[s.idx]} />
        <div style={{ display: 'flex', gap: 28, fontSize: 34, color: C.dim }}>
          <span style={{ color: C.live }}>■ posible</span><span style={{ color: C.dead }}>■ descartado</span>
        </div>
      </Left>
    </Scene>
  );
};

// ---------- 4. Cañón cuántico ----------
export const Quantum = ({ duration }) => {
  const f = useCurrentFrame();
  const q = data.quantum;
  const states = [
    { amps: q[0].amps, probs: q[0].probs },
    { amps: data.marker.amps, probs: data.marker.probs },
    { amps: q[1].amps, probs: q[1].probs },
    { amps: q[2].amps, probs: q[2].probs },
  ];
  const starts = [0, 120, 250, 390];
  const s = mix(states, starts, 40, f);
  const caps = [
    'Superposición: los 8 sectores tienen la misma amplitud.',
    'El marcador invierte el signo del sector buscado… pero las probabilidades no se mueven.',
    `El difusor hace que las amplitudes interfieran: la del sector marcado crece. 1 iteración → ${pct(q[1].probs[T])}.`,
    `2 iteraciones → ${pct(q[2].probs[T])}. Amplitud y probabilidad no son lo mismo.`,
  ];
  const hl = s.idx >= 1 ? T : -1;
  return (
    <Scene duration={duration}>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <Ring cx={CX} cy={CY} mode="quantum" amps={s.amps} probs={s.probs} highlight={hl} />
      </svg>
      <Left>
        <Rise at={0}><H2>Cañón cuántico</H2></Rise>
        <Rise at={0}><P color={C.pos} weight={700}>Amplificación de amplitud</P></Rise>
        <Caption text={caps[s.idx]} step={s.idx} startOfStep={starts[s.idx]} />
        <div style={{ fontSize: 34, color: C.text }}>
          Sector buscado: <b style={{ color: C.prob }}>{pct(s.probs[T])}</b>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Chip color={C.pos}>Amplitud positiva</Chip>
          <Chip color={C.neg}>Amplitud negativa</Chip>
          <Chip color={C.prob}>Probabilidad = amplitud al cuadrado</Chip>
        </div>
      </Left>
    </Scene>
  );
};

// ---------- 5. La trampa de k = 3 ----------
export const Trap = ({ duration }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const X0 = 960, BASE = 880, MAXH = 560, GW = 200;
  const bar = (k, kind) => {
    const v = kind === 'c' ? data.classic[k].theory : data.quantum[k].probs[T];
    const t = spring({ frame: f - 20 - k * 22 - (kind === 'q' ? 10 : 0), fps, config: { damping: 18, stiffness: 90 } });
    return { v, h: v * MAXH * Math.max(0, t), x: X0 + k * (GW + 30) + (kind === 'q' ? 84 : 0), kind, k };
  };
  const bars = [0, 1, 2, 3].flatMap((k) => [bar(k, 'c'), bar(k, 'q')]);
  const warn = prog(f, 150, 175);
  return (
    <Scene duration={duration}>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <line x1={X0 - 20} x2={1860} y1={BASE} y2={BASE} stroke={C.guide} strokeWidth={3} />
        {bars.map((b) => (
          <g key={b.kind + b.k}>
            <rect x={b.x} y={BASE - b.h} width={76} height={b.h} rx={8} fill={b.kind === 'c' ? C.live : C.pos} />
            <text x={b.x + 38} y={BASE - b.h - 14} fill={C.text} fontSize={26} fontFamily={FONT} textAnchor="middle" opacity={b.h > 4 ? 1 : 0}>{pct(b.v)}</text>
          </g>
        ))}
        {[0, 1, 2, 3].map((k) => (
          <text key={k} x={X0 + k * (GW + 30) + 80} y={BASE + 54} fill={C.text} fontSize={36} fontFamily={FONT} textAnchor="middle">k = {k}</text>
        ))}
        <rect x={X0 + 3 * (GW + 30) + 84 - 8} y={BASE - data.quantum[3].probs[T] * MAXH - 56} width={92} height={data.quantum[3].probs[T] * MAXH + 70} rx={12}
          fill="none" stroke={C.neg} strokeWidth={5} strokeDasharray="14 10" opacity={warn} />
        <g transform="translate(960 130)" fontFamily={FONT} fontSize={30}>
          <rect width={26} height={26} rx={6} fill={C.live} /><text x={42} y={22} fill={C.text}>Clásico: k consultas</text>
          <rect x={360} width={26} height={26} rx={6} fill={C.pos} /><text x={402} y={22} fill={C.text}>Cuántico: k iteraciones</text>
        </g>
      </svg>
      <Left>
        <Rise at={0}><H2>Más no siempre es mejor</H2></Rise>
        <Rise at={30}><P>Con 8 sectores y sin ruido, el cuántico llega a <b style={{ color: C.pos }}>{pct(data.quantum[2].probs[T])}</b> con k = 2.</P></Rise>
        <Rise at={150}><P color={C.neg} weight={700}>Con k = 3 te pasas: la amplitud “da la vuelta” y el acierto cae a {pct(data.quantum[3].probs[T])}.</P></Rise>
      </Left>
    </Scene>
  );
};

// ---------- 6. Comparación justa ----------
export const Fair = ({ duration }) => (
  <Scene duration={duration}>
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 34 }}>
      <Rise at={0}><H2>Una comparación justa</H2></Rise>
      {['Mismo sensor', 'Misma energía por consulta o iteración', 'Mismo criterio de acierto'].map((t, i) => (
        <Rise key={t} at={25 + i * 25}>
          <div style={{ fontSize: 50, padding: '14px 40px', border: `2px solid ${C.guide}`, borderRadius: 999, background: C.bgSoft }}>{t}</div>
        </Rise>
      ))}
      <Rise at={110}><P size={34} color={C.dim}>Las cifras salen del simulador, no están escritas a mano.</P></Rise>
    </div>
  </Scene>
);

// ---------- 7. Pantalla final ----------
export const Ending = ({ duration }) => {
  const f = useCurrentFrame();
  const lines = data.qiskit.split('\n').slice(0, 13);
  const shown = Math.floor(interpolate(f, [30, 200], [0, lines.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const rows = [
    ['Clásico', '2', '3/8', '37,5 %', pct(data.classic[2].theory)],
    ['Cuántico', '2', '7/8', '87,5 %', pct(data.quantum[2].probs[T])],
  ];
  const cell = { padding: '10px 18px', textAlign: 'right', borderBottom: `1px solid ${C.guide}`, fontSize: 32 };
  return (
    <Scene duration={duration}>
      <Left>
        <Rise at={0}><H2>Al final: observado vs. teoría</H2></Rise>
        <Rise at={20}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead><tr>{['Cañón', 'k', 'Aciertos', 'Observado', 'Teórico'].map((h, i) => <th key={h} style={{ ...cell, textAlign: i ? 'right' : 'left', color: C.dim, fontWeight: 600 }}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i} style={{ ...cell, textAlign: i ? 'right' : 'left' }}>{c}</td>)}</tr>)}</tbody>
          </table>
          <div style={{ fontSize: 26, color: C.prob, marginTop: 10 }}>Ejemplo ilustrativo de una partida corta</div>
        </Rise>
        <Rise at={90}><P size={38}>Con pocos disparos lo observado se aleja de la teoría: <b>una partida no demuestra nada</b>.</P></Rise>
      </Left>
      <div style={{ position: 'absolute', left: 1010, top: 150, width: 800, height: 780, overflow: 'hidden', background: '#080b16', borderRadius: 20, padding: 28, boxSizing: 'border-box', border: `1px solid ${C.guide}` }}>
        <div style={{ fontSize: 30, fontWeight: 700, color: C.pos, marginBottom: 14, fontFamily: FONT }}>Exporta tu cañón a Qiskit</div>
        <pre style={{ margin: 0, fontFamily: MONO, fontSize: 25, lineHeight: 1.45, color: C.text, whiteSpace: 'pre-wrap' }}>{lines.slice(0, shown).join('\n')}</pre>
      </div>
    </Scene>
  );
};

// ---------- 8. Cierre ----------
export const Outro = ({ duration }) => (
  <Scene duration={duration}>
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 36, textAlign: 'center', padding: '0 200px' }}>
      <Rise at={0}><div style={{ fontSize: 90, fontWeight: 800, lineHeight: 1.15 }}>Aprendes probabilidad cuántica porque te sirve para ganar.</div></Rise>
      <Rise at={50}><div style={{ fontSize: 56, fontWeight: 900, letterSpacing: 8, color: C.pos }}>COLLAPSE</div></Rise>
      <Rise at={90}><P size={28} color={C.dim}>Simulación didáctica de 3 qubits: no es hardware cuántico ni una ventaja cuántica real.</P></Rise>
    </div>
  </Scene>
);
