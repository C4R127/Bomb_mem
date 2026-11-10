/* =========================================================
   ESCENA 3 · JUEGO
   Flujo de cada bomba:
     mostrando  → se enseña la secuencia (y el cable, si toca)
     respondiendo → corre el reloj, el jugador repite
     cable      → (bomba CABLE) falta cortar el cable correcto
     desactivada → bonus y pasa a la siguiente bomba
     explotada  → explosión y pantalla de fin de partida
   Teclado: 1-9 teclas (por posición) · Z X C cables · P/Esc pausa
            M efectos · N música · (en pausa) S salir a la portada
   ========================================================= */
class Juego extends Phaser.Scene {
  constructor() { super("Juego"); }

  init(datos) {
    this.claveDif = DIFICULTADES[datos.dificultad] ? datos.dificultad : "normal";
    this.dif = DIFICULTADES[this.claveDif];
  }

  create() {
    this.token = 0; // cada bomba/explosión lo incrementa para cancelar procesos viejos
    // El reloj de la escena se conserva entre partidas: si se salió desde la
    // pausa, seguiría parado. Se reinicia siempre al empezar.
    this.time.paused = false;
    this.pausado = false;
    this.estado = {
      fase: "inicio",
      nivel: 1,
      bombas: 0,
      puntos: 0,
      combo: 0,
      ultimoToque: 0,
      patron: [],      // orden en que se iluminan las teclas (identidades 0-8)
      objetivo: [],    // orden que debe pulsar el jugador
      posicion: 0,
      especial: null,
      ultimoEspecial: null,
      cable: 0,        // cable correcto en las bombas CABLE
      fin: 0,          // instante (ms) en que explota
      ultimoSegundo: 0
    };

    crearFondo(this);
    this.crearHUD();
    this.crearBomba();
    this.crearMensaje();
    this.crearParticulas();
    this.crearEntrada();
    this.crearPausa();
    texto(this, ANCHO / 2, 388, "P PAUSA", { color: 0x6b5a8e, sombra: false });
    crearScanlines(this);

    // Si se cambia de pestaña o se minimiza, el juego se pausa solo
    // (si no, al volver el reloj de la bomba habría seguido corriendo).
    const alOcultar = () => this.pausar();
    this.game.events.on("hidden", alOcultar);
    this.events.once("shutdown", () => this.game.events.off("hidden", alOcultar));

    Musica.tocar("juego");
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.time.delayedCall(350, () => this.nuevaBomba());
  }

  esperar(ms) {
    return new Promise((resolver) => this.time.delayedCall(ms, resolver));
  }

  /* =======================================================
     CONSTRUCCIÓN DE LA INTERFAZ
     ======================================================= */
  crearHUD() {
    const columnas = [{ x: 36, etiqueta: "NIVEL" }, { x: 120, etiqueta: "PUNTOS" }, { x: 206, etiqueta: "COMBO" }];
    columnas.forEach((c) => texto(this, c.x, 3, c.etiqueta, { color: TINTA.apagado }));
    this.hudNivel = texto(this, 36, 13, "1");
    this.hudPuntos = texto(this, 120, 13, formatoPuntos(0), { color: TINTA.amarillo });
    this.hudCombo = texto(this, 206, 13, "×1");
  }

