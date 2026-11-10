/* =========================================================
   PUNTO DE ENTRADA: crea el juego de Phaser con sus escenas.
   ========================================================= */
const juego = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "juego",
  width: ANCHO,
  height: ALTO,
  backgroundColor: "#1b1035",
  pixelArt: true,      // escalado sin suavizar: píxeles nítidos
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [Arranque, Portada, Juego, FinPartida]
});
