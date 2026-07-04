import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-11 w-full rounded-xl border border-sand-deep bg-paper px-3.5 text-sm text-ink",
          "placeholder:text-ink-soft/60 transition",
          "focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/15",
          className
        )}
        {...props}
      />
    );
  }
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-sand-deep bg-paper px-3.5 py-2.5 text-sm text-ink",
        "placeholder:text-ink-soft/60 transition",
        "focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/15",
        className
      )}
      {...props}
    />
  );
});

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft", className)}
      {...props}
    />
  );
}

export function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="mt-2 text-sm text-red-700 dark:text-red-400">{children}</p>;
}
