from pathlib import Path
from PIL import Image,ImageDraw,ImageOps
import json
root=Path(__file__).resolve().parents[1];assets=root/'public'/'assets'
records=json.loads((assets/'controls-audit.json').read_text(encoding='utf-8'))
assert len(records)==32
for record in records:
    im=Image.open(assets/(record['name']+'.webp'))
    assert im.mode=='RGBA' and im.getchannel('A').getbbox(), record['name']
    l,t,r,b=im.getchannel('A').getbbox()
    assert min(l,t,im.width-r,im.height-b)>=1,(record['name'],'missing border safety')
pause=Image.open(assets/'control-pause.webp');assert pause.size==(256,256)
manifest=json.loads((assets/'manifest.json').read_text(encoding='utf-8'))
family=[a for a in manifest if a['category']=='family'];assert len(family)==2
assert all(a['source']=='Retrato de Família com Cachorro Fofinho.png' for a in family)
sheet=Image.new('RGB',(1000,1400),'#e5dcc8');d=ImageDraw.Draw(sheet)
for n,record in enumerate(records):
    im=ImageOps.contain(Image.open(assets/(record['name']+'.webp')),(220,140));x=(n%4)*250+12;y=(n//4)*170+5;sheet.paste(im,(x,y),im);d.text((x,y+141),record['name'],fill='#284735')
sheet.save(root/'test-results'/'final-controls-audit.png')
print('32 atlas exports, pause safety, and exclusive official portrait source passed.')
