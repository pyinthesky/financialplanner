#!/usr/bin/env python3
"""Import public OPM files only. No household inputs or workbook metadata retained.
Run: python scripts/import-fehb.py --year 2026 --cache /tmp/opm-research
Future editions require an explicitly reviewed source manifest; never relabel a year.
"""
import argparse, datetime, hashlib, json, re, urllib.request, zipfile
from pathlib import Path
from xml.etree import ElementTree as ET
BASE='https://www.opm.gov/healthcare-insurance/healthcare/transparency-in-healthcare/public-use-files/'
EDITIONS={2026:{'key':'2026-fehb-plan-key-11202025.xlsx','rates':'2026-fehb-rates-10232025.xlsx','benefits':'2026-fehb-plan-benefits-11202025.xlsx','areas':'2026-fehb-service-area-03242026.xlsx'}}
NS={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
def read_sheet(path):
    with zipfile.ZipFile(path) as z:
        shared=[]
        if 'xl/sharedStrings.xml' in z.namelist():
            shared=[''.join(x.itertext()) for x in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si',NS)]
        rows=[]
        for row in ET.fromstring(z.read('xl/worksheets/sheet1.xml')).findall('.//m:row',NS):
            result={}
            for c in row.findall('m:c',NS):
                v=c.find('m:v',NS); text=v.text if v is not None else ''
                if c.attrib.get('t')=='s': text=shared[int(text)]
                if c.attrib.get('t')=='inlineStr': text=''.join(c.find('m:is',NS).itertext())
                result[re.sub(r'\d','',c.attrib['r'])]=(text or '').strip()
            rows.append(result)
        return rows

def norm(s): return re.sub(r'\s+',' ',s).strip().casefold()
def amount(s):
    text=s.strip().replace('$','').replace(',','')
    return float(text) if re.fullmatch(r'\d+(\.\d+)?',text) else None

def build(year, tables, sources):
    required={'key':{'C':'Plan Code','E':'Enrollment Code','F':'Enrollment Type'},'rates':{'A':'Plan Code','B':'Enrollment Code','C':'Rate Type','F':'Biweekly/Monthly','G':'Employee Pays'},'benefits':{'A':'Plan Option Name','C':'Plan Code','E':'In-network/out-of-network','G':'Annual deductible (Self)','Q':'Annual out-of-pocket maximum (Self)'},'areas':{'A':'Option','B':'Plan Code','E':'Nationwide (Y/N)','I':'County FIPS','K':'ZIP code'}}
    for name,headers in required.items():
        for column,label in headers.items():
            if tables[name][0].get(column)!=label:raise ValueError(f'Source schema changed: {name} {column}; review before updating.')
    key,rates,benefits,areas=[tables[n][1:] for n in ['key','rates','benefits','areas']]
    assert len({r['E'] for r in key})==len(key), 'Duplicate enrollment codes'
    out=[]; seen=set()
    for b in benefits:
        if b['E']!='In-network':continue
        identity=(b['C'],norm(b['A']))
        assert identity not in seen,'Duplicate in-network benefit option';seen.add(identity)
        keys=[k for k in key if k['C']==b['C'] and norm(k['B'])==norm(b['A'])]
        if not keys:raise ValueError('No enrollment key for '+str(identity))
        variants=[]
        for k in keys:
            # Rates use a one-character tier suffix, NOT the full enrollment code.
            matches=[r for r in rates if r['A']==k['C'] and r['B']==k['E'][-1] and r['E']==k['F'] and r['C']=='NP Active' and r['F']=='Biweekly']
            values={amount(r['G']) for r in matches}
            if len(values)!=1 or None in values:raise ValueError('Ambiguous active employee rate: '+k['E'])
            tier={'Self':'self','Self Plus One':'plusOne','Self & Family':'family'}[k['F']]
            col={'self':('G','Q','K'),'plusOne':('H','R','L'),'family':('I','S','M')}[tier]
            variants.append({'code':k['E'],'tier':tier,'biweekly':round(values.pop(),2),'deductible':amount(b[col[0]]),'maximum':amount(b[col[1]]),'accountContribution':amount(b[col[2]])})
        # Service Area's Enrollment Code is a suffix-set (e.g. 132/465), not an enrollment ID.
        area=[a for a in areas if a['B']==b['C'] and norm(a['A'])==norm(b['A'])]
        regions=sorted({(a.get('F',''),a.get('G')=='Y',a.get('I','').zfill(5) if a.get('I') else '',a.get('H',''),a.get('J')=='Y',a.get('K','').zfill(5) if a.get('K') else '') for a in area if a['E']!='Y'})
        k=keys[0]
        terms={tables['benefits'][0][c]:v for c,v in b.items() if c not in ['A','B','C','D','E','F'] and v}
        links={name:k.get(col,'') for name,col in [('benefits','N'),('providers','O'),('formulary','P')] if k.get(col,'').startswith('https://')}
        out.append({'id':b['C']+'-'+re.sub('[^a-z0-9]+','-',norm(b['A'])).strip('-'),'name':b['D'],'option':b['A'],'planCode':b['C'],'network':k['G'],'kind':b['F'],'account':b['J'],'brochure':b['B'],'links':links,'tiers':sorted(variants,key=lambda x:x['tier']),'nationwide':any(a['E']=='Y' for a in area),'regions':regions,'terms':terms})
    dictionary=[]; indices={}
    def intern(text):
        if text not in indices:indices[text]=len(dictionary);dictionary.append(text)
        return indices[text]
    for plan in out:plan['terms']=[[intern(k),intern(v)] for k,v in plan['terms'].items()]
    return {'dictionary':dictionary,'program':'FEHB','year':year,'version':str(year)+'-'+hashlib.sha256(''.join(s['sha256'] for s in sources).encode()).hexdigest()[:12],'retrieved':datetime.date.today().isoformat(),'rateType':'NP Active','sources':sources,'counts':{'planNames':len({p['name'] for p in out}),'options':len(out),'enrollmentCodes':len(key)},'plans':sorted(out,key=lambda p:(p['name'],p['option']))}

def main():
    p=argparse.ArgumentParser();p.add_argument('--year',type=int,required=True);p.add_argument('--cache',type=Path,required=True);p.add_argument('--download',action='store_true');p.add_argument('--output',type=Path);args=p.parse_args()
    if args.year not in EDITIONS:raise SystemExit('No reviewed source manifest for this year. Add exact official edition URLs first; retain existing catalogs.')
    args.cache.mkdir(parents=True,exist_ok=True);tables={};sources=[]
    for name,filename in EDITIONS[args.year].items():
        path=args.cache/(name+'.xlsx');url=BASE+str(args.year)+'/fehb/'+filename
        if args.download or not path.exists():
            with urllib.request.urlopen(url,timeout=60) as response:path.write_bytes(response.read())
        date=re.search(r'-(\d{8})\.xlsx$',filename)[1]
        sources.append({'name':name,'url':url,'released':date[4:]+'-'+date[:2]+'-'+date[2:4],'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
        tables[name]=read_sheet(path)
    result=build(args.year,tables,sources)
    output=args.output or Path(f'data/fehb/{args.year}.json');output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
    print(json.dumps({'output':str(output),'version':result['version'],'counts':result['counts']}))
if __name__=='__main__':main()
