"""Conservative, deterministic mapping of official FEHB benefit facts.
Unknown values stay absent. Detailed exceptions require source-pinned overrides.
"""
import hashlib, json, re
from fehb_sources import brochure_number
VERSION='2'
SERVICES={
 'primary':'Primary Care Office Visit','specialist':'Specialist Office Visit','urgent':'Urgent Care',
 'emergency':'Emergency Care','inpatient':'Hospital Inpatient Cost Per Admission',
 'outpatient':'Other Outpatient Surgery Costs','surgery':'Doctor Costs for Outpatient Surgery',
 'labs':'Diagnostic Tests or Procedures (e.g., Blood Tests, X-rays, Urinalysis, Ultrasounds)',
 'imaging':'Diagnostic Tests or Procedures (e.g., CT scans, MRIs, PET Scans)',
 'mental':'Professional Services (Mental Health and Substance Use Disorder)',
 'physical':'Physical Therapy','occupational':'Occupational Therapy','speech':'Speech Therapy',
 'preventive':'Preventive Care',**{f'rx{i}':f'Tier {i}' for i in range(7)}}
def number(s, none_is_zero=False):
    if none_is_zero and s.strip().lower() in ('none','no deductible','not applicable'):return 0
    s=s.strip().replace('$','').replace(',','')
    return float(s) if re.fullmatch(r'\d+(?:\.\d+)?',s) else None

def scalar(s):
    if s=='Member Pays Nothing':return {'payment':'copay','amount':0}
    if s in ('Member Pays All Charges','Not Covered'):return {'coverage':'excluded','deductible':'exempt','payment':'coinsurance','amount':100,'countsOop':'no'}
    m=re.fullmatch(r'\$([\d,]+(?:\.\d+)?)\s*(?:Copayment)?',s,re.I)
    if m:return {'payment':'copay','amount':number(m[1])}
    m=re.fullmatch(r'(\d+(?:\.\d+)?)%\s*(?:Coinsurance)?',s,re.I)
    if m and float(m[1])<=100:return {'payment':'coinsurance','amount':float(m[1])}
    return None

def line_ref(line):return hashlib.sha256(line.encode()).hexdigest()
def money_pattern(value):return re.escape(f'{value:,.0f}')
def family_facts(plan,lines):
    """Require family context plus a literal individual cap; never halve a family cap."""
    self_t=next(t for t in plan['tiers'] if t['tier']=='self')
    family_t=next(t for t in plan['tiers'] if t['tier']=='family')
    facts={}; proofs={}
    def accept(key,values):
        unique={v for v,l in values}
        if len(unique)==1:
            facts[key]=next(iter(unique));proofs[key]={'lineHash':line_ref(values[0][1]),'section':'Cost Sharing / Family Limits'}
    # A zero family deductible needs no ambiguous embedded-versus-aggregate interpretation.
    if family_t['deductible']==0:
        facts.update(deductibleMode='embedded',individualDeductible=0)
    deductible=[]; modes=[]; limits=[]
    for original in lines:
        line=original.replace('\u2011','-');lower=line.lower()
        if not re.search(r'self (?:and|&|plus)|per family|family enrollment',lower):continue
        # Never use an exclusively out-of-network, Medicare or example paragraph.
        if re.search(r'^\s*(?:non-network|out-of-network|example|medicare)',lower) or 'medicare' in lower:continue
        if ('out-of-pocket' in lower or 'catastrophic' in lower or 'maximum' in lower) and 'self only' in lower and re.search(r'individual|family member',lower):
            if re.search(r'maximum out-of-pocket for any individual in the family will not exceed the maximum out-of-pocket for self only|individual.*never have to satisfy more than.*self only|(?:family member|individual).*reaches the self only.*(?:maximum|protection)|once any individual family member reaches the self only',lower):
                limits.append((self_t['maximum'],original))
        fd=family_t['deductible'];fm=family_t['maximum']
        if self_t['maximum'] is not None and fm is not None and re.search(r'\$'+money_pattern(fm)+r'\b',line):
            for pat in [r'(?:listed under Self Only of|individually meet the) \$([\d,]+).*?(?:applies to each individual|Self Only out-of-pocket)',r'\$([\d,]+) per person for Self Plus One']:
                match=re.search(pat,line,re.I)
                if match and number(match[1])==self_t['maximum']:limits.append((number(match[1]),original))
        if fd and 'deductible' in lower and re.search(r'\$'+money_pattern(fd)+r'\b',line):
            if re.search(r'no individual deductible|entire family deductible must be met before',lower):
                modes.append(('aggregate',original));continue
            m=re.search(r'(?:calendar year |annual )?deductible(?:s)? (?:is:? |of |are:? )?\$([\d,]+)(?:\.00)? per (?:person|individual)',line,re.I)
            if m and number(m[1])==self_t['deductible']:
                deductible.append((number(m[1]),original));modes.append(('embedded',original))
        if fm and ('maximum' in lower or 'out-of-pocket' in lower) and re.search(r'\$'+money_pattern(fm)+r'\b',line):
            patterns=[r'After an individual family member reaches the maximum out-of-pocket expenses of \$([\d,]+)',r'not to exceed \$([\d,]+)(?:\.00)? per (?:person|individual)',r'\$([\d,]+)(?:\.00)? per (?:person|individual)\s*(?:or|\()\s*\$'+money_pattern(fm)+r'(?:\.00)? per family']
            for pat in patterns:
                m=re.search(pat,line,re.I)
                if m and number(m[1])<=fm:limits.append((number(m[1]),original))
    accept('deductibleMode',modes);accept('individualDeductible',deductible);accept('individualMax',limits)
    if facts.get('deductibleMode')=='aggregate':facts.pop('individualDeductible',None);proofs.pop('individualDeductible',None)
    return facts,proofs

def map_plan(plan,terms,brochure):
    facts,proofs=family_facts(plan,brochure['lines'])
    family=next(t for t in plan['tiers'] if t['tier']=='family')
    zero=family['deductible']==0
    # "None" has a precise meaning in a deductible column, not in arbitrary money fields.
    for key,label in [('rxIndividualDeductible','Annual Deductible for Prescriptions Only (Self)'),('rxFamilyDeductible','Annual Deductible for Prescriptions Only (Self & Family)')]:
        val=number(terms.get(label,''),True)
        if val is not None:facts[key]=val;proofs[key]={'column':label}
    if terms.get('Annual Out-of-Pocket Maximum for Prescriptions') in ('None','Not applicable'):
        facts.update(rxIndividualMax=None,rxFamilyMax=None)
    rules={};unresolved={}
    for key,label in SERVICES.items():
        raw=terms.get(label,'');extra=terms.get(label+' Additional Details','');rule=scalar(raw)
        if key=='preventive' and rule and rule.get('amount')==0:
            rules[key]={**rule,'coverage':'covered','deductible':'exempt','countsOop':'yes','label':'Plan-Confirmed Free Preventive Care'};continue
        if not rule:unresolved[key]='Published benefit needs detailed mapping.';continue
        if rule.get('coverage')=='excluded':rules[key]=rule;continue
        rule.update(coverage='covered',countsOop='yes')
        # OPM rows describe covered in-network care; exclusions are separate care inputs.
        if rule['amount']==0 and not re.search(r'deductible applies|after.*deductible',extra,re.I):rule['deductible']='exempt'
        elif (zero and (not key.startswith('rx') or facts.get('rxIndividualDeductible')==0)) or re.search(r'no deductible|\$0 (?:calendar year )?deductible|deductible (?:does not apply|waived)',extra,re.I):rule['deductible']='exempt'
        elif re.search(r'deductible applies|\$[\d,]+ calendar year deductible',extra,re.I):rule['deductible']='shared'
        else:unresolved[key]='Deductible treatment needs brochure mapping.';continue
        # Preserve conditional benefits; do not silently drop caps, visit counts, or special networks.
        cleaned=re.sub(r'no deductible\.?|deductible applies\.?|\$[\d,]+ calendar year deductible[, .]*|prior approval required for some services\.?|some (?:services|drugs) (?:will )?require prior approval\.?','',extra,flags=re.I).strip(' ,.;')
        if cleaned.lower() not in ('','none','not applicable'):
            unresolved[key]='Published conditions need detailed mapping.';continue
        rules[key]=rule
    return {'fields':facts,'fieldEvidence':proofs,'services':rules,'unresolvedServices':unresolved}

def compile_catalog(catalog,brochures,overrides):
    if overrides['year']!=catalog['year'] or overrides['catalogVersion']!=catalog['version']:raise ValueError('Mapping manifest does not match the catalog edition')
    result={};sources={}
    for p in catalog['plans']:
        no=brochure_number(p['brochure']);b=brochures[no]
        if overrides['brochures'].get(no)!=b['sha256']:raise ValueError('Brochure changed or unreviewed: '+no)
        terms={catalog['dictionary'][k]:catalog['dictionary'][v] for k,v in p['terms']}
        # Normalize explicit no-deductible tokens before structural rules.
        p=json.loads(json.dumps(p))
        for t in p['tiers']:
            col={'self':'Self','plusOne':'Self Plus One','family':'Self & Family'}[t['tier']]
            t['deductible']=number(terms.get('Annual deductible ('+col+')',''),True)
        if no in overrides.get('supplements',{}) and b.get('supplement',{}).get('sha256')!=overrides['supplements'][no]:raise ValueError('Supplement changed: '+no)
        mapped=map_plan(p,terms,b)
        profile=overrides.get('plans',{}).get(p['id'],{})
        if profile:
            evidence=profile.get('evidence',{})
            available={line_ref(line) for line in b['lines']}
            if not evidence.get('section') or not evidence.get('lineHashes') or not set(evidence['lineHashes'])<=available:raise ValueError('Profile evidence missing/changed: '+p['id'])
            mapped['profileEvidence']=evidence
            mapped['scope']=profile['scope']
        for key in profile.get('removeServices',[]):
            mapped['services'].pop(key,None);mapped['unresolvedServices'][key]='Choose the applicable published variant or enter this service rule.'
        for section in ('fields','services'):
            for key,value in overrides.get('plans',{}).get(p['id'],{}).get(section,{}).items():
                mapped[section][key]=value
                if section=='services':mapped['unresolvedServices'].pop(key,None)
        validate_mapping(mapped,p)
        mapped['tierDeductibles']={t['tier']:t['deductible'] for t in p['tiers']}
        mapped['brochure']=no
        result[p['id']]=mapped;sources[no]={'url':b['url'],'sha256':b['sha256'],**({'supplement':b['supplement']} if b.get('supplement') else {})}
    payload={'schema':1,'year':catalog['year'],'catalogVersion':catalog['version'],'mapperVersion':VERSION,'reviewedAt':overrides['reviewedAt'],'sources':sources,'plans':result}
    payload['version']=str(catalog['year'])+'-'+hashlib.sha256(json.dumps(payload,sort_keys=True,separators=(',',':')).encode()).hexdigest()[:16]
    return payload


def validate_mapping(mapped,plan):
    fields={'deductibleMode','individualDeductible','individualMax','coinsurance','rxIndividualDeductible','rxFamilyDeductible','rxIndividualMax','rxFamilyMax'}
    for key,value in mapped['fields'].items():
        if key not in fields:raise ValueError('Unknown benefit field: '+key)
        if key=='deductibleMode':
            if value not in ('embedded','aggregate'):raise ValueError('Invalid deductible structure')
        elif value is not None and (not isinstance(value,(int,float)) or isinstance(value,bool) or not 0<=value<= (100 if key=='coinsurance' else 1e9)):raise ValueError('Invalid benefit amount: '+key)
    maximum=mapped['fields'].get('individualMax')
    if maximum is not None and any(t['maximum'] is not None and maximum>t['maximum'] for t in plan['tiers'] if t['tier']!='self'):raise ValueError('Individual OOP exceeds family OOP')
    for key,r in mapped['services'].items():
        if not re.fullmatch(r'[a-zA-Z0-9_-]+',key):raise ValueError('Invalid service key')
        if r.get('coverage') not in ('covered','excluded') or r.get('countsOop') not in ('yes','no'):raise ValueError('Incomplete coverage rule: '+key)
        for segment in [r]+([r['after']] if 'after' in r else []):
            if segment.get('deductible') not in ('shared','separate','exempt') or segment.get('payment') not in ('copay','coinsurance'):raise ValueError('Invalid cost-sharing rule')
            value=segment.get('amount')
            if not isinstance(value,(int,float)) or not 0<=value<=(100 if segment['payment']=='coinsurance' else 1e9):raise ValueError('Invalid service amount')
            if segment.get('minimum',0)>segment.get('maximum',float('inf')):raise ValueError('Inverted cost-sharing cap')
        if 'after' in r:
            a=r['after']
            if not isinstance(a.get('count'),int) or not 0<=a['count']<=366 or not isinstance(a.get('group'),str):raise ValueError('Invalid visit threshold')
