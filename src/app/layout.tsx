import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TerraCore Pro",
    template: "%s | TerraCore Pro",
  },
  description: "Gestion intelligente pour paysagistes",
  keywords: [
    "paysagiste",
    "gestion",
    "jardinage",
    "entreprise",
    "devis",
    "chantier",
  ],
  authors: [{ name: "TerraCore Pro" }],
  creator: "TerraCore Pro",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  openGraph: {
    type: "website",
    locale: "fr_FR",
    title: "TerraCore Pro",
    description: "Gestion intelligente pour paysagistes",
    siteName: "TerraCore Pro",
  },
  twitter: {
    card: "summary_large_image",
    title: "TerraCore Pro",
    description: "Gestion intelligente pour paysagistes",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              style: {
                background: "#18181b",
                border: "1px solid #27272a",
                color: "#f4f4f5",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}