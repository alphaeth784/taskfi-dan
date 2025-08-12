import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
<<<<<<< HEAD
}

// Generate secure nonce for wallet verification
export function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
=======
>>>>>>> 086f6fceb3488d1131148f9ebcdfb1e742b995ce
}