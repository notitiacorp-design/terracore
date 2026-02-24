"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientForm } from "@/components/clients/client-form";
import { useClients } from "@/hooks/use-clients";
import { toast } from "sonner";
import type { ClientFormValues } from "@/components/clients/client-form";

export default function NouveauClientPage() {
  const router = useRouter();
  const { createClient, isCreating } = useClients();

  const handleSubmit = async (values: ClientFormValues) => {
    try {
      const newClient = await createClient(values);
      toast.success("Client créé avec succès !");
      router.push(`/clients/${newClient.id}`);
    } catch (err: any) {
      toast.error(err?.message ?? "Erreur lors de la création du client");
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-3xl mx-auto">
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        className="w-fit gap-2"
        onClick={() => router.push("/dashboard/clients")}
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux clients
      </Button>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nouveau client</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Remplissez les informations pour créer un nouveau client
        </p>
      </div>

      {/* Form */}
      <ClientForm
        onSubmit={handleSubmit}
        isLoading={isCreating}
        submitLabel="Créer le client"
      />
    </div>
  );
}
