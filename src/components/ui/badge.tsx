import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-border bg-secondary text-foreground",
        secondary: "border-border bg-secondary text-muted-foreground",
        destructive: "border-status-fail-border bg-status-fail-bg text-status-fail",
        outline: "border-border text-foreground",
        pass: "border-status-pass-border bg-status-pass-bg text-status-pass",
        flag: "border-status-flag-border bg-status-flag-bg text-status-flag",
        fail: "border-status-fail-border bg-status-fail-bg text-status-fail",
        new: "border-status-new-border bg-status-new-bg text-status-new",
        "in-progress": "border-status-in-progress-border bg-status-in-progress-bg text-status-in-progress",
        high: "border-status-fail-border bg-status-fail-bg text-status-fail",
        medium: "border-status-flag-border bg-status-flag-bg text-status-flag",
        low: "border-status-new-border bg-status-new-bg text-status-new",
        refer: "border-status-fail-border bg-background text-status-fail",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
