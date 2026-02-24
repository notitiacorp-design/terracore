"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  error?: boolean;
  errorMessage?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, startIcon, endIcon, error, errorMessage, ...props }, ref) => {
    const hasStartIcon = Boolean(startIcon);
    const hasEndIcon = Boolean(endIcon);

    return (
      <div className="w-full">
        <div className="relative">
          {hasStartIcon && (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {startIcon}
            </div>
          )}
          <input
            type={type}
            ref={ref}
            className={cn(
              "flex h-12 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground",
              "placeholder:text-muted-foreground",
              "ring-offset-background transition-all duration-150",
              "hover:border-primary/50",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-primary",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
              error && "border-destructive focus:ring-destructive",
              hasStartIcon && "pl-10",
              hasEndIcon && "pr-10",
              className
            )}
            {...props}
          />
          {hasEndIcon && (
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {endIcon}
            </div>
          )}
        </div>
        {error && errorMessage && (
          <p className="mt-1.5 text-xs text-destructive" role="alert">
            {errorMessage}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };