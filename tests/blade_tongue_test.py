"""Pixel-level checks against the archived, approved artwork (Pillow + NumPy)."""
import hashlib
import json
import sys
import unittest
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from correct_blade_tongue import REGIONS, SOURCE, recolor, POSE_BOXES


class BladeTongueTests(unittest.TestCase):
    def test_nine_assets_keep_geometry_alpha_and_every_pixel_outside_the_tongue(self):
        for entry in REGIONS['assets']:
            with self.subTest(asset=entry['name']):
                path=SOURCE/'originals'/(entry['name']+'.webp')
                self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(),entry['originalSha256'])
                original=Image.open(path).convert('RGBA')
                result=Image.open(ROOT/'public/assets'/path.name).convert('RGBA')
                self.assertEqual(result.size,original.size)
                a,b=np.asarray(original),np.asarray(result)
                self.assertTrue(np.array_equal(a[:,:,3],b[:,:,3]))
                mask=Image.new('L',original.size)
                ImageDraw.Draw(mask).polygon(entry['polygon'],fill=255)
                self.assertTrue(np.array_equal(a[np.asarray(mask)==0],b[np.asarray(mask)==0]))
                self.assertGreater(np.any(a!=b,axis=2).sum(),0)

    def test_actual_exported_tongues_are_muted_blue_violet_with_shading(self):
        samples={'blade-0':(285,165),'blade-1':(119,159),'blade-2':(121,173),
                 'blade-3':(334,185),'blade-4':(130,145),'blade-7':(190,240),
                 'tile-5-5':(82,105),'family':(720,777),'family-object':(718,731)}
        for entry in REGIONS['assets']:
            with self.subTest(asset=entry['name']):
                original=Image.open(SOURCE/'originals'/(entry['name']+'.webp')).convert('RGBA')
                actual=Image.open(ROOT/'public/assets'/(entry['name']+'.webp')).convert('RGBA')
                r,g,b,_=actual.getpixel(samples[entry['name']])
                self.assertGreater(b,1.2*r)
                self.assertGreater(b,1.2*g)
                self.assertLess((b-min(r,g))/b,.55)
                _,weight=recolor(original,[entry['polygon']])
                core=weight>.999
                self.assertGreater(core.sum(),3)
                old=np.asarray(original)[core,:3]@np.array([.2126,.7152,.0722])
                new=np.asarray(actual)[core,:3]@np.array([.2126,.7152,.0722])
                self.assertGreater(np.corrcoef(old,new)[0,1],.98)

    def test_sleeping_poses_are_byte_identical(self):
        for pose,digest in REGIONS['unchangedPoses'].items():
            path=ROOT/f'public/assets/blade-{pose}.webp'
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(),digest)

    def test_atlas_preserves_size_alpha_and_all_pixels_outside_projected_tongues(self):
        original=Image.open(SOURCE/'poses-original.png').convert('RGBA')
        actual=Image.open(SOURCE/'poses-corrected.png').convert('RGBA')
        self.assertEqual(original.size,actual.size)
        mask=Image.new('L',original.size)
        for entry in REGIONS['assets']:
            if not entry['name'].startswith('blade-'):continue
            l,t,r,b=POSE_BOXES[int(entry['name'].split('-')[1])]
            box=(round(l*original.width),round(t*original.height),round(r*original.width),round(b*original.height))
            trim=original.crop(box).getchannel('A').getbbox()
            polygon=[(box[0]+trim[0]+x*(trim[2]-trim[0])/entry['size'][0],box[1]+trim[1]+y*(trim[3]-trim[1])/entry['size'][1]) for x,y in entry['polygon']]
            ImageDraw.Draw(mask).polygon(polygon,fill=255)
        a,b=np.asarray(original),np.asarray(actual)
        self.assertTrue(np.array_equal(a[:,:,3],b[:,:,3]))
        self.assertTrue(np.array_equal(a[np.asarray(mask)==0],b[np.asarray(mask)==0]))


if __name__=='__main__':unittest.main(verbosity=2)
