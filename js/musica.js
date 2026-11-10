/* =========================================================
   MÚSICA: dos pistas chiptune originales generadas con Web Audio
   (sin archivos). Un pequeño secuenciador programa las notas con
   antelación sobre el reloj de audio, así el ritmo no depende de
   los fotogramas del juego.

     Musica.tocar("portada" | "juego")   empieza una pista en bucle
     Musica.parar()                      la corta
     Musica.atenuar(true/false)          la baja a cero (al enseñar la secuencia)
     Musica.pausar() / reanudar()        para la pantalla de pausa
     Musica.alternar()                   música sí/no (se guarda)
   ========================================================= */

// Frecuencia de una nota escrita como "A4", "C#3", "Bb2"
function frecuencia(nota) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(nota);
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
  const alter = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0;
  const midi = 12 * (Number(m[3]) + 1) + base + alter;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/* ---------------------------------------------------------
   PISTAS
   Cada lista tiene un elemento por CORCHEA (8 por compás).
   null = silencio. Baterías: B bombo · C caja · h charles.
   --------------------------------------------------------- */
const PISTAS = {
  // Portada: tranquila y pegadiza (La menor: Am - F - C - G)
  portada: {
    bpm: 112,
    volumen: 0.5,
    melodia: [
      "E5", null, "C5", "E5", "A5", null, "G5", "E5",
      "F5", null, "A5", "F5", "C5", null, "A4", "C5",
      "E5", null, "G5", "C6", "G5", null, "E5", "G5",
      "D5", null, "B4", "D5", "G5", "F5", "E5", "D5"
    ],
    bajo: [
      "A2", "A3", "A2", "A3", "A2", "A3", "A2", "A3",
      "F2", "F3", "F2", "F3", "F2", "F3", "F2", "F3",
      "C3", "C4", "C3", "C4", "C3", "C4", "C3", "C4",
      "G2", "G3", "G2", "G3", "G2", "G3", "G2", "G3"
    ],
    bateria: "B.h.h.h.B.h.h.h.B.h.h.h.B.h.hhh."
  },

  // Partida: tensa, de película de espías (Re menor, bajo insistente)
  juego: {
    bpm: 132,
    volumen: 0.42,
    melodia: [
      null, null, "A4", null, null, "Bb4", null, "A4",
      null, null, "F4", null, "E4", null, "D4", null,
      "D5", null, null, "C5", null, "A4", null, null,
      null, "Bb4", null, "A4", null, "G#4", null, "A4"
    ],
    bajo: [
      "D2", "D3", "D2", "D3", "D2", "D3", "C3", "C#3",
      "D2", "D3", "D2", "D3", "Bb2", "A2", "G#2", "A2",
      "D2", "D3", "D2", "D3", "D2", "D3", "C3", "C#3",
      "Bb2", "Bb2", "A2", "A2", "G#2", "G#2", "A2", "C#3"
    ],
    bateria: "BhChBhChBhChBhChBhChBhChBhChBhCC"
  }
};

