#!/usr/bin/env python3
"""
Extractor automatizado de sprites para GAROZO! Party Game.
Realiza recorte preciso de las 4 láminas maestras y aplica un algoritmo
de transparencia inteligente (FloodFill desde bordes + represas invisibles de contorno
+ suavizado de canal Alpha) que preserva intacto el relleno interno de las Masitas,
dados y carteles, eliminando únicamente el fondo de papel exterior.
"""

import os
from PIL import Image
import numpy as np
import cv2

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LAMINAS_DIR = os.path.join(BASE_DIR, "assets", "laminas")
SPRITES_DIR = os.path.join(BASE_DIR, "assets", "sprites")
DICE_DIR = os.path.join(SPRITES_DIR, "dice")


def ensure_directories():
    os.makedirs(LAMINAS_DIR, exist_ok=True)
    os.makedirs(SPRITES_DIR, exist_ok=True)
    os.makedirs(DICE_DIR, exist_ok=True)


def smart_alpha_extract(
    pil_img,
    crop_box,
    mask_rects=None,
    dam_lines=None,
    close_size=7,
    is_dice=False,
    pad=12,
    trim=True,
    normalize_paper=True,
):
    """
    Recorta `crop_box` = (x1, y1, x2, y2) de `pil_img`, aplica exclusiones opcionales,
    y realiza un FloodFill desde los bordes exteriores sobre píxeles claros (papel #fdfaf1)
    deteniéndose en los trazos de grafito oscuros y en las represas (`dam_lines`)
    para preservar el relleno interior 100% opaco.
    """
    cropped = pil_img.crop(crop_box).convert("RGBA")
    arr = np.array(cropped, dtype=np.uint8)
    h, w, _ = arr.shape

    paper_color = np.median(arr[:15, :15, :3], axis=(0, 1)).astype(np.uint8)
    if mask_rects:
        for (mx1, my1, mx2, my2) in mask_rects:
            arr[max(0, my1):min(h, my2), max(0, mx1):min(w, mx2), :3] = paper_color

    rgb = arr[:, :, :3].astype(np.float32)
    lum = 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]

    stroke_mask = (lum < 212).astype(np.uint8) * 255

    barrier_mask = stroke_mask.copy()
    if dam_lines:
        for (x1, y1, x2, y2, thickness) in dam_lines:
            cv2.line(barrier_mask, (x1, y1), (x2, y2), 255, thickness)

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (close_size, close_size))
    closed_strokes = cv2.morphologyEx(barrier_mask, cv2.MORPH_CLOSE, kernel)

    walkable = (closed_strokes == 0) & (lum > 192)

    num_labels, labels = cv2.connectedComponents(walkable.astype(np.uint8), connectivity=8)
    border_labels = (
        set(labels[0, :])
        | set(labels[h - 1, :])
        | set(labels[:, 0])
        | set(labels[:, w - 1])
    )
    border_labels.discard(0)

    exterior_bg = np.isin(labels, list(border_labels))

    halo_zone = cv2.dilate(exterior_bg.astype(np.uint8), np.ones((3, 3), np.uint8), iterations=1).astype(bool)

    alpha = np.full((h, w), 255.0, dtype=np.float32)
    alpha[exterior_bg] = 0.0

    transition = halo_zone & (~exterior_bg)
    trans_alpha = np.clip((238.0 - lum[transition]) / (238.0 - 125.0), 0.0, 1.0) * 255.0
    alpha[transition] = np.minimum(alpha[transition], trans_alpha)

    alpha_u8 = np.clip(alpha, 0, 255).astype(np.uint8)
    alpha_smooth = cv2.GaussianBlur(alpha_u8, (3, 3), 0.6)
    alpha_smooth[exterior_bg & (~transition)] = 0
    alpha_smooth[~halo_zone] = 255

    if normalize_paper:
        interior_light = (~exterior_bg) & (lum > 215)
        arr[interior_light, 0] = np.clip(arr[interior_light, 0] * 0.3 + 253 * 0.7, 0, 255).astype(np.uint8)
        arr[interior_light, 1] = np.clip(arr[interior_light, 1] * 0.3 + 250 * 0.7, 0, 255).astype(np.uint8)
        arr[interior_light, 2] = np.clip(arr[interior_light, 2] * 0.3 + 241 * 0.7, 0, 255).astype(np.uint8)

    arr[:, :, 3] = alpha_smooth

    if trim:
        non_empty = np.where(arr[:, :, 3] > 15)
        if len(non_empty[0]) > 0:
            ymin, ymax = non_empty[0].min(), non_empty[0].max()
            xmin, xmax = non_empty[1].min(), non_empty[1].max()
            arr = arr[ymin:ymax + 1, xmin:xmax + 1]
            if pad > 0:
                arr = np.pad(arr, ((pad, pad), (pad, pad), (0, 0)), mode="constant", constant_values=0)

    return Image.fromarray(arr, mode="RGBA")


