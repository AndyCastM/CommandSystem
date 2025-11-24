import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetDashboardDto } from '../dto/get-dashboard.dto';

@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(dto: GetDashboardDto, id_branch: number | null) {
    const { from, to } = dto;

    const branchWhere = id_branch
      ? `o.id_branch = ${id_branch}`
      : `1 = 1`;

    //   RAW QUERY: KPIs
    const totalsRaw = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        COALESCE(SUM(oi.subtotal), 0) AS total_sales,
        COUNT(DISTINCT o.id_order) AS total_orders,
        COALESCE(SUM(oi.quantity), 0) AS total_items
      FROM orders o
      JOIN order_items oi ON oi.id_order = o.id_order
      WHERE 
        ${branchWhere}
        AND DATE(o.created_at) BETWEEN '${from}' AND '${to}'
        AND oi.status != 'cancelled'
    `);

    const totals = totalsRaw[0] || {};
    const totalSales = Number(totals.total_sales || 0);
    const totalOrders = Number(totals.total_orders || 0);
    const totalItems = Number(totals.total_items || 0);

    //   RAW QUERY: Ventas por día
    const salesRaw = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        DATE(o.created_at) AS date,
        COALESCE(SUM(oi.subtotal), 0) AS total
      FROM orders o
      JOIN order_items oi ON oi.id_order = o.id_order
      WHERE 
        ${branchWhere}
        AND DATE(o.created_at) BETWEEN '${from}' AND '${to}'
        AND oi.status != 'cancelled'
      GROUP BY DATE(o.created_at)
      ORDER BY date ASC
    `);

    const sales_over_time = salesRaw.map(r => ({
      date: r.date,
      total: Number(r.total),
    }));


    //   RAW QUERY: Comandas por día
    const ordersRaw = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        DATE(created_at) AS date,
        COUNT(*) AS count
      FROM orders o
      WHERE 
        ${branchWhere}
        AND o.status IN ('ready', 'delivered')
        AND DATE(o.created_at) BETWEEN '${from}' AND '${to}'
      GROUP BY DATE(o.created_at)
      ORDER BY date ASC
    `);

    const orders_over_time = ordersRaw.map(r => ({
      date: r.date,
      count: Number(r.count),
    }));


    return {
      total_sales: totalSales,
      total_orders: totalOrders,
      total_items: totalItems,
      avg_ticket: totalOrders > 0 ? totalSales / totalOrders : 0,
      sales_over_time,
      orders_over_time,
    };
  }

  async getTopProducts(from: string, to: string, id_branch: number | null) {
    const whereBranch = id_branch
      ? `oi.id_branch = ${id_branch}`
      : `1 = 1`;

    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        cp.name AS product,
        SUM(oi.quantity) AS total_qty,
        SUM(oi.subtotal) AS total_sales
      FROM order_items oi
      JOIN branch_products bp ON oi.id_branch_product = bp.id_branch_product
      JOIN company_products cp ON bp.id_company_product = cp.id_company_product
      JOIN orders o ON o.id_order = oi.id_order
      WHERE 
        ${whereBranch}
        AND o.created_at BETWEEN '${from} 00:00:00' AND '${to} 23:59:59'
        AND oi.status != 'cancelled'
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

}