  crearBomba() {
    const b = BOMBA;
    this.bomba = this.add.container(b.x, b.y);

    // Cables (3 sprites superpuestos) y detonador
    this.cables = [0, 1, 2].map((i) => this.add.sprite(0, 0, "cables", i * 2).setOrigin(0));
    this.detonador = this.add.sprite(0, 0, "cables", 6).setOrigin(0);
    this.bomba.add([...this.cables, this.detonador]);
    // El LED del detonador parpadea (frames 6 y 7 de cables.png)
    this.time.addEvent({ delay: 500, loop: true, callback: () => {
      this.detonador.setFrame(this.detonador.frame.name === 6 ? 7 : 6);
    } });

    // Zonas táctiles de los cables (invisibles)
    this.zonasCable = b.zonasCable.map((z, i) => {
      const zona = this.add.zone(z.x, 0, z.w, 48).setOrigin(0).setInteractive({ useHandCursor: true });
      zona.on("pointerdown", () => this.cortarCable(i));
      this.bomba.add(zona);
      return zona;
    });

    this.cuerpo = this.add.image(0, b.cuerpoY, "bomba").setOrigin(0);
    this.bomba.add(this.cuerpo);

    // Reloj de 7 segmentos (escala 2)
    this.digitos = b.digitos.map((d) =>
      this.add.image(d.x, b.digitosY, "digitos", d.f === "punto" ? 10 : 0).setOrigin(0).setScale(2));
    this.bomba.add(this.digitos);

    this.luz = this.add.image(b.luz.x, b.luz.y, "luz", 0).setOrigin(0).setScale(2);
    this.iconoEspecial = this.add.image(b.iconoEspecial.x, b.iconoEspecial.y, "iconos", 0).setOrigin(0).setVisible(false);
    this.bomba.add([this.luz, this.iconoEspecial]);

    // Puntos de progreso
    this.puntos = [];
    for (let i = 0; i < LONGITUD_MAXIMA; i++) {
      const p = this.add.image(0, b.progresoY, "progreso", 0).setVisible(false);
      this.puntos.push(p);
      this.bomba.add(p);
    }

    // Teclas: identidad 0-8 (color/número) y "hueco" 0-8 (posición en la rejilla)
    this.teclas = [];
    for (let id = 0; id < 9; id++) {
      const t = this.add.sprite(0, 0, "teclas", id * 6);
      t.id = id;
      t.sinNumero = this.dif.sinNumeros;
      t.estadoVisual = 0;
      t.setInteractive({ useHandCursor: true });
      t.on("pointerdown", () => this.pulsar(t.id));
      this.colocarEnHueco(t, id);
      this.teclas.push(t);
      this.bomba.add(t);
    }

    // Marca de luz falsa (bomba TRAMPA)
    this.marcaTrampa = this.add.image(0, 0, "trampa").setVisible(false);
    // Línea del espejo sobre la columna central (bomba ESPEJO): trazos de 2 px
    this.espejo = this.add.container(BOMBA.teclaX[1], 0).setVisible(false);
    for (let y = BOMBA.teclaY[0] - 26; y < BOMBA.teclaY[2] + 26; y += 6) {
      this.espejo.add(this.add.rectangle(0, y, 2, 4, 0x9fe8ff).setOrigin(0.5, 0));
    }
    this.bomba.add([this.marcaTrampa, this.espejo]);
  }

  crearMensaje() {
    this.mensaje = texto(this, ANCHO / 2, 334, "", { ancho: 228 });
  }

  crearParticulas() {
    const base = { emitting: false, lifespan: 700, gravityY: 200 };
    this.chispas = this.add.particles(0, 0, "particulas", {
      ...base, frame: [0, 1], speed: { min: 60, max: 220 }, scale: { start: 1, end: 0 }
    }).setDepth(60);
    this.humo = this.add.particles(0, 0, "particulas", {
      emitting: false, frame: 2, lifespan: 1400, speed: { min: 10, max: 60 }, gravityY: -30,
      scale: { start: 1.5, end: 3 }, alpha: { start: 0.9, end: 0 }
    }).setDepth(55);
    this.metralla = this.add.particles(0, 0, "particulas", {
      ...base, frame: 4, lifespan: 1200, speed: { min: 120, max: 300 }, gravityY: 400, rotate: { min: 0, max: 360 }
    }).setDepth(61);
    this.estrellas = this.add.particles(0, 0, "particulas", {
      ...base, frame: 3, speed: { min: 40, max: 140 }, gravityY: 60, scale: { start: 1, end: 0.2 }
    }).setDepth(60);
  }

