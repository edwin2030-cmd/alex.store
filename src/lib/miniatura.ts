// Foto pequeña (máx. 560 px) para las tarjetas de la tienda.
// Las miniaturas viven en el Worker de Cloudflare (/mini/...). Si una foto nueva
// todavía no tiene miniatura, el Worker manda la foto grande, así que nunca falla.
const WORKER = 'https://alex-store.pedro76porro.workers.dev';
const RUTA = '/storage/v1/object/public/productos/';

export function miniatura(url: string): string {
  if (typeof url !== 'string') return url;
  const i = url.indexOf(RUTA);
  if (i === -1) return url;
  const host = url.slice(0, i);
  if (host !== WORKER && !host.endsWith('.supabase.co')) return url;
  return `${WORKER}/mini/${url.slice(i + '/storage/v1/object/public/'.length)}`;
}
