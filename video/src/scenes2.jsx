import React from 'react';
import * as THREE from 'three';
import { interpolate, useCurrentFrame } from 'remotion';
import data from './data.json';
import { C } from './theme.js';
import { COL, Ground, Ring3D, Stage, Tank3D } from './Scene3D.jsx';
import { Caption, Chip, H2, Left, P, Rise, Scene, prog } from './helpers.jsx';

const clamp = (v) => Math.max(0, Math.min(1, v));
const KEY = { fontSize: 28, fontWeight: 700, minWidth: 54, height: 54, padding: '0 14px', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: '#1c2440', border: `2px solid ${C.guide}`, borderBottomWidth: 5, color: C.text };

const Row = ({ keys, children, at }) => (
  <Rise at={at}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 32 }}>
      <div style={{ display: 'flex', gap: 8, minWidth: 330 }}>{keys.map((k) => <span key={k} style={KEY}>{k}</span>)}</div>
      <span>{children}</span>
    </div>
  </Rise>
);

// ---------- Cómo se juega ----------
export const HowTo = ({ duration }) => {
  const f = useCurrentFrame();
  const k0 = data.quantum[0];
  const ang = 0.7 + f * 0.011;
  return (
    <Scene duration={duration}>
      <Stage width={900} height={1080} style={{ left: 1020, top: 0 }} camPos={[8.6 * Math.cos(ang), 5.4, 8.6 * Math.sin(ang)]}>
        <Ground />
        <Ring3D amps={k0.amps.map((a) => a * 0.5)} probs={k0.probs} />
        <Tank3D yaw={f * 0.02} />
      </Stage>
      <div style={{ position: 'absolute', left: 90, top: 90, width: 940, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Rise at={0}><H2>Cómo se juega</H2></Rise>
        <Rise at={15}><P size={36}>Si ves al enemigo, dispara. Si se esconde en la niebla y el radar lo detecta, <b style={{ color: C.prob }}>pulsa Espacio</b> para buscarlo.</P></Rise>
        <div style={{ height: 6 }} />
        <Row at={55} keys={['W', 'A', 'S', 'D']}>Mover</Row>
        <Row at={75} keys={['←', '→']}>Apuntar (o con el mouse)</Row>
        <Row at={95} keys={['F']}>Disparar (o clic)</Row>
        <Row at={115} keys={['Espacio']}>Buscar en la niebla</Row>
        <Row at={135} keys={['1', '2']}>Cañón clásico / cuántico</Row>
        <Row at={155} keys={['Q', 'E']}>Bajar / subir k (0 a 3)</Row>
        <Row at={175} keys={['Z', 'X']}>Bala 0 / bala 1</Row>
      </div>
    </Scene>
  );
};

// ---------- Las balas ----------
const ENEMY = [2.8, 0, 0], ME = [-2.8, 0, 0];
const lerpColor = (a, b, t) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), clamp(t)).getHexString();

const Bullet = ({ x, color }) => (
  <group>
    <mesh position={[x, 0.45, 0]}><sphereGeometry args={[0.2, 24, 24]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} /></mesh>
    {[1, 2, 3].map((n) => (
      <mesh key={n} position={[x - 0.32 * n, 0.45, 0]}><sphereGeometry args={[0.2 - n * 0.04, 16, 16]} /><meshBasicMaterial color={color} transparent opacity={0.45 - n * 0.1} /></mesh>
    ))}
  </group>
);
const Flash = ({ at, f, position, color }) => {
  const t = clamp((f - at) / 16);
  if (t <= 0 || t >= 1) return null;
  return <mesh position={[position[0], 0.45, position[2]]}><sphereGeometry args={[0.25 + t * 0.9, 24, 24]} /><meshBasicMaterial color={color} transparent opacity={0.6 * (1 - t)} /></mesh>;
};

const Bar = ({ label, frac, color, pop, popColor }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 30 }}>
    <div style={{ width: 250, color: C.dim }}>{label}</div>
    <div style={{ width: 360, height: 26, borderRadius: 13, background: 'rgba(232,236,244,0.14)', overflow: 'hidden' }}>
      <div style={{ width: `${clamp(frac) * 100}%`, height: '100%', background: color }} />
    </div>
    <div style={{ width: 90, fontWeight: 800, color: popColor, opacity: pop }}>{pop > 0 ? (popColor === COL.bullet0 ? '+8' : '−12') : ''}</div>
  </div>
);

