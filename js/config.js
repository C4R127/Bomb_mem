/* =========================================================
   CONFIGURACIÓN GENERAL DEL JUEGO
   Todo lo que ajusta la dificultad, la puntuación o la
   posición de los elementos está aquí, en un solo sitio.
   ========================================================= */

// Resolución interna (pixel art). Phaser la escala a la pantalla.
const ANCHO = 240;
const ALTO = 400;

// Colores y notas de las 9 teclas (mismo orden que tools/generar_assets.py)
const COLORES = [0xff3b5c, 0xff8a1f, 0xffd23f, 0x2ee6a6, 0x29b6ff, 0x7a5cff, 0xff4fd8, 0xffffff, 0xb4ff3a];
const NOTAS = [262, 294, 330, 349, 392, 440, 494, 523, 587];

// Paleta para textos
const TINTA = {
  blanco: 0xf4ecff,
  apagado: 0xa493c9,
  amarillo: 0xffd23f,
  rojo: 0xff3b5c,
  verde: 0x3dff8a,
  naranja: 0xff8a1f,
  oscuro: 0x1a1a1a,
  azul: 0x29b6ff
};

// Fuente bitmap (assets/fuente.png). El orden de caracteres debe ser
// idéntico a CARACTERES_FUENTE en tools/generar_assets.py
const FUENTE = {
  clave: "pixel",
  imagen: "fuente",
  caracteres: " !\"%'()*+,-./0123456789:<=>?ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚÑÜ¡¿×·",
  ancho: 6,
  alto: 10,
  porFila: 16
};

/* ---------------------------------------------------------
   DIFICULTADES
   longitudInicial   teclas del patrón en el nivel 1
   tiempoInicial     segundos para responder en el nivel 1
   restaTiempo       segundos que se pierden en cada nivel
   tiempoMinimo      nunca habrá menos tiempo que esto
   destello*         ms que dura encendida cada luz (más bajo = más rápido)
   multiplicador     multiplica todos los puntos
   especialDesde     nivel en el que aparecen bombas especiales
   probEspecial      probabilidad de bomba especial (tras presentarlas)
   sinNumeros        las teclas solo muestran su color
   --------------------------------------------------------- */
const DIFICULTADES = {
  facil: {
    nombre: "FÁCIL", nivelIconos: 1,
    descripcion: "TIEMPO DE SOBRA Y LUCES LENTAS. IDEAL PARA EMPEZAR.",
    longitudInicial: 3, tiempoInicial: 15, restaTiempo: 0.5, tiempoMinimo: 8,
    destelloInicial: 700, restaDestello: 30, destelloMinimo: 350,
    multiplicador: 1, especialDesde: 4, probEspecial: 0.3, sinNumeros: false
  },
  normal: {
    nombre: "NORMAL", nivelIconos: 2,
    descripcion: "EL RETO CLÁSICO. ESPECIALES DESDE EL NIVEL 3.",
    longitudInicial: 3, tiempoInicial: 12, restaTiempo: 0.8, tiempoMinimo: 6,
    destelloInicial: 600, restaDestello: 40, destelloMinimo: 280,
    multiplicador: 1.5, especialDesde: 3, probEspecial: 0.35, sinNumeros: false
  },
  dificil: {
    nombre: "DIFÍCIL", nivelIconos: 3,
    descripcion: "SECUENCIAS LARGAS, LUCES RÁPIDAS Y MÁS ESPECIALES.",
    longitudInicial: 4, tiempoInicial: 10, restaTiempo: 0.8, tiempoMinimo: 5,
    destelloInicial: 500, restaDestello: 40, destelloMinimo: 220,
    multiplicador: 2, especialDesde: 2, probEspecial: 0.45, sinNumeros: false
  },
  experto: {
    nombre: "EXPERTO", nivelIconos: 4,
    descripcion: "TECLAS SIN NÚMEROS: SOLO COLORES. PUNTOS ×3.",
    longitudInicial: 5, tiempoInicial: 9, restaTiempo: 0.7, tiempoMinimo: 4.5,
    destelloInicial: 420, restaDestello: 30, destelloMinimo: 180,
    multiplicador: 3, especialDesde: 2, probEspecial: 0.6, sinNumeros: true
  }
};
const ORDEN_DIFICULTADES = ["facil", "normal", "dificil", "experto"];
const LONGITUD_MAXIMA = 16; // caben 16 puntos de progreso en la bomba

/* ---------------------------------------------------------
   BOMBAS ESPECIALES (se presentan una a una y luego salen al azar)
   --------------------------------------------------------- */
const ESPECIALES = {
  inversa: {
    nombre: "INVERSA", icono: 2, tiempoExtra: 1,
    aviso: "REPITE LA SECUENCIA AL REVÉS",
    turno: "¡AL REVÉS! EMPIEZA POR LA ÚLTIMA LUZ."
  },
  cable: {
    nombre: "CABLE", icono: 3, tiempoExtra: 3,
    aviso: "RECUERDA EL CABLE QUE PARPADEA",
    turno: "REPITE LA SECUENCIA Y LUEGO CORTA EL CABLE."
  },
  barajada: {
    nombre: "BARAJADA", icono: 4, tiempoExtra: 2,
    aviso: "LAS TECLAS CAMBIARÁN DE SITIO",
    turno: "¡SE HAN MOVIDO! SIGUE LOS COLORES."
  }
};
const ORDEN_ESPECIALES = ["inversa", "cable", "barajada"];

/* ---------------------------------------------------------
   PUNTUACIÓN Y COMBOS
   --------------------------------------------------------- */
const PUNTOS = {
  porTecla: 10,                // puntos base por tecla correcta
  ventanaCombo: 1000,          // ms máximos entre pulsaciones para mantener el combo
  ventanaPrimera: 1800,        // ms para la primera tecla de cada bomba
  teclasPorMultiplicador: 4,   // cada 4 teclas seguidas sube el multiplicador
  multiplicadorMaximo: 5,
  bonusPorSegundo: 20,         // por cada segundo que sobre al desactivar
  bonusEspecial: 150           // por desactivar una bomba especial
};

/* ---------------------------------------------------------
   TIEMPOS DE PRESENTACIÓN (ms)
   --------------------------------------------------------- */
const TIEMPOS = {
  antesDeSecuencia: 500,
  pausaEntreNiveles: 1300,
  esperaTrasExplosion: 2300
};

/* ---------------------------------------------------------
   POSICIONES (en píxeles de la resolución interna)
   La bomba es un contenedor situado en BOMBA.x, BOMBA.y.
   Las coordenadas de dentro son relativas a ese contenedor.
   --------------------------------------------------------- */
const BOMBA = {
  x: 16, y: 26,
  cuerpoY: 46,                                     // el cuerpo va bajo los cables
  digitos: [{ x: 22, f: 0 }, { x: 48, f: 1 }, { x: 70, f: "punto" }, { x: 88, f: 3 }],
  digitosY: 69,
  luz: { x: 166, y: 70 },
  iconoEspecial: { x: 172, y: 98 },
  progresoY: 124,
  teclaX: [54, 104, 154],
  teclaY: [166, 216, 266],
  // zonas táctiles para cortar cada cable (rojo, azul, amarillo)
  zonasCable: [{ x: 0, w: 60 }, { x: 74, w: 60 }, { x: 148, w: 60 }],
  centro: { x: 120, y: 200 }                       // centro de la bomba en pantalla
};
const NOMBRES_CABLE = ["ROJO", "AZUL", "AMARILLO"];
const COLORES_CABLE = [0xff3b5c, 0x29b6ff, 0xffd23f];