  crearEntrada() {
    this.input.keyboard.on("keydown", (ev) => {
      if (ev.repeat) return;
      const k = ev.key.toLowerCase();
      if (k === "m") { this.alternarEfectos(); return; }
      if (k === "n") { this.alternarMusica(); return; }
      if (this.pausado) {
        if (k === "p" || k === "escape" || k === "enter") this.reanudar();
        else if (k === "s") this.volverPortada();
        return;
      }
      if (k === "p" || k === "escape") { this.pausar(); return; }
      if (/^[1-9]$/.test(ev.key)) {
        // Los números del teclado apuntan al HUECO (posición), no a la identidad:
        // así en las bombas barajadas hay que seguir el color con la vista.
        const tecla = this.teclas.find((t) => t.hueco === Number(ev.key) - 1);
        if (tecla) this.pulsar(tecla.id);
      }
      const cable = { z: 0, x: 1, c: 2, arrowleft: 0, arrowup: 1, arrowright: 2 }[ev.key.toLowerCase()];
      if (cable !== undefined) this.cortarCable(cable);
    });
  }

  /* =======================================================
     PAUSA
     ======================================================= */
  crearPausa() {
    const c = this.add.container(0, 0).setDepth(900).setVisible(false);
    // El velo tapa la bomba (y captura los toques para que no lleguen debajo)
    const velo = this.add.rectangle(0, 0, ANCHO, ALTO, 0x0d0820, 0.94).setOrigin(0).setInteractive();
    const panel = this.add.nineslice(ANCHO / 2, 200, "panel", null, 196, 236, 4, 4, 4, 4);
    const titulo = texto(this, ANCHO / 2, 96, "PAUSA", { tam: 3, color: TINTA.amarillo });
    const continuar = crearBoton(this, ANCHO / 2, 150, 160, 26, "CONTINUAR", () => this.reanudar(), { tam: 1 });
    this.botonEfectos = crearBoton(this, ANCHO / 2, 184, 160, 22, "", () => this.alternarEfectos(),
      { estilo: "boton_osc", color: TINTA.blanco, sonido: false });
    this.botonMusica = crearBoton(this, ANCHO / 2, 212, 160, 22, "", () => this.alternarMusica(),
      { estilo: "boton_osc", color: TINTA.blanco, sonido: false });
    const salir = crearBoton(this, ANCHO / 2, 246, 160, 22, "SALIR A PORTADA", () => this.volverPortada(),
      { estilo: "boton_osc", color: TINTA.rojo });
    const ayuda = texto(this, ANCHO / 2, 272, "P CONTINUAR · S SALIR\nM EFECTOS · N MÚSICA", { color: TINTA.apagado, ancho: 190 });
    c.add([velo, panel, titulo, continuar.fondo, continuar.texto, this.botonEfectos.fondo, this.botonEfectos.texto,
      this.botonMusica.fondo, this.botonMusica.texto, salir.fondo, salir.texto, ayuda]);
    this.panelPausa = c;
    this.actualizarBotonesAudio();
  }

  actualizarBotonesAudio() {
    fijarTexto(this.botonEfectos.texto, "EFECTOS: " + (Sonido.activo ? "SÍ" : "NO"));
    fijarTexto(this.botonMusica.texto, "MÚSICA: " + (Musica.activa ? "SÍ" : "NO"));
  }

  alternarEfectos() { Sonido.alternar(); this.actualizarBotonesAudio(); }
  alternarMusica() { Musica.alternar(); Sonido.clic(); this.actualizarBotonesAudio(); }

  pausar() {
    const fase = this.estado.fase;
    if (this.pausado || !["mostrando", "respondiendo", "cable", "desactivada"].includes(fase)) return;
    this.pausado = true;
    this.inicioPausa = this.time.now;
    this.time.paused = true;      // congela esperas y luces programadas
    this.tweens.pauseAll();       // congela animaciones (deslizar, barajar...)
    this.bomba.setVisible(false); // sin trampas: no se puede estudiar el teclado en pausa
    Musica.pausar();
    this.actualizarBotonesAudio();
    this.panelPausa.setVisible(true);
    Sonido.tono(520, 0.08, "square", 0.05);
  }

  reanudar() {
    if (!this.pausado) return;
    // Phaser sigue contando el tiempo de juego durante la pausa:
    // se desplaza la cuenta atrás lo que haya durado.
    const duracion = this.time.now - this.inicioPausa;
    this.estado.fin += duracion;
    this.estado.ultimoToque += duracion;
    this.pausado = false;
    this.time.paused = false;
    this.tweens.resumeAll();
    this.bomba.setVisible(true);
    this.panelPausa.setVisible(false);
    Musica.reanudar();
    Sonido.tono(780, 0.08, "square", 0.05);
  }

