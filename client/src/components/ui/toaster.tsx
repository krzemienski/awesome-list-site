import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          // BUG-052 (run26): toasts carrying an action must not vanish before
          // the action can be used (WCAG 2.2.1) — they persist until dismissed
          // (swipe, Esc/F6 hotkey, close button, or clicking the action).
          // Plain informational toasts keep the default auto-dismiss.
          <Toast
            key={id}
            {...props}
            duration={props.duration ?? (action ? Infinity : undefined)}
          >
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            {/* Persistent (actionable) toasts always show the close button —
                hover-only affordances don't exist on touch. */}
            <ToastClose
              className={action ? "opacity-100 pointer-events-auto" : undefined}
            />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
