"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { AiAssistantPanel } from "@/components/ai/ai-assistant-panel";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AiAssistantButtonProps {
  className?: string;
}

export function AiAssistantButton({ className }: AiAssistantButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "fixed bottom-6 right-6 z-50",
                className
              )}
            >
              {/* Outer pulse ring */}
              <span
                className="absolute inset-0 rounded-full bg-emerald-400 opacity-30 animate-ping"
                aria-hidden
              />
              {/* Secondary glow */}
              <span
                className="absolute inset-1 rounded-full bg-emerald-300 opacity-20 animate-pulse"
                aria-hidden
              />

              <button
                onClick={() => setOpen(true)}
                aria-label="Ouvrir l'assistant IA"
                className={cn(
                  "relative flex items-center justify-center",
                  "h-14 w-14 rounded-full",
                  "bg-gradient-to-br from-emerald-500 to-emerald-700",
                  "text-white shadow-lg shadow-emerald-500/30",
                  "hover:shadow-xl hover:shadow-emerald-500/40",
                  "hover:scale-105 active:scale-95",
                  "transition-all duration-200 ease-out",
                  "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                )}
              >
                <Sparkles className="h-6 w-6" />
              </button>
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="left"
            className="bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg"
          >
            Demander à l'IA
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <AiAssistantPanel open={open} onOpenChange={setOpen} />
    </>
  );
}
