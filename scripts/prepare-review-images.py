"""Optimise selected source images and record all Review Pack files without changing originals."""
from pathlib import Path
from PIL import Image,ImageOps
import json,hashlib
ROOT=Path(__file__).resolve().parents[1]
PACK=ROOT.parent/'BOW Website - Image Selection v1 - Review Pack'
SELECTED={'A05','A07','A10','A11','A12','B01','B02','B03','B04','B05','B06','B07','C01','C09','D02','D03','D04','D05','D06','D08','D15','D16'}
records=[]
for source in sorted(PACK.rglob('*')):
 if source.suffix.lower() not in {'.jpg','.jpeg','.png','.mp4'}:continue
 ident=source.name.split('_')[0]
 item={'id':ident,'source':str(source.relative_to(ROOT.parent)),'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'rights':'Not documented in pack; BOW to confirm before public release','used':ident in SELECTED,'outputs':[]}
 if source.suffix.lower()!='.mp4':
  im=ImageOps.exif_transpose(Image.open(source)).convert('RGB');item['original_dimensions']=im.size
  if ident in SELECTED:
   for width in (600,1600):
    copy=im.copy();copy.thumbnail((width,width*3),Image.Resampling.LANCZOS)
    name=f'review-{ident}'+('-600' if width==600 else '')+'.webp'
    out=ROOT/'dist/assets'/name;copy.save(out,'WEBP',quality=83,method=6)
    item['outputs'].append({'file':'assets/'+name,'width':copy.width,'height':copy.height,'bytes':out.stat().st_size})
 if ident.startswith('F'):item['rights']='KPA: rights explicitly to confirm; excluded from website output'
 records.append(item)
(ROOT/'docs/review-pack-inventory.json').write_text(json.dumps(records,indent=2)+'\n')
print(f'{len(records)} source images; {len(SELECTED)} optimised selections; four referenced videos not supplied.')
