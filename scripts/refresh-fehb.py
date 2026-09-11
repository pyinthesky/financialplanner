#!/usr/bin/env python3
"""Repeatable public-only FEHB build. Never mutates the checked-in catalog on failure.
See docs/fehb-refresh.md. --inventory prepares evidence for human/source review;
--output writes validated catalogs; --check verifies the committed build byte-for-byte.
"""
import argparse, hashlib, importlib.util, json, sys, urllib.request
from pathlib import Path
from fehb_sources import fetch_brochures
from fehb_mapping import compile_catalog
ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('fehb_import',ROOT/'scripts/import-fehb.py')
raw=importlib.util.module_from_spec(spec);spec.loader.exec_module(raw)
def serialized(v):return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n'
def acquire(manifest,cache,download=False,inventory=False):
    cache=Path(cache)/str(manifest['year'])/'workbooks';cache.mkdir(parents=True,exist_ok=True)
    tables={};sources=[]
    for source in manifest['sources']:
        name=source['name'];url=source['url']
        if name not in ('key','rates','benefits','areas') or not url.startswith(raw.BASE+str(manifest['year'])+'/fehb/'):raise ValueError('Unapproved public source path')
        path=cache/(name+'.xlsx')
        if download or not path.exists():
            with urllib.request.urlopen(url,timeout=60) as response:body=response.read(30_000_001)
            if len(body)>30_000_000 or not body.startswith(b'PK'):raise ValueError('Invalid workbook: '+name)
            tmp=path.with_suffix('.tmp');tmp.write_bytes(body);tmp.replace(path)
        digest=hashlib.sha256(path.read_bytes()).hexdigest()
        if not inventory and digest!=source['sha256']:raise ValueError('Workbook changed: '+name)
        tables[name]=raw.read_sheet(path)
        if not inventory and tables[name][0]!=manifest['headers'][name]:raise ValueError('Workbook schema changed: '+name)
        sources.append({**source,'sha256':digest})
    if set(tables)!= {'key','rates','benefits','areas'} or len(sources)!=4:raise ValueError('Exactly four distinct workbooks required')
    catalog=raw.build(manifest['year'],tables,sources);catalog['retrieved']=manifest['retrieved']
    if not inventory and catalog['counts']!=manifest['expectedCounts']:raise ValueError('Unexpected catalog counts')
    return catalog,tables

def coverage(catalog,benefits):
    entries=[]
    for p in catalog['plans']:
        m=benefits['plans'][p['id']];fields=m['fields'];complete='individualMax' in fields and ('deductibleMode' in fields) and (fields.get('deductibleMode')=='aggregate' or fields.get('individualDeductible') is not None)
        entries.append({'id':p['id'],'name':p['name'],'option':p['option'],'familyLimitsMapped':complete,'serviceRules':len(m['services']),'missingServiceCategories':sorted(m['unresolvedServices']),'sourceReviewedProfile':bool(m.get('profileEvidence'))})
    return {'year':catalog['year'],'version':benefits['version'],'options':len(entries),'brochures':len(benefits['sources']),'familyLimitsMapped':sum(x['familyLimitsMapped'] for x in entries),'serviceRules':sum(x['serviceRules'] for x in entries),'reviewedProfiles':sum(x['sourceReviewedProfile'] for x in entries),'entries':entries}

def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--manifest',type=Path,required=True);ap.add_argument('--cache',type=Path,required=True);ap.add_argument('--download',action='store_true');mode=ap.add_mutually_exclusive_group(required=True);mode.add_argument('--inventory',type=Path);mode.add_argument('--output',type=Path);mode.add_argument('--check',action='store_true');a=ap.parse_args()
    m=json.loads(a.manifest.read_text());catalog,tables=acquire(m,a.cache,a.download,bool(a.inventory));b=fetch_brochures(catalog,a.cache,a.download,m.get('supplements',{}))
    if a.inventory:
        candidate={**m,'sources':catalog['sources'],'headers':{k:t[0] for k,t in tables.items()},'catalogVersion':catalog['version'],'expectedCounts':catalog['counts'],'brochures':{k:v['sha256'] for k,v in b.items()},'supplements':{k:v['supplement']['sha256'] for k,v in b.items() if v.get('supplement')},'plans':{},'reviewedAt':''}
        base_path=ROOT/f'data/fehb/{m["year"]}.json'
        if not base_path.exists():base_path=ROOT/f'data/fehb/{m["year"]-1}.json'
        baseline=json.loads(base_path.read_text()) if base_path.exists() else {'plans':[],'sources':[],'dictionary':[]}
        old={p['id']:p for p in baseline['plans']};new={p['id']:p for p in catalog['plans']}
        changed=[]
        for key in sorted(old.keys() & new.keys()):
            def decode(p,c):return {**p,'terms':{c['dictionary'][k]:c['dictionary'][v] for k,v in p['terms']}}
            before,after=decode(old[key],baseline),decode(new[key],catalog)
            if json.loads(serialized(before))!=json.loads(serialized(after)):changed.append({'id':key,'before':before,'after':after})
        report={'year':m['year'],'addedOptions':sorted(new.keys()-old.keys()),'removedOptions':sorted(old.keys()-new.keys()),'changedOptions':changed,'changedBrochures':[k for k,v in b.items() if m.get('brochures',{}).get(k)!=v['sha256'] or m.get('supplements',{}).get(k)!=v.get('supplement',{}).get('sha256')],'counts':catalog['counts'],'status':'Inventory only; semantic mappings must be reviewed. Previous-year profiles have not been copied.'}
        a.inventory.parent.mkdir(parents=True,exist_ok=True)
        a.inventory.with_suffix('.changes.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
        a.inventory.write_text(json.dumps(candidate,ensure_ascii=False,indent=2)+'\n');print('Inventory only; no active mappings published. Review new/changed source documents and add evidence-backed profiles.');return
    if not m.get('reviewedAt'):raise ValueError('Review date required before publication')
    result=compile_catalog(catalog,b,m);report=coverage(catalog,result)
    payloads={f'{m["year"]}-benefits.json':result,f'{m["year"]}-coverage.json':report}
    if a.check:
        for name,value in payloads.items():
            if (ROOT/'data/fehb'/name).read_text()!=serialized(value):raise ValueError('Generated catalog differs: '+name)
        if json.loads((ROOT/f'data/fehb/{m["year"]}.json').read_text())!=json.loads(serialized(catalog)):raise ValueError('Base catalog differs')
        print('Reproducible catalog and coverage checks passed.');return
    # Everything above must pass before any destination is written.
    a.output.mkdir(parents=True,exist_ok=True)
    payloads[f'{m["year"]}.json']=catalog
    for name,value in payloads.items():
        dest=a.output/name;temp=dest.with_suffix('.tmp');temp.write_text(serialized(value));temp.replace(dest)
    print(json.dumps({k:v for k,v in report.items() if k!='entries'}))
if __name__=='__main__':
    try:main()
    except Exception as exc:print('FEHB refresh stopped: '+str(exc),file=sys.stderr);sys.exit(1)
