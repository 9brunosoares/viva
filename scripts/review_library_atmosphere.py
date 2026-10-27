"""Inspect actual browser frames and make a faithful, normal-speed GIF preview.

Uses Pillow already used by prepare_assets.py. Never edits game artwork.
Run after tests/library-atmosphere.ts and tests/record-library-atmosphere.mjs.
"""
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageStat

root = Path("test-results")


def difference(first, last, box=None):
    with Image.open(first) as a, Image.open(last) as b:
        a, b = a.convert("RGB"), b.convert("RGB")
        if box:
            a, b = a.crop(box), b.crop(box)
        diff = ImageChops.difference(a, b)
        pixels = getattr(diff, "get_flattened_data", diff.getdata)()
        changed = sum(max(pixel) > 3 for pixel in pixels)
        return {"mean_channel_delta": sum(ImageStat.Stat(diff).mean) / 3,
                "pixels_above_3": changed,
                "percent_pixels_above_3": changed * 100 / (diff.width * diff.height),
                "max_channel_delta": max(high for _, high in diff.getextrema())}


report = {"interpretation": "Pixel motion verifies rendering, not a perceptual score or real-device FPS."}
if (root / "ambient-before-0.png").exists():
    report["before_4s"] = difference(root / "ambient-before-0.png", root / "ambient-before-4.png")
for engine in ["chromium", "webkit"]:
    if not (root / f"ambient-{engine}-4s.png").exists():
        continue
    report[engine] = {"after_4s": difference(root / f"ambient-{engine}-0s.png", root / f"ambient-{engine}-4s.png")}
    bounds_path = root / f"ambient-layers-{engine}-bounds.json"
    if not bounds_path.exists():
        continue
    bounds = json.loads(bounds_path.read_text())
    box = (max(0, round(bounds["x"])), round(bounds["y"]),
           min(393, round(bounds["x"] + bounds["width"])), round(bounds["y"] + bounds["height"]))
    layers = {}
    for layer in ["rays", "dust", "light", "reflection"]:
        measured = difference(root / f"ambient-layer-{engine}-none.png", root / f"ambient-layer-{engine}-{layer}.png", box)
        assert measured["pixels_above_3"] > (3 if layer == "dust" else 100), (engine, layer, measured)
        assert measured["max_channel_delta"] > 5, (engine, layer, measured)
        layers[layer] = measured
    report[engine]["isolated_layers_actually_rendered"] = layers
    assert report[engine]["after_4s"]["percent_pixels_above_3"] > 0.15, report[engine]

frames_path = root / "ambient-video/frames.json"
if frames_path.exists():
    captures = json.loads(frames_path.read_text())["frames"]
    images = [Image.open(frame["path"]).convert("RGB") for frame in captures]
    # A single palette prevents per-frame re-quantization from creating false flicker.
    palette = images[0].quantize(colors=256, method=Image.Quantize.MEDIANCUT)
    quantized = [image.quantize(palette=palette, dither=Image.Dither.NONE) for image in images]
    durations = [max(20, captures[i+1]["time"]-frame["time"]) for i, frame in enumerate(captures[:-1])]
    durations.append(durations[-1])
    quantized[0].save(root / "library-atmosphere-preview.gif", save_all=True,
                      append_images=quantized[1:], duration=durations, loop=0, optimize=True)
    detail = [image.crop((0, 140, 393, 610)) for image in images]
    detail_palette = detail[0].quantize(colors=256, method=Image.Quantize.MEDIANCUT)
    detail_frames = [image.quantize(palette=detail_palette, dither=Image.Dither.NONE) for image in detail]
    detail_frames[0].save(root / "library-atmosphere-detail.gif", save_all=True,
                         append_images=detail_frames[1:], duration=durations, loop=0, optimize=True)
    report["preview"] = {"frames": len(images), "duration_ms": sum(durations),
                          "playback": "Actual elapsed time, no acceleration", "full_video": "library-atmosphere.webm"}
    for image in images:
        image.close()

(root / "ambient-pixel-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(report, ensure_ascii=False))
