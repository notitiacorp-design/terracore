"use client";

import { HardHat } from "lucide-react";

export default function ChantiersPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Chantiers</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Planification et suivi des chantiers en cours
        </p>
      </div>
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
        <HardHat className="h-12 w-12" />
        <p className="text-lg font-medium">Module Chantiers</p>
        <p className="text-sm">Planning, météo et gestion des interventions — disponible prochainement.</p>
      </div>
    </div>
  );
}
