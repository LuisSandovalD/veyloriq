import Link from "next/link";
import { Layers3 } from "lucide-react";

export default function TermsPage() {
    const legal = process.env.OPERATOR_LEGAL_NAME;

    return (
        <>
            <nav className="container landing-nav">
                <Link className="brand" href="/">
                    <span className="brand-mark">
                        <Layers3 size={18} />
                    </span>
                    VEYLORIQ
                </Link>
            </nav>

            <main className="container section" style={{ maxWidth: 800 }}>
                <div className="eyebrow">Condiciones</div>
                <h1>Términos del servicio</h1>

                {!legal ? (
                    <div className="form-error">
                        Datos contractuales del operador no configurados. No publicar hasta
                        completar la identidad legal y las condiciones comerciales definitivas.
                    </div>
                ) : (
                    <>
                        <p>
                            El servicio VEYLORIQ es operado por {legal}, identificación{" "}
                            {process.env.OPERATOR_TAX_ID}.
                        </p>

                        <h2>Alcance</h2>
                        <p className="muted">
                            VEYLORIQ ofrece gestión operativa empresarial. No constituye
                            contabilidad fiscal oficial, asesoría legal ni facturación
                            electrónica certificada.
                        </p>

                        <h2>Cuenta y uso</h2>
                        <p className="muted">
                            La organización administra sus usuarios, permisos y datos. Está
                            prohibido abusar del servicio, vulnerar aislamiento o cargar
                            contenido ilícito.
                        </p>

                        <h2>Planes y cobros</h2>
                        <p className="muted">
                            El precio, ciclo, límites, período de gracia, cancelación y
                            prorrateo aplicables son los mostrados durante la contratación y
                            confirmados por el proveedor de pago.
                        </p>
                    </>
                )}
            </main>
        </>
    );
}
