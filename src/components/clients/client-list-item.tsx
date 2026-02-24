"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Client } from "@/types/database";

interface ClientListItemProps {
  client: Client;
  onClick?: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  particulier: "Particulier",
  professionnel: "Professionnel",
};

const TYPE_COLORS: Record<string, string> = {
  particulier: "bg-blue-100 text-blue-800 border-blue-200",
  professionnel: "bg-purple-100 text-purple-800 border-purple-200",
};

function getInitials(client: Client): string {
  if (client.company_name) return client.company_name.slice(0, 2).toUpperCase();
  const first = client.first_name?.[0] ?? "";
  const last = client.last_name?.[0] ?? "";
  return (first + last).toUpperCase() || "?";
}

function getClientName(client: Client): string {
  if (client.company_name) return client.company_name;
  return [client.first_name, client.last_name].filter(Boolean).join(" ") || "Sans nom";
}

export function ClientListItem({ client, onClick }: ClientListItemProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick?.(); }}
      className="group flex items-center gap-4 p-4 rounded-xl border bg-card cursor-pointer hover:bg-muted/50 hover:shadow-sm transition-all duration-150 active:scale-[0.99] outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      <Avatar className="h-11 w-11 shrink-0">
        <AvatarFallback className="bg-emerald-100 text-emerald-700 font-semibold text-sm group-hover:bg-emerald-200 transition-colors">
          {getInitials(client)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm truncate">{getClientName(client)}</span>
          <Badge
            variant="outline"
            className={`text-xs shrink-0 ${TYPE_COLORS[client.client_type] ?? ""}`}
          >
            {TYPE_LABELS[client.client_type] ?? client.client_type}
          </Badge>
        </div>
        <div className="flex flex-col sm:flex-row sm:gap-4 mt-1">
          {client.email && (
            <span className="text-sm text-muted-foreground truncate">{client.email}</span>
          )}
          {client.phone && (
            <span className="text-sm text-muted-foreground">{client.phone}</span>
          )}
        </div>
      </div>
    </div>
  );
}
