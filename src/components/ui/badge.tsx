import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Chip } from "@heroui/react"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  const chipVariantMap: Record<NonNullable<BadgeProps["variant"]>, "solid" | "flat" | "bordered"> = {
    default: "solid",
    secondary: "flat",
    destructive: "solid",
    outline: "bordered",
  }

  const chipColorMap: Record<NonNullable<BadgeProps["variant"]>, "primary" | "default" | "danger"> = {
    default: "primary",
    secondary: "default",
    destructive: "danger",
    outline: "default",
  }

  return (
    <Chip
      variant={chipVariantMap[variant ?? "default"]}
      color={chipColorMap[variant ?? "default"]}
      radius="full"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
