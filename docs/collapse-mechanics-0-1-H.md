# Collapse: nuevas mecánicas de balas, vida y nodos H

Este documento define la nueva capa de gameplay para que sirva como base de implementación en la aplicación. La idea es introducir un sistema más "curioso" y menos lineal, donde el mapa no solo tiene balas normales, sino dos tipos de disparos con efectos opuestos y un elemento especial tipo Hadamard que altera la naturaleza de los proyectiles.

## 1. Objetivo del cambio

Queremos que el mapa tenga una lógica más rica y menos binaria:

- Las balas `0` curan un poco al jugador.
- Las balas `1` dañan normalmente.
- Existen zonas o elementos `H` en el piso que alteran la superposición de las balas.
- Cuando un disparo o una colisión entra en una zona `H`, la bala puede volverse "superpuesta" y entonces puede sanar o dañar según una regla probabilística o contextual.
- Esto hace que el combate se vuelva más táctico, con decisiones de riesgo, gestión de HP y manipulación del tablero.

La idea principal es que la mecánica no sea solo "disparo > daño". Debe sentirse como una mini-"lógica cuántica" aplicada al juego: un estado concreto que puede cambiar según el entorno.

---

## 2. Entidades nuevas

### 2.1 Balas tipo `0`

Las balas `0` funcionan como proyectiles de curación.

Reglas:
- al impactar al jugador, recupera una pequeña cantidad de HP
- la recuperación no excede el máximo de vida
- si el jugador ya está al máximo, la bala puede ser absorbida sin efecto o causar un pequeño efecto visual de "resistido"

Valores sugeridos:
- daño = `-6` a `-10` en términos de HP recibido, pero como efecto positivo en la lógica del jugador
- `heal = 6` por impacto es un buen punto de partida
- Cap: `HP = min(HP_MAX, HP + heal)`

Ejemplo:
```js
if (bullet.type === 0 && bullet.hitPlayer) {
  player.hp = Math.min(player.maxHp, player.hp + 8);
}
```

### 2.2 Balas tipo `1`

Las balas `1` son el comportamiento estándar de daño.

Reglas:
- al impactar al jugador, quita HP
- al impactar a un enemigo, quita HP también si el juego permite disparos de apoyo o daño cruzado
- si se quiere mantener la idea de arena, pueden ser proyectiles de ataque directo y simple

Valores sugeridos:
- `damage = 10` a `15`
- si juegan con "cuerpo a cuerpo" o "tanque" puede ser `12`

Ejemplo:
```js
if (bullet.type === 1 && bullet.hitPlayer) {
  player.hp = Math.max(0, player.hp - 12);
}
```

---

## 3. El elemento `H` en el piso

Se añade una zona especial en el mapa, identificada por una letra `H` o un icono visual del tipo `H` en el suelo.

### 3.1 Qué es la `H`

La `H` representa una zona tipo Hadamard / superposición:
- puede estar en una pequeña área circular o en una casilla del mapa
- puede ser permanente o temporal
- puede activarse solo cuando una bala o un jugador la atraviesa

La `H` debe ser visualmente clara para el jugador. No debe ser un elemento invisible.

### 3.2 Efecto base

Cuando una bala entra en el área `H`:
- la bala cambia de estado a `superposed`
- en ese estado, su efecto ya no es solo `0` o `1` puro
- puede hacer daño o curar según una regla probabilística o contextual

Propuesta de regla:
- si la bala tiene tipo `0` y entra en `H`, tiene una probabilidad de volverse `healing` o `damage`
- si la bala tiene tipo `1` y entra en `H`, puede convertirse en un daño reforzado o incluso en una curación parcial

Esto crea una zona de inestabilidad, donde el jugador debe decidir si quiere atraerse o evitarla.

### 3.3 Regla sugerida para la `H`

Se puede modelar así:

```js
if (bullet.inHazardH) {
  bullet.superposed = true;
  bullet.hazardState = Math.random() < 0.5 ? 'heal' : 'damage';
}
```

Luego, al impactar:

```js
if (bullet.superposed) {
  if (bullet.hazardState === 'heal') {
    player.hp = Math.min(player.maxHp, player.hp + 10);
  } else {
    player.hp = Math.max(0, player.hp - 12);
  }
}
```

Esto crea un efecto “curioso” y poco lineal: la misma bala puede sanar o dañar dependiendo de la interacción con la zona `H`.

---

## 4. Superposición de balas

La parte más rica es la superposición entre balas. No basta con una sola bala entrando en `H`; también puede ocurrir que dos balas diferentes se mezclen en el mismo punto o cercanas entre sí.

### 4.1 Idea general

Si dos proyectiles se cruzan o quedan dentro del mismo radio de colisión:
- si uno es `0` y otro es `1`, se crea una bala superpuesta
- la nueva bala mantiene un estado híbrido (`mixed`)
- al impactar, puede sanar o dañar según una regla base de probabilidad

Ejemplo:
```js
if (distance(bulletA, bulletB) < 12) {
  if ((bulletA.type === 0 && bulletB.type === 1) || (bulletA.type === 1 && bulletB.type === 0)) {
    createSuperposedBullet(bulletA.x, bulletA.y, bulletA.playerId);
  }
}
```

### 4.2 Regla de superposición

La bala superpuesta puede decidir su resultado usando una regla simple:
- 50% chance de sanar
- 50% chance de dañar
- o incluso usar un valor de peso según la cantidad de balas `0` y `1`

