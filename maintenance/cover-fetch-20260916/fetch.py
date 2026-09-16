import os,sys,json,time,re,pathlib,urllib.request,urllib.parse,concurrent.futures,collections,threading
sys.path.insert(0,os.path.join(os.environ['TEMP'],'codex-mongo-compat'))
from pymongo import MongoClient
from bson import json_util
ROOT=pathlib.Path(__file__).parent
BASE='https://stiletto.ddns.net/MagnoliumApiCore'
c=MongoClient('mongodb://192.168.1.198:27017/?directConnection=true',serverSelectionTimeoutMS=5000)
col=c.dvd_library.disc
docs=list(col.find({}))
(ROOT/'before.json').write_text(json_util.dumps(docs,indent=2),encoding='utf8')
(ROOT/'previous-images').mkdir(exist_ok=True)
(ROOT/'found-images').mkdir(exist_ok=True)
def get(url):
 req=urllib.request.Request(url,headers={'User-Agent':'Magnolium DVD cover maintenance'})
 with urllib.request.urlopen(req,timeout=30) as r:
  data=r.read(25*1024*1024+1)
  if len(data)>25*1024*1024:raise ValueError('Image too large')
  return data,r.headers.get_content_type()
def image_ok(b):return b.startswith(b'\xff\xd8\xff') or b.startswith(b'\x89PNG\r\n\x1a\n') or (b.startswith(b'RIFF') and b[8:12]==b'WEBP')
groups=collections.defaultdict(list);results=[]
for d in docs:
 if d.get('cover_source')=='manual':results.append({'id':str(d['_id']),'status':'manual_preserved'});continue
 code=re.sub(r'\D','',str(d.get('barcode') or ''))
 if len(code) not in (8,12,13,14):results.append({'id':str(d['_id']),'status':'invalid_barcode'});continue
 groups[code].append(d)
lock=threading.Lock();last=0
def run(pair):
 global last
 code,items=pair
 # Back up any existing files that the API may overwrite at barcode-based paths.
 for d in items:
  url=d.get('image_url') or ''
  if url.startswith(BASE+'/api/discs/covers/'):
   try:
    data,ct=get(url)
    if image_ok(data):(ROOT/'previous-images'/str(d['_id'])).write_bytes(data)
   except Exception:pass
 with lock:
  delay=max(0,1-(time.monotonic()-last))
  if delay:time.sleep(delay)
  last=time.monotonic()
 try:
  body,_=get(BASE+'/api/discs/lookup/'+urllib.parse.quote(code));answer=json.loads(body)
  url=answer.get('imageUrl')
  if not url:return [{'id':str(d['_id']),'status':'no_result','barcode':code} for d in items]
  if not url.startswith(BASE+'/api/discs/covers/'):
   return [{'id':str(d['_id']),'status':'not_cached','barcode':code} for d in items]
  data,ct=get(url)
  if not image_ok(data):raise ValueError('Returned cover is not a supported image')
  (ROOT/'found-images'/code).write_bytes(data)
  out=[]
  for d in items:
   clauses=[{'_id':d['_id']}]
   for k in ('barcode','image_url','cover_source'):
    clauses.append({k:{'$exists':k in d}})
    if k in d:clauses.append({k:{'$eq':d[k]}})
   fields={'image_url':url,'cover_source':answer.get('coverSource') or 'lookup-cached'}
   r=col.update_one({'$and':clauses},{'$set':fields})
   out.append({'id':str(d['_id']),'barcode':code,'status':'saved' if r.matched_count else 'concurrent_edit_skipped','set':fields})
  return out
 except Exception as e:return [{'id':str(d['_id']),'barcode':code,'status':'error','error':type(e).__name__+': '+str(e)} for d in items]
def checkpoint():
 (ROOT/'results.json').write_text(json.dumps(results,indent=2),encoding='utf8')
 print(json.dumps({'processed':len(results),'total':len(docs),'counts':dict(collections.Counter(r['status'] for r in results))}),flush=True)
checkpoint()
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 for future in concurrent.futures.as_completed([pool.submit(run,pair) for pair in groups.items()]):
  results.extend(future.result());checkpoint()
after={str(d['_id']):d for d in col.find({})}
checks=[]
for r in results:
 if r['status']=='saved':
  assert all(after[r['id']].get(k)==v for k,v in r['set'].items()),'Cover verification failed'
(ROOT/'summary.json').write_text(json.dumps({'records':len(docs),'counts':dict(collections.Counter(r['status'] for r in results)),'saved_fields_verified':True},indent=2),encoding='utf8')
print('COMPLETE',flush=True)
