import clsx from 'clsx';
import { ElementType, ReactNode } from 'react';

type ButtonProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
} & Omit<React.ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>;

const variantStyles: Record<string, string> = {
  primary: 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100',
  secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800',
  ghost: 'bg-transparent text-slate-900 hover:bg-slate-100 dark:text-white dark:hover:bg-slate-700',
};

const sizeStyles: Record<string, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-3 text-base',
  lg: 'px-6 py-4 text-lg',
};

export function Button<T extends ElementType = 'button'>({
  as,
  children,
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonProps<T>) {
  const Component = as || 'button';
  return (
    <Component
      className={clsx(
        'inline-flex items-center justify-center rounded-full font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none disabled:hover:bg-inherit dark:focus-visible:ring-white dark:disabled:opacity-40',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
