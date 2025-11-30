import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetDashboardDto } from '../dto/get-dashboard.dto';
import * as PdfPrinter from 'pdfmake';
import * as fonts from 'pdfmake/build/vfs_fonts';
import { GetCancellationsDto } from '../dto/get-cancellations.dto';

@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(
    dto: GetDashboardDto,
    id_branch: number | null,
    id_company: number
  ) {
    const { from, to } = dto;

    // Si el usuario ES gerente → filtra por sucursal
    // Si es admin corporativo → filtra por empresa
    const branchWhere = id_branch
      ? `o.id_branch = ${id_branch}`
      : `b.id_company = ${id_company}`;

    // ====================================
    // 1) MÉTRICAS BÁSICAS (todos las ven)
    // ====================================
    const totalsRaw = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        COALESCE(SUM(oi.subtotal), 0) AS total_sales,
        COUNT(DISTINCT o.id_order) AS total_orders,
        COALESCE(SUM(oi.quantity), 0) AS total_items
      FROM orders o
      JOIN branches b ON b.id_branch = o.id_branch
      JOIN order_items oi ON oi.id_order = o.id_order
      WHERE 
        ${branchWhere}
        AND DATE(o.created_at) BETWEEN '${from}' AND '${to}'
        AND oi.status != 'cancelled'
        AND o.status = 'delivered'              -- solo comandas completadas
        AND o.payment_status = 'paid'           -- solo comandas pagadas
    `);

    const totals = totalsRaw[0] || {};
    const totalSales = Number(totals.total_sales || 0);
    const totalOrders = Number(totals.total_orders || 0);
    const totalItems = Number(totals.total_items || 0);

    // ==========================
    // Ventas por día
    // ==========================
    const salesRaw = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        DATE(o.created_at) AS date,
        SUM(oi.subtotal) AS total
      FROM orders o
      JOIN branches b ON b.id_branch = o.id_branch
      JOIN order_items oi ON oi.id_order = o.id_order
      WHERE 
        ${branchWhere}
        AND DATE(o.created_at) BETWEEN '${from}' AND '${to}'
        AND oi.status != 'cancelled'
        AND o.status = 'delivered'
        AND o.payment_status = 'paid'
      GROUP BY DATE(o.created_at)
      ORDER BY date ASC
    `);

    const sales_over_time = salesRaw.map(r => ({
      date: r.date,
      total: Number(r.total),
    }));

    // ==========================
    // Comandas por día
    // ==========================
    const ordersRaw = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        DATE(o.created_at) AS date,
        COUNT(*) AS count
      FROM orders o
      JOIN branches b ON b.id_branch = o.id_branch
      WHERE 
        ${branchWhere}
        AND o.status = 'delivered'
        AND o.payment_status = 'paid'
        AND DATE(o.created_at) BETWEEN '${from}' AND '${to}'
      GROUP BY DATE(o.created_at)
      ORDER BY date ASC
    `);

    const orders_over_time = ordersRaw.map(r => ({
      date: r.date,
      count: Number(r.count),
    }));

    // ===============================
    // RESPUESTA BASE (para todos)
    // ===============================
    const response: any = {
      total_sales: totalSales,
      total_orders: totalOrders,
      total_items: totalItems,
      avg_ticket: totalOrders > 0 ? totalSales / totalOrders : 0,
      sales_over_time,
      orders_over_time,
    };

    // =======================================
    // 2) MÉTRICAS AVANZADAS SOLO PARA GERENTE
    // =======================================
    if (id_branch) {
      // ==========================
      // TIEMPOS PROMEDIO
      // ==========================
      const timesRaw = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT 
          AVG(TIMESTAMPDIFF(SECOND, oi.start_time, oi.ready_time)) AS prep_avg,
          AVG(TIMESTAMPDIFF(SECOND, oi.ready_time, oi.delivered_time)) AS delivery_avg,
          AVG(TIMESTAMPDIFF(SECOND, oi.start_time, oi.delivered_time)) AS total_avg
        FROM order_items oi
        JOIN orders o ON oi.id_order = o.id_order
        JOIN branches b ON b.id_branch = o.id_branch
        WHERE 
          ${branchWhere}
          AND oi.start_time IS NOT NULL
          AND oi.ready_time IS NOT NULL
          AND oi.delivered_time IS NOT NULL
          AND o.status = 'delivered'
          AND o.payment_status = 'paid'
          AND DATE(o.created_at) BETWEEN '${from}' AND '${to}';
      `);

      const times = timesRaw[0] || {};

      response.avg_prep_time = Number(times.prep_avg || 0);
      response.avg_delivery_time = Number(times.delivery_avg || 0);
      response.avg_total_time = Number(times.total_avg || 0);

      // ==========================
      // REPORTE POR ÁREA
      // ==========================
      const areasRaw = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT 
          pa.name AS area,
          COUNT(*) AS items,
          AVG(TIMESTAMPDIFF(SECOND, oi.start_time, oi.ready_time)) AS prep_avg,
          AVG(TIMESTAMPDIFF(SECOND, oi.ready_time, oi.delivered_time)) AS delivery_avg
        FROM order_items oi
        JOIN branch_products bp ON oi.id_branch_product = bp.id_branch_product
        JOIN company_products cp ON bp.id_company_product = cp.id_company_product
        JOIN print_areas pa ON pa.id_area = cp.id_area
        JOIN orders o ON o.id_order = oi.id_order
        JOIN branches b ON b.id_branch = o.id_branch
        WHERE 
          ${branchWhere}
          AND oi.status = 'delivered'
          AND oi.start_time IS NOT NULL
          AND oi.ready_time IS NOT NULL
          AND oi.delivered_time IS NOT NULL
          AND o.status = 'delivered'
          AND o.payment_status = 'paid'
          AND DATE(o.created_at) BETWEEN '${from}' AND '${to}'
        GROUP BY pa.id_area
        ORDER BY area ASC;
      `);

      response.production_areas = areasRaw.map(a => ({
        area: a.area,
        items: Number(a.items),
        prep_avg: Number(a.prep_avg || 0),
        delivery_avg: Number(a.delivery_avg || 0),
      }));

      // ==========================
      // PRODUCTOS MÁS LENTOS
      // ==========================
      const slowRaw = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT 
          cp.name AS product,
          AVG(TIMESTAMPDIFF(SECOND, oi.start_time, oi.delivered_time)) AS total_avg,
          COUNT(*) AS items
        FROM order_items oi
        JOIN branch_products bp ON oi.id_branch_product = bp.id_branch_product
        JOIN company_products cp ON bp.id_company_product = cp.id_company_product
        JOIN orders o ON o.id_order = oi.id_order
        JOIN branches b ON b.id_branch = o.id_branch
        WHERE 
          ${branchWhere}
          AND oi.status = 'delivered'
          AND oi.start_time IS NOT NULL
          AND oi.ready_time IS NOT NULL
          AND oi.delivered_time IS NOT NULL
          AND o.status = 'delivered'
          AND o.payment_status = 'paid'
          AND DATE(o.created_at) BETWEEN '${from}' AND '${to}'
        GROUP BY cp.id_company_product
        HAVING items >= 3
        ORDER BY total_avg DESC
        LIMIT 10;
      `);

      response.slowest_products = slowRaw.map(s => ({
        product: s.product,
        avg_seconds: Number(s.total_avg || 0),
        items: Number(s.items),
      }));

      // ==========================
      // PRODUCTOS MÁS RÁPIDOS
      // ==========================
      const fastRaw = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT 
          cp.name AS product,
          AVG(TIMESTAMPDIFF(SECOND, oi.start_time, oi.delivered_time)) AS total_avg,
          COUNT(*) AS items
        FROM order_items oi
        JOIN branch_products bp ON oi.id_branch_product = bp.id_branch_product
        JOIN company_products cp ON bp.id_company_product = cp.id_company_product
        JOIN orders o ON o.id_order = oi.id_order
        JOIN branches b ON b.id_branch = o.id_branch
        WHERE 
          ${branchWhere}
          AND oi.status = 'delivered'
          AND oi.start_time IS NOT NULL
          AND oi.ready_time IS NOT NULL
          AND oi.delivered_time IS NOT NULL
          AND o.status = 'delivered'
          AND o.payment_status = 'paid'
          AND DATE(o.created_at) BETWEEN '${from}' AND '${to}'
        GROUP BY cp.id_company_product
        HAVING items >= 3
        ORDER BY total_avg ASC
        LIMIT 10;
      `);

      response.fastest_products = fastRaw.map(s => ({
        product: s.product,
        avg_seconds: Number(s.total_avg || 0),
        items: Number(s.items),
      }));
    }

    if (id_branch) {
      const branch = await this.prisma.branches.findUnique({
        where: { id_branch },
        select: { name: true },
      });

      response.branch_name = branch?.name || null; 
    }
    return response;
  }

  // TOP PRODUCTOS 
  async getTopProducts(from: string, to: string, id_branch: number | null, id_company: number) {
    const whereBranch = id_branch
      ? `o.id_branch = ${id_branch}`
      : `b.id_company = ${id_company}`;

    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        cp.name AS product,
        SUM(oi.quantity) AS total_qty,
        SUM(oi.subtotal) AS total_sales
      FROM order_items oi
      JOIN branch_products bp ON oi.id_branch_product = bp.id_branch_product
      JOIN company_products cp ON bp.id_company_product = cp.id_company_product
      JOIN orders o ON o.id_order = oi.id_order
      JOIN branches b ON b.id_branch = o.id_branch
      WHERE 
        ${whereBranch}
        AND o.created_at BETWEEN '${from} 00:00:00' AND '${to} 23:59:59'
        AND oi.status != 'cancelled'
        AND o.status = 'delivered'
        AND o.payment_status = 'paid'
      GROUP BY cp.id_company_product
      ORDER BY total_qty DESC
      LIMIT 10;
    `);


    return rows.map(r => ({
      product: r.product,
      total_qty: Number(r.total_qty),
      total_sales: Number(r.total_sales),
    }));
  }

  async exportExcel(dto: GetDashboardDto, id_branch: number, id_company: number) {
    const metrics = await this.getDashboard(dto, id_branch, id_company);

    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Métricas');

    // KPIs
    sheet.addRow(['Métrica', 'Valor']);
    sheet.addRow(['Ventas totales', metrics.total_sales]);
    sheet.addRow(['Comandas', metrics.total_orders]);
    sheet.addRow(['Ticket promedio', metrics.avg_ticket]);
    sheet.addRow(['Prep. promedio (s)', metrics.avg_prep_time]);
    sheet.addRow(['Entrega promedio (s)', metrics.avg_delivery_time]);
    sheet.addRow(['Total promedio (s)', metrics.avg_total_time]);

    sheet.addRow([]);
    sheet.addRow(['Áreas de producción']);
    sheet.addRow(['Área', 'Items', 'Prep (s)', 'Entrega (s)']);

    for (const area of metrics.production_areas) {
      sheet.addRow([
        area.area,
        area.items,
        area.prep_avg,
        area.delivery_avg,
      ]);
    }

    const buffer = await wb.xlsx.writeBuffer();
    return buffer;
  }

  async getCancellationsLog(
    dto: GetCancellationsDto,
    id_branch: number | null,
    id_company: number,
  ) {
    const { from, to, id_user } = dto;

    const branchWhere = id_branch
      ? `o.id_branch = ${id_branch}`
      : `b.id_company = ${id_company}`;

    const userFilter = id_user
      ? `AND oc.id_user = ${Number(id_user)}`
      : '';

    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        oc.id                          AS id_cancellation,
        oc.created_at                  AS cancelled_at,
        oc.reason                      AS reason,
        u.name                         AS user_name,
        u.last_name                    AS user_last_name,
        oi.quantity                    AS quantity,
        cp.name                        AS product_name,
        o.id_order                     AS id_order,
        t.number                       AS table_name,
        o.order_type                   AS order_type   -- si existe en tu esquema
      FROM order_item_cancellations oc
      JOIN order_items oi 
        ON oc.id_order_item = oi.id_order_item
      JOIN orders o 
        ON oi.id_order = o.id_order
      JOIN branches b 
        ON b.id_branch = o.id_branch
      JOIN branch_products bp 
        ON oi.id_branch_product = bp.id_branch_product
      JOIN company_products cp 
        ON bp.id_company_product = cp.id_company_product
      JOIN users u 
        ON oc.id_user = u.id_user
      LEFT JOIN table_sessions ts 
        ON o.id_session = ts.id_session
      LEFT JOIN tables t
        ON ts.id_table = t.id_table
      WHERE 
        ${branchWhere}
        AND DATE(oc.created_at) BETWEEN '${from}' AND '${to}'
        ${userFilter}
      ORDER BY oc.created_at DESC;
    `);

    return rows.map(r => ({
      id_cancellation: r.id_cancellation,
      cancelled_at: r.cancelled_at,
      reason: r.reason,
      user_name: `${r.user_name} ${r.last_name ?? ''}`.trim(),
      quantity: Number(r.quantity),
      product_name: r.product_name,
      id_order: r.id_order,
      order_folio: r.order_folio,
      table_name: r.table_name,    // ahora sí viene de tables
      order_type: r.order_type,
    }));
  }


}
