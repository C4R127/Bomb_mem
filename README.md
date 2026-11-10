# 💣 Boom Mem

### Desactiva la bomba

Juego de memoria en **pixel art** hecho con **[Phaser 3](https://phaser.io/)**.
Observa la secuencia de luces, repítela antes de que el reloj llegue a cero… y no te equivoques.

**🎮 Jugar online:** <https://c4r127.github.io/Bomb_mem/>

---

## ▶️ Cómo jugarlo

El juego no necesita instalación ni compilación (Phaser se carga desde CDN),
pero **sí necesita un servidor local**: los navegadores bloquean la carga de
imágenes PNG si abres `index.html` directamente con doble clic (`file://`).

```bash
python3 -m http.server 8000
```

Después abre <http://localhost:8000> en el navegador.

Otras opciones: la extensión *Live Server* de VS Code, `npx serve`, o publicar
el repositorio en **GitHub Pages** (Settings → Pages → rama principal, carpeta raíz).

---

## 🎮 Controles

| Acción | Ratón / táctil | Teclado |
|---|---|---|
| Elegir dificultad | Tocar una fila | ↑ ↓ / W S |
| Empezar | Botón **JUGAR** (o tocar otra vez la dificultad elegida) | Enter / Espacio |
| Ver ayuda | Botón **CÓMO JUGAR** | H |
| Pulsar una tecla de la bomba | Tocar la tecla | 1 – 9 (por **posición**: 1-2-3 arriba, 7-8-9 abajo) |
| Cortar un cable | Tocar el cable | Z (rojo) · X (azul) · C (amarillo) — o ← ↑ → |
| Sonido sí/no | Icono del altavoz | M |
| Volver a la portada | — | Esc |

---

## 🧠 Reglas y novedades respecto a la versión original

### Dificultades
| | Fácil | Normal | Difícil | Experto |
|---|---|---|---|---|
| Luces en el nivel 1 | 3 | 3 | 4 | 5 |
| La secuencia crece… | +1 luz cada 2 niveles | +1 luz cada 2 niveles | +1 luz por nivel | +1 luz por nivel |
| Tiempo (base + por luz) | 7 s + 2,5 s/luz | 5 s + 2,2 s/luz | 3,6 s + 1,6 s/luz | 2,5 s + 1,3 s/luz |
| Velocidad de las luces | lenta | media | rápida | muy rápida |
| Bombas especiales desde | nivel 4 | nivel 3 | nivel 2 | nivel 2 |
| Multiplicador de puntos | ×1 | ×1,5 | ×2 | ×3 |
| Particularidad | — | — | — | Teclas **sin números**, solo colores |

**Ritmo suave:** el tiempo se calcula según la longitud de la secuencia
(`tiempo = base + luces × segundos por luz`). Los segundos por luz bajan un
poco en cada nivel, así que el reto crece sin quedarse nunca sin tiempo
para secuencias largas. Ejemplos:

| Nivel | Fácil | Normal | Difícil | Experto |
|---|---|---|---|---|
| 1 | 3 luces · 14,5 s | 3 · 11,6 s | 4 · 10,0 s | 5 · 9,0 s |
| 5 | 5 · 18,5 s | 5 · 14,8 s | 8 · 14,5 s | 9 · 12,4 s |
| 12 | 8 · 22,6 s | 8 · 17,3 s | 15 · 17,7 s | 16 · 14,5 s |

Cada dificultad guarda **su propio récord** (puntos y nivel alcanzado).

### Puntuación y combos
- Cada tecla correcta da **10 puntos × combo × multiplicador de la dificultad**.
- **Combo:** si pulsas cada tecla en menos de 1 segundo, el combo crece.
  Cada 4 teclas seguidas sube el multiplicador: ×2, ×3… hasta ×5.
  El combo se mantiene entre bombas si empiezas rápido; si tardas, se pierde.
- **Bonus de tiempo:** los segundos que sobran al desactivar valen 20 puntos cada uno.
- **Bonus especial:** +150 por cada bomba especial desactivada.

### Bombas especiales
Se presentan **una a una** la primera vez (para aprenderlas), en este orden, y luego aparecen al azar:

| | Especial | Qué pasa |
|---|---|---|
| ⇆ | **INVERSA** | Hay que repetir la secuencia **al revés**. |
| ✖ | **TRAMPA** | Entre las luces aparecen 1 o 2 **luces falsas** (con una X roja y un zumbido). No hay que repetirlas: si las pulsas, explota. |
| ┃┃┃ | **CABLE** | Antes de la secuencia parpadea un cable. Tras repetirla, hay que **cortar ese cable**. Si cortas otro… ¡bum! |
| ⇥⇤ | **ESPEJO** | Hay que pulsar la tecla **reflejada en horizontal**: 1↔3, 4↔6, 7↔9. La columna central (2, 5, 8) no cambia. Una línea discontinua marca el espejo. |
| ▦ | **BARAJADA** | Tras la secuencia, las teclas **cambian de sitio** y pierden sus números. Sigue los colores con la vista. |

---

## 📁 Estructura del proyecto

```
Bomb_mem/
├── index.html              Página que carga Phaser y los scripts del juego
├── js/
│   ├── config.js           ⚙️ TODO lo ajustable: dificultades, puntos, tiempos, posiciones
│   ├── almacen.js          Récords y preferencias (localStorage, a prueba de fallos)
│   ├── sonido.js           Efectos de sonido sintetizados con Web Audio (sin archivos)
│   ├── comun.js            Utilidades: texto pixel, botones, fondo animado, scanlines
│   ├── main.js             Crea el juego de Phaser
│   └── escenas/
│       ├── Arranque.js     Carga los PNG, crea la fuente y las animaciones
│       ├── Portada.js      Logo BOOM MEM animado, selector de dificultad, récord, ayuda
│       ├── Juego.js        Lógica de la bomba: secuencias, combos, especiales, explosión
│       └── FinPartida.js   Resumen, nuevo récord, reintentar
├── assets/                 🎨 Pixel art en PNG (editable en Aseprite, Piskel, GIMP…)
├── tools/
│   └── generar_assets.py   Script que dibuja todos los PNG píxel a píxel
├── tests/
│   └── e2e.js              Pruebas automáticas que juegan en un navegador real
└── original/
    └── desactiva_la_bomba_v1.html   Versión inicial (HTML + JS sin Phaser), como referencia
```

### Flujo de escenas
```
Arranque ──► Portada ──► Juego ──► FinPartida
                ▲          │  ▲          │
                └── Esc ───┘  └─ Enter ──┤
                ▲                        │
                └──────── Esc ───────────┘
```

### Fases de cada bomba (`js/escenas/Juego.js`)
`mostrando` → `respondiendo` → (`cable`) → `desactivada` → siguiente bomba
…o en cualquier momento → `explotada` → `FinPartida`.

---

## 🎨 Pixel art

Resolución interna: **240 × 400 px**, escalada sin suavizado (`pixelArt: true`) para que los píxeles se vean nítidos en cualquier pantalla.

| Archivo | Tamaño de frame | Contenido |
|---|---|---|
| `bomba.png` | 208×256 | Carcasa con franjas de peligro, tornillos, pantalla LED, rejillas |
| `cables.png` | 208×48 (×8) | Cable rojo/azul/amarillo (entero y cortado) + detonador (LED off/on) |
| `teclas.png` | 48×48 (6 × 9) | 9 colores × {apagada, encendida, pulsada} × {con número, sin número} |
| `digitos.png` | 12×20 (×12) | Dígitos de 7 segmentos 0-9, punto y "apagado" |
| `explosion.png` | 96×96 (×8) | Bola de fuego animada |
| `bomba_portada.png` | 32×32 (×4) | Bomba de la portada con la mecha chisporroteando |
| `fuente.png` | 6×10 por carácter | Fuente pixel propia con Ñ, tildes, ¡ y ¿ |
| `iconos.png` | 12×12 (×11) | Bomba, especiales (inversa, cable, barajada, trampa, espejo), sonido, estrella, calavera |
| `trampa.png` | 48×48 | X roja que marca una luz falsa sobre una tecla |
| `particulas.png` | 8×8 (×5) | Chispa, chispa naranja, humo, estrella, metralla |
| `fondo.png` | 32×32 | Placa de circuito (se repite y se desplaza) |
| `boton*.png`, `panel.png` | 16×16 | Botones y paneles *nine-slice* |
| `luz.png`, `progreso.png`, `scanlines.png` | — | Luz de estado, puntos de progreso, efecto CRT |

**Para editar el arte** puedes:
1. Abrir los PNG directamente en tu editor de pixel art favorito (respeta el tamaño de frame), o
2. Cambiar el script y regenerarlos:
   ```bash
   pip install pillow
   python3 tools/generar_assets.py
   ```

> Si cambias el orden de caracteres de la fuente o el tamaño de un frame,
> actualiza también `js/config.js` y `js/escenas/Arranque.js`.

---

## ⚙️ Ajustar la dificultad

Todo está en `js/config.js`:
- `DIFICULTADES` → longitud inicial, cada cuántos niveles crece la secuencia, tiempo base y por luz, velocidad de las luces, multiplicadores, cuándo aparecen las especiales.
- `PUNTOS` → puntos por tecla, ventana de combo, bonus.
- `ESPECIALES` / `ORDEN_ESPECIALES` → textos, tiempo extra y orden de presentación de cada bomba especial.
- `TIEMPOS` → pausas entre niveles y tras la explosión.

---

## 🧪 Pruebas automáticas

`tests/e2e.js` abre el juego en Chromium y lo juega solo para comprobar:

1. **Navegación:** portada → juego → fin → portada → juego… (botones, Enter y Esc), sin quedarse bloqueado.
2. **Sin fugas:** al entrar y salir varias veces de las escenas no se duplican eventos de teclado.
3. **Normal, niveles 1-7:** las 5 bombas especiales en orden, y que INVERSA, ESPEJO y TRAMPA piden lo correcto.
4. **Experto con ratón:** teclas sin número, cable equivocado = explosión, récord guardado.
5. **Tiempo agotado:** la bomba explota al llegar a cero.

```bash
npm install --no-save playwright
npx playwright install chromium
node tests/e2e.js
```

Para probar la versión publicada: `URL=https://c4r127.github.io/Bomb_mem/ node tests/e2e.js`

