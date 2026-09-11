import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
test('public FEHB source pipeline rejects ambiguity, stale evidence, and invalid rules',()=>{
 const r=spawnSync('python3',['-m','unittest','discover','-s','tests/python','-v'],{cwd:new URL('..',import.meta.url),encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr);
});
test('every shipped FEHB mapping pins the reviewed workbook and brochure editions',()=>{
 const read=p=>JSON.parse(readFileSync(new URL('../data/fehb/'+p,import.meta.url),'utf8'));
 const base=read('2026.json'),mapped=read('2026-benefits.json'),manifest=read('manifests/2026-benefits.json'),report=read('2026-coverage.json');
 assert.equal(mapped.catalogVersion,base.version);assert.equal(report.version,mapped.version);assert.equal(report.options,base.plans.length);
 for(const [id,s] of Object.entries(mapped.sources)){assert.equal(s.sha256,manifest.brochures[id]);assert.equal(s.supplement.sha256,manifest.supplements[id]);}
 assert.equal(mapped.reviewedAt,manifest.reviewedAt);
});
