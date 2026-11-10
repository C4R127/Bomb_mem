/* =========================================================
   PARCHES PARA PHASER 3.80
   Se carga justo después de Phaser y antes del juego.

   1. TECLAS REPETIDAS
   Phaser procesa su cola de teclas en cuanto llega CADA tecla
   (evento MANAGER_PROCESS), pero solo la vacía al final del
   fotograma (POST_STEP). Si dos teclas llegan dentro del mismo
   fotograma (~16 ms), al llegar la segunda vuelve a procesar
   también la primera.

   Consecuencias en el juego:
     · Pulsar dos teclas de la bomba muy rápido: la primera se
       repetía, contaba como tecla equivocada y la bomba explotaba.
     · En la portada, una tecla seguida de H abría y cerraba la ayuda.

   Solución: cada escena recuerda (WeakSet) qué eventos ya ha
   procesado y solo pasa a Phaser los nuevos.
   ========================================================= */
(function parcheTeclasRepetidas() {
  const proto = Phaser.Input.Keyboard.KeyboardPlugin.prototype;
  const actualizarOriginal = proto.update;

  proto.update = function () {
    const gestor = this.manager;
    if (!gestor || gestor.queue.length === 0) return actualizarOriginal.call(this);

    if (!this._eventosVistos) this._eventosVistos = new WeakSet();
    const vistos = this._eventosVistos;
    const cola = gestor.queue;
    const nuevos = cola.filter((evento) => !vistos.has(evento));
    nuevos.forEach((evento) => vistos.add(evento));

    // Se le enseña a Phaser solo la parte nueva de la cola y se restaura después
    gestor.queue = nuevos;
    try {
      actualizarOriginal.call(this);
    } finally {
      gestor.queue = cola;
    }
  };
})();
