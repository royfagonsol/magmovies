import os,sys,re,json,pathlib,datetime,collections
sys.path.insert(0,os.path.join(os.environ['TEMP'],'codex-mongo-compat'))
from bson import json_util
from pymongo import MongoClient
ROOT=pathlib.Path(__file__).parent
YEAR=re.compile(r'(?<![\w])(?:19\d{2}|20[012]\d)(?![\w])')
FORMAT=re.compile(r'\b(?:blu[\s\-\u2010-\u2015]*ray|dvd)\b',re.I)
BLURAY=re.compile(r'\bblu[\s\-\u2010-\u2015]*ray\b',re.I)
def clean(title):
    # Bracketed text includes nested brackets and truncated unclosed suffixes.
    kept=[]; removed=[]; stack=[]
    for ch in title:
        if ch in '([{<':
            removed.append(' ');stack.append(ch);kept.append(' ') if len(stack)==1 else None
        elif ch in ')]}>':
            if stack: stack.pop();removed.append(' ')
        elif stack: removed.append(ch)
        else: kept.append(ch)
    s=''.join(kept)
    years=[int(m.group()) for m in YEAR.finditer(''.join(removed))]
    # A leading year is part of the name (2012, 2001: A Space Odyssey).
    def year_out(m):
        if not s[:m.start()].strip(): return m.group()
        years.append(int(m.group()));return ' '
    s=YEAR.sub(year_out,s)
    s=FORMAT.sub(' ',s)
    s=re.sub(r'\s+',' ',s).strip(' \t-\u2013\u2014,;:/+')
    s=re.sub(r'(?:\s+-){2,}', ' -',s)
    ys=sorted(set(years)); range_hint=bool(re.search(r'(?:19|20)\d{2}\s*[/\-]\s*\d{2,4}',title))
    return s,ys,range_hint

def prepare(source):
    x=json_util.loads(pathlib.Path(source).read_text(encoding='utf8'));changes=[];review=[]
    for d in x['documents']:
        t=d['title'];name,years,yrange=clean(t);v={}
        if not name: review.append({'id':str(d['_id']),'title':t,'reason':'empty cleaned title'});continue
        if name!=d.get('main_title'):v['main_title']=name
        if BLURAY.search(t) and d.get('format')!='BLURAY':v['format']='BLURAY'
        if len(years)==1 and not yrange:
            if d.get('year') in (None,'',years[0]):
                if d.get('year')!=years[0]:v['year']=years[0]
            else: review.append({'id':str(d['_id']),'title':t,'reason':'existing year conflict','years':years})
        elif years:review.append({'id':str(d['_id']),'title':t,'reason':'multiple years or year range','years':years})
        if v:changes.append({'_id':d['_id'],'title':t,'set':v})
    return x,changes,review
if __name__=='__main__':
    source=ROOT/'before.json';x,changes,review=prepare(source)
    (ROOT/'changes.json').write_text(json_util.dumps(changes,indent=2),encoding='utf8')
    (ROOT/'review.json').write_text(json.dumps(review,indent=2,ensure_ascii=False),encoding='utf8')
    counts=dict(collections.Counter(k for ch in changes for k in ch['set']))
    print('Records',len(x['documents']),'changes',len(changes),'fields',counts,'review',len(review))
    if '--apply' not in sys.argv:sys.exit()
    c=MongoClient('mongodb://192.168.1.198:27017/?directConnection=true',serverSelectionTimeoutMS=5000)
    col=c[x['database']][x['collection']]
    originals={d['_id']:d for d in x['documents']}
    # Refuse stale snapshot before any writes. Each update also checks all original fields.
    assert {d['_id']:d for d in col.find({})}==originals,'Collection changed since snapshot; stop'
    journal=[]
    for ch in changes:
        old=originals[ch['_id']];clauses=[{'_id':old['_id']}]
        for k in ('title','main_title','year','format'):
            clauses.append({k:{'$exists':k in old}})
            if k in old:clauses.append({k:{'$eq':old[k]}})
        result=col.update_one({'$and':clauses},{'$set':ch['set']})
        assert result.matched_count==1,'Concurrent change; stop and inspect journal'
        journal.append(str(ch['_id']))
        (ROOT/'applied-ids.json').write_text(json.dumps(journal),encoding='utf8')
    after={d['_id']:d for d in col.find({})}
    assert set(after)==set(originals)
    expected={ch['_id']:ch['set'] for ch in changes}
    for i,old in originals.items():assert after[i]==dict(old,**expected.get(i,{})),str(i)
    (ROOT/'result.json').write_text(json.dumps({'verified':True,'records':len(after),'modified':len(journal),'fields':counts,'review':len(review)},indent=2),encoding='utf8')
    print('VERIFIED: all intended values match; original titles and all unrelated fields unchanged')
