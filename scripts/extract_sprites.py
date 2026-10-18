#!/usr/bin/env python3
"""
scripts/extract_sprites.py
Pipeline de procesamiento y extracción automática de sprites para "GAROZO! party game".
Aísla personajes, caras del dado y carteles de las 4 láminas maestras,
convirtiendo el papel cálido exterior en transparencia Alpha real,
y preservando los trazos de lápiz y los rellenos interiores.
"""

import os
import cv2
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LAMINAS_DIR = os.path.join(BASE_DIR, "assets", "laminas")
SPRITES_DIR = os.path.join(BASE_DIR, "assets", "sprites")
DICE_DIR = os.path.join(SPRITES_DIR, "dice")

os.makedirs(SPRITES_DIR, exist_ok=True)
os.makedirs(DICE_DIR, exist_ok=True)

def remove_background_character(crop, erase_rects=None, fill_color=(254, 252, 248), pencil_threshold=185, close_size=7):
    """
    Convierte el fondo de papel exterior en transparente (alpha=0),
    preservando el interior del personaje como blanco/crema opaco y
    suavizando los trazos de lápiz del contorno.
    """
    img = crop.copy()
    h, w = img.shape[:2]
    
    # Borrar rectángulos no deseados (ej. dados pequeños dibujados al lado)
    if erase_rects:
        for (rx1, ry1, rx2, ry2) in erase_rects:
            img[ry1:ry2, rx1:rx2] = [220, 238, 246]

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # 1. Detección de trazo de lápiz
    is_pencil = gray < pencil_threshold
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (close_size, close_size))
    barrier = cv2.morphologyEx(is_pencil.astype(np.uint8), cv2.MORPH_CLOSE, kernel)
    
    # 2. Componentes conexas en el espacio vacío (fuera de la barrera de lápiz)
    empty = (barrier == 0).astype(np.uint8)
    num_labels, labels = cv2.connectedComponents(empty)
    
    # Etiquetas que tocan el borde del recorte -> Exterior
    border_pixels = np.concatenate([labels[0, :], labels[h-1, :], labels[:, 0], labels[:, w-1]])
    outside_labels = set(np.unique(border_pixels))
    if 0 in outside_labels:
        outside_labels.remove(0)
        
    outside = np.isin(labels, list(outside_labels))
    inside = ~outside
    
    # 3. Construcción del canal Alpha y Color
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    
    # Para el interior: color base relleno suave
    rgba[:, :, :3] = img
    # Relleno del interior del cuerpo (zonas claras dentro del cuerpo)
    body_fill = inside & (gray >= 180)
    rgba[body_fill, :3] = fill_color
    
    # Alpha:
    # Interior: 100% opaco
    alpha = np.zeros((h, w), dtype=np.uint8)
    alpha[inside] = 255
    
    # Exterior: trazo antialiased según oscuridad del lápiz
    pencil_factor = np.clip((225.0 - gray.astype(np.float32)) / (225.0 - 100.0), 0, 1)
    pencil_alpha = (pencil_factor * 255.0).astype(np.uint8)
    alpha[outside] = np.where(pencil_alpha[outside] > 25, pencil_alpha[outside], 0)
    
    rgba[:, :, 3] = alpha
    
    # Recortar márgenes transparentes sobrantes
    active = alpha > 15
    ys, xs = np.where(active)
    if len(ys) > 0:
        pad = 12
        y1 = max(0, ys.min() - pad)
        y2 = min(h, ys.max() + pad)
        x1 = max(0, xs.min() - pad)
        x2 = min(w, xs.max() + pad)
        rgba = rgba[y1:y2, x1:x2]
        
    return rgba

