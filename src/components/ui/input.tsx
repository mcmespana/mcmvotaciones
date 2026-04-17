import * as React from "react"
import { Input as HeroInput } from "@heroui/react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <HeroInput
        type={type}
        variant="bordered"
        radius="full"
        size="md"
        className={cn("w-full", className)}
        classNames={{
          inputWrapper:
            "rounded-full border border-[hsl(var(--field-border))] bg-[hsl(var(--field-background)/0.9)] backdrop-blur-sm transition-all duration-200 motion-reduce:transition-none data-[hover=true]:border-primary/60 group-data-[focus=true]:border-primary group-data-[focus=true]:shadow-[0_0_0_3px_hsl(var(--focus)/0.22)]",
          input: "text-[hsl(var(--field-foreground))] placeholder:text-[hsl(var(--field-placeholder))]",
        }}
        ref={ref as React.Ref<HTMLInputElement>}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
