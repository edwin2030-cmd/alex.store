import { Categoria, Producto } from '../types';

export const WHATSAPP_STORE_PHONE = '50766212802';

/**
 * Normaliza cadenas para comparaciones flexibles (elimina tildes, mayúsculas, espacios extra)
 */
export const normalizeText = (str?: string | null): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

/**
 * Determina si una categoría o producto corresponde al servicio de "Arreglo de fútbol".
 * Reconoce "Arreglo de fútbol", "Arreglo futbol", "Arreglos de fútbol", y el typo "arrerglo de futbol".
 */
export const isArregloFutbol = (
  categoriaOrNombre?: Categoria | string | null,
  producto?: Producto | null,
  categoriasList: Categoria[] = []
): boolean => {
  const textsToCheck: string[] = [];

  if (typeof categoriaOrNombre === 'string') {
    textsToCheck.push(categoriaOrNombre);
  } else if (categoriaOrNombre && typeof categoriaOrNombre === 'object') {
    if (categoriaOrNombre.nombre) textsToCheck.push(categoriaOrNombre.nombre);
    if (categoriaOrNombre.descripcion) textsToCheck.push(categoriaOrNombre.descripcion);
  }

  if (producto) {
    if (producto.categoria_id && categoriasList.length > 0) {
      const cat = categoriasList.find((c) => c.id === producto.categoria_id);
      if (cat?.nombre) textsToCheck.push(cat.nombre);
      if (cat?.descripcion) textsToCheck.push(cat.descripcion);
    }
    if (producto.nombre) textsToCheck.push(producto.nombre);
    if (producto.descripcion) textsToCheck.push(producto.descripcion);
  }

  return textsToCheck.some((txt) => {
    const norm = normalizeText(txt);
    // Detecta "arreglo" o el typo "arrerglo"
    return norm.includes('arreglo') || norm.includes('arrerglo');
  });
};

/**
 * Genera el enlace de WhatsApp estructurado como un recibo formal para solicitudes de arreglo
 */
export const generarWhatsAppReciboArreglo = (params: {
  producto: Producto;
  categoriaNombre?: string;
  talla?: string;
  opcionesSeleccionadas?: Record<string, string>;
  cantidad?: number;
}): string => {
  const { producto, categoriaNombre = 'Arreglo de fútbol', talla, opcionesSeleccionadas, cantidad = 1 } = params;

  // Obtener enlace completo de la imagen
  let imgUrl = producto.imagen_url || (producto.imagenes && producto.imagenes[0]) || '';
  if (imgUrl && imgUrl.startsWith('/')) {
    imgUrl = `${window.location.origin}${imgUrl}`;
  }

  const opcionesArr: string[] = [];
  if (talla) {
    opcionesArr.push(`• *Talla / Medida:* ${talla}`);
  }
  if (opcionesSeleccionadas) {
    Object.entries(opcionesSeleccionadas).forEach(([k, v]) => {
      if (k.toLowerCase() !== 'talla') {
        opcionesArr.push(`• *${k}:* ${v}`);
      }
    });
  }

  const fechaActual = new Date().toLocaleDateString('es-PA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const mensaje = [
    `🧾 *SOLICITUD DE ARREGLO DE FÚTBOL • ALEX STORE* 🧾`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📅 *Fecha:* ${fechaActual}`,
    `⚽ *Servicio / Prenda:* *${producto.nombre}*`,
    `📁 *Categoría:* ${categoriaNombre}`,
    `🔢 *Cantidad:* ${cantidad} ${cantidad === 1 ? 'prenda' : 'prendas'}`,
    opcionesArr.length > 0 ? `\n🛠️ *Detalles seleccionados:*\n${opcionesArr.join('\n')}` : '',
    imgUrl ? `\n📸 *FOTO / REFERENCIA VISUAL:*\n👉 ${imgUrl}` : '',
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `💬 *Mensaje de Consulta:*`,
    `"Hola Alex Store 👋 Vengo de su página web y deseo consultar la cotización y tiempo de entrega para este servicio de arreglo de fútbol. ¿Me podrían dar los detalles por favor?"`,
  ]
    .filter(Boolean)
    .join('\n');

  return `https://wa.me/${WHATSAPP_STORE_PHONE}?text=${encodeURIComponent(mensaje)}`;
};
