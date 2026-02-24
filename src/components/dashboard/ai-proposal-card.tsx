"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, X, Check, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const AGENT_TYPE_LABELS: Record<string, string> = {
  pricing: "Tarification",
  scheduling: "Planification",
  margin: "Analyse marge",
  client: "Relation client",
  forecast: "Prévision",
  optimization: "Optimisation",
  default: "IA TerraCore",
};

interface AiProposalCardProps {
  title: string;
  description: string;
  agentType?: string;
  actionLabel?: string;
  onAccept?: () => void;
  onDismiss?: () => void;
  createdAt?: string | Date;
  isLoading?: boolean;
}

export function AiProposalCard({
  title,
  description,
  agentType = "default",
  actionLabel = "Appliquer",
  onAccept,
  onDismiss,
  createdAt,
  isLoading = false,
}: AiProposalCardProps) {
  const agentLabel =
    AGENT_TYPE_LABELS[agentType] || AGENT_TYPE_LABELS["default"];

  const timeAgo = createdAt
    ? formatDistanceToNow(new Date(createdAt), {
        addSuffix: true,
        locale: fr,
      })
    : null;

  return (
    <div
      className={cn(
        "relative rounded-xl border bg-white p-4",
        "border-emerald-200 shadow-sm",
        "ring-1 ring-emerald-100",
        "transition-all duration-200 hover:shadow-md hover:border-emerald-300",
        "overflow-hidden"
      )}
    >
      {/* Subtle background glow */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-emerald-50/60 via-transparent to-transparent pointer-events-none"
        aria-hidden
      />

      {/* Left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-l-xl" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 text-xs font-semibold",
                "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
              )}
            >
              <Sparkles className="h-3 w-3" />
              Suggestion IA
            </Badge>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {agentLabel}
            </span>
          </div>

          {timeAgo && (
            <div className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
              <Clock className="h-3 w-3" />
              <span>{timeAgo}</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h4 className="text-sm font-semibold text-slate-800 mb-1.5 leading-snug">
          {title}
        </h4>

        {/* Description */}
        <p className="text-xs text-slate-500 leading-relaxed mb-4">
          {description}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={onAccept}
            disabled={isLoading}
            className={cn(
              "h-7 px-3 text-xs font-medium",
              "bg-emerald-600 hover:bg-emerald-700 text-white",
              "transition-colors duration-150"
            )}
          >
            <Check className="h-3 w-3 mr-1" />
            {actionLabel}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDismiss}
            disabled={isLoading}
            className="h-7 px-3 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="h-3 w-3 mr-1" />
            Ignorer
          </Button>
        </div>
      </div>
    </div>
  );
}
