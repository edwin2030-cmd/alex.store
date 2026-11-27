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

/**
 * Cambia el tema con una transición suave: un círculo que se abre desde el botón
 * (View Transitions); si el navegador no lo soporta, los colores se funden poco a poco.
 */
export function cambiarTemaSuave(tema: Tema, origen?: { x: number; y: number }) {
  const reducir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };

  if (reducir) {
    guardarTema(tema);
    return;
  }

  if (typeof doc.startViewTransition === 'function') {
    const x = origen?.x ?? window.innerWidth - 60;
    const y = origen?.y ?? 40;
    const radio = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const transicion = doc.startViewTransition(() => guardarTema(tema));
    transicion.ready
      .then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radio}px at ${x}px ${y}px)`] },
          { duration: 750, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' }
        );
      })
      .catch(() => {});
    return;
  }

  // Otros navegadores: fundido de colores
  const html = document.documentElement;
  html.classList.add('tema-cambiando');
  guardarTema(tema);
  window.setTimeout(() => html.classList.remove('tema-cambiando'), 650);
}
