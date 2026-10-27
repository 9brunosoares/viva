"""Local asset integrity checks; no network or image generation."""
from pathlib import Path
from PIL import Image
import numpy as np
import json, hashlib, subprocess
root=Path(__file__).resolve().parents[1]
assets=root/'public/assets'; source=root/'source-assets/campaign-evolution'
inventory=json.loads((source/'originals.json').read_text())
for entry in inventory:
    raw=(source/entry['file']).read_bytes()
    assert hashlib.sha256(raw).hexdigest()==entry['sha256']
    assert list(Image.open(source/entry['file']).size)==entry['size']
metadata=json.loads((assets/'tattoos/sprites.json').read_text())
assert len(metadata['sprites'])==20 and len(metadata['active'])==7
for name,item in metadata['sprites'].items():
    image=np.asarray(Image.open(assets/item['file']).convert('RGBA'))
    assert image.shape==(160,160,4)
    alpha=image[:,:,3]
    assert alpha.max()==255 and not np.any(np.concatenate([alpha[0],alpha[-1],alpha[:,0],alpha[:,-1]]))
square=np.asarray(Image.open(assets/'tattoos/outline-square.webp').convert('RGBA'))
assert square[80,80,3]==0 and square[:,:,3].max()==255
white={}
for name in ['warrior','coffee','books']:
    image=np.asarray(Image.open(assets/f'tattoos/{name}.webp').convert('RGBA'))
    # Book page edges are warm beige, whereas the cup/clothes are near white.
    threshold=160 if name=='books' else 210
    white[name]=int(((image[:,:,:3].min(2)>threshold)&(image[:,:,3]>245)).sum())
    assert white[name]>30, f'{name}: protected light artwork disappeared'
scene=Image.open(assets/'scenes/tattoo-studio.webp');assert scene.size==(719,1280)
for stage in range(4):
    room=np.asarray(Image.open(assets/f'library-{stage}.webp').convert('RGB'))
    lip=np.asarray(Image.open(assets/f'library-shelf-depth-{stage}.webp').convert('RGBA'))
    assert np.array_equal(lip[:,:,:3][lip[:,:,3]>0],room[lip[:,:,3]>0])
sheet=np.asarray(Image.open(assets/'vfx/sequences.webp').convert('RGBA'))
assert sheet.shape==(1536,1536,4)
for i in range(58):
    y,x=divmod(i,8); a=sheet[y*192:(y+1)*192,x*192:(x+1)*192,3]
    assert not np.any(np.concatenate([a[0],a[-1],a[:,0],a[:,-1]])), f'frame {i}: unsafe border'
protected=[f'public/assets/library-{i}.webp' for i in range(4)]
protected += [str(p.relative_to(root)).replace('\\','/') for p in assets.glob('book-*.webp')]
protected += ['src/audio.ts','src/narrative.ts']
subprocess.run(['git','diff','--exit-code','viva-pre-campaign-evolution-20261027','--',*protected],cwd=root,check=True,stdout=subprocess.PIPE)
report=dict(originalsVerified=len(inventory),individualSprites=20,activeTattooKinds=7,whiteArtworkPixels=white,emptySquare=True,proportionalScene=True,originalWoodOcclusion=True,safeAtlasBorders=58,protectedFilesUnchanged=len(protected))
(root/'test-results/campaign-assets-report.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
