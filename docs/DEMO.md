# Ruta de la demo en vivo (60–90 s)

**URL de la demo:** https://lucatego.github.io/Quantum-Hackathon-ZipPUCP/?demo
**Respaldo:** la misma URL abierta en una segunda pestaña, y `index.html?demo` en local (funciona sin internet).

`?demo` arranca junto a la niebla con un bot escondido adentro, más regeneración de energía (30/s) y menos daño de los bots. **No cambia la física:** los dos cañones pagan lo mismo y las probabilidades salen del mismo simulador.

## Antes de subir al escenario
- [ ] Abrir la URL con `?demo` y dejarla en la pantalla de inicio.
- [ ] Zoom del navegador al 100 % y pantalla completa (F11).
- [ ] Para que se vean todas las pistas (salen una vez por sesión), recargar la página justo antes de empezar.

## Guion (mientras Alvaro narra)

| Seg. | Acción | Qué se ve | Qué dice el narrador |
|---|---|---|---|
| 0–5 | Clic en **Jugar** | El tanque junto a la niebla y el radar parpadeando | "Hay alguien en la niebla, pero no sabemos en cuál de los 8 sectores" |
| 5–15 | `1` (clásico), `E` hasta **k = 2**, `Espacio` | 2 sectores en gris y el resto en ~17 %, o 100 % si una consulta lo encontró | "El clásico revisa y descarta: con 2 consultas acierta 37,5 %" |
| 15–30 | `2` (cuántico), k = 2, `Espacio` | Cuñas de amplitud y un cono grande en un sector | "Misma energía, mismo sensor: las amplitudes interfieren y el acierto sube a ~95 %" |
| 30–45 | `E` hasta **k = 3**, `Espacio` (2–3 veces) | El cono se reparte y falla | "Más iteraciones no siempre ayudan: con k = 3 cae a 33 %" |
| 45–60 | Caminar hasta la **tormenta** (violeta), k = 2, `Espacio` | Falla más seguido | "En la tormenta el sensor miente: eso afecta a los dos cañones" |
| 60–75 | Dejarse eliminar o terminar | Pantalla final: tabla, tarjeta y Qiskit | "Lo observado vs. la teoría, y el circuito exacto listo para Qiskit" |
| 75–90 | (Opcional) **Copiar código** y pegarlo en Colab | Los conteos del simulador Aer | "Este es tu cañón corriendo en Qiskit" |

## Si algo falla
- **El radar no se activa:** caminar hacia la niebla más cercana (los bots se esconden ahí).
- **Sin energía:** bajar k con `Q` o esperar 2 s.
- **La página no carga:** usar la pestaña de respaldo o el `index.html` local.
- **Sale un fallo con k = 2:** es el ~5 % esperado más el ruido del circuito. Decirlo: "una partida no demuestra nada".
