import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-[15px] font-bold tracking-[0.02em] ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 shadow-[0_2px_4px_rgba(0,0,0,0.05)] border border-transparent select-none",
  {
    variants: {
      variant: {
        default: "bg-zinc-900 border-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:border-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-md",
        primary: "bg-indigo-600 border-indigo-700 text-white hover:bg-indigo-700 shadow-[0_4px_14px_0_rgba(79,70,229,0.39)]",
        success: "bg-emerald-600 border-emerald-700 text-white shadow-[0_4px_14px_0_rgba(5,150,105,0.39)] hover:bg-emerald-700",
        destructive: "bg-rose-600 border-rose-700 text-white shadow-[0_4px_14px_0_rgba(225,29,72,0.39)] hover:bg-rose-700",
        outline: "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900 shadow-sm",
        secondary: "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900",
        ghost: "border-transparent bg-transparent hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 shadow-none",
        link: "border-transparent bg-transparent text-indigo-600 underline-offset-4 hover:underline shadow-none",
      },
      size: {
        default: "h-12 px-6 py-2.5",
        sm: "h-9 px-4 text-xs",
        lg: "h-14 px-8 text-base",
        icon: "h-12 w-12",
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
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
