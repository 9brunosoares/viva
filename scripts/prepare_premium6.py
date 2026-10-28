"""Supplied Upgrade 6 art. Originals stay byte-identical; no generated replacement art."""
from pathlib import Path
from collections import deque
from PIL import Image,ImageOps,ImageDraw,ImageFilter
import numpy as np
import hashlib,json,shutil

root=Path(__file__).resolve().parents[1]
attachment=Path(r'C:\Users\Lenovo\.codex\codex-remote-attachments\01a1751c-44d9-7551-aa16-e0f370497a38\CB7568CC-EC55-4E99-A66F-6DEBFDEE2F26')
source=root/'source-assets/premium6';source.mkdir(parents=True,exist_ok=True)
out=root/'public/assets/premium6';out.mkdir(parents=True,exist_ok=True)
mapping={'2-Foto-2.jpg':'petals.jpg','3-Foto-3.jpg':'room-empty.jpg','4-Foto-4.jpg':'gift-wrapped.jpg','5-Foto-5.jpg':'gift-unwrapped.jpg','6-Foto-6.jpg':'gift-open.jpg','7-Foto-7.jpg':'keepsakes.jpg','8-Foto-8.jpg':'tail.jpg','9-Foto-9.jpg':'room-stages.jpg'}
inventory=[]
for original,name in mapping.items():
    file=source/name
    if not file.exists():shutil.copy2(attachment/original,file)
    im=Image.open(file)
    inventory.append(dict(file=name,original=original,size=im.size,mode=im.mode,bytes=file.stat().st_size,sha256=hashlib.sha256(file.read_bytes()).hexdigest()))
(source/'originals.json').write_text(json.dumps(inventory,indent=2))
if not (source/'brief.md').exists():shutil.copy2(attachment/'1-VIVA-UPGRADE-6.md',source/'brief.md')

