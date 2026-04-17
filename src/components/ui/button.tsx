import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Button as HeroButton } from "@heroui/react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_12px_24px_-14px_rgba(2,132,199,0.85)] hover:bg-primary/90",
        success:
          "bg-success text-success-foreground hover:bg-success/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    if (asChild) {
      const Comp = Slot
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        />
      )
    }

    const heroVariantMap: Record<NonNullable<ButtonProps["variant"]>, "solid" | "bordered" | "flat" | "light"> = {
      default: "solid",
      success: "solid",
      destructive: "solid",
      outline: "bordered",
      secondary: "flat",
      ghost: "light",
      link: "light",
    }

    const heroColorMap: Record<NonNullable<ButtonProps["variant"]>, "primary" | "danger" | "default"> = {
      default: "primary",
      success: "default",
      destructive: "danger",
      outline: "default",
      secondary: "default",
      ghost: "default",
      link: "primary",
    }

    const heroSizeMap: Record<NonNullable<ButtonProps["size"]>, "sm" | "md" | "lg"> = {
      sm: "sm",
      default: "md",
      lg: "lg",
      icon: "md",
    }

    const mergedClassName = cn(
      "group transition-all duration-200 motion-reduce:transition-none active:scale-[0.98]",
      size === "icon" && "h-10 w-10 min-w-10 rounded-full px-0",
      variant === "link" && "bg-transparent p-0 underline-offset-4 hover:underline",
      variant === "default" && "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_14px_26px_-14px_rgba(14,116,144,0.9)] hover:from-cyan-400 hover:to-blue-500",
      variant === "success" && "bg-emerald-600 text-white hover:bg-emerald-500",
      variant === "destructive" && "bg-rose-600 text-white hover:bg-rose-500",
      variant !== "link" && "font-semibold",
      className,
    )

    return (
      <HeroButton
        ref={ref}
        variant={heroVariantMap[variant ?? "default"]}
        color={heroColorMap[variant ?? "default"]}
        size={heroSizeMap[size ?? "default"]}
        radius="full"
        className={mergedClassName}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
