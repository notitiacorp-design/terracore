"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";
import { Loader2, ArrowLeft, MailCheck } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const resetSchema = z.object({
  email: z
    .string()
    .min(1, "L'adresse e-mail est requise")
    .email("Adresse e-mail invalide"),
});

type ResetFormValues = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const supabase = createClientComponentClient();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sentToEmail, setSentToEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ResetFormValues) => {
    setIsLoading(true);
    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/update-password`
          : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(
        values.email,
        { redirectTo }
      );

      if (error) {
        toast.error(error.message);
        return;
      }

      setSentToEmail(values.email);
      setEmailSent(true);
    } catch (err) {
      toast.error("Une erreur inattendue s'est produite. Veuillez réessayer.");
      console.error("Reset password error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <Card className="border border-zinc-800 bg-zinc-900/80 shadow-2xl backdrop-blur-sm">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <MailCheck className="h-7 w-7 text-emerald-400" />
            </div>
          </div>
          <CardTitle className="text-xl font-bold text-white text-center">
            E-mail envoyé !
          </CardTitle>
          <CardDescription className="text-zinc-400 text-center">
            Nous avons envoyé un lien de réinitialisation à
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-center">
            <p className="font-medium text-emerald-400 break-all">{sentToEmail}</p>
          </div>
          <div className="rounded-lg bg-zinc-800/30 border border-zinc-700/50 px-4 py-3">
            <p className="text-sm text-zinc-400 leading-relaxed">
              Vérifiez votre boîte de réception et cliquez sur le lien pour
              réinitialiser votre mot de passe. Le lien expire dans{" "}
              <span className="text-zinc-300 font-medium">1 heure</span>.
            </p>
          </div>
          <p className="text-xs text-zinc-500 text-center">
            Vous n&apos;avez pas reçu l&apos;e-mail ? Vérifiez votre dossier spam ou{" "}
            <button
              type="button"
              onClick={() => setEmailSent(false)}
              className="text-emerald-400 hover:text-emerald-300 hover:underline"
            >
              réessayez
            </button>
            .
          </p>
        </CardContent>

        <CardFooter>
          <Link href="/login" className="w-full">
            <Button
              variant="outline"
              className="w-full border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à la connexion
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="border border-zinc-800 bg-zinc-900/80 shadow-2xl backdrop-blur-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-bold text-white">
          Mot de passe oublié ?
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Entrez votre adresse e-mail pour recevoir un lien de réinitialisation
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300">
              Adresse e-mail
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="vous@exemple.com"
              autoComplete="email"
              className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-red-400">{errors.email.message}</p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-900/40 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              "Réinitialiser le mot de passe"
            )}
          </Button>

          <Link href="/login" className="w-full">
            <Button
              type="button"
              variant="outline"
              className="w-full border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à la connexion
            </Button>
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}