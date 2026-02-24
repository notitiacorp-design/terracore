"use client";

import { BarChart3 } from "lucide-react";

export default function PilotagePage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pilotage</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Indicateurs clés et tableaux de bord
        </p>
      </div>
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
        <BarChart3 className="h-12 w-12" />
        <p className="text-lg font-medium">Module Pilotage</p>
        <p className="text-sm">KPIs, graphiques et rapports — disponible prochainement.</p>
      </div>
    </div>
  );
}
