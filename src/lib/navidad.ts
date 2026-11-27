// Temporada de Navidad: se enciende sola del 20 de noviembre al 6 de enero (hora de Panamá)
// y después la tienda vuelve a su aspecto normal sin tocar nada.

function hoyEnPanama(): Date {
  const texto = new Date().toLocaleString('en-US', { timeZone: 'America/Panama' });
  return new Date(texto);
}

export function esTemporadaNavidad(): boolean {
  const hoy = hoyEnPanama();
  const mes = hoy.getMonth(); // 0 = enero, 10 = noviembre, 11 = diciembre
  const dia = hoy.getDate();
  if (mes === 10) return dia >= 20;
  if (mes === 11) return true;
  if (mes === 0) return dia <= 6;
  return false;
}

/** Días que faltan para el 25 de diciembre (0 el mismo día de Navidad, null después). */
export function diasParaNavidad(): number | null {
  const hoy = hoyEnPanama();
  hoy.setHours(0, 0, 0, 0);
  const navidad = new Date(hoy.getFullYear(), 11, 25);
  const dias = Math.round((navidad.getTime() - hoy.getTime()) / 86400000);
  return dias >= 0 ? dias : null;
}

export function textoCuentaRegresiva(): string {
  const dias = diasParaNavidad();
  if (dias === null) return '¡Felices fiestas y próspero Año Nuevo!';
  if (dias === 0) return '¡Feliz Navidad!';
  if (dias === 1) return 'Mañana es Navidad';
  return `Faltan ${dias} días para Navidad`;
}
