/* =========================================================
   ESCENA 2 · PORTADA
   Título animado, selector de dificultad, récord, sonido y
   panel de "Cómo jugar".
   Teclado: ↑/↓ o W/S elegir · Enter/Espacio jugar · H ayuda · M sonido
   ========================================================= */
class Portada extends Phaser.Scene {
  constructor() { super("Portada"); }

  create() {
    // Phaser REUTILIZA la escena al volver a ella: hay que reiniciar aquí
    // todo el estado propio, o se arrastra el de la visita anterior.
    this.saliendo = false;
    this.ayudaAbierta = false;
    crearFondo(this);

    const guardada = Almacen.leer("bomba-dificultad", "normal");
    this.seleccion = Math.max(0, ORDEN_DIFICULTADES.indexOf(guardada));

    this.crearTitulo();
    this.crearSelector();
    this.crearBotones();
    this.crearTeclado();
    crearScanlines(this);

    this.actualizarSeleccion();
    this.cameras.main.fadeIn(350, 0, 0, 0);
    Musica.tocar("portada");
  }

  /* ---------- Título y bomba animada ---------- */
  crearTitulo() {
    // Logo "BOOM MEM": dos palabras grandes dentro de un contenedor centrado
    // en (LOGO.x, LOGO.y) para poder escalarlo y sacudirlo como una pieza.
    const LOGO = { x: ANCHO / 2, y: 52 };
    const boom = texto(this, 0, -48, "BOOM", { tam: 5, color: TINTA.amarillo });
    const mem = texto(this, -22, -6, "MEM", { tam: 5, color: TINTA.rojo });
    boom.setDropShadow(1, 1, 0x000000, 1);
    mem.setDropShadow(1, 1, 0x000000, 1);
    this.logo = this.add.container(LOGO.x, LOGO.y, [boom, mem]);

    // La bomba animada acompaña a "MEM", a su derecha
    const bomba = this.add.sprite(186, 74, "bomba_portada").setScale(2).play("mecha");
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

    texto(this, ANCHO / 2, 112, "DESACTIVA LA BOMBA", { color: TINTA.blanco });
    texto(this, ANCHO / 2, 130, "MEMORIZA · REPITE · SOBREVIVE", { color: TINTA.apagado });

    // Chispas para el "estallido" del logo
    this.chispasLogo = this.add.particles(0, 0, "particulas", {
      emitting: false, frame: [0, 1, 1, 4], speed: { min: 80, max: 230 }, gravityY: 260,
      lifespan: 650, scale: { start: 1, end: 0 }, rotate: { min: 0, max: 360 }
    }).setDepth(20);

    this.entradaLogo(bomba);
  }

  // Al aparecer: el logo crece de golpe, estalla en chispas y tiembla.
  // Después rebota suave y cada pocos segundos vuelve a "chisporrotear".
  entradaLogo(bomba) {
    this.logo.setScale(0);
    bomba.setScale(0);
    this.tweens.add({ targets: this.logo, scale: 1, duration: 320, delay: 150, ease: "Back.easeOut" });
    this.tweens.add({
      targets: bomba, scale: 2, duration: 320, delay: 230, ease: "Back.easeOut",
      onComplete: () => {
        this.estallidoLogo(36);
        this.cameras.main.shake(260, 0.012);
        Sonido.estallido();
        // rebote "a saltos" de consola antigua
        this.tweens.add({ targets: [this.logo, bomba], y: "-=2", duration: 500, yoyo: true, repeat: -1, ease: "Stepped", easeParams: [2] });
        this.time.addEvent({ delay: 4500, loop: true, callback: () => this.temblorLogo() });
      }
    });
  }

  estallidoLogo(cantidad) {
    const puntos = [[ANCHO / 2 - 45, 30], [ANCHO / 2 + 45, 30], [ANCHO / 2 - 40, 72], [ANCHO / 2 + 10, 72]];
    puntos.forEach(([x, y]) => this.chispasLogo.explode(Math.ceil(cantidad / puntos.length), x, y));
  }

  temblorLogo() {
    if (this.ayudaAbierta || this.saliendo) return;
    this.estallidoLogo(10);
    this.tweens.add({
      targets: this.logo, x: { from: ANCHO / 2 - 2, to: ANCHO / 2 + 2 }, duration: 50, yoyo: true, repeat: 3,
      ease: "Stepped", onComplete: () => { this.logo.x = ANCHO / 2; }
    });
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

    this.descripcion = texto(this, ANCHO / 2, 270, "", { color: TINTA.apagado, ancho: 220 });
    this.iconoRecord = this.add.image(0, 298, "iconos", ICONO.estrella);
    this.textoRecord = texto(this, ANCHO / 2 + 8, 293, "", { color: TINTA.amarillo });

    // Colección de escenarios: se encienden al desactivar una bomba en cada uno
    this.textoColeccion = texto(this, 0, 308, "ESCENARIOS", { color: TINTA.apagado, origenX: 0, alinear: "izq" });
    this.iconosColeccion = ORDEN_ESCENARIOS.map((k) => this.add.image(0, 313, "iconos", ESCENARIOS[k].icono));
    this.cuentaColeccion = texto(this, 0, 308, "", { color: TINTA.blanco, origenX: 0, alinear: "izq" });
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

    const vistos = Almacen.coleccion(clave);
    fijarTexto(this.cuentaColeccion, `${vistos.length}/${ORDEN_ESCENARIOS.length}`);
    this.cuentaColeccion.setTint(vistos.length === ORDEN_ESCENARIOS.length ? TINTA.verde : TINTA.blanco);
    // Centrar la fila: "ESCENARIOS" + 4 iconos + "2/4"
    const anchoFila = this.textoColeccion.width + 6 + ORDEN_ESCENARIOS.length * 15 + 4 + this.cuentaColeccion.width;
    let x = Math.round(ANCHO / 2 - anchoFila / 2);
    this.textoColeccion.x = x;
    x += this.textoColeccion.width + 6;
    ORDEN_ESCENARIOS.forEach((k, i) => {
      const conseguido = vistos.includes(k);
      this.iconosColeccion[i].setPosition(x + 6, 313).setAlpha(conseguido ? 1 : 0.25).setTint(conseguido ? 0xffffff : 0x8070a0);
      x += 15;
    });
    this.cuentaColeccion.x = x + 4;
    Almacen.escribir("bomba-dificultad", clave);
  }

