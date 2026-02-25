"use client";

import Link from "next/link";
import { Mail, Phone, Pencil, FileText, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Database } from "@/types/database";

type Client = Database["public"]["Tables"]["client"]["Row"];

interface ClientDetailHeaderProps {
  client: Client;
}

const TYPE_LABELS: Record<string, string> = {
  particulier: "Particulier",
  pro: "Professionnel",
};

const TYPE_COLORS: Record<string, string> = {
  particulier: "bg-blue-100 text-blue-800 border-blue-200",
  pro: "bg-purple-100 text-purple-800 border-purple-200",
};

function getInitials(client: Client): string {
  if (client.company_name) return client.company_name.slice(0, 2).toUpperCase();
  const first = client.first_name?.[0] ?? "";
  const last = client.last_name?.[0] ?? "";
  return (first + last).toUpperCase() || "?";
}

function getClientName(client: Client): string {
  if (client.company_name && client.first_name) {
    return `${client.first_name} ${client.last_name ?? ""}`.trim();
  }
  if (client.company_name) return client.company_name;
  return [client.first_name, client.last_name].filter(Boolean).join(" ") || "Sans nom";
}

export function ClientDetailHeader({ client }: ClientDetailHeaderProps) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex flex-col sm:flex-row gap-5 sm:items-start">
        {/* Avatar */}
        <Avatar className="h-16 w-16 shrink-0">
          <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold text-xl">
            {getInitials(client)}
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold">{getClientName(client)}</h2>
            <Badge
              variant="outline"
              className={TYPE_COLORS[client.client_type] ?? ""}
            >
              {TYPE_LABELS[client.client_type] ?? client.client_type}
            </Badge>
          </div>

          {client.company_name && (client.first_name || client.last_name) && (
            <p className="text-sm text-muted-foreground font-medium">{client.company_name}</p>
          )}

          <div className="flex flex-wrap gap-4">
            {client.email && (
              <a
                href={`mailto:${client.email}`}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="h-4 w-4 shrink-0" />
                {client.email}
              </a>
            )}
            {client.phone && (
              <a
                href={`tel:${client.phone}`}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Phone className="h-4 w-4 shrink-0" />
                {client.phone}
              </a>
            )}
          </div>

          {client.payment_terms_days != null && (
            <p className="text-xs text-muted-foreground">
              Délai de paiement : <span className="font-medium">{client.payment_terms_days} jours</span>
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap sm:flex-col gap-2">
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <Link href={`/clients/${client.id}/modifier`}>
              <Pencil className="h-4 w-4" />
              Modifier
            </Link>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            asChild
          >
            <Link href={`/documents/nouveau?type=quote&client_id=${client.id}`}>
              <FileText className="h-4 w-4" />
              Nouveau devis
            </Link>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
            asChild
          >
            <Link href={`/documents/nouveau?type=invoice&client_id=${client.id}`}>
              <Receipt className="h-4 w-4" />
              Nouvelle facture
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
