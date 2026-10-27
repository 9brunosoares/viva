"""Re-cut the supplied art: full floral silhouettes, real late frames, no circular matte.

The printed numbers aren't reliable. Ordered rectangles below follow the artwork,
not the labels. Coordinates are explicitly curated in original pixels.
"""
from pathlib import Path
import json, math
from collections import deque
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

root=Path(__file__).resolve().parents[1]
source=root/'source-assets/campaign-evolution'
out=root/'public/assets/vfx';out.mkdir(exist_ok=True)
cell,columns=192,8

def row(file,xs,top,bottom):
    return [dict(source=file,rect=[a,top,b,bottom]) for a,b in zip(xs,xs[1:])]

cuts={
 'match3':row('vfx-01.png',[4,91,188,287,401,526,658,839,990],39,180),
 'match4':row('vfx-02.png',[979,1062,1180,1303,1434,1582,1757,1940],46,175),
 'color':row('vfx-03.png',[5,90,197,313,440,576,724,866,1021],414,548),
 'area':row('vfx-03.png',[5,84,168,262,359,464,574,718,910,1021],614,731),
 'horizontal':row('vfx-02.png',[651,724,799,877,965,1051,1131,1210,1297],660,776),
 'vertical':row('vfx-02.png',[1310,1382,1460,1538,1617,1694,1769,1848,1936],660,780),
 'areaBirth':row('vfx-01.png',[4,95,202,315,435,560,709,855,990],244,410),
 'cross':row('vfx-01.png',[4,91,192,308,430,575,718,865,990],477,684),
 'colorBirth':row('vfx-01.png',[1003,1115,1230,1354,1494,1653,1818,2014],468,684),
 'petal':[dict(source='vfx-01.png',rect=[857,63,985,177],isolate='pink')],
 'leaf':[dict(source='vfx-01.png',rect=[848,32,919,77],isolate='green')],
 'spark':[dict(source='vfx-01.png',rect=[27,89,70,135])],
}
anchors={
 'match3':[(48,111),(140,111),(238,111),(347,111),(460,112),(585,112),(744,111),(915,111)],
 'match4':[(1008,111),(1117,111),(1245,111),(1360,111),(1506,111),(1662,111),(1852,111)],
 'color':[(46,481),(140,481),(252,481),(376,481),(507,481),(649,481),(801,481),(933,481)],
 'area':[(47,666),(125,666),(213,666),(309,666),(410,666),(518,666),(638,666),(834,666),(965,666)],
 'cross':[(40,573),(144,573),(246,573),(369,573),(509,573),(648,573),(797,573),(929,573)],
 'areaBirth':[(50,332),(149,332),(259,332),(371,332),(495,332),(629,332),(777,332),(925,332)],
 'colorBirth':[(1062,591),(1171,591),(1290,591),(1420,591),(1570,591),(1738,591),(1898,591)],
}
for name,points in anchors.items():
    for frame,point in zip(cuts[name],points):frame['anchor']=point
images={p.name:Image.open(p).convert('RGB') for p in source.glob('vfx-*.png')}

def dark_seam(rgb, nominal, top, bottom):
    """Follow dark valleys between adjacent blooms rather than hard vertical cuts."""
    lo=max(0,nominal-20);hi=min(rgb.shape[1],nominal+21)
    intensity=rgb[top:bottom,lo:hi].max(2)/255
    cost=intensity**2*6+((np.arange(lo,hi)-nominal)/21)**2*.12
    total=cost[0].copy();parents=[]
    for y in range(1,len(cost)):
        shifted=np.stack([np.r_[np.inf,total[:-1]],total,np.r_[total[1:],np.inf]])
        p=shifted.argmin(0);parents.append(p-1)
        total=cost[y]+shifted.min(0)
    x=int(total.argmin());path=[x]
    for p in reversed(parents):x+=int(p[x]);path.append(x)
    return np.asarray(path[::-1])+lo

def isolate_color(rgb, kind):
    r,g,b=rgb.transpose(2,0,1)
    mask=((r>g*1.35)&(b>g*1.12)&(r>110)) if kind=='pink' else ((g>r*.9)&(g>b*1.7)&(g>65))
    seen=np.zeros(mask.shape,bool);components=[]
    for y,x in zip(*np.nonzero(mask)):
        if seen[y,x]:continue
        q=deque([(x,y)]);seen[y,x]=True;points=[]
        while q:
            a,c=q.popleft();points.append((a,c))
            for u,v in [(a-1,c),(a+1,c),(a,c-1),(a,c+1)]:
                if 0<=u<mask.shape[1] and 0<=v<mask.shape[0] and mask[v,u] and not seen[v,u]:seen[v,u]=True;q.append((u,v))
        components.append(points)
    selected=Image.new('L',(mask.shape[1],mask.shape[0]));d=ImageDraw.Draw(selected)
    for point in max(components,key=len):d.point(point,fill=255)
    return np.asarray(selected.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(.7)))/255
