/* =========================================================
   ESCENA 1 · ARRANQUE
   Carga los PNG de assets/, registra la fuente pixel y las
   animaciones, y pasa a la portada.
   ========================================================= */
class Arranque extends Phaser.Scene {
  constructor() { super("Arranque"); }

  preload() {
    // Barra de carga sencilla
    const barra = this.add.graphics();
    this.load.on("progress", (v) => {
      barra.clear();
      barra.fillStyle(0xffcc00, 1).fillRect(40, ALTO / 2 - 4, (ANCHO - 80) * v, 8);
      barra.lineStyle(1, 0xffffff, 1).strokeRect(39.5, ALTO / 2 - 4.5, ANCHO - 79, 9);
    });

    this.load.setPath("assets/");
    this.load.image("fuente", "fuente.png");
    // Un fondo y una carcasa de bomba por escenario
    ORDEN_ESCENARIOS.forEach((k) => {
      this.load.image("escenario_" + k, "escenario_" + k + ".png");
      this.load.image("bomba_" + k, "bomba_" + k + ".png");
    });
    this.load.image("fondo", "fondo.png");
    this.load.image("scanlines", "scanlines.png");
    this.load.image("boton", "boton.png");
    this.load.image("boton_osc", "boton_osc.png");
    this.load.image("boton_sel", "boton_sel.png");
    this.load.image("panel", "panel.png");
    this.load.image("trampa", "trampa.png");
    this.load.spritesheet("teclas", "teclas.png", { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet("cables", "cables.png", { frameWidth: 208, frameHeight: 48 });
    this.load.spritesheet("digitos", "digitos.png", { frameWidth: 12, frameHeight: 20 });
    this.load.spritesheet("luz", "luz.png", { frameWidth: 12, frameHeight: 12 });
    this.load.spritesheet("progreso", "progreso.png", { frameWidth: 8, frameHeight: 8 });
    this.load.spritesheet("particulas", "particulas.png", { frameWidth: 8, frameHeight: 8 });
    this.load.spritesheet("iconos", "iconos.png", { frameWidth: 12, frameHeight: 12 });
    this.load.spritesheet("bomba_portada", "bomba_portada.png", { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet("explosion", "explosion.png", { frameWidth: 96, frameHeight: 96 });
  }

  create() {
    // Fuente bitmap a partir de la rejilla de fuente.png
    const datos = Phaser.GameObjects.RetroFont.Parse(this, {
      image: FUENTE.imagen,
      width: FUENTE.ancho,
      height: FUENTE.alto,
      chars: FUENTE.caracteres,
      charsPerRow: FUENTE.porFila,
      spacing: { x: 0, y: 0 },
      offset: { x: 0, y: 0 },
      lineSpacing: 1
    });
    this.cache.bitmapFont.add(FUENTE.clave, datos);

    // Animaciones
    this.anims.create({
      key: "explotar",
      frames: this.anims.generateFrameNumbers("explosion", { start: 0, end: 7 }),
      frameRate: 14,
      hideOnComplete: true
    });
    this.anims.create({
      key: "mecha",
      frames: this.anims.generateFrameNumbers("bomba_portada", { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1
    });

    Sonido.iniciar(this.game);
    Musica.iniciar();
    this.scene.start("Portada");
  }
}
