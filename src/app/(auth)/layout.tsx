"use client";

import React from "react";
import { Leaf } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: "#0f0f13" }}
    >
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/30">
            <Leaf className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            TerraCore{" "}
            <span className="text-emerald-400">Pro</span>
          </span>
        </div>
        <p className="text-sm text-zinc-400">
          Gestion intelligente pour paysagistes
        </p>
      </div>
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-8 text-xs text-zinc-600">
        &copy; {new Date().getFullYear()} TerraCore Pro. Tous droits réservés.
      </p>
    </div>
  );
}