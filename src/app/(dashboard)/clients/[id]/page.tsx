"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Briefcase,
  Bell,
  StickyNote,
  Info,
  Plus,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ClientDetailHeader } from "@/components/clients/client-detail-header";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/types/database";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type Client = Database["public"]["Tables"]["clients"]["Row"];
type Document = Database["public"]["Tables"]["documents"]["Row"];
type ScheduleEvent = Database["public"]["Tables"]["schedule_events"]["Row"];
type ClientNote = Database["public"]["Tables"]["client_notes"]["Row"];
type Contact = Database["public"]["Tables"]["contacts"]["Row"];
type Address = Database["public"]["Tables"]["addresses"]["Row"];
type ReminderWorkflow = Database["public"]["Tables"]["reminder_workflows"]["Row"];

const DOC_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  refused: "Refusé",
  paid: "Payé",
  overdue: "En retard",
  partial: "Partiel",
  cancelled: "Annulé",
};

const DOC_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  sent: "bg-blue-100 text-blue-700 border-blue-200",
  accepted: "bg-emerald-100 text-emerald-700 border-emerald-200",
  refused: "bg-red-100 text-red-700 border-red-200",
  paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
  overdue: "bg-red-100 text-red-700 border-red-200",
  partial: "bg-yellow-100 text-yellow-700 border-yellow-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
};

const REMINDER_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  sent: "Envoyée",
  completed: "Terminée",
  cancelled: "Annulée",
};

