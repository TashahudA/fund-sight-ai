import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        pass: "border-transparent bg-status-pass/15 text-status-pass",
        flag: "border-transparent bg-status-flag/15 text-status-flag",
        fail: "border-transparent bg-status-fail/15 text-status-fail",
        new: "border-transparent bg-status-new/15 text-status-new",
        "in-progress": "border-transparent bg-status-in-progress/15 text-status-in-progress",
        high: "border-transparent bg-status-fail/15 text-status-fail",
        medium: "border-transparent bg-status-flag/15 text-status-flag",
        low: "border-transparent bg-status-new/15 text-status-new",
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