  /* ---------- Botones inferiores ---------- */
  crearBotones() {
    const jugar = crearBoton(this, ANCHO / 2, 336, 128, 30, "JUGAR", () => this.jugar(), { tam: 2 });
    this.tweens.add({ targets: [jugar.fondo, jugar.texto], alpha: 0.75, duration: 450, yoyo: true, repeat: -1, ease: "Stepped" });

    crearBoton(this, 72, 368, 108, 20, "CÓMO JUGAR", () => this.abrirAyuda(), { estilo: "boton_osc", color: TINTA.blanco });

    // Dos botones de audio: efectos (altavoz) y música (nota)
    this.botonSonido = this.add.nineslice(158, 368, "boton_osc", null, 40, 20, 4, 4, 4, 5).setInteractive({ useHandCursor: true });
    this.iconoSonido = this.add.image(158, 368, "iconos", Sonido.activo ? ICONO.sonidoSi : ICONO.sonidoNo);
    this.botonSonido.on("pointerup", () => this.alternarSonido());
    this.botonMusica = this.add.nineslice(202, 368, "boton_osc", null, 40, 20, 4, 4, 4, 5).setInteractive({ useHandCursor: true });
    this.iconoMusica = this.add.image(202, 368, "iconos", Musica.activa ? ICONO.musicaSi : ICONO.musicaNo);
    this.botonMusica.on("pointerup", () => this.alternarMusica());

    texto(this, ANCHO / 2, 388, "ENTER JUGAR · H AYUDA · M/N AUDIO", { color: 0x6b5a8e, sombra: false });
  }

  alternarSonido() {
    const activo = Sonido.alternar();
    this.iconoSonido.setFrame(activo ? ICONO.sonidoSi : ICONO.sonidoNo);
  }

  alternarMusica() {
    const activa = Musica.alternar();
    this.iconoMusica.setFrame(activa ? ICONO.musicaSi : ICONO.musicaNo);
    Sonido.clic();
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
    kb.on("keydown-N", () => this.alternarMusica());
    // Los navegadores no dejan sonar nada hasta el primer toque o tecla:
    // en cuanto lo hay, arranca la música de la portada.
    this.input.once("pointerdown", () => Musica.tocar("portada"));
    kb.once("keydown", () => Musica.tocar("portada"));
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
      "2. REPÍTELA ANTES DE QUE ACABE EL RELOJ (RATÓN, DEDO O TECLAS 1-9). P: PAUSA.",
      "3. PULSA RÁPIDO PARA SUBIR EL COMBO (×2, ×3...). EL TIEMPO QUE SOBRA DA PUNTOS.",
      "4. UN FALLO O EL RELOJ A CERO: ¡BUM!"
    ];
    let y = 44;
    pasos.forEach((p) => {
      const t = texto(this, 18, y, p, { origenX: 0, alinear: "izq", ancho: 204 });
      c.add(t);
      y += t.height + 4;
    });

    c.add(texto(this, ANCHO / 2, y + 2, "- BOMBAS ESPECIALES -", { color: TINTA.naranja }));
    y += 17;
    const especiales = [
      [ICONO.inversa, "INVERSA: REPITE LA SECUENCIA AL REVÉS."],
      [ICONO.trampa, "TRAMPA: LAS LUCES CON X ROJA SON FALSAS. NO LAS REPITAS."],
      [ICONO.cable, "CABLE: RECUERDA EL CABLE QUE PARPADEA Y CÓRTALO AL FINAL (Z X C)."],
      [ICONO.espejo, "ESPEJO: PULSA LA TECLA REFLEJADA (1-3, 4-6, 7-9)."],
      [ICONO.barajada, "BARAJADA: LAS TECLAS SE MUEVEN. SIGUE LOS COLORES (1-9 USAN LA POSICIÓN)."]
    ];
    especiales.forEach(([icono, linea]) => {
      c.add(this.add.image(24, y + 4, "iconos", icono));
      const t = texto(this, 36, y, linea, { origenX: 0, alinear: "izq", ancho: 188 });
      c.add(t);
      y += t.height + 4;
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
