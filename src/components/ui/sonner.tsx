import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      offset={{ bottom: "1rem", right: "1rem" }}
      toastOptions={{
        style: {
          background: "var(--avd-bg-elev)",
          border: "1px solid var(--avd-border)",
          color: "var(--avd-fg)",
          fontFamily: "var(--avd-font-sans)",
          borderRadius: "var(--avd-radius-lg)",
          boxShadow: "var(--avd-shadow-lg)",
        },
        classNames: {
          description: "group-[.toast]:opacity-70",
          actionButton: "group-[.toast]:bg-[var(--avd-brand-500)] group-[.toast]:text-white",
          cancelButton: "group-[.toast]:bg-[var(--avd-bg-sunken)] group-[.toast]:text-[var(--avd-fg-muted)]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
