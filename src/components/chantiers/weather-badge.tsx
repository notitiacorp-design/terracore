"use client";

import { cn } from "@/lib/utils";
import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Wind, Droplets } from "lucide-react";

type WeatherSeverity = "favorable" | "acceptable" | "defavorable" | "alerte";

interface WeatherBadgeProps {
  severity: WeatherSeverity;
  temperature?: number | null;
  description?: string | null;
  precipitationMm?: number | null;
  className?: string;
}

const SEVERITY_CONFIG: Record<
  WeatherSeverity,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  favorable: {
    label: "Favorable",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  acceptable: {
    label: "Acceptable",
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
    dot: "bg-yellow-500",
  },
  defavorable: {
    label: "Défavorable",
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    dot: "bg-orange-500",
  },
  alerte: {
    label: "Alerte",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    dot: "bg-red-500",
  },
};

function getWeatherIcon(
  description?: string | null,
  severity?: WeatherSeverity
): React.ElementType {
  if (!description) {
    if (severity === "alerte") return CloudLightning;
    if (severity === "defavorable") return CloudRain;
    if (severity === "acceptable") return Cloud;
    return Sun;
  }
  const d = description.toLowerCase();
  if (d.includes("orage") || d.includes("tonnerre")) return CloudLightning;
  if (d.includes("neige") || d.includes("grêle")) return CloudSnow;
  if (d.includes("pluie") || d.includes("averse") || d.includes("bruine"))
    return CloudRain;
  if (d.includes("vent")) return Wind;
  if (d.includes("nuage") || d.includes("couvert") || d.includes("brouillard"))
    return Cloud;
  return Sun;
}

export function WeatherBadge({
  severity,
  temperature,
  description,
  precipitationMm,
  className,
}: WeatherBadgeProps) {
  const config = SEVERITY_CONFIG[severity];
  const WeatherIcon = getWeatherIcon(description, severity);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium",
        config.bg,
        config.text,
        config.border,
        className
      )}
      title={description || config.label}
    >
      {/* Severity dot */}
      <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", config.dot)} />

      {/* Weather icon */}
      <WeatherIcon className="h-3.5 w-3.5 flex-shrink-0" />

      {/* Temperature */}
      {temperature !== null && temperature !== undefined && (
        <span className="font-semibold">{Math.round(temperature)}°</span>
      )}

      {/* Precipitation */}
      {precipitationMm !== null &&
        precipitationMm !== undefined &&
        precipitationMm > 0 && (
          <span className="flex items-center gap-0.5 opacity-80">
            <Droplets className="h-2.5 w-2.5" />
            {precipitationMm}mm
          </span>
        )}
    </div>
  );
}
