export interface Area {
  id_area: number;
  name: string;
}

export interface PrinterConfig {
  printerIp: string;
  displayName: string;
  isActive: number;
  areas: { id_area: number; name: string }[];
}