const Musica = {
  activa: true,
  pista: null,          // nombre de la pista que suena (o null)
  salida: null,         // nodo de volumen general de la música
  paso: 0,
  siguiente: 0,         // instante (reloj de audio) de la próxima corchea
  temporizador: null,
  atenuada: false,
  pausada: false,

  iniciar() {
    this.activa = Almacen.leer("bomba-musica", "si") !== "no";
  },

  contexto() {
    return Sonido.juego && Sonido.juego.sound && Sonido.juego.sound.context;
  },

  // Volumen objetivo según el estado (apagada, atenuada, en pausa...)
  volumenObjetivo() {
    if (!this.activa || !this.pista || this.atenuada || this.pausada) return 0;
    return PISTAS[this.pista].volumen;
  },

  aplicarVolumen(segundos = 0.15) {
    const ctx = this.contexto();
    if (!ctx || !this.salida) return;
    const g = this.salida.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(g.value, ctx.currentTime);
    g.linearRampToValueAtTime(this.volumenObjetivo(), ctx.currentTime + segundos);
  },

  tocar(nombre) {
    const ctx = this.contexto();
    if (!ctx) return;
    if (this.pista === nombre && this.temporizador) { this.aplicarVolumen(); return; }
    this.parar();
    if (ctx.state === "suspended") ctx.resume();
    this.pista = nombre;
    this.atenuada = false;
    this.pausada = false;
    this.salida = ctx.createGain();
    this.salida.gain.value = 0;
    this.salida.connect(ctx.destination);
    this.aplicarVolumen(0.6); // entrada suave
    this.paso = 0;
    this.siguiente = ctx.currentTime + 0.1;
    this.temporizador = setInterval(() => this.programar(), 25);
  },

  parar() {
    if (this.temporizador) clearInterval(this.temporizador);
    this.temporizador = null;
    const ctx = this.contexto();
    if (this.salida && ctx) {
      const s = this.salida;
      s.gain.cancelScheduledValues(ctx.currentTime);
      s.gain.setValueAtTime(s.gain.value, ctx.currentTime);
      s.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
      setTimeout(() => s.disconnect(), 300);
    }
    this.salida = null;
    this.pista = null;
  },

  atenuar(si) { this.atenuada = si; this.aplicarVolumen(si ? 0.12 : 0.4); },
  pausar() { this.pausada = true; this.aplicarVolumen(0.1); },
  reanudar() { this.pausada = false; this.aplicarVolumen(0.3); },

  alternar() {
    this.activa = !this.activa;
    Almacen.escribir("bomba-musica", this.activa ? "si" : "no");
    this.aplicarVolumen(0.2);
    return this.activa;
  },

  // Programa las corcheas de los próximos 120 ms (patrón "lookahead")
  programar() {
    const ctx = this.contexto();
    if (!ctx || !this.pista) return;
    const p = PISTAS[this.pista];
    const corchea = 60 / p.bpm / 2;
    // Si la pestaña estuvo oculta, no intentamos "recuperar" las notas perdidas
    if (this.siguiente < ctx.currentTime - 0.2) this.siguiente = ctx.currentTime + 0.05;
    while (this.siguiente < ctx.currentTime + 0.12) {
      // Mientras está en silencio no se generan notas (ahorra trabajo)
      if (this.volumenObjetivo() > 0 || this.salida.gain.value > 0.001) {
        this.notas(p, this.paso % p.melodia.length, this.siguiente, corchea);
      }
      this.paso++;
      this.siguiente += corchea;
    }
  },

  notas(p, i, t, corchea) {
    const ctx = this.contexto();
    if (p.melodia[i]) this.oscilador(ctx, "square", frecuencia(p.melodia[i]), t, corchea * 0.9, 0.09);
    if (p.bajo[i]) this.oscilador(ctx, "triangle", frecuencia(p.bajo[i]), t, corchea * 0.8, 0.22);
    const golpe = p.bateria[i];
    if (golpe === "B") this.bombo(ctx, t);
    else if (golpe === "C") this.ruido(ctx, t, 0.09, 1800, 0.14);
    else if (golpe === "h") this.ruido(ctx, t, 0.03, 7000, 0.05);
  },

  oscilador(ctx, tipo, freq, t, dur, vol) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.salida);
    o.start(t);
    o.stop(t + dur + 0.02);
  },

  bombo(ctx, t) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    o.connect(g).connect(this.salida);
    o.start(t);
    o.stop(t + 0.17);
  },

  ruido(ctx, t, dur, filtroHz, vol) {
    if (!this.bufferRuido) {
      const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.2), ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
      this.bufferRuido = b;
    }
    const f = ctx.createBufferSource();
    f.buffer = this.bufferRuido;
    const filtro = ctx.createBiquadFilter();
    filtro.type = "highpass";
    filtro.frequency.value = filtroHz;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    f.connect(filtro).connect(g).connect(this.salida);
    f.start(t);
    f.stop(t + dur + 0.02);
  }
};
