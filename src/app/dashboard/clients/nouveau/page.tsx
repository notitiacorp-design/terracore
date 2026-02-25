"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientForm } from "@/components/clients/client-form";
import { useClients } from "@/hooks/use-clients";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import type { ClientFormValues } from "@/components/clients/client-form";

export default function NouveauClientPage() {
  const router = useRouter();
  const { createClient, loading } = useClients();
  const { company } = useAuth();

  const handleSubmit = async (values: ClientFormValues) => {
    if (!company?.id) {
      toast.error("Erreur : entreprise non trouvée. Reconnectez-vous.");
      return;
    }
    const companyId = company.id;

    const { data, error } = await createClient({
      client_type: values.client_type,
      company_name: values.company_name,
      first_name: values.first_name,
      last_name: values.last_name,
      email: values.email,
      phone: values.phone,
      notes: values.notes,
      company_id: companyId,
    });

    if (error) {
      toast.error(error ?? "Erreur lors de la création du client");
      return;
    }

    toast.success("Client créé avec succès !");
    router.push(`/dashboard/clients/${data!.id}`);
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
        isLoading={loading}
        submitLabel="Créer le client"
      />
    </div>
  );
}
