from PIL import Image, ImageOps, ImageDraw
from pathlib import Path
import json
from extract_tiles import extract_tiles
root=Path(__file__).resolve().parents[1]
source=root/'fotos'/'atlas_imagens'; out=root/'public'/'assets'; out.mkdir(parents=True,exist_ok=True)
files=list(source.glob('*.png')); manifest=[]; audit=[]
def find(prefix): return next(p for p in files if p.name.startswith(prefix))
def save(im,name,category,stage=None,size=512,trim=True,quality=88):
    if trim and im.mode=='RGBA':
        box=im.getchannel('A').getbbox()
        if box: im=im.crop(box)
    im.thumbnail((size,size),Image.Resampling.LANCZOS)
    im.save(out/(name+'.webp'),'WEBP',quality=quality)
    manifest.append(dict(name=name,file='assets/'+name+'.webp',category=category,dimensions=im.size,stage=stage,purpose=category))
    return im
def grid(prefix,cols,rows,category,namer,size=512):
    im=Image.open(find(prefix))
    for y in range(rows):
        for x in range(cols):
            crop=im.crop((round(x*im.width/cols),round(y*im.height/rows),round((x+1)*im.width/cols),round((y+1)*im.height/rows)))
            name,stage=namer(x,y); save(crop,name,category,stage,size)
for p in files:
    im=Image.open(p)
    hist=im.getchannel('A').histogram() if im.mode=='RGBA' else None
    audit.append(dict(file=p.name,size=im.size,mode=im.mode,alpha=im.getchannel('A').getextrema() if hist else None,transparentPixels=hist[0] if hist else 0,partialAlphaPixels=sum(hist[1:255]) if hist else 0,opaquePixels=hist[255] if hist else im.width*im.height))
tile_audit=[]
for prefix,first in [('Cartela de Ícones',1),('Cartela de ícones 3D',6)]:
    tiles,details=extract_tiles(Image.open(find(prefix)))
    for index,im in enumerate(tiles):
        stage=first+index//6
        name=f'tile-{stage}-{index%6}'
        save(im,name,'tile',stage,160,trim=False)
        tile_audit.append(dict(name=name,source=find(prefix).name,**details[index]))
(out/'tile-audit.json').write_text(json.dumps(tile_audit,ensure_ascii=False,indent=2),encoding='utf-8')
scenes=Image.open(find('Colagem'))
for y in range(2):
    for x in range(5):
        # Exclude white separators baked into the collage.
        crop=scenes.crop((round(x*scenes.width/5)+12,round(y*scenes.height/2)+8,round((x+1)*scenes.width/5)-10,round((y+1)*scenes.height/2)-8))
        save(crop,f'scene-{y*5+x+1}','scene',y*5+x+1,900)
