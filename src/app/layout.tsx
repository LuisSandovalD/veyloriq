import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/ui/theme-provider";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: "VEYLORIQ — Operaciones conectadas",
  description: "CRM, ventas, inventario y finanzas operativas en un solo lugar.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" data-scroll-behavior="smooth" suppressHydrationWarning className={cn("font-sans", inter.variable)}>
      <body className="min-h-screen bg-stone-50 text-zinc-950 antialiased transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-50">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}</ThemeProvider></body>
    </html>
  );
}