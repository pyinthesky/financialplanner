import { ArrowRight, Compass, FileUp, PiggyBank, ShieldCheck, Sprout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActionRow, PlannerCard, Stack } from '@/components/ui/planner-layout';

export function Welcome({hasPlan,locked,onStart,onSample,onOpen,onNew}:{hasPlan:boolean;locked:boolean;onStart:()=>void;onSample:()=>void;onOpen:()=>void;onNew:()=>void}) {
  const steps=[
    {icon:PiggyBank,title:'Build Your Starting Point',copy:'Bring together your household, income, savings and debts.',color:'bg-white/80 text-blue-700',gradient:'linear-gradient(135deg, #f0f6ff, #e2edff)'},
    {icon:Sprout,title:'Shape Your Retirement',copy:'Decide what stays, what changes and what you want to make room for.',color:'bg-white/80 text-sky-700',gradient:'linear-gradient(135deg, #fff8ec, #eff5ff)'},
    {icon:Compass,title:'Explore Your Outlook',copy:'See how it adds up, then try different paths for your future.',color:'bg-white/80 text-indigo-700',gradient:'linear-gradient(135deg, #f2f0ff, #eaf4ff)'},
  ];
  return <Stack className="welcome-page">
    <PlannerCard className="welcome-hero relative isolate overflow-hidden bg-white">
      <div className="welcome-hero-copy relative z-10 max-w-3xl py-3 md:py-7">
        <p className="mb-4 text-xs font-semibold tracking-[0.18em] text-blue-700">YOUR LIFE. YOUR POSSIBILITIES.</p>
        <h1 className="max-w-2xl text-4xl leading-[1.12] font-semibold tracking-tight text-slate-900 md:text-5xl xl:text-6xl">Make a Plan for the Life You Want.</h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 md:text-lg">Understand your spending today, explore retirement, and see how different choices affect your future.</p>
        <ActionRow className="mt-6">
          <Button size="lg" onClick={onStart}>{hasPlan||locked?'Continue My Plan':'Start My Plan'}<ArrowRight aria-hidden="true"/></Button>
          <Button size="lg" variant="outline" onClick={onSample}>Explore a Sample Plan</Button>
        </ActionRow>
        <p className="mt-3 text-sm leading-6 text-slate-600">{locked?'You have a plan saved on this device. Continue to unlock it.':hasPlan?'Your plan is open. Continue where you left off.':'Start with what you know. You can skip sections and come back anytime.'}</p>
        <ActionRow className="mt-2"><Button variant="link" className="px-0" onClick={onOpen}><FileUp aria-hidden="true"/>Open a Saved Plan</Button>{(hasPlan||locked)&&<Button variant="link" onClick={onNew}>Create New Plan</Button>}</ActionRow>
        <p className="mt-2 text-xs leading-5 text-slate-500">New entries stay in this tab until you save or download them. The sample uses fictional information.</p>
      </div>
      <img className="welcome-hero-art" src="./images/planning-horizon.webp" alt="" aria-hidden="true" width={1536} height={1024} fetchPriority="high" decoding="async" draggable={false}/>
    </PlannerCard>
    <section aria-label="Your Planning Journey">
      <h2 className="mb-3 text-lg font-semibold">A Clear Path, at Your Pace</h2>
      <ol className="grid min-w-0 grid-cols-1 gap-3 @min-[48rem]/planner:grid-cols-3">
        {steps.map((step,i)=><li key={step.title} className="min-w-0"><PlannerCard className="h-full" style={{background:step.gradient}}><div className="mb-4 flex items-center justify-between"><span className={`flex size-11 items-center justify-center rounded-xl ${step.color}`}><step.icon size={23} aria-hidden="true"/></span><span className="text-xs font-medium text-slate-500">STEP {i+1}</span></div><h3 className="text-base font-semibold">{step.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{step.copy}</p>{i<2&&<ArrowRight className="mt-3 rotate-90 text-slate-400 @min-[48rem]/planner:rotate-0" size={18} aria-hidden="true"/>}</PlannerCard></li>)}
      </ol>
    </section>
    <div className="flex items-start gap-3 rounded-xl bg-blue-50 p-4 text-sm leading-6 text-slate-800"><ShieldCheck className="mt-0.5 shrink-0" size={21} aria-hidden="true"/><p><strong>No signup. No ads or tracking.</strong><br/>Your financial information stays in your browser. Saving on this device is optional.</p></div>
  </Stack>;
}
