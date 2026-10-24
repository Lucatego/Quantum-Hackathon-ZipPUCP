# Video explicativo de Collapse (Remotion)

Proyecto aparte del juego: **no forma parte del despliegue** (GitHub Pages sirve solo la raíz del juego). Genera un video de ~78 s, 1920×1080, 30 fps, sin audio, en español.

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
| `src/scenes.jsx` | Las 8 escenas. |
| `src/Explainer.jsx` | Orden y duración de las escenas (`SCENES`). |
| `src/theme.js` | Paleta y tipografía (misma que `js/ui.js`). |

## Escenas (fotogramas a 30 fps)
1. Portada (0–150) · 2. El reto (150–420) · 3. Cañón clásico (420–780) · 4. Cañón cuántico (780–1320) · 5. Más no siempre es mejor, k = 3 (1320–1650) · 6. Comparación justa (1650–1830) · 7. Pantalla final y Qiskit (1830–2130) · 8. Cierre (2130–2340).

## Notas
- Los textos siguen el checklist de la sección 7 del brief: no afirman ventaja cuántica real y dicen que es una simulación didáctica de 3 qubits.
- **Licencia:** Remotion tiene condiciones de uso propias según el tamaño del equipo. Revisar https://www.remotion.dev/license antes de usarlo fuera de la hackathon.
- Para añadir voz o música: `<Audio src={staticFile('...')} />` dentro de `Explainer.jsx` (ver la documentación de Remotion).
