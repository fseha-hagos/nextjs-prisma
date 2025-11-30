"use client"

import { Toast, ToastViewport } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastViewport>
      {toasts.map(({ id, title, description, action, ...props }) => (
        <Toast
          key={id}
          id={id}
          title={title}
          description={description}
          action={action}
          {...props}
        />
      ))}
    </ToastViewport>
  )
}
