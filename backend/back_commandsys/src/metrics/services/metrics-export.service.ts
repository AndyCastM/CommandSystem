import { Injectable } from '@nestjs/common';
const PdfPrinter = require('pdfmake');
import { MetricsService } from './metrics.service';
import { GetDashboardDto } from '../dto/get-dashboard.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MetricsExportService {
  private printer: any;

  constructor(private metrics: MetricsService, private prisma: PrismaService) {
    // Usar Helvetica nativa de PDFKit
    this.printer = new PdfPrinter({
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      },
    });
  }

  // ========= HELPERs =========
  private formatCurrency(n: number): string {
    return `MX$ ${n.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;
  }

  private secondsToMinutesLabel(sec?: number): string {
    if (!sec || sec <= 0) return '-';
    return `${(sec / 60).toFixed(1)} min`;
  }

  // ========= PDF MINIMALISTA =========
  async exportPDF(
    dto: GetDashboardDto,
    id_branch: number | null,
    id_company: number,
  ): Promise<Buffer> {
    const data = await this.metrics.getDashboard(dto, id_branch, id_company);

    const rangeLabel = `Del ${dto.from} al ${dto.to}`;
    const branchLabel = data.branch_name
    ? `Sucursal: ${data.branch_name}`
    : `Empresa: ${id_company}`;

    const docDefinition: any = {
    pageMargins: [50, 60, 50, 50],

    defaultStyle: {
        font: 'Helvetica',
        fontSize: 10,
        color: '#1c1c1e'
    },

    footer: (page, pages) => ({
        text: `CommandSys · ${page}/${pages}`,
        alignment: 'center',
        margin: [0, 20, 0, 0],
        fontSize: 8,
        color: '#aeaeb2'
    }),

    styles: {
        h1: {
        fontSize: 22,
        bold: true,
        color: '#1c1c1e',
        margin: [0, 0, 0, 2]
        },
        h2: {
        fontSize: 14,
        bold: true,
        margin: [0, 16, 0, 8],
        color: '#1c1c1e'
        },
        subtitle: {
        fontSize: 10,
        color: '#8e8e93',
        margin: [0, 0, 0, 16]
        },
        smallLabel: {
        fontSize: 9,
        color: '#8e8e93'
        },
        kpiValue: {
        fontSize: 20,
        bold: true,
        margin: [0, 2, 0, 0]
        },
        tableHeader: {
        color: '#8e8e93',
        bold: true,
        fillColor: '#f5f5f7'
        }
    },

    content: [
        // =========================
        // ENCABEZADO TIPO APPLE
        // =========================
        {
        columns: [
            [
                { text: 'Reporte de métricas', style: 'h1' },
                { text: `Del ${dto.from} al ${dto.to}`, style: 'subtitle' },
                ...(data.branch_name
                    ? [{ text: data.branch_name, style: 'smallLabel' }]
                    : [])
            ],
            {
            alignment: 'right',
            stack: [
                { text: data.branch_name ? 'Sucursal' : 'Empresa', style: 'smallLabel' },
                { text: id_branch ? `ID Sucursal: ${id_branch}` : `ID Empresa: ${id_company}`, fontSize: 10 },
                { text: new Date().toLocaleString('es-MX'), style: 'smallLabel' }
            ]
            }
        ]
        },

        // Línea divisoria Apple
        {
        canvas: [
            { type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: '#e5e5ea' }
        ],
        margin: [0, 12, 0, 20]
        },

        // =========================
        // KPIs APPLE CARDS
        // =========================
        { text: 'Resumen', style: 'h2' },

        {
        table: {
            widths: ['*', '*'],
            body: [
            [
                {
                stack: [
                    { text: 'Ventas totales', style: 'smallLabel' },
                    { text: this.formatCurrency(data.total_sales), style: 'kpiValue' }
                ],
                border: [false, false, false, false],
                margin: [0, 6]
                },
                {
                stack: [
                    { text: 'Comandas', style: 'smallLabel' },
                    { text: String(data.total_orders), style: 'kpiValue' }
                ],
                border: [false, false, false, false],
                margin: [0, 6]
                }
            ],
            [
                {
                stack: [
                    { text: 'Ticket promedio', style: 'smallLabel' },
                    { text: this.formatCurrency(data.avg_ticket), style: 'kpiValue' }
                ],
                border: [false, false, false, false],
                margin: [0, 6]
                },
                {
                stack: [
                    { text: 'Productos vendidos', style: 'smallLabel' },
                    { text: String(data.total_items), style: 'kpiValue' }
                ],
                border: [false, false, false, false],
                margin: [0, 6]
                }
            ]
            ]
        },
        layout: {
            paddingTop: () => 12,
            paddingBottom: () => 12
        }
        },

        // =========================
        // TIEMPOS PROMEDIO
        // =========================
        ...(data.avg_total_time
        ? [
            { text: 'Tiempos promedio', style: 'h2' },
            {
                table: {
                widths: ['*', '*', '*'],
                body: [
                    [
                    { text: 'Preparación', style: 'tableHeader' },
                    { text: 'Entrega', style: 'tableHeader' },
                    { text: 'Total', style: 'tableHeader' }
                    ],
                    [
                    this.secondsToMinutesLabel(data.avg_prep_time),
                    this.secondsToMinutesLabel(data.avg_delivery_time),
                    this.secondsToMinutesLabel(data.avg_total_time)
                    ]
                ]
                },
                layout: 'lightHorizontalLines'
            }
            ]
        : []),

        // =========================
        // ÁREAS DE PRODUCCIÓN
        // =========================
        ...(data.production_areas?.length
        ? [
            { text: 'Áreas de producción', style: 'h2' },
            {
                table: {
                widths: ['*', 40, 60, 60, 60],
                body: [
                    [
                    { text: 'Área', style: 'tableHeader' },
                    { text: 'Items', style: 'tableHeader' },
                    { text: 'Prep', style: 'tableHeader' },
                    { text: 'Entrega', style: 'tableHeader' },
                    { text: 'Total', style: 'tableHeader' }
                    ],
                    ...data.production_areas.map((a) => [
                    a.area,
                    a.items,
                    this.secondsToMinutesLabel(a.prep_avg),
                    this.secondsToMinutesLabel(a.delivery_avg),
                    this.secondsToMinutesLabel(a.prep_avg + a.delivery_avg)
                    ])
                ]
                },
                layout: 'lightHorizontalLines'
            }
            ]
        : []),

        // =========================
        // PRODUCTOS LENTOS
        // =========================
        ...(data.slowest_products?.length
        ? [
            { text: 'Productos más lentos', style: 'h2' },
            {
                table: {
                widths: ['*', 40, 80],
                body: [
                    [
                    { text: 'Producto', style: 'tableHeader' },
                    { text: 'Items', style: 'tableHeader' },
                    { text: 'Tiempo prom.', style: 'tableHeader' }
                    ],
                    ...data.slowest_products.map((p) => [
                    p.product,
                    p.items,
                    this.secondsToMinutesLabel(p.avg_seconds)
                    ])
                ]
                },
                layout: 'lightHorizontalLines'
            }
            ]
        : []),

        // =========================
        // PRODUCTOS RÁPIDOS
        // =========================
        ...(data.fastest_products?.length
        ? [
            { text: 'Productos más rápidos', style: 'h2' },
            {
                table: {
                widths: ['*', 40, 80],
                body: [
                    [
                    { text: 'Producto', style: 'tableHeader' },
                    { text: 'Items', style: 'tableHeader' },
                    { text: 'Tiempo prom.', style: 'tableHeader' }
                    ],
                    ...data.fastest_products.map((p) => [
                    p.product,
                    p.items,
                    this.secondsToMinutesLabel(p.avg_seconds)
                    ])
                ]
                },
                layout: 'lightHorizontalLines'
            }
            ]
        : [])
    ]
    };

        const pdfDoc = (this as any).printer.createPdfKitDocument(docDefinition);
        const chunks: Buffer[] = [];

        return await new Promise<Buffer>((resolve) => {
        pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
        pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
        pdfDoc.end();
        });
    }
}