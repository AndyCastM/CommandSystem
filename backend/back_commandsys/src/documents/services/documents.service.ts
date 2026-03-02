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
              include: { 
                product_option_values: {
                  include: {
                    product_options: { // <--- Necesario para saber a qué grupo pertenece la opción
                      include: { product_option_tiers: true } // <--- Necesario para ver los precios extra por cantidad
                    }
                  }
                } 
              },
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
                  include: { 
                    product_option_values: {
                      include: {
                        product_options: { // <--- Necesario para saber a qué grupo pertenece la opción
                          include: { product_option_tiers: true } // <--- Necesario para ver los precios extra por cantidad
                        }
                      }
                    } 
                  },
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
    doc.font('Courier').fontSize(8);

    doc.text(company.name.toUpperCase(), { align: 'center' });
    doc.text(company.legal_name.toUpperCase(), { align: 'center' });
    doc.text(`RFC: ${company.rfc}`, { align: 'center' });

    doc.moveDown(0.2);

    doc.text(
      `${company.street} ${company.num_ext ?? ''}, ${company.colony}`.toUpperCase(),
      { align: 'center' }
    );

    doc.text(
      `${company.city}, ${company.state} CP ${company.cp}`.toUpperCase(),
      { align: 'center' }
    );

    doc.text(`TEL ${company.phone}`, { align: 'center' });

    doc.text('----------------------------------------');
  }

  private printItems(doc: PDFDocument, items: any[]): number {
    type Line = {
      qty: number;
      name: string;
      basePrice: number;
      modifiers: { name: string; extra: number }[];
      tiers: { name: string; extra: number }[];      subtotal: number;
    };

    const agg = new Map<string, Line>();
    let totalOrder = 0;

    for (const item of items) {
      if (item.status === 'cancelled') continue;

      const name = item.branch_products?.company_products?.name ?? 'PRODUCTO';
      const basePrice = Number(item.branch_products?.company_products?.base_price ?? 0);
      const subtotal = Number(item.subtotal ?? 0);
      const qty = Number(item.quantity ?? 1);

      const modifiers: { name: string; extra: number }[] = [];
      const tiersFound: { name: string; extra: number }[] = [];
      const optionsByGroup = new Map<number, any[]>();

      for (const opt of item.order_item_options ?? []) {
        const val = opt.product_option_values;
        if (!val) continue;

        const extra = Number(val.extra_price ?? 0);
        if (extra > 0) {
          modifiers.push({
            name: val.name.toUpperCase(),
            extra
          });
        }

        // Agrupación para Tiers
        const groupId = val.id_option;
        if (!optionsByGroup.has(groupId)) optionsByGroup.set(groupId, []);
        optionsByGroup.get(groupId)!.push(val);
      }

      // Lógica de Tiers
      for (const [groupId, selectedValues] of optionsByGroup) {
        const groupDef = selectedValues[0]?.product_options;
        if (groupDef?.multi_select && groupDef.product_option_tiers?.length > 0) {
          const count = selectedValues.length;
          const tier = groupDef.product_option_tiers.find(t => t.selection_count === count);
          if (tier && Number(tier.extra_price) > 0) {
            tiersFound.push({ 
              name: `${count} ${groupDef.name.toUpperCase()}`, 
              extra: Number(tier.extra_price) 
            });
          }
        }
      }

      const modKey = modifiers.map(m => `${m.name}:${m.extra}`).join('|');
      const key = `${name}||${basePrice}||${modKey}`;

      const current = agg.get(key);
      if (current) {
        current.qty += qty;
        current.subtotal += subtotal;
      } else {
        agg.set(key, {
          qty,
          name: name.toUpperCase(),
          basePrice,
          modifiers,
          tiers: tiersFound, 
          subtotal
        });
      }

      totalOrder += subtotal;
    }

    doc.font('Courier').fontSize(8);

    // HEADER COLUMNAS
    doc.text('CANT.  DESCRIPCION               IMPORTE');
    doc.text('----------------------------------------');

    for (const [, line] of agg) {

      const qty = line.qty.toString().padStart(3, ' ');
      const desc = line.name.substring(0, 22).padEnd(22, ' ');
      const amount = line.subtotal.toFixed(2).padStart(8, ' ');

      doc.text(`${qty}   ${desc}   ${amount}`);

      // BASE
      doc.text(
        `      BASE (${line.basePrice.toFixed(2)})`
      );

      // MODIFICADORES
      for (const mod of line.modifiers) {
        doc.text(
          `      + ${mod.name} (+${mod.extra.toFixed(2)})`
        );
      }

      // Render de Tiers
      for (const tier of line.tiers) {
        doc.font('Courier').text(`      * ${tier.name} (+${tier.extra.toFixed(2)})`);
        doc.font('Courier');
      }

      doc.moveDown(0.2);
    }

    const totalArticulos = Array.from(agg.values())
      .reduce((sum, item) => sum + item.qty, 0);

    doc.text('----------------------------------------');
    doc.text(`ARTICULOS: ${totalArticulos}`);
    
    return totalOrder;
  }

  // =====================================================
  //  TOTALS
  // =====================================================
  private printTotals(doc: PDFDocument, total: number, taxPercentage: number) {
      doc.text('----------------------------------------');

    const subtotal = total / (1 + taxPercentage / 100);
    const tax = total - subtotal;

    doc.text(
      'SUBTOTAL:'.padEnd(30, ' ') +
      subtotal.toFixed(2).padStart(8, ' ')
    );

    doc.text(
      `IVA ${taxPercentage}%:`.padEnd(30, ' ') +
      tax.toFixed(2).padStart(8, ' ')
    );

    doc.text('----------------------------------------');

    doc.font('Courier-Bold').fontSize(10);

    doc.text(
      'TOTAL:'.padEnd(30, ' ') +
      total.toFixed(2).padStart(8, ' ')
    );

    doc.font('Courier').fontSize(8);

    doc.text('----------------------------------------');
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
    doc.moveDown(0.2);
    doc.text('------------------------------------------', { align: 'center' });
    doc.moveDown(0.2);
  }
}