"use client";

import { FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DocumentsPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Devis, factures et bons de livraison
        </p>
      </div>
      <Tabs defaultValue="devis" className="w-full">
        <TabsList>
          <TabsTrigger value="devis">Devis</TabsTrigger>
          <TabsTrigger value="factures">Factures</TabsTrigger>
          <TabsTrigger value="bons">Bons de livraison</TabsTrigger>
        </TabsList>
        <TabsContent value="devis">
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
            <FileText className="h-12 w-12" />
            <p className="text-lg font-medium">Aucun devis pour le moment</p>
            <p className="text-sm">Créez votre premier devis pour commencer.</p>
          </div>
        </TabsContent>
        <TabsContent value="factures">
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
            <FileText className="h-12 w-12" />
            <p className="text-lg font-medium">Aucune facture pour le moment</p>
          </div>
        </TabsContent>
        <TabsContent value="bons">
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
            <FileText className="h-12 w-12" />
            <p className="text-lg font-medium">Aucun bon de livraison</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
