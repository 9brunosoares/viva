"""Import the supplied campaign art without modifying originals.

Explicit semantic sprite/sequence mapping. Pillow + numpy; no network or generation.
"""
from pathlib import Path
from collections import deque
import hashlib
import json
import shutil
import sys
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
from extract_tiles import extract_tiles

root = Path(__file__).resolve().parents[1]
source = root / 'source-assets' / 'campaign-evolution'
out = root / 'public' / 'assets'
source.mkdir(parents=True, exist_ok=True)
originals = {
 '1-Foto-1.jpg': 'tattoo-tiles.jpg', '2-Foto-2.jpg': 'tattoo-studio.jpg',
 '3-Foto-3.jpg': 'tattoo-decoration.jpg',
 '4-viva_atlas_vfx_nativo_01.png': 'vfx-01.png',
 '5-viva_atlas_vfx_nativo_02.png': 'vfx-02.png',
 '6-viva_atlas_vfx_nativo_03.png': 'vfx-03.png',
 '7-Foto-7.jpg': 'library-five-before.jpg', '8-Foto-8.jpg': 'library-four-before.jpg',
}
if len(sys.argv) > 1 and sys.argv[1]!='--decor-only':
    attachment = Path(sys.argv[1])
    for original, semantic in originals.items():
        if not (attachment / original).is_file():
            raise FileNotFoundError(attachment / original)
        shutil.copy2(attachment / original, source / semantic)
inventory = []
for original, semantic in originals.items():
    file = source / semantic
    with Image.open(file) as image:
        inventory.append(dict(file=semantic, original=original, size=image.size, mode=image.mode,
                              bytes=file.stat().st_size, sha256=hashlib.sha256(file.read_bytes()).hexdigest()))
(source / 'originals.json').write_text(json.dumps(inventory, ensure_ascii=False, indent=2), encoding='utf-8')

def white_exterior(image):
    rgb = np.asarray(image.convert('RGB')).astype(float)
    h, w, _ = rgb.shape
    candidate = (rgb.min(2) > 205) & (rgb.max(2)-rgb.min(2) < 45)
    background = np.zeros((h,w), bool)
    queue = deque()
    def seed(x,y):
        if candidate[y,x] and not background[y,x]:
            background[y,x] = True
            queue.append((x,y))
    for x in range(w): seed(x,0); seed(x,h-1)
    for y in range(h): seed(0,y); seed(w-1,y)
    # Only the deliberately hollow square gets an interior background seed.
    seed(1140,860)
    while queue:
        x,y=queue.popleft()
        for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
            if 0 <= nx < w and 0 <= ny < h: seed(nx,ny)
    alpha=(~background).astype(float)
    exterior_neighbors=np.asarray(Image.fromarray(background.astype('uint8')*255).filter(ImageFilter.MaxFilter(3)))>0
    boundary=(~background)&exterior_neighbors
    alpha[boundary]=np.clip((255-rgb.min(2)[boundary])/80,0,1)
    # Undo the white matte only at the connected exterior antialias; enclosed whites stay opaque.
    a=alpha[:,:,None]
    color=np.clip((rgb-255*(1-a))/np.maximum(a,0.001),0,255).astype('uint8')
    return Image.fromarray(np.dstack((color,(alpha*255).astype('uint8'))))

ids=['warrior','books','coffee','lioness','mother-infinity','machine','ink','ionic-column','swallow','heart',
     'butterfly','flash-sheet','glove','gold-star','moon','leaves','hibiscus','diamond','lotus','outline-square']
(out/'tattoos').mkdir(exist_ok=True)
# One useful studio ornament on the introduction only; furniture already exists in the scene.
decor_rect=(1070,678,1276,822)
decor=Image.open(source/'tattoo-decoration.jpg').crop(decor_rect).convert('RGB')
rgb=np.asarray(decor).astype(float);h,w,_=rgb.shape
candidate=rgb.max(2)<26;seen=np.zeros((h,w),bool);queue=deque()
def visit(x,y):
 if candidate[y,x] and not seen[y,x]:seen[y,x]=True;queue.append((x,y))
for x in range(w):visit(x,0);visit(x,h-1)
for y in range(h):visit(0,y);visit(w-1,y)
while queue:
 x,y=queue.popleft()
 for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
  if 0<=nx<w and 0<=ny<h:visit(nx,ny)
