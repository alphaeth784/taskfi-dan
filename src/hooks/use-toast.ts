<<<<<<< HEAD
import * as React from "react"

type ToasterToast = {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  variant?: 'default' | 'destructive'
  duration?: number
}

const toastQueue: ToasterToast[] = []
const listeners: Array<(toast: ToasterToast) => void> = []
let memoryToasts: ToasterToast[] = []

function genId() {
  return Math.random().toString(36).substr(2, 9)
}

function addToQueue(toast: ToasterToast) {
  toastQueue.push(toast)
  listeners.forEach((listener) => {
    listener(toast)
  })
}

function removeFromQueue(id: string) {
  const index = toastQueue.findIndex((t) => t.id === id)
  if (index > -1) {
    toastQueue.splice(index, 1)
  }
  
  const memoryIndex = memoryToasts.findIndex((t) => t.id === id)
  if (memoryIndex > -1) {
    memoryToasts.splice(memoryIndex, 1)
  }
}

type Toast = Omit<ToasterToast, "id">

function toast_({
  title,
  description,
  action,
  variant = "default",
  ...props
}: Toast) {
  const id = genId()

  const newToast: ToasterToast = {
    id,
    title,
    description,
    action,
    variant,
    ...props,
  }

  memoryToasts = [newToast, ...memoryToasts]
  addToQueue(newToast)

  return {
    id,
    dismiss: () => removeFromQueue(id),
    update: (toast: Partial<Toast>) => {
      const index = memoryToasts.findIndex((t) => t.id === id)
      if (index > -1) {
        memoryToasts[index] = { ...memoryToasts[index], ...toast }
        listeners.forEach((listener) => {
          listener(memoryToasts[index])
        })
      }
    },
  }
}

export function useToast() {
  const [toasts, setToasts] = React.useState<ToasterToast[]>(memoryToasts)

  React.useEffect(() => {
    const listener = (toast: ToasterToast) => {
      setToasts((toasts) => [toast, ...toasts])
    }

    listeners.push(listener)
    return () => {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [])

  return {
    toasts,
    toast: toast_,
    dismiss: (toastId?: string) => {
      if (toastId) {
        removeFromQueue(toastId)
        setToasts((toasts) => toasts.filter((t) => t.id !== toastId))
      } else {
        setToasts([])
        memoryToasts = []
        toastQueue.length = 0
      }
    },
  }
}

export { toast_ as toast }
=======
import * as React from "react"\nimport { toast } from "sonner"\n\ntype ToasterToast = {\n  id: string\n  title?: React.ReactNode\n  description?: React.ReactNode\n  action?: React.ReactNode\n  variant?: 'default' | 'destructive'\n  duration?: number\n}\n\nconst toastQueue: ToasterToast[] = []\n\nconst listeners: Array<(toast: ToasterToast) => void> = []\n\nlet memoryToasts: ToasterToast[] = []\n\nfunction genId() {\n  return Math.random().toString(36).substr(2, 9)\n}\n\nfunction addToQueue(toast: ToasterToast) {\n  toastQueue.push(toast)\n  listeners.forEach((listener) => {\n    listener(toast)\n  })\n}\n\nfunction removeFromQueue(id: string) {\n  const index = toastQueue.findIndex((t) => t.id === id)\n  if (index > -1) {\n    toastQueue.splice(index, 1)\n  }\n  \n  const memoryIndex = memoryToasts.findIndex((t) => t.id === id)\n  if (memoryIndex > -1) {\n    memoryToasts.splice(memoryIndex, 1)\n  }\n}\n\ntype Toast = Omit<ToasterToast, \"id\">\n\nfunction toast_({\n  title,\n  description,\n  action,\n  variant = \"default\",\n  ...props\n}: Toast) {\n  const id = genId()\n\n  const newToast: ToasterToast = {\n    id,\n    title,\n    description,\n    action,\n    variant,\n    ...props,\n  }\n\n  memoryToasts = [newToast, ...memoryToasts]\n  addToQueue(newToast)\n\n  return {\n    id,\n    dismiss: () => removeFromQueue(id),\n    update: (toast: Partial<Toast>) => {\n      const index = memoryToasts.findIndex((t) => t.id === id)\n      if (index > -1) {\n        memoryToasts[index] = { ...memoryToasts[index], ...toast }\n        listeners.forEach((listener) => {\n          listener(memoryToasts[index])\n        })\n      }\n    },\n  }\n}\n\nfunction useToast() {\n  const [toasts, setToasts] = React.useState<ToasterToast[]>(memoryToasts)\n\n  React.useEffect(() => {\n    const listener = (toast: ToasterToast) => {\n      setToasts((toasts) => [toast, ...toasts])\n    }\n\n    listeners.push(listener)\n    return () => {\n      const index = listeners.indexOf(listener)\n      if (index > -1) {\n        listeners.splice(index, 1)\n      }\n    }\n  }, [])\n\n  return {\n    toasts,\n    toast: toast_,\n    dismiss: (toastId?: string) => {\n      if (toastId) {\n        removeFromQueue(toastId)\n        setToasts((toasts) => toasts.filter((t) => t.id !== toastId))\n      } else {\n        setToasts([])\n        memoryToasts = []\n        toastQueue.length = 0\n      }\n    },\n  }\n}\n\nexport { useToast, toast_ as toast }
>>>>>>> 086f6fceb3488d1131148f9ebcdfb1e742b995ce
