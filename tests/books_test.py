from pathlib import Path
from PIL import Image,ImageDraw,ImageOps
import json
root=Path(__file__).resolve().parents[1];assets=root/'public'/'assets'
audit=json.loads((assets/'book-audit.json').read_text(encoding='utf-8'))
assert len(audit)==20 and len({a['name'] for a in audit})==20
for n in range(1,11):
    for label in ['cover','spine']:
        im=Image.open(assets/f'book-{n}-{label}.webp').convert('RGBA')
        box=im.getchannel('A').getbbox();assert box
        l,t,r,b=box
        assert min(l,t,im.width-r,im.height-b)>=3,(n,label,'missing isolation padding')
        assert im.height>im.width,(n,label,'wrong orientation')
gear=Image.open(assets/'control-settings.webp');assert gear.mode=='RGBA' and gear.size==(256,256)
print('20 isolated book exports, upright spines, transparent margins and clean settings asset passed.')