def remove_background_graphic(crop, fill_white=True, gain=2.5, erase_rects=None):
    """
    Especial para carteles, logos y FX (humo, sudor):
    Elimina el papel de fondo manteniendo los trazos y contrastes.
    """
    img = crop.copy()
    h, w = img.shape[:2]
    
    if erase_rects:
        for (rx1, ry1, rx2, ry2) in erase_rects:
            img[ry1:ry2, rx1:rx2] = [220, 238, 246]
            
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # El papel cálido ronda 220-250 en gris
    paper_val = 225.0
    diff = paper_val - gray.astype(np.float32)
    alpha_float = np.clip(diff * gain, 0, 255)
    
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[:, :, :3] = img
    rgba[:, :, 3] = alpha_float.astype(np.uint8)
    
    # Limpiar ruido muy bajo
    rgba[rgba[:, :, 3] < 20, 3] = 0
    
    # Recorte ajustado
    active = rgba[:, :, 3] > 15
    ys, xs = np.where(active)
    if len(ys) > 0:
        pad = 10
        y1 = max(0, ys.min() - pad)
        y2 = min(h, ys.max() + pad)
        x1 = max(0, xs.min() - pad)
        x2 = min(w, xs.max() + pad)
        rgba = rgba[y1:y2, x1:x2]
        
    return rgba

def process_dice_face(crop, target_size=(400, 400)):
    """
    Recorta la cara del dado cuadrada, ajusta márgenes y redimensiona a cuadrado uniforme.
    """
    h, w = crop.shape[:2]
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    
    # Detectar el recuadro exterior del dado
    dark = gray < 195
    ys, xs = np.where(dark)
    pad = 6
    y1 = max(0, ys.min() - pad)
    y2 = min(h, ys.max() + pad)
    x1 = max(0, xs.min() - pad)
    x2 = min(w, xs.max() + pad)
    
    die_crop = crop[y1:y2, x1:x2].copy()
    
    # Convertir a RGBA con esquinas exteriores transparentes si se desea
    # o mantener textura de papel limpia
    h_c, w_c = die_crop.shape[:2]
    # Forzar cuadrado simétrico
    size = max(h_c, w_c)
    square = np.full((size, size, 3), 255, dtype=np.uint8)
    # Rellenar con color de fondo del dado
    square[:, :] = [224, 239, 248]
    dy = (size - h_c) // 2
    dx = (size - w_c) // 2
    square[dy:dy+h_c, dx:dx+w_c] = die_crop
    
    # Redimensionar con alta calidad
    resized = cv2.resize(square, target_size, interpolation=cv2.INTER_AREA)
    return resized

