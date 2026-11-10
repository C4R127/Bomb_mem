/* =========================================================
   ESCENA 2 · PORTADA
   Título animado, selector de dificultad, récord, sonido y
   panel de "Cómo jugar".
   Teclado: ↑/↓ o W/S elegir · Enter/Espacio jugar · H ayuda · M sonido
   ========================================================= */
class Portada extends Phaser.Scene {
  constructor() { super("Portada"); }

  create() {
    crearFondo(this);
    this.ayudaAbierta = false;

    const guardada = Almacen.leer("bomba-dificultad", "normal");
    this.seleccion = Math.max(0, ORDEN_DIFICULTADES.indexOf(guardada));

    this.crearTitulo();
    this.crearSelector();
    this.crearBotones();
    this.crearTeclado();
    crearScanlines(this);

    this.actualizarSeleccion();
    this.cameras.main.fadeIn(350, 0, 0, 0);
  }

  /* ---------- Título y bomba animada ---------- */
  crearTitulo() {
    const t1 = texto(this, ANCHO / 2, 14, "DESACTIVA", { tam: 3, color: TINTA.amarillo });
    const t2 = texto(this, ANCHO / 2, 44, "LA BOMBA", { tam: 3, color: TINTA.rojo });
    t1.setDropShadow(2, 2, 0x000000, 1);
    t2.setDropShadow(2, 2, 0x000000, 1);
    // Rebote "a saltos" para que parezca de consola antigua
    this.tweens.add({ targets: [t1, t2], y: "-=2", duration: 500, yoyo: true, repeat: -1, ease: "Stepped", easeParams: [2] });

    const bomba = this.add.sprite(ANCHO / 2, 112, "bomba_portada").setScale(2).play("mecha");
    this.tweens.add({ targets: bomba, y: 108, duration: 700, yoyo: true, repeat: -1, ease: "Stepped", easeParams: [3] });

    // Chispas que salen de la mecha
    this.add.particles(0, 0, "particulas", {
      frame: [0, 1],
      follow: bomba,
      followOffset: { x: 20, y: -30 },
      speed: { min: 20, max: 60 },
      angle: { min: 200, max: 340 },
      gravityY: 120,
      lifespan: 400,
      frequency: 70,
      scale: { start: 0.8, end: 0 }
    });

    texto(this, ANCHO / 2, 146, "MEMORIZA · REPITE · SOBREVIVE", { color: TINTA.apagado });
  }

  /* ---------- Selector de dificultad ---------- */
  crearSelector() {
    texto(this, ANCHO / 2, 160, "- DIFICULTAD -", { color: TINTA.blanco });
    this.filas = ORDEN_DIFICULTADES.map((clave, i) => {
      const y = 180 + i * 23;
      const dif = DIFICULTADES[clave];
      const fondo = this.add.nineslice(ANCHO / 2, y, "boton_osc", null, 188, 21, 4, 4, 4, 5);
      fondo.setInteractive({ useHandCursor: true });
      fondo.on("pointerdown", () => {
        if (this.ayudaAbierta) return;
        if (this.seleccion === i) { this.jugar(); return; }
        this.seleccion = i;
        Sonido.clic();
        this.actualizarSeleccion();
      });
      const nombre = texto(this, 36, y - 5, dif.nombre, { origenX: 0, alinear: "izq" });
      const iconos = [];
      for (let k = 0; k < 4; k++) {
        const encendida = k < dif.nivelIconos;
        iconos.push(this.add.image(160 + k * 13, y, "iconos", encendida ? ICONO.bomba : ICONO.bombaApagada)
          .setAlpha(encendida ? 1 : 0.45));
      }
      return { fondo, nombre, iconos };
    });

    this.descripcion = texto(this, ANCHO / 2, 272, "", { color: TINTA.apagado, ancho: 220 });
    this.iconoRecord = this.add.image(0, 302, "iconos", ICONO.estrella);
    this.textoRecord = texto(this, ANCHO / 2 + 8, 297, "", { color: TINTA.amarillo });
  }

  actualizarSeleccion() {
    this.filas.forEach((fila, i) => {
      const activa = i === this.seleccion;
      fila.fondo.setTexture(activa ? "boton_sel" : "boton_osc");
      fila.nombre.setTint(activa ? TINTA.amarillo : TINTA.blanco);
      fijarTexto(fila.nombre, (activa ? "> " : "") + DIFICULTADES[ORDEN_DIFICULTADES[i]].nombre);
    });
    const clave = ORDEN_DIFICULTADES[this.seleccion];
    fijarTexto(this.descripcion, DIFICULTADES[clave].descripcion);
    const r = Almacen.record(clave);
    fijarTexto(this.textoRecord, r.puntos > 0 ? `RÉCORD ${formatoPuntos(r.puntos)} · NIVEL ${r.nivel}` : "SIN RÉCORD TODAVÍA");
    this.iconoRecord.x = this.textoRecord.x - this.textoRecord.width / 2 - 9;
    Almacen.escribir("bomba-dificultad", clave);
  }

