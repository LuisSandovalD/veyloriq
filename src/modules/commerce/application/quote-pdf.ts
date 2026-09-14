import PDFDocument from "pdfkit";

type QuoteDocument = {
    number: string;
    currency: string;
    validUntil: Date;
    subtotal: { toString(): string };
    discountTotal: { toString(): string };
    taxTotal: { toString(): string };
    total: { toString(): string };
    terms: string | null;
    notes: string | null;
    organization: {
        name: string;
        legalName: string | null;
        taxId: string | null;
        address: string | null;
    };
    customer: {
        name: string;
        taxId: string | null;
        email: string | null;
        address: string | null;
    };
    lines: Array<{
        description: string;
        quantity: { toString(): string };
        unitPrice: { toString(): string };
        taxRate: { toString(): string };
        lineTotal: { toString(): string };
    }>;
};

export function renderQuotePdf(quote: QuoteDocument): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
        const pdf = new PDFDocument({
            size: "A4",
            margin: 46,
            bufferPages: true,
            info: {
                Title: `Cotización ${quote.number}`,
                Author: quote.organization.name,
            },
        });
        const chunks: Buffer[] = [];
        pdf.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        pdf.on("error", reject);
        pdf.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
        const money = (value: { toString(): string }) =>
            new Intl.NumberFormat("es-PE", {
                style: "currency",
                currency: quote.currency,
            }).format(Number(value));
        pdf.fontSize(24).fillColor("#0e7c66").text(quote.organization.name);
        pdf
            .fontSize(10)
            .fillColor("#60706d")
            .text(
                [
                    quote.organization.legalName,
                    quote.organization.taxId && `RUC ${quote.organization.taxId}`,
                    quote.organization.address,
                ]
                    .filter(Boolean)
                    .join(" · "),
            );
        pdf.moveDown(1.4);
        pdf.fontSize(20).fillColor("#12211f").text(`Cotización ${quote.number}`);
        pdf
            .fontSize(9)
            .fillColor("#60706d")
            .text(`Válida hasta ${quote.validUntil.toLocaleDateString("es-PE")}`);
        pdf.moveDown();
        pdf.roundedRect(46, pdf.y, 503, 62, 8).fill("#f2f6f4");
        const boxY = pdf.y + 12;
        pdf.fillColor("#12211f").fontSize(9).text("CLIENTE", 60, boxY);
        pdf.fontSize(13).text(quote.customer.name, 60, boxY + 16);
        pdf
            .fontSize(8)
            .fillColor("#60706d")
            .text(
                [
                    quote.customer.taxId,
                    quote.customer.email,
                    quote.customer.address,
                ]
                    .filter(Boolean)
                    .join(" · "),
                60,
                boxY + 35,
                { width: 470 },
            );
        pdf.y = boxY + 70;
        const widths = [245, 55, 75, 55, 73];
        const headers = ["DESCRIPCIÓN", "CANT.", "PRECIO", "IGV", "TOTAL"];
        let y = pdf.y;
        const header = () => {
            pdf.rect(46, y, 503, 24).fill("#0e7c66");
            let x = 46;
            headers.forEach((label, index) => {
                pdf
                    .fillColor("white")
                    .fontSize(8)
                    .text(label, x + 5, y + 8, {
                        width: (widths[index] ?? 50) - 10,
                        align: index ? "right" : "left",
                    });
                x += widths[index] ?? 50;
            });
            y += 24;
        };
        header();
        for (const line of quote.lines) {
            if (y > 730) {
                pdf.addPage();
                y = 46;
                header();
            }
            let x = 46;
            const cells = [
                line.description,
                line.quantity.toString(),
                money(line.unitPrice),
                `${line.taxRate.toString()}%`,
                money(line.lineTotal),
            ];
            cells.forEach((value, index) => {
                pdf
                    .fillColor("#12211f")
                    .fontSize(8)
                    .text(value, x + 5, y + 8, {
                        width: (widths[index] ?? 50) - 10,
                        height: 28,
                        ellipsis: true,
                        align: index ? "right" : "left",
                    });
                x += widths[index] ?? 50;
            });
            pdf.moveTo(46, y + 34).lineTo(549, y + 34).strokeColor("#dfe6e2").stroke();
            y += 35;
        }
        y += 12;
        const totals = [
            ["Subtotal", money(quote.subtotal)],
            ["Descuentos", money(quote.discountTotal)],
            ["Impuestos", money(quote.taxTotal)],
            ["Total", money(quote.total)],
        ];
        totals.forEach(([label, value], index) => {
            pdf
                .fontSize(index === 3 ? 12 : 9)
                .fillColor(index === 3 ? "#0e7c66" : "#60706d")
                .text(label ?? "", 365, y, { width: 80, align: "right" })
                .text(value ?? "", 452, y, { width: 97, align: "right" });
            y += index === 3 ? 22 : 17;
        });
        if (quote.terms || quote.notes) {
            pdf.moveDown();
            pdf.fontSize(9).fillColor("#12211f").text("Condiciones", 46, y);
            pdf
                .fontSize(8)
                .fillColor("#60706d")
                .text(
                    [quote.terms, quote.notes].filter(Boolean).join("\n\n"),
                    46,
                    y + 15,
                    { width: 503 },
                );
        }
        const pages = pdf.bufferedPageRange();
        for (let index = pages.start; index < pages.start + pages.count; index++) {
            pdf.switchToPage(index);
            pdf
                .fontSize(7)
                .fillColor("#60706d")
                .text(
                    `Página ${index + 1} de ${pages.count}`,
                    46,
                    812,
                    { width: 503, align: "right" },
                );
        }
        pdf.end();
    });
}