const REMINDER_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  sent: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
};

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClientComponentClient<Database>();
  const { id } = params;

  const [client, setClient] = useState<Client | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [reminders, setReminders] = useState<ReminderWorkflow[]>([]);
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [noteContent, setNoteContent] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  useEffect(() => {
    async function fetchAll() {
      setIsLoading(true);
      try {
        const [clientRes, contactsRes, addressesRes, docsRes, eventsRes, remindersRes, notesRes] =
          await Promise.all([
            supabase.from("clients").select("*").eq("id", id).single(),
            supabase.from("contacts").select("*").eq("client_id", id).order("created_at"),
            supabase.from("addresses").select("*").eq("client_id", id).order("is_billing", { ascending: false }),
            supabase.from("documents").select("*").eq("client_id", id).order("created_at", { ascending: false }),
            supabase.from("schedule_events").select("*").eq("client_id", id).order("starts_at", { ascending: false }),
            supabase.from("reminder_workflows").select("*").eq("client_id", id).order("created_at", { ascending: false }),
            supabase.from("client_notes").select("*").eq("client_id", id).order("created_at", { ascending: false }),
          ]);

        if (clientRes.error) throw clientRes.error;
        setClient(clientRes.data);
        setContacts(contactsRes.data ?? []);
        setAddresses(addressesRes.data ?? []);
        setDocuments(docsRes.data ?? []);
        setEvents(eventsRes.data ?? []);
        setReminders(remindersRes.data ?? []);
        setNotes(notesRes.data ?? []);
      } catch (err) {
        toast.error("Impossible de charger le client");
        router.push("/clients");
      } finally {
        setIsLoading(false);
      }
    }
    fetchAll();
  }, [id]);

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    setIsSavingNote(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("client_notes")
        .insert({ client_id: id, content: noteContent.trim(), created_by: user?.id ?? null })
        .select()
        .single();
      if (error) throw error;
      setNotes((prev) => [data, ...prev]);
      setNoteContent("");
      toast.success("Note ajoutée");
    } catch {
      toast.error("Erreur lors de l'ajout de la note");
    } finally {
      setIsSavingNote(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-8">
        <Skeleton className="h-8 w-24" />
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </div>
    );
  }

  if (!client) return null;

  const quotes = documents.filter((d) => d.type === "quote");
  const invoices = documents.filter((d) => d.type === "invoice");

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      {/* Back */}
      <Button variant="ghost" size="sm" className="w-fit gap-2" onClick={() => router.push("/clients")}>
        <ArrowLeft className="h-4 w-4" />
        Retour aux clients
      </Button>

      {/* Header */}
      <ClientDetailHeader client={client} />

      {/* Tabs */}
      <Tabs defaultValue="informations">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="informations" className="gap-2"><Info className="h-4 w-4" />Informations</TabsTrigger>
          <TabsTrigger value="documents" className="gap-2"><FileText className="h-4 w-4" />Documents</TabsTrigger>
          <TabsTrigger value="chantiers" className="gap-2"><Briefcase className="h-4 w-4" />Chantiers</TabsTrigger>
          <TabsTrigger value="relances" className="gap-2"><Bell className="h-4 w-4" />Relances</TabsTrigger>
          <TabsTrigger value="notes" className="gap-2"><StickyNote className="h-4 w-4" />Notes</TabsTrigger>
        </TabsList>

        {/* Informations */}
        <TabsContent value="informations" className="space-y-6 mt-6">
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <h3 className="font-semibold">Informations générales</h3>
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {client.company_name && (
                <InfoField label="Entreprise" value={client.company_name} />
              )}
              <InfoField label="Prénom" value={client.first_name ?? "—"} />
              <InfoField label="Nom" value={client.last_name ?? "—"} />
              <InfoField label="Email" value={client.email ?? "—"} />
              <InfoField label="Téléphone" value={client.phone ?? "—"} />
              <InfoField label="Conditions de paiement" value={client.payment_terms_days != null ? `${client.payment_terms_days} jours` : "—"} />
              <InfoField label="Type" value={client.client_type === "particulier" ? "Particulier" : "Professionnel"} />
              {client.notes && (
                <div className="sm:col-span-2">
                  <InfoField label="Notes" value={client.notes} />
                </div>
              )}
            </div>
          </div>

          {contacts.length > 0 && (
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <h3 className="font-semibold">Contacts</h3>
              <Separator />
              <div className="space-y-3">
                {contacts.map((c) => (
                  <div key={c.id} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 p-3 rounded-lg bg-muted/40">
                    <span className="font-medium">{[c.first_name, c.last_name].filter(Boolean).join(" ")}</span>
                    {c.role && <span className="text-sm text-muted-foreground">{c.role}</span>}
                    {c.email && <span className="text-sm text-muted-foreground">{c.email}</span>}
                    {c.phone && <span className="text-sm text-muted-foreground">{c.phone}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {addresses.length > 0 && (
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <h3 className="font-semibold">Adresses</h3>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div key={addr.id} className="p-4 rounded-lg border bg-muted/30 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{addr.label ?? (addr.is_billing ? "Facturation" : "Site")}</span>
                      {addr.is_billing && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Facturation</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{addr.street}</p>
                    {addr.complement && <p className="text-sm text-muted-foreground">{addr.complement}</p>}
                    <p className="text-sm text-muted-foreground">{addr.postal_code} {addr.city}</p>
                    {addr.country && <p className="text-sm text-muted-foreground">{addr.country}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents" className="space-y-6 mt-6">
          <DocumentSection title="Devis" documents={quotes} clientId={id} type="quote" />
          <DocumentSection title="Factures" documents={invoices} clientId={id} type="invoice" />
        </TabsContent>

        {/* Chantiers */}
        <TabsContent value="chantiers" className="mt-6">
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Interventions & Chantiers</h3>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" asChild>
                <Link href={`/planning/nouveau?client_id=${id}`}>
                  <Plus className="h-4 w-4" />Nouvelle intervention
                </Link>
              </Button>
            </div>
            <Separator />
            {events.length === 0 ? (
              <EmptyState message="Aucune intervention planifiée" />
            ) : (
              <div className="space-y-3">
                {events.map((ev) => (
                  <div key={ev.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 p-4 rounded-lg border bg-muted/30">
                    <div className="flex-1">
                      <p className="font-medium">{ev.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {ev.starts_at ? format(new Date(ev.starts_at), "d MMM yyyy à HH:mm", { locale: fr }) : "—"}
                      </p>
                    </div>
                    {ev.status && (
                      <Badge variant="outline" className="text-xs w-fit">{ev.status}</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Relances */}
        <TabsContent value="relances" className="mt-6">
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <h3 className="font-semibold">Relances de paiement</h3>
            <Separator />
            {reminders.length === 0 ? (
              <EmptyState message="Aucune relance en cours" />
            ) : (
              <div className="space-y-3">
                {reminders.map((r) => (
                  <div key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 p-4 rounded-lg border bg-muted/30">
                    <div className="flex-1">
                      <p className="font-medium text-sm">Relance #{r.id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">
                        Créée le {r.created_at ? format(new Date(r.created_at), "d MMM yyyy", { locale: fr }) : "—"}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-xs w-fit ${REMINDER_STATUS_COLORS[r.status] ?? ""}`}>
                      {REMINDER_STATUS_LABELS[r.status] ?? r.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes" className="mt-6">
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <h3 className="font-semibold">Notes internes</h3>
            <Separator />
            <div className="space-y-2">
              <Textarea
                placeholder="Ajouter une note interne..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="resize-none min-h-[100px]"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleAddNote}
                  disabled={isSavingNote || !noteContent.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                  {isSavingNote ? "Enregistrement..." : "Ajouter"}
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              {notes.length === 0 ? (
                <EmptyState message="Aucune note pour ce client" />
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="p-4 rounded-lg border bg-muted/30 space-y-1">
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    <p className="text-xs text-muted-foreground">
                      {note.created_at ? format(new Date(note.created_at), "d MMM yyyy à HH:mm", { locale: fr }) : ""}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-8 text-center text-muted-foreground text-sm">{message}</div>
  );
}

function DocumentSection({
  title,
  documents,
  clientId,
  type,
}: {
  title: string;
  documents: Document[];
  clientId: string;
  type: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" asChild>
          <Link href={`/documents/nouveau?type=${type}&client_id=${clientId}`}>
            <Plus className="h-4 w-4" />Nouveau
          </Link>
        </Button>
      </div>
      <Separator />
      {documents.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">Aucun {title.toLowerCase()} pour ce client</div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Link
              key={doc.id}
              href={`/documents/${doc.id}`}
              className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors"
            >
              <div>
                <p className="text-sm font-medium">{doc.reference ?? `#${doc.id.slice(0, 8)}`}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.created_at ? format(new Date(doc.created_at), "d MMM yyyy", { locale: fr }) : ""}
                  {doc.total_ttc != null ? ` — ${Number(doc.total_ttc).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}` : ""}
                </p>
              </div>
              <Badge variant="outline" className={`text-xs ${DOC_STATUS_COLORS[doc.status] ?? ""}`}>
                {DOC_STATUS_LABELS[doc.status] ?? doc.status}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
