import { Producto } from '../types';

// Un producto está en promoción si tiene precio anterior mayor al actual y la oferta no ha vencido.
export function enPromocion(p: Pick<Producto, 'precio' | 'precio_antes' | 'oferta_hasta'>): boolean {
  const antes = Number(p.precio_antes) || 0;
  if (!(antes > Number(p.precio))) return false;
  if (p.oferta_hasta && new Date(p.oferta_hasta).getTime() <= Date.now()) return false;
  return true;
}

export function ahorro(p: Pick<Producto, 'precio' | 'precio_antes'>): number {
  return Math.max(0, Math.round(((Number(p.precio_antes) || 0) - Number(p.precio)) * 100) / 100);
}

// Texto corto de cuánto falta: "Termina hoy", "Quedan 3 días", "Hasta el domingo 22/11"
export function textoVencimiento(oferta_hasta?: string | null): string | null {
  if (!oferta_hasta) return null;
  const fin = new Date(oferta_hasta);
  const ms = fin.getTime() - Date.now();
  if (ms <= 0) return null;
  const horas = ms / 3600000;
  if (horas < 24) return horas < 1 ? '¡Últimos minutos!' : `¡Termina en ${Math.ceil(horas)} h!`;
  const dias = Math.ceil(horas / 24);
  const dia = fin.toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'numeric', timeZone: 'America/Panama' });
  return dias <= 1 ? '¡Termina mañana!' : `Quedan ${dias} días · hasta el ${dia}`;
}