power_regions=[(0,0,365,378),(365,0,705,378),(705,0,1075,405),(1075,0,1448,405),(0,405,490,710),(490,375,705,748),(705,405,1070,748),(1070,405,1448,748),(0,710,395,1086),(395,748,705,1086),(705,748,1070,1086),(1070,748,1448,1086)]
reward_regions=[(0,0,430,366),(420,40,1024,365),(0,360,430,850),(420,420,1024,790),(0,820,520,1180),(550,775,960,1180),(0,1170,420,1536),(420,1210,1024,1510)]
atlas_audit=[]
for prefix,cols,rows,category,regions in [('Cartela de Power',4,3,'power',power_regions),('Coleção de Emblemas',2,4,'reward',reward_regions),('Sprite de interface',3,4,'ui',None)]:
    objects,details=extract_tiles(Image.open(find(prefix)),columns=cols,rows=rows,square=False,regions=regions)
    for i,obj in enumerate(objects):
        size=420 if category!='ui' else 300
        obj=obj.copy();obj.thumbnail((size-16,size-16),Image.Resampling.LANCZOS)
        obj=obj.crop(obj.getchannel('A').getbbox())
        padded=Image.new('RGBA',(obj.width+16,obj.height+16));padded.paste(obj,(8,8))
        rendered=save(padded,f'{category}-{i}',category,size=size,trim=False)
        atlas_audit.append({**details[i],'name':f'{category}-{i}','source':find(prefix).name,'outputSize':rendered.size})
    if category=='ui':
        for label,index in [('pause',7),('back',6),('settings',8)]:
            obj=ImageOps.contain(objects[index],(224,224),Image.Resampling.LANCZOS)
            padded=Image.new('RGBA',(256,256));padded.paste(obj,((256-obj.width)//2,(256-obj.height)//2))
            save(padded,f'control-{label}','ui',size=256,trim=False)
(out/'controls-audit.json').write_text(json.dumps(atlas_audit,ensure_ascii=False,indent=2),encoding='utf-8')
blade=Image.open(find('Folha de poses'))
# The upper dogs extend beyond the nominal half-height. Explicit bounds avoid
# leaking paws into the sleeping pose and preserve the complete silhouettes.
blade_boxes=[(0,.04,.266,.574),(.279,.07,.475,.574),(.482,.06,.725,.574),(.727,.07,1,.574),(0,.587,.278,.945),(.277,.625,.489,.935),(.484,.66,.768,.935),(.756,.555,1,.99)]
for i,(l,t,r,b) in enumerate(blade_boxes):
    save(blade.crop((round(l*blade.width),round(t*blade.height),round(r*blade.width),round(b*blade.height))),f'blade-{i}','blade',size=400)
book_audit=[]
for prefix,offset in [('Coleção de Livros Icônicos',0),('Coleção de Livros Ilustrados',5)]:
    im=Image.open(find(prefix))
    objects,details=extract_tiles(im,columns=5,rows=2,square=False)
    for i,crop in enumerate(objects):
        label='cover' if i<5 else 'spine'
        if label=='spine': crop=crop.transpose(Image.Transpose.ROTATE_90)
        name=f'book-{offset+i%5+1}-{label}'
        save(crop,name,'book',size=650,trim=False)
        book_audit.append(dict(name=name,source=find(prefix).name,**details[i]))
(out/'book-audit.json').write_text(json.dumps(book_audit,ensure_ascii=False,indent=2),encoding='utf-8')
library=Image.open(find('Evolução de um cantinho'))
rooms=[]
for state in range(4):
    x=state%2;y=state//2
    rooms.append(library.crop((x*512+8,y*768+6,(x+1)*512-8,(y+1)*768-6)))
empty=rooms[0]
for state,room in enumerate(rooms):
    if state:
        # Same atlas, empty floor and foreground table; no baked-in dog before arrival.
        mask=Image.new('L',room.size,0);d=ImageDraw.Draw(mask);top=round(room.height*.59)
        d.rectangle((0,top+16,room.width,room.height),fill=255)
        for row in range(16):d.line((0,top+row,room.width,top+row),fill=round(row/15*255))
        room=Image.composite(empty,room,mask)
    save(room,f'library-{state}','library',size=1000)
# Restore the original foreground over Blade, so he stays behind the table.
foreground=empty.convert('RGBA');mask=Image.new('L',empty.size,0);d=ImageDraw.Draw(mask)
d.polygon([(0,round(empty.height*.775)),(round(empty.width*.38),round(empty.height*.78)),(round(empty.width*.60),round(empty.height*.81)),(round(empty.width*.72),round(empty.height*.86)),(round(empty.width*.72),empty.height),(0,empty.height)],fill=255)
foreground.putalpha(mask);save(foreground,'library-foreground','library',size=1000,trim=False)
official=find('Retrato de Família com Cachorro Fofinho')
save(Image.open(official),'family','family',size=1448,quality=95)
# Remove only neutral backdrop connected to the outside of the existing frame.
# The gold/wooden frame forms a barrier; the photograph and faces are untouched.
family=Image.open(official).convert('RGBA');w,h=family.size;pixels=family.load();seen=bytearray(w*h);queue=[]
def neutral(x,y):
    r,g,b,_=pixels[x,y];return max(r,g,b)-min(r,g,b)<22 and min(r,g,b)>65
for x,y in [(x,y) for x in range(w) for y in (0,h-1)]+[(x,y) for y in range(h) for x in (0,w-1)]:
    i=y*w+x
    if not seen[i] and neutral(x,y):seen[i]=1;queue.append(i)
cursor=0
while cursor<len(queue):
    i=queue[cursor];cursor+=1;y,x=divmod(i,w)
    for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
        if 0<=nx<w and 0<=ny<h:
            j=ny*w+nx
            if not seen[j] and neutral(nx,ny):seen[j]=1;queue.append(j)
alpha=Image.frombytes('L',family.size,bytes(0 if v else 255 for v in seen));family.putalpha(alpha)
save(family,'family-object','family',size=1448,quality=95)
logo=Image.open(find('Logo')); save(logo.crop((0,0,1448,640)),'logo','identity',size=800)
# iOS paints transparent icon pixels white. Flatten the existing floral mark on
# the library green, preserving its own gold frame while filling the whole tile.
icon=logo.crop((970,665,1448,1086)).convert('RGBA')
box=icon.getchannel('A').getbbox()
if box: icon=icon.crop(box)
icon=ImageOps.contain(icon,(488,488),Image.Resampling.LANCZOS)
tile=Image.new('RGB',(512,512),'#194b37')
tile.paste(icon,((512-icon.width)//2,(512-icon.height)//2),icon)
for size in [192,512]: tile.resize((size,size),Image.Resampling.LANCZOS).save(out/f'icon-{size}.png')
manifest=list({a['name']:a for a in manifest}.values())
for entry in manifest:
    if entry['category']=='family':entry['source']=official.name
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
(root/'asset-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'{len(manifest)} assets preparados; originais preservados.')
if (root/'source-assets/campaign-evolution/originals.json').exists():
    import subprocess,sys
    subprocess.run([sys.executable,str(root/'scripts/prepare_campaign_assets.py')],check=True)
    subprocess.run([sys.executable,str(root/'scripts/prepare_shelf_depth.py')],check=True)
# Keep the approved chow-chow pigmentation when assets are regenerated locally.
from correct_blade_tongue import correct_assets
correct_assets(use_current=True)
