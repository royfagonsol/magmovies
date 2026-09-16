import os,sys,pathlib,json,urllib.request,urllib.parse,concurrent.futures,collections,uuid
sys.path.insert(0,os.path.join(os.environ['TEMP'],'codex-mongo-compat'))
from pymongo import MongoClient
from bson import json_util
ROOT=pathlib.Path(__file__).parent;BASE='https://stiletto.ddns.net/MagnoliumApiCore'
col=MongoClient('mongodb://192.168.1.198:27017/?directConnection=true',serverSelectionTimeoutMS=5000).dvd_library.disc
docs=list(col.find({}));(ROOT/'cache-before.json').write_text(json_util.dumps(docs,indent=2),encoding='utf8')
def fetch(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=12) as r:return r.read(25*1024*1024+1)
def mime(b):
 if b.startswith(b'\xff\xd8\xff'):return 'image/jpeg'
 if b.startswith(b'\x89PNG\r\n\x1a\n'):return 'image/png'
 if b.startswith(b'RIFF') and b[8:12]==b'WEBP':return 'image/webp'
 return None
def save(d,b,source):
 typ=mime(b)
 if not typ or len(b)>25*1024*1024:raise ValueError('Invalid image')
 boundary=uuid.uuid4().hex
 body=(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="cover"\r\nContent-Type: {typ}\r\n\r\n').encode()+b+f'\r\n--{boundary}--\r\n'.encode()
 req=urllib.request.Request(BASE+'/api/discs/covers',data=body,headers={'Content-Type':'multipart/form-data; boundary='+boundary},method='POST')
 with urllib.request.urlopen(req,timeout=30) as r:a=json.loads(r.read())
 assert mime(fetch(a['imageUrl']))
 clauses=[{'_id':d['_id']}]
 for k in ('barcode','image_url','cover_source'):
  clauses.append({k:{'$exists':k in d}})
  if k in d:clauses.append({k:{'$eq':d[k]}})
 fields={'image_url':a['imageUrl'],'cover_source':source}
 res=col.update_one({'$and':clauses},{'$set':fields})
 return {'id':str(d['_id']),'status':'saved' if res.matched_count else 'conflict','set':fields}
def run(d):
 if d.get('cover_source')=='manual':return {'id':str(d['_id']),'status':'manual_preserved'}
 url=d.get('image_url') or ''
 if not url.startswith(('https://','http://')):return {'id':str(d['_id']),'status':'needs_lookup'}
 try:return save(d,fetch(url),'existing-source-cached')
 except Exception as e:return {'id':str(d['_id']),'status':'needs_lookup','error':type(e).__name__}
if __name__=='__main__':
 results=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
  for f in concurrent.futures.as_completed([pool.submit(run,d) for d in docs]):
   results.append(f.result());(ROOT/'cache-results.json').write_text(json.dumps(results,indent=2),encoding='utf8')
   if len(results)%25==0:print(len(results),dict(collections.Counter(r['status'] for r in results)),flush=True)
 print('COMPLETE',len(results),dict(collections.Counter(r['status'] for r in results)),flush=True)
