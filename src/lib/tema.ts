// Tema de la tienda pública: 'claro' (el de siempre) u 'oscuro'.
// Cada visitante elige con el botón sol/luna y se guarda en su navegador.
export type Tema = 'claro' | 'oscuro';
const CLAVE = 'alexstore_tema';

export function leerTema(): Tema {
  try {
    return localStorage.getItem(CLAVE) === 'oscuro' ? 'oscuro' : 'claro';
  } catch {
    return 'claro';
  }
}

export function aplicarTema(tema: Tema) {
  document.documentElement.classList.toggle('tema-oscuro', tema === 'oscuro');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', tema === 'oscuro' ? '#0f0e0d' : '#FAF8F5');
}

export function guardarTema(tema: Tema) {
  try {
    localStorage.setItem(CLAVE, tema);
  } catch {
    /* sin almacenamiento: igual se aplica en esta visita */
  }
  aplicarTema(tema);
}
