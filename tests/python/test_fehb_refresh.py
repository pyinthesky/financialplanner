"""Synthetic fixtures; no downloaded brochures or personal data needed in CI."""
import sys, unittest, copy, json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scripts'))
from fehb_mapping import number,scalar,family_facts,compile_catalog,line_ref,validate_mapping
from fehb_sources import BrochureText,brochure_number,brochure_url
class MappingTests(unittest.TestCase):
 def setUp(self):
  self.plan={'id':'fixture','brochure':'RI 00-001','tiers':[{'tier':'self','deductible':200,'maximum':1000},{'tier':'plusOne','deductible':500,'maximum':3000},{'tier':'family','deductible':500,'maximum':3000}],'terms':[]}
  self.line='The calendar year deductible is $200 per person ($500 per family enrollment).'
  self.cat={'year':2026,'version':'test','dictionary':[],'plans':[self.plan]}
  self.docs={'00-001':{'url':brochure_url(2026,'00-001'),'sha256':'a'*64,'lines':[self.line]}}
  self.manifest={'year':2026,'catalogVersion':'test','brochures':{'00-001':'a'*64},'reviewedAt':'2026-09-11','plans':{}}
 def test_unknown_is_not_free(self):
  self.assertEqual(number('None',True),0);self.assertIsNone(number('None'));self.assertIsNone(number('See brochure',True));self.assertIsNone(scalar('25% up to $200'))
 def test_no_halving_or_generic_aggregate_inference(self):
  fields,_=family_facts(self.plan,['Combined covered expenses under family enrollment reach the $500 deductible.'])
  self.assertNotIn('deductibleMode',fields);self.assertNotIn('individualMax',fields)
  fields,_=family_facts(self.plan,[self.line]);self.assertEqual(fields['individualDeductible'],200);self.assertEqual(fields['deductibleMode'],'embedded')
 def test_explicit_family_person_cap(self):
  fields,_=family_facts(self.plan,['Your out-of-pocket maximum is $3,000 per family, not to exceed $1,200 per person.']);self.assertEqual(fields['individualMax'],1200)
 def test_source_change_and_year_fail_closed(self):
  self.docs['00-001']['sha256']='b'*64
  with self.assertRaisesRegex(ValueError,'changed'):compile_catalog(self.cat,self.docs,self.manifest)
  self.manifest['year']=2027
  with self.assertRaisesRegex(ValueError,'edition'):compile_catalog(self.cat,self.docs,self.manifest)
 def test_override_requires_exact_evidence(self):
  self.manifest['plans']['fixture']={'fields':{'individualMax':1200},'scope':'Synthetic fixture','evidence':{'section':'4','lineHashes':['missing']}}
  with self.assertRaisesRegex(ValueError,'evidence'):compile_catalog(self.cat,self.docs,self.manifest)
  self.manifest['plans']['fixture']['evidence']['lineHashes']=[line_ref(self.line)]
  self.assertEqual(compile_catalog(self.cat,self.docs,self.manifest)['plans']['fixture']['fields']['individualMax'],1200)
 def test_deterministic_and_inputs_not_mutated(self):
  before=json.dumps([self.cat,self.docs,self.manifest],sort_keys=True)
  a=compile_catalog(self.cat,self.docs,self.manifest);b=compile_catalog(copy.deepcopy(self.cat),copy.deepcopy(self.docs),copy.deepcopy(self.manifest))
  self.assertEqual(a,b);self.assertEqual(json.dumps([self.cat,self.docs,self.manifest],sort_keys=True),before)
 def test_invalid_cost_rules_rejected(self):
  for r in [{'coverage':'covered','countsOop':'yes','deductible':'shared','payment':'coinsurance','amount':101},{'coverage':'covered','countsOop':'yes','deductible':'exempt','payment':'copay','amount':5,'minimum':20,'maximum':10}]:
   with self.assertRaises(ValueError):validate_mapping({'fields':{},'services':{'test':r}},self.plan)
 def test_identifiers_and_html(self):
  self.assertEqual(brochure_number('RI-73 899'),'73-899')
  with self.assertRaises(ValueError):brochure_number('../file')
  p=BrochureText();p.feed('<p>Changes for 2026</p><script>secret</script><p>$5 &amp; $10</p>');self.assertEqual(p.lines(),['Changes for 2026','$5 & $10'])
if __name__=='__main__':unittest.main()
