"use client"

import * as React from "react"
import * as Checkbox from "@radix-ui/react-checkbox"
import { cn } from "@/lib/utils"

const CheckboxComponent = React.forwardRef<
  React.ElementRef<typeof Checkbox.Root>,
  React.ComponentPropsWithoutRef<typeof Checkbox.Root>
>(({ className, ...props }, ref) => (
  <Checkbox.Root
    ref={ref}
    className={cn(
      "flex h-4 w-4 appearance-none items-center justify-center rounded border border-gray-300 outline-none hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-blue-500 data-[state=checked]:bg-blue-500",
      className
    )}
    {...props}
  >
    <Checkbox.Indicator className="text-white">
      <svg
        width="10"
        height="8"
        viewBox="0 0 10 8"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M9 1L3.5 6.5L1 4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Checkbox.Indicator>
  </Checkbox.Root>
))

CheckboxComponent.displayName = "Checkbox"

export { CheckboxComponent as Checkbox } 