import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'danger' | 'secondary' | 'link';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      default: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/20 active:translate-y-[1px]',
      outline: 'border border-surface-200 bg-white hover:bg-surface-50 text-ink-700 shadow-sm active:translate-y-[1px]',
      ghost: 'hover:bg-surface-100 text-ink-600 hover:text-ink-900',
      danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-600/20',
      secondary: 'bg-surface-100 text-ink-900 hover:bg-surface-200 shadow-sm border border-transparent',
      link: 'text-brand-600 underline-offset-4 hover:underline p-0 h-auto font-normal',
    };

    const sizes = {
      xs: 'h-7 px-2 text-xs rounded-md',
      sm: 'h-8 px-3 text-sm rounded-lg',
      md: 'h-9 px-3.5 py-2 text-sm rounded-lg',
      lg: 'h-10 px-5 text-sm rounded-xl',
      icon: 'h-9 w-9 p-0 rounded-lg',
    };

    return (
      <button
        className={cn(
          'inline-flex items-center justify-center font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button };
