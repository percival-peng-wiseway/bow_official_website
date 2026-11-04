"""Check generated links, anchors, image alternatives, route structure and source attribution."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import json,csv,sys,re
ROOT=Path(__file__).resolve().parents[1];DIST=ROOT/'dist'
class Page(HTMLParser):
 def __init__(self,path):super().__init__();self.path=path;self.ids=set();self.refs=[];self.images=[];self.h1=0;self.errors=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if a.get('id'):
   if a['id'] in self.ids:self.errors.append('duplicate ID '+a['id'])
   self.ids.add(a['id'])
  if tag=='h1':self.h1+=1
  for key in ['href','src','poster']:
   if a.get(key):self.refs.append(a[key])
  if a.get('srcset'):
   self.refs.extend(part.strip().split()[0] for part in a['srcset'].split(',') if part.strip())
  if tag=='img':
   if 'alt' not in a:self.errors.append('image without alt')
   self.images.append(a.get('src',''))
parsed={};errors=[];references=0;used={}
for path in DIST.rglob('*.html'):
 parser=Page(path);parser.feed(path.read_text());parsed[path.resolve()]=parser
for path,page in parsed.items():
 route='/'+str(path.relative_to(DIST.resolve())).removesuffix('index.html')
 if 'melbourne-modular' not in str(path) and page.h1!=1:errors.append(f'{route}: {page.h1} H1 headings')
 errors.extend(f'{route}: {e}' for e in page.errors)
 for ref in page.refs:
  u=urlsplit(ref)
  if u.scheme or u.netloc:continue
  name=unquote(u.path)
  if name.startswith('/bow_official_website/'):name=name[len('/bow_official_website'):]
  target=(DIST/name.lstrip('/')).resolve() if name.startswith('/') else (path.parent/name).resolve()
  if not name:target=path
  if target.is_dir():target=target/'index.html'
  references+=1
  if not target.exists():errors.append(f'{route}: missing {ref}');continue
  if u.fragment and target.suffix=='.html' and u.fragment not in parsed.get(target,page).ids:errors.append(f'{route}: bad anchor {ref}')
 for ref in page.images:used.setdefault(Path(urlsplit(ref).path).name,set()).add(route)
 banned=['Our impact','EnergyQLD','Open email draft','Estimating Director · Queensland','data-menu-group','search-dialog','>Explore BOW<']
 html=path.read_text()
 for text in banned:
  if text in html:errors.append(f'{route}: obsolete UI {text}')
 for ref in page.images:
  if re.search(r'review-F\d',ref):errors.append(f'{route}: unapproved KPA image {ref}')
inventory=json.loads((ROOT/'docs/review-pack-inventory.json').read_text());records=[]
by_id={r['id']:r for r in inventory}
for name,routes in sorted(used.items()):
 if name.startswith('review-'):
  ident=name.split('.')[0].split('-')[1];record=by_id[ident];source=record['source'];kind='Review Pack '+ident;rights=record['rights']
 else:
  kind='Existing supplied asset'
  if name in ['logo-lockup.png','brand-mark.png'] or name in [p+'.webp' for p in ['andrew-robb','jason-ohara','joe-brinzi','steve-wang','hassan-kassem','nidhi-pandey','bryce-kemp','mahitha-cherukuvada','mt-miller','gladstone']]:source='BOW Projects company profile / retained supplied site asset'
  else:source='BOW Structures company profile / retained supplied site asset'
  rights='Original photographer and usage permission to be confirmed by BOW; local review only'
 records.append({'website_asset':name,'source_type':kind,'supplied_source':source,'used_on':' | '.join(sorted(routes)),'rights_status':rights})
for record in inventory:
 name='review-'+record['id']+'.webp';record['used_on']=sorted(used.get(name,set()));record['used']=bool(record['used_on'])
(ROOT/'docs/review-pack-inventory.json').write_text(json.dumps(inventory,indent=2)+'\n')
with (ROOT/'docs/image-source-register.csv').open('w',newline='') as f:
 writer=csv.DictWriter(f,fieldnames=['website_asset','source_type','supplied_source','used_on','rights_status']);writer.writeheader();writer.writerows(records)
summary={'html_documents':len(parsed),'references_checked':references,'referenced_image_assets':len(used),'review_pack_images_used':sum(r['used'] for r in inventory),'errors':errors}
(ROOT/'output').mkdir(exist_ok=True);(ROOT/'output/site-audit.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary,indent=2));sys.exit(bool(errors))
