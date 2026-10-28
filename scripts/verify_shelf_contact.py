"""QA only: independently measure source bases, then annotate browser screenshots.

Run once before tests/shelf-contact.ts; run again after browser captures.
No public asset or player storage is changed.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
folder = root / 'test-results/shelf-contact'
folder.mkdir(parents=True, exist_ok=True)
bases = {}
for book in range(1, 11):
    image = Image.open(root / f'public/assets/book-{book}-spine.webp').convert('RGBA')
    alpha = np.asarray(image.getchannel('A'))
    l, t, r, b = image.getchannel('A').getbbox()
    feet = []
    for x in range(l + round((r-l)*.2), l + round((r-l)*.8)):
        ys = np.flatnonzero(alpha[:, x] >= 200)
        if len(ys):
            feet.append((x+.5, float(ys[-1]+1)))
    y = float(np.percentile([y for x, y in feet], 90))
    x = float(np.median([x for x, foot in feet if foot >= y-1]))
    bases[book] = dict(x=x, y=y, width=image.width, height=image.height,
                       left=l, top=t, artWidth=r-l, artHeight=b-t)
(folder / 'visible-bases.json').write_text(json.dumps(bases, indent=2))

for engine in ['chromium', 'webkit']:
    report = folder / f'after-{engine}.json'
    if not report.exists():
        continue
    after = json.loads(report.read_text())['results']
    before_file = folder / f'before-{engine}.json'
    before = json.loads(before_file.read_text())['results'] if before_file.exists() else []
    for count in [0, 1, 4, 5, 6, 9, 10]:
        for width in [375, 390, 430]:
            record = next(r for r in after if r['count'] == count and r['width'] == width)
            room = record['room']
            box = tuple(round(v) for v in [
                room['x']+235/496*room['width'], room['y']+125/756*room['height'],
                room['x']+456/496*room['width'], room['y']+210/756*room['height']])
            def enlarged(r):
                return Image.open(folder / (r['label']+'.png')).convert('RGB').crop(box).resize(
                    ((box[2]-box[0])*4, (box[3]-box[1])*4), Image.Resampling.LANCZOS)
            raw = enlarged(record)
            annotated = raw.copy()
            draw = ImageDraw.Draw(annotated)
            def at(p):
                return ((p['x']-box[0])*4, (p['y']-box[1])*4)
            draw.line([at(p) for p in record['floor']], fill='#57f5dd', width=2)
            for slot in record['slots']:
                x, y = at(slot['base'])
                draw.ellipse((x-3, y-3, x+3, y+3), fill='#ff4a72')
                draw.text((x-4, y-20), str(slot['id']), fill='white', stroke_width=1, stroke_fill='black')
            annotated.save(folder / f'diagnostic-{engine}-{count}-{width}.png')
            previous = next((r for r in before if r['count'] == count and r['width'] == width), None)
            panels = [('Antes', enlarged(previous))] if previous else []
            panels += [('Depois', raw), ('QA: superficie turquesa / bases rosas (ID do livro)', annotated)]
            comparison = Image.new('RGB', (raw.width, (raw.height+24)*len(panels)), '#f6edda')
            for i, (label, panel) in enumerate(panels):
                y = i*(raw.height+24)
                ImageDraw.Draw(comparison).text((8, y+5), label, fill='black')
                comparison.paste(panel, (0, y+24))
            comparison.save(folder / f'comparison-{engine}-{count}-{width}.png')
print('Independent visible-base metrics and available QA comparisons generated.')
