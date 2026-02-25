"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useClients } from "@/hooks/use-clients";
import { useAuth } from "@/hooks/use-auth";
import type { ClientRow } from "@/types/database";

type Client = ClientRow;

const PAGE_SIZE = 10;

function getClientDisplayName(c: Client): string {
  if (c.client_type === 'pro' && c.company_name) return c.company_name;
  return [c.first_name, c.last_name].filter(Boolean).join(' ') || '—';
}


const TYPE_LABELS: Record<string, string> = {
  particulier: "Particulier",
  pro: "Professionnel",
};

const TYPE_COLORS: Record<string, string> = {
  particulier: "bg-blue-100 text-blue-800 border-blue-200",
  pro: "bg-purple-100 text-purple-800 border-purple-200",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: "Payé",
  pending: "En attente",
  overdue: "En retard",
  none: "—",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  overdue: "bg-red-100 text-red-800 border-red-200",
  none: "bg-gray-100 text-gray-600 border-gray-200",
};

export default function ClientsPage() {
  const router = useRouter();
  const { company } = useAuth();
  const { clients, loading, fetchClients } = useClients();

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (company?.id) {
      fetchClients(company.id);
    }
  }, [company?.id]);

  const filtered = useMemo(() => {
    let list: Client[] = clients ?? [];

    if (activeTab === "particulier") {
      list = list.filter((c) => c.client_type === "particulier");
    } else if (activeTab === "pro") {
      list = list.filter((c) => c.client_type === "pro");
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          getClientDisplayName(c).toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          c.company_name?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [clients, activeTab, search]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  function getInitials(name?: string | null): string {
    if (!name) return "?";
    return name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
            <p className="text-sm text-muted-foreground">
              {loading ? "Chargement…" : `${filtered.length} client${filtered.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/dashboard/clients/new">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau client
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v);
            setPage(1);
          }}
        >
          <TabsList>
            <TabsTrigger value="all">Tous</TabsTrigger>
            <TabsTrigger value="particulier">Particuliers</TabsTrigger>
            <TabsTrigger value="pro">Professionnels</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un client…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Entreprise</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  Aucun client trouvé
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((client) => (
                <TableRow
                  key={client.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(getClientDisplayName(client))}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{getClientDisplayName(client)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {client.client_type ? (
                      <Badge
                        variant="outline"
                        className={TYPE_COLORS[client.client_type] ?? ""}
                      >
                        {TYPE_LABELS[client.client_type] ?? client.client_type}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{client.email ?? "—"}</TableCell>
                  <TableCell>{client.phone ?? "—"}</TableCell>
                  <TableCell>{client.company_name ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/clients/${client.id}`);
                      }}
                    >
                      Voir
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} sur {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
