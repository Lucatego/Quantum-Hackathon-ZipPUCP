# Video explicativo de Collapse (Remotion)

Proyecto aparte del juego: **no forma parte del despliegue** (GitHub Pages sirve solo la raíz del juego). Genera un video de ~103 s, 1920×1080, 30 fps, sin audio, en español, con escenas en 3D (Three.js vía `@remotion/three`).

## Regenerarlo
```bash
cd video
npm install                 # una vez (la primera vez Remotion baja un navegador headless)
npm run data                # regenera src/data.json con los números reales de js/quantum.js
npm run studio              # vista previa interactiva
npm run render              # → out/collapse-explainer.mp4
npm run still -- --frame=930   # un solo fotograma → out/frame.png (útil para revisar)
```

## Estructura
| Archivo | Qué es |
|---|---|
| `scripts/make-data.js` | Corre `js/quantum.js` y guarda amplitudes, probabilidades y el Qiskit en `src/data.json`. **Ninguna cifra del video está escrita a mano**, salvo el ejemplo ilustrativo de la pantalla final (marcado como tal en pantalla). |
| `src/Ring.jsx` | El anillo de 8 sectores en SVG, con el mismo orden y colores que el juego. |
| `src/scenes.jsx`, `src/scenes2.jsx` | Las 10 escenas (`scenes2.jsx`: "Cómo se juega" y "Las balas", ambas con 3D). |
| `src/Scene3D.jsx` | Componentes 3D: anillo de amplitudes, tanque, suelo y cámara. |
| `src/Explainer.jsx` | Orden y duración de las escenas (`SCENES`). |
| `src/theme.js` | Paleta y tipografía (misma que `js/ui.js`). |

## Escenas (fotogramas a 30 fps)
1. Portada, 3D (0–150) · 2. El reto (150–420) · 3. Cómo se juega, 3D (420–750) · 4. Cañón clásico (750–1110) · 5. Cañón cuántico (1110–1650) · 6. Más no siempre es mejor, k = 3 (1650–1980) · 7. Las balas, 3D (1980–2400) · 8. Comparación justa (2400–2580) · 9. Pantalla final y Qiskit (2580–2880) · 10. Cierre (2880–3090).

## Notas
- **Balas:** el texto sale de `js/game.js` (bala 0 cura a quien dispara, bala 1 daña, la zona ≈ vuelve la bala "superpuesta"). La regla de la zona está escrita a mano en el juego, no sale del simulador; el video lo dice. Las barras de vida son un ejemplo.
- Los textos siguen el checklist de la sección 7 del brief: no afirman ventaja cuántica real y dicen que es una simulación didáctica de 3 qubits.
- **Licencia:** Remotion tiene condiciones de uso propias según el tamaño del equipo. Revisar https://www.remotion.dev/license antes de usarlo fuera de la hackathon.
- Para añadir voz o música: `<Audio src={staticFile('...')} />` dentro de `Explainer.jsx` (ver la documentación de Remotion).
