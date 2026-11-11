#!/usr/bin/env python3
"""
Generador del pixel art de "Desactiva la bomba".

Dibuja TODOS los PNG de la carpeta assets/ píxel a píxel con Pillow.
No hace falta ejecutarlo para jugar (los PNG ya están en el repositorio);
sirve para regenerarlos o como punto de partida si quieres retocar el arte.

Uso:
    pip install pillow
    python3 tools/generar_assets.py

Los PNG resultantes se pueden editar después en Aseprite, Piskel, GIMP...
Si cambias tamaños de frame, actualiza también js/config.js (sección ARTE).
"""
import math
import os
import random

from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, "assets")

# ---------------------------------------------------------------------------
# 1. PALETA (pocos colores, todos con nombre, para un look coherente)
# ---------------------------------------------------------------------------
def hx(c, a=255):
    c = c.lstrip("#")
    return (int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16), a)

P = {
    "negro": hx("#0d0b14"),
    "tinta": hx("#15171c"),
    "carcasa": hx("#3a3f4b"),
    "carcasa_luz": hx("#565c6b"),
    "carcasa_osc": hx("#23262e"),
    "carcasa_hundida": hx("#2e323c"),
    "tornillo": hx("#8a8f9c"),
    "tornillo_osc": hx("#4a4e58"),
    "peligro": hx("#ffcc00"),
    "peligro_osc": hx("#1a1a1a"),
    "led_fondo": hx("#160606"),
    "led_linea": hx("#1f0909"),
    "led_off": hx("#2a0a0a"),
    "led_on": hx("#ff4136"),
    "led_brillo": hx("#ffb0a8"),
    "ok": hx("#3dff8a"),
    "ok_osc": hx("#1f9a52"),
    "cobre": hx("#d08a3a"),
    "blanco": hx("#ffffff"),
    "tecla": hx("#2b2f3a"),
    "tecla_luz": hx("#3c4150"),
    "tecla_sombra": hx("#1b1e26"),
    "fondo": hx("#1b1035"),
    "fondo_linea": hx("#221545"),
    "fondo_pista": hx("#2c1d5a"),
    "fondo_pad": hx("#43308a"),
}

# Colores de las 9 teclas (mismo orden que en js/config.js)
COLORES_TECLAS = ["#ff3b5c", "#ff8a1f", "#ffd23f", "#2ee6a6", "#29b6ff",
                  "#7a5cff", "#ff4fd8", "#ffffff", "#b4ff3a"]

TRANSPARENTE = (0, 0, 0, 0)


def mezcla(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3)) + (c1[3],)


def lienzo(w, h):
    return Image.new("RGBA", (w, h), TRANSPARENTE)


def rect(img, x, y, w, h, color):
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            if 0 <= xx < img.width and 0 <= yy < img.height:
                img.putpixel((xx, yy), color)


def px(img, x, y, color):
    if 0 <= x < img.width and 0 <= y < img.height:
        img.putpixel((x, y), color)


def mapa(img, ox, oy, filas, colores, escala=1):
    """Dibuja un sprite definido como lista de strings ('.' = transparente)."""
    for y, fila in enumerate(filas):
        for x, ch in enumerate(fila):
            if ch != "." and ch in colores:
                rect(img, ox + x * escala, oy + y * escala, escala, escala, colores[ch])


def guardar(img, nombre):
    ruta = os.path.join(SALIDA, nombre)
    img.save(ruta)
    print(f"  {nombre:20s} {img.width}x{img.height}")


