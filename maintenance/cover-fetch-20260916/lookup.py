import cache as helper
import json,time,re,urllib.request,urllib.error,collections
R=helper.ROOT
pending={r['id'] for r in json.loads((R/'cache-results.json').read_text()) if r['status']=='needs_lookup'}
prior=json.loads((R/'lookup-results.json').read_text()) if (R/'lookup-results.json').exists() else []
done={r['id'] for r in prior}
groups=collections.defaultdict(list)
for d in helper.docs:
 if str(d['_id']) in pending and str(d['_id']) not in done:groups[re.sub(r'\D','',str(d.get('barcode') or ''))].append(d)
codes=[x for x in groups if len(x) in (8,12,13,14)]
results=prior;last=0;remaining=None;stop=None
for offset in range(0,len(codes),2):
 pair=codes[offset:offset+2]
 delay=11-(time.monotonic()-last)
 if delay>0:time.sleep(delay)
 last=time.monotonic()
 try:
  req=urllib.request.Request('https://api.upcitemdb.com/prod/trial/lookup?upc='+','.join(pair))
  with urllib.request.urlopen(req,timeout=20) as r:
   remaining=int(r.headers.get('X-RateLimit-Remaining','0'));data=json.loads(r.read())
 except urllib.error.HTTPError as e:
  stop={'status':e.code,'response':e.read().decode(),'headers':{k:v for k,v in e.headers.items() if 'ratelimit' in k.lower() or 'retry' in k.lower()}};break
 except Exception as e:stop={'error':str(e)};break
 (R/('lookup-response-'+str(time.time_ns())+'.json')).write_text(json.dumps(data),encoding='utf8')
 items=data.get('items',[])
 for code in pair:
  match=next((it for it in items if code.lstrip('0') in [str(it.get(k,'')).lstrip('0') for k in ('ean','upc','gtin')]),None)
  images=match.get('images',[]) if match else []
  b=None
  for url in images:
   try:
    candidate=helper.fetch(url)
    if helper.mime(candidate):b=candidate;break
   except Exception:pass
  for d in groups[code]:
   if b is None:results.append({'id':str(d['_id']),'status':'no_usable_image','barcode':code});continue
   try:results.append(helper.save(d,b,'upcitemdb-cached'))
   except Exception as e:results.append({'id':str(d['_id']),'status':'save_error','error':str(e)})
 (R/'lookup-results.json').write_text(json.dumps(results,indent=2),encoding='utf8')
 print(json.dumps({'processed':len(results),'counts':dict(collections.Counter(r['status'] for r in results)),'requests_remaining':remaining}),flush=True)
 if remaining==0:stop={'reason':'daily quota exhausted'};break
report={'counts':dict(collections.Counter(r['status'] for r in results)),'remaining_records':len(pending-{r['id'] for r in results}),'stop':stop}
(R/'lookup-summary.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print('COMPLETE',json.dumps(report),flush=True)
