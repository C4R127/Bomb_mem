/* =========================================================
   ALMACÉN: preferencias y récords en localStorage.
   Todo va dentro de try/catch: si el navegador bloquea el
   almacenamiento (modo privado...) el juego sigue funcionando.
   ========================================================= */
const Almacen = {
  leer(clave, porDefecto) {
    try {
      const v = localStorage.getItem(clave);
      return v === null ? porDefecto : v;
    } catch (e) {
      return porDefecto;
    }
  },

  escribir(clave, valor) {
    try { localStorage.setItem(clave, valor); } catch (e) { /* sin almacenamiento */ }
  },

  // Récord de una dificultad: { puntos, nivel, bombas }
  record(dificultad) {
    try {
      const datos = JSON.parse(this.leer("bomba-record-" + dificultad, "null"));
      if (datos && typeof datos.puntos === "number") return datos;
    } catch (e) { /* dato corrupto: se ignora */ }
    return { puntos: 0, nivel: 0, bombas: 0 };
  },

  // Colección: escenarios en los que se ha desactivado al menos una bomba
  coleccion(dificultad) {
    try {
      const lista = JSON.parse(this.leer("bomba-coleccion-" + dificultad, "[]"));
      if (Array.isArray(lista)) return lista.filter((k) => ORDEN_ESCENARIOS.includes(k));
    } catch (e) { /* dato corrupto: se ignora */ }
    return [];
  },

  // Añade un escenario a la colección. Devuelve true si es nuevo.
  marcarEscenario(dificultad, escenario) {
    const lista = this.coleccion(dificultad);
    if (lista.includes(escenario)) return false;
    lista.push(escenario);
    this.escribir("bomba-coleccion-" + dificultad, JSON.stringify(lista));
    return true;
  },

  // Guarda el resultado si supera el récord. Devuelve true si es nuevo récord.
  guardarRecord(dificultad, resultado) {
    const actual = this.record(dificultad);
    if (resultado.puntos > actual.puntos) {
      this.escribir("bomba-record-" + dificultad, JSON.stringify(resultado));
      return true;
    }
    return false;
  }
};
