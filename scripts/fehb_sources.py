"""Public-only FEHB brochure acquisition and text extraction (Python standard library).
Caches originals outside the checkout; callers pin SHA-256 before activating mappings.
"""
import hashlib, re, urllib.request, subprocess
from html.parser import HTMLParser
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
BASE = 'https://www.opm.gov/healthcare-insurance/healthcare/plan-information/plans/'
class BrochureText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True); self.parts=[]; self.skip=0
    def handle_starttag(self, tag, attrs):
        if tag in ('script','style'): self.skip+=1
        if tag in ('p','div','tr','li','br','h1','h2','h3','h4'): self.parts.append('\n')
        if tag in ('td','th'): self.parts.append(' | ')
    def handle_endtag(self, tag):
        if tag in ('script','style'): self.skip-=1
        if tag in ('p','div','tr','li','br','h1','h2','h3','h4'): self.parts.append('\n')
    def handle_data(self, data):
        if not self.skip: self.parts.append(data)
    def lines(self):
        return [re.sub(r'\s+',' ',line).strip() for line in ''.join(self.parts).splitlines() if line.strip()]
def brochure_number(value):
    match=re.fullmatch(r'RI[- ]+(\d{2})[- ](\d{3})',value.strip())
    if not match: raise ValueError('Invalid brochure identifier: '+value)
    return match[1]+'-'+match[2]
def brochure_url(year, number):
    if not re.fullmatch(r'\d{2}-\d{3}',number): raise ValueError('Invalid brochure number')
    return BASE+f'BrochureJson?brochureNumber={number}&year={year}'
def fetch_brochures(catalog, cache, refresh=False, pdf_numbers=()):
    cache=Path(cache)/str(catalog['year'])/'brochures'; cache.mkdir(parents=True,exist_ok=True)
    numbers=sorted({brochure_number(p['brochure']) for p in catalog['plans']})
    def fetch(number):
        url=brochure_url(catalog['year'],number); path=cache/(number+'.html')
        if refresh or not path.exists():
            request=urllib.request.Request(url,headers={'User-Agent':'FinancialPlanner-PublicReference/1.0'})
            with urllib.request.urlopen(request,timeout=45) as response:
                raw=response.read(15_000_001)
            if len(raw)>15_000_000: raise ValueError('Unexpected brochure size: '+number)
        else: raw=path.read_bytes()
        parser=BrochureText(); parser.feed(raw.decode('utf-8-sig'))
        lines=parser.lines(); text='\n'.join(lines)
        edition=re.search(r'Changes for (20\d{2})',text,re.I)
        if len(text)<10000 or not edition or int(edition[1])!=catalog['year']:
            raise ValueError('Missing or wrong-year brochure: '+number)
        if refresh or not path.exists():
            tmp=path.with_suffix('.tmp');tmp.write_bytes(raw);tmp.replace(path)
        result={'url':url,'sha256':hashlib.sha256(raw).hexdigest(),'lines':lines}
        if number in pdf_numbers:
            pdf_url=BASE+f'pdf/{catalog["year"]}/brochures/{number}.pdf'
            pdf=cache/(number+'.pdf')
            if refresh or not pdf.exists():
                with urllib.request.urlopen(pdf_url,timeout=60) as response: body=response.read(30_000_001)
                if not body.startswith(b'%PDF-') or len(body)>30_000_000: raise ValueError('Invalid PDF: '+number)
                tmp=pdf.with_suffix('.pdf.tmp');tmp.write_bytes(body);tmp.replace(pdf)
            plain=subprocess.run(['pdftotext','-layout',str(pdf),'-'],capture_output=True,check=True).stdout.decode()
            if not re.search(r'\b'+str(catalog['year'])+r'\b',plain[:10000]):raise ValueError('Wrong-year PDF: '+number)
            result['supplement']={'url':pdf_url,'sha256':hashlib.sha256(pdf.read_bytes()).hexdigest()}
            result['lines']+=['PDF SUPPLEMENT']+[re.sub(r'\s+',' ',x).strip() for x in plain.split('\f') if x.strip()]
        return number,result
    # Four public-document requests at most; no plan data is accepted or transmitted.
    with ThreadPoolExecutor(max_workers=4) as pool: return dict(pool.map(fetch,numbers))