  /* =======================================================
     AYUDAS VISUALES
     ======================================================= */
  posicionHueco(hueco) {
    return { x: BOMBA.teclaX[hueco % 3], y: BOMBA.teclaY[Math.floor(hueco / 3)] };
  }

  colocarEnHueco(tecla, hueco) {
    tecla.hueco = hueco;
    const p = this.posicionHueco(hueco);
    tecla.setPosition(p.x, p.y);
  }

  // 0 apagada · 1 encendida · 2 pulsada (los frames sin número están 3 más allá)
  estadoTecla(tecla, estado) {
    tecla.estadoVisual = estado;
    tecla.setFrame(tecla.id * 6 + estado + (tecla.sinNumero ? 3 : 0));
  }

  iluminar(id, ms, pulsada) {
    const t = this.teclas[id];
    this.estadoTecla(t, pulsada ? 2 : 1);
    Sonido.nota(id, (ms / 1000) * 0.9);
    if (t.apagar) t.apagar.remove();
    t.apagar = this.time.delayedCall(ms, () => this.estadoTecla(t, 0));
  }

  // Luz falsa: la tecla se enciende con una X roja encima y suena un zumbido
  iluminarTrampa(id, ms) {
    const t = this.teclas[id];
    this.estadoTecla(t, 1);
    t.setTint(0xff8080);
    this.marcaTrampa.setPosition(t.x, t.y).setVisible(true);
    Sonido.trampa();
    if (t.apagar) t.apagar.remove();
    t.apagar = this.time.delayedCall(ms, () => {
      this.estadoTecla(t, 0);
      t.clearTint();
      this.marcaTrampa.setVisible(false);
    });
  }

  mostrarEspejo(visible) {
    this.espejo.setVisible(visible);
    this.tweens.killTweensOf(this.espejo);
    this.espejo.setAlpha(1);
    if (visible) this.tweens.add({ targets: this.espejo, alpha: 0.35, duration: 400, yoyo: true, repeat: -1, ease: "Stepped" });
  }

  fijarLuz(cual) { this.luz.setFrame({ apagada: 0, armada: 1, ok: 2 }[cual]); }

  fijarMensaje(cadena, color = TINTA.blanco) {
    fijarTexto(this.mensaje, cadena).setTint(color);
  }

  dibujarReloj(segundos) {
    const s = Math.min(99.9, Math.max(0, segundos)).toFixed(1).padStart(4, "0");
    this.digitos[0].setFrame(Number(s[0]));
    this.digitos[1].setFrame(Number(s[1]));
    this.digitos[3].setFrame(Number(s[3]));
  }

  dibujarProgreso(error = false) {
    const n = this.estado.objetivo.length;
    const inicio = 104 - (n * 10 - 2) / 2 + 4;
    this.puntos.forEach((p, i) => {
      p.setVisible(i < n);
      p.x = inicio + i * 10;
      let frame = i < this.estado.posicion ? 1 : 0;
      if (error && i === this.estado.posicion) frame = 2;
      p.setFrame(frame);
    });
  }

  actualizarHUD() {
    const e = this.estado;
    fijarTexto(this.hudNivel, String(e.nivel));
    fijarTexto(this.hudPuntos, formatoPuntos(e.puntos));
    const m = this.multiplicador();
    fijarTexto(this.hudCombo, "×" + m);
    this.hudCombo.setTint(m > 1 ? [TINTA.blanco, TINTA.blanco, TINTA.verde, TINTA.amarillo, TINTA.naranja, TINTA.rojo][m] : TINTA.blanco);
  }

  // Texto que sube y se desvanece (puntos ganados, avisos)
  flotante(x, y, cadena, color, tam = 1) {
    const t = texto(this, x, y, cadena, { color, tam }).setDepth(70);
    this.tweens.add({ targets: t, y: y - 18, alpha: 0, duration: 800, ease: "Cubic.easeOut", onComplete: () => t.destroy() });
  }