  /* ---------- Botones inferiores ---------- */
  crearBotones() {
    const jugar = crearBoton(this, ANCHO / 2, 330, 128, 30, "JUGAR", () => this.jugar(), { tam: 2 });
    this.tweens.add({ targets: [jugar.fondo, jugar.texto], alpha: 0.75, duration: 450, yoyo: true, repeat: -1, ease: "Stepped" });

    crearBoton(this, 82, 366, 128, 20, "CÓMO JUGAR", () => this.abrirAyuda(), { estilo: "boton_osc", color: TINTA.blanco });

    this.botonSonido = this.add.nineslice(186, 366, "boton_osc", null, 44, 20, 4, 4, 4, 5).setInteractive({ useHandCursor: true });
    this.iconoSonido = this.add.image(186, 366, "iconos", Sonido.activo ? ICONO.sonidoSi : ICONO.sonidoNo);
    this.botonSonido.on("pointerup", () => this.alternarSonido());

    texto(this, ANCHO / 2, 386, "ENTER JUGAR · H AYUDA · M SONIDO", { color: 0x6b5a8e, sombra: false });
  }

  alternarSonido() {
    const activo = Sonido.alternar();
    this.iconoSonido.setFrame(activo ? ICONO.sonidoSi : ICONO.sonidoNo);
  }

  /* ---------- Teclado ---------- */
  crearTeclado() {
    const mover = (d) => {
      if (this.ayudaAbierta) return;
      this.seleccion = Phaser.Math.Wrap(this.seleccion + d, 0, ORDEN_DIFICULTADES.length);
      Sonido.clic();
      this.actualizarSeleccion();
    };
    const kb = this.input.keyboard;
    kb.on("keydown-UP", () => mover(-1));
    kb.on("keydown-W", () => mover(-1));
    kb.on("keydown-DOWN", () => mover(1));
    kb.on("keydown-S", () => mover(1));
    kb.on("keydown-ENTER", () => (this.ayudaAbierta ? this.cerrarAyuda() : this.jugar()));
    kb.on("keydown-SPACE", () => (this.ayudaAbierta ? this.cerrarAyuda() : this.jugar()));
    kb.on("keydown-H", () => (this.ayudaAbierta ? this.cerrarAyuda() : this.abrirAyuda()));
    kb.on("keydown-ESC", () => this.cerrarAyuda());
    kb.on("keydown-M", () => this.alternarSonido());
  }

  jugar() {
    if (this.saliendo || this.ayudaAbierta) return;
    this.saliendo = true;
    Sonido.aviso();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("Juego", { dificultad: ORDEN_DIFICULTADES[this.seleccion] });
    });
  }

  /* ---------- Panel "Cómo jugar" ---------- */
  abrirAyuda() {
    if (this.ayudaAbierta) return;
    this.ayudaAbierta = true;
    const c = this.add.container(0, 0).setDepth(500);
    const velo = this.add.rectangle(0, 0, ANCHO, ALTO, 0x000000, 0.7).setOrigin(0).setInteractive();
    const panel = this.add.nineslice(ANCHO / 2, ALTO / 2, "panel", null, 228, 372, 4, 4, 4, 4);
    c.add([velo, panel]);
    c.add(texto(this, ANCHO / 2, 22, "CÓMO JUGAR", { tam: 2, color: TINTA.amarillo }));

    const pasos = [
      "1. OBSERVA LA SECUENCIA DE LUCES.",
      "2. CUANDO ARRANQUE EL RELOJ, REPÍTELA CON EL RATÓN, EL DEDO O LAS TECLAS 1-9.",
      "3. PULSA RÁPIDO PARA SUBIR EL COMBO: CADA 4 TECLAS SEGUIDAS, ×2, ×3...",
      "4. EL TIEMPO QUE TE SOBRE SE CONVIERTE EN PUNTOS.",
      "5. UN FALLO O EL RELOJ A CERO: ¡BUM!"
    ];
    let y = 46;
    pasos.forEach((p) => {
      const t = texto(this, 18, y, p, { origenX: 0, alinear: "izq", ancho: 204 });
      c.add(t);
      y += t.height + 5;
    });

    c.add(texto(this, ANCHO / 2, y + 4, "- BOMBAS ESPECIALES -", { color: TINTA.naranja }));
    y += 20;
    const especiales = [
      [ICONO.inversa, "INVERSA: REPITE LA SECUENCIA AL REVÉS."],
      [ICONO.cable, "CABLE: RECUERDA EL CABLE QUE PARPADEA. AL TERMINAR, CÓRTALO (TOCA EL CABLE O PULSA Z X C)."],
      [ICONO.barajada, "BARAJADA: LAS TECLAS CAMBIAN DE SITIO. SIGUE LOS COLORES (LAS TECLAS 1-9 USAN LA POSICIÓN)."]
    ];
    especiales.forEach(([icono, linea]) => {
      c.add(this.add.image(24, y + 4, "iconos", icono));
      const t = texto(this, 36, y, linea, { origenX: 0, alinear: "izq", ancho: 188 });
      c.add(t);
      y += t.height + 6;
    });

    const cerrar = crearBoton(this, ANCHO / 2, 368, 100, 22, "ENTENDIDO", () => this.cerrarAyuda());
    c.add([cerrar.fondo, cerrar.texto]);
    this.ayuda = c;
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 150 });
  }

  cerrarAyuda() {
    if (!this.ayudaAbierta) return;
    this.ayuda.destroy();
    // se espera un instante para que el mismo clic no seleccione nada debajo
    this.time.delayedCall(50, () => { this.ayudaAbierta = false; });
  }
}