decor.putalpha(Image.fromarray((~seen).astype('uint8')*255));decor.save(out/'tattoos'/'studio-flash.webp','WEBP',quality=93,method=6)
(out/'tattoos'/'studio-decoration.json').write_text(json.dumps(dict(source='tattoo-decoration.jpg',rect=decor_rect,file='tattoos/studio-flash.webp',role='phase-nine-introduction-only')),encoding='utf-8')
if len(sys.argv)>1 and sys.argv[1]=='--decor-only':
 print('Studio flash-sheet extracted; enclosed ink stays opaque.');sys.exit(0)
regions=[(x1,y1,x2,y2) for y1,y2 in [(5,307),(307,534),(534,759),(759,1000)]
         for x1,x2 in [(5,265),(265,530),(530,755),(755,1007),(1007,1275)]]
tiles, ownership=extract_tiles(white_exterior(Image.open(source/'tattoo-tiles.jpg')),5,4,regions=regions)
(out/'tattoos').mkdir(exist_ok=True)
for name,image in zip(ids,tiles): image.save(out/'tattoos'/f'{name}.webp','WEBP',quality=94,method=6)
active=['warrior','books','coffee','lioness','mother-infinity','ionic-column','outline-square']
(out/'tattoos'/'sprites.json').write_text(json.dumps({
 'source':'source-assets/campaign-evolution/tattoo-tiles.jpg','background':'connected exterior; only square interior seeded',
 'active':active,'sprites':{name:{**entry,'region':regions[i],'file':f'tattoos/{name}.webp'} for i,(name,entry) in enumerate(zip(ids,ownership))}
},ensure_ascii=False,indent=2),encoding='utf-8')
(out/'scenes').mkdir(exist_ok=True)
Image.open(source/'tattoo-studio.jpg').save(out/'scenes'/'tattoo-studio.webp','WEBP',quality=91,method=6)

# Real panels have unequal cells and even missing/repeated printed frame numbers.
# Coordinates exclude headers, numerals and divider lines. Do not infer frames from labels.
def strip(file, xs, top, bottom, matte='light'):
    return [dict(source=file, rect=[a,top,b,bottom], matte=matte) for a,b in zip(xs,xs[1:])]
