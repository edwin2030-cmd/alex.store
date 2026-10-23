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
  FileText,
  Calendar,
  ExternalLink,
  Package
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

  const getItemUnitPrice = (item: ItemCarrito): number => {
    return Number(item.precioUnitario) || Number(item.varianteSeleccionada?.precio) || Number(item.producto.precio) || 0;
  };

  const totalArticulos = items.reduce((acc, curr) => acc + curr.cantidad, 0);
  const subtotal = items.reduce((acc, curr) => acc + getItemUnitPrice(curr) * curr.cantidad, 0);
  const descuento = 0;
  const costoEnvio = 0;
  const total = Math.max(0, subtotal - descuento + costoEnvio);

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
  const [comprobantePublicUrl, setComprobantePublicUrl] = useState<string | null>(null);
  const [comprobantePath, setComprobantePath] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [isZoomingImage, setIsZoomingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // UI helpers
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reciboOficial, setReciboOficial] = useState<Pedido | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nombreInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadRef = useRef<Promise<string | null> | null>(null);

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

  /**
   * Fast client-side image compression to ensure camera photos (5-20MB)
   * shrink to ~150-250KB in under 50ms, uploading instantly on any connection.
   */
  const compressImage = async (file: File, maxWidth = 1200, quality = 0.85): Promise<File> => {
    return new Promise((resolve) => {
      if (
        !file.type ||
        !file.type.startsWith('image/') ||
        file.type.includes('svg') ||
        file.type.includes('gif')
      ) {
        resolve(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const newFile = new File([blob], `comprobante_${Date.now()}.jpg`, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(newFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = () => resolve(file);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  const processFile = async (file: File) => {
    setComprobanteFile(file);
    if (validationError) setValidationError(null);

    // Generate deterministic public link immediately so the link is available right away
    const rawExt = file.name?.split('.').pop() || 'jpg';
    const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const cleanExt = ext === 'png' || ext === 'webp' ? ext : 'jpg';
    const fileName = `comprobante_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${cleanExt}`;
    const filePath = `recibos/${fileName}`;
    const publicUrl = `https://hbfhuwsizuhdqhyojmzk.supabase.co/storage/v1/object/public/comprobantes/${filePath}`;
    setComprobantePublicUrl(publicUrl);
    setComprobantePath(filePath);
    setIsUploadingProof(true);

    const reader = new FileReader();
    reader.onload = (ev) => {
      setComprobantePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Fast compress and upload in background
    const uploadTask = (async (): Promise<string | null> => {
      try {
        const compressed = await compressImage(file);
        const res = await subirFotoStorage(compressed, 'comprobantes', fileName);
        if (res.url && res.url.startsWith('http')) {
          setComprobantePublicUrl(res.url);
          return res.url;
        }
        return publicUrl;
      } catch (e) {
        console.warn('Error subiendo imagen:', e);
        return publicUrl;
      } finally {
        setIsUploadingProof(false);
      }
    })();

    pendingUploadRef.current = uploadTask;
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
    setComprobantePublicUrl(null);
    setIsUploadingProof(false);
    pendingUploadRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTriggerFileInput = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    fileInputRef.current?.click();
  };

  /**
   * Helper to convert base64 Data URL to File if needed
   */
  const dataUrlToFile = (dataUrl: string, filename: string): File => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  /**
   * Generates the extensive, detailed single WhatsApp message
   * Includes direct public links to the comprobante photo and product photos
   */
  const buildExtensiveWhatsAppMessage = (
    pedido: Pedido,
    metodoStr: string,
    fechaEmision: string,
    comprobanteUrl?: string | null
  ): string => {
    const lineas: string[] = [];

    lineas.push(`🏛️ *ALEXSTORE LUXURY & ESSENTIALS*`);
    lineas.push(`📋 *ORDEN OFICIAL DE COMPRA & DESPACHO*`);
    lineas.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lineas.push(`🔢 *CÓDIGO DE ORDEN:* ${pedido.codigo}`);
    lineas.push(`📅 *FECHA & HORA:* ${fechaEmision}`);
    lineas.push(`⚡ *ESTADO:* PAGO REGISTRADO / LISTO PARA DESPACHO`);
    lineas.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lineas.push(`👤 *DATOS DEL CLIENTE:*`);
    lineas.push(`• *Nombre Completo:* ${pedido.cliente_nombre}`);
    lineas.push(`• *WhatsApp / Teléfono:* ${pedido.cliente_telefono}`);
    lineas.push(`• *Dirección de Entrega:* ${pedido.cliente_direccion || 'Por coordinar con el cliente'}`);
    if (nota.trim()) {
      lineas.push(`• *Instrucciones especiales:* ${nota.trim()}`);
    }
    lineas.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lineas.push(`💳 *MÉTODO DE PAGO UTILIZADO:*`);
    lineas.push(`• *Canal:* ${metodoStr}`);
    if (metodoPago === 'transferencia') {
      if (bancoSeleccionado === 'banco_general') {
        lineas.push(`• *Banco:* Banco General (Panamá)`);
        lineas.push(`• *Cuenta de Ahorros:* 0439000024206`);
      } else {
        lineas.push(`• *Banco:* BAC Credomatic`);
        lineas.push(`• *Cuenta de Ahorros:* 117537266`);
      }
    } else {
      lineas.push(`• *Aplicación:* Yappy Panamá`);
      lineas.push(`• *Directorio Oficial:* @GRAPHYCALEXPTY`);
    }
    lineas.push(`• *Beneficiario / Titular:* AlexStore (Graphycalexpty)`);
    lineas.push(`• *Verificación:* Pago completado con comprobante`);
    lineas.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lineas.push(`🛍️ *DESGLOSE DETALLADO DE ARTÍCULOS:*`);

    pedido.items.forEach((item, idx) => {
      const varInfo = item.variante_titulo || (item.opciones ? Object.entries(item.opciones).map(([k, v]) => `${k}: ${v}`).join(', ') : item.talla ? `Talla: ${item.talla}` : 'Estándar');
      let itemBlock =
        `\n🔹 *ARTÍCULO ${idx + 1}:* ${item.nombre}\n` +
        `   • *Variante / Opción:* [${varInfo}]\n` +
        `   • *Cantidad:* ${item.cantidad} ${item.cantidad === 1 ? 'unidad' : 'unidades'}\n` +
        `   • *Precio Unitario:* $${item.precio.toFixed(2)} USD\n` +
        `   • *Subtotal Artículo:* $${(item.cantidad * item.precio).toFixed(2)} USD`;
      if (item.imagen_url && item.imagen_url.startsWith('http')) {
        itemBlock += `\n   • *Foto del producto:* ${item.imagen_url}`;
      }
      lineas.push(itemBlock);
    });

    lineas.push(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lineas.push(`📊 *RESUMEN DE CUENTA & TOTAL:*`);
    lineas.push(`• *Total de Artículos:* ${totalArticulos} ${totalArticulos === 1 ? 'artículo' : 'artículos'}`);
    lineas.push(`• *Subtotal de Compra:* $${subtotal.toFixed(2)} USD`);
    lineas.push(`• *Descuento:* $${descuento.toFixed(2)} USD`);
    lineas.push(`• *Costo de Envío:* ${costoEnvio > 0 ? `$${costoEnvio.toFixed(2)} USD` : 'Coordinado / Sin costo adicional'}`);
    lineas.push(`💰 *TOTAL FINAL PAGADO:* $${pedido.total.toFixed(2)} USD`);
    lineas.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lineas.push(`📸 *COMPROBANTE DE PAGO (FOTO):*`);
    if (comprobanteUrl && comprobanteUrl.startsWith('http')) {
      lineas.push(`🔗 *LINK DE LA FOTO DEL COMPROBANTE:*`);
      lineas.push(`${comprobanteUrl}`);
      lineas.push(`👆 *(Toca el link para abrir la foto del comprobante en alta resolución)*`);
    } else {
      lineas.push(`⚠️ *Foto del comprobante:* Se enviará directamente por este chat.`);
    }
    lineas.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lineas.push(
      `✨ *Estimado equipo de AlexStore, he realizado el pago y completado los datos de mi orden. Quedo atento a la confirmación de la guía de envío y número de rastreo. ¡Muchas gracias!*`
    );

    return lineas.join('\n');
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

    // Require payment receipt photo for Yappy and Transferencia to ensure the link is sent
    if (!comprobanteFile && !comprobantePreview && !comprobantePublicUrl) {
      setValidationError(
        '📸 Por favor selecciona o sube la foto del comprobante de tu pago para poder generar y enviar el link a WhatsApp.'
      );
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);
    const codigoPedido = `ALX-${Math.floor(1000 + Math.random() * 9000)}`;

    const detalleMetodo =
      metodoPago === 'transferencia'
        ? bancoSeleccionado === 'banco_general'
          ? 'Transferencia - Banco General (0439000024206)'
          : 'Transferencia - BAC Credomatic (117537266)'
        : 'Yappy (@GRAPHYCALEXPTY)';

    const now = new Date();
    const fechaEmision =
      now.toLocaleDateString('es-PA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) +
      ' ' +
      now.toLocaleTimeString('es-PA', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

    // 1. Obtener la URL pública real del comprobante (esperar si la subida está en curso)
    let uploadedUrl: string | undefined = comprobantePublicUrl || undefined;

    if (pendingUploadRef.current) {
      try {
        const finishedUrl = await pendingUploadRef.current;
        if (finishedUrl) {
          uploadedUrl = finishedUrl;
        }
      } catch (err) {
        console.warn('Error esperando uploadTask:', err);
      }
    }

    if (!uploadedUrl) {
      let fileToUpload = comprobanteFile;

      if (!fileToUpload && comprobantePreview && comprobantePreview.startsWith('data:')) {
        try {
          fileToUpload = dataUrlToFile(comprobantePreview, `comprobante_${Date.now()}.jpg`);
        } catch (e) {
          console.warn('Could not convert preview to file:', e);
        }
      }

      if (fileToUpload) {
        setIsUploadingProof(true);
        try {
          const compressed = await compressImage(fileToUpload);
          const uploadRes = await subirFotoStorage(compressed, 'comprobantes');
          if (uploadRes.url && uploadRes.url.startsWith('http')) {
            uploadedUrl = uploadRes.url;
            setComprobantePublicUrl(uploadRes.url);
            if (uploadRes.path) setComprobantePath(uploadRes.path);
          }
        } catch (err) {
          console.warn('Error subiendo comprobante a Supabase Storage:', err);
        } finally {
          setIsUploadingProof(false);
        }
      }
    }

    const nuevoPedido: Pedido = {
      codigo: codigoPedido,
      cliente_nombre: nombre.trim(),
      cliente_telefono: telefono.trim(),
      cliente_direccion: direccion.trim(),
      metodo_pago: metodoPago,
      total,
      subtotal,
      descuento,
      costo_envio: costoEnvio,
      estado: 'pendiente',
      estado_pago: 'pendiente_revision',
      items: items.map((i) => {
        const uPrice = getItemUnitPrice(i);
        const varTitle =
          i.varianteSeleccionada?.titulo ||
          (i.opcionesSeleccionadas
            ? Object.entries(i.opcionesSeleccionadas)
                .map(([k, v]) => `${k}: ${v}`)
                .join(' / ')
            : i.tallaSeleccionada);

        return {
          id: i.producto.id,
          producto_id: i.producto.id,
          nombre: i.producto.nombre,
          precio: uPrice,
          cantidad: i.cantidad,
          subtotal: uPrice * i.cantidad,
          variante_id: i.varianteSeleccionada?.id,
          variante_titulo: varTitle,
          opciones: i.opcionesSeleccionadas,
          talla: i.tallaSeleccionada || i.opcionesSeleccionadas?.['Talla'] || i.opcionesSeleccionadas?.['talla'] || (i.opcionesSeleccionadas ? Object.values(i.opcionesSeleccionadas).join(' / ') : undefined),
          color: i.colorSeleccionado || i.opcionesSeleccionadas?.['Color'] || i.opcionesSeleccionadas?.['color'],
          imagen_url: i.producto.imagen_url || (i.producto.imagenes && i.producto.imagenes[0]) || undefined,
        };
      }),
      notas: `${nota.trim() ? nota.trim() + ' | ' : ''}Método: ${detalleMetodo}`,
      comprobante_url: uploadedUrl || comprobantePublicUrl || undefined,
      comprobante_path: comprobantePath || undefined,
      creado_en: now.toISOString(),
    };

    // 2. Guardar en Supabase
    await crearPedido(nuevoPedido);

    // 3. Construir el mensaje de WhatsApp que incluye el link directo al comprobante
    const whatsappMessage = buildExtensiveWhatsAppMessage(
      nuevoPedido,
      detalleMetodo,
      fechaEmision,
      uploadedUrl || comprobantePublicUrl || undefined
    );
    const targetPhone = '50766212802';
    const waUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(whatsappMessage)}`;

    // 4. Redirección directa e inmediata a WhatsApp (sin pestañas intermedias ni menús molestos de compartir)
    setIsSubmitting(false);
    setReciboOficial(nuevoPedido);
    onOrderCompleted();

    // Redirigir de una vez al chat oficial de WhatsApp
    window.location.href = waUrl;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-md">
      {/* Centering wrapper that allows natural top-to-bottom scroll without clipping inputs */}
      <div className="min-h-full flex items-start justify-center p-2.5 sm:p-6 py-4 sm:py-10">
        <div className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-[#E5DFD5] max-h-[92dvh] overflow-y-auto my-auto animate-fade-in">
          {/* Modal Header */}
          <div className="p-4 sm:p-7 border-b border-[#F0EAE1] flex items-start justify-between gap-3 bg-[#FCFAF7]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black tracking-widest uppercase text-[#9C9488]">
                  ALEXSTORE OFICIAL • WHATSAPP 66212802
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#1A1918] font-heading leading-tight">
                {reciboOficial ? 'Recibo Oficial de Pedido' : 'Finalizar Pedido & Pago'}
              </h2>
              <p className="text-xs sm:text-sm text-[#7A7368] mt-1">
                {reciboOficial
                  ? 'Tu orden y comprobante han sido preparados y registrados en el sistema.'
                  : 'Ingresa tus datos, selecciona tu forma de pago y adjunta tu comprobante.'}
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
            /* RECIBO OFICIAL DE PEDIDO (EXTENSO Y DETALLADO)               */
            /* ============================================================ */
            <div className="p-4 sm:p-8 space-y-6">
              {/* Notificación de envío a WhatsApp */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <strong className="block font-bold text-sm text-emerald-950 mb-0.5">
                    ¡Redireccionando a WhatsApp (66212802)!
                  </strong>
                  Se abrió WhatsApp con el detalle completo de tu pedido en un solo mensaje oficial listo para enviar.
                  {comprobanteFile && (
                    <span className="block mt-1 font-semibold text-emerald-800">
                      💡 El comprobante se copió a tu portapapeles. Puedes pegarlo con <strong>Ctrl+V</strong> o mantener presionado y <strong>Pegar</strong> en el chat.
                    </span>
                  )}
                </div>
              </div>

              {/* Botón principal de WhatsApp de redirección inmediata */}
              <button
                onClick={() => {
                  const targetPhone = '50766212802';
                  const detalleMetodo =
                    metodoPago === 'transferencia'
                      ? bancoSeleccionado === 'banco_general'
                        ? 'Transferencia - Banco General (0439000024206)'
                        : 'Transferencia - BAC Credomatic (117537266)'
                      : 'Yappy (@GRAPHYCALEXPTY)';
                  const now = new Date();
                  const fechaStr =
                    now.toLocaleDateString('es-PA', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    }) +
                    ' ' +
                    now.toLocaleTimeString('es-PA', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    });
                  const fullMsg = buildExtensiveWhatsAppMessage(
                    reciboOficial,
                    detalleMetodo,
                    fechaStr,
                    reciboOficial.comprobante_url
                  );
                  window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(fullMsg)}`, '_blank');
                }}
                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-600/25 active:scale-98 transition-all cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 fill-current" />
                <span>ABRIR EN WHATSAPP (66212802)</span>
                <ExternalLink className="w-4 h-4 ml-1" />
              </button>

              {/* Tarjeta de Recibo Oficial Completo */}
              <div className="bg-[#FAF8F5] border border-[#E8E2D8] rounded-3xl p-5 sm:p-7 space-y-6">
                {/* Header del Recibo */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E5DFD5] gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#141312] text-[#E6C687] flex items-center justify-center font-black text-base shadow-sm">
                      AS
                    </div>
                    <div>
                      <h3 className="font-black text-base text-[#1A1918]">AlexStore Luxury & Essentials</h3>
                      <span className="text-[10px] text-[#7A7368] uppercase font-black tracking-widest block">
                        RECIBO OFICIAL DE COMPRA • #{reciboOficial.codigo}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                      <CheckCircle2 className="w-4 h-4" />
                      PAGO REGISTRADO
                    </span>
                  </div>
                </div>

                {/* Grid con Datos del Cliente y Método de Pago */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Datos del Cliente */}
                  <div className="p-4 rounded-2xl bg-white border border-[#EAE5DC] space-y-1.5">
                    <span className="text-[#9C9488] uppercase font-black text-[10px] tracking-wider block">
                      DATOS DEL CLIENTE
                    </span>
                    <p className="font-extrabold text-sm text-[#1A1918]">{reciboOficial.cliente_nombre}</p>
                    <p className="text-[#5A554D] flex items-center gap-1.5 font-medium">
                      <Phone className="w-3.5 h-3.5 text-[#C59A4D]" />
                      <span>{reciboOficial.cliente_telefono}</span>
                    </p>
                    <p className="text-[#5A554D] flex items-center gap-1.5 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-[#C59A4D]" />
                      <span>{reciboOficial.cliente_direccion || 'Dirección por coordinar'}</span>
                    </p>
                    {nota.trim() && (
                      <p className="text-[#7A7368] text-[11px] pt-1 italic border-t border-[#F0EAE1]">
                        Nota: {nota.trim()}
                      </p>
                    )}
                  </div>

                  {/* Datos del Pago */}
                  <div className="p-4 rounded-2xl bg-white border border-[#EAE5DC] space-y-1.5">
                    <span className="text-[#9C9488] uppercase font-black text-[10px] tracking-wider block">
                      INFORMACIÓN DEL PAGO
                    </span>
                    <p className="font-extrabold text-sm text-[#1A1918]">
                      {metodoPago === 'transferencia'
                        ? bancoSeleccionado === 'banco_general'
                          ? 'Banco General (0439000024206)'
                          : 'BAC Credomatic (117537266)'
                        : 'Yappy (@GRAPHYCALEXPTY)'}
                    </p>
                    <p className="text-[#5A554D] font-medium text-[11px]">
                      Titular: AlexStore (Graphycalexpty)
                    </p>
                    <p className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Comprobante adjuntado para despacho
                    </p>
                    <p className="text-[#7A7368] text-[10px] flex items-center gap-1 pt-0.5">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date().toLocaleString('es-PA')}</span>
                    </p>
                  </div>
                </div>

                {/* Desglose Extenso de Artículos */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[#9C9488] uppercase font-black text-[10px] tracking-wider block">
                      DESGLOSE DETALLADO DE ARTÍCULOS ({reciboOficial.items.length})
                    </span>
                    <span className="text-[11px] font-bold text-[#7A7368]">
                      {totalArticulos} {totalArticulos === 1 ? 'unidad' : 'unidades'} en total
                    </span>
                  </div>

                  <div className="space-y-2 bg-white rounded-2xl border border-[#EAE5DC] p-3 sm:p-4 divide-y divide-[#F2EDE4]">
                    {reciboOficial.items.map((it, idx) => (
                      <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3 min-w-0">
                          {it.imagen_url ? (
                            <img
                              src={it.imagen_url}
                              alt=""
                              className="w-10 h-12 object-cover rounded-lg border border-[#EAE5DC] shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-12 rounded-lg bg-[#FAF8F5] border border-[#EAE5DC] flex items-center justify-center shrink-0 text-[#9C9488]">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-extrabold text-[#1A1918] block truncate">
                              {it.nombre}
                            </span>
                            <div className="flex items-center gap-2 text-[11px] text-[#7A7368] mt-0.5">
                              {it.talla && (
                                <span className="bg-[#FAF8F5] border border-[#E5DFD5] px-1.5 py-0.2 rounded font-bold text-[#1A1918]">
                                  Talla: {it.talla}
                                </span>
                              )}
                              <span>
                                {it.cantidad}x ${it.precio.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <span className="font-black text-[#1A1918] text-sm shrink-0">
                          ${(it.precio * it.cantidad).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resumen Económico */}
                <div className="p-4 rounded-2xl bg-white border border-[#EAE5DC] space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#7A7368]">
                    <span>Subtotal de Artículos:</span>
                    <span className="font-bold text-[#1A1918]">${reciboOficial.total.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#7A7368]">
                    <span>Despacho / Envío:</span>
                    <span className="font-semibold text-emerald-700">Por coordinar vía WhatsApp</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#EAE5DC]">
                    <span className="text-xs uppercase font-black text-[#1A1918]">TOTAL OFICIAL PAGADO:</span>
                    <span className="text-2xl font-black text-[#1A1918]">${reciboOficial.total.toFixed(2)} USD</span>
                  </div>
                </div>

                {/* Previsualización del Comprobante */}
                {(comprobantePreview || reciboOficial.comprobante_url) && (
                  <div className="space-y-2">
                    <div className="p-4 rounded-2xl bg-white border border-[#EAE5DC] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={comprobantePreview || reciboOficial.comprobante_url || ''}
                          alt="Comprobante"
                          className="w-14 h-14 object-cover rounded-xl border border-[#D5CEC2] shadow-sm cursor-pointer"
                          onClick={() => setIsZoomingImage(true)}
                        />
                        <div>
                          <span className="text-xs font-bold text-[#1A1918] block">
                            Comprobante de Pago
                          </span>
                          <span className="text-[11px] text-emerald-700 font-semibold">
                            ✅ Subido exitosamente al sistema
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsZoomingImage(true)}
                        className="px-3 py-1.5 rounded-xl border border-[#E5DFD5] hover:bg-[#FAF8F5] text-xs font-bold text-[#1A1918] flex items-center gap-1.5 cursor-pointer"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-[#C59A4D]" />
                        <span>Ver en grande</span>
                      </button>
                    </div>

                    {reciboOficial.comprobante_url && reciboOficial.comprobante_url.startsWith('http') && (
                      <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/80 text-xs flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-black uppercase text-emerald-900 block tracking-wider">
                            Enlace público del comprobante:
                          </span>
                          <a
                            href={reciboOficial.comprobante_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-700 hover:text-emerald-900 underline truncate block text-[11px] font-medium"
                          >
                            {reciboOficial.comprobante_url}
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(reciboOficial.comprobante_url!, 'receipt_proof_url')}
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-900 text-[10px] font-bold shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {copiedField === 'receipt_proof_url' ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>Copiar Link</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Botones inferiores del recibo */}
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-3 rounded-xl border border-[#E5DFD5] hover:bg-[#FAF8F5] text-[#1A1918] text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-[#7A7368]" />
                  <span>Imprimir Recibo</span>
                </button>

                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl bg-[#141312] hover:bg-black text-[#F5E6BE] text-xs font-bold uppercase tracking-wider flex items-center justify-center transition-colors cursor-pointer"
                >
                  <span>Finalizar y Salir</span>
                </button>
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
                          className="p-1 rounded-md text-[#0284C7] hover:bg-[#E0F2FE] transition-colors cursor-pointer"
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
                              className="p-1.5 rounded-lg text-[#7A7368] hover:bg-[#FAF8F5] hover:text-[#1A1918] transition-colors cursor-pointer"
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
                              className="p-1.5 rounded-lg text-[#7A7368] hover:bg-[#FAF8F5] hover:text-[#1A1918] transition-colors cursor-pointer"
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
                        className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/70 hover:bg-black text-white text-[11px] font-bold flex items-center gap-1.5 backdrop-blur-sm transition-all cursor-pointer"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Ver en grande</span>
                      </button>
                    </div>

                    {/* Public link status badge & copy */}
                    {isUploadingProof ? (
                      <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold animate-pulse">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                        <span>Subiendo foto a la nube y generando link público...</span>
                      </div>
                    ) : comprobantePublicUrl ? (
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-emerald-950 flex items-center gap-1.5 text-[11px]">
                            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                            Enlace público listo para WhatsApp:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(comprobantePublicUrl, 'comprobante_ready_link')}
                            className="px-2 py-0.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            {copiedField === 'comprobante_ready_link' ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>Copiar</span>
                          </button>
                        </div>
                        <a
                          href={comprobantePublicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700 underline text-[11px] font-mono break-all block hover:text-emerald-900"
                        >
                          {comprobantePublicUrl}
                        </a>
                      </div>
                    ) : null}

                    <p className="text-[11px] text-[#7A7368] text-center">
                      El comprobante como enlace web y el pedido detallado se enviarán juntos en el chat oficial de WhatsApp <strong>66212802</strong>.
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

              {/* SECCIÓN 5: RESUMEN DETALLADO ANTES DE FINALIZAR */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#1A1918] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#1A1918] text-white text-[10px] font-black flex items-center justify-center">
                      5
                    </span>
                    RESUMEN DETALLADO DE TU COMPRA
                  </h3>
                  <span className="text-[11px] text-[#7A7368] font-bold">
                    Revisa antes de confirmar
                  </span>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-[#FCFAF5] border border-[#EFE5D3] space-y-4">
                  {/* Desglose de cada producto con variante, cantidad, precio unitario y subtotal */}
                  <div className="space-y-2.5">
                    <span className="text-[10px] font-black uppercase text-[#8C8375] tracking-wider block">
                      ARTÍCULOS SELECCIONADOS ({items.length})
                    </span>

                    <div className="space-y-2 bg-white rounded-xl border border-[#EAE3D5] p-3 divide-y divide-[#F2EDE4]">
                      {items.map((it, idx) => {
                        const uPrice = getItemUnitPrice(it);
                        const varTitle =
                          it.varianteSeleccionada?.titulo ||
                          (it.opcionesSeleccionadas
                            ? Object.entries(it.opcionesSeleccionadas)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(' • ')
                            : it.tallaSeleccionada
                            ? `Talla: ${it.tallaSeleccionada}`
                            : 'Estándar');

                        return (
                          <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={it.producto.imagen_url || (it.producto.imagenes && it.producto.imagenes[0]) || ''}
                                alt={it.producto.nombre}
                                className="w-10 h-12 object-cover rounded-lg bg-[#FAF8F5] border border-[#EAE5DC] shrink-0"
                              />
                              <div className="min-w-0">
                                <h4 className="font-extrabold text-[#1A1918] truncate block">
                                  {it.producto.nombre}
                                </h4>
                                <span className="text-[11px] text-[#C59A4D] font-bold block truncate">
                                  {varTitle}
                                </span>
                                <span className="text-[10px] text-[#7A7368]">
                                  {it.cantidad} {it.cantidad === 1 ? 'unidad' : 'unidades'} × ${uPrice.toFixed(2)} c/u
                                </span>
                              </div>
                            </div>

                            <span className="font-black text-sm text-[#1A1918] shrink-0">
                              ${(uPrice * it.cantidad).toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cálculos económicos */}
                  <div className="bg-white rounded-xl border border-[#EAE3D5] p-3.5 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-[#7A7368]">
                      <span>Subtotal de Productos:</span>
                      <strong className="text-[#1A1918]">${subtotal.toFixed(2)}</strong>
                    </div>

                    <div className="flex justify-between items-center text-[#7A7368]">
                      <span>Descuentos aplicados:</span>
                      <span className="text-emerald-700 font-bold">$0.00 (Precio oficial)</span>
                    </div>

                    <div className="flex justify-between items-center text-[#7A7368]">
                      <span>Costo de Envío:</span>
                      <span className="text-[#1A1918] font-bold">
                        {costoEnvio > 0 ? `$${costoEnvio.toFixed(2)}` : '$0.00 (Coordinado vía WhatsApp)'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-[#EAE3D5] flex justify-between items-center">
                      <span className="font-black text-sm text-[#1A1918] uppercase">
                        TOTAL A PAGAR:
                      </span>
                      <span className="text-2xl font-black text-[#C59A4D]">
                        ${total.toFixed(2)} USD
                      </span>
                    </div>
                  </div>

                  {/* Datos del Cliente y Método en Vivo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-[#EAE3D5] space-y-1">
                      <span className="text-[10px] font-black uppercase text-[#8C8375] block">
                        DATOS DE ENTREGA
                      </span>
                      <p className="font-bold text-[#1A1918] truncate">
                        {nombre.trim() ? nombre.trim() : '⚠️ Nombre por completar'}
                      </p>
                      <p className="text-[#7A7368] font-medium text-[11px] truncate">
                        📞 {telefono.trim() ? telefono.trim() : 'Teléfono por completar'}
                      </p>
                      {direccion.trim() && (
                        <p className="text-[#7A7368] text-[11px] truncate">
                          📍 {direccion.trim()}
                        </p>
                      )}
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-[#EAE3D5] space-y-1">
                      <span className="text-[10px] font-black uppercase text-[#8C8375] block">
                        MÉTODO & COMPROBANTE
                      </span>
                      <p className="font-bold text-[#1A1918]">
                        {metodoPago === 'transferencia'
                          ? bancoSeleccionado === 'banco_general'
                            ? 'Banco General (Panamá)'
                            : 'BAC Credomatic'
                          : 'Yappy (@GRAPHYCALEXPTY)'}
                      </p>
                      <p className="text-[11px] font-semibold flex items-center gap-1">
                        {comprobantePreview ? (
                          <span className="text-emerald-700 flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600 stroke-[3]" /> Comprobante adjuntado
                          </span>
                        ) : (
                          <span className="text-amber-700">
                            ⚠️ Comprobante por adjuntar
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error de validación visible junto al botón */}
              {validationError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 animate-shake">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-semibold">{validationError}</span>
                </div>
              )}

              {/* Botones de acción inferiores */}
              <div className="pt-4 border-t border-[#F0EAE1] flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto text-xs font-black uppercase tracking-wider text-[#7A7368] hover:text-[#1A1918] px-5 py-3 transition-colors text-center cursor-pointer"
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
                      ? 'PROCESANDO PEDIDO...'
                      : isUploadingProof
                      ? 'SUBIENDO FOTO DEL COMPROBANTE...'
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
              className="absolute -top-12 right-0 text-white hover:text-[#C59A4D] p-2 cursor-pointer"
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