# ---------------------------------------------------------------------------
# 2. FUENTE PIXEL 5x7 (celdas de 6x10: 2 filas para tildes arriba)
# ---------------------------------------------------------------------------
GLIFOS = {
    "A": [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
    "B": ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
    "C": [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
    "D": ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
    "E": ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
    "F": ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
    "G": [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".####"],
    "H": ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
    "I": [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
    "J": ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
    "K": ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
    "L": ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
    "M": ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
    "N": ["#...#", "#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#"],
    "O": [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    "P": ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
    "Q": [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
    "R": ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
    "S": [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
    "T": ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
    "U": ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    "V": ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
    "W": ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "#.#.#", ".#.#."],
    "X": ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
    "Y": ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
    "Z": ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
    "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
    "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
    "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
    "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
    "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
    "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
    "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
    "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
    "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
    "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
    " ": ["....."] * 7,
    "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
    "¡": ["..#..", ".....", "..#..", "..#..", "..#..", "..#..", "..#.."],
    "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
    "¿": ["..#..", ".....", "..#..", ".#...", "#....", "#...#", ".###."],
    ".": [".....", ".....", ".....", ".....", ".....", ".....", "..#.."],
    ",": [".....", ".....", ".....", ".....", ".....", "..#..", ".#..."],
    ":": [".....", "..#..", ".....", ".....", ".....", "..#..", "....."],
    "-": [".....", ".....", ".....", ".###.", ".....", ".....", "....."],
    "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
    "×": [".....", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "....."],
    "/": ["....#", "....#", "...#.", "..#..", ".#...", "#....", "#...."],
    "(": ["...#.", "..#..", ".#...", ".#...", ".#...", "..#..", "...#."],
    ")": [".#...", "..#..", "...#.", "...#.", "...#.", "..#..", ".#..."],
    "'": ["..#..", "..#..", ".....", ".....", ".....", ".....", "....."],
    '"': [".#.#.", ".#.#.", ".....", ".....", ".....", ".....", "....."],
    "%": ["##..#", "##..#", "...#.", "..#..", ".#...", "#..##", "#..##"],
    "<": ["...#.", "..#..", ".#...", "#....", ".#...", "..#..", "...#."],
    ">": [".#...", "..#..", "...#.", "....#", "...#.", "..#..", ".#..."],
    "=": [".....", ".....", "#####", ".....", "#####", ".....", "....."],
    "*": [".....", "..#..", "#.#.#", ".###.", "#.#.#", "..#..", "....."],
    "·": [".....", ".....", ".....", "..#..", ".....", ".....", "....."],
}
# Letras con tilde: glifo base + 2 filas de acento encima
ACENTOS = {
    "Á": ("A", ["...#.", "..#.."]),
    "É": ("E", ["...#.", "..#.."]),
    "Í": ("I", ["...#.", "..#.."]),
    "Ó": ("O", ["...#.", "..#.."]),
    "Ú": ("U", ["...#.", "..#.."]),
    "Ñ": ("N", [".##.#", "#.##."]),
    "Ü": ("U", [".....", ".#.#."]),
}
# ¡Este orden debe coincidir EXACTAMENTE con FUENTE.caracteres en js/config.js!
CARACTERES_FUENTE = (" !\"%'()*+,-./0123456789:<=>?"
                     "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                     "ÁÉÍÓÚÑÜ¡¿×·")
CELDA_W, CELDA_H, POR_FILA = 6, 10, 16


def generar_fuente():
    filas = math.ceil(len(CARACTERES_FUENTE) / POR_FILA)
    img = lienzo(CELDA_W * POR_FILA, CELDA_H * filas)
    blanco = {"#": P["blanco"]}
    for i, ch in enumerate(CARACTERES_FUENTE):
        ox = (i % POR_FILA) * CELDA_W
        oy = (i // POR_FILA) * CELDA_H
        if ch in ACENTOS:
            base, acento = ACENTOS[ch]
            mapa(img, ox, oy, acento, blanco)
            mapa(img, ox, oy + 2, GLIFOS[base], blanco)
        else:
            mapa(img, ox, oy + 2, GLIFOS[ch], blanco)
    guardar(img, "fuente.png")


# ---------------------------------------------------------------------------
# 3. CUERPO DE LA BOMBA (208x256)
# ---------------------------------------------------------------------------
def biselar(img, x, y, w, h, luz, sombra, grosor=1):
    for g in range(grosor):
        rect(img, x + g, y + g, w - 2 * g, 1, luz)
        rect(img, x + g, y + g, 1, h - 2 * g, luz)
        rect(img, x + g, y + h - 1 - g, w - 2 * g, 1, sombra)
        rect(img, x + w - 1 - g, y + g, 1, h - 2 * g, sombra)


def tornillo(img, x, y):
    # Cabeza de tornillo 7x7 con ranura en cruz
    filas = [".sssss.", "sllsdds", "slsksds", "skkkkks", "sdsksds", "sddsdds", ".sssss."]
    mapa(img, x, y, filas, {"s": P["tornillo_osc"], "l": hx("#b8bcc6"),
                            "d": P["tornillo"], "k": P["carcasa_osc"]})


# Variantes de la carcasa: una por escenario (colores + detalles propios)
VARIANTES_BOMBA = {
    "bunker":      {"carcasa": "#4a5236", "luz": "#69734b", "osc": "#2a301e", "hundida": "#394026",
                    "franja": ("#ffcc00", "#1a1a1a")},
    "laboratorio": {"carcasa": "#aab8c2", "luz": "#dfe9ef", "osc": "#5e6e79", "hundida": "#7f8f9a",
                    "franja": ("#29b6ff", "#0f2430")},
    "tren":        {"carcasa": "#6b3a2a", "luz": "#94573a", "osc": "#3a1d14", "hundida": "#4f2a1e",
                    "franja": ("#ffcc00", "#1a1a1a")},
    "camara":      {"carcasa": "#2b2b33", "luz": "#4d4d5a", "osc": "#131318", "hundida": "#202027",
                    "franja": ("#e8b84a", "#3a2a08")},
}


def detalles_bomba(img, nombre, v, W, H):
    """Detalles propios de cada escenario sobre la carcasa (antes de los huecos)."""
    rnd = random.Random(nombre)
    if nombre == "bunker":
        # Camuflaje: manchas de dos tonos
        for _ in range(38):
            cx, cy, r = rnd.randint(8, W - 8), rnd.randint(8, H - 8), rnd.randint(4, 11)
            col = hx(rnd.choice(["#5d6640", "#3b4229", "#6e7450"]))
            for y in range(cy - r, cy + r):
                for x in range(cx - r - 3, cx + r + 3):
                    if 8 <= x < W - 8 and 8 <= y < H - 8 and ((x - cx) / 1.4) ** 2 + (y - cy) ** 2 < r * r:
                        img.putpixel((x, y), col)
    elif nombre == "laboratorio":
        # Paneles lisos con juntas y una franja cian
        for y in (90, 250):
            rect(img, 8, y - 1, W - 16, 1, hx(v["osc"]))
        rect(img, 8, 8, 3, H - 16, hx("#29b6ff"))
        rect(img, W - 11, 8, 3, H - 16, hx("#29b6ff"))
    elif nombre == "tren":
        # Chapa con óxido y filas de remaches
        for _ in range(60):
            x, y = rnd.randint(8, W - 10), rnd.randint(8, H - 10)
            rect(img, x, y, rnd.randint(2, 5), rnd.randint(1, 3), hx(rnd.choice(["#7d4a2c", "#5a2f20", "#8a5a30"])))
        for x in range(14, W - 14, 9):
            rect(img, x, 9, 2, 2, hx("#c89a6a")); rect(img, x, H - 11, 2, 2, hx("#c89a6a"))
        for y in range(18, H - 18, 9):
            rect(img, 9, y, 2, 2, hx("#c89a6a")); rect(img, W - 11, y, 2, 2, hx("#c89a6a"))
    elif nombre == "camara":
        # Molduras doradas y rombos de acero pulido
        oro = hx("#e8b84a")
        rect(img, 8, 8, W - 16, 1, oro); rect(img, 8, H - 9, W - 16, 1, oro)
        rect(img, 8, 8, 1, H - 16, oro); rect(img, W - 9, 8, 1, H - 16, oro)
        for y in range(14, H - 12, 8):
            for x in range(14 + (y // 8 % 2) * 4, W - 12, 8):
                px(img, x, y, hx("#3b3b46"))


def generar_bomba(nombre):
    v = VARIANTES_BOMBA[nombre]
    car, luz, osc, hund = hx(v["carcasa"]), hx(v["luz"]), hx(v["osc"]), hx(v["hundida"])
    claro, oscuro = hx(v["franja"][0]), hx(v["franja"][1])
    W, H = 208, 256
    img = lienzo(W, H)
    # Borde de franjas diagonales de 6px (colores del escenario)
    for y in range(H):
        for x in range(W):
            if x < 6 or y < 6 or x >= W - 6 or y >= H - 6:
                img.putpixel((x, y), claro if ((x + y) // 6) % 2 == 0 else oscuro)
    biselar(img, 0, 0, W, H, P["negro"], P["negro"])
    for (cx, cy) in [(0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1)]:
        px(img, cx, cy, TRANSPARENTE)
    # Carcasa
    rect(img, 6, 6, W - 12, H - 12, car)
    biselar(img, 6, 6, W - 12, H - 12, luz, osc, 2)
    rnd = random.Random(7)
    for y in range(10, H - 10, 3):
        x0 = rnd.randint(10, 60)
        largo = rnd.randint(20, 90)
        rect(img, x0, y, min(largo, W - 12 - x0), 1, mezcla(car, luz, 0.35))
    detalles_bomba(img, nombre, v, W, H)
    for (tx, ty) in [(10, 10), (W - 17, 10), (10, H - 17), (W - 17, H - 17)]:
        tornillo(img, tx, ty)
    # Pantalla LED hundida: x=12..196, y=14..72 (igual en todas)
    rect(img, 12, 14, 184, 58, osc)
    biselar(img, 12, 14, 184, 58, osc, luz)
    rect(img, 15, 17, 178, 52, P["led_fondo"])
    for y in range(18, 69, 2):
        rect(img, 15, y, 178, 1, P["led_linea"])
    for i in range(10):
        px(img, 18 + i, 19, hx("#3a1a1a"))
    # Ranura de progreso y hueco del teclado
    rect(img, 12, 76, 184, 12, hund)
    biselar(img, 12, 76, 184, 12, osc, luz)
    rect(img, 24, 91, 160, 158, hund)
    biselar(img, 24, 91, 160, 158, osc, luz, 2)
    for y in range(110, 230, 6):
        rect(img, 12, y, 8, 2, osc)
        rect(img, W - 20, y, 8, 2, osc)
    guardar(img, f"bomba_{nombre}.png")


# ---------------------------------------------------------------------------
# 3b. ESCENARIOS (240x400, pantalla completa detrás de la bomba)
#     La bomba tapa el centro: los detalles van en las franjas laterales
#     (x<16, x>224), en las esquinas superiores y en la franja inferior (y>330).
# ---------------------------------------------------------------------------
def degradado(img, arriba, abajo):
    a, b = hx(arriba), hx(abajo)
    for y in range(img.height):
        rect(img, 0, y, img.width, 1, mezcla(a, b, y / (img.height - 1)))


def escenario_bunker():
    img = lienzo(240, 400)
    degradado(img, "#20241a", "#14170f")
    # Bloques de hormigón
    for fila, y in enumerate(range(0, 340, 20)):
        desp = 0 if fila % 2 == 0 else 20
        for x in range(-desp, 240, 40):
            rect(img, x + 1, y + 1, 38, 18, hx("#2a2f20" if (x // 40 + fila) % 3 else "#2f3524"))
            rect(img, x + 1, y + 1, 38, 1, hx("#363c29"))
    # Tubería superior con abrazaderas
    rect(img, 0, 22, 240, 6, hx("#4a4f3a")); rect(img, 0, 22, 240, 1, hx("#6a7055")); rect(img, 0, 27, 240, 1, hx("#25281c"))
    for x in range(6, 240, 36):
        rect(img, x, 20, 4, 10, hx("#2a2d22"))
    # Lámparas de alarma rojas en las esquinas
    for x in (4, 220):
        rect(img, x, 32, 16, 4, hx("#1a1a1a"))
        rect(img, x + 2, 36, 12, 8, hx("#ff3b2f")); rect(img, x + 4, 37, 4, 2, hx("#ffb0a0"))
        rect(img, x + 2, 44, 12, 2, hx("#7a1010"))
    # Suelo con franjas de peligro y cajas de munición
    rect(img, 0, 372, 240, 28, hx("#1a1d14"))
    for x in range(0, 240):
        rect(img, x, 372, 1, 4, hx("#c9a000") if ((x + 372) // 6) % 2 == 0 else hx("#151515"))
    for (cx, cy) in [(2, 356), (2, 378), (24, 378), (196, 378), (218, 378), (218, 356)]:
        rect(img, cx, cy, 20, 20, hx("#3e4a26")); rect(img, cx, cy, 20, 2, hx("#58653a"))
        rect(img, cx + 2, cy + 8, 16, 2, hx("#2a3218")); rect(img, cx + 8, cy + 4, 4, 3, hx("#c9a000"))
    return img


def escenario_laboratorio():
    img = lienzo(240, 400)
    degradado(img, "#11303a", "#0b1f26")
    # Azulejos
    for y in range(0, 340, 12):
        for x in range(0, 240, 12):
            rect(img, x, y, 11, 11, hx("#15394400" if False else "#163a45"))
            px(img, x + 1, y + 1, hx("#1e4a57"))
    # Fluorescentes arriba
    for x in (2, 196):
        rect(img, x, 2, 42, 5, hx("#0a1418")); rect(img, x + 2, 3, 38, 3, hx("#bff6ff"))
    # Estanterías laterales con tubos de ensayo
    for xs in (0, 224):
        for y in (110, 190, 270):
            rect(img, xs, y, 16, 3, hx("#5e6e79"))
            for k, col in enumerate(["#3dff8a", "#ff4fd8", "#29b6ff"]):
                tx = xs + 2 + k * 5
                rect(img, tx, y - 14, 3, 14, hx("#cfe8f0"))
                rect(img, tx, y - 7 + k, 3, 7 - k, hx(col))
    # Mesa de laboratorio con matraces
    rect(img, 0, 372, 240, 5, hx("#dfe9ef")); rect(img, 0, 377, 240, 23, hx("#3a4a52"))
    rect(img, 0, 377, 240, 2, hx("#25323a"))
    for (x, col) in [(6, "#3dff8a"), (200, "#ff4fd8"), (222, "#29b6ff")]:
        rect(img, x + 4, 352, 4, 8, hx("#cfe8f0"))
        for k in range(12):
            w = min(12, 2 + k)
            rect(img, x + 6 - w // 2, 360 + k, w, 1, hx("#cfe8f0") if k < 5 else hx(col))
    return img


def escenario_tren():
    img = lienzo(240, 400)
    degradado(img, "#141a33", "#0b0f20")
    # Paneles del vagón con remaches
    for x in range(0, 240, 40):
        rect(img, x, 0, 1, 340, hx("#222a4a"))
        for y in range(6, 340, 14):
            px(img, x + 3, y, hx("#3a4470"))
    # Portaequipajes arriba
    rect(img, 0, 16, 240, 3, hx("#9aa3b5"))
    for x in range(0, 240, 6):
        rect(img, x, 19, 1, 6, hx("#6a7385"))
    # Barras amarillas a los lados
    for x in (4, 232):
        rect(img, x, 30, 4, 300, hx("#ffcc00")); rect(img, x, 30, 1, 300, hx("#fff08a"))
    # Ventanilla inferior con la ciudad de noche
    rect(img, 0, 332, 240, 48, hx("#05070f"))
    rnd = random.Random(3)
    x = 0
    while x < 240:
        w, h = rnd.randint(10, 22), rnd.randint(10, 38)
        rect(img, x, 380 - h, w, h, hx("#141a33"))
        for yy in range(380 - h + 3, 378, 5):
            for xx in range(x + 2, x + w - 2, 4):
                if rnd.random() < 0.45:
                    rect(img, xx, yy, 2, 2, hx(rnd.choice(["#ffb347", "#ffd27a", "#ff8a1f"])))
        x += w + rnd.randint(0, 4)
    rect(img, 0, 330, 240, 3, hx("#9aa3b5")); rect(img, 0, 380, 240, 4, hx("#9aa3b5"))
    rect(img, 0, 384, 240, 16, hx("#3a1d14"))  # asientos
    for x in range(0, 240, 30):
        rect(img, x + 2, 386, 26, 10, hx("#6b3a2a")); rect(img, x + 2, 386, 26, 2, hx("#94573a"))
    return img


def escenario_camara():
    img = lienzo(240, 400)
    degradado(img, "#16131c", "#0c0a10")
    oro, oro_osc = hx("#e8b84a"), hx("#8a6a20")
    # Gran puerta circular de la cámara acorazada (asoma alrededor de la bomba)
    cx, cy = 120, 190
    for y in range(400):
        for x in range(240):
            d = math.hypot(x - cx, y - cy)
            if 150 <= d <= 162:
                img.putpixel((x, y), hx("#4a4a55") if d < 160 else hx("#2a2a32"))
            elif 162 < d <= 165:
                img.putpixel((x, y), oro_osc)
    for k in range(12):  # pernos del marco
        a = k * math.pi / 6
        bx, by = int(cx + 156 * math.cos(a)), int(cy + 156 * math.sin(a))
        rect(img, bx - 2, by - 2, 5, 5, oro)
    # Láseres rojos
    for (x1, y1, x2, y2) in [(0, 60, 40, 0), (200, 0, 240, 60), (0, 300, 30, 340), (210, 340, 240, 300)]:
        n = max(abs(x2 - x1), abs(y2 - y1))
        for t in range(n):
            px(img, x1 + (x2 - x1) * t // n, y1 + (y2 - y1) * t // n, hx("#ff3b5c"))
    # Lingotes de oro apilados abajo
    rect(img, 0, 344, 240, 56, hx("#1d1a24"))
    def lingote(x, y):
        rect(img, x, y, 18, 7, oro); rect(img, x + 2, y, 14, 2, hx("#fff0b0")); rect(img, x, y + 6, 18, 1, oro_osc)
    for (x, y) in [(2, 386), (21, 386), (40, 386), (11, 378), (30, 378), (20, 370),
                   (180, 386), (199, 386), (218, 386), (190, 378), (209, 378), (200, 370)]:
        lingote(x, y)
    return img


ESCENARIOS = {"bunker": escenario_bunker, "laboratorio": escenario_laboratorio,
              "tren": escenario_tren, "camara": escenario_camara}


def generar_escenarios():
    for nombre, dibujar in ESCENARIOS.items():
        guardar(dibujar(), f"escenario_{nombre}.png")
        generar_bomba(nombre)


# ---------------------------------------------------------------------------
# 4. CABLES Y DETONADOR (spritesheet 208x48, 8 frames apilados en vertical)
#    0/1 rojo entero/cortado · 2/3 azul · 4/5 amarillo · 6/7 detonador apagado/encendido
# ---------------------------------------------------------------------------
CABLES = [("#ff3b5c", "izq"), ("#29b6ff", "centro"), ("#ffd23f", "der")]


def trazar_cable(img, color, lado, cortado):
    c = hx(color)
    luz = mezcla(c, P["blanco"], 0.45)
    osc = mezcla(c, P["negro"], 0.45)
    segs = []  # rectángulos (x, y, w, h) del recorrido del cable, ancho 6
    if lado == "izq":
        segs = [(28, 16, 6, 32), (30, 12, 6, 6), (34, 10, 50, 6)]
    elif lado == "der":
        segs = [(174, 16, 6, 32), (172, 12, 6, 6), (124, 10, 50, 6)]
    else:
        segs = [(101, 20, 6, 28)]
    for (x, y, w, h) in segs:
        rect(img, x, y, w, h, c)
        if w <= 6:  # tramo vertical: brillo a la izquierda, sombra a la derecha
            rect(img, x + 1, y, 1, h, luz)
            rect(img, x + w - 1, y, 1, h, osc)
        else:       # tramo horizontal
            rect(img, x, y + 1, w, 1, luz)
            rect(img, x, y + h - 1, w, 1, osc)
    if cortado:
        x = segs[0][0]
        y0 = 26 if lado != "centro" else 28
        rect(img, x - 1, y0, 8, 10, TRANSPARENTE)
        rect(img, x + 1, y0, 4, 2, P["cobre"])         # hilo de cobre arriba
        rect(img, x + 2, y0 + 2, 1, 1, P["cobre"])
        rect(img, x + 1, y0 + 8, 4, 2, P["cobre"])     # hilo de cobre abajo
        rect(img, x + 3, y0 + 7, 1, 1, P["cobre"])


def generar_cables():
    W, H = 208, 48
    img = lienzo(W, H * 8)
    for i, (color, lado) in enumerate(CABLES):
        for cortado in (0, 1):
            f = lienzo(W, H)
            trazar_cable(f, color, lado, cortado)
            img.paste(f, (0, (i * 2 + cortado) * H))
    for encendido in (0, 1):
        f = lienzo(W, H)
        rect(f, 80, 2, 48, 22, P["negro"])
        rect(f, 81, 3, 46, 20, P["carcasa_osc"])
        biselar(f, 81, 3, 46, 20, P["carcasa"], P["negro"])
        rect(f, 94, 8, 20, 10, P["negro"])
        led = P["led_on"] if encendido else P["led_off"]
        rect(f, 95, 9, 18, 8, led)
        if encendido:
            rect(f, 96, 10, 6, 2, P["led_brillo"])
        # remaches
        for rx in (84, 122):
            rect(f, rx, 11, 2, 2, P["tornillo"])
        img.paste(f, (0, (6 + encendido) * H))
    guardar(img, "cables.png")


# ---------------------------------------------------------------------------
# 5. TECLAS (spritesheet 48x48: 9 filas = colores, 6 columnas = estados)
#    0 apagada · 1 encendida · 2 pulsada · 3-5 igual pero sin número
# ---------------------------------------------------------------------------
def numero_grande(img, ox, oy, digito, color):
    mapa(img, ox, oy, GLIFOS[str(digito)], {"#": color}, escala=2)


def tecla(color_hex, numero, estado, con_numero):
    f = lienzo(48, 48)
    c = hx(color_hex)
    encendida = estado in (1, 2)
    hundida = 2 if estado == 2 else 0
    x, y, w, h = 2, 2 + hundida, 44, 44 - hundida
    if encendida:  # halo de luz de 2px alrededor
        halo = c[:3] + (110,)
        rect(f, 0, 0, 48, 48, halo)
        rect(f, 1, 1, 46, 46, c[:3] + (160,))
    rect(f, x, y, w, h, P["tinta"])
    cara = c if encendida else P["tecla"]
    luz = mezcla(c, P["blanco"], 0.45) if encendida else P["tecla_luz"]
    sombra = mezcla(c, P["negro"], 0.45) if encendida else P["tecla_sombra"]
    alto_sombra = 2 if estado == 2 else 5
    rect(f, x + 1, y + 1, w - 2, h - 2, cara)
    rect(f, x + 1, y + 1, w - 2, 2, luz)
    rect(f, x + 1, y + 1, 2, h - 2 - alto_sombra, luz)
    rect(f, x + 1, y + h - 1 - alto_sombra, w - 2, alto_sombra, sombra)
    # Esquinas redondeadas
    for (cx, cy) in [(x, y), (x + w - 1, y), (x, y + h - 1), (x + w - 1, y + h - 1)]:
        px(f, cx, cy, TRANSPARENTE if not encendida else c[:3] + (160,))
    # Pequeño LED indicador arriba a la izquierda
    rect(f, x + 5, y + 5, 6, 3, c if not encendida else P["blanco"])
    if not encendida:
        rect(f, x + 5, y + 5, 6, 1, mezcla(c, P["blanco"], 0.4))
    # Número o símbolo
    tinta = hx("#111111") if encendida else c
    cx = x + (w - 10) // 2
    cy = y + (h - alto_sombra - 14) // 2
    if con_numero:
        numero_grande(f, cx, cy, numero, tinta)
    else:
        rect(f, cx + 2, cy + 4, 6, 6, tinta)  # un cuadrado de color en lugar del número
    return f


def generar_teclas():
    img = lienzo(48 * 6, 48 * 9)
    for i, col in enumerate(COLORES_TECLAS):
        for e in range(6):
            img.paste(tecla(col, i + 1, e % 3, e < 3), (e * 48, i * 48))
    guardar(img, "teclas.png")


# ---------------------------------------------------------------------------
# 6. DÍGITOS DE 7 SEGMENTOS (12x20): 0-9, 10 = punto, 11 = todo apagado
# ---------------------------------------------------------------------------
SEGMENTOS = {
    "a": (3, 0, 6, 2), "b": (9, 2, 2, 7), "c": (9, 11, 2, 7), "d": (3, 18, 6, 2),
    "e": (1, 11, 2, 7), "f": (1, 2, 2, 7), "g": (3, 9, 6, 2),
}
DIGITOS = ["abcdef", "bc", "abged", "abgcd", "fgbc", "afgcd", "afgedc", "abc", "abcdefg", "abcdfg"]


def generar_digitos():
    img = lienzo(12 * 12, 20)
    for i in range(12):
        f = lienzo(12, 20)
        if i == 10:
            rect(f, 5, 17, 3, 3, P["led_on"])
            px(f, 5, 17, P["led_brillo"])
        else:
            encendidos = DIGITOS[i] if i < 10 else ""
            for s, (x, y, w, h) in SEGMENTOS.items():
                on = s in encendidos
                rect(f, x, y, w, h, P["led_on"] if on else P["led_off"])
                if on:  # pequeño reflejo en un extremo del segmento
                    px(f, x, y, P["led_brillo"])
        img.paste(f, (i * 12, 0))
    guardar(img, "digitos.png")


# ---------------------------------------------------------------------------
# 7. PEQUEÑOS: luz de estado, puntos de progreso, partículas, scanlines
# ---------------------------------------------------------------------------
def generar_pequenos():
    # Luz de estado 12x12: 0 gris, 1 roja, 2 verde
    luz = lienzo(36, 12)
    for i, (c, b) in enumerate([("#3a3a3a", "#5a5a5a"), ("#ff3b5c", "#ffb3c0"), ("#3dff8a", "#c8ffdc")]):
        ox = i * 12
        rect(luz, ox + 1, 0, 10, 12, P["negro"])
        rect(luz, ox, 1, 12, 10, P["negro"])
        rect(luz, ox + 1, 1, 10, 10, hx(c))
        rect(luz, ox + 2, 2, 3, 2, hx(b))
        rect(luz, ox + 1, 9, 10, 2, mezcla(hx(c), P["negro"], 0.4))
    guardar(luz, "luz.png")

    # Puntos de progreso 8x8: 0 vacío, 1 lleno, 2 error
    pt = lienzo(24, 8)
    rect(pt, 0, 0, 8, 8, P["carcasa_osc"])
    rect(pt, 1, 1, 6, 6, hx("#2a2e38"))
    rect(pt, 8, 0, 8, 8, P["ok_osc"])
    rect(pt, 9, 1, 6, 6, P["ok"])
    rect(pt, 10, 2, 2, 2, P["blanco"])
    rect(pt, 16, 0, 8, 8, hx("#7a1020"))
    rect(pt, 17, 1, 6, 6, hx("#ff3b5c"))
    guardar(pt, "progreso.png")

    # Partículas 8x8: 0 chispa amarilla, 1 chispa naranja, 2 humo, 3 estrella verde, 4 metralla
    pa = lienzo(40, 8)
    mapa(pa, 0, 0, ["...y....", "..yyy...", ".ywwwy..", "yywwwyy.", ".ywwwy..", "..yyy...", "...y....", "........"],
         {"y": hx("#ffd23f"), "w": P["blanco"]})
    mapa(pa, 8, 0, ["........", "..oo....", ".orro...", ".orro...", "..oo....", "........", "........", "........"],
         {"o": hx("#ff8a1f"), "r": hx("#ff3b1f")})
    mapa(pa, 16, 0, ["..ggg...", ".gGGGg..", "gGGGGGg.", "gGGGGGg.", "gGGGGGg.", ".gGGGg..", "..ggg...", "........"],
         {"g": hx("#3b3548"), "G": hx("#5a5468")})
    mapa(pa, 24, 0, ["...g....", "...g....", ".gwwwg..", "ggwwwgg.", ".gwwwg..", "...g....", "...g....", "........"],
         {"g": P["ok"], "w": P["blanco"]})
    mapa(pa, 32, 0, ["........", ".ss.....", ".sds....", "..ddd...", "...dd...", "........", "........", "........"],
         {"s": P["tornillo"], "d": P["carcasa"]})
    guardar(pa, "particulas.png")

    # Scanlines CRT (se repite como tileSprite)
    sc = lienzo(4, 3)
    rect(sc, 0, 2, 4, 1, (0, 0, 0, 55))
    guardar(sc, "scanlines.png")


# ---------------------------------------------------------------------------
# 8. FONDO (tile 32x32 de placa de circuito)
# ---------------------------------------------------------------------------
def generar_fondo():
    img = lienzo(32, 32)
    rect(img, 0, 0, 32, 32, P["fondo"])
    rect(img, 0, 31, 32, 1, P["fondo_linea"])
    rect(img, 31, 0, 1, 32, P["fondo_linea"])
    pista = P["fondo_pista"]
    rect(img, 4, 8, 14, 1, pista)
    rect(img, 18, 8, 1, 10, pista)
    rect(img, 18, 18, 10, 1, pista)
    rect(img, 8, 20, 1, 9, pista)
    rect(img, 8, 28, 12, 1, pista)
    for (x, y) in [(3, 7), (26, 17), (7, 19), (19, 27)]:
        rect(img, x, y, 3, 3, P["fondo_pad"])
        px(img, x + 1, y + 1, P["fondo"])
    guardar(img, "fondo.png")


# ---------------------------------------------------------------------------
# 9. BOTONES Y PANEL (nine-slice 16x16, esquinas de 4px)
# ---------------------------------------------------------------------------
def boton(cara, luz, sombra, borde):
    img = lienzo(16, 16)
    rect(img, 1, 0, 14, 16, borde)
    rect(img, 0, 1, 16, 14, borde)
    rect(img, 2, 2, 12, 11, cara)
    rect(img, 2, 2, 12, 1, luz)
    rect(img, 2, 2, 1, 11, luz)
    rect(img, 2, 12, 12, 2, sombra)
    return img


def generar_botones():
    guardar(boton(P["peligro"], hx("#fff08a"), hx("#b38600"), P["negro"]), "boton.png")
    guardar(boton(P["tecla"], P["tecla_luz"], P["tecla_sombra"], hx("#6b5a8e")), "boton_osc.png")
    guardar(boton(hx("#3d2a6e"), hx("#5a43a0"), hx("#22164a"), P["peligro"]), "boton_sel.png")
    panel = lienzo(16, 16)
    rect(panel, 1, 0, 14, 16, P["peligro"])
    rect(panel, 0, 1, 16, 14, P["peligro"])
    rect(panel, 2, 2, 12, 12, hx("#120a26"))
    rect(panel, 2, 2, 12, 1, hx("#2c1d5a"))
    guardar(panel, "panel.png")


# ---------------------------------------------------------------------------
# 10. ICONOS 12x12
#     0 bomba · 1 bomba apagada · 2 inversa · 3 cable · 4 barajada
#     5 sonido sí · 6 sonido no · 7 estrella · 8 calavera · 9 trampa · 10 espejo
#     11 música sí · 12 música no · 13 búnker · 14 laboratorio · 15 tren · 16 cámara
# ---------------------------------------------------------------------------
ICONOS = [
    [".........y..", "........yoy.", ".......k.y..", "......k.....", "....kkkk....", "..kkddddkk..",
     ".kddwwddddk.", ".kdwddddddk.", ".kddddddddk.", ".kddddddddk.", "..kkddddkk..", "....kkkk...."],
    None,  # bomba apagada: se deriva de la anterior
    ["............", "..k.........", ".kbkkkkkkk..", "kbbbbbbbbbk.", ".kbkkkkkkk..", "..k.........",
     ".........k..", "..kkkkkkkbk.", ".kbbbbbbbbbk", "..kkkkkkkbk.", ".........k..", "............"],
    ["............", ".rr..bb..yy.", ".rr..bb..yy.", ".rr..bb..yy.", ".rr..bb..yy.", ".rr..oo..yy.",
     ".rr......yy.", ".rr..oo..yy.", ".rr..bb..yy.", ".rr..bb..yy.", ".rr..bb..yy.", "............"],
    ["............", ".rrr.ooo.yyy", ".rrr.ooo.yyy", ".rrr.ooo.yyy", "............", ".ggg.bbb.www",
     ".ggg.bbb.www", ".ggg.bbb.www", "............", ".www.ggg.rrr", ".www.ggg.rrr", ".www.ggg.rrr"],
    ["............", ".....k......", "....kk...y..", "...kwk....y.", "kkkwwk..y.y.", "kwwwwk...y.y",
     "kwwwwk...y.y", "kkkwwk..y.y.", "...kwk....y.", "....kk...y..", ".....k......", "............"],
    ["............", ".....k......", "....kk......", "...kwk......", "kkkwwk.r...r", "kwwwwk..r.r.",
     "kwwwwk...r..", "kkkwwk..r.r.", "...kwk.r...r", "....kk......", ".....k......", "............"],
    [".....yy.....", ".....yy.....", "....yyyy....", "yyyyyyyyyyyy", ".yyyyyyyyyy.", "..yyyyyyyy..",
     "...yyyyyy...", "..yyyyyyyy..", "..yyy..yyy..", ".yy......yy.", ".y........y.", "............"],
    ["...kkkkkk...", "..kwwwwwwk..", ".kwwwwwwwwk.", ".kwkkwwkkwk.", ".kwkkwwkkwk.", ".kwwwkkwwwk.",
     "..kwwwwwwk..", "...kwkwkwk..", "...kkkkkkk..", "............", "............", "............"],
    [".kkkkkkkkkk.", "kddddddddddk", "kdrrddddrrdk", "kdrrrddrrrdk", "kddrrrrrrddk", "kdddrrrrdddk",
     "kdddrrrrdddk", "kddrrrrrrddk", "kdrrrddrrrdk", "kdrrddddrrdk", "kddddddddddk", ".kkkkkkkkkk."],
    [".....ww.....", ".....ww.....", ".b...ww...b.", ".bb..ww..bb.", ".bbb.ww.bbb.", ".bbbbwwbbbb.",
     ".bbbbwwbbbb.", ".bbb.ww.bbb.", ".bb..ww..bb.", ".b...ww...b.", ".....ww.....", ".....ww....."],
    ["....wwwwwww.", "....wwwwwww.", "....w.....w.", "....w.....w.", "....w.....w.", "....w.....w.",
     "....w.....w.", "..www...www.", ".wwww..wwww.", ".wwww..wwww.", "..ww....ww..", "............"],
    ["....wwwwwww.", "....wwwwwww.", "....w.....w.", "....w.....w.", "....w..r...r", "....w...r.r.",
     "....w....r..", "..www...r.r.", ".wwww..r...r", ".wwww.......", "..ww........", "............"],
    ["............", "............", "...kkkkkk...", "..kddddddk..", ".kddddddddk.", "kddddddddddk",
     "kdddkkkkdddk", "kdddkrrkdddk", "kdddkkkkdddk", "kkkkkkkkkkkk", "yykkyykkyykk", "............"],
    ["....kkkk....", "....kwwk....", "....kwwk....", "....kwwk....", "...kwwwwk...", "..kwwwwwwk..",
     ".kwggggggwk.", ".kggggggggk.", "kggwggggggk.", "kggggggggggk", ".kkkkkkkkkk.", "............"],
    ["..kkkkkkkk..", ".kddddddddk.", ".kdbbddbbdk.", ".kdbbddbbdk.", ".kddddddddk.", ".kddddddddk.",
     ".kdyddddydk.", ".kddddddddk.", "..kkkkkkkk..", "...k....k...", "..kk....kk..", "kkkkkkkkkkkk"],
    ["..kkkkkkkk..", ".kyyyyyyyyk.", "kyykkkkkyyyk", "kykwwwwwkyyk", "kykwkkkwkyyk", "kykwkykwkyyk",
     "kykwkkkwkyyk", "kykwwwwwkyyk", "kyykkkkkyyyk", ".kyyyyyyyyk.", "..kkkkkkkk..", "............"],
]
COLORES_ICONO = {"k": P["negro"], "w": P["blanco"], "y": hx("#ffd23f"), "o": hx("#ff8a1f"),
                 "r": hx("#ff3b5c"), "g": P["ok"], "b": hx("#29b6ff"), "d": P["carcasa"]}


def generar_iconos():
    img = lienzo(12 * len(ICONOS), 12)
    for i, filas in enumerate(ICONOS):
        if filas is None:  # bomba apagada en grises
            filas = ICONOS[0]
            cols = dict(COLORES_ICONO, y=hx("#4a4e58"), o=hx("#4a4e58"), w=hx("#4a4e58"), d=hx("#2b2f3a"))
        else:
            cols = COLORES_ICONO
        assert all(len(f) == 12 for f in filas) and len(filas) == 12, f"icono {i} mal formado"
        mapa(img, i * 12, 0, filas, cols)
    guardar(img, "iconos.png")


# ---------------------------------------------------------------------------
# 10b. MARCA DE TRAMPA (48x48): X roja con contorno que se pone sobre una tecla
#      cuando su luz es falsa (bomba TRAMPA)
# ---------------------------------------------------------------------------
def generar_trampa():
    img = lienzo(48, 48)
    rojo, claro = hx("#ff3b5c"), hx("#ffb3c0")
    # contorno negro primero, luego la X roja encima
    for capa, grosor, color in [(0, 4.2, P["negro"]), (1, 2.6, rojo)]:
        for y in range(8, 40):
            for x in range(8, 40):
                d1 = abs(x - y) / 1.414
                d2 = abs(x + y - 47) / 1.414
                if min(d1, d2) <= grosor:
                    img.putpixel((x, y), color)
    for i in range(10, 22):          # brillo en un brazo de la X
        px(img, i, i - 1, claro)
    # esquinas tipo "punto de mira"
    for (x, y, dx, dy) in [(3, 3, 1, 1), (44, 3, -1, 1), (3, 44, 1, -1), (44, 44, -1, -1)]:
        for k in range(6):
            px(img, x + dx * k, y, rojo)
            px(img, x, y + dy * k, rojo)
    guardar(img, "trampa.png")


# ---------------------------------------------------------------------------
# 11. BOMBA DE LA PORTADA (32x32, 4 frames de mecha chisporroteando)
# ---------------------------------------------------------------------------
def generar_bomba_portada():
    img = lienzo(32 * 4, 32)
    for fr in range(4):
        f = lienzo(32, 32)
        cx, cy, r = 14, 19, 11
        for y in range(32):
            for x in range(32):
                d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
                if d <= r:
                    # sombreado por bandas (luz arriba-izquierda)
                    l = ((x - cx) * -0.6 + (y - cy) * -0.8) / r
                    if d > r - 1.2:
                        c = P["negro"]
                    elif l > 0.55:
                        c = hx("#6a7088")
                    elif l > 0.15:
                        c = hx("#3e4256")
                    elif l > -0.45:
                        c = hx("#2a2c3c")
                    else:
                        c = hx("#1a1b26")
                    f.putpixel((x, y), c)
        rect(f, 11, 9, 2, 2, P["blanco"])      # brillo
        rect(f, 10, 11, 1, 1, hx("#b8bcc6"))
        # boquilla
        rect(f, 17, 6, 7, 5, P["negro"])
        rect(f, 18, 7, 5, 3, P["tornillo"])
        rect(f, 18, 7, 5, 1, hx("#c8ccd6"))
        # mecha
        for (x, y) in [(21, 5), (22, 4), (23, 3), (24, 3), (25, 2)]:
            px(f, x, y, hx("#c7a46a"))
            px(f, x, y + 1, hx("#7a5a2a"))
        # chispa (cambia en cada frame)
        chispas = [
            [(26, 1, "w"), (27, 0, "y"), (25, 0, "y"), (27, 2, "o"), (28, 1, "y")],
            [(26, 1, "w"), (26, 0, "y"), (28, 0, "o"), (27, 2, "y"), (29, 2, "y"), (25, 0, "o")],
            [(26, 1, "w"), (27, 1, "w"), (27, 0, "y"), (28, 2, "y"), (29, 0, "o"), (30, 1, "y")],
            [(26, 1, "w"), (25, 0, "y"), (26, 2, "o"), (28, 1, "y"), (28, 3, "o")],
        ]
        for (x, y, k) in chispas[fr]:
            px(f, x, y, COLORES_ICONO[k] if k != "w" else P["blanco"])
        # letras TNT en la panza
        mapa(f, 9, 18, ["###.#..#.###", ".#..##.#..#.", ".#..#.##..#.", ".#..#..#..#."],
             {"#": P["peligro"]})
        img.paste(f, (fr * 32, 0))
    guardar(img, "bomba_portada.png")


# ---------------------------------------------------------------------------
# 12. EXPLOSIÓN (96x96, 8 frames) con bordes irregulares y paleta de fuego
# ---------------------------------------------------------------------------
def generar_explosion():
    N, S = 8, 96
    img = lienzo(S * N, S)
    rnd = random.Random(42)
    fuego = [P["blanco"], hx("#fff3b0"), hx("#ffd23f"), hx("#ff8a1f"), hx("#ff3b1f"),
             hx("#a01020"), hx("#4a1a2a"), hx("#2a2030")]
    ruido = [[rnd.random() for _ in range(S // 2)] for _ in range(S // 2)]
    for fr in range(N):
        f = lienzo(S, S)
        t = fr / (N - 1)
        radio = 10 + 36 * math.sin(t * math.pi / 2)
        hueco = max(0.0, (t - 0.55) / 0.45) * radio * 0.9
        for by in range(S // 2):          # se trabaja en bloques de 2x2 (look más pixelado)
            for bx in range(S // 2):
                x, y = bx * 2 + 1, by * 2 + 1
                ang = math.atan2(y - S / 2, x - S / 2)
                borde = radio * (0.85 + 0.15 * math.sin(ang * 7 + fr) + 0.1 * ruido[by][bx])
                d = math.hypot(x - S / 2, y - S / 2)
                if d > borde or d < hueco:
                    continue
                v = d / borde + ruido[by][bx] * 0.25 + t * 0.9
                idx = min(len(fuego) - 1, int(v * 3.2))
                rect(f, bx * 2, by * 2, 2, 2, fuego[idx])
        img.paste(f, (fr * S, 0))
    guardar(img, "explosion.png")


if __name__ == "__main__":
    os.makedirs(SALIDA, exist_ok=True)
    print("Generando assets en", SALIDA)
    generar_fuente()
    generar_escenarios()
    generar_cables()
    generar_teclas()
    generar_digitos()
    generar_pequenos()
    generar_fondo()
    generar_botones()
    generar_iconos()
    generar_trampa()
    generar_bomba_portada()
    generar_explosion()
    print("Listo.")