sequences={
 'match3':strip('vfx-01.png',[2,91,187,286,396,525,658,838,989],40,179),
 'match4':strip('vfx-03.png',[1035,1129,1237,1346,1455,1570,1674,1765,1867,1960,2045],51,158),
 'color':strip('vfx-01.png',[1004,1106,1214,1326,1450,1576,1715,1845,2011],249,404),
 'area':strip('vfx-02.png',[12,78,171,267,371,484,590,645],660,775),
 'horizontal':strip('vfx-02.png',[651,724,799,877,965,1051,1131,1210,1297],660,775),
 'vertical':strip('vfx-02.png',[1310,1382,1460,1538,1617,1694,1769,1848,1936],665,777),
 'areaBirth':strip('vfx-03.png',[5,90,181,286,407,531,649,778,889,1022],232,346,'object'),
}
atlas_images={name:Image.open(source/name).convert('RGB') for name in ['vfx-01.png','vfx-02.png','vfx-03.png']}
cell=192
all_frames=[]
metadata={}
for name, frames in sequences.items():
    rgba_frames=[]
    for frame in frames:
        rgb=np.asarray(atlas_images[frame['source']].crop(frame['rect'])).astype(float)
        intensity=rgb.max(2)
        if frame['matte']=='light':
            alpha=np.clip((intensity-9)/246,0,1)
        else:
            alpha=np.clip((intensity-10)/65,0,1)
        # Conservative safe regions: overlapping glows taper at their ownership boundary.
        # This discards ambiguous edge pixels instead of borrowing adjacent petals/flashes.
        yy,xx=np.indices(alpha.shape)
        edge=np.minimum.reduce([xx,yy,alpha.shape[1]-1-xx,alpha.shape[0]-1-yy]).astype(float)
        alpha*=np.clip(edge/9,0,1)
        if frame['matte']=='light':
            # Shared glows in the supplied panels make outer pixels ambiguous.
            # A circular ownership fade discards them without rectangular edges or deformation.
            radius=min(alpha.shape)/2-1
            distance=np.hypot(xx-(alpha.shape[1]-1)/2,yy-(alpha.shape[0]-1)/2)
            alpha*=np.clip((radius-distance)/(radius*.38),0,1)
        # Recover straight RGB from black-premultiplied glow. No black rectangle / indiscriminate screen blend.
        color=np.clip(rgb/np.maximum(alpha[:,:,None],0.001),0,255).astype('uint8')
        rgba_frames.append(Image.fromarray(np.dstack((color,(alpha*255).astype('uint8')))))
    # One reference scale for the WHOLE sequence; tiny first frames stay tiny as the bloom grows.
    reference=max(max(im.size) for im in rgba_frames)+12
    records=[]
    for info,image in zip(frames,rgba_frames):
        base=Image.new('RGBA',(reference,reference))
        base.paste(image,((reference-image.width)//2,(reference-image.height)//2))
        base=base.resize((cell,cell),Image.Resampling.LANCZOS)
        index=len(all_frames);all_frames.append(base)
        records.append(dict(x=(index%8)*cell,y=(index//8)*cell,width=cell,height=cell,source=info['source'],sourceRect=info['rect']))
    # Slower anticipation, brisk bloom, longer dissipation; not all frames share a duration.
    durations=[55 if i<2 else 40 if i<len(records)-2 else 65 for i in range(len(records))]
    metadata[name]=dict(frames=records,durations=durations,reference=reference)

sheet=Image.new('RGBA',(cell*8,cell*((len(all_frames)+7)//8)))
for i,image in enumerate(all_frames): sheet.paste(image,((i%8)*cell,(i//8)*cell))
(out/'vfx').mkdir(exist_ok=True)
sheet.save(out/'vfx'/'sequences.webp','WEBP',quality=94,method=6)
(out/'vfx'/'sequences.json').write_text(json.dumps(dict(file='vfx/sequences.webp',cell=cell,sequences=metadata),indent=2),encoding='utf-8')
usable={'match4':6,'color':5,'area':6,'areaBirth':6}
runtime={name:dict(frames=[(frame['y']//cell)*8+frame['x']//cell for frame in seq['frames'][:usable.get(name,len(seq['frames']))]],durations=seq['durations'][:usable.get(name,len(seq['frames']))]) for name,seq in metadata.items()}
(root/'src'/'vfxAtlas.ts').write_text('// Generated by scripts/prepare_campaign_assets.py; original coordinates are in assets/vfx/sequences.json.\nexport const vfxAtlas = '+json.dumps(dict(cell=cell,columns=8,sequences=runtime))+' as const;\n',encoding='utf-8')

# Remove only replaced runtime files; all originals remain in Git/history and source-assets.
for name in ['scene-9',*[f'tile-9-{i}' for i in range(6)]]:
    old=out/f'{name}.webp'
    if old.exists(): old.unlink()
# Keep the existing inspection manifest truthful after replacing the seventh theme atlas row.
manifest_file=out/'manifest.json'
if manifest_file.exists():
 manifest=[entry for entry in json.loads(manifest_file.read_text(encoding='utf-8')) if entry['name'] not in ['scene-9',*[f'tile-9-{i}' for i in range(6)]]]
 manifest.append(dict(name='scene-9',file='assets/scenes/tattoo-studio.webp',category='scene',stage=9,dimensions=[719,1280],source='tattoo-studio.jpg'))
 for i,name in enumerate(active):manifest.append(dict(name=f'tile-9-{i}',file=f'assets/tattoos/{name}.webp',category='tile',stage=9,dimensions=[160,160],source='tattoo-tiles.jpg'))
 manifest_file.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
report_dir=root/'test-results';report_dir.mkdir(exist_ok=True)
gallery=Image.new('RGB',(800,4*185),'#16382d')
d=ImageDraw.Draw(gallery)
for i,(name,image) in enumerate(zip(ids,tiles)):
    x=(i%5)*160;y=(i//5)*185;gallery.paste(image,(x,y),image);d.text((x+5,y+163),name,fill='#fff1d5')
gallery.save(report_dir/'tattoo-sprites.png')
preview=Image.new('RGBA',sheet.size,'#153429');preview.alpha_composite(sheet);preview.convert('RGB').save(report_dir/'vfx-sequences.png')
print(json.dumps(dict(originals=len(inventory),tattooSprites=len(tiles),active=active,vfxFrames=len(all_frames),sheet=sheet.size),ensure_ascii=False))
