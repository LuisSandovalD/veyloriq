import type { Metadata } from "next";
import { Pricing } from "@/components/marketing/pricing";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { HeroSection } from "@/components/marketing/hero-section";
import { ProductSection } from "@/components/marketing/product-section";
import { FinalCta } from "@/components/marketing/final-cta";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export const metadata: Metadata = {
  title: "VEYLORIQ | Gestiona tu negocio desde un solo lugar",
  description: "CRM, ventas, compras, inventario, finanzas, automatización e inteligencia artificial en una plataforma empresarial conectada."
};

export default function Home() {
  return <div className="min-h-screen bg-background text-foreground">
    <MarketingHeader />
    <main>
      <HeroSection />
      <ProductSection />
      <section id="planes" className="border-t bg-muted/20">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-muted-foreground">Planes</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Crece sin perder el control.</h2>
            <p className="mt-4 text-muted-foreground">Elige el nivel que mejor acompañe el crecimiento y las operaciones de tu organización.</p>
          </div>
          <Pricing />
        </div>
      </section>
      <FinalCta />
    </main>
    <MarketingFooter />
  </div>;
}