/* =========================================================
   PRUEBAS AUTOMÁTICAS DE EXTREMO A EXTREMO (navegador real)

   Abren el juego en Chromium con Playwright y lo juegan solas:
   navegación entre escenas, especiales, ratón, fallos, récords...

   Uso:
     npm install --no-save playwright   (una vez; o usa uno ya instalado)
     npx playwright install chromium    (una vez)
     node tests/e2e.js

   Opciones (variables de entorno):
     PHASER_LOCAL=/ruta/phaser.min.js   usa esa copia de Phaser en vez del CDN
     URL=https://...                    prueba otra dirección (p. ej. GitHub Pages)
   ========================================================= */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const RAIZ = path.join(__dirname, "..");
const TIPOS = { ".html": "text/html", ".js": "application/javascript", ".png": "image/png", ".css": "text/css" };

// Servidor estático mínimo (los PNG no cargan desde file://)
function servir() {
  return new Promise((ok) => {
    const srv = http.createServer((req, res) => {
      const ruta = decodeURIComponent(req.url.split("?")[0]);
      const archivo = path.join(RAIZ, ruta === "/" ? "index.html" : ruta);
      if (!archivo.startsWith(RAIZ) || !fs.existsSync(archivo)) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { "Content-Type": TIPOS[path.extname(archivo)] || "application/octet-stream" });
      fs.createReadStream(archivo).pipe(res);
    });
    srv.listen(0, () => ok(srv));
  });
}

let fallos = 0;
function comprobar(condicion, descripcion) {
  console.log((condicion ? "  ✔ " : "  ✘ ") + descripcion);
  if (!condicion) fallos++;
}

async function main() {
  const srv = process.env.URL ? null : await servir();
  const url = process.env.URL || `http://localhost:${srv.address().port}/`;
  const navegador = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });

  // Cada prueba arranca en una página nueva con el almacenamiento limpio
  async function nuevaPagina() {
    const p = await navegador.newPage({ viewport: { width: 360, height: 600 } });
    p.errores = [];
    p.on("pageerror", (e) => p.errores.push(e.message));
    p.on("console", (m) => { if (m.type() === "error") p.errores.push(m.text()); });
    if (process.env.PHASER_LOCAL) {
      await p.route("**/phaser.min.js", (r) => r.fulfill({ path: process.env.PHASER_LOCAL, contentType: "application/javascript" }));
    }
    await p.goto(url);
    await p.waitForFunction(() => window.juego && juego.scene.isActive("Portada"), null, { timeout: 15000 });
    await p.evaluate(() => localStorage.clear());
    return p;
  }

  /* ---------- utilidades para manejar el juego ---------- */
  const escena = (p) => p.evaluate(() => ["Portada", "Juego", "FinPartida"].filter((k) => juego.scene.isActive(k)).join(","));
  const esperarEscena = async (p, nombre, ms = 6000) => {
    for (let t = 0; t < ms; t += 100) { if ((await escena(p)) === nombre) return true; await p.waitForTimeout(100); }
    return false;
  };
  const estado = (p) => p.evaluate(() => {
    const g = juego.scene.getScene("Juego"); const e = g.estado;
    return { fase: e.fase, nivel: e.nivel, patron: e.patron, objetivo: e.objetivo, especial: e.especial,
      cable: e.cable, huecos: g.teclas.map((t) => t.hueco), pos: g.teclas.map((t) => [t.x, t.y]),
      restante: (e.fin - g.time.now) / 1000, trampa: g.marcaTrampa.visible };
  });
  const esperarFase = async (p, fases, ms = 20000) => {
    for (let t = 0; t < ms; t += 50) {
      const s = await estado(p).catch(() => null);
      if (s && fases.includes(s.fase)) return s;
      await p.waitForTimeout(50);
    }
    throw new Error("no se llegó a la fase " + fases);
  };
  const clic = async (p, x, y) => {
    const q = await p.evaluate(([x, y]) => { const r = juego.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / 240, y: r.top + y * r.height / 400 }; }, [x, y]);
    await p.mouse.click(q.x, q.y);
  };
  // Pulsa la secuencia correcta con el teclado (1-9 = posición)
  const resolver = async (p, s) => {
    for (const id of s.objetivo) { await p.keyboard.press(String(s.huecos[id] + 1)); await p.waitForTimeout(160); }
    if (s.especial === "cable") { await esperarFase(p, ["cable"]); await p.keyboard.press("zxc"[s.cable]); }
  };
  const perder = async (p) => {
    const s = await esperarFase(p, ["respondiendo"]);
    const malo = (s.objetivo[0] + 1) % 9;
    await p.keyboard.press(String(s.huecos[malo] + 1));
    return esperarEscena(p, "FinPartida", 6000);
  };

  /* ===================================================== */
  console.log("\n1. Navegación entre escenas (fallo: no se podía volver a jugar)");
  {
    const p = await nuevaPagina();
    await clic(p, 120, 330);
    comprobar(await esperarEscena(p, "Juego"), "JUGAR desde la portada");
    comprobar(await perder(p), "perder lleva a la pantalla de fin");
    await clic(p, 120, 350);
    comprobar(await esperarEscena(p, "Portada"), "botón PORTADA");
    await clic(p, 120, 330);
    comprobar(await esperarEscena(p, "Juego"), "JUGAR otra vez tras volver a la portada");
    await perder(p);
    await clic(p, 120, 312);
    comprobar(await esperarEscena(p, "Juego"), "REINTENTAR");
    await perder(p);
    await clic(p, 120, 312);
    comprobar(await esperarEscena(p, "Juego"), "REINTENTAR por segunda vez");
    await perder(p);
    await p.keyboard.press("Escape");
    comprobar(await esperarEscena(p, "Portada"), "Esc en la pantalla de fin vuelve a la portada");
    await p.keyboard.press("Enter");
    comprobar(await esperarEscena(p, "Juego"), "Enter en la portada empieza otra partida");
    await p.keyboard.press("Escape");
    comprobar(await esperarEscena(p, "Portada"), "Esc durante la partida vuelve a la portada");
    await p.keyboard.press("Enter");
    comprobar(await esperarEscena(p, "Juego"), "y se puede volver a jugar");
    comprobar(p.errores.length === 0, "sin errores de JavaScript " + p.errores.join(" | "));
    await p.close();
  }

  /* ===================================================== */
  console.log("\n2. Sin escuchadores duplicados tras varias visitas");
  {
    const p = await nuevaPagina();
    const contar = (k) => p.evaluate((k) => {
      const sc = juego.scene.getScene(k);
      const kb = sc.input.keyboard;
      return sc.events.listenerCount("update") + "/" + kb.eventNames().reduce((n, e) => n + kb.listenerCount(e), 0);
    }, k);
    const vistos = { Juego: new Set(), Portada: new Set() };
    for (let v = 0; v < 3; v++) {
      await p.keyboard.press("Enter"); await esperarEscena(p, "Juego"); await p.waitForTimeout(300);
      vistos.Juego.add(await contar("Juego"));
      await p.keyboard.press("Escape"); await esperarEscena(p, "Portada"); await p.waitForTimeout(300);
      vistos.Portada.add(await contar("Portada"));
    }
    comprobar(vistos.Juego.size === 1 && vistos.Portada.size === 1, `contadores estables (Juego ${[...vistos.Juego]}, Portada ${[...vistos.Portada]})`);
    const antes = await p.evaluate(() => Sonido.activo);
    await p.keyboard.press("m");
    comprobar(antes !== (await p.evaluate(() => Sonido.activo)), "M alterna el sonido una sola vez");
    await p.close();
  }

  /* ===================================================== */
  console.log("\n3. Normal: niveles 1-7 con las 5 bombas especiales");
  {
    const p = await nuevaPagina();
    await p.keyboard.press("Enter");
    const vistas = [];
    let trampaVista = false;
    for (let n = 1; n <= 7; n++) {
      let s = await esperarFase(p, ["mostrando"]);
      while (s.fase === "mostrando") { if (s.trampa) trampaVista = true; await p.waitForTimeout(40); s = await estado(p); }
      s = await esperarFase(p, ["respondiendo"]);
      vistas.push(s.especial || "-");
      if (s.especial === "inversa") comprobar(s.objetivo.join() === [...s.patron].reverse().join(), "INVERSA pide la secuencia al revés");
      if (s.especial === "espejo") {
        const ok = s.objetivo.every((id, i) => id === Math.floor(s.patron[i] / 3) * 3 + 2 - (s.patron[i] % 3));
        comprobar(ok, "ESPEJO pide las teclas reflejadas (1-3, 4-6, 7-9)");
      }
      if (s.especial === "trampa") comprobar(trampaVista, "TRAMPA enseña al menos una luz falsa");
      await resolver(p, s);
      const f = await esperarFase(p, ["desactivada", "explotada"]);
      comprobar(f.fase === "desactivada", `nivel ${n} (${s.especial || "normal"}, ${s.patron.length} luces, ${s.restante.toFixed(1)} s) desactivado`);
    }
    comprobar(vistas.join() === "-,-,inversa,trampa,cable,espejo,barajada", "orden de presentación de especiales: " + vistas.join(" "));
    comprobar(p.errores.length === 0, "sin errores de JavaScript " + p.errores.join(" | "));
    await p.close();
  }

  /* ===================================================== */
  console.log("\n4. Experto con ratón: teclas sin número, cable equivocado y récord");
  {
    const p = await nuevaPagina();
    await clic(p, 120, 249);  // fila EXPERTO
    await clic(p, 120, 249);  // segundo toque = jugar
    comprobar(await esperarEscena(p, "Juego"), "tocar dos veces la dificultad empieza la partida");
    comprobar(await p.evaluate(() => juego.scene.getScene("Juego").teclas.every((t) => t.sinNumero)), "en Experto las teclas no tienen número");
    let explotoPorCable = false;
    for (let n = 1; n <= 8 && !explotoPorCable; n++) {
      const s = await esperarFase(p, ["respondiendo"]);
      for (const id of s.objetivo) { const [x, y] = s.pos[id]; await clic(p, 16 + x, 26 + y); await p.waitForTimeout(140); }
      if (s.especial === "cable") {
        await esperarFase(p, ["cable"]);
        const malo = (s.cable + 1) % 3;
        await clic(p, 16 + [30, 104, 178][malo], 26 + 30);
        explotoPorCable = (await esperarFase(p, ["explotada", "desactivada"])).fase === "explotada";
      } else {
        await esperarFase(p, ["desactivada"]);
      }
    }
    comprobar(explotoPorCable, "cortar un cable equivocado hace explotar la bomba");
    comprobar(await esperarEscena(p, "FinPartida"), "aparece la pantalla de fin");
    const record = await p.evaluate(() => JSON.parse(localStorage.getItem("bomba-record-experto") || "null"));
    comprobar(record && record.puntos > 0, "se guarda el récord de Experto: " + JSON.stringify(record));
    comprobar(p.errores.length === 0, "sin errores de JavaScript " + p.errores.join(" | "));
    await p.close();
  }

  /* ===================================================== */
  console.log("\n5. Se acaba el tiempo");
  {
    const p = await nuevaPagina();
    await p.evaluate(() => { DIFICULTADES.normal.tiempoBase = -5; }); // reloj muy corto para no esperar
    await p.keyboard.press("Enter");
    await esperarFase(p, ["respondiendo"]);
    const f = await esperarFase(p, ["explotada"], 8000);
    comprobar(f.fase === "explotada", "la bomba explota al llegar a cero");
    comprobar(await esperarEscena(p, "FinPartida"), "y se pasa a la pantalla de fin");
    await p.close();
  }

  await navegador.close();
  if (srv) srv.close();
  console.log(fallos ? `\n✘ ${fallos} comprobación(es) fallida(s)` : "\n✔ Todas las comprobaciones han pasado");
  process.exit(fallos ? 1 : 0);
}

main().catch((e) => { console.error("ERROR EN LAS PRUEBAS:", e); process.exit(1); });
