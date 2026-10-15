import React, { useState } from 'react';
import { ItemCarrito, Pedido } from '../types';
import { X, ShieldCheck, Landmark, Smartphone, UploadCloud, Copy, Check, CheckCircle2, ArrowRight, Printer, MessageCircle } from 'lucide-react';
import { crearPedido, subirFotoStorage } from '../lib/supabase';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ItemCarrito[];
  onOrderCompleted: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  onOrderCompleted,
}) => {
  if (!isOpen) return null;

  const totalArticulos = items.reduce((acc, curr) => acc + curr.cantidad, 0);
  const total = items.reduce((acc, curr) => acc + curr.producto.precio * curr.cantidad, 0);

  // Form states
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('66212802');
  const [direccion, setDireccion] = useState('');
  const [metodoPago, setMetodoPago] = useState<'transferencia' | 'yappy'>('transferencia');
  const [nota, setNota] = useState('');
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
  const [comprobantePreview, setComprobantePreview] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reciboOficial, setReciboOficial] = useState<Pedido | null>(null);

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setComprobanteFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setComprobantePreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      alert('Por favor introduce tu nombre completo.');
      return;
    }

    setIsSubmitting(true);
    const codigoPedido = `ALX-${Math.floor(1000 + Math.random() * 9000)}`;

    let uploadedUrl = comprobantePreview || undefined;
    if (comprobanteFile) {
      try {
        const uploadRes = await subirFotoStorage(comprobanteFile, 'comprobantes');
        if (uploadRes.url) {
          uploadedUrl = uploadRes.url;
        }
      } catch (err) {
        console.warn("Error subiendo a bucket comprobantes:", err);
      }
    }

    const nuevoPedido: Pedido = {
      codigo: codigoPedido,
      cliente_nombre: nombre.trim(),
      cliente_telefono: telefono.trim(),
      cliente_direccion: direccion.trim(),
      metodo_pago: metodoPago,
      total,
      estado: 'pendiente',
      items: items.map((i) => ({
        id: i.producto.id,
        nombre: i.producto.nombre,
        precio: i.producto.precio,
        cantidad: i.cantidad,
        talla: i.tallaSeleccionada,
        imagen_url: i.producto.imagen_url || undefined,
      })),
      notas: nota.trim(),
      comprobante_url: uploadedUrl,
      creado_en: new Date().toISOString(),
    };

    // Save order in Supabase
    await crearPedido(nuevoPedido);

    setIsSubmitting(false);
    setReciboOficial(nuevoPedido);
    onOrderCompleted();

    // Trigger WhatsApp directly as requested
    const targetPhone = '50766212802';
    let msg = `🧾 *NUEVO PEDIDO OFICIAL - ALEXSTORE* 🧾\n`;
    msg += `*Código de Compra:* ${nuevoPedido.codigo}\n`;
    msg += `------------------------------------\n`;
    msg += `👤 *Cliente:* ${nuevoPedido.cliente_nombre}\n`;
    msg += `📱 *Teléfono:* ${nuevoPedido.cliente_telefono}\n`;
    if (nuevoPedido.cliente_direccion) {
      msg += `📍 *Dirección:* ${nuevoPedido.cliente_direccion}\n`;
    }
    msg += `💳 *Método de Pago:* ${metodoPago.toUpperCase()}\n`;
    msg += `------------------------------------\n`;
    msg += `📦 *PRODUCTOS:*\n`;

    nuevoPedido.items.forEach((item, idx) => {
      const tallaStr = item.talla ? ` [Talla: ${item.talla}]` : '';
      msg += `${idx + 1}. ${item.nombre}${tallaStr}\n   ${item.cantidad}x $${item.precio} = $${(item.cantidad * item.precio)}\n`;
    });

    msg += `------------------------------------\n`;
    msg += `💰 *TOTAL PAGADO:* $${nuevoPedido.total}\n`;
    if (nuevoPedido.notas) {
      msg += `📝 *Nota:* ${nuevoPedido.notas}\n`;
    }
    if (uploadedUrl) {
      msg += `\n📎 *Comprobante adjunto:* ${uploadedUrl}\n`;
    }
    msg += `\nAdjunto también la captura de mi comprobante de pago. ¡Gracias!`;

    window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#E5DFD5] overflow-hidden my-6">
        {/* Modal Header */}
        <div className="p-6 sm:p-8 border-b border-[#F0EAE1] flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#1A1918] font-heading leading-tight">
              {reciboOficial ? 'Recibo Oficial de Pedido' : 'Pago de Pedido & Recibo Oficial'}
            </h2>
            <p className="text-xs sm:text-sm text-[#7A7368] mt-1">
              {reciboOficial
                ? 'Tu compra ha sido registrada en el sistema de AlexStore'
                : 'Elige tu medio de pago: Transferencia bancaria o Yappy y envía tu comprobante directo a WhatsApp'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#F2ECE1] text-[#7A7368] hover:text-[#1A1918] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        {reciboOficial ? (
          /* Official Receipt View */
          <div className="p-6 sm:p-8 space-y-6">
            <div className="bg-[#FAF8F5] border border-[#E8E2D8] rounded-3xl p-6 sm:p-8 space-y-5">
              {/* Receipt Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#E5DFD5]">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-[#141312] text-[#E6C687] flex items-center justify-center font-black text-sm">
                    AS
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-[#1A1918]">AlexStore Oficial</h3>
                    <span className="text-[10px] text-[#7A7368] uppercase font-bold tracking-widest">
                      RECIBO DIGITAL #{reciboOficial.codigo}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Registrado
                  </span>
                </div>
              </div>

              {/* Receipt Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[#9C9488] uppercase font-semibold text-[10px] block">Cliente</span>
                  <span className="font-bold text-[#1A1918] text-sm">{reciboOficial.cliente_nombre}</span>
                  <span className="text-[#7A7368] block">{reciboOficial.cliente_telefono}</span>
                </div>

                <div>
                  <span className="text-[#9C9488] uppercase font-semibold text-[10px] block">Método de Pago</span>
                  <span className="font-bold text-[#1A1918] capitalize text-sm">{metodoPago}</span>
                  <span className="text-[#7A7368] block">Banco General</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="pt-2">
                <span className="text-[#9C9488] uppercase font-semibold text-[10px] block mb-2">Artículos</span>
                <div className="space-y-2 border-t border-b border-[#EAE5DC] py-3">
                  {reciboOficial.items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#1A1918] truncate pr-2">
                        {it.cantidad}x {it.nombre} {it.talla ? `(${it.talla})` : ''}
                      </span>
                      <span className="font-bold text-[#1A1918] shrink-0">
                        ${it.precio * it.cantidad}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Row */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs uppercase font-extrabold text-[#7A7368]">Total Oficial</span>
                <span className="text-2xl font-black text-[#1A1918]">$ {reciboOficial.total}</span>
              </div>

              {/* Comprobante preview thumbnail */}
              {comprobantePreview && (
                <div className="pt-3 border-t border-[#EAE5DC] flex items-center gap-3">
                  <img
                    src={comprobantePreview}
                    alt="Comprobante"
                    className="w-14 h-14 object-cover rounded-xl border border-[#D5CEC2]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#1A1918] block">Comprobante Listo</span>
                    <span className="text-[11px] text-emerald-700 font-semibold">Se ha abierto WhatsApp para enviarlo</span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions for Receipt */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  const targetPhone = '50766212802';
                  window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(`Hola AlexStore, te reenvío mi recibo #${reciboOficial.codigo} por $${reciboOficial.total}`)}`, '_blank');
                }}
                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-600/20 active:scale-98 transition-all"
              >
                <MessageCircle className="w-5 h-5 fill-current" />
                <span>REENVIAR A WHATSAPP</span>
              </button>

              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 rounded-xl border border-[#E5DFD5] hover:bg-[#FAF8F5] text-[#1A1918] text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Printer className="w-4 h-4 text-[#7A7368]" />
                  <span>Imprimir Recibo</span>
                </button>

                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-[#141312] hover:bg-black text-[#F5E6BE] text-xs font-bold uppercase tracking-wider flex items-center justify-center transition-colors"
                >
                  <span>Cerrar</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Payment Form View (Image 5, 6, 7) */
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            {/* Top Banner Card: Total a Pagar & Pago Seguro */}
            <div className="p-5 rounded-2xl bg-[#141312] text-white flex items-center justify-between shadow-md">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#E6C687] block">
                  TOTAL A PAGAR ({totalArticulos} {totalArticulos === 1 ? 'ARTÍCULO' : 'ARTÍCULOS'})
                </span>
                <span className="text-3xl font-black text-white font-heading mt-0.5 block">
                  $ {total}
                </span>
              </div>

              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-500/30 bg-[#221F1B] text-[#E6C687] text-xs font-extrabold tracking-wider">
                <ShieldCheck className="w-4 h-4 text-[#E6C687]" />
                <span>Pago Seguro</span>
              </div>
            </div>

            {/* Step 1: Datos del Comprador */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#1A1918] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#1A1918] text-white text-[10px] font-black flex items-center justify-center">
                  1
                </span>
                DATOS DEL COMPRADOR
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#5A554D] block mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Carlos Gómez"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full bg-white text-xs text-[#1A1918] px-3.5 py-2.5 rounded-xl border border-[#E5DFD5] focus:outline-none focus:border-[#C59A4D] transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#5A554D] block mb-1">
                    WhatsApp / Teléfono *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej: 66212802"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full bg-white text-xs text-[#1A1918] px-3.5 py-2.5 rounded-xl border border-[#E5DFD5] focus:outline-none focus:border-[#C59A4D] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#5A554D] block mb-1">
                  Dirección de Entrega / Ciudad
                </label>
                <input
                  type="text"
                  placeholder="Ej: Ciudad de Panamá, Betania, Calle 3ra"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className="w-full bg-white text-xs text-[#1A1918] px-3.5 py-2.5 rounded-xl border border-[#E5DFD5] focus:outline-none focus:border-[#C59A4D] transition-colors"
                />
              </div>
            </div>

            {/* Step 2: Selecciona Método de Pago (Transferencia / Yappy) */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#1A1918] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#1A1918] text-white text-[10px] font-black flex items-center justify-center">
                  2
                </span>
                SELECCIONA MÉTODO DE PAGO
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {/* Option 1: Transferencia */}
                <button
                  type="button"
                  onClick={() => setMetodoPago('transferencia')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    metodoPago === 'transferencia'
                      ? 'border-[#C59A4D] bg-[#FCFBF8] shadow-md ring-1 ring-[#C59A4D]/40'
                      : 'border-[#E5DFD5] bg-white hover:border-[#D5CEC2]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-[#141312] text-white text-[9px] font-black uppercase tracking-wider">
                      BANCO
                    </span>
                    <Landmark className="w-4 h-4 text-[#C59A4D]" />
                  </div>
                  <p className="font-extrabold text-xs text-[#1A1918]">Transferencia</p>
                  <p className="text-[10px] text-[#7A7368]">Cuenta / ACH</p>
                </button>

                {/* Option 2: Yappy */}
                <button
                  type="button"
                  onClick={() => setMetodoPago('yappy')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    metodoPago === 'yappy'
                      ? 'border-[#C59A4D] bg-[#FCFBF8] shadow-md ring-1 ring-[#C59A4D]/40'
                      : 'border-[#E5DFD5] bg-white hover:border-[#D5CEC2]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider">
                      YAPPY
                    </span>
                    <Smartphone className="w-4 h-4 text-blue-500" />
                  </div>
                  <p className="font-extrabold text-xs text-[#1A1918]">Yappy</p>
                  <p className="text-[10px] text-[#7A7368]">Móvil B. General</p>
                </button>
              </div>

              {/* Bank Details Container (Image 6) */}
              {metodoPago === 'transferencia' && (
                <div className="p-4 rounded-2xl bg-[#FCFAF5] border border-[#EFE5D3] space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-[#8C8375] font-medium">Banco:</span>
                    <strong className="text-[#1A1918]">Banco General</strong>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-[#8C8375] font-medium">Tipo de Cuenta:</span>
                    <strong className="text-[#1A1918]">Cuenta de Ahorros</strong>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-[#8C8375] font-medium">Número de Cuenta:</span>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-[#E5DFD5] font-mono font-bold text-[#1A1918]">
                        04-01-01-123456-7
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy('04-01-01-123456-7', 'cta')}
                        className="p-1 rounded text-[#7A7368] hover:text-[#1A1918]"
                        title="Copiar cuenta"
                      >
                        {copiedField === 'cta' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-[#8C8375] font-medium">Beneficiario:</span>
                    <strong className="text-[#1A1918]">AlexStore Inc.</strong>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-[#8C8375] font-medium">Cédula / RUC:</span>
                    <strong className="text-[#1A1918]">8-800-1234</strong>
                  </div>

                  <p className="text-[11px] text-[#A68340] leading-relaxed pt-2 border-t border-[#F2ECE1]">
                    Realiza la transferencia ACH o directa al número de cuenta indicado y adjunta la captura o comprobante bancario.
                  </p>
                </div>
              )}

              {/* Yappy Details */}
              {metodoPago === 'yappy' && (
                <div className="p-4 rounded-2xl bg-[#F6F9FD] border border-[#D7E3F3] space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-[#5A6E85] font-medium">Directorio Yappy:</span>
                    <strong className="text-[#1A1918]">AlexStore</strong>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-[#5A6E85] font-medium">Número de Teléfono:</span>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-[#D7E3F3] font-mono font-bold text-[#1A1918]">
                        66212802
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy('66212802', 'yappy')}
                        className="p-1 rounded text-[#5A6E85] hover:text-[#1A1918]"
                        title="Copiar número"
                      >
                        {copiedField === 'yappy' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-[#5A6E85] font-medium">Nombre de Cuenta:</span>
                    <strong className="text-[#1A1918]">AlexStore Oficial</strong>
                  </div>

                  <p className="text-[11px] text-blue-700 leading-relaxed pt-2 border-t border-[#E5EEF9]">
                    Busca en el directorio de Yappy a AlexStore o transfiere al 66212802 y sube tu comprobante de pago abajo.
                  </p>
                </div>
              )}
            </div>

            {/* Step 3: Sube tu Comprobante de Pago (Image 6 & 7) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#1A1918] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#1A1918] text-white text-[10px] font-black flex items-center justify-center">
                    3
                  </span>
                  SUBE TU COMPROBANTE DE PAGO *
                </h3>
                <span className="text-[10px] text-[#9C9488] font-bold">JPG, PNG o WEBP</span>
              </div>

              {/* Upload Box */}
              <label className="relative border-2 border-dashed border-[#DDD7CC] hover:border-[#C59A4D] rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-[#FAF8F5]/80 hover:bg-[#FAF8F5] transition-all">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <UploadCloud className="w-10 h-10 text-[#8C8375] stroke-[1.5] mb-2.5" />

                <span className="text-xs sm:text-sm font-extrabold text-[#1A1918]">
                  Toca aquí para seleccionar la captura o foto del comprobante
                </span>
                <span className="text-[11px] text-[#7A7368] mt-1">
                  Se guardará en Supabase y se enviará con tu recibo oficial directamente a WhatsApp
                </span>

                {comprobanteFile && (
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{comprobanteFile.name}</span>
                  </div>
                )}
              </label>

              {/* Nota o aclaración */}
              <div>
                <label className="text-[11px] font-bold text-[#5A554D] block mb-1">
                  Nota o aclaración para el vendedor (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Favor entregar en la tarde o llamar al llegar"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  className="w-full bg-white text-xs text-[#1A1918] px-3.5 py-2.5 rounded-xl border border-[#E5DFD5] focus:outline-none focus:border-[#C59A4D]"
                />
              </div>
            </div>

            {/* Bottom Actions (Image 7) */}
            <div className="pt-4 border-t border-[#F0EAE1] flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-extrabold uppercase tracking-wider text-[#7A7368] hover:text-[#1A1918] px-4 py-2"
              >
                CANCELAR
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3.5 rounded-2xl bg-[#141312] hover:bg-black text-[#F5E6BE] font-extrabold text-xs tracking-wider uppercase flex items-center gap-2 shadow-lg transition-all active:scale-98 disabled:opacity-50"
              >
                <span>{isSubmitting ? 'PROCESANDO...' : 'CONFIRMAR Y ENVIAR A WHATSAPP'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
