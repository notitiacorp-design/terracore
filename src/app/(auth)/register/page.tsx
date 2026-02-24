"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, CheckSquare, Square } from "lucide-react";

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

const registerSchema = z
  .object({
    companyName: z
      .string()
      .min(2, "Le nom de l'entreprise doit contenir au moins 2 caractères")
      .max(100, "Le nom de l'entreprise ne peut pas dépasser 100 caractères"),
    firstName: z
      .string()
      .min(2, "Le prénom doit contenir au moins 2 caractères")
      .max(50, "Le prénom ne peut pas dépasser 50 caractères"),
    lastName: z
      .string()
      .min(2, "Le nom doit contenir au moins 2 caractères")
      .max(50, "Le nom ne peut pas dépasser 50 caractères"),
    email: z
      .string()
      .min(1, "L'adresse e-mail est requise")
      .email("Adresse e-mail invalide"),
    password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères")
      .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
      .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre"),
    confirmPassword: z.string().min(1, "Veuillez confirmer votre mot de passe"),
    acceptTerms: z.literal(true, {
      errorMap: () => ({
        message: "Vous devez accepter les conditions d'utilisation",
      }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      companyName: "",
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const acceptTermsValue = watch("acceptTerms");

  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp(
        {
          email: values.email,
          password: values.password,
          options: {
            data: {
              first_name: values.firstName,
              last_name: values.lastName,
              company_name: values.companyName,
            },
          },
        }
      );

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          toast.error("Cette adresse e-mail est déjà utilisée.");
        } else {
          toast.error(signUpError.message);
        }
        return;
      }

      if (!authData.user) {
        toast.error("Une erreur s'est produite lors de la création du compte.");
        return;
      }

      const userId = authData.user.id;

      const { data: companyData, error: companyError } = await supabase
        .from("company")
        .insert([
          {
            name: values.companyName,
          },
        ])
        .select("id")
        .single();

      if (companyError) {
        console.error("Company creation error:", companyError);
        toast.error(
          "Le compte a été créé mais une erreur s'est produite lors de la création de l'entreprise."
        );
      }

      const companyId = companyData?.id ?? null;

      const { error: profileError } = await supabase
        .from("user_profile")
        .insert([
          {
            id: userId,
            first_name: values.firstName,
            last_name: values.lastName,
            company_id: companyId,
            role: "admin",
          },
        ]);

      if (profileError) {
        console.error("Profile creation error:", profileError);
        toast.error(
          "Le compte a été créé mais une erreur s'est produite lors de la création du profil."
        );
      }

      if (authData.session) {
        toast.success("Compte créé avec succès ! Bienvenue sur TerraCore Pro.");
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.success(
          "Compte créé ! Veuillez vérifier votre e-mail pour confirmer votre adresse."
        );
        router.push("/login");
      }
    } catch (err) {
      toast.error("Une erreur inattendue s'est produite. Veuillez réessayer.");
      console.error("Register error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border border-zinc-800 bg-zinc-900/80 shadow-2xl backdrop-blur-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-bold text-white">
          Créer un compte
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Rejoignez TerraCore Pro et gérez votre activité de paysagiste
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-4">
          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="companyName" className="text-zinc-300">
              Nom de l&apos;entreprise
            </Label>
            <Input
              id="companyName"
              type="text"
              placeholder="Paysages & Jardins SARL"
              autoComplete="organization"
              className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
              {...register("companyName")}
            />
            {errors.companyName && (
              <p className="text-xs text-red-400">
                {errors.companyName.message}
              </p>
            )}
          </div>

          {/* First + Last Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-zinc-300">
                Prénom
              </Label>
              <Input
                id="firstName"
                type="text"
                placeholder="Jean"
                autoComplete="given-name"
                className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
                {...register("firstName")}
              />
              {errors.firstName && (
                <p className="text-xs text-red-400">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-zinc-300">
                Nom
              </Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Dupont"
                autoComplete="family-name"
                className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
                {...register("lastName")}
              />
              {errors.lastName && (
                <p className="text-xs text-red-400">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          {/* Email */}
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

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-zinc-300">
              Mot de passe
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="new-password"
                className="border-zinc-700 bg-zinc-800 pr-10 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
                aria-label={
                  showPassword
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-400">{errors.password.message}</p>
            )}
            <p className="text-xs text-zinc-500">
              8 caractères minimum, une majuscule et un chiffre requis
            </p>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-zinc-300">
              Confirmer le mot de passe
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="new-password"
                className="border-zinc-700 bg-zinc-800 pr-10 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
                {...register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
                aria-label={
                  showConfirmPassword
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-red-400">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Terms */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() =>
                setValue("acceptTerms", acceptTermsValue ? false : true, {
                  shouldValidate: true,
                })
              }
              className="flex items-start gap-3 text-left"
            >
              <span className="mt-0.5 flex-shrink-0">
                {acceptTermsValue ? (
                  <CheckSquare className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Square className="h-4 w-4 text-zinc-500" />
                )}
              </span>
              <span className="text-sm text-zinc-400">
                J&apos;accepte les{" "}
                <Link
                  href="#"
                  className="text-emerald-400 hover:text-emerald-300 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  conditions d&apos;utilisation
                </Link>{" "}
                et la{" "}
                <Link
                  href="#"
                  className="text-emerald-400 hover:text-emerald-300 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  politique de confidentialité
                </Link>
              </span>
            </button>
            <input
              type="checkbox"
              className="sr-only"
              {...register("acceptTerms")}
            />
            {errors.acceptTerms && (
              <p className="text-xs text-red-400">
                {errors.acceptTerms.message}
              </p>
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
                Création du compte...
              </>
            ) : (
              "Créer mon compte"
            )}
          </Button>

          <p className="text-center text-sm text-zinc-400">
            Déjà un compte ?{" "}
            <Link
              href="/login"
              className="font-medium text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
            >
              Se connecter
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
