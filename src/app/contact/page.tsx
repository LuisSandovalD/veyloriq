import Link from "next/link";
import { ArrowLeft, Layers3 } from "lucide-react";
import { ContactForm } from "@/components/contact/contact-form";

export default function ContactPage() {
    return (
        <main className="min-h-screen bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
            <nav className="border-b border-zinc-200 dark:border-zinc-800">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
                    <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
                        <span className="grid size-8 place-items-center rounded-lg bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950"><Layers3 size={16} /></span>
                        <span className="text-sm tracking-[.14em]">VEYLORIQ</span>
                    </Link>
                    <Link href="/" className="flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"><ArrowLeft size={15} />Volver</Link>
                </div>
            </nav>

            <section className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-24">
                <div className="mb-12 max-w-2xl">
                    <p className="text-xs font-semibold uppercase tracking-[.18em] text-zinc-400 dark:text-zinc-500">Contacto</p>
                    <h1 className="mt-4 text-4xl font-semibold tracking-[-.045em] sm:text-5xl">Hablemos de tu operación.</h1>
                    <p className="mt-5 max-w-xl text-base leading-7 text-zinc-500 dark:text-zinc-400">Cuéntanos qué necesitas conectar y nos pondremos en contacto contigo al correo indicado.</p>
                </div>

                <div className="border-t border-zinc-200 pt-10 dark:border-zinc-800">
                    <ContactForm />
                </div>
            </section>
        </main>
    );
}