import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';

// Mismos colores que el juego y que js/intro3d.js
export const COL = { pos: '#4cc9f0', neg: '#ff6b9d', prob: '#ffd166', ground: '#1a2038', tank: '#e8ecf4', tankDark: '#8e9dbf', bullet0: '#7ef7c7', bullet1: '#ff8c7b', superposed: '#d39bff' };

// Cuña anular extruida hacia +y. Sector i = [i·45°, (i+1)·45°) desde +x, sentido horario visto desde arriba (y del canvas = +z).
const wedgeGeometry = (r0, r1, a0, a1) => {
  const s = new THREE.Shape();
  const steps = 8;
  for (let i = 0; i <= steps; i++) { const a = a0 + ((a1 - a0) * i) / steps; s[i ? 'lineTo' : 'moveTo'](r1 * Math.cos(a), -r1 * Math.sin(a)); }
  for (let i = steps; i >= 0; i--) { const a = a0 + ((a1 - a0) * i) / steps; s.lineTo(r0 * Math.cos(a), -r0 * Math.sin(a)); }
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  return g;
};

const GAP = (Math.PI / 180) * 1.5;
const R0 = 0.9, R1 = 2.1, HT = 2.0;

const Column = ({ i, amp, prob }) => {
  const a0 = (i * Math.PI) / 4 + GAP, a1 = ((i + 1) * Math.PI) / 4 - GAP;
  const col = useMemo(() => wedgeGeometry(R0, R1, a0, a1), [a0, a1]);
  const cone = useMemo(() => wedgeGeometry(R0 - 0.1, R1 - 0.2, a0 + Math.PI / 20, a1 - Math.PI / 20), [a0, a1]);
  const h = Math.max(0.03, Math.min(1, Math.abs(amp)) * HT);
  return (
    <group>
      <mesh geometry={col} scale={[1, h, 1]} position={[0, amp < 0 ? -h : 0, 0]}>
        <meshStandardMaterial color={amp < 0 ? COL.neg : COL.pos} roughness={0.45} />
      </mesh>
      <mesh geometry={cone} scale={[1, Math.max(0.03, Math.min(1, prob) * HT), 1]}>
        <meshBasicMaterial color={COL.prob} transparent opacity={0.5} depthWrite={false} />
      </mesh>
    </group>
  );
};

export const Ring3D = ({ amps, probs }) => (
  <group>
    {amps.map((a, i) => <Column key={i} i={i} amp={a} prob={probs[i]} />)}
  </group>
);

export const Tank3D = ({ color = COL.tank, dark = COL.tankDark, yaw = 0, position = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={[0, yaw, 0]} scale={scale}>
    <mesh position={[0, 0.11, 0]}><boxGeometry args={[0.9, 0.22, 0.7]} /><meshStandardMaterial color={color} roughness={0.5} /></mesh>
    <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.24, 0.28, 0.16, 6]} /><meshStandardMaterial color={dark} roughness={0.5} /></mesh>
    <mesh position={[0.4, 0.3, 0]}><boxGeometry args={[0.62, 0.09, 0.09]} /><meshStandardMaterial color={color} roughness={0.4} /></mesh>
  </group>
);

export const Ground = ({ radius = 2.8, opacity = 0.7 }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
    <circleGeometry args={[radius, 64]} />
    <meshBasicMaterial color={COL.ground} transparent opacity={opacity} />
  </mesh>
);

// La cámara se calcula afuera (a partir del fotograma) y se aplica aquí.
const Rig = ({ position, target }) => {
  const camera = useThree((s) => s.camera);
  camera.position.set(...position);
  camera.lookAt(...target);
  return null;
};

export const Stage = ({ width, height, camPos, camTarget = [0, 0.4, 0], fov = 40, style, children }) => (
  <div style={{ position: 'absolute', ...style }}>
    <ThreeCanvas width={width} height={height} camera={{ fov, near: 0.1, far: 60, position: camPos }}>
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 6, 2]} intensity={1.1} />
      <Rig position={camPos} target={camTarget} />
      {children}
    </ThreeCanvas>
  </div>
);
