"""Extract atlas objects by alpha ownership rather than nominal grid cuts.

Only the alpha channel determines membership: black fur and black objects are
never removed. Each source pixel belongs to at most one sprite. Opaque cores
seed a simultaneous expansion to preserve antialiasing and nearby soft edges.
"""
from array import array
from collections import deque
from PIL import Image


def extract_tiles(image, columns=6, rows=5, square=True, regions=None):
    image = image.convert('RGBA')
    width, height = image.size
    alpha = image.getchannel('A').tobytes()
    seen = bytearray(len(alpha))
    components = []

    def neighbors(index):
        y, x = divmod(index, width)
        if x: yield index - 1
        if x + 1 < width: yield index + 1
        if y: yield index - width
        if y + 1 < height: yield index + width

    for start, value in enumerate(alpha):
        if value < 96 or seen[start]:
            continue
        seen[start] = 1
        pixels = [start]
        cursor = 0
        while cursor < len(pixels):
            index = pixels[cursor]
            cursor += 1
            for neighbor in neighbors(index):
                if not seen[neighbor] and alpha[neighbor] >= 96:
                    seen[neighbor] = 1
                    pixels.append(neighbor)
        if len(pixels) >= 20:
            xs = [p % width for p in pixels]
            ys = [p // width for p in pixels]
            components.append({'pixels': pixels, 'box': (min(xs), min(ys), max(xs)+1, max(ys)+1)})

    if regions:
        # Effects have disconnected bright petals and uneven logical cells.
        # Explicit semantic regions group entire components before alpha growth.
        grouped=[[] for _ in regions]
        for component in components:
            l,t,r,b=component['box'];cx=(l+r)/2;cy=(t+b)/2
            def score(box):
                x1,y1,x2,y2=box
                return ((cx-(x1+x2)/2)/(x2-x1))**2+((cy-(y1+y2)/2)/(y2-y1))**2
            grouped[min(range(len(regions)),key=lambda i:score(regions[i]))].extend(component['pixels'])
        ordered=[]
        for pixels in grouped:
            if not pixels:raise ValueError('Empty semantic atlas region')
            xs=[p%width for p in pixels];ys=[p//width for p in pixels]
            ordered.append({'pixels':pixels,'box':(min(xs),min(ys),max(xs)+1,max(ys)+1)})
        components=[]
    main = [c for c in components if len(c['pixels']) > 1500]
    expected = columns * rows
    if not regions and len(main) != expected:
        raise ValueError(f'Expected {expected} separate silhouettes; found {len(main)}. Inspect the atlas before regenerating.')
    # Row order is semantic: six icons per theme, five themes per atlas.
    if not regions:
        main.sort(key=lambda c: (c['box'][1] + c['box'][3]) / 2)
        ordered = []
        for row in range(rows):
            ordered.extend(sorted(main[row*columns:(row+1)*columns], key=lambda c: c['box'][0]+c['box'][2]))

    owners = array('h', [0]) * len(alpha)
    distance = bytearray(len(alpha))
    for owner, component in enumerate(ordered, 1):
        for index in component['pixels']:
            owners[index] = owner

    # Detached details such as a wave's bubbles stay with their nearest object.
    for component in components:
        if len(component['pixels']) > 1500:
            continue
        left, top, right, bottom = component['box']
        def gap(other):
            l, t, r, b = other['box']
            return max(l-right, left-r, 0)**2 + max(t-bottom, top-b, 0)**2
        nearest = min(range(expected), key=lambda i: gap(ordered[i]))
        if gap(ordered[nearest]) <= 12**2:
            for index in component['pixels']:
                owners[index] = nearest+1

    frontier = deque(index for index, owner in enumerate(owners)
                     if owner and any(not owners[n] for n in neighbors(index)))
    while frontier:
        index = frontier.popleft()
        if distance[index] >= 12:
            continue
        for neighbor in neighbors(index):
            if not owners[neighbor]:
                owners[neighbor] = owners[index]
                distance[neighbor] = distance[index]+1
                frontier.append(neighbor)

    result = []
    report = []
    for owner, component in enumerate(ordered, 1):
        l, t, r, b = component['box']
        l, t, r, b = max(0, l-26), max(0, t-26), min(width, r+26), min(height, b+26)
        crop = image.crop((l, t, r, b))
        mask = bytes(alpha[y*width+x] if owners[y*width+x] == owner else 0
                     for y in range(t, b) for x in range(l, r))
        crop.putalpha(Image.frombytes('L', crop.size, mask))
        bounds = crop.getchannel('A').getbbox()
        if not bounds:
            raise ValueError(f'Empty icon {owner}')
        crop = crop.crop(bounds)
        crop.thumbnail((140, 140) if square else (650,650), Image.Resampling.LANCZOS)
        # Resampling can round a very faint outer pixel to zero on one side.
        # Re-measure at the final resolution before applying symmetric padding.
        crop = crop.crop(crop.getchannel('A').getbbox())
        size = (160,160) if square else (crop.width+8,crop.height+8)
        centered = Image.new('RGBA', size)
        centered.paste(crop, ((size[0]-crop.width)//2, (size[1]-crop.height)//2))
        result.append(centered)
        report.append({'index': owner-1, 'coreBox': component['box'], 'outputSize': centered.size,
                       'alphaBox': centered.getchannel('A').getbbox(), 'corePixels': len(component['pixels'])})
    return result, report
