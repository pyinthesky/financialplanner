import { useState } from 'react';
import { SavingsIllustration } from '@/components/savings-illustration';
import { ExternalLink, Search } from 'lucide-react';
import { ActionRow, PlannerCard, Stack } from '@/components/ui/planner-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { findGuides, KNOWLEDGE_CATEGORIES, KNOWLEDGE_REVIEWED, type KnowledgeCategory } from '@/lib/knowledge';

export function KnowledgeCenter() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<KnowledgeCategory>('All Topics');
  const guides = findGuides(query, category);
  return <Stack className="knowledge-center">
    <header className="section-heading"><div><h1>Knowledge Center</h1><p>Build confidence, one question at a time. Short guides, practical next steps and sources you can check.</p></div></header>
    <SavingsIllustration/>
    <PlannerCard stack>
      <label className="grid min-w-0 gap-2 text-sm font-medium" htmlFor="knowledge-search">What Would You Like to Understand?
        <span className="relative min-w-0"><Search aria-hidden="true" size={18} className="pointer-events-none absolute top-3 left-3 text-muted-foreground"/><Input id="knowledge-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try HSA, advisor fees, debt or a will" className="min-h-11 pl-10"/></span>
      </label>
      <ActionRow role="group" aria-label="Knowledge Topics">{KNOWLEDGE_CATEGORIES.map(value=><Button key={value} variant={category===value?'default':'outline'} aria-pressed={category===value} onClick={()=>setCategory(value)}>{value}</Button>)}</ActionRow>
      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">{guides.length} {guides.length===1?'guide':'guides'} · General U.S. education · Reviewed September 12, 2026</p>
    </PlannerCard>
    <div className="grid min-w-0 gap-3" aria-label="Knowledge Guides">{guides.map(guide=><PlannerCard as="details" key={guide.id} className="group" data-guide={guide.id}>
      <summary className="cursor-pointer rounded-sm text-base font-semibold leading-6 outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"><span>{guide.title}</span><span className="mt-1 block text-sm font-normal leading-5 text-muted-foreground">{guide.summary}</span></summary>
      <div className="mt-4 grid min-w-0 gap-4 border-t border-border pt-4 text-sm leading-6">
        <ul className="grid list-disc gap-3 pl-5">{guide.points.map(point=><li key={point}>{point}</li>)}</ul>
        <div className="rounded-lg bg-secondary p-3"><h2 className="font-semibold">One Useful Next Step</h2><p>{guide.next}</p></div>
        <p><strong>In This Planner: </strong>{guide.inPlanner}</p>
        <div className="grid gap-2"><h2 className="font-semibold">Sources & Scope</h2>{guide.sources.map(source=><div key={source.url}><a className="inline-flex min-h-11 max-w-full items-center gap-2 text-primary underline underline-offset-4" href={source.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><span className="min-w-0 break-words">{source.label}</span><ExternalLink size={14} className="shrink-0" aria-hidden="true"/><span className="sr-only">(opens an external site in a new tab)</span></a><p className="text-xs text-muted-foreground">{source.edition}</p></div>)}<p className="text-xs text-muted-foreground">Reviewed <time dateTime={KNOWLEDGE_REVIEWED}>September 12, 2026</time>. Source review is not a promise that rules will remain unchanged.</p></div>
      </div>
    </PlannerCard>)}</div>
    {!guides.length&&<PlannerCard stack><p>No matching guides. Try a shorter search or another topic.</p><ActionRow><Button variant="outline" onClick={()=>{setQuery('');setCategory('All Topics');}}>Clear Search and Filters</Button></ActionRow></PlannerCard>}
    <p className="text-xs leading-5 text-muted-foreground">Reading and searching happen here on your device. Source links open external websites only when selected; no search text or plan data is attached. These guides explain decisions and questions to ask, rather than selecting investments, legal documents or medical treatment for you.</p>
  </Stack>;
}
