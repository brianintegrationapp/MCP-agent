import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: "default" | "outline" | "destructive" | "ghost";
  size?: "default" | "sm";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      asChild = false,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-blue-500 text-white hover:bg-blue-600": variant === "default",
            "border border-gray-300 bg-transparent hover:bg-gray-50":
              variant === "outline",
            "bg-red-500 text-white hover:bg-red-600": variant === "destructive",
            "bg-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-900":
              variant === "ghost",
            "h-[2.25rem] px-4 py-2": size === "default",
            "h-8 px-3 text-sm": size === "sm",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
