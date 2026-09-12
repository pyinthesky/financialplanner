import { createElement, type HTMLAttributes, type Ref } from 'react';
import { cn } from '@/lib/utils';

type LayoutProps = HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'section' | 'main' | 'header' | 'details' | 'fieldset';
  open?: boolean;
  stack?: boolean;
  ref?: Ref<HTMLElement>;
};

/** Shared screen-layout primitives. Keep print reports on their dedicated layout. */
export function PageContent({ as = 'main', className, ...props }: LayoutProps) {
  return createElement(as, { ...props, 'data-layout': 'content', className: cn(
    '@container/planner mx-auto w-full min-w-0 max-w-[1440px] p-3 md:p-5 xl:p-8', className,
  ) });
}

export function Stack({ as = 'div', className, ...props }: LayoutProps) {
  return createElement(as, { ...props, 'data-layout': 'stack', className: cn(
    'grid min-w-0 grid-cols-1 gap-3 md:gap-4 [&>*]:min-w-0 [&>*]:max-w-full [&>*]:my-0!', className,
  ) });
}

export function PlannerCard({ as = 'section', className, stack = false, ...props }: LayoutProps) {
  return createElement(as, { ...props, 'data-layout': 'card', className: cn(
    '@container min-w-0 rounded-xl border border-border bg-white p-3 md:p-4 xl:p-5',
    stack && 'grid grid-cols-1 gap-3 md:gap-4 [&>*]:min-w-0 [&>*]:my-0!', className,
  ) });
}

/** Query the card width, so a narrow desktop column behaves like a mobile card. */
export function FormGrid({ as = 'div', className, single = false, ...props }: LayoutProps & { single?: boolean }) {
  return createElement(as, { ...props, 'data-layout': 'form', className: cn(
    'grid min-w-0 grid-cols-1 items-start gap-3 [&>*]:min-w-0',
    !single && '@min-[30rem]:grid-cols-2', className,
  ) });
}

export function ColumnGrid({ as = 'div', className, columns = 2, ...props }: LayoutProps & { columns?: 2 | 3 }) {
  return createElement(as, { ...props, 'data-layout': 'columns', className: cn(
    'grid min-w-0 grid-cols-1 items-start gap-3 md:gap-4 [&>*]:min-w-0',
    columns === 3 ? '@min-[60rem]/planner:grid-cols-3' : '@min-[48rem]/planner:grid-cols-2', className,
  ) });
}

export function ActionRow({ as = 'div', className, ...props }: LayoutProps) {
  return createElement(as, { ...props, 'data-layout': 'actions', className: cn(
    'flex min-w-0 flex-wrap items-center gap-2 [&>*]:min-w-0 [&>*]:max-w-full',
    '[&>button]:h-auto [&>button]:min-h-11 [&>button]:whitespace-normal [&>button]:py-2', className,
  ) });
}
