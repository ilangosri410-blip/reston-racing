"""Split the approved 1280x854 hero plate into independently anchorable
layers so the composition can adapt to any viewport without distortion."""
import numpy as np
from PIL import Image, ImageFilter

REF = Image.open('/home/claude/reston/assets/master_reference.jpg').convert('RGB')
PLATE = Image.open('/home/claude/reston/site/assets/hero-plate.jpg').convert('RGB')
OUT = '/home/claude/rr/assets/img/'


def feather(img, left=0, top=0, right=0, bottom=0):
    """Return RGBA with the named edges faded out over N px."""
    w, h = img.size
    a = np.ones((h, w), np.float32)
    if left:
        a[:, :left] *= np.linspace(0, 1, left)[None, :]
    if right:
        a[:, w - right:] *= np.linspace(1, 0, right)[None, :]
    if top:
        a[:top, :] *= np.linspace(0, 1, top)[:, None]
    if bottom:
        a[h - bottom:, :] *= np.linspace(1, 0, bottom)[:, None]
    rgba = np.dstack([np.array(img), (a * 255).astype(np.uint8)])
    return Image.fromarray(rgba, 'RGBA')


# ---------------------------------------------------------------- 2026 PANEL
# solid panel body x 53-155 / y 143-542, plus its torn paint fringe
panel = PLATE.crop((28, 118, 182, 585))
feather(panel, left=26, top=22, right=26, bottom=26).save(OUT + 'layer-2026.png')
print('layer-2026.png       ', panel.size)

# ------------------------------------------------------- RJ WHITE BRUSH PANEL
# the dry-brush sweep carrying POWERED BY / RJ ENERGIES, minus the monogram
# (the monogram is a live <img> so the official asset can be swapped in)
rj = PLATE.crop((812, 396, 1280, 742))
feather(rj, left=54, top=48, bottom=30).save(OUT + 'layer-rj-brush.png')
print('layer-rj-brush.png   ', rj.size)

# --------------------------------------------------------- BOTTOM STATS STRIP
# exported as three slices so the middle can stretch to any width while the
# corner paint explosions keep their exact shape
strip = PLATE.crop((0, 668, 1280, 854))
feather(strip, top=34).save(OUT + 'layer-strip-full.png')
lcap = strip.crop((0, 0, 300, strip.height))
mid = strip.crop((300, 0, 980, strip.height))
rcap = strip.crop((980, 0, 1280, strip.height))
feather(lcap, top=34).save(OUT + 'layer-strip-left.png')
feather(mid, top=34).save(OUT + 'layer-strip-mid.png')
feather(rcap, top=34).save(OUT + 'layer-strip-right.png')
print('layer-strip slices   ', lcap.size, mid.size, rcap.size)

# ------------------------------------------------------------ PHOTO BACKDROP
# rider / dust / mountains with every graphic layer removed, widened so it can
# cover ultrawide viewports without the rider drifting out of frame
bg = Image.open('/home/claude/reston/site/assets/hero-bg.jpg').convert('RGB')
bg.save(OUT + 'hero-photo.jpg', quality=88)
print('hero-photo.jpg       ', bg.size)

# stat icons + dividers ride with the strip, so nothing else to export