def matte(im,inside=False):
    rgb=np.asarray(im.convert('RGB'));h,w=rgb.shape[:2]
    # Only near-white connected background; cream petals/paper stay intact.
    candidate=(rgb.min(2)>244)&((rgb.max(2).astype(int)-rgb.min(2))<12)
    seen=np.zeros((h,w),bool);q=deque()
    def visit(x,y):
        if candidate[y,x] and not seen[y,x]:seen[y,x]=True;q.append((x,y))
    for x in range(w):visit(x,0);visit(x,h-1)
    for y in range(h):visit(0,y);visit(w-1,y)
    if inside:visit(w//2,h//2)
    while q:
        x,y=q.popleft()
        for a,b in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
            if 0<=a<w and 0<=b<h:visit(a,b)
    alpha=Image.fromarray((~seen).astype('uint8')*255)
    alpha=alpha.filter(ImageFilter.GaussianBlur(.35))
    im=im.convert('RGBA');im.putalpha(alpha);return im

audit=[]
def save(im,name,size,trim=True):
    if trim:
        # The supplied grid is approximate: discard isolated neighboring fragments.
        alpha=np.asarray(im.getchannel('A')); seen=np.zeros(alpha.shape,bool); components=[]
        for sy,sx in zip(*np.where(alpha>128)):
            if seen[sy,sx]:continue
            q=deque([(sx,sy)]);seen[sy,sx]=True;points=[]
            while q:
                x,y=q.popleft();points.append((x,y))
                for a,b in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
                    if 0<=a<im.width and 0<=b<im.height and alpha[b,a]>128 and not seen[b,a]:seen[b,a]=True;q.append((a,b))
            components.append(points)
        main=max(components,key=len);xs,ys=zip(*main)
        im=im.crop((max(0,min(xs)-2),max(0,min(ys)-2),min(im.width,max(xs)+3),min(im.height,max(ys)+3)))
    im.thumbnail((size-12,size-12),Image.Resampling.LANCZOS)
    pad=Image.new('RGBA',(im.width+12,im.height+12));pad.paste(im,(6,6))
    path=out/f'{name}.webp';pad.save(path,'WEBP',quality=93,method=6)
    audit.append(dict(name='premium6/'+name,file='assets/premium6/'+name+'.webp',size=pad.size,bytes=path.stat().st_size))
for name in ['petals','gift-wrapped','gift-unwrapped','gift-open','tail']:
    save(matte(Image.open(source/f'{name}.jpg'),name=='gift-open'),name,256 if name!='tail' else 384,False)
keepsakes=['diploma','drawing','caipirinha','belt','candle','album','speaker','tattoo-frame']
sheet=Image.open(source/'keepsakes.jpg')
for i,name in enumerate(keepsakes):
    x=i%4;y=i//4;rect=(x*320,y*320,(x+1)*320,(y+1)*320)
    if name=="candle":rect=(0,296,320,640)
    save(matte(sheet.crop(rect)),name,256)
    audit[-1]['sourceRect']=rect
# Delivered stage art is a compressed montage, not four high-resolution files.
# Align it to the existing 496x756 coordinate system; never claim HD recovery.
montage=Image.open(source/'room-stages.jpg')
rects=[(0,0,419,634),(434,0,853,634),(0,645,419,1280),(434,645,853,1280)]
empty=ImageOps.fit(Image.open(source/'room-empty.jpg').convert('RGB'),(496,756),Image.Resampling.LANCZOS)
for stage,rect in enumerate(rects):
    room=empty if stage<2 else ImageOps.fit(montage.crop(rect).convert('RGB'),(496,756),Image.Resampling.LANCZOS)
    if stage>=2:
        mask=Image.new('L',room.size);d=ImageDraw.Draw(mask)
        for y in range(410,756):d.line((0,y,496,y),fill=min(255,round((y-410)/42*255)))
        room=Image.composite(empty,room,mask)
    room.save(root/f'public/assets/library-{stage}.webp','WEBP',quality=94,method=6)
    # Foreground shelf lip: use pixels from the new illustration itself.
    lip=Image.new('L',room.size);d=ImageDraw.Draw(lip)
    left=191 if stage<2 else 192
    d.polygon([(231,left),(458,left-11),(458,left-3),(231,left+8)],fill=255)
    depth=Image.open(root/f'public/assets/library-{stage}.webp').convert('RGBA');depth.putalpha(lip)
    depth.save(root/f'public/assets/library-shelf-depth-{stage}.webp','WEBP',lossless=True,method=6)

    audit.append(dict(name=f'library-{stage}',file=f'assets/library-{stage}.webp',size=room.size,sourceRect=rect,deliveredResolution=montage.size,note='Actual supplied resolution; lower floor restored from supplied empty room to avoid baked-in Blade.'))
foreground=empty.convert('RGBA');mask=Image.new('L',empty.size);d=ImageDraw.Draw(mask)
d.polygon([(0,605),(180,607),(287,628),(357,668),(357,756),(0,756)],fill=255)
foreground.putalpha(mask);foreground.save(root/'public/assets/library-foreground.webp','WEBP',lossless=True,method=6)
# Audit the complete room composition and foreground masks as well.
for item in audit:
    if 'bytes' not in item:item['bytes']=(root/'public'/item['file']).stat().st_size
for name in ['library-foreground']+[f'library-shelf-depth-{i}' for i in range(4)]:
    path=root/f'public/assets/{name}.webp'
    audit.append(dict(name=name,file=f'assets/{name}.webp',size=Image.open(path).size,bytes=path.stat().st_size,note='Retouched-room foreground pixels; no replacement illustration.'))
(out/'audit.json').write_text(json.dumps(dict(originals=inventory,exports=audit,limitations=['Expected ~1008x1536 separate backgrounds were not supplied. Empty room is 503x757; four-stage montage is 853x1280.','Stages 0/1 use supplied empty room; stages 2/3 use retouched montage upper art. Embedded Blade is removed via the supplied empty lower room, preserving the interactive original sprites.']),indent=2))
manifest_file=root/'public/assets/manifest.json';manifest=json.loads(manifest_file.read_text(encoding='utf-8'))
names={e['name'] for e in audit};manifest=[e for e in manifest if e['name'] not in names]
manifest.extend({**e,'category':'premium6'} for e in audit)
manifest_file.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
preview=Image.new('RGB',(256*4,290*4),'#193c2e');d=ImageDraw.Draw(preview)
for i,path in enumerate(out.glob('*.webp')):
    im=Image.open(path);im.thumbnail((240,240));x=i%4*256;y=i//4*290;preview.paste(im,(x,y+22),im);d.text((x+5,y+3),path.stem,fill='white')
(root/'test-results').mkdir(exist_ok=True);preview.save(root/'test-results/premium6-art.jpg',quality=92)
print(json.dumps(dict(originals=len(inventory),exports=len(audit),bytes=sum(e.get('bytes',0) for e in audit),backgroundResolutionLimit=True)))
