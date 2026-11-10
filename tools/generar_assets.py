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


def generar_bomba():
    W, H = 208, 256
    img = lienzo(W, H)
    # Borde de peligro (franjas diagonales amarillo/negro) de 6px
    for y in range(H):
        for x in range(W):
            if x < 6 or y < 6 or x >= W - 6 or y >= H - 6:
                c = P["peligro"] if ((x + y) // 6) % 2 == 0 else P["peligro_osc"]
                img.putpixel((x, y), c)
    # Contorno exterior oscuro y esquinas recortadas
    biselar(img, 0, 0, W, H, P["negro"], P["negro"])
    for (cx, cy) in [(0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1)]:
        px(img, cx, cy, TRANSPARENTE)
    # Carcasa metálica
    rect(img, 6, 6, W - 12, H - 12, P["carcasa"])
    biselar(img, 6, 6, W - 12, H - 12, P["carcasa_luz"], P["carcasa_osc"], 2)
    # Textura de metal cepillado (líneas tenues)
    rnd = random.Random(7)
    for y in range(10, H - 10, 3):
        x0 = rnd.randint(10, 60)
        largo = rnd.randint(20, 90)
        rect(img, x0, y, min(largo, W - 12 - x0), 1, mezcla(P["carcasa"], P["carcasa_luz"], 0.35))
    # Tornillos
    for (tx, ty) in [(10, 10), (W - 17, 10), (10, H - 17), (W - 17, H - 17)]:
        tornillo(img, tx, ty)
    # Pantalla LED hundida: x=12..196, y=14..72
    rect(img, 12, 14, 184, 58, P["carcasa_osc"])
    biselar(img, 12, 14, 184, 58, P["carcasa_osc"], P["carcasa_luz"])
    rect(img, 15, 17, 178, 52, P["led_fondo"])
    for y in range(18, 69, 2):
        rect(img, 15, y, 178, 1, P["led_linea"])
    # Brillo del cristal en la esquina
    for i in range(10):
        px(img, 18 + i, 19, hx("#3a1a1a"))
    # Ranura de los puntos de progreso
    rect(img, 12, 76, 184, 12, P["carcasa_hundida"])
    biselar(img, 12, 76, 184, 12, P["carcasa_osc"], P["carcasa_luz"])
    # Hueco del teclado: x=24..184, y=91..249
    rect(img, 24, 91, 160, 158, P["carcasa_hundida"])
    biselar(img, 24, 91, 160, 158, P["carcasa_osc"], P["carcasa_luz"], 2)
    # Rejilla de ventilación a los lados del teclado
    for y in range(110, 230, 6):
        rect(img, 12, y, 8, 2, P["carcasa_osc"])
        rect(img, W - 20, y, 8, 2, P["carcasa_osc"])
    guardar(img, "bomba.png")


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
#     5 sonido sí · 6 sonido no · 7 estrella · 8 calavera
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
    generar_bomba()
    generar_cables()
    generar_teclas()
    generar_digitos()
    generar_pequenos()
    generar_fondo()
    generar_botones()
    generar_iconos()
    generar_bomba_portada()
    generar_explosion()
    print("Listo.")
