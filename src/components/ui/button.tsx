"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
<<<<<<< HEAD
=======
import { Loader2 } from "lucide-react"
>>>>>>> 086f6fceb3488d1131148f9ebcdfb1e742b995ce

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
<<<<<<< HEAD
        gradient: "bg-gradient-to-r from-purple-500 to-blue-600 text-white hover:from-purple-600 hover:to-blue-700",
=======
        gradient: "bg-gradient-to-r from-purple-500 to-blue-600 text-white hover:from-purple-600 hover:to-blue-700 shadow-lg",
>>>>>>> 086f6fceb3488d1131148f9ebcdfb1e742b995ce
        web3: "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
<<<<<<< HEAD
=======
        xl: "h-12 rounded-lg px-10 text-lg",
>>>>>>> 086f6fceb3488d1131148f9ebcdfb1e742b995ce
        icon: "h-9 w-9",
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
<<<<<<< HEAD
  ({ className, variant, size, asChild = false, ...props }, ref) => {
=======
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
>>>>>>> 086f6fceb3488d1131148f9ebcdfb1e742b995ce
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
<<<<<<< HEAD
      />
=======
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </Comp>
>>>>>>> 086f6fceb3488d1131148f9ebcdfb1e742b995ce
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }