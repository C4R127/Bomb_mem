/* =========================================================
   UTILIDADES COMPARTIDAS POR LAS ESCENAS
   (texto pixel, botones, fondo animado, efecto CRT)
   ========================================================= */

// Pasa a mayúsculas y sustituye caracteres que la fuente no tiene
function limpiarTexto(cadena) {
  const s = String(cadena).toUpperCase().replace(/…/g, "...").replace(/[←↑→↓]/g, "");
  let r = "";
  for (const ch of s) r += (ch === "\n" || FUENTE.caracteres.includes(ch)) ? ch : "?";
  return r;
}

/**
 * Crea un texto con la fuente pixel.
 * opciones: tam (escala entera), color, origenX (0 izq, 0.5 centro, 1 der),
 *           sombra (true/false), ancho (ajuste de línea en px), alinear ("izq" | "centro")
 */
function texto(escena, x, y, cadena, opciones = {}) {
  const { tam = 1, color = TINTA.blanco, origenX = 0.5, sombra = true, ancho = 0, alinear = "centro" } = opciones;
  const t = escena.add.bitmapText(x, y, FUENTE.clave, limpiarTexto(cadena));
  t.setScale(tam).setOrigin(origenX, 0).setTint(color);
  if (ancho) t.setMaxWidth(ancho / tam);
  if (alinear === "centro") t.setCenterAlign(); else t.setLeftAlign();
  if (sombra) t.setDropShadow(1, 1, 0x000000, 1);
  return t;
}

// Cambia el texto de un BitmapText aplicando la limpieza
function fijarTexto(t, cadena) {
  t.setText(limpiarTexto(cadena));
  return t;
}

/**
 * Botón nine-slice con texto centrado.
 * estilo: "boton" (amarillo) | "boton_osc" | "boton_sel"
 */
function crearBoton(escena, x, y, w, h, etiqueta, alPulsar, opciones = {}) {
  const { estilo = "boton", tam = 1, color = TINTA.oscuro, sonido = true } = opciones;
  const fondo = escena.add.nineslice(x, y, estilo, null, w, h, 4, 4, 4, 5);
  const t = texto(escena, x, y - Math.round(5.5 * tam), etiqueta, { tam, color, sombra: false });
  fondo.setInteractive({ useHandCursor: true });
  fondo.on("pointerover", () => fondo.setTint(0xe8e0ff));
  fondo.on("pointerout", () => { fondo.clearTint(); fondo.y = y; t.y = y - Math.round(5.5 * tam); });
  fondo.on("pointerdown", () => { fondo.y = y + 1; t.y = y - Math.round(5.5 * tam) + 1; });
  fondo.on("pointerup", () => {
    fondo.y = y; t.y = y - Math.round(5.5 * tam);
    if (sonido) Sonido.clic();
    alPulsar();
  });
  return { fondo, texto: t };
}

// Fondo de placa de circuito que se desplaza lentamente
function crearFondo(escena) {
  const f = escena.add.tileSprite(0, 0, ANCHO, ALTO, "fondo").setOrigin(0).setDepth(-10);
  const mover = () => { f.tilePositionX += 0.15; f.tilePositionY += 0.08; };
  escena.events.on("update", mover);
  // los eventos de la escena sobreviven a un reinicio: hay que soltarlos al salir
  escena.events.once("shutdown", () => escena.events.off("update", mover));
  return f;
}

// Líneas de televisor antiguo por encima de todo
function crearScanlines(escena) {
  return escena.add.tileSprite(0, 0, ANCHO, ALTO, "scanlines").setOrigin(0).setDepth(1000).setAlpha(0.8);
}

// Icono de 12x12 (ver orden en tools/generar_assets.py)
const ICONO = { bomba: 0, bombaApagada: 1, inversa: 2, cable: 3, barajada: 4, sonidoSi: 5, sonidoNo: 6, estrella: 7, calavera: 8 };

// Formatea puntos con ceros a la izquierda: 120 -> "000120"
function formatoPuntos(n) {
  return String(Math.floor(n)).padStart(6, "0");
}
