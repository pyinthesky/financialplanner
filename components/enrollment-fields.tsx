import { createContext, useContext, useEffect, useId, useRef, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import type { EnrollmentErrors } from '@/lib/enrollment-validation';
export const EnrollmentErrorsContext=createContext<EnrollmentErrors>({});
const Scope=createContext('');
export function EnrollmentScope({path,children}:{path:string;children:ReactNode}){const parent=useContext(Scope);return <Scope.Provider value={parent+path}>{children}</Scope.Provider>;}
export function EnrollmentField({field,children}:{field?:string;children:(props:{'aria-invalid'?:true;'aria-describedby'?:string})=>ReactNode}){
  const errors=useContext(EnrollmentErrorsContext),scope=useContext(Scope),message=field?errors[scope+field]:undefined,id=useId(),ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(!message)return;let parent=ref.current?.parentElement;while(parent){if(parent instanceof HTMLDetailsElement)parent.open=true;parent=parent.parentElement;}},[message]);
  return <div ref={ref} className={message?'oe-input-field oe-input-error':'oe-input-field'} data-enrollment-field={field?scope+field:undefined}>{children(message?{'aria-invalid':true,'aria-describedby':id}:{})}{message&&<small id={id} className="oe-field-error">{message}</small>}</div>;
}
export function Amount({field,label,value,onChange,percent=false,unit}:{field?:string;label:string;value:number|null;onChange:(v:number|null)=>void;percent?:boolean;unit?:string}){return <EnrollmentField field={field}>{props=><label className="budget-field"><span>{label}</span><div className="input-affix"><span>{unit??(percent?'%':'$')}</span><Input {...props} aria-label={label} type="number" min={0} step="any" value={value??''} onFocus={e=>e.currentTarget.select()} onChange={e=>onChange(e.target.value===''?null:e.target.valueAsNumber)}/></div></label>}</EnrollmentField>;}
export function Select({field,label,value,onChange,children}:{field?:string;label:string;value:string;onChange:(v:string)=>void;children:ReactNode}){return <EnrollmentField field={field}>{props=><label className="budget-field"><span>{label}</span><select {...props} aria-label={label} value={value} onChange={e=>onChange(e.target.value)}>{children}</select></label>}</EnrollmentField>;}
export function focusMissingEnrollmentField(){const node=document.querySelector<HTMLElement>('.oe-page [aria-invalid="true"]');if(!node)return;let parent=node.parentElement;while(parent){if(parent instanceof HTMLDetailsElement)parent.open=true;parent=parent.parentElement;}node.scrollIntoView({behavior:'smooth',block:'center'});node.focus({preventScroll:true});}
