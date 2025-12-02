const TICKET_WIDTH = 48; 

export function buildTicketFormat(payload: {
  companyHeader?: string;
  companyFooter?: string;
  areaName: string;
  orderType: "dine_in" | "takeout";
  id_order: number;
  mesa?: string;
  mesero?: string;
  created_at: string;
  items: {
    id_order_item: number;
    quantity: number;
    name: string;
    options: string[];
    notes?: string;
  }[];
}) {
  const orderTypeMap: any = {
    dine_in: "PARA COMER AQUI",
    takeout: "PARA LLEVAR",
  };

  const text: string[] = [];

  text.push("-".repeat(TICKET_WIDTH));
  text.push(center(`AREA: ${payload.areaName.toUpperCase()}`));
  text.push(center(orderTypeMap[payload.orderType] || "ORDEN"));
  text.push("-".repeat(TICKET_WIDTH));

  text.push(`Comanda: #${payload.id_order}`);
  if (payload.mesa) text.push(`Mesa: ${payload.mesa}`);
  if (payload.mesero) text.push(`Mesero: ${payload.mesero}`);
  text.push(`Fecha: ${payload.created_at}`);

  text.push("-".repeat(TICKET_WIDTH));
  text.push(center("DETALLE DE ITEMS"));
  text.push("-".repeat(TICKET_WIDTH));

  for (const item of payload.items) {
    text.push(`${item.quantity} x ${item.name}`);
    text.push(`   (Item ID: ${item.id_order_item})`);

    for (const opt of item.options) {
      text.push(`   - ${opt}`);
    }

    if (item.notes) {
      text.push(`   * Nota: ${item.notes}`);
    }

    text.push("");
  }

  text.push("-".repeat(TICKET_WIDTH));
  text.push("");

  return text.join("\n");
}

function center(text: string): string {
  const pad = Math.floor((TICKET_WIDTH - text.length) / 2);
  if (pad < 0) return text;
  return " ".repeat(pad) + text;
}
