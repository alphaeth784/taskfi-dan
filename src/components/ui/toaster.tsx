<<<<<<< HEAD
"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
=======
"use client"\n\nimport {\n  Toast,\n  ToastClose,\n  ToastDescription,\n  ToastProvider,\n  ToastTitle,\n  ToastViewport,\n} from "@/components/ui/toast"\nimport { useToast } from "@/hooks/use-toast"\n\nexport function Toaster() {\n  const { toasts } = useToast()\n\n  return (\n    <ToastProvider>\n      {toasts.map(function ({ id, title, description, action, ...props }) {\n        return (\n          <Toast key={id} {...props}>\n            <div className="grid gap-1">\n              {title && <ToastTitle>{title}</ToastTitle>}\n              {description && (\n                <ToastDescription>{description}</ToastDescription>\n              )}\n            </div>\n            {action}\n            <ToastClose />\n          </Toast>\n        )\n      })}\n      <ToastViewport />\n    </ToastProvider>\n  )\n}\n
>>>>>>> 086f6fceb3488d1131148f9ebcdfb1e742b995ce
