"""Decompose the bottom statistics strip into a stretchable paint band plus
free-standing stat groups, so it can span any viewport width without
distorting the icons or the numerals."""
import numpy as np, cv2
from PIL import Image

PLATE = np.array(Image.open('/home/claude/reston/site/assets/hero-plate.jpg').convert('RGB')).astype(np.float32)
OUT = '/home/claude/rr/assets/img/'
Y0, Y1 = 668, 854                      # strip band inside the 1280x854 canvas

# regions carrying content, cleared from the paint band and exported separately
GROUPS = {
    'stat-riders':     (92, 712, 340, 812),
    'stat-teams':      (382, 712, 624, 812),
    'stat-schedule':   (676, 716, 758, 806),   # calendar icon only
    'stat-spectators': (892, 712, 1204, 812),
}
DIVIDERS = [362, 647, 878]

CREAM = np.array([232., 227., 224.])


def lift_off_cream(x0, y0, x1, y1, name):
    """Key artwork off the cream paint into straight alpha."""
    sub = PLATE[y0:y1, x0:x1]
    lum = sub.mean(axis=2)
    red = sub[..., 0] - (sub[..., 1] + sub[..., 2]) / 2
    a_dark = np.clip((CREAM.mean() - lum) / (CREAM.mean() - 26.0), 0, 1)
    a_red = np.clip((red - 14.0) / 55.0, 0, 1)
    a = np.clip(np.maximum(a_dark, a_red), 0, 1)
    a = np.clip((a - 0.06) / 0.94, 0, 1)                  # kill paint speckle
    a3 = a[..., None]
    # un-composite from the cream it was painted on
    rgb = np.where(a3 > 0.02, (sub - CREAM * (1 - a3)) / np.maximum(a3, 1e-3), 0.0)
    rgba = np.dstack([np.clip(rgb, 0, 255).astype(np.uint8), (a * 255).astype(np.uint8)])
    Image.fromarray(rgba, 'RGBA').save(OUT + name + '.png')
    print(f'  {name:18s} {x1-x0:4d}x{y1-y0:3d}')


for name, box in GROUPS.items():
    lift_off_cream(*box, name)

# ---- clean paint band: inpaint away every group and divider ----------------
band = PLATE[Y0:Y1].astype(np.uint8).copy()
mask = np.zeros(band.shape[:2], np.uint8)
for (x0, y0, x1, y1) in GROUPS.values():
    mask[max(0, y0 - Y0):y1 - Y0, x0:x1] = 255
for x in DIVIDERS:
    mask[:, x - 4:x + 5] = 255
band = cv2.inpaint(cv2.cvtColor(band, cv2.COLOR_RGB2BGR), mask, 8, cv2.INPAINT_TELEA)
band = cv2.cvtColor(band, cv2.COLOR_BGR2RGB)

h = Y1 - Y0
fade = np.ones((h, band.shape[1]), np.float32)
fade[:34, :] *= np.linspace(0, 1, 34)[:, None]           # soften the top edge
band_rgba = np.dstack([band, (fade * 255).astype(np.uint8)])
img = Image.fromarray(band_rgba, 'RGBA')

img.crop((0, 0, 300, h)).save(OUT + 'strip-cap-left.png')
img.crop((300, 0, 980, h)).resize((240, h), Image.LANCZOS).save(OUT + 'strip-mid.png')
img.crop((980, 0, 1280, h)).save(OUT + 'strip-cap-right.png')
print(f'  strip caps 300x{h}, stretchable middle 240x{h}')