  // Cartel grande que anuncia una bomba especial
  async cartel(titulo, subtitulo, icono) {
    const c = this.add.container(ANCHO / 2, BOMBA.centro.y).setDepth(80);
    const panel = this.add.nineslice(0, 0, "panel", null, 216, 62, 4, 4, 4, 4);
    const ico = this.add.image(-80, -8, "iconos", icono).setScale(2);
    const t1 = texto(this, 10, -22, titulo, { tam: 2, color: TINTA.naranja });
    const t2 = texto(this, 0, 6, subtitulo, { color: TINTA.blanco, ancho: 200 });
    c.add([panel, ico, t1, t2]);
    c.setScale(1, 0);
    Sonido.aviso();
    this.tweens.add({ targets: c, scaleY: 1, duration: 160, ease: "Stepped", easeParams: [4] });
    await this.esperar(1700);
    this.tweens.add({ targets: c, scaleY: 0, duration: 120, onComplete: () => c.destroy() });
    await this.esperar(150);
  }

  /* =======================================================
     REGLAS: parámetros por nivel, combos y especiales
     ======================================================= */
  // Ritmo de dificultad: la secuencia crece cada "nivelesPorLuz" niveles y el
  // tiempo se calcula según su longitud (base + segundos por luz).
  parametros() {
    const d = this.dif;
    const n = this.estado.nivel - 1;
    const longitud = Math.min(LONGITUD_MAXIMA, d.longitudInicial + Math.floor(n / d.nivelesPorLuz));
    const porLuz = Math.max(d.minimoPorLuz, d.segundosPorLuz - n * d.restaPorLuz);
    return {
      longitud,
      tiempo: Math.round((d.tiempoBase + longitud * porLuz) * 10) / 10,
      destello: Math.max(d.destelloMinimo, d.destelloInicial - n * d.restaDestello)
    };
  }

  // Tecla reflejada en horizontal (1↔3, 4↔6, 7↔9; la columna central no cambia)
  reflejar(id) {
    const fila = Math.floor(id / 3);
    return fila * 3 + (2 - (id % 3));
  }

  // Secuencia que se ENSEÑA: en las bombas TRAMPA se intercalan luces falsas
  secuenciaVisible(patron) {
    const lista = patron.map((id) => ({ id, falsa: false }));
    if (this.estado.especial !== "trampa") return lista;
    const cuantas = patron.length >= 6 ? 2 : 1;
    for (let k = 0; k < cuantas; k++) {
      const pos = Phaser.Math.Between(1, lista.length);  // nunca la primera luz
      const vecinos = [lista[pos - 1] && lista[pos - 1].id, lista[pos] && lista[pos].id];
      const opciones = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((i) => !vecinos.includes(i));
      lista.splice(pos, 0, { id: Phaser.Utils.Array.GetRandom(opciones), falsa: true });
    }
    return lista;
  }

  multiplicador() {
    const c = Math.max(0, this.estado.combo - 1);
    return Math.min(PUNTOS.multiplicadorMaximo, 1 + Math.floor(c / PUNTOS.teclasPorMultiplicador));
  }

  // Cada especial se presenta en orden la primera vez; después salen al azar
  elegirEspecial() {
    const n = this.estado.nivel;
    const desde = this.dif.especialDesde;
    if (n < desde) return null;
    const presentacion = n - desde;
    if (presentacion < ORDEN_ESPECIALES.length) return ORDEN_ESPECIALES[presentacion];
    if (Math.random() > this.dif.probEspecial) return null;
    const opciones = ORDEN_ESPECIALES.filter((k) => k !== this.estado.ultimoEspecial);
    return Phaser.Utils.Array.GetRandom(opciones);
  }

  generarPatron(n) {
    const p = [];
    while (p.length < n) {
      const k = Phaser.Math.Between(0, 8);
      if (k !== p[p.length - 1]) p.push(k); // nunca la misma tecla dos veces seguidas
    }
    return p;
  }