def extract_all():
    ensure_directories()

    # 1. Lámina 01: Estados de las Masitas (2528x1684)
    img01 = Image.open(os.path.join(LAMINAS_DIR, "01_masitas_estados.jpg"))

    # masita_idle.png (Col 1, Fila 1: 210..685, 170..780)
    s_idle = smart_alpha_extract(
        img01,
        (210, 170, 685, 780),
        mask_rects=[(432, 415, 475, 610)],
        dam_lines=[
            (110, 335, 165, 365, 16),
            (285, 335, 345, 365, 16),
        ],
        close_size=13,
    )
    s_idle.save(os.path.join(SPRITES_DIR, "masita_idle.png"))

    # masita_run.png (Col 2, Fila 1: 900..1495, 175..785)
    # Conservamos intacto el arco derecho de la cabeza (hasta x=562) y sellamos la sien derecha
    s_run = smart_alpha_extract(
        img01,
        (900, 175, 1495, 785),
        mask_rects=[(552, 0, 595, 130), (572, 130, 595, 250)],
        dam_lines=[
            (515, 80, 558, 195, 14),    # arco derecho de la cabeza
            (558, 195, 535, 290, 14),   # mejilla derecha
            (245, 335, 340, 355, 18),   # puente cuello a brazo superior
            (175, 430, 210, 468, 16),   # puente talón trasero
            (340, 500, 385, 535, 16),   # puente espinilla delantera
        ],
        close_size=13,
    )
    s_run.save(os.path.join(SPRITES_DIR, "masita_run.png"))

    # masita_point.png
    path05 = os.path.join(LAMINAS_DIR, "05_storyboard_vertical.jpg")
    if os.path.exists(path05):
        img05 = Image.open(path05)
        s_point = smart_alpha_extract(
            img05,
            (70, 585, 550, 1235),
            mask_rects=[(465, 180, 480, 235)],
            close_size=9,
            normalize_paper=True,
        )
    else:
        s_point = smart_alpha_extract(img01, (210, 170, 880, 790), close_size=11)
    s_point.save(os.path.join(SPRITES_DIR, "masita_point.png"))

    # panic_dead.png (Col 3, Fila 1 - Masita con ojos en cruz)
    s_dead = smart_alpha_extract(img01, (1735, 330, 2430, 760), close_size=11)
    s_dead.save(os.path.join(SPRITES_DIR, "panic_dead.png"))

    # masita_happy.png (Col 1, Fila 2 - saltando alegre)
    s_happy = smart_alpha_extract(img01, (140, 905, 765, 1520), close_size=11)
    s_happy.save(os.path.join(SPRITES_DIR, "masita_happy.png"))

    # masita_nervous.png (Col 2, Fila 2 - manos en mejillas y sudor)
    s_nervous = smart_alpha_extract(img01, (930, 890, 1535, 1530), close_size=11)
    s_nervous.save(os.path.join(SPRITES_DIR, "masita_nervous.png"))

    # masita_trumpet.png (Col 3, Fila 2 - tocando trompeta)
    s_trumpet = smart_alpha_extract(img01, (1710, 935, 2455, 1545), close_size=11)
    s_trumpet.save(os.path.join(SPRITES_DIR, "masita_trumpet.png"))

    # 2. Lámina 02: Pánico Garozo (2528x1696)
    img02 = Image.open(os.path.join(LAMINAS_DIR, "02_masitas_panico_garozo.jpg"))

    s_scream = smart_alpha_extract(img02, (180, 20, 1040, 850), close_size=11)
    s_scream.save(os.path.join(SPRITES_DIR, "panic_scream.png"))

    s_fall = smart_alpha_extract(img02, (1350, 90, 2360, 860), close_size=11)
    s_fall.save(os.path.join(SPRITES_DIR, "panic_fall.png"))

    s_crash = smart_alpha_extract(img02, (195, 870, 1290, 1665), close_size=11)
    s_crash.save(os.path.join(SPRITES_DIR, "panic_crash.png"))

    s_dizzy = smart_alpha_extract(img02, (1620, 880, 2340, 1655), close_size=11)
    s_dizzy.save(os.path.join(SPRITES_DIR, "panic_dizzy.png"))

    # 3. Lámina 03: Caras del Dado (2528x1696) - Cuadrícula 3x2
    img03 = Image.open(os.path.join(LAMINAS_DIR, "03_caras_dado.jpg"))
    dice_boxes = [
        ("face_1.png", (105, 90, 815, 800)),
        ("face_2.png", (915, 90, 1625, 800)),
        ("face_3.png", (1730, 90, 2440, 800)),
        ("face_4.png", (105, 895, 815, 1610)),
        ("face_5.png", (915, 895, 1625, 1610)),
        ("face_6.png", (1730, 895, 2440, 1610)),
    ]
    for fname, box in dice_boxes:
        d_img = smart_alpha_extract(img03, box, is_dice=True, close_size=11, pad=4, trim=True)
        d_img = d_img.resize((512, 512), Image.Resampling.LANCZOS)
        d_img.save(os.path.join(DICE_DIR, fname))

    # 4. Lámina 04: Carteles y Detalles (2528x1696)
    img04 = Image.open(os.path.join(LAMINAS_DIR, "04_carteles_y_detalles.jpg"))

    s_bgarozo = smart_alpha_extract(
        img04,
        (455, 30, 2120, 590),
        dam_lines=[
            (235, 105, 555, 45, 12),
            (555, 45, 1020, 35, 12),
            (1020, 35, 1230, 50, 12),
            (1230, 50, 1515, 70, 12),
            (1515, 70, 1550, 230, 12),
            (1550, 230, 1480, 440, 12),
            (1480, 440, 1180, 490, 12),
            (1180, 490, 520, 480, 12),
            (520, 480, 280, 505, 12),
            (280, 505, 130, 435, 12),
            (130, 435, 135, 240, 12),
            (135, 240, 235, 105, 12),
        ],
        close_size=15,
    )
    s_bgarozo.save(os.path.join(SPRITES_DIR, "banner_garozo.png"))

    s_bwin = smart_alpha_extract(img04, (145, 590, 1160, 1110), close_size=13)
    s_bwin.save(os.path.join(SPRITES_DIR, "banner_win.png"))

    s_logo = smart_alpha_extract(img04, (1240, 595, 2445, 1065), close_size=11)
    s_logo.save(os.path.join(SPRITES_DIR, "logo_garozo.png"))

    s_bag = smart_alpha_extract(img04, (165, 1230, 525, 1615), close_size=11)
    s_bag.save(os.path.join(SPRITES_DIR, "icon_bag.png"))

    # En fx_dust cerramos la entrada de las líneas de velocidad en la nube grande
    s_dust = smart_alpha_extract(
        img04,
        (655, 1110, 1295, 1365),
        dam_lines=[(300, 110, 325, 185, 16)],
        close_size=15,
    )
    s_dust.save(os.path.join(SPRITES_DIR, "fx_dust.png"))

    s_sweat = smart_alpha_extract(img04, (1390, 1135, 1665, 1345), close_size=11)
    s_sweat.save(os.path.join(SPRITES_DIR, "fx_sweat.png"))

    print("Extracción final 100% verificada completada.")


if __name__ == "__main__":
    extract_all()
