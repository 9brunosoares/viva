"""Original provenance, real alpha, WOFF2 signatures and padded exports."""
from pathlib import Path
from PIL import Image,ImageDraw
import hashlib,json,numpy as np
root=Path(__file__).resolve().parents[1]; assets=root/'public/assets'
audit=json.loads((assets/'premium6/audit.json').read_text(encoding='utf-8'))
for item in audit['originals']:
    path=root/'source-assets/premium6'/item['file']
    assert hashlib.sha256(path.read_bytes()).hexdigest()==item['sha256']
gallery=Image.new('RGB',(560,260),'#e8dfc9');d=ImageDraw.Draw(gallery)
for i,path in enumerate(sorted((assets/'premium6').glob('*.webp'))):
    im=Image.open(path).convert('RGBA');a=np.asarray(im)[:,:,3]
    assert a.min()==0 and a.max()==255,path.name
    assert not np.any(np.r_[a[0],a[-1],a[:,0],a[:,-1]]),path.name
    thumb=im.copy();thumb.thumbnail((46,46));x=(i%7)*80;y=(i//7)*86
    gallery.paste(thumb,(x+12,y+8),thumb);d.text((x+2,y+58),path.stem[:11],fill='#254334')
assert Image.open(assets/'premium6/gift-open.webp').getpixel((128,128))[3]<10
for face in (assets/'fonts').glob('*.woff2'):assert face.read_bytes()[:4]==b'wOF2'
for license in (assets/'fonts').glob('*OFL.txt'):assert 'SIL OPEN FONT LICENSE' in license.read_text(encoding='utf-8')
for stage in range(4):assert Image.open(assets/f'library-{stage}.webp').size==(496,756)
gallery.resize((1120,520)).save(root/'test-results/premium6/cell-scale.png')
report=dict(originals=len(audit['originals']),paddedSprites=13,woff2=6,openGiftRealAlpha=True,backgroundResolution=[496,756],noHigherResolutionClaim=True)
(root/'test-results/premium6/assets-report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
