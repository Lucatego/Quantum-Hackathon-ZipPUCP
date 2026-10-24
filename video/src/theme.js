// Misma paleta que js/ui.js, para que el video y el juego hablen el mismo idioma visual.
export const C = {
  bg: '#0e1220',
  bgSoft: '#151b30',
  text: '#e8ecf4',
  dim: 'rgba(232,236,244,0.65)',
  pos: '#4cc9f0',   // amplitud +
  neg: '#ff6b9d',   // amplitud −
  prob: '#ffd166',  // probabilidad
  live: '#80ed99',  // clásico: sector posible
  dead: '#8e9195',  // clásico: sector descartado
  guide: 'rgba(232,236,244,0.25)',
};

export const FONT = "'Segoe UI', system-ui, -apple-system, Arial, sans-serif";
export const MONO = "Consolas, 'Courier New', monospace";

export const FPS = 30;
export const W = 1920;
export const H = 1080;

// Un decimal y coma, como en el juego: 94,5 %
export const pct = (p) => (p * 100).toFixed(1).replace('.', ',') + ' %';
