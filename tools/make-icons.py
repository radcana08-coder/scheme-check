# make-icons.py: draws the app icon (gold shield with a tick on navy) into assets/icon-192.png
# and assets/icon-512.png. build.js copies them into the website for the home-screen icon and
# the WhatsApp link preview. Needs: py -m pip install pillow
import os

from PIL import Image, ImageDraw

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NAVY, NAVY2, GOLD = (11, 37, 69), (19, 49, 92), (212, 167, 44)


def icon(size):
    s = size * 4  # draw large, then shrink for smooth edges
    im = Image.new('RGB', (s, s), NAVY)
    d = ImageDraw.Draw(im)

    def p(x, y):  # coordinates on a 0-100 grid
        return (x / 100 * s, y / 100 * s)

    # Kept inside the middle 60% so a round "maskable" crop never cuts it.
    d.ellipse([p(18, 18), p(82, 82)], fill=NAVY2, outline=GOLD, width=int(s * 0.022))
    shield = [p(50, 30), p(66, 36.5), p(66, 50), p(63.5, 58), p(57.5, 65), p(50, 69.5),
              p(42.5, 65), p(36.5, 58), p(34, 50), p(34, 36.5)]
    d.line(shield + [shield[0]], fill=GOLD, width=int(s * 0.03), joint='curve')
    d.line([p(42.5, 50), p(48, 55.5), p(58, 44.5)], fill=GOLD, width=int(s * 0.034), joint='curve')
    return im.resize((size, size), Image.LANCZOS)


os.makedirs(os.path.join(root, 'assets'), exist_ok=True)
for size in (192, 512):
    path = os.path.join(root, 'assets', 'icon-%d.png' % size)
    icon(size).save(path, optimize=True)
    print('wrote', path, os.path.getsize(path), 'bytes')
