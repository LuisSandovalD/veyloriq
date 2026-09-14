import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Layers3 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const authImage = "https://res.cloudinary.com/dgaq5afjl/image/upload/v1789233515/ChatGPT_Image_12_sept_2026_12_18_11_b0axdx.png";

export function AuthLayout({ title, lead, children }: { title: string; lead: string; children: ReactNode }) {
  return <main className="grid min-h-screen bg-background text-foreground lg:grid-cols-[1.05fr_.95fr]">
    <aside className="relative hidden min-h-screen overflow-hidden border-r lg:block">
      <Image src={authImage} alt="VEYLORIQ - plataforma empresarial inteligente" fill priority sizes="55vw" className="object-cover object-center" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/5 via-transparent to-background/10" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/15 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/35 to-transparent" />
      <div className="absolute left-8 top-8 z-10 xl:left-10 xl:top-10">
        <Link href="/" className="flex items-center gap-2.5 rounded-xl border border-white/30 bg-black/20 px-3 py-2 text-sm font-semibold text-white shadow-sm backdrop-blur-md transition hover:bg-black/30">
          <span className="grid size-8 place-items-center rounded-lg bg-white/15"><Layers3 className="size-4" /></span>VEYLORIQ
        </Link>
      </div>
      <div className="absolute bottom-8 left-8 z-10 xl:bottom-10 xl:left-10">
        <div className="rounded-xl border border-white/20 bg-black/20 px-4 py-3 text-white backdrop-blur-md">
          <p className="text-xs font-medium">Inteligencia para cada operación.</p>
          <p className="mt-1 text-[11px] text-white/65">© {new Date().getFullYear()} VEYLORIQ</p>
        </div>
      </div>
    </aside>
    <section className="relative flex min-h-screen items-center justify-center bg-background px-6 py-10 sm:px-10 lg:px-14 xl:px-20">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,var(--primary),transparent_30%)] opacity-[.035]" />
      <div className="w-full max-w-[430px]">
        <Link href="/" className="mb-10 flex w-fit items-center gap-2.5 font-semibold lg:hidden">
          <span className="grid size-9 place-items-center rounded-xl border bg-card shadow-sm"><Layers3 className="size-4" /></span>VEYLORIQ
        </Link>
        <div className="mb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[.18em] text-primary">VEYLORIQ</p>
          <h1 className="text-3xl font-semibold tracking-[-.04em] sm:text-[2rem]">{title}</h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">{lead}</p>
        </div>
        <Separator className="mb-8" />
        {children}
        <p className="mt-10 text-center text-xs leading-5 text-muted-foreground">Al continuar aceptas nuestros <Link href="/terms" className="underline-offset-4 hover:text-foreground hover:underline">términos</Link> y nuestra <Link href="/privacy" className="underline-offset-4 hover:text-foreground hover:underline">política de privacidad</Link>.</p>
      </div>
    </section>
  </main>;
}