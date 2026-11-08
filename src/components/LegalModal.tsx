import React, { useEffect, useState } from 'react';
import { X, FileText, Lock } from 'lucide-react';

/**
 * Términos y Condiciones + Política de Privacidad de AlexStore (tienda 100% en línea).
 * Se abre con los enlaces #terminos y #privacidad (pie de página y casilla del checkout),
 * así funciona igual en Vercel y en Cloudflare sin rutas nuevas.
 */
export const LEGAL_ULTIMA_ACTUALIZACION = '8 de noviembre de 2026';
const WHATSAPP = '6621-2802';
const WHATSAPP_URL = 'https://wa.me/50766212802';

type Pestana = 'terminos' | 'privacidad';

const leerHash = (): Pestana | null => {
  const h = typeof window !== 'undefined' ? window.location.hash.toLowerCase() : '';
  if (h === '#terminos') return 'terminos';
  if (h === '#privacidad') return 'privacidad';
  return null;
};

const Seccion: React.FC<{ titulo: string; children: React.ReactNode }> = ({ titulo, children }) => (
  <section className="space-y-2">
    <h3 className="text-sm font-black uppercase tracking-wide text-[#1A1918]">{titulo}</h3>
    {children}
  </section>
);

const Wa: React.FC = () => (
  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-[#C59A4D] font-bold underline">
    {WHATSAPP}
  </a>
);

const Terminos: React.FC = () => (
  <div className="space-y-6">
    <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-200 space-y-2">
      <p className="text-xs font-black uppercase tracking-wide text-amber-900">Producto agotado</p>
      <p className="text-xs text-amber-900 leading-relaxed">
        Si usted pidió y pagó un producto que se acabó en el inventario, se le cambiará por otro producto de igual
        precio o se le devolverá su dinero completo, según usted prefiera.
      </p>
    </div>

    <Seccion titulo="1. Quiénes Somos">
      <p>
        AlexStore es una tienda 100% en línea que vende en la República de Panamá a través de este catálogo digital y
        de WhatsApp. No tenemos tienda física abierta al público. Contacto oficial: WhatsApp <Wa />.
      </p>
      <p>
        Estas condiciones se rigen por las leyes de Panamá, en especial la Ley 45 de 2007 (protección al consumidor),
        la Ley 51 de 2008 (comercio electrónico) y la Ley 81 de 2019 (protección de datos personales). Nada de lo
        escrito aquí limita los derechos que la ley le da al consumidor.
      </p>
    </Seccion>

    <Seccion titulo="2. Aceptación">
      <p>
        Antes de enviar su pedido, usted debe marcar la casilla en la que declara que leyó y acepta estos Términos y
        la Política de Privacidad. Esta página está siempre disponible para leerla, guardarla o imprimirla.
      </p>
    </Seccion>

    <Seccion titulo="3. Productos y Fotos">
      <p>
        Vendemos artículos deportivos: camisetas de fútbol, de selecciones, de la NBA, la NFL y béisbol, calzado de
        fútbol y arreglos de fútbol por encargo, muchos de ellos de calidad 1:1. Los nombres y escudos de clubes,
        selecciones y ligas pertenecen a sus dueños; AlexStore no está afiliada a ellos.
      </p>
      <p>
        Los arreglos de fútbol se piden por WhatsApp y se preparan por encargo; el detalle, el precio y la fecha de
        entrega se acuerdan en el chat antes de pagar.
      </p>
      <p>
        Las fotos son de referencia y el color puede verse un poco distinto según la pantalla. Revise bien la talla
        antes de pagar; si tiene dudas sobre medidas o disponibilidad, escríbanos por WhatsApp antes de comprar.
      </p>
      <p>Todos los productos están sujetos a disponibilidad. Si un producto se agota, se aplica la regla de “Producto agotado” de arriba.</p>
    </Seccion>

    <Seccion titulo="4. Precios">
      <p>
        Los precios están en dólares (USD). Si un precio aparece con un error evidente, le avisaremos antes de
        procesar el pedido y podrá elegir entre continuar con el precio correcto o que le devolvamos lo pagado.
      </p>
    </Seccion>

    <Seccion titulo="5. Formas de Pago">
      <p>
        Aceptamos Yappy (directorio @GRAPHYCALEXPTY), transferencia a Banco General o BAC Credomatic, y pago
        coordinado por WhatsApp (abono o contra entrega, según se acuerde en el chat). Para Yappy y transferencia se
        debe adjuntar la foto del comprobante; el pedido se confirma cuando verificamos el pago.
      </p>
      <p>Los pagos se hacen solo a las cuentas que aparecen en esta tienda. No pedimos pagos a otras cuentas.</p>
    </Seccion>

    <Seccion titulo="6. Pedidos">
      <p>
        Al enviar el pedido se abre WhatsApp con el detalle de su compra. Le confirmaremos por ese medio la recepción
        del pedido, la disponibilidad y los datos de entrega.
      </p>
      <p>
        Una vez realizado el pago, el pedido no se puede cancelar ni se devuelve el dinero. Solo se devuelve el dinero
        si el producto está agotado o tiene defecto, como se explica en estas condiciones.
      </p>
    </Seccion>

    <Seccion titulo="7. Envíos y Entregas">
      <p>
        Hacemos entregas en la Ciudad de Panamá y envíos al interior del país por Uno Express o Transporte Ferguson.
        El costo y la forma de entrega se coordinan por WhatsApp. Los tiempos de la empresa de mensajería no dependen
        de nosotros; le compartiremos los datos del envío para que pueda darle seguimiento.
      </p>
      <p>
        Es responsabilidad del cliente dar una dirección y un teléfono correctos. Si el paquete se devuelve por datos
        incorrectos o porque nadie lo retiró, el nuevo envío corre por cuenta del cliente.
      </p>
    </Seccion>

    <Seccion titulo="8. Garantía, Cambios y Devoluciones">
      <p>
        <strong className="text-[#1A1918]">Productos con defecto o diferentes a lo pedido:</strong> si recibe un
        producto dañado, con defecto de fábrica o distinto al que compró, escríbanos por WhatsApp con fotos y su número
        de pedido. Le ofreceremos el cambio por el mismo producto, el cambio por otro de igual valor o la devolución de
        su dinero, conforme a la garantía que establece la Ley 45 de 2007.
      </p>
      <p>
        <strong className="text-[#1A1918]">No se aceptan cambios ni devoluciones</strong> por arrepentimiento, talla,
        color, gusto o cualquier otro motivo distinto a un defecto del producto o a que el producto se haya agotado.
      </p>
      <p>Los reembolsos se hacen por el mismo medio de pago (Yappy o transferencia) a nombre de quien hizo el pago.</p>
    </Seccion>

    <Seccion titulo="9. Quejas y Reclamos">
      <p>
        Escríbanos primero por WhatsApp a <Wa /> y le responderemos lo antes posible. Si no queda satisfecho, puede
        acudir a la Autoridad de Protección al Consumidor y Defensa de la Competencia (ACODECO).
      </p>
    </Seccion>

    <Seccion titulo="10. Cambios a estas Condiciones">
      <p>
        Podemos actualizar estas condiciones. Cada pedido se rige por las condiciones publicadas el día en que se hizo.
        Última actualización: {LEGAL_ULTIMA_ACTUALIZACION}.
      </p>
    </Seccion>
  </div>
);

const Privacidad: React.FC = () => (
  <div className="space-y-6">
    <Seccion titulo="1. Responsable de sus Datos">
      <p>
        El responsable de sus datos personales es AlexStore, tienda en línea que opera en la República de Panamá.
        Para cualquier consulta sobre sus datos escríbanos por WhatsApp a <Wa />.
      </p>
    </Seccion>

    <Seccion titulo="2. Datos que Recopilamos">
      <p>Solo pedimos lo necesario para atender su compra:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Nombre, teléfono o WhatsApp y dirección de entrega.</li>
        <li>Los productos de su pedido y el método de pago elegido.</li>
        <li>La foto del comprobante de pago, cuando paga por Yappy o transferencia.</li>
      </ul>
      <p>No guardamos números de tarjetas ni claves bancarias.</p>
    </Seccion>

    <Seccion titulo="3. Para Qué los Usamos">
      <ul className="list-disc pl-5 space-y-1">
        <li>Registrar, verificar y entregar su pedido.</li>
        <li>Comunicarnos con usted sobre su pedido, garantías o reembolsos.</li>
        <li>Cumplir con obligaciones legales y contables.</li>
      </ul>
      <p>Solo le enviaremos promociones si usted nos lo pide o lo acepta.</p>
    </Seccion>

    <Seccion titulo="4. Con Quién los Compartimos">
      <p>
        Compartimos solo lo necesario con la empresa de mensajería que entrega su pedido (Uno Express, Ferguson u otra
        que usted elija) y con los servicios que usamos para funcionar: el alojamiento de la tienda y la base de datos
        donde se guardan los pedidos, que pueden estar en servidores fuera de Panamá. No vendemos sus datos.
      </p>
    </Seccion>

    <Seccion titulo="5. Cuánto Tiempo los Guardamos">
      <p>
        Guardamos los datos de sus pedidos mientras sean necesarios para atender garantías y reclamos y por el tiempo que
        exijan las normas contables y fiscales.
      </p>
    </Seccion>

    <Seccion titulo="6. Sus Derechos">
      <p>Según la Ley 81 de 2019, usted puede pedirnos en cualquier momento:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong className="text-[#1A1918]">Acceso:</strong> saber qué datos suyos tenemos.</li>
        <li><strong className="text-[#1A1918]">Rectificación:</strong> corregir datos incorrectos.</li>
        <li><strong className="text-[#1A1918]">Cancelación:</strong> borrar sus datos, salvo los que la ley nos obliga a conservar.</li>
        <li><strong className="text-[#1A1918]">Oposición:</strong> que dejemos de usarlos para un fin.</li>
        <li><strong className="text-[#1A1918]">Portabilidad:</strong> recibir una copia de sus datos.</li>
      </ul>
      <p>
        Escríbanos por WhatsApp a <Wa />. Si no recibe respuesta, puede acudir a la Autoridad Nacional de Transparencia
        y Acceso a la Información (ANTAI).
      </p>
    </Seccion>

    <Seccion titulo="7. Cambios a esta Política">
      <p>Podemos actualizar esta política. Última actualización: {LEGAL_ULTIMA_ACTUALIZACION}.</p>
    </Seccion>
  </div>
);

export const LegalModal: React.FC = () => {
  const [pestana, setPestana] = useState<Pestana | null>(leerHash);

  useEffect(() => {
    const alCambiar = () => setPestana(leerHash());
    window.addEventListener('hashchange', alCambiar);
    return () => window.removeEventListener('hashchange', alCambiar);
  }, []);

  useEffect(() => {
    if (!pestana) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar();
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [pestana]);

  const cerrar = () => {
    // Quita el #terminos / #privacidad de la dirección sin mover la página
    history.replaceState(null, '', window.location.pathname + window.location.search);
    setPestana(null);
  };

  const cambiar = (p: Pestana) => {
    history.replaceState(null, '', `#${p}`);
    setPestana(p);
  };

  if (!pestana) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
      onClick={cerrar}
      role="dialog"
      aria-modal="true"
      aria-label={pestana === 'terminos' ? 'Términos y Condiciones' : 'Política de Privacidad'}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-5 border-b border-[#F0EAE1] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => cambiar('terminos')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wide whitespace-nowrap cursor-pointer ${
                pestana === 'terminos' ? 'bg-[#1A1918] text-white' : 'text-[#7A7368] hover:bg-[#F7F4EF]'
              }`}
            >
              <FileText className="w-4 h-4" /> Términos y Condiciones
            </button>
            <button
              type="button"
              onClick={() => cambiar('privacidad')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wide whitespace-nowrap cursor-pointer ${
                pestana === 'privacidad' ? 'bg-[#1A1918] text-white' : 'text-[#7A7368] hover:bg-[#F7F4EF]'
              }`}
            >
              <Lock className="w-4 h-4" /> Privacidad
            </button>
          </div>
          <button
            type="button"
            onClick={cerrar}
            className="p-2 rounded-xl text-[#7A7368] hover:bg-[#F7F4EF] hover:text-[#1A1918] shrink-0 cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 sm:p-7 overflow-y-auto text-xs sm:text-sm text-[#5C564D] leading-relaxed">
          <p className="text-[11px] text-[#9C9488] mb-5">
            AlexStore · Última actualización: {LEGAL_ULTIMA_ACTUALIZACION}
          </p>
          {pestana === 'terminos' ? <Terminos /> : <Privacidad />}
        </div>
      </div>
    </div>
  );
};
