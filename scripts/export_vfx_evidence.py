"""Extract actual recorded frames without interrupting gameplay's RAF."""
from pathlib import Path
from PIL import Image, ImageDraw
import json, subprocess, re, math, sys

root = Path(__file__).resolve().parents[1]
out = root / 'test-results/native-vfx'
report = json.loads((root/'test-results/vfx-native-chromium-report.json').read_text())
ffmpeg = Path.home()/'AppData/Local/ms-playwright/ffmpeg-1011/ffmpeg-win64.exe'
video = root/'test-results/vfx-native-chromium.webm'
modes=set(sys.argv[1:] or ['row','column','area','combined','color','5'])
exports=json.loads((out/'exports.json').read_text()) if (out/'exports.json').exists() else []
exports=[entry for entry in exports if entry['mode'] not in modes]
for entry in report['results']:
    if entry['mode'] not in modes: continue
    mode=entry['mode']; wave=entry['waveAtMs']/1000
    # Screencast and wall clock have independent origins; include generous lead-in.
    start=max(0,wave-1.1)
    prefix=out/f'video-{mode}'
    subprocess.run([str(ffmpeg),'-hide_banner','-loglevel','error','-ss',str(start),'-i',str(video),'-t','1.5','-c:v','png','-y',str(prefix)+'-%03d.png'],check=True)
    box=entry['boardBounds']; crop=(int(box['x']),int(box['y']),math.ceil(box['x']+box['width']),math.ceil(box['y']+box['height']))
    frames=[Image.open(p).convert('RGB').crop(crop) for p in sorted(out.glob(f'video-{mode}-*.png'))]
    assert len(frames)>20
    frames[0].save(out/f'{mode}-motion.gif',save_all=True,append_images=frames[1:],duration=40,loop=0,optimize=False)
    width,height=frames[0].size
    contact=Image.new('RGB',(width*4,(height+25)*2),'#19392d'); draw=ImageDraw.Draw(contact)
    indices=[0,5,10,15,20,25,30,35]
    for i,n in enumerate(indices):
        n=min(n,len(frames)-1); x=(i%4)*width; y=(i//4)*(height+25)
        contact.paste(frames[n],(x,y+25)); draw.text((x+8,y+7),f'video +{n*40} ms',fill='white')
    contact.save(out/f'{mode}-sequence.jpg',quality=90)
    exports.append(dict(mode=mode,frames=len(frames),fps=25,gif=str(out/f'{mode}-motion.gif'),videoStartSeconds=start,timing='Approximate wall-clock alignment; frames extracted from the original continuous video, not reconstructed.'))
(out/'exports.json').write_text(json.dumps(exports,indent=2),encoding='utf-8')
print(json.dumps(exports))
