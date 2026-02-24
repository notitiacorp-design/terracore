"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: number;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  accentColor?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  change,
  icon: Icon,
  trend = "neutral",
  accentColor = "emerald",
}: KpiCardProps) {
  const isPositive = trend === "up";
  const isNegative = trend === "down";

  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  const changeColor =
    isPositive
      ? "text-emerald-600"
      : isNegative
      ? "text-red-500"
      : "text-slate-400";

  const changeBg =
    isPositive
      ? "bg-emerald-50"
      : isNegative
      ? "bg-red-50"
      : "bg-slate-100";

  const iconBg =
    accentColor === "emerald"
      ? "bg-emerald-100 text-emerald-600"
      : accentColor === "blue"
      ? "bg-blue-100 text-blue-600"
      : accentColor === "amber"
      ? "bg-amber-100 text-amber-600"
      : accentColor === "violet"
      ? "bg-violet-100 text-violet-600"
      : "bg-emerald-100 text-emerald-600";

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border border-slate-200 bg-white shadow-sm",
        "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300"
      )}
    >
      {/* Top accent line */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-0.5",
          accentColor === "emerald"
            ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
            : accentColor === "blue"
            ? "bg-gradient-to-r from-blue-400 to-blue-600"
            : accentColor === "amber"
            ? "bg-gradient-to-r from-amber-400 to-amber-600"
            : accentColor === "violet"
            ? "bg-gradient-to-r from-violet-400 to-violet-600"
            : "bg-gradient-to-r from-emerald-400 to-emerald-600"
        )}
      />

      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          {/* Left: text info */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider truncate">
              {title}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 leading-tight">
              {value}
            </p>
            {subtitle && (
              <p className="mt-1 text-xs text-slate-400 truncate">{subtitle}</p>
            )}

            {/* Change indicator */}
            {change !== undefined && (
              <div
                className={cn(
                  "inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium",
                  changeBg,
                  changeColor
                )}
              >
                <TrendIcon className="h-3 w-3" />
                <span>
                  {change > 0 ? "+" : ""}
                  {change}%
                </span>
                <span className="text-slate-400 font-normal">vs mois dernier</span>
              </div>
            )}
          </div>

          {/* Right: icon */}
          <div
            className={cn(
              "flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl",
              iconBg,
              "transition-transform duration-200 group-hover:scale-110"
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
