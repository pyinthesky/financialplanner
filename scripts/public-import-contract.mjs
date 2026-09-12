import { createGenerator } from 'ts-json-schema-generator';
import { DEFAULT_PLAN } from '../lib/planner.ts';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function buildPublicContract() {
  const schema = createGenerator({path:'lib/planner.ts',tsconfig:'tsconfig.json',type:'PlannerData',additionalProperties:false}).createSchema('PlannerData');
  schema.$id = 'https://pyinthesky.github.io/financialplanner/schemas/plan-v2.schema.json';
  schema.title = 'Open Retirement Planner — Version 2 Plan File';
  schema.description = 'Structural contract generated from PlannerData. Read /financialplanner/import-guide.md for units, shared facts, unknown values and privacy. Validation does not establish calculation completeness or financial-law eligibility.';
  schema.definitions.PlannerData.properties.schemaVersion = {type:'number',const:2};
  return new Map([
    ['public/schemas/plan-v2.schema.json', JSON.stringify(schema,null,2)+'\n'],
    ['public/examples/blank-plan-v2.json', JSON.stringify(DEFAULT_PLAN,null,2)+'\n'],
  ]);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  for (const [path, content] of buildPublicContract()) {
    if (check) {
      if (readFileSync(path,'utf8') !== content) throw new Error(`${path} is stale. Run npm run schema:write and review the diff.`);
    } else {
      mkdirSync(dirname(path),{recursive:true});
      writeFileSync(path,content);
    }
    console.log(`${check?'Verified':'Wrote'} ${path}`);
  }
}
