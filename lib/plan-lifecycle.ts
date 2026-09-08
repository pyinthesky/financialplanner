import { DEFAULT_PLAN, normalizePlan, type PlannerData } from './planner.ts';
export function isBlankPlan(plan:PlannerData) { return JSON.stringify(normalizePlan(plan))===JSON.stringify(normalizePlan(DEFAULT_PLAN)); }
/** Invalidates queued and in-flight encryption before clearing or replacing a vault. */
export function createSaveGuard(){let generation=0;return {cancel(){generation++;},lease(){const ticket=generation;return ()=>ticket===generation;},async save(encrypt:()=>Promise<string>,write:(value:string)=>void){const ticket=++generation;const value=await encrypt();if(ticket!==generation)return false;write(value);return true;}};}
