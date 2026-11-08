import { supabase } from './supabase';

/**
 * Los comprobantes de pago están en la carpeta PRIVADA "comprobantes" de Supabase.
 * En la base de datos se guarda la dirección con forma pública (.../object/public/comprobantes/recibos/...)
 * porque no caduca; para verla, el panel pide un enlace temporal firmado (solo funciona con sesión de personal).
 */
const RE_COMPROBANTE = /\/storage\/v1\/object\/(?:public|sign|authenticated)\/comprobantes\/([^?#]+)/;
const DURACION_ENLACE_PANEL_SEG = 60 * 60 * 12; // 12 horas

function archivoDe(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const m = url.match(RE_COMPROBANTE);
  return m ? decodeURIComponent(m[1]) : null;
}

/** Nombre de archivo difícil de adivinar para un comprobante nuevo. */
export function nombreComprobanteNuevo(ext: string = 'jpg'): string {
  const limpio = ['jpg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
  const azar = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');
  return `comprobante_${Date.now()}_${azar}.${limpio}`;
}

/**
 * Cambia las direcciones de comprobantes por enlaces temporales firmados (para el panel).
 * Las demás direcciones se devuelven igual. Si no se puede firmar, se deja la original.
 */
export async function firmarComprobantes<T extends string | null | undefined>(urls: T[]): Promise<T[]> {
  const resultado = [...urls];
  const lista: { idx: number; archivo: string }[] = [];
  urls.forEach((u, idx) => {
    const archivo = archivoDe(u);
    if (archivo) lista.push({ idx, archivo });
  });
  if (lista.length === 0) return resultado;
  try {
    const { data, error } = await supabase.storage
      .from('comprobantes')
      .createSignedUrls(lista.map((x) => x.archivo), DURACION_ENLACE_PANEL_SEG);
    if (error || !data) {
      console.warn('No se pudieron abrir los comprobantes privados:', error);
      return resultado;
    }
    data.forEach((d, i) => {
      if (d?.signedUrl) resultado[lista[i].idx] = d.signedUrl as T;
    });
  } catch (err) {
    console.warn('No se pudieron abrir los comprobantes privados:', err);
  }
  return resultado;
}

/**
 * Pide a la función "enlace-comprobante" un enlace TEMPORAL (30 días) a la foto del comprobante,
 * para ponerlo en el mensaje de WhatsApp. Solo funciona para pedidos recién hechos.
 * Devuelve null si no se pudo (el mensaje se envía igual).
 */
export async function pedirEnlaceTemporal(url: string | null | undefined): Promise<string | null> {
  const archivo = archivoDe(url);
  if (!archivo) return null;
  try {
    const { data, error } = await supabase.functions.invoke('enlace-comprobante', { body: { archivo } });
    if (error || !data?.url) {
      console.warn('No se pudo crear el enlace temporal del comprobante:', error || data);
      return null;
    }
    return String(data.url);
  } catch (err) {
    console.warn('No se pudo crear el enlace temporal del comprobante:', err);
    return null;
  }
}