  /* =======================================================
     FLUJO DE UNA BOMBA
     ======================================================= */
  async nuevaBomba() {
    const tk = ++this.token;
    const e = this.estado;
    const p = this.parametros();

    e.especial = this.elegirEspecial();
    if (e.especial) e.ultimoEspecial = e.especial;
    e.patron = this.generarPatron(p.longitud);
    if (e.especial === "inversa") e.objetivo = [...e.patron].reverse();
    else if (e.especial === "espejo") e.objetivo = e.patron.map((id) => this.reflejar(id));
    else e.objetivo = e.patron;
    const visibles = this.secuenciaVisible(e.patron);
    e.posicion = 0;
    e.fase = "mostrando";

    this.reiniciarBomba();
    this.actualizarHUD();
    this.dibujarReloj(p.tiempo + (e.especial ? ESPECIALES[e.especial].tiempoExtra : 0));
    this.dibujarProgreso();

    // La bomba entra deslizándose desde la derecha (salvo la primera)
    if (e.nivel > 1) {
      this.bomba.x = ANCHO + 10;
      this.tweens.add({ targets: this.bomba, x: BOMBA.x, duration: 350, ease: "Cubic.easeOut" });
      await this.esperar(380);
      if (tk !== this.token) return;
    }

    this.fijarMensaje(`NIVEL ${e.nivel} · ${this.dif.nombre}\nMEMORIZA ${p.longitud} LUCES`, TINTA.blanco);

    if (e.especial) {
      const esp = ESPECIALES[e.especial];
      this.iconoEspecial.setFrame(esp.icono).setVisible(true);
      await this.cartel(`¡${esp.nombre}!`, esp.aviso, esp.icono);
      if (tk !== this.token) return;
    }

    // La música baja mientras hay que memorizar (cable y secuencia)
    Musica.atenuar(true);

    if (e.especial === "cable") {
      e.cable = Phaser.Math.Between(0, 2);
      await this.mostrarCable(e.cable);
      if (tk !== this.token) return;
    }

    await this.esperar(TIEMPOS.antesDeSecuencia);
    if (e.especial === "espejo") this.mostrarEspejo(true);
    for (const luz of visibles) {
      if (tk !== this.token) return;
      if (luz.falsa) this.iluminarTrampa(luz.id, p.destello);
      else this.iluminar(luz.id, p.destello, false);
      await this.esperar(p.destello * 1.45);
    }
    if (tk !== this.token) return;

    if (e.especial === "barajada") {
      await this.barajar();
      if (tk !== this.token) return;
    }

    // ¡A jugar!
    const extra = e.especial ? ESPECIALES[e.especial].tiempoExtra : 0;
    e.fase = "respondiendo";
    Musica.atenuar(false);
    e.ultimoToque = this.time.now - (PUNTOS.ventanaPrimera - PUNTOS.ventanaCombo);
    e.fin = this.time.now + (p.tiempo + extra) * 1000;
    e.ultimoSegundo = Math.ceil(p.tiempo + extra);
    this.fijarLuz("armada");
    this.fijarMensaje(e.especial ? ESPECIALES[e.especial].turno : "¡TU TURNO! REPITE LA SECUENCIA.", TINTA.amarillo);
  }

  reiniciarBomba() {
    this.bomba.setAlpha(1);
    this.cables.forEach((c, i) => c.setFrame(i * 2).clearTint());
    this.iconoEspecial.setVisible(false);
    this.marcaTrampa.setVisible(false);
    this.mostrarEspejo(false);
    this.fijarLuz("apagada");
    this.teclas.forEach((t) => {
      t.clearTint();
      t.sinNumero = this.dif.sinNumeros;
      this.colocarEnHueco(t, t.id);
      this.estadoTecla(t, 0);
    });
    this.digitos.forEach((d) => d.setAlpha(1));
  }

  // El cable correcto parpadea en blanco 3 veces
  async mostrarCable(i) {
    this.fijarMensaje(`ATENTO AL CABLE QUE PARPADEA...`, TINTA.naranja);
    await this.esperar(400);
    for (let k = 0; k < 3; k++) {
      this.cables[i].setTintFill(0xffffff);
      Sonido.tono(1000 + i * 200, 0.12, "triangle", 0.07);
      await this.esperar(220);
      this.cables[i].clearTint();
      await this.esperar(220);
    }
  }