export const Bullets = ({ duration }) => {
  const f = useCurrentFrame();
  const travel = (s, e) => ME[0] + 0.7 + (ENEMY[0] - 0.9 - (ME[0] + 0.7)) * clamp((f - s) / (e - s));
  // Fase 1: bala 1 daña. Fase 2: bala 0 cura a quien dispara. Fase 3: la zona ≈ la vuelve superpuesta.
  const b1 = f >= 40 && f < 100, b0 = f >= 150 && f < 210, b3 = f >= 270 && f < 350;
  const x3 = travel(270, 350);
  const zone = prog(f, 235, 265);
  const hpEnemy = 1 - 0.24 * prog(f, 100, 118);
  const hpMe = 0.62 + 0.16 * prog(f, 210, 228);
  const pop = (at) => clamp(1 - Math.abs(f - (at + 24)) / 30) * (f >= at ? 1 : 0);
  const starts = [0, 40, 140, 245];
  const idx = starts.reduce((n, s, i) => (f >= s ? i : n), 0);
  const caps = [
    'Por el mapa hay balas 0 y 1. Z y X cambian la bala activa; el disparo normal usa la activa.',
    'Bala 1: daña a quien impacta (−12 de vida).',
    'Bala 0: cura a quien dispara (+8). Nunca cura al enemigo.',
    'Zona inestable ≈: al cruzarla, la bala queda superpuesta y puede curar o dañar.',
  ];
  return (
    <Scene duration={duration}>
      <Stage width={1100} height={1080} style={{ left: 820, top: 0 }} camPos={[0, 6.2, 10.4]} camTarget={[0, 0.2, 0]}>
        <Ground radius={3.9} opacity={0.75} />
        <mesh position={[0, 0.03, 0]} scale={[1, 1, 1]}>
          <cylinderGeometry args={[1.15, 1.15, 0.06, 48]} />
          <meshBasicMaterial color={COL.superposed} transparent opacity={0.4 * zone} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.07, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.15, 0.03, 12, 64]} />
          <meshBasicMaterial color={COL.superposed} transparent opacity={zone} />
        </mesh>
        <Tank3D position={ME} />
        <Tank3D position={ENEMY} yaw={Math.PI} color="#ffc2b5" dark="#b36b6b" />
        {b1 && <Bullet x={travel(40, 100)} color={COL.bullet1} />}
        {b0 && <Bullet x={travel(150, 210)} color={COL.bullet0} />}
        {b3 && <Bullet x={x3} color={lerpColor(COL.bullet1, COL.superposed, (x3 + 1.1) / 0.6)} />}
        <Flash at={100} f={f} position={ENEMY} color={COL.bullet1} />
        <Flash at={210} f={f} position={ENEMY} color={COL.bullet0} />
        <Flash at={350} f={f} position={ENEMY} color={COL.superposed} />
      </Stage>
      <div style={{ position: 'absolute', left: 90, top: 70, width: 800, display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Rise at={0}><H2>Las balas</H2></Rise>
        <Caption text={caps[idx]} step={idx} startOfStep={starts[idx]} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
          <Bar label="Tu vida" frac={hpMe} color={COL.bullet0} pop={pop(210)} popColor={COL.bullet0} />
          <Bar label="Vida del enemigo" frac={hpEnemy} color={COL.bullet1} pop={pop(100)} popColor={COL.bullet1} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
          <Chip color={COL.bullet0}>Bala 0: cura a quien dispara</Chip>
          <Chip color={COL.bullet1}>Bala 1: daña al impactado</Chip>
          <Chip color={COL.superposed}>Bala superpuesta: puede curar o dañar</Chip>
        </div>
        <div style={{ fontSize: 26, color: C.dim, opacity: prog(f, 300, 330) }}>La regla de la zona ≈ es del juego; no sale del simulador cuántico. Las barras de vida son un ejemplo.</div>
      </div>
    </Scene>
  );
};
