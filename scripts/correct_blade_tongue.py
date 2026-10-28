"""Recolor only Blade's hand-reviewed tongue regions; preserve all other pixels.

Default inputs are the archived approved WebPs, making the operation repeatable.
--current applies the same bounded operation after the normal asset extraction.
No geometry, alpha, CSS or progression data is changed.
"""
import argparse
import io
import json
import os
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source-assets/blade-tongue"
REGIONS = json.loads((SOURCE / "regions.json").read_text(encoding="utf-8"))
POSE_BOXES = [(0,.04,.266,.574),(.279,.07,.475,.574),(.482,.06,.725,.574),
              (.727,.07,1,.574),(0,.587,.278,.945),(.277,.625,.489,.935),
              (.484,.66,.768,.935),(.756,.555,1,.99)]


def recolor(image, polygons):
    original = np.array(image.convert("RGBA"))
    rgb = original[..., :3].astype(float)
    r, g, b = rgb.transpose(2, 0, 1)
    mask = Image.new("L", (image.width * 8, image.height * 8))
    bounds = Image.new("L", image.size)
    draw = ImageDraw.Draw(mask)
    for polygon in polygons:
        draw.polygon([(round(x*8), round(y*8)) for x,y in polygon], fill=255)
        ImageDraw.Draw(bounds).polygon(polygon, fill=255)
    mask = np.asarray(mask.resize(image.size, Image.Resampling.LANCZOS)) / 255.
    mask *= np.asarray(bounds) > 0
    # Chroma gating preserves teeth/specular whites and the surrounding brown fur.
    weight = mask * np.clip((r-b-3)/10, 0, 1) * np.clip((r-g-6)/10, 0, 1)
    weight *= original[..., 3] > 0
    luminance = rgb @ np.array([.2126, .7152, .0722])
    shine = np.clip((luminance-120)/130, 0, 1)
    # Muted blue-violet pigment. Original luminance carries grooves, wet highlights
    # and every local shadow; brighter reflections become less saturated.
    tint = np.array([.67,.66,.96]) + shine[...,None]*np.array([.13,.14,.03])
    target = luminance[...,None] * tint
    output = original.copy()
    output[..., :3] = np.rint(rgb*(1-weight[...,None])+target*weight[...,None]).clip(0,255).astype("uint8")
    return Image.fromarray(output), weight


def correct_assets(use_current=False):
    audit = []
    for entry in REGIONS["assets"]:
        destination = ROOT / "public/assets" / (entry["name"] + ".webp")
        source = destination if use_current else SOURCE / "originals" / destination.name
        original = Image.open(source).convert("RGBA")
        assert list(original.size) == entry["size"], f"Review mask geometry: {source}"
        corrected, weight = recolor(original, [entry["polygon"]])
        encoded = io.BytesIO()
        corrected.save(encoded, "WEBP", lossless=True, exact=True, method=6)
        temporary = destination.with_suffix(".webp.tmp")
        temporary.write_bytes(encoded.getvalue())
        os.replace(temporary, destination)
        decoded = np.asarray(Image.open(destination).convert("RGBA"))
        before = np.asarray(original)
        changed = np.any(decoded != before, axis=2)
        assert np.array_equal(decoded[...,3], before[...,3])
        assert not np.any(changed & (weight == 0)), destination
        audit.append({"name":entry["name"],"changedPixels":int(changed.sum()),
                      "outsideMaskChanges":0,"alphaIdentical":True,"size":entry["size"]})
    return audit


def correct_atlas():
    original = Image.open(SOURCE / "poses-original.png").convert("RGBA")
    polygons=[]
    for entry in REGIONS["assets"]:
        if not entry["name"].startswith("blade-"): continue
        i=int(entry["name"].split("-")[1])
        l,t,r,b=POSE_BOXES[i]
        box=(round(l*original.width),round(t*original.height),round(r*original.width),round(b*original.height))
        crop=original.crop(box)
        trim=crop.getchannel("A").getbbox()
        assert trim
        polygons.append([(box[0]+trim[0]+x*(trim[2]-trim[0])/entry["size"][0],
                          box[1]+trim[1]+y*(trim[3]-trim[1])/entry["size"][1])
                         for x,y in entry["polygon"]])
    corrected,weight=recolor(original,polygons)
    corrected.save(SOURCE / "poses-corrected.png")
    assert np.array_equal(np.asarray(original)[weight==0],np.asarray(corrected)[weight==0])


if __name__ == "__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--current",action="store_true")
    args=parser.parse_args()
    audit=correct_assets(args.current)
    correct_atlas()
    folder=ROOT/"test-results/blade-tongue"
    folder.mkdir(parents=True,exist_ok=True)
    (folder/"pixel-audit.json").write_text(json.dumps(audit,indent=2),encoding="utf-8")
    print(json.dumps(audit))