  // Las teclas se mueven a huecos nuevos (ninguna se queda donde estaba)
  async barajar() {
    let huecos;
    do { huecos = Phaser.Utils.Array.Shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]); }
    while (huecos.some((h, i) => h === this.teclas[i].hueco));

    this.fijarMensaje("¡VIGILA LOS COLORES!", TINTA.naranja);
    await this.esperar(250);
    Sonido.barajar();
    this.teclas.forEach((t, i) => {
      t.sinNumero = true; // los números desaparecen: solo queda el color
      this.estadoTecla(t, 0);
      t.hueco = huecos[i];
      const p = this.posicionHueco(huecos[i]);
      this.tweens.add({ targets: t, x: p.x, y: p.y, duration: 650, ease: "Cubic.easeInOut" });
    });
    await this.esperar(700);
  }

  pulsar(id) {
    if (this.pausado) return;
    const e = this.estado;
    if (e.fase !== "respondiendo") return;
    this.iluminar(id, 160, true);

    if (id !== e.objetivo[e.posicion]) {
      this.explotar("¡TECLA EQUIVOCADA!");
      return;
    }

    // Combo: hay que pulsar antes de que pase la ventana de tiempo
    const ahora = this.time.now;
    const multAntes = this.multiplicador();
    if (ahora - e.ultimoToque <= PUNTOS.ventanaCombo) {
      e.combo++;
    } else {
      if (e.combo > PUNTOS.teclasPorMultiplicador) this.flotante(176, 124, "COMBO PERDIDO", TINTA.rojo);
      e.combo = 1;
    }
    e.ultimoToque = ahora;
    const mult = this.multiplicador();
    if (mult > multAntes) {
      Sonido.combo(mult);
      this.flotante(176, 124, `COMBO ×${mult}!`, TINTA.amarillo);
      this.tweens.add({ targets: this.hudCombo, scale: 2, duration: 90, yoyo: true });
    }

    const puntos = Math.round(PUNTOS.porTecla * mult * this.dif.multiplicador);
    e.puntos += puntos;
    const t = this.teclas[id];
    this.flotante(BOMBA.x + t.x, BOMBA.y + t.y - 22, "+" + puntos, TINTA.verde);

    e.posicion++;
    this.dibujarProgreso();
    this.actualizarHUD();

    if (e.posicion === e.objetivo.length) {
      if (e.especial === "cable") this.pedirCable();
      else this.desactivar();
    }
  }

  pedirCable() {
    this.estado.fase = "cable";
    Sonido.aviso();
    this.fijarMensaje("¡AHORA CORTA EL CABLE!\nTÓCALO O PULSA Z (ROJO) X (AZUL) C (AMARILLO)", TINTA.naranja);
    this.cables.forEach((c) => this.tweens.add({ targets: c, alpha: 0.6, duration: 200, yoyo: true, repeat: 1 }));
  }

  cortarCable(i) {
    if (this.pausado) return;
    const e = this.estado;
    if (e.fase !== "cable") return;
    this.cables[i].setFrame(i * 2 + 1);
    Sonido.corte();
    const zona = BOMBA.zonasCable[i];
    this.chispas.explode(12, BOMBA.x + zona.x + zona.w / 2, BOMBA.y + 32);
    if (i === e.cable) this.desactivar();
    else this.explotar(`¡ERA EL CABLE ${NOMBRES_CABLE[e.cable]}!`);
  }

  async desactivar() {
    const tk = ++this.token;
    const e = this.estado;
    e.fase = "desactivada";
    this.fijarLuz("ok");
    this.digitos.forEach((d) => d.setAlpha(1));

    const restante = Math.max(0, (e.fin - this.time.now) / 1000);
    const bonusTiempo = Math.round(restante * PUNTOS.bonusPorSegundo * this.dif.multiplicador);
    const bonusEspecial = e.especial ? Math.round(PUNTOS.bonusEspecial * this.dif.multiplicador) : 0;
    e.puntos += bonusTiempo + bonusEspecial;
    e.bombas++;
    this.actualizarHUD();

    let linea = `¡BOMBA DESACTIVADA!\nTIEMPO +${bonusTiempo}`;
    if (bonusEspecial) linea += ` · ESPECIAL +${bonusEspecial}`;
    this.fijarMensaje(linea, TINTA.verde);
    Sonido.exito();
    this.estrellas.explode(24, BOMBA.x + 104, BOMBA.y + 92);

    // Ola verde por el teclado
    this.teclas.forEach((t, i) => this.time.delayedCall(i * 40, () => {
      t.setTint(0x3dff8a);
      this.time.delayedCall(260, () => t.clearTint());
    }));

    await this.esperar(TIEMPOS.pausaEntreNiveles);
    if (tk !== this.token) return;
    this.tweens.add({ targets: this.bomba, x: -ANCHO, duration: 300, ease: "Cubic.easeIn" });
    await this.esperar(320);
    if (tk !== this.token) return;
    e.nivel++;
    this.nuevaBomba();
  }

  explotar(motivo) {
    ++this.token;
    const e = this.estado;
    e.fase = "explotada";
    this.dibujarReloj(0);
    this.dibujarProgreso(true);
    this.fijarLuz("apagada");

    // Explosión: sprite animado, destello, temblor y partículas
    const { x, y } = BOMBA.centro;
    this.add.sprite(x, y, "explosion").setScale(3).setDepth(50).play("explotar");
    this.time.delayedCall(120, () => this.add.sprite(x - 40, y + 50, "explosion").setScale(2).setDepth(49).play("explotar"));
    this.time.delayedCall(220, () => this.add.sprite(x + 45, y - 40, "explosion").setScale(2).setDepth(49).play("explotar"));
    this.cameras.main.flash(250, 255, 240, 200);
    this.cameras.main.shake(600, 0.03);
    this.chispas.explode(40, x, y);
    this.metralla.explode(18, x, y);
    this.time.delayedCall(250, () => this.humo.explode(16, x, y));
    Sonido.explosion();
    Musica.parar();
    this.time.delayedCall(300, () => this.bomba.setAlpha(0.25));

    // Mostrar la solución
    const secuencia = e.objetivo.map((id) => id + 1).join(" ");
    this.fijarMensaje(`${motivo}\nLA SECUENCIA ERA: ${secuencia}`, TINTA.rojo);

    const resultado = { puntos: e.puntos, nivel: e.nivel, bombas: e.bombas };
    const recordAnterior = Almacen.record(this.claveDif);
    const nuevoRecord = Almacen.guardarRecord(this.claveDif, resultado);

    this.time.delayedCall(TIEMPOS.esperaTrasExplosion, () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.start("FinPartida", {
          dificultad: this.claveDif, ...resultado, nuevoRecord, recordAnterior, motivo
        });
      });
    });
  }

  volverPortada() {
    if (this.estado.fase === "explotada") return;
    ++this.token;
    this.time.paused = false;
    this.pausado = false;
    this.estado.fase = "saliendo";
    this.scene.start("Portada");
  }

  /* =======================================================
     BUCLE: reloj, tic-tac y urgencia
     ======================================================= */
  update(tiempo) {
    const e = this.estado;
    if (this.pausado) return;
    if (e.fase !== "respondiendo" && e.fase !== "cable") return;

    const restante = Math.max(0, (e.fin - tiempo) / 1000);
    this.dibujarReloj(restante);

    const s = Math.ceil(restante);
    if (s !== e.ultimoSegundo && s > 0) {
      e.ultimoSegundo = s;
      Sonido.tic(s <= 3);
      if (s <= 3) this.cameras.main.shake(80, 0.004);
    }

    // Por debajo de 3 s el reloj parpadea
    const urgente = restante <= 3 && Math.floor(tiempo / 150) % 2 === 0;
    this.digitos.forEach((d) => d.setAlpha(urgente ? 0.35 : 1));

    if (restante <= 0) this.explotar("¡SE ACABÓ EL TIEMPO!");
  }
}
