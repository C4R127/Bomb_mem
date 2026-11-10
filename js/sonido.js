/* =========================================================
   SONIDO: efectos sintetizados con Web Audio (sin archivos).
   Usa el AudioContext de Phaser, que ya se desbloquea solo
   con el primer toque o clic del jugador.
   ========================================================= */
const Sonido = {
  activo: true,
  juego: null,

  iniciar(juego) {
    this.juego = juego;
    this.activo = Almacen.leer("bomba-sonido", "si") !== "no";
  },

  alternar() {
    this.activo = !this.activo;
    Almacen.escribir("bomba-sonido", this.activo ? "si" : "no");
    if (this.activo) this.clic();
    return this.activo;
  },

  contexto() {
    if (!this.activo || !this.juego) return null;
    const ctx = this.juego.sound && this.juego.sound.context;
    if (!ctx) return null;
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  },

  // Nota simple con envolvente que se apaga
  tono(freq, dur = 0.15, tipo = "square", vol = 0.06, retraso = 0) {
    const ctx = this.contexto();
    if (!ctx) return;
    const t = ctx.currentTime + retraso;
    const osc = ctx.createOscillator();
    const gan = ctx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(freq, t);
    gan.gain.setValueAtTime(vol, t);
    gan.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gan).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  },

  // Barrido de frecuencia (para efectos "whoosh", alarmas...)
  barrido(desde, hasta, dur, tipo = "square", vol = 0.05, retraso = 0) {
    const ctx = this.contexto();
    if (!ctx) return;
    const t = ctx.currentTime + retraso;
    const osc = ctx.createOscillator();
    const gan = ctx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(desde, t);
    osc.frequency.exponentialRampToValueAtTime(hasta, t + dur);
    gan.gain.setValueAtTime(vol, t);
    gan.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gan).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  },

  // Ruido blanco filtrado (explosión, corte de cable)
  ruido(dur, frecFiltro, vol) {
    const ctx = this.contexto();
    if (!ctx) return;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const datos = buffer.getChannelData(0);
    for (let i = 0; i < datos.length; i++) {
      datos[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / datos.length, 2);
    }
    const fuente = ctx.createBufferSource();
    fuente.buffer = buffer;
    const filtro = ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.frequency.value = frecFiltro;
    const gan = ctx.createGain();
    gan.gain.value = vol;
    fuente.connect(filtro).connect(gan).connect(ctx.destination);
    fuente.start();
  },

  /* ---- Efectos con nombre ---- */
  clic() { this.tono(660, 0.05, "square", 0.04); },
  nota(i, dur) { this.tono(NOTAS[i], dur, "square", 0.06); },
  tic(urgente) { this.tono(urgente ? 1200 : 800, 0.05, "square", 0.035); },
  combo(mult) { this.tono(700 + mult * 120, 0.08, "triangle", 0.07); },
  exito() { [523, 659, 784, 1047].forEach((f, i) => this.tono(f, 0.14, "square", 0.06, i * 0.09)); },
  aviso() { [880, 660, 880, 660].forEach((f, i) => this.tono(f, 0.09, "square", 0.05, i * 0.11)); },
  barajar() { this.barrido(200, 900, 0.35, "sawtooth", 0.04); this.barrido(900, 300, 0.3, "sawtooth", 0.03, 0.3); },
  trampa() { this.barrido(180, 90, 0.25, "sawtooth", 0.07); this.tono(95, 0.25, "square", 0.04); },
  corte() { this.ruido(0.12, 4000, 0.4); this.tono(1800, 0.05, "square", 0.05); },
  record() { [784, 988, 1175, 1568].forEach((f, i) => this.tono(f, 0.18, "triangle", 0.07, i * 0.12)); },

  explosion() {
    this.ruido(1.4, 900, 0.55);
    this.barrido(140, 30, 0.9, "sawtooth", 0.16);
  }
};