Ejemplo de cálculo:
```js
const healWeight = countZeroBullets;
const damageWeight = countOneBullets;
const total = healWeight + damageWeight;
const chanceHeal = healWeight / total;
const outcome = Math.random() < chanceHeal ? 'heal' : 'damage';
```

Esto agrega una sensación de “estado cuántico aleatorio”, pero con lógica clara para el juego y para la implementación.

### 4.3 Aporte de la `H`

La `H` puede hacer que la superposición sea más fuerte o más inestable:
- si una bala superpuesta entra en `H`, la probabilidad de curación aumenta
- si una bala superpuesta sale de `H`, vuelve a ser más dañina o más inestable
- la `H` puede influir en la fase del proyectil, de modo que el mismo disparo “sabe” si debe sanar o dañar

Ejemplo:
```js
if (bullet.superposed && bullet.inHazardH) {
  bullet.phase = bullet.phase + 1;
  if (bullet.phase % 2 === 0) {
    bullet.outcome = 'heal';
  } else {
    bullet.outcome = 'damage';
  }
}
```

---

## 5. Reglas de juego sugeridas

### 5.1 Vida y límite de HP

La vida del jugador debe tener cota máxima:
```js
player.hp = Math.min(player.maxHp, player.hp + healAmount);
```

Esto garantiza que las balas `0` no conviertan al jugador en invulnerable ni rompan el balance.

### 5.2 Curación ligera

La bomba o bala `0` no debe “sanar demasiado”. Debe ser una curación útil, pero no una solución definitiva.

Sugerencia:
- `heal = 6` a `10`
- no más de un 20% del HP máximo por impacto

### 5.3 Daño normal

La bala `1` sigue siendo la fuente principal de peligro.
- debe causar una amenaza clara
- debe permitir que el jugador pueda reaccionar
- no debe ser tan fuerte que la curación `0` no importe

---

## 6. Visualización sugerida

Para que la idea se entienda, cada tipo de bala debe verse distinto:

- bala `0`: color verde / cyan / celeste tenue
- bala `1`: color rojo / naranja / magenta
- bala superpuesta: color violeta / blanco intermitente / efecto brillante
- zona `H`: borde con brillo especial, con matriz de puntos, icono `H`, o textura de superposición

Visualmente:
- `0` debería sentirse “vital” o “saludable”
- `1` debería sentirse “peligrosa”
- `H` debería sentirse “inestable” o “cuántica”

---

## 7. Implementación recomendada en JS

### 7.1 Estructura de una bala

```js
{
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  type: 0 | 1,
  radius: 5,
  ttl: 120,
  superposed: false,
  phase: 0,
  inHazardH: false,
  outcome: null
}
```

### 7.2 Estructura de una zona `H`

```js
{
  x: 0,
  y: 0,
  radius: 40,
  kind: 'H',
  pulse: 0,
  active: true
}
```

### 7.3 Lógica de impacto

```js
function resolveBulletImpact(bullet, target) {
  if (bullet.superposed) {
    if (bullet.outcome === 'heal') {
      target.hp = Math.min(target.maxHp, target.hp + 10);
    } else {
      target.hp = Math.max(0, target.hp - 12);
    }
    return;
  }

  if (bullet.type === 0) {
    target.hp = Math.min(target.maxHp, target.hp + 8);
  }

  if (bullet.type === 1) {
    target.hp = Math.max(0, target.hp - 12);
  }
}
```

### 7.4 Lógica cuando entra en `H`

```js
function applyHazardH(bullet, hazard) {
  if (!hazard.active) return;

  if (distance(bullet, hazard) < hazard.radius) {
    bullet.inHazardH = true;
    bullet.superposed = true;
    bullet.phase = Math.random() < 0.5 ? 0 : 1;
    bullet.outcome = bullet.phase === 0 ? 'heal' : 'damage';
  }
}
```

---

## 8. Idea de juego para la presentación

La mecánica debe sentirse como una "mini-hipótesis cuántica" dentro del mapa:

- el jugador descubre que una bala `0` lo sana
- el jugador descubre que una bala `1` lo daña
- el jugador descubre que una zona `H` puede cambiar la naturaleza de una bala
- el jugador se da cuenta de que la misma bala puede morir o curar dependiendo de cómo interactúa con el entorno

Esto hace que el mapa se sienta vivo, experimental y más cercano a una idea de QML / interferencia / superposición, sin perder la jugabilidad.

---

## 9. Regla final recomendada para la demo

La regla más clara y sencilla para la aplicación es esta:

- `0` = cura leve
- `1` = daño normal
- `H` = zona de superposición / inestabilidad
- dentro de `H`, la bala puede volverse `heal` o `damage` aleatoriamente, o según la suma de balas cercanas
- si dos balas `0` y `1` se mezclan, el resultado es una bala híbrida con un efecto incierto, pero con lógica visible

Eso mantiene el gameplay más interesante y hace que la mecánica “cuántica” se sienta real sin romper la jugabilidad.

---

## 10. Resumen rápido

La idea del sistema es:

- mover el combate de un ataque lineal a una interacción con varios estados
- hacer que la salud del jugador dependa de decisiones tácticas, no solo del daño directo
- permitir que el mapa tenga elementos con lógica no determinista
- usar `H` como desencadenante de estados híbridos
- dejar claro visualmente que hay un equilibrio entre riesgo y cura

Esto convierte la arena en algo más que un mapa de disparos: en un laboratorio pequeño donde la mecánica del juego refleja el tipo de idea que queremos comunicar.
