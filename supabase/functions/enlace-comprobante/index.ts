// Edge Function "enlace-comprobante" (AlexStore)
// Crea un enlace TEMPORAL a la foto del comprobante para el mensaje de WhatsApp.
// La carpeta "comprobantes" es privada: sin este enlace nadie puede ver ni listar las fotos.
// Solo firma comprobantes que pertenecen a un pedido hecho en las últimas horas.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const DIAS_ENLACE = 30; // cuánto dura el enlace de la foto
const VENTANA_HORAS = 6; // solo pedidos recién hechos

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const responder = (cuerpo: unknown, estado = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return responder({ error: 'Método no permitido' }, 405);

  let archivo = '';
  try {
    archivo = String((await req.json())?.archivo || '');
  } catch {
    // cuerpo inválido
  }
  // Solo comprobantes subidos por la tienda (recibos/comprobante_<hora>_<azar>.<ext>)
  if (!/^recibos\/comprobante_[0-9]{10,16}_[a-f0-9]{24}\.(jpg|png|webp)$/.test(archivo)) {
    return responder({ error: 'Archivo no válido' }, 400);
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  // El comprobante debe pertenecer a un pedido recién creado
  const desde = new Date(Date.now() - VENTANA_HORAS * 3600 * 1000).toISOString();
  const patron = `%/comprobantes/${archivo.replace(/[\\_%]/g, '\\$&')}`;
  const { data: pedidos, error } = await admin
    .from('pedidos')
    .select('id')
    .like('comprobante_url', patron)
    .gte('creado_en', desde)
    .limit(1);
  if (error) return responder({ error: 'No se pudo revisar el pedido' }, 500);
  if (!pedidos || pedidos.length === 0) return responder({ error: 'Pedido no encontrado' }, 404);

  const { data, error: errFirma } = await admin.storage
    .from('comprobantes')
    .createSignedUrl(archivo, DIAS_ENLACE * 86400);
  if (errFirma || !data?.signedUrl) return responder({ error: 'No se pudo crear el enlace' }, 500);

  return responder({ url: data.signedUrl, pedido: pedidos[0].id });
});
