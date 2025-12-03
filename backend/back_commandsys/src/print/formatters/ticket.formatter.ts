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
    group: number;
    options: string[];
    notes?: string;
  }[];
}) {

  const orderTypeMap: any = {
    dine_in: "PARA COMER AQUI",
    takeout: "PARA LLEVAR",
  };

  const text: string[] = [];

  // Encabezado
  text.push("-".repeat(TICKET_WIDTH));
  text.push(center(`AREA: ${payload.areaName.toUpperCase()}`));
  text.push(center(orderTypeMap[payload.orderType] || "ORDEN"));
  text.push("-".repeat(TICKET_WIDTH));

  text.push(`Comanda: #${payload.id_order}`);
  if (payload.mesa) text.push(`Mesa: ${payload.mesa}`);
  if (payload.mesero) text.push(`Mesero: ${payload.mesero}`);
  text.push(`Fecha: ${payload.created_at}`);

  text.push("-".repeat(TICKET_WIDTH));

  // AGRUPAR ITEMS POR GRUPO
  const groups = new Map<number, typeof payload.items>();

  for (const item of payload.items) {
    if (!groups.has(item.group)) groups.set(item.group, []);
    groups.get(item.group)!.push(item);
  }

  // IMPRIMIR POR GRUPO
  for (const [group, items] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {

    // AGRUPAR items idénticos
    const groupedItems = new Map<string, any>();

    for (const item of items) {
      const key = `${item.name}||${item.options.join(',')}||${item.notes ?? ''}`;

      if (!groupedItems.has(key)) {
        groupedItems.set(key, {
          ...item,
          quantity: item.quantity
        });
      } else {
        groupedItems.get(key)!.quantity += item.quantity;
      }
    }

    // IMPRIMIR GRUPO
    text.push(center(`GRUPO ${group}`));
    text.push("-".repeat(TICKET_WIDTH));

    for (const item of groupedItems.values()) {
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
}


  text.push("");
  return text.join("\n");
}

function center(text: string): string {
  const pad = Math.floor((TICKET_WIDTH - text.length) / 2);
  return pad < 0 ? text : " ".repeat(pad) + text;
}
