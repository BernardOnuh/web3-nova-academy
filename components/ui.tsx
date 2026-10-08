// components/ui.tsx — Web3Nova UI kit shared by every page
"use client";

import Link from 'next/link';
import { forwardRef, useEffect, useId, type ComponentProps, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, Loader2, X, type LucideIcon } from 'lucide-react';
import { initials } from '@/lib/format';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/* ── Button ─────────────────────────────────────────────────── */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand hover:bg-brand-strong text-white shadow-[0_8px_24px_-10px_rgba(35,137,219,0.7)]',
  secondary: 'bg-surface-2 hover:bg-line text-gray-100 border border-line',
  ghost: 'text-muted hover:text-white hover:bg-white/5',
  danger: 'bg-danger/10 hover:bg-danger/20 text-danger border border-danger/25',
  gold: 'bg-gold hover:bg-gold-strong text-black',
};
const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2 rounded-xl',
};

interface ButtonOwnProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: LucideIcon;
}

const buttonClass = (variant: Variant, size: Size, extra?: string) =>
  cx(
    'inline-flex items-center justify-center font-semibold whitespace-nowrap transition-colors',
    'disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
    VARIANTS[variant],
    SIZES[size],
    extra,
  );

export const Button = forwardRef<HTMLButtonElement, ComponentProps<'button'> & ButtonOwnProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon: Icon, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  const iconSize = size === 'sm' ? 14 : 16;
  return (
    <button ref={ref} type={type} disabled={disabled || loading} className={buttonClass(variant, size, className)} {...rest}>
      {loading ? <Loader2 size={iconSize} className="animate-spin" /> : Icon && <Icon size={iconSize} />}
      {children}
    </button>
  );
});

export function ButtonLink({
  href, variant = 'primary', size = 'md', icon: Icon, className, children, ...rest
}: ComponentProps<typeof Link> & Omit<ButtonOwnProps, 'loading'>) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...rest}>
      {Icon && <Icon size={size === 'sm' ? 14 : 16} />}
      {children}
    </Link>
  );
}

export function IconButton({
  icon: Icon, label, tone = 'default', className, ...rest
}: ComponentProps<'button'> & { icon: LucideIcon; label: string; tone?: 'default' | 'danger' }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex size-8 items-center justify-center rounded-lg transition-colors',
        tone === 'danger' ? 'text-faint hover:text-danger hover:bg-danger/10' : 'text-muted hover:text-white hover:bg-white/5',
        className,
      )}
      {...rest}
    >
      <Icon size={16} />
    </button>
  );
}

/* ── Layout primitives ─────────────────────────────────────── */

export function Card({ className, padded = true, ...rest }: ComponentProps<'div'> & { padded?: boolean }) {
  return <div className={cx('glass rounded-2xl', padded && 'p-5 sm:p-6', className)} {...rest} />;
}

export function CardHeader({ title, description, action, icon: Icon }: { title: ReactNode; description?: ReactNode; action?: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand-soft">
            <Icon size={16} />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          {description && <p className="text-sm text-muted mt-0.5">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title, description, eyebrow, actions, back,
}: { title: ReactNode; description?: ReactNode; eyebrow?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-8">
      {back && (
        <Link href={back.href} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-white mb-4 transition-colors">
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold mb-2">{eyebrow}</p>}
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{title}</h1>
          {description && <p className="text-muted mt-1.5 max-w-2xl">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

export function StatCard({
  label, value, icon: Icon, tone = 'brand', href, hint, loading,
}: { label: string; value: ReactNode; icon: LucideIcon; tone?: 'brand' | 'gold' | 'success' | 'warning'; href?: string; hint?: ReactNode; loading?: boolean }) {
  const tones = {
    brand: 'bg-brand/10 text-brand-soft',
    gold: 'bg-gold/10 text-gold',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
  };
  const body = (
    <Card className={cx('h-full', href && 'transition-colors hover:border-brand/40')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-2 text-3xl font-bold text-white tabular-nums">
            {loading ? <Skeleton className="h-8 w-16" /> : value}
          </p>
          {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
        </div>
        <span className={cx('inline-flex size-10 shrink-0 items-center justify-center rounded-xl', tones[tone])}>
          <Icon size={20} />
        </span>
      </div>
    </Card>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}

/* ── Feedback ─────────────────────────────────────────────── */

export function Spinner({ className, size = 20 }: { className?: string; size?: number }) {
  return <Loader2 size={size} className={cx('animate-spin text-muted', className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <span className={cx('block animate-pulse rounded-md bg-white/5', className)} />;
}

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-24 text-muted" role="status">
      <Spinner /> <span className="text-sm">{label}</span>
    </div>
  );
}

const ALERT = {
  error: { cls: 'bg-danger/10 border-danger/25 text-danger', Icon: AlertCircle },
  success: { cls: 'bg-success/10 border-success/25 text-success', Icon: CheckCircle2 },
  info: { cls: 'bg-brand/10 border-brand/25 text-brand-soft', Icon: Info },
  warning: { cls: 'bg-warning/10 border-warning/25 text-warning', Icon: AlertCircle },
};

export function Alert({
  tone = 'error', children, onDismiss, className, action,
}: { tone?: keyof typeof ALERT; children: ReactNode; onDismiss?: () => void; className?: string; action?: ReactNode }) {
  const { cls, Icon } = ALERT[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cx('flex items-start gap-3 rounded-xl border px-4 py-3 text-sm', cls, className)}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">{children}</div>
      {action}
      {onDismiss && (
        <button type="button" aria-label="Dismiss" onClick={onDismiss} className="opacity-70 hover:opacity-100">
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon: Icon, title, description, action, className,
}: { icon: LucideIcon; title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx('flex flex-col items-center justify-center text-center px-6 py-14', className)}>
      <span className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-white/[0.03] border border-line text-faint">
        <Icon size={26} />
      </span>
      <p className="font-semibold text-gray-200">{title}</p>
      {description && <p className="mt-1 text-sm text-muted max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Loading / error / empty switch for a data block */
export function DataState({
  loading, error, onRetry, children,
}: { loading: boolean; error: string | null; onRetry?: () => void; children: ReactNode }) {
  if (loading) return <PageLoader />;
  if (error)
    return (
      <Alert tone="error" action={onRetry && <button onClick={onRetry} className="font-semibold underline underline-offset-2">Retry</button>}>
        {error}
      </Alert>
    );
  return <>{children}</>;
}

/* ── Badge ────────────────────────────────────────────────── */

const BADGES = {
  neutral: 'bg-white/5 text-gray-300 border-line',
  brand: 'bg-brand/10 text-brand-soft border-brand/25',
  gold: 'bg-gold/10 text-gold border-gold/25',
  success: 'bg-success/10 text-success border-success/25',
  warning: 'bg-warning/10 text-warning border-warning/25',
  danger: 'bg-danger/10 text-danger border-danger/25',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: keyof typeof BADGES; children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap', BADGES[tone], className)}>
      {children}
    </span>
  );
}

/* ── Form fields ──────────────────────────────────────────── */

const fieldBase =
  'w-full rounded-xl border border-line bg-ink/70 px-3.5 text-sm text-white placeholder:text-faint outline-none transition ' +
  'focus:border-brand focus:ring-3 focus:ring-brand/20 disabled:opacity-50 aria-[invalid=true]:border-danger';

interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  className?: string;
  children: (id: string) => ReactNode;
}

export function Field({ label, hint, error, className, children }: FieldProps) {
  const id = useId();
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-200">{label}</label>}
      {children(id)}
      {error ? <p className="mt-1.5 text-xs text-danger">{error}</p> : hint && <p className="mt-1.5 text-xs text-faint">{hint}</p>}
    </div>
  );
}

type Labelled = { label?: ReactNode; hint?: ReactNode; error?: string | null; wrapperClassName?: string };

export const Input = forwardRef<HTMLInputElement, ComponentProps<'input'> & Labelled & { icon?: LucideIcon }>(function Input(
  { label, hint, error, wrapperClassName, className, icon: Icon, ...rest },
  ref,
) {
  return (
    <Field label={label} hint={hint} error={error} className={wrapperClassName}>
      {id => (
        <div className="relative">
          {Icon && <Icon size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />}
          <input
            ref={ref}
            id={id}
            aria-invalid={!!error || undefined}
            className={cx(fieldBase, 'h-11', Icon && 'pl-10', className)}
            {...rest}
          />
        </div>
      )}
    </Field>
  );
});

export function Textarea({ label, hint, error, wrapperClassName, className, ...rest }: ComponentProps<'textarea'> & Labelled) {
  return (
    <Field label={label} hint={hint} error={error} className={wrapperClassName}>
      {id => <textarea id={id} aria-invalid={!!error || undefined} className={cx(fieldBase, 'py-2.5 min-h-24 resize-y', className)} {...rest} />}
    </Field>
  );
}

export function Select({ label, hint, error, wrapperClassName, className, children, ...rest }: ComponentProps<'select'> & Labelled) {
  return (
    <Field label={label} hint={hint} error={error} className={wrapperClassName}>
      {id => (
        <select id={id} aria-invalid={!!error || undefined} className={cx(fieldBase, 'h-11 pr-8', className)} {...rest}>
          {children}
        </select>
      )}
    </Field>
  );
}

export function FileInput({
  label, hint, error, wrapperClassName, file, ...rest
}: Omit<ComponentProps<'input'>, 'type'> & Labelled & { file?: File | null }) {
  return (
    <Field label={label} hint={hint} error={error} className={wrapperClassName}>
      {id => (
        <label
          htmlFor={id}
          className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line-strong bg-ink/50 px-4 py-3 text-sm text-muted transition-colors hover:border-brand/60 hover:text-gray-200"
        >
          <span className="rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand-soft">Choose file</span>
          <span className="truncate">{file ? file.name : 'No file selected'}</span>
          <input id={id} type="file" className="sr-only" {...rest} />
        </label>
      )}
    </Field>
  );
}

/* ── Table ────────────────────────────────────────────────── */

export function Table({ head, children, className }: { head: ReactNode[]; children: ReactNode; className?: string }) {
  return (
    <div className={cx('overflow-x-auto', className)}>
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-2/70 text-xs uppercase tracking-wider text-faint">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="px-5 py-3 font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export const Td = ({ className, ...rest }: ComponentProps<'td'>) => <td className={cx('px-5 py-3.5 align-middle', className)} {...rest} />;
export const Tr = ({ className, ...rest }: ComponentProps<'tr'>) => <tr className={cx('group transition-colors hover:bg-white/[0.02]', className)} {...rest} />;

/* ── Tabs ─────────────────────────────────────────────────── */

export function Tabs<T extends string>({
  tabs, value, onChange, className,
}: { tabs: { id: T; label: ReactNode; icon?: LucideIcon; count?: number }[]; value: T; onChange: (id: T) => void; className?: string }) {
  return (
    <div role="tablist" className={cx('flex gap-1 overflow-x-auto border-b border-line', className)}>
      {tabs.map(({ id, label, icon: Icon, count }) => {
        const active = id === value;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={cx(
              '-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
              active ? 'border-brand text-white' : 'border-transparent text-muted hover:text-gray-200',
            )}
          >
            {Icon && <Icon size={16} />}
            {label}
            {count !== undefined && (
              <span className={cx('rounded-full px-1.5 text-xs tabular-nums', active ? 'bg-brand/20 text-brand-soft' : 'bg-white/5 text-faint')}>{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── Modal ────────────────────────────────────────────────── */

export function Modal({
  open, onClose, title, description, children, footer, size = 'md',
}: { open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={cx('relative w-full max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-line bg-surface shadow-2xl animate-fade-up', widths[size])}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <IconButton icon={X} label="Close" onClick={onClose} />
        </div>
        <div className="px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </div>
  );
}

/* ── Avatar ───────────────────────────────────────────────── */

export function Avatar({ name, src, size = 36, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const style = { width: size, height: size };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- Cloudinary URLs, any host
    return <img src={src} alt={name} style={style} className={cx('shrink-0 rounded-full object-cover border border-line', className)} />;
  }
  return (
    <span
      style={{ ...style, fontSize: Math.max(10, size * 0.36) }}
      className={cx('inline-flex shrink-0 items-center justify-center rounded-full border border-brand/25 bg-gradient-to-br from-brand/30 to-gold/20 font-semibold text-white', className)}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
