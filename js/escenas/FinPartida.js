/* =========================================================
   ESCENA 4 · FIN DE PARTIDA
   Resumen de la partida, récord y opciones para seguir.
   Teclado: Enter reintentar · Esc portada
   ========================================================= */
class FinPartida extends Phaser.Scene {
  constructor() { super("FinPartida"); }

  init(datos) { this.datos = datos; }

  create() {
    this.saliendo = false; // la escena se reutiliza entre partidas (ver Portada.create)
    const d = this.datos;
    const dif = DIFICULTADES[d.dificultad];
    crearFondo(this);
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // Calavera y título
    const calavera = this.add.image(ANCHO / 2, 46, "iconos", ICONO.calavera).setScale(4);
    this.tweens.add({ targets: calavera, angle: { from: -6, to: 6 }, duration: 400, yoyo: true, repeat: -1, ease: "Stepped", easeParams: [3] });
    const titulo = texto(this, ANCHO / 2, 78, "¡BUM!", { tam: 4, color: TINTA.rojo });
    titulo.setDropShadow(3, 3, 0x000000, 1);
    texto(this, ANCHO / 2, 122, d.motivo || "", { color: TINTA.naranja, ancho: 220 });

    // Panel de estadísticas
    this.add.nineslice(ANCHO / 2, 196, "panel", null, 208, 104, 4, 4, 4, 4);
    const filas = [
      ["DIFICULTAD", dif.nombre, TINTA.blanco],
      ["NIVEL", String(d.nivel), TINTA.blanco],
      ["BOMBAS", String(d.bombas), TINTA.verde],
      ["PUNTOS", formatoPuntos(d.puntos), TINTA.amarillo]
    ];
    filas.forEach(([etiqueta, valor, color], i) => {
      const y = 152 + i * 20;
      texto(this, 28, y, etiqueta, { origenX: 0, alinear: "izq", color: TINTA.apagado });
      texto(this, 212, y, valor, { origenX: 1, alinear: "izq", color, tam: i === 3 ? 2 : 1 })
        .setY(i === 3 ? y - 4 : y);
    });

    // Récord
    if (d.nuevoRecord) {
      const r = texto(this, ANCHO / 2, 260, "¡NUEVO RÉCORD!", { tam: 2, color: TINTA.amarillo });
      this.tweens.add({ targets: r, alpha: 0.2, duration: 220, yoyo: true, repeat: -1, ease: "Stepped" });
      this.add.particles(0, 0, "particulas", {
        frame: [0, 3], x: { min: 20, max: ANCHO - 20 }, y: 250, speedY: { min: -80, max: -30 },
        lifespan: 900, frequency: 90, scale: { start: 1, end: 0 }
      });
      Sonido.record();
    } else {
      const r = Almacen.record(d.dificultad);
      texto(this, ANCHO / 2, 264, `RÉCORD: ${formatoPuntos(r.puntos)} (NIVEL ${r.nivel})`, { color: TINTA.apagado });
    }

    crearBoton(this, ANCHO / 2, 312, 150, 28, "REINTENTAR", () => this.reintentar(), { tam: 2 });
    crearBoton(this, ANCHO / 2, 350, 150, 22, "PORTADA", () => this.portada(), { estilo: "boton_osc", color: TINTA.blanco });
    texto(this, ANCHO / 2, 380, "ENTER REINTENTAR · ESC PORTADA", { color: 0x6b5a8e, sombra: false });

    this.input.keyboard.on("keydown-ENTER", () => this.reintentar());
    this.input.keyboard.on("keydown-SPACE", () => this.reintentar());
    this.input.keyboard.on("keydown-ESC", () => this.portada());
    crearScanlines(this);
  }

  reintentar() {
    if (this.saliendo) return;
    this.saliendo = true;
    this.scene.start("Juego", { dificultad: this.datos.dificultad });
  }

  portada() {
    if (this.saliendo) return;
    this.saliendo = true;
    this.scene.start("Portada");
  }
}
