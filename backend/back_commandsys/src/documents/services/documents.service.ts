import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  // =====================================================
  //  TICKET TAKEOUT
  // =====================================================
  async generateTakeoutPrebill(id_order: number, res: Response) {
    const order = await this.prisma.orders.findUnique({
      where: { id_order },
      include: {
        branches: {
          include: {
            companies: true,
          },
        },
        order_items: {
          include: {
            branch_products: {
              include: { company_products: true },
            },
            order_item_options: {
              include: { product_option_values: true },
            },
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Orden no encontrada');

    const company = order.branches?.companies;
    if (!company) throw new NotFoundException('Empresa no encontrada');

    const doc = new PDFDocument({
      size: [226, 1200],
      margin: 10,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename=ticket-${id_order}.pdf`,
    );

    doc.pipe(res);

    this.printHeader(doc, company);

    doc.fontSize(8);
    doc.text(`Orden: #${id_order}`);
    doc.text(`Cliente: ${order.customer_name ?? 'Mostrador'}`);
    doc.text(`Fecha: ${new Date().toLocaleString('es-MX')}`);

    this.separator(doc);

    const total = this.printItems(doc, order.order_items);

    this.printTotals(doc, total, Number(company.tax_percentage));

    this.printFooter(doc, company);

    doc.end();
  }

  // =====================================================
  //  TICKET MESA
  // =====================================================
  async generateTablePrebill(id_session: number, res: Response) {
    const session = await this.prisma.table_sessions.findUnique({
      where: { id_session },
      include: {
        tables: {
          include: {
            branches: {
              include: {
                companies: true,
              },
            },
          },
        },
        orders: {
          include: {
            order_items: {
              include: {
                branch_products: {
                  include: { company_products: true },
                },
                order_item_options: {
                  include: { product_option_values: true },
                },
              },
            },
          },
        },
      },
    });

    if (!session) throw new NotFoundException('Sesión no encontrada');

    const company = session.tables?.branches?.companies;
    if (!company) throw new NotFoundException('Empresa no encontrada');

    const doc = new PDFDocument({
      size: [226, 1600],
      margin: 10,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename=ticket-mesa-${session.tables?.number}.pdf`,
    );

    doc.pipe(res);

    this.printHeader(doc, company);

    doc.fontSize(8);
    doc.text(`Mesa: ${session.tables?.number}`);
    doc.text(`Sesión: #${id_session}`);
    doc.text(`Fecha: ${new Date().toLocaleString('es-MX')}`);

    this.separator(doc);

    const allItems = session.orders.flatMap(o => o.order_items);
    const total = this.printItems(doc, allItems);

    this.printTotals(doc, total, Number(company.tax_percentage));

    this.printFooter(doc, company);

    doc.end();
  }

  // =====================================================
  //  HEADER
  // =====================================================
  private printHeader(doc: PDFDocument, company: any) {
    doc.font('Courier');
    doc.fontSize(8);

    if (company.ticket_header) {
      doc.text(company.ticket_header, { align: 'center' });
      doc.moveDown(0.5);
    }

    doc.font('Courier-Bold').fontSize(11);
    doc.text(company.name, { align: 'center' });

    doc.font('Courier').fontSize(8);
    doc.text(company.legal_name, { align: 'center' });
    doc.text(`RFC: ${company.rfc}`, { align: 'center' });

    doc.moveDown(0.3);
    doc.text(
      `${company.street} ${company.num_ext ?? ''}, ${company.colony}`,
      { align: 'center' }
    );
    doc.text(
      `${company.city}, ${company.state} CP: ${company.cp}`,
      { align: 'center' }
    );
    doc.text(`Tel: ${company.phone}`, { align: 'center' });

    this.separator(doc);
  }

  // =====================================================
  //  ITEMS AGRUPADOS
  // =====================================================
  private printItems(doc: PDFDocument, items: any[]): number {
    type Line = {
        qty: number;
        name: string;
        basePrice: number;
        modifiers: { name: string; extra: number }[];
        subtotal: number;
    };

    const agg = new Map<string, Line>();
    let total = 0;

    for (const item of items) {
        if (item.status === 'cancelled') continue;

        const name = item.branch_products?.company_products?.name ?? 'Producto';
        const basePrice = Number(item.branch_products?.company_products?.base_price ?? 0);

        const modifiers =
        (item.order_item_options ?? [])
            .map((x: any) => ({
            name: x.product_option_values?.name ?? '',
            extra: Number(x.product_option_values?.extra_price ?? 0),
            }))
            .filter((m: any) => m.extra > 0); // solo los que cuestan

        // clave para agrupar (producto + modificadores)
        const modKey = modifiers
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((m) => `${m.name}:${m.extra}`)
        .join('|');

        const key = `${name}||${basePrice}||${modKey}`;

        const qty = Number(item.quantity ?? 1);

        // subtotal real ya viene de BD (incluye extras)
        const subtotal = Number(item.subtotal ?? 0);

        const current = agg.get(key);
        if (current) {
        current.qty += qty;
        current.subtotal += subtotal;
        } else {
        agg.set(key, {
            qty,
            name,
            basePrice,
            modifiers,
            subtotal,
        });
        }

        total += subtotal;
    }

    doc.font('Courier').fontSize(8);

    for (const [, line] of agg) {
        // Producto principal
        doc.font('Courier-Bold');
        doc.text(`${line.qty}x ${line.name}`);

        // Precio base
        doc.font('Courier');
        doc.text(`   $${line.basePrice.toFixed(2)}`);

        // Modificadores
        for (const mod of line.modifiers) {
        doc.text(
            `   + ${mod.name}   $${mod.extra.toFixed(2)}`
        );
        }

        // Subtotal de esa línea
        doc.moveDown(0.2);
        doc.text(
        `   SUBTOTAL: $${line.subtotal.toFixed(2)}`,
        { align: 'right' }
        );

        doc.moveDown(0.5);
    }

    return total;
    }
  // =====================================================
  //  TOTALS
  // =====================================================
  private printTotals(doc: PDFDocument, total: number, taxPercentage: number) {
    this.separator(doc);

    const subtotal = total / (1 + taxPercentage / 100);
    const tax = total - subtotal;

    doc.fontSize(8);
    doc.text(`Subtotal: $${subtotal.toFixed(2)}`, { align: 'right' });
    doc.text(`IVA ${taxPercentage}%: $${tax.toFixed(2)}`, { align: 'right' });

    doc.font('Courier-Bold').fontSize(11);
    doc.text(`TOTAL: $${total.toFixed(2)}`, { align: 'right' });

    doc.font('Courier');
  }

  // =====================================================
  //  FOOTER
  // =====================================================
  private printFooter(doc: PDFDocument, company: any) {
    doc.moveDown(0.8);
    this.separator(doc);

    if (company.ticket_footer) {
      doc.fontSize(8).text(company.ticket_footer, { align: 'center' });
    }
  }

  // =====================================================
  //  SEPARATOR
  // =====================================================
  private separator(doc: PDFDocument) {
    doc.moveDown(0.5);
    doc.text('--------------------------------');
    doc.moveDown(0.5);
  }
}