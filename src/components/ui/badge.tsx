import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-secondary-border bg-secondary text-secondary-foreground",
        outline: "text-foreground/80 border-border bg-background",
        success: "border-primary/25 bg-primary/8 text-primary",
        warning:
          "border-accent/35 bg-accent/10 text-foreground dark:border-accent/40 dark:bg-accent/12",
        executive:
          "border-accent/45 bg-accent/14 text-accent-foreground tracking-wide dark:border-accent/50 dark:bg-accent/16",
        danger:
          "border-red-200/80 bg-red-50/80 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
        muted: "border-border/60 bg-muted/60 text-muted-foreground normal-case tracking-normal",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}