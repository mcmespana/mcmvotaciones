import * as React from "react"
import { TextArea as HeroTextarea } from "@heroui/react"

import { cn } from "@/lib/utils"

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <HeroTextarea
        variant="bordered"
        radius="lg"
        minRows={3}
        className={cn("w-full", className)}
        classNames={{
          inputWrapper: "rounded-3xl border-input bg-input/70 backdrop-blur-sm",
        }}
        ref={ref as React.Ref<HTMLTextAreaElement>}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
