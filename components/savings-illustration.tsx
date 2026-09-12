import { useEffect, useId, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormGrid, PlannerCard } from '@/components/ui/planner-layout';
import { savingsHorizon } from '@/lib/savings-illustration';

export function SavingsIllustration() {
  const [active, setActive] = useState(false);
  const [saving, setSaving] = useState(25);
  const [growth, setGrowth] = useState(5);
  const [withdrawal, setWithdrawal] = useState(4);
  const id = useId();
  const chart = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(640);
  useEffect(() => {
    if (!active || !chart.current) return;
    const observer = new ResizeObserver(entries => setChartWidth(Math.max(200, Math.round(entries[0].contentRect.width))));
    observer.observe(chart.current);
    return () => observer.disconnect();
  }, [active]);
  const chartHeight = Math.max(240, Math.min(340, chartWidth / 2));
  const left = 44, right = chartWidth - 12, bottom = chartHeight - 44;
  const years = savingsHorizon(saving, growth, withdrawal)!;
  const next = savingsHorizon(Math.min(95, saving + 5), growth, withdrawal)!;
  const points = Array.from({length:91}, (_, i) => ({saving:i+5, years:savingsHorizon(i+5,growth,withdrawal)!}));
  const ceiling = Math.ceil(points[0].years / 10) * 10;
  const x = (rate:number) => left+(rate-5)/90*(right-left);
  const y = (horizon:number) => bottom-horizon/ceiling*(bottom-28);
  const path = points.map((p,i)=>`${i?'L':'M'}${x(p.saving).toFixed(2)},${y(p.years).toFixed(2)}`).join(' ');
  return <PlannerCard stack data-savings-illustration>
    <div><h2 className="flex items-center gap-2 text-lg font-semibold"><Sparkles size={20} className="shrink-0 text-primary" aria-hidden="true"/>Small Changes, More Possibility</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Explore how a savings habit can change the time needed to fund everyday spending.</p></div>
    {!active ? <div><Button onClick={()=>setActive(true)}>Explore the Savings Curve</Button><p className="mt-2 text-xs text-muted-foreground">Loads a separate illustration with 25% saving, 5% real return and a 4% withdrawal assumption. Your plan stays unchanged.</p></div> : <>
      <FormGrid>
        <label className="grid gap-2 text-sm font-medium" htmlFor={`${id}-saving`}>Savings Rate: {saving}%<input id={`${id}-saving`} aria-label="Illustration Savings Rate" type="range" min={5} max={95} step={1} value={saving} onChange={e=>setSaving(Number(e.target.value))} className="min-h-11 w-full accent-primary"/></label>
        <div className="rounded-lg bg-secondary p-3" role="status" aria-live="polite"><p className="text-2xl font-semibold tabular-nums">About {years.toFixed(1)} Years</p><p className="text-xs leading-5">To the illustration’s portfolio target, starting with no investments.</p></div>
      </FormGrid>
      <p className="text-xs text-muted-foreground">Illustration: {growth}% annual return after inflation · {withdrawal}% initial withdrawal assumption · No starting investments</p>
      <div ref={chart} className="min-w-0"><svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-labelledby={`${id}-title ${id}-desc`} className="block h-auto w-full min-w-0 rounded-lg bg-secondary/40">
        <title id={`${id}-title`}>Savings Rate and Years to a Portfolio Target</title>
        <desc id={`${id}-desc`}>At {saving}% saving, the illustrative horizon is {years.toFixed(1)} years. Higher saving reduces the horizon under these assumptions. The vertical axis spans zero to {ceiling} years.</desc>
        {[0,1,2,3,4].map(i=>{const n=ceiling*i/4;return <g key={i}><line x1={left} x2={right} y1={y(n)} y2={y(n)} stroke="var(--border)"/><text x={left-8} y={y(n)+4} textAnchor="end" fontSize={12} fill="var(--muted-foreground)">{Math.round(n)}</text></g>;})}
        <text x={left} y={16} fontSize={12} fill="var(--muted-foreground)">Years to Target</text>
        <path d={`${path} L${right},${bottom} L${left},${bottom} Z`} fill="var(--primary)" opacity={0.08}/>
        <path d={path} fill="none" stroke="var(--primary)" strokeWidth={3}/>
        <line x1={x(saving)} x2={x(saving)} y1={y(years)} y2={bottom} stroke="var(--primary)" strokeDasharray="4 4"/>
        <circle cx={x(saving)} cy={y(years)} r={6} fill="var(--primary)" stroke="white" strokeWidth={2}/>
        {[5,25,50,75,95].map(rate=><text key={rate} x={x(rate)} y={bottom+20} textAnchor="middle" fontSize={12} fill="var(--muted-foreground)">{rate}%</text>)}
        <text x={(left+right)/2} y={chartHeight-4} textAnchor="middle" fontSize={12} fill="var(--muted-foreground)">Savings Rate</text>
      </svg></div>
      <p className="text-sm leading-6">For each $100 of income after taxes and before saving, this example invests ${saving} and spends ${100-saving}. {saving<95?`Increasing saving to ${Math.min(95,saving+5)}% reduces the illustrative horizon by ${(years-next).toFixed(1)} years. `:''}Saving more by spending less both adds to investments and lowers the spending target.</p>
      <details><summary className="min-h-11 cursor-pointer text-sm font-semibold">Adjust the Illustration Assumptions</summary><FormGrid>
        <label className="grid gap-2 text-sm" htmlFor={`${id}-growth`}>Annual Return After Inflation: {growth}%<input id={`${id}-growth`} aria-label="Illustration Real Return" type="range" min={0} max={8} step={0.5} value={growth} onChange={e=>setGrowth(Number(e.target.value))} className="min-h-11 w-full accent-primary"/></label>
        <label className="grid gap-2 text-sm" htmlFor={`${id}-withdrawal`}>Initial Withdrawal Assumption: {withdrawal}%<input id={`${id}-withdrawal`} aria-label="Illustration Withdrawal Rate" type="range" min={2} max={6} step={0.25} value={withdrawal} onChange={e=>setWithdrawal(Number(e.target.value))} className="min-h-11 w-full accent-primary"/></label>
      </FormGrid><p className="mt-3 text-xs leading-5 text-muted-foreground">Income and spending stay constant after inflation; savings are invested at year end. Target = annual spending ÷ withdrawal rate. Fractional years interpolate the annual formula. This model leaves out pensions, Social Security, taxes on withdrawals, account access and changing costs. Constant returns hide market risk; reaching this target does not establish a safe withdrawal rate or guarantee lifelong funding. Use your budgets and Scenario Laboratory for the fuller picture.</p></details>
    </>}
    <p className="text-xs leading-5 text-muted-foreground">Inspired by <a className="text-primary underline" href="https://www.mrmoneymustache.com/2012/01/13/the-shockingly-simple-math-behind-early-retirement/" target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Mr. Money Mustache’s savings-rate article (January 13, 2012; external site)</a>. Independently drawn and calculated here. The article’s example rates are illustrative, not forecasts.</p>
  </PlannerCard>;
}