def main():
    print("==================================================")
    print("[*] EXTRAYENDO SPRITES DE GAROZO! PARTY GAME...")
    print("==================================================")
    
    # ----------------------------------------------------
    # LAMINA 1: 01_masitas_estados.jpg
    # ----------------------------------------------------
    path_01 = os.path.join(LAMINAS_DIR, "01_masitas_estados.jpg")
    img_01 = cv2.imread(path_01)
    if img_01 is None:
        raise FileNotFoundError(f"No se pudo cargar {path_01}")
        
    print("[*] Procesando 01_masitas_estados.jpg...")
    # 1. Idle Masita (fila 1, col 1) - borrar dado de suelo a la derecha
    crop_idle = img_01[150:785, 180:710]
    idle_sprite = remove_background_character(crop_idle, erase_rects=[(450, 410, crop_idle.shape[1], crop_idle.shape[0])])
    cv2.imwrite(os.path.join(SPRITES_DIR, "masita_idle.png"), idle_sprite)
    print("  [OK] masita_idle.png")
    
    # 2. Corriendo y tirando (fila 1, col 2) - recortar limpio sin letras ni dado adicional
    crop_run = img_01[160:765, 920:1720].copy()
    crop_run[:120, 505:] = [220, 238, 246]
    crop_run[120:270, 546:] = [220, 238, 246]
    crop_run[270:, 552:] = [220, 238, 246]
    run_sprite = remove_background_character(crop_run, close_size=7)
    cv2.imwrite(os.path.join(SPRITES_DIR, "masita_run.png"), run_sprite)
    print("  [OK] masita_run.png")
    
    # 3. Pose apuntando / gesto hacia el dado (masita_point.png)
    cv2.imwrite(os.path.join(SPRITES_DIR, "masita_point.png"), run_sprite)
    print("  [OK] masita_point.png")
    
    # 4. Masita K.O. / Sacó un 1 (fila 1, col 3)
    crop_ko = img_01[170:770, 1720:2500]
    ko_sprite = remove_background_character(crop_ko, close_size=9)
    cv2.imwrite(os.path.join(SPRITES_DIR, "panic_dead.png"), ko_sprite)
    print("  [OK] panic_dead.png")
    
    # 5. Masita Feliz / Celebración (fila 2, col 1) - recortado sin texto superior ni inferior
    crop_happy = img_01[915:1530, 180:800]
    happy_sprite = remove_background_character(crop_happy)
    cv2.imwrite(os.path.join(SPRITES_DIR, "masita_happy.png"), happy_sprite)
    print("  [OK] masita_happy.png")
    
    # 6. Masita Nerviosa / Sudando (fila 2, col 2) - recortado sin texto superior ni inferior
    crop_nervous = img_01[905:1530, 880:1530]
    nervous_sprite = remove_background_character(crop_nervous)
    cv2.imwrite(os.path.join(SPRITES_DIR, "masita_nervous.png"), nervous_sprite)
    print("  [OK] masita_nervous.png")
    
    # 7. Masita Trompeta / Ganador (fila 2, col 3) - recortado sin texto superior ni inferior
    crop_trumpet = img_01[915:1530, 1680:2480]
    trumpet_sprite = remove_background_character(crop_trumpet)
    cv2.imwrite(os.path.join(SPRITES_DIR, "masita_trumpet.png"), trumpet_sprite)
    print("  [OK] masita_trumpet.png")
    
    # ----------------------------------------------------
    # LAMINA 2: 02_masitas_panico_garozo.jpg
    # ----------------------------------------------------
    path_02 = os.path.join(LAMINAS_DIR, "02_masitas_panico_garozo.jpg")
    img_02 = cv2.imread(path_02)
    if img_02 is None:
        raise FileNotFoundError(f"No se pudo cargar {path_02}")
        
    print("[*] Procesando 02_masitas_panico_garozo.jpg...")
    # 1. Gritando brazos arriba (Top-Left)
    crop_scream = img_02[30:830, 150:1100]
    scream_sprite = remove_background_character(crop_scream, close_size=9)
    cv2.imwrite(os.path.join(SPRITES_DIR, "panic_scream.png"), scream_sprite)
    print("  [OK] panic_scream.png")
    
    # 2. Resbalón / Panza al suelo (Top-Right)
    crop_fall = img_02[30:830, 1350:2480]
    fall_sprite = remove_background_character(crop_fall, close_size=9)
    cv2.imwrite(os.path.join(SPRITES_DIR, "panic_fall.png"), fall_sprite)
    print("  [OK] panic_fall.png")
    
    # 3. Choque de frente (Bottom-Left)
    crop_crash = img_02[860:1650, 150:1250]
    crash_sprite = remove_background_character(crop_crash, close_size=9)
    cv2.imwrite(os.path.join(SPRITES_DIR, "panic_crash.png"), crash_sprite)
    print("  [OK] panic_crash.png")
    
    # 4. Mareada ojos espiral (Bottom-Right)
    crop_dizzy = img_02[860:1650, 1350:2400]
    dizzy_sprite = remove_background_character(crop_dizzy, close_size=9)
    cv2.imwrite(os.path.join(SPRITES_DIR, "panic_dizzy.png"), dizzy_sprite)
    print("  [OK] panic_dizzy.png")
    
    # ----------------------------------------------------
    # LAMINA 3: 03_caras_dado.jpg
    # ----------------------------------------------------
    path_03 = os.path.join(LAMINAS_DIR, "03_caras_dado.jpg")
    img_03 = cv2.imread(path_03)
    if img_03 is None:
        raise FileNotFoundError(f"No se pudo cargar {path_03}")
        
    print("[*] Procesando 03_caras_dado.jpg...")
    dice_coords = [
        (1, 100, 95, 820, 810),     # Cara 1 (con líneas dramáticas)
        (2, 915, 95, 1630, 810),    # Cara 2
        (3, 1730, 95, 2445, 810),   # Cara 3
        (4, 100, 895, 820, 1610),   # Cara 4
        (5, 915, 895, 1630, 1610),  # Cara 5
        (6, 1730, 895, 2445, 1610)  # Cara 6
    ]
    for face_num, x1, y1, x2, y2 in dice_coords:
        crop_face = img_03[y1:y2, x1:x2]
        face_img = process_dice_face(crop_face, target_size=(400, 400))
        out_name = f"face_{face_num}.png"
        cv2.imwrite(os.path.join(DICE_DIR, out_name), face_img)
        print(f"  [OK] dice/{out_name}")
        
    # ----------------------------------------------------
    # LAMINA 4: 04_carteles_y_detalles.jpg
    # ----------------------------------------------------
    path_04 = os.path.join(LAMINAS_DIR, "04_carteles_y_detalles.jpg")
    img_04 = cv2.imread(path_04)
    if img_04 is None:
        raise FileNotFoundError(f"No se pudo cargar {path_04}")
        
    print("[*] Procesando 04_carteles_y_detalles.jpg...")
    # 1. Banner "¡GAROZOOO!"
    crop_garozo = img_04[30:560, 180:2350]
    garozo_banner = remove_background_graphic(crop_garozo, gain=3.0)
    cv2.imwrite(os.path.join(SPRITES_DIR, "banner_garozo.png"), garozo_banner)
    print("  [OK] banner_garozo.png")
    
    # 2. Banner "WIN!"
    crop_win = img_04[570:1060, 90:1200]
    win_banner = remove_background_graphic(crop_win, gain=3.0)
    cv2.imwrite(os.path.join(SPRITES_DIR, "banner_win.png"), win_banner)
    print("  [OK] banner_win.png")
    
    # 3. Logo "GAROZO! party game"
    crop_logo = img_04[570:1060, 1220:2480]
    logo_sprite = remove_background_graphic(crop_logo, gain=3.0)
    cv2.imwrite(os.path.join(SPRITES_DIR, "logo_garozo.png"), logo_sprite)
    print("  [OK] logo_garozo.png")
    
    # 4. Saquito de puntos (icon_bag.png)
    crop_bag = img_04[1100:1660, 100:560]
    bag_sprite = remove_background_character(crop_bag, close_size=7)
    cv2.imwrite(os.path.join(SPRITES_DIR, "icon_bag.png"), bag_sprite)
    print("  [OK] icon_bag.png")
    
    # 5. Nubecita de polvo (fx_dust.png)
    crop_dust = img_04[1100:1660, 600:1300]
    dust_sprite = remove_background_graphic(crop_dust, gain=2.5)
    cv2.imwrite(os.path.join(SPRITES_DIR, "fx_dust.png"), dust_sprite)
    print("  [OK] fx_dust.png")
    
    # 6. Gotas de sudor (fx_sweat.png)
    crop_sweat = img_04[1100:1660, 1340:1750]
    sweat_sprite = remove_background_graphic(crop_sweat, gain=2.5)
    cv2.imwrite(os.path.join(SPRITES_DIR, "fx_sweat.png"), sweat_sprite)
    print("  [OK] fx_sweat.png")
    
    print("==================================================")
    print("[SUCCESS] EXTRACCION COMPLETADA CON EXITO")
    print(f"Total sprites generados en {SPRITES_DIR}")
    print("==================================================")

if __name__ == "__main__":
    main()
