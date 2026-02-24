"use client";

import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Réglages</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configuration de votre entreprise et préférences
        </p>
      </div>
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
        <Settings className="h-12 w-12" />
        <p className="text-lg font-medium">Paramètres</p>
        <p className="text-sm">Entreprise, utilisateurs, facturation — disponible prochainement.</p>
      </div>
    </div>
  );
}
