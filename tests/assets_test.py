"""Regression checks for clean, centered Match-3 exports (Pillow only)."""
from pathlib import Path
from PIL import Image, ImageDraw
import json
root = Path(__file__).resolve().parents[1]
assets = root / 'public' / 'assets'
report = json.loads((assets / 'tile-audit.json').read_text(encoding='utf-8'))
assert len(report) == 60
sheet = Image.new('RGB', (1200, 1200))
draw = ImageDraw.Draw(sheet)
for stage in range(1, 11):
    for kind in range(6):
        name = f'tile-{stage}-{kind}'
        im = Image.open(assets / (name+'.webp')).convert('RGBA')
        assert im.size == (160,160), name
        l,t,r,b = im.getchannel('A').getbbox()
        assert min(l,t,160-r,160-b)>=9, (name, 'missing transparent safety margin')
        assert abs(l+r-160)<=1 and abs(t+b-160)<=1, (name, 'not centered')
        for background in range(2):
            x=(kind*2+background)*100;y=(stage-1)*120
            draw.rectangle((x,y,x+99,y+119),fill='#e7dfce' if background==0 else '#193c30')
            thumb=im.resize((96,96),Image.Resampling.LANCZOS)
            sheet.paste(thumb,(x+2,y+2),thumb)
            draw.text((x+5,y+101),f'{stage}-{kind}',fill='#304c34' if background==0 else '#f5e7c8')
(root/'test-results').mkdir(exist_ok=True)
sheet.save(root/'test-results'/'tiles-refined.png')
print('60 sprites: square export, transparent safety margin and centered alpha bounds passed.')
