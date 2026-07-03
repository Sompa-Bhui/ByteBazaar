import clsx from 'clsx';

export function SectionHeading({
  title,
  subtitle,
  className,
}: {
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={clsx('space-y-2', className)}>
      <h2 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{title}</h2>
      {subtitle ? <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">{subtitle}</p> : null}
    </div>
  );
}