all_frames=[];metadata={};runtime={}
for name,frames in cuts.items():
    extracted=[]
    full=np.asarray(images[frames[0]['source']]).astype(float)
    top,bottom=frames[0]['rect'][1::2]
    seams={f['rect'][2]:dark_seam(full,f['rect'][2],top,bottom) for f in frames[:-1]}
    for frame in frames:
        nominal_left,top,nominal_right,bottom=frame['rect']
        left=seams.get(nominal_left,np.full(bottom-top,nominal_left));right=seams.get(nominal_right,np.full(bottom-top,nominal_right))
        x1=max(0,int(left.min())-1);x2=min(full.shape[1],int(right.max())+2)
        rgb=full[top:bottom,x1:x2].copy()
        intensity=rgb.max(2)
        # Recover the saturated art from black; bright petals remain opaque enough
        # to read on cream tiles. Only a narrow ownership seam is feathered.
        raw=np.clip((intensity-7)/248,0,1)
        alpha=np.clip((intensity-15)/160,0,1)**1.1
        yy,xx=np.indices(alpha.shape)
        horizontal=np.minimum(xx+x1-left[:,None],right[:,None]-(xx+x1))
        edge=np.minimum(yy,alpha.shape[0]-1-yy)
        alpha*=np.clip(horizontal/8,0,1)*np.clip(edge/9,0,1)
        if 'isolate' in frame:alpha*=isolate_color(rgb,frame['isolate'])
        color=np.clip(rgb/np.maximum(raw[:,:,None],.025),0,255).astype('uint8')
        # Stable core anchor: later blooms must grow around the same point.
        ax,ay=frame.get('anchor',((nominal_left+nominal_right)/2,(top+bottom)/2))
        frame['anchor']=[ax,ay]
        frame['sampleRect']=[x1,top,x2,bottom]
        extracted.append((Image.fromarray(np.dstack((color,(alpha*255).astype('uint8')))),(ax-x1,ay-top)))
    half=math.ceil(max(max(ax,im.width-ax,ay,im.height-ay) for im,(ax,ay) in extracted))+5
    reference=half*2
    records=[];indices=[]
    for record,(im,(ax,ay)) in zip(frames,extracted):
        canvas=Image.new('RGBA',(reference,reference))
        canvas.paste(im,(round(half-ax),round(half-ay)))
        canvas=canvas.resize((cell,cell),Image.Resampling.LANCZOS)
        index=len(all_frames);indices.append(index);all_frames.append(canvas)
        records.append(dict(x=index%columns*cell,y=index//columns*cell,width=cell,height=cell,**record))
    durations=[70 if i<2 else 85 if i==len(frames)-2 else 65 if i==len(frames)-1 else 55 for i in range(len(frames))]
    metadata[name]=dict(frames=records,durations=durations,reference=reference,
                        role='particle' if name in ['petal','leaf','spark'] else 'temporal')
    runtime[name]=dict(frames=indices,durations=durations)
sheet=Image.new('RGBA',(cell*columns,cell*math.ceil(len(all_frames)/columns)))
for i,im in enumerate(all_frames):sheet.paste(im,(i%columns*cell,i//columns*cell))
sheet.save(out/'sequences.webp','WEBP',quality=95,method=6)
metadata=dict(file='vfx/sequences.webp',cell=cell,columns=columns,frameCount=len(all_frames),
              matte='black recovery; dark-valley ownership seams; stable core anchors; no radial mask',sequences=metadata)
(out/'sequences.json').write_text(json.dumps(metadata,indent=2),encoding='utf-8')
(source/'vfx-cuts.json').write_text(json.dumps(cuts,indent=2),encoding='utf-8')
(root/'src/vfxAtlas.ts').write_text('// Generated by scripts/prepare_vfx.py. Every source rectangle is in assets/vfx/sequences.json.\nexport const vfxAtlas = '+json.dumps(dict(cell=cell,columns=columns,sequences=runtime))+' as const;\n',encoding='utf-8')
result=root/'test-results';result.mkdir(exist_ok=True)
gallery=Image.new('RGB',(cell*10,(cell+22)*len(cuts)),'#16372d');draw=ImageDraw.Draw(gallery)
for row_index,(name,sequence) in enumerate(runtime.items()):
    for n,index in enumerate(sequence['frames']):
        x=n*cell;y=row_index*(cell+22);gallery.paste(all_frames[index],(x,y+22),all_frames[index]);draw.text((x+5,y+5),f'{name} / {n+1}',fill='white')
gallery.save(result/'vfx-recut-contact.jpg',quality=92)
print(f'{len(all_frames)} frames, {len(cuts)} sequences/particles, full late blooms, {sheet.size}, no radial truncation.')
