import React, { useState, useRef, useEffect } from 'react';
import { ItemCarrito, Pedido } from '../types';
import {
  X,
  ShieldCheck,
  Landmark,
  Smartphone,
  UploadCloud,
  Copy,
  Check,
  CheckCircle2,
  ArrowRight,
  Printer,
  MessageCircle,
  AlertCircle,
  RefreshCw,
  Trash2,
  Maximize2,
  User,
  Phone,
  MapPin,
  FileText
} from 'lucide-react';
import { crearPedido, subirFotoStorage } from '../lib/supabase';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ItemCarrito[];
  onOrderCompleted: () => void;
  initialMethod?: 'transferencia' | 'yappy';
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  onOrderCompleted,
  initialMethod = 'transferencia',
}) => {
  if (!isOpen) return null;

  const totalArticulos = items.reduce((acc, curr) => acc + curr.cantidad, 0);
  const total = items.reduce((acc, curr) => acc + curr.producto.precio * curr.cantidad, 0);

  // Form states
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [metodoPago, setMetodoPago] = useState<'transferencia' | 'yappy'>(initialMethod);
  const [bancoSeleccionado, setBancoSeleccionado] = useState<'banco_general' | 'bac'>('banco_general');
  const [nota, setNota] = useState('');

  // Comprobante upload and preview
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
  const [comprobantePreview, setComprobantePreview] = useState<string | null>(null);
  const [isZoomingImage, setIsZoomingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // UI helpers
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reciboOficial, setReciboOficial] = useState<Pedido | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nombreInputRef = useRef<HTMLInputElement>(null);

  // Sync initial method when modal opens
  useEffect(() => {
    if (initialMethod) {
      setMetodoPago(initialMethod);
    }
  }, [initialMethod, isOpen]);

  // Support paste from clipboard (e.g. screenshot of Yappy or Transfer receipt)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith('image/')) {
          processFile(file);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const processFile = (file: File) => {
    setComprobanteFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setComprobantePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        processFile(file);
      }
    }
  };

  const handleRemoveImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setComprobanteFile(null);
    setComprobantePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTriggerFileInput = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre.trim()) {
      setValidationError('Por favor ingresa tu nombre completo para el pedido.');
      nombreInputRef.current?.focus();
      return;
    }

    if (!telefono.trim()) {
      setValidationError('Por favor ingresa tu número de WhatsApp / teléfono de contacto.');
      return;
    }

    setValidationError(null);
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
        console.warn('Error subiendo comprobante:', err);
      }
    }

    const detalleMetodo =
      metodoPago === 'transferencia'
        ? bancoSeleccionado === 'banco_general'
          ? 'Transferencia - Banco General (0439000024206)'
          : 'Transferencia - BAC (117537266)'
        : 'Yappy (@GRAPHYCALEXPTY)';

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
      notas: `${nota.trim() ? nota.trim() + ' | ' : ''}Método: ${detalleMetodo}`,
      comprobante_url: uploadedUrl,
      creado_en: new Date().toISOString(),
    };

    // Guardar en Supabase
    await crearPedido(nuevoPedido);

    setIsSubmitting(false);
    setReciboOficial(nuevoPedido);
    onOrderCompleted();

    // Redirección directa al WhatsApp oficial 66212802
    sendOrderToWhatsApp(nuevoPedido, detalleMetodo, uploadedUrl);
  };

  const sendOrderToWhatsApp = (pedido: Pedido, detalleMetodo: string, proofUrl?: string) => {
    const targetPhone = '50766212802'; // Número oficial de WhatsApp de AlexStore
    let msg = `🧾 *NUEVO PEDIDO OFICIAL - ALEXSTORE* 🧾\n`;
    msg += `*Código de Compra:* ${pedido.codigo}\n`;
    msg += `------------------------------------\n`;
    msg += `👤 *Cliente:* ${pedido.cliente_nombre}\n`;
    if (pedido.cliente_telefono && pedido.cliente_telefono !== 'No especificado') {
      msg += `📱 *Teléfono:* ${pedido.cliente_telefono}\n`;
    }
    if (pedido.cliente_direccion) {
      msg += `📍 *Dirección de Entrega:* ${pedido.cliente_direccion}\n`;
    }
    msg += `💳 *Método de Pago:* ${detalleMetodo}\n`;
    msg += `------------------------------------\n`;
    msg += `📦 *PRODUCTOS:* \n`;

    pedido.items.forEach((item, idx) => {
      const tallaStr = item.talla ? ` [Talla: ${item.talla}]` : '';
      msg += `${idx + 1}. ${item.nombre}${tallaStr}\n   ${item.cantidad}x $${item.precio} = $${(item.cantidad * item.precio).toFixed(2)}\n`;
    });

    msg += `------------------------------------\n`;
    msg += `💰 *TOTAL A PAGAR:* $${pedido.total.toFixed(2)}\n`;
    if (nota.trim()) {
      msg += `📝 *Nota:* ${nota.trim()}\n`;
    }
    if (proofUrl) {
      msg += `\n📎 *Comprobante cargado en la web:* ${proofUrl}\n`;
    }
    msg += `\nAdjunto la captura del comprobante de pago para procesar mi despacho. ¡Muchas gracias!`;

    window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-md">
      {/* Centering wrapper that allows natural top-to-bottom scroll without clipping inputs */}
      <div className="min-h-full flex items-start justify-center p-2.5 sm:p-6 py-4 sm:py-10">
        <div className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-[#E5DFD5] overflow-hidden my-auto animate-fade-in">
          {/* Modal Header */}
          <div className="p-4 sm:p-7 border-b border-[#F0EAE1] flex items-start justify-between gap-3 bg-[#FCFAF7]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black tracking-widest uppercase text-[#9C9488]">
                  ALEXSTORE OFICIAL
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#1A1918] font-heading leading-tight">
                {reciboOficial ? 'Recibo Oficial de Pedido' : 'Finalizar Pedido & Pago'}
              </h2>
              <p className="text-xs sm:text-sm text-[#7A7368] mt-1">
                {reciboOficial
                  ? 'Tu compra ha sido registrada en el sistema de AlexStore'
                  : 'Completa tus datos, elige el método de pago y adjunta tu comprobante.'}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-[#F2ECE1] text-[#7A7368] hover:text-[#1A1918] transition-colors shrink-0"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content */}
          {reciboOficial ? (
            /* ============================================================ */
            /* RECIBO OFICIAL DE PEDIDO                                     */
            /* ============================================================ */
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
                    {reciboOficial.cliente_direccion && (
                      <span className="text-[#7A7368] block mt-0.5">{reciboOficial.cliente_direccion}</span>
                    )}
                  </div>

                  <div>
                    <span className="text-[#9C9488] uppercase font-semibold text-[10px] block">Método de Pago</span>
                    <span className="font-bold text-[#1A1918] text-sm">
                      {metodoPago === 'transferencia'
                        ? bancoSeleccionado === 'banco_general'
                          ? 'Banco General (0439000024206)'
                          : 'BAC Credomatic (117537266)'
                        : 'Yappy (@GRAPHYCALEXPTY)'}
                    </span>
                    <span className="text-emerald-700 font-bold block mt-0.5">Enviado por WhatsApp</span>
                  </div>
                </div>

                {/* Items Table */}
                <div className="pt-2">
                  <span className="text-[#9C9488] uppercase font-semibold text-[10px] block mb-2">Artículos</span>
                  <div className="space-y-2 border-t border-b border-[#EAE5DC] py-3">
                    {reciboOficial.items.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[#1A1918] truncate pr-2">
                          {it.cantidad}x {it.nombre} {it.talla ? `[Talla: ${it.talla}]` : ''}
                        </span>
                        <span className="font-bold text-[#1A1918] shrink-0">
                          ${(it.precio * it.cantidad).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total Row */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs uppercase font-extrabold text-[#7A7368]">Total Oficial</span>
                  <span className="text-2xl font-black text-[#1A1918]">${reciboOficial.total.toFixed(2)}</span>
                </div>

                {/* Comprobante preview thumbnail in receipt */}
                {comprobantePreview && (
                  <div className="pt-3 border-t border-[#EAE5DC] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={comprobantePreview}
                        alt="Comprobante"
                        className="w-14 h-14 object-cover rounded-xl border border-[#D5CEC2] shadow-sm cursor-pointer"
                        onClick={() => setIsZoomingImage(true)}
                      />
                      <div>
                        <span className="text-xs font-bold text-[#1A1918] block">Comprobante Adjunto</span>
                        <span className="text-[11px] text-emerald-700 font-semibold">
                          Listo para enviar por WhatsApp
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsZoomingImage(true)}
                      className="text-xs text-[#C59A4D] hover:underline font-bold flex items-center gap-1"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      Ver
                    </button>
                  </div>
                )}
              </div>

              {/* Actions for Receipt */}
              <div className="space-y-3">
                <button
                  onClick={() => {
                    const targetPhone = '50766212802';
                    window.open(
                      `https://wa.me/${targetPhone}?text=${encodeURIComponent(
                        `¡Hola AlexStore! Te reenvío el comprobante y detalle de mi pedido #${reciboOficial.codigo} por total de $${reciboOficial.total.toFixed(2)}.`
                      )}`,
                      '_blank'
                    );
                  }}
                  className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-600/20 active:scale-98 transition-all"
                >
                  <MessageCircle className="w-5 h-5 fill-current" />
                  <span>REENVIAR A WHATSAPP (66212802)</span>
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
            /* ============================================================ */
            /* CHECKOUT FORM VIEW                                           */
            /* ============================================================ */
            <form onSubmit={handleSubmit} className="p-4 sm:p-7 space-y-4 sm:space-y-6">
              {/* Hidden file input controlled by buttons */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/jfif,image/jpg"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Top Banner Card: Total a Pagar & Pago Seguro */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#141312] text-white flex items-center justify-between shadow-md">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#E6C687] block">
                    TOTAL A PAGAR ({totalArticulos} {totalArticulos === 1 ? 'ARTÍCULO' : 'ARTÍCULOS'})
                  </span>
                  <span className="text-3xl font-black text-white font-heading mt-0.5 block">
                    ${total.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-500/30 bg-[#221F1B] text-[#E6C687] text-xs font-extrabold tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-[#E6C687]" />
                  <span>Pago Seguro</span>
                </div>
              </div>

              {/* Validation Error Banner */}
              {validationError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2.5 animate-shake">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* SECCIÓN 1: SELECCIONA EL MÉTODO DE PAGO (TRANSFERENCIA O YAPPY) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#1A1918] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#1A1918] text-white text-[10px] font-black flex items-center justify-center">
                      1
                    </span>
                    SELECCIONA CÓMO DESEAS PAGAR
                  </h3>
                  <span className="text-[11px] text-[#7A7368] font-bold">
                    Elige una opción
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Botón Opción Yappy */}
                  <button
                    type="button"
                    onClick={() => {
                      setMetodoPago('yappy');
                      setValidationError(null);
                    }}
                    className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative ${
                      metodoPago === 'yappy'
                        ? 'border-[#0284C7] bg-[#F0F8FF] shadow-md ring-2 ring-[#0284C7]/20'
                        : 'border-[#E5DFD5] bg-white hover:border-[#0284C7]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-[#0284C7] text-white text-[10px] font-black uppercase tracking-wider">
                        DIRECTORIO
                      </span>
                      <Smartphone className="w-5 h-5 text-[#0284C7]" />
                    </div>
                    <p className="font-black text-sm text-[#0F172A]">Pagar por Yappy</p>
                    <p className="text-[11px] text-[#475569] mt-0.5 font-medium">
                      Directorio <strong>@GRAPHYCALEXPTY</strong>
                    </p>
                    {metodoPago === 'yappy' && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#0284C7]" />
                    )}
                  </button>

                  {/* Botón Opción Transferencia */}
                  <button
                    type="button"
                    onClick={() => {
                      setMetodoPago('transferencia');
                      setValidationError(null);
                    }}
                    className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative ${
                      metodoPago === 'transferencia'
                        ? 'border-[#C59A4D] bg-[#FCFBF8] shadow-md ring-2 ring-[#C59A4D]/20'
                        : 'border-[#E5DFD5] bg-white hover:border-[#C59A4D]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-[#141312] text-white text-[10px] font-black uppercase tracking-wider">
                        BANCO
                      </span>
                      <Landmark className="w-5 h-5 text-[#C59A4D]" />
                    </div>
                    <p className="font-black text-sm text-[#1A1918]">Transferencia Bancaria</p>
                    <p className="text-[11px] text-[#7A7368] mt-0.5 font-medium">
                      Banco General • BAC Credomatic
                    </p>
                    {metodoPago === 'transferencia' && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#C59A4D]" />
                    )}
                  </button>
                </div>
              </div>

              {/* SECCIÓN 2: DATOS DEL COMPRADOR (SIEMPRE VISIBLE Y ACCESIBLE) */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#1A1918] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#1A1918] text-white text-[10px] font-black flex items-center justify-center">
                      2
                    </span>
                    TUS DATOS PARA EL PEDIDO
                  </h3>
                  <span className="text-[10px] text-[#9C9488] font-bold">Campos requeridos *</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Nombre Completo */}
                  <div>
                    <label className="text-xs font-bold text-[#1A1918] flex items-center gap-1.5 mb-1.5">
                      <User className="w-3.5 h-3.5 text-[#C59A4D]" />
                      <span>Nombre y Apellido *</span>
                    </label>
                    <input
                      ref={nombreInputRef}
                      type="text"
                      required
                      placeholder="Ej: Carlos Gómez"
                      value={nombre}
                      onChange={(e) => {
                        setNombre(e.target.value);
                        if (validationError) setValidationError(null);
                      }}
                      className={`w-full bg-[#FCFAF7] text-sm text-[#1A1918] placeholder-[#9C9488] px-4 py-3 rounded-2xl border focus:outline-none transition-all shadow-inner font-medium ${
                        validationError && !nombre.trim()
                          ? 'border-rose-500 ring-2 ring-rose-300 bg-rose-50/40'
                          : 'border-[#E5DFD5] focus:border-[#C59A4D] focus:bg-white focus:ring-2 focus:ring-[#C59A4D]/20'
                      }`}
                    />
                  </div>

                  {/* WhatsApp / Teléfono */}
                  <div>
                    <label className="text-xs font-bold text-[#1A1918] flex items-center gap-1.5 mb-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#C59A4D]" />
                      <span>WhatsApp / Teléfono *</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Ej: 66212802"
                      value={telefono}
                      onChange={(e) => {
                        setTelefono(e.target.value);
                        if (validationError) setValidationError(null);
                      }}
                      className={`w-full bg-[#FCFAF7] text-sm text-[#1A1918] placeholder-[#9C9488] px-4 py-3 rounded-2xl border focus:outline-none transition-all shadow-inner font-medium ${
                        validationError && !telefono.trim()
                          ? 'border-rose-500 ring-2 ring-rose-300 bg-rose-50/40'
                          : 'border-[#E5DFD5] focus:border-[#C59A4D] focus:bg-white focus:ring-2 focus:ring-[#C59A4D]/20'
                      }`}
                    />
                  </div>
                </div>

                {/* Dirección de Entrega */}
                <div>
                  <label className="text-xs font-bold text-[#1A1918] flex items-center gap-1.5 mb-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#C59A4D]" />
                    <span>Dirección de Entrega / Provincia (opcional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Ciudad de Panamá, Betania, Calle 3ra, Casa 12"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    className="w-full bg-[#FCFAF7] text-sm text-[#1A1918] placeholder-[#9C9488] px-4 py-3 rounded-2xl border border-[#E5DFD5] focus:outline-none focus:border-[#C59A4D] focus:bg-white focus:ring-2 focus:ring-[#C59A4D]/20 transition-all shadow-inner font-medium"
                  />
                </div>
              </div>

              {/* SECCIÓN 3: INSTRUCCIONES DE PAGO ESPECÍFICAS (YAPPY O TRANSFERENCIA) */}
              <div className="space-y-3 pt-1">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#1A1918] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#1A1918] text-white text-[10px] font-black flex items-center justify-center">
                    3
                  </span>
                  INSTRUCCIONES PARA REALIZAR TU PAGO
                </h3>

                {/* ======================= DETALLES DE YAPPY ======================= */}
                {metodoPago === 'yappy' && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#F0F8FF] border border-[#BAE6FD] space-y-4 text-xs shadow-xs">
                    {/* Header Yappy */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#BAE6FD] gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-[#0284C7] text-white flex items-center justify-center font-black text-sm shadow-sm">
                          Y
                        </span>
                        <div>
                          <span className="font-black text-sm text-[#0369A1] block">
                            PAGA POR YAPPY EN 3 PASOS
                          </span>
                          <span className="text-[10px] text-[#475569] font-medium">
                            Sin comisiones • Aprobación inmediata
                          </span>
                        </div>
                      </div>

                      {/* Botón copiar Directorio */}
                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-[#BAE6FD] shadow-xs">
                        <span className="text-[11px] font-bold text-[#0369A1]">Directorio:</span>
                        <span className="font-mono font-black text-xs text-[#0F172A] tracking-wider">
                          GRAPHYCALEXPTY
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy('GRAPHYCALEXPTY', 'yappy_dir')}
                          className="p-1 rounded-md text-[#0284C7] hover:bg-[#E0F2FE] transition-colors"
                          title="Copiar Directorio Yappy"
                        >
                          {copiedField === 'yappy_dir' ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Los 3 Pasos Oficiales */}
                    <div className="space-y-2.5">
                      {/* Paso 1 */}
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-[#E0F2FE]">
                        <div className="w-6 h-6 rounded-full bg-[#0284C7] text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                          1
                        </div>
                        <div>
                          <strong className="text-xs text-[#0F172A] block font-bold">ABRE YAPPY</strong>
                          <p className="text-[11px] text-[#475569] leading-relaxed mt-0.5">
                            Abre la app de Yappy en tu teléfono y entra a la sección de <strong>Directorio</strong>.
                          </p>
                        </div>
                      </div>

                      {/* Paso 2 */}
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-[#E0F2FE]">
                        <div className="w-6 h-6 rounded-full bg-[#0284C7] text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                          2
                        </div>
                        <div className="flex-1">
                          <strong className="text-xs text-[#0F172A] block font-bold">BUSCA NUESTRO PERFIL</strong>
                          <p className="text-[11px] text-[#475569] leading-relaxed mt-0.5">
                            Escribe en el buscador: <strong className="text-[#0369A1] font-mono bg-[#E0F2FE] px-1.5 py-0.5 rounded">GRAPHYCALEXPTY</strong>.
                            Verifica nuestro logo oficial para asegurarte de que es la cuenta correcta de AlexStore.
                          </p>
                        </div>
                      </div>

                      {/* Paso 3 */}
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-[#E0F2FE]">
                        <div className="w-6 h-6 rounded-full bg-[#0284C7] text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                          3
                        </div>
                        <div>
                          <strong className="text-xs text-[#0F172A] block font-bold">REALIZA TU PAGO</strong>
                          <p className="text-[11px] text-[#475569] leading-relaxed mt-0.5">
                            Selecciona el perfil de AlexStore, coloca el monto exacto de <strong className="text-[#0F172A] font-black">${total.toFixed(2)}</strong> y confirma tu envío.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#E0F2FE] border border-[#BAE6FD] text-[11px] text-[#0369A1] flex items-center gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 text-[#0284C7]" />
                      <span>
                        <strong>PASO SIGUIENTE:</strong> Toma una captura de tu comprobante de Yappy y súbela en el recuadro de abajo.
                      </span>
                    </div>
                  </div>
                )}

                {/* ======================= DETALLES DE TRANSFERENCIA ======================= */}
                {metodoPago === 'transferencia' && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#FCFAF5] border border-[#EFE5D3] space-y-4 text-xs shadow-xs">
                    {/* Selector de Banco */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#EAE3D5] gap-2">
                      <span className="text-xs font-bold text-[#7A7368]">Selecciona el banco de destino:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setBancoSeleccionado('banco_general')}
                          className={`px-3.5 py-2 rounded-xl font-black text-xs transition-all cursor-pointer ${
                            bancoSeleccionado === 'banco_general'
                              ? 'bg-[#141312] text-white shadow-sm'
                              : 'bg-white text-[#5A554D] border border-[#DDD6C8] hover:border-[#141312]'
                          }`}
                        >
                          Banco General
                        </button>
                        <button
                          type="button"
                          onClick={() => setBancoSeleccionado('bac')}
                          className={`px-3.5 py-2 rounded-xl font-black text-xs transition-all cursor-pointer ${
                            bancoSeleccionado === 'bac'
                              ? 'bg-[#141312] text-white shadow-sm'
                              : 'bg-white text-[#5A554D] border border-[#DDD6C8] hover:border-[#141312]'
                          }`}
                        >
                          BAC Credomatic
                        </button>
                      </div>
                    </div>

                    {bancoSeleccionado === 'banco_general' ? (
                      /* BANCO GENERAL */
                      <div className="space-y-2.5 bg-white p-3.5 rounded-xl border border-[#EAE3D5]">
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-[#8C8375] font-medium">Banco:</span>
                          <strong className="text-[#1A1918]">Banco General (Panamá)</strong>
                        </div>

                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-[#8C8375] font-medium">Tipo de Cuenta:</span>
                          <strong className="text-[#1A1918]">Cuenta de Ahorros</strong>
                        </div>

                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-[#8C8375] font-medium">Número de Cuenta:</span>
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-lg bg-[#FAF8F5] border border-[#E5DFD5] font-mono font-bold text-[#1A1918] text-sm tracking-wider">
                              0439000024206
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy('0439000024206', 'cta_bg')}
                              className="p-1.5 rounded-lg text-[#7A7368] hover:bg-[#FAF8F5] hover:text-[#1A1918] transition-colors"
                              title="Copiar número de cuenta"
                            >
                              {copiedField === 'cta_bg' ? (
                                <Check className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-[#8C8375] font-medium">Beneficiario:</span>
                          <strong className="text-[#1A1918]">AlexStore (Graphycalexpty)</strong>
                        </div>
                      </div>
                    ) : (
                      /* BAC CREDOMATIC */
                      <div className="space-y-2.5 bg-white p-3.5 rounded-xl border border-[#EAE3D5]">
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-[#8C8375] font-medium">Banco:</span>
                          <strong className="text-[#1A1918]">BAC Credomatic</strong>
                        </div>

                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-[#8C8375] font-medium">Tipo de Cuenta:</span>
                          <strong className="text-[#1A1918]">Cuenta de Ahorros</strong>
                        </div>

                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-[#8C8375] font-medium">Número de Cuenta:</span>
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-lg bg-[#FAF8F5] border border-[#E5DFD5] font-mono font-bold text-[#1A1918] text-sm tracking-wider">
                              117537266
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy('117537266', 'cta_bac')}
                              className="p-1.5 rounded-lg text-[#7A7368] hover:bg-[#FAF8F5] hover:text-[#1A1918] transition-colors"
                              title="Copiar número de cuenta"
                            >
                              {copiedField === 'cta_bac' ? (
                                <Check className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-[#8C8375] font-medium">Beneficiario:</span>
                          <strong className="text-[#1A1918]">AlexStore (Graphycalexpty)</strong>
                        </div>
                      </div>
                    )}

                    <p className="text-[11px] text-[#A68340] leading-relaxed pt-1">
                      Realiza la transferencia directa o ACH al número de cuenta seleccionado y adjunta la captura o comprobante abajo.
                    </p>
                  </div>
                )}
              </div>

              {/* SECCIÓN 4: COMPROBANTE DE PAGO (PREVISUALIZAR Y CAMBIAR IMAGEN) */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#1A1918] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#1A1918] text-white text-[10px] font-black flex items-center justify-center">
                      4
                    </span>
                    COMPROBANTE O CAPTURA DE PAGO
                  </h3>
                  <span className="text-[10px] text-[#9C9488] font-bold">JPG, PNG o WEBP</span>
                </div>

                {/* Si ya hay imagen montada -> MOSTRARLA CLARAMENTE Y PERMITIR CAMBIARLA O QUITARLA */}
                {comprobantePreview ? (
                  <div className="rounded-2xl border-2 border-[#C59A4D] bg-[#FCFBF8] p-4 sm:p-5 space-y-4 shadow-sm animate-fade-in">
                    {/* Header de la imagen cargada */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </span>
                        <div>
                          <span className="font-extrabold text-xs text-[#1A1918] block">
                            Comprobante montado correctamente
                          </span>
                          <span className="text-[11px] text-[#7A7368]">
                            {comprobanteFile ? comprobanteFile.name : 'Captura adjunta'}
                            {comprobanteFile && ` • ${(comprobanteFile.size / 1024).toFixed(0)} KB`}
                          </span>
                        </div>
                      </div>

                      {/* Botones de acción: Cambiar o Eliminar */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleTriggerFileInput}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#DDD7CC] hover:border-[#1A1918] text-[#1A1918] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Elegir otra imagen"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-[#C59A4D]" />
                          <span>Cambiar imagen</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Eliminar esta foto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Quitar</span>
                        </button>
                      </div>
                    </div>

                    {/* Contenedor de la Imagen con zoom preview */}
                    <div className="relative group bg-[#141312] rounded-xl overflow-hidden border border-[#E5DFD5] flex items-center justify-center p-2 min-h-[180px] max-h-[300px]">
                      <img
                        src={comprobantePreview}
                        alt="Comprobante montado"
                        className="max-h-[280px] w-auto max-w-full object-contain rounded-lg shadow-md cursor-pointer group-hover:opacity-95 transition-opacity"
                        onClick={() => setIsZoomingImage(true)}
                      />

                      {/* Botón flotante para ver en grande */}
                      <button
                        type="button"
                        onClick={() => setIsZoomingImage(true)}
                        className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/70 hover:bg-black text-white text-[11px] font-bold flex items-center gap-1.5 backdrop-blur-sm transition-all"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Ver en grande</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-[#7A7368] text-center">
                      Esta foto se enviará automáticamente con tu pedido al WhatsApp oficial <strong>66212802</strong>.
                    </p>
                  </div>
                ) : (
                  /* DROPZONE CUANDO NO HAY IMAGEN */
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleTriggerFileInput}
                    className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-[#0284C7] bg-[#E0F2FE]'
                        : 'border-[#DDD7CC] hover:border-[#C59A4D] bg-[#FAF8F5]/80 hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white border border-[#E5DFD5] flex items-center justify-center text-[#8C8375] shadow-xs mb-2.5">
                      <UploadCloud className="w-6 h-6 stroke-[1.8] text-[#C59A4D]" />
                    </div>

                    <span className="text-xs sm:text-sm font-extrabold text-[#1A1918]">
                      Toca aquí para seleccionar la foto o captura del comprobante
                    </span>
                    <span className="text-[11px] text-[#7A7368] mt-1">
                      O arrastra la imagen aquí o pégala directamente con Ctrl+V
                    </span>
                    <span className="text-[10px] text-[#9C9488] mt-2 font-bold bg-white px-2.5 py-0.5 rounded-full border border-[#E5DFD5]">
                      Admite JPG, PNG y WEBP
                    </span>
                  </div>
                )}

                {/* Nota o aclaración opcional */}
                <div className="pt-1">
                  <label className="text-[11px] font-bold text-[#5A554D] flex items-center gap-1.5 mb-1">
                    <FileText className="w-3.5 h-3.5 text-[#9C9488]" />
                    <span>Nota o aclaración para AlexStore (opcional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Favor coordinar entrega para la tarde o llamar al llegar"
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    className="w-full bg-[#FCFAF7] text-xs text-[#1A1918] placeholder-[#9C9488] px-3.5 py-2.5 rounded-xl border border-[#E5DFD5] focus:outline-none focus:border-[#C59A4D] focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>

              {/* Botones de acción inferiores */}
              <div className="pt-4 border-t border-[#F0EAE1] flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto text-xs font-black uppercase tracking-wider text-[#7A7368] hover:text-[#1A1918] px-5 py-3 transition-colors text-center"
                >
                  CANCELAR
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-600/25 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-current shrink-0" />
                  <span>
                    {isSubmitting
                      ? 'PROCESANDO...'
                      : 'CONFIRMAR Y ENVIAR A WHATSAPP (66212802)'}
                  </span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Modal Lightbox para ver la imagen en grande */}
      {isZoomingImage && comprobantePreview && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsZoomingImage(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setIsZoomingImage(false)}
              className="absolute -top-12 right-0 text-white hover:text-[#C59A4D] p-2"
              title="Cerrar vista grande"
            >
              <X className="w-7 h-7" />
            </button>
            <img
              src={comprobantePreview}
              alt="Comprobante en detalle"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-white/20 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};
