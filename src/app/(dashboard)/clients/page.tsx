"use client";

import { useState, useMemo } from "react";
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
import type { Client } from "@/types/database";

const PAGE_SIZE = 10;

const TYPE_LABELS: Record<string, string> = {
  particulier: "Particulier",
  professionnel: "Professionnel",
};

const TYPE_COLORS: Record<string, string> = {
  particulier: "bg-blue-100 text-blue-800 border-blue-200",
  professionnel: "bg-purple-100 text-purple-800 border-purple-200",
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

function getInitials(client: Client): string {
  if (client.company_name) {
    return client.company_name.slice(0, 2).toUpperCase();
  }
  const first = client.first_name?.[0] ?? "";
  const last = client.last_name?.[0] ?? "";
  return (first + last).toUpperCase() || "?";
}

function getClientName(client: Client): string {
  if (client.company_name) return client.company_name;
  return [client.first_name, client.last_name].filter(Boolean).join(" ") || "Sans nom";
}

function SkeletonRow() {
  return (
    <TableRow>
      <TableCell><div className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-full" /><Skeleton className="h-4 w-32" /></div></TableCell>
      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
    </TableRow>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-1 flex-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-3 w-48" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export default function ClientsPage() {
  const router = useRouter();
  const { clients, isLoading } = useClients();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("tous");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!clients) return [];
    let list = [...clients];
    if (activeTab === "particuliers") list = list.filter((c) => c.client_type === "particulier");
    if (activeTab === "professionnels") list = list.filter((c) => c.client_type === "professionnel");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        getClientName(c).toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [clients, activeTab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setPage(1);
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isLoading ? "Chargement..." : `${filtered.length} client${filtered.length !== 1 ? "s" : ""} au total`}
          </p>
        </div>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
          <Link href="/clients/nouveau">
            <Plus className="h-4 w-4" />
            Nouveau client
          </Link>
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un client..."
            className="pl-9"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="tous">Tous</TabsTrigger>
            <TabsTrigger value="particuliers">Particuliers</TabsTrigger>
            <TabsTrigger value="professionnels">Professionnels</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Client</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Dernier document</TableHead>
              <TableHead>Paiement</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              : paginated.length === 0
              ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="flex flex-col items-center gap-4 py-16 text-center">
                      <Users className="h-12 w-12 text-muted-foreground/40" />
                      <div>
                        <p className="font-medium text-muted-foreground">Aucun client trouvé</p>
                        <p className="text-sm text-muted-foreground/70 mt-1">Créez votre premier client pour commencer</p>
                      </div>
                      <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                        <Link href="/clients/nouveau"><Plus className="h-4 w-4" />Nouveau client</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
              : paginated.map((client) => (
                <TableRow
                  key={client.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/clients/${client.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 font-semibold text-sm">
                          {getInitials(client)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{getClientName(client)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={TYPE_COLORS[client.client_type] ?? ""}
                    >
                      {TYPE_LABELS[client.client_type] ?? client.client_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{client.email ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{client.phone ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {(client as any).last_document_ref ?? "—"}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const status = (client as any).payment_status ?? "none";
                      return (
                        <Badge variant="outline" className={PAYMENT_STATUS_COLORS[status] ?? ""}>
                          {PAYMENT_STATUS_LABELS[status] ?? status}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : paginated.length === 0
          ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground/40" />
              <div>
                <p className="font-medium text-muted-foreground">Aucun client trouvé</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Créez votre premier client pour commencer</p>
              </div>
              <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                <Link href="/clients/nouveau"><Plus className="h-4 w-4" />Nouveau client</Link>
              </Button>
            </div>
          )
          : paginated.map((client) => {
            const status = (client as any).payment_status ?? "none";
            return (
              <div
                key={client.id}
                className="rounded-xl border bg-card p-4 space-y-2 cursor-pointer hover:bg-muted/40 transition-colors active:scale-[0.99]"
                onClick={() => router.push(`/clients/${client.id}`)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 font-semibold">
                        {getInitials(client)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">{getClientName(client)}</p>
                      <Badge variant="outline" className={`text-xs ${TYPE_COLORS[client.client_type] ?? ""}`}>
                        {TYPE_LABELS[client.client_type] ?? client.client_type}
                      </Badge>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-xs ${PAYMENT_STATUS_COLORS[status] ?? ""}`}>
                    {PAYMENT_STATUS_LABELS[status] ?? status}
                  </Badge>
                </div>
                {client.email && <p className="text-sm text-muted-foreground">{client.email}</p>}
                {client.phone && <p className="text-sm text-muted-foreground">{client.phone}</p>}
              </div>
            );
          })}
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} sur {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  );
}
