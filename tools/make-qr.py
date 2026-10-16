# make-qr.py <public url>: writes site.json and assets/qr.svg, which build.js puts in the
# "pass this calculator on" card. Run again only if the public address changes.
# Needs: py -m pip install qrcode
import json
import os
import sys

import qrcode
import qrcode.image.svg

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
url = sys.argv[1]

img = qrcode.make(url, image_factory=qrcode.image.svg.SvgPathFillImage, box_size=10, border=4,
                  error_correction=qrcode.constants.ERROR_CORRECT_M)
os.makedirs(os.path.join(root, 'assets'), exist_ok=True)
img.save(os.path.join(root, 'assets', 'qr.svg'))
with open(os.path.join(root, 'site.json'), 'w', encoding='utf-8') as f:
    json.dump({'url': url}, f, indent=2)
print('QR for ' + url + ' written to assets/qr.svg')
