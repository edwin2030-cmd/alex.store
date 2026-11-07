import React, { useState, useEffect, useMemo } from 'react';
import { Categoria, Producto, AtributoOpcion, VarianteProducto } from '../types';
import {
  X,
  UploadCloud,
  Plus,
  Trash2,
  Link as LinkIcon,
  CheckCircle2,
  Layers,
  Sparkles,
  Tag,
  Hash,
  DollarSign,
  Boxes,
  HelpCircle,
  MessageCircle,
} from 'lucide-react';
import { isArregloFutbol } from '../lib/arregloFutbol';
import { crearProducto, actualizarProducto, subirFotoStorage } from '../lib/supabase';

interface ModalNuevoProductoProps {
  isOpen: boolean;
  onClose: () => void;
  categorias: Categoria[];
  productoToEdit?: Producto | null;
  onProductoSaved: () => void;
}

const TALLA_GROUPS: Record<'letras' | 'ninos' | 'calzado_us' | 'calzado_eu' | 'pantalones', { tallas: string[]; label: string }> = {
  letras: {
    label: 'Tallas de Adulto (Letras)',
    tallas: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', 'Única'],
  },
  ninos: {
    label: 'Tallas de Niños y Juvenil (Números)',
    tallas: ['2', '4', '6', '8', '10', '12', '14', '16'],
  },
  calzado_us: {
    label: 'Calzado & Guayos Talla US (Números)',
    tallas: ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '12'],
  },
  calzado_eu: {
    label: 'Calzado & Guayos Talla EU / CO / PA (Números)',
    tallas: ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'],
  },
  pantalones: {
    label: 'Shorts & Pantalones Deportivos (Números)',
    tallas: ['26', '28', '30', '32', '34', '36', '38', '40'],
  },
};

export const ModalNuevoProducto: React.FC<ModalNuevoProductoProps> = ({
  isOpen,
  onClose,
  categorias,
  productoToEdit,
  onProductoSaved,
}) => {
  const isEditing = Boolean(productoToEdit);

  // Tipo de publicación: 'producto' para catálogo con precio o 'arreglo' para WhatsApp sin precio
  const [tipo, setTipo] = useState<'producto' | 'arreglo'>(
    productoToEdit?.tipo ||
    (isArregloFutbol(undefined, productoToEdit, categorias) ? 'arreglo' : 'producto')
  );

  // Datos base
  const [nombre, setNombre] = useState(productoToEdit?.nombre || '');
  const [categoriaId, setCategoriaId] = useState(productoToEdit?.categoria_id || (categorias[0]?.id || ''));
  const [precio, setPrecio] = useState(productoToEdit?.precio ? String(productoToEdit.precio) : '50');
  const [costo, setCosto] = useState(productoToEdit?.costo ? String(productoToEdit.costo) : '0');
  const [skuGeneral, setSkuGeneral] = useState(productoToEdit?.sku || '');
  const [activo, setActivo] = useState(productoToEdit?.activo ?? true);
  const [cantidad, setCantidad] = useState(productoToEdit?.stock !== undefined ? String(productoToEdit.stock) : '10');
  const [stockMinimo, setStockMinimo] = useState(productoToEdit?.stock_minimo !== undefined ? String(productoToEdit.stock_minimo) : '3');
  const [descripcion, setDescripcion] = useState(productoToEdit?.descripcion || '');
  const [imagenes, setImagenes] = useState<string[]>(
    productoToEdit?.imagenes || (productoToEdit?.imagen_url ? [productoToEdit.imagen_url] : [])
  );
  const [directUrl, setDirectUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Variantes y opciones
  const [tieneVariantes, setTieneVariantes] = useState<boolean>(
    Boolean(productoToEdit?.tiene_variantes || (productoToEdit?.variantes && productoToEdit.variantes.length > 0))
  );
  const [atributos, setAtributos] = useState<AtributoOpcion[]>(productoToEdit?.atributos || []);
  const [variantes, setVariantes] = useState<VarianteProducto[]>(productoToEdit?.variantes || []);

  // Tallas y Colores directos para el cliente
  const [tallas, setTallas] = useState<string[]>(productoToEdit?.tallas ? productoToEdit.tallas.map(String) : []);
  const [colores, setColores] = useState<string[]>(productoToEdit?.colores || []);
  const [tallasStock, setTallasStock] = useState<Record<string, number>>(productoToEdit?.tallas_stock || {});
  const [tallaInput, setTallaInput] = useState('');
  const [tallaCategoryTab, setTallaCategoryTab] = useState<'letras' | 'ninos' | 'calzado_us' | 'calzado_eu' | 'pantalones'>('letras');
  const [stockMasivoInput, setStockMasivoInput] = useState('5');
  const [colorInput, setColorInput] = useState('');

  // Input temporal para agregar valor a un atributo
  const [newValInputs, setNewValInputs] = useState<Record<number, string>>({});

  const currentEditingId = productoToEdit?.id ?? '__nuevo__';
  const lastLoadedIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    // Solo re-sincronizar el formulario si cambió el producto a editar (o al abrir nuevo)
    // Esto evita que el polling en segundo plano de AdminPanel borre las fotos o datos mientras se edita
    if (lastLoadedIdRef.current === currentEditingId) {
      return;
    }
    lastLoadedIdRef.current = currentEditingId;

    if (productoToEdit) {
      setTipo(
        productoToEdit.tipo ||
        (isArregloFutbol(undefined, productoToEdit, categorias) ? 'arreglo' : 'producto')
      );
      setNombre(productoToEdit.nombre || '');
      setCategoriaId(productoToEdit.categoria_id || (categorias[0]?.id || ''));
      setPrecio(String(productoToEdit.precio ?? 50));
      setCosto(String(productoToEdit.costo || 0));
      setSkuGeneral(productoToEdit.sku || '');
      setActivo(productoToEdit.activo ?? true);
      setCantidad(String(productoToEdit.stock ?? 10));
      setStockMinimo(String(productoToEdit.stock_minimo ?? 3));
      setDescripcion(productoToEdit.descripcion || '');
      setImagenes(productoToEdit.imagenes || (productoToEdit.imagen_url ? [productoToEdit.imagen_url] : []));

      // Extraer tallas (soporta letras y números como 2, 4, 8, 14, 38, etc.)
      let loadedTallas: string[] = [];
      if (Array.isArray(productoToEdit.tallas)) {
        // La columna tallas de productos manda como fuente de la verdad
        loadedTallas = productoToEdit.tallas.map(String).map((s) => s.trim()).filter(Boolean);
      } else if (productoToEdit.tallas_stock && Object.keys(productoToEdit.tallas_stock).length > 0) {
        loadedTallas = Object.keys(productoToEdit.tallas_stock).map(String);
      } else if (typeof (productoToEdit as any).tallas === 'string' && (productoToEdit as any).tallas.trim()) {
        const raw = (productoToEdit as any).tallas.replace(/^\{|\}$|^\[|\]$/g, '');
        loadedTallas = raw.split(/[,;\s]+/).map((s: string) => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
      } else if (productoToEdit.atributos && Array.isArray(productoToEdit.atributos)) {
        const tallaAttr = productoToEdit.atributos.find((a: any) => /talla|tallas|size|medida|numero|número|calzado/i.test(a.nombre || ''));
        if (tallaAttr && Array.isArray(tallaAttr.valores)) {
          loadedTallas = tallaAttr.valores.map(String).map((s) => s.trim()).filter(Boolean);
        }
      }

      // Preservar exactamente los números ya contados para cada talla existente
      const rawStock = productoToEdit.tallas_stock || {};
      const loadedTallasStock: Record<string, number> = {};
      const defaultPerTalla = Math.max(1, Math.floor((productoToEdit.stock || 10) / (loadedTallas.length || 1)));
      loadedTallas.forEach((t) => {
        loadedTallasStock[t] = rawStock[t] !== undefined ? Number(rawStock[t]) : defaultPerTalla;
      });

      setTallas(loadedTallas);
      setColores(productoToEdit.colores || []);
      setTallasStock(loadedTallasStock);
      setTieneVariantes(Boolean(productoToEdit.tiene_variantes || (productoToEdit.variantes && productoToEdit.variantes.length > 0)));
      setAtributos(productoToEdit.atributos || []);
      setVariantes(productoToEdit.variantes || []);
    } else {
      setNombre('');
      setCategoriaId(categorias[0]?.id || '');
      setPrecio('50');
      setCosto('0');
      setSkuGeneral('');
      setActivo(true);
      setCantidad('10');
      setStockMinimo('3');
      setDescripcion('');
      setImagenes([]);
      setTallas([]);
      setColores([]);
      setTallasStock({});
      setTieneVariantes(false);
      setAtributos([]);
      setVariantes([]);
    }
  }, [currentEditingId]);

  // Si no había categoría asignada y llegan las categorías, asignar la primera por defecto
  useEffect(() => {
    if (!categoriaId && categorias.length > 0) {
      setCategoriaId(categorias[0].id);
    }
  }, [categorias, categoriaId]);

  // Stock total de tallas sumado dinámicamente
  const stockTotalTallas = useMemo(() => {
    if (tallas.length === 0) return 0;
    return tallas.reduce((acc, t) => acc + (Number(tallasStock[t]) || 0), 0);
  }, [tallas, tallasStock]);

  const handleSetStockTalla = (talla: string, qty: number) => {
    setTallasStock((prev) => ({
      ...prev,
      [talla]: Math.max(0, qty),
    }));
  };

  // Eliminar una talla específica sin tocar el conteo de las demás
  const handleRemoveTalla = (t: string) => {
    const cleanT = String(t).trim();
    setTallas((prev) => prev.filter((x) => String(x).trim() !== cleanT));
    setTallasStock((prev) => {
      const next: Record<string, number> = {};
      Object.entries(prev).forEach(([k, v]) => {
        if (String(k).trim() !== cleanT) {
          next[k] = v;
        }
      });
      return next;
    });
  };

  const handleToggleTalla = (t: string) => {
    const cleanT = String(t).trim();
    const isPresent = tallas.some((x) => String(x).trim() === cleanT);
    if (isPresent) {
      handleRemoveTalla(cleanT);
    } else {
      setTallas((prev) => [...prev, cleanT]);
      setTallasStock((prev) => ({
        ...prev,
        [cleanT]: prev[cleanT] !== undefined ? prev[cleanT] : 5,
      }));
    }
  };

  // Agregar múltiples tallas manuales separadas por coma, punto y coma, barra o espacio
  // Ej: "2, 9, 8, 14" agrega las 4 tallas por separado
  const handleAddManualTalla = () => {
    if (!tallaInput.trim()) return;
    const raw = tallaInput.trim();
    const delimiter = /[,;/]/.test(raw) ? /[,;/]+/ : /\s+/;
    const pieces = raw
      .split(delimiter)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (pieces.length === 0) return;

    setTallas((prev) => {
      const existing = new Set(prev);
      pieces.forEach((p) => existing.add(p));
      return Array.from(existing);
    });

    setTallasStock((prev) => {
      const updated = { ...prev };
      pieces.forEach((p) => {
        if (updated[p] === undefined) {
          updated[p] = 5;
        }
      });
      return updated;
    });

    setTallaInput('');
  };

  // Agregar todo un grupo de tallas predefinido (ej: todas las de niños)
  const handleAddGroupTallas = (grupoTallas: string[]) => {
    setTallas((prev) => {
      const existing = new Set(prev);
      grupoTallas.forEach((t) => existing.add(t));
      return Array.from(existing);
    });
    setTallasStock((prev) => {
      const updated = { ...prev };
      grupoTallas.forEach((t) => {
        if (updated[t] === undefined) {
          updated[t] = 5;
        }
      });
      return updated;
    });
  };

  // Asignar el mismo stock a todas las tallas activas con un solo clic
  const handleStockMasivo = (qty: number) => {
    const val = Math.max(0, qty);
    setTallasStock((prev) => {
      const updated: Record<string, number> = { ...prev };
      tallas.forEach((t) => {
        updated[t] = val;
      });
      return updated;
    });
  };

  // Si tiene variantes, calcular el stock total sumando las variantes
  const stockTotalVariantes = useMemo(() => {
    if (!tieneVariantes || variantes.length === 0) return parseInt(cantidad, 10) || 0;
    return variantes.reduce((acc, v) => acc + (v.activo ? (Number(v.stock) || 0) : 0), 0);
  }, [tieneVariantes, variantes, cantidad]);

  // Subida de imágenes a Supabase Storage
  const handleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    if (!input.files || input.files.length === 0) return;

    const remainingSlots = Math.max(0, 4 - imagenes.length);
    if (remainingSlots <= 0) {
      alert('Ya alcanzaste el máximo de 4 fotos por producto.');
      input.value = '';
      return;
    }

    const files = Array.from(input.files).slice(0, remainingSlots);
    setUploadingImage(true);

    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const res = await subirFotoStorage(file, 'productos');
        if (res.url) {
          uploadedUrls.push(res.url);
        }
      }

      if (uploadedUrls.length > 0) {
        setImagenes((prev) => [...prev, ...uploadedUrls].slice(0, 4));
      }
    } catch (err) {
      console.error('Error al subir imágenes:', err);
    } finally {
      setUploadingImage(false);
      input.value = '';
    }
  };

  const handleAddDirectUrl = () => {
    if (!directUrl.trim()) return;
    if (imagenes.length >= 4) {
      alert('Máximo 4 imágenes por producto.');
      return;
    }
    setImagenes((prev) => [...prev, directUrl.trim()]);
    setDirectUrl('');
  };

  const handleRemoveImage = (index: number) => {
    setImagenes((prev) => prev.filter((_, i) => i !== index));
  };

  // ==========================================
  // GESTIÓN DE ATRIBUTOS
  // ==========================================
  const handleAddPresetAttribute = (nombreAttr: string, valoresPorDefecto: string[]) => {
    // Si ya existe, no duplicar
    if (atributos.some((a) => a.nombre.toLowerCase() === nombreAttr.toLowerCase())) {
      return;
    }
    setAtributos((prev) => [...prev, { nombre: nombreAttr, valores: valoresPorDefecto }]);
  };

  const handleAddCustomAttribute = () => {
    const nombreAttr = prompt('Nombre del atributo (ej: Material, Presentación, Sabor, Modelo, etc.):');
    if (!nombreAttr || !nombreAttr.trim()) return;
    const clean = nombreAttr.trim();
    if (atributos.some((a) => a.nombre.toLowerCase() === clean.toLowerCase())) {
      alert('Ya existe un atributo con ese nombre.');
      return;
    }
    setAtributos((prev) => [...prev, { nombre: clean, valores: [] }]);
  };

  const handleRemoveAttribute = (idx: number) => {
    setAtributos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddValueToAttribute = (attrIdx: number) => {
    const raw = newValInputs[attrIdx] || '';
    if (!raw.trim()) return;
    const valuesToAdd = raw
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    setAtributos((prev) => {
      const updated = [...prev];
      const existing = new Set(updated[attrIdx].valores);
      valuesToAdd.forEach((v) => existing.add(v));
      updated[attrIdx].valores = Array.from(existing);
      return updated;
    });

    setNewValInputs((prev) => ({ ...prev, [attrIdx]: '' }));
  };

  const handleRemoveValueFromAttribute = (attrIdx: number, valToRemove: string) => {
    setAtributos((prev) => {
      const updated = [...prev];
      updated[attrIdx].valores = updated[attrIdx].valores.filter((v) => v !== valToRemove);
      return updated;
    });
  };

  // ==========================================
  // GENERACIÓN DE COMBINACIONES DE VARIANTES
  // ==========================================
  const handleGenerateVariantCombinations = () => {
    if (atributos.length === 0) {
      alert('Primero agrega al menos un atributo (ej: Talla, Color).');
      return;
    }

    const validAttrs = atributos.filter((a) => a.valores.length > 0);
    if (validAttrs.length === 0) {
      alert('Todos tus atributos están vacíos. Agrega valores como S, M, L o Colores.');
      return;
    }

    // Algoritmo cartesiano
    const cartesian = (arrays: string[][]): string[][] => {
      return arrays.reduce(
        (acc, curr) => acc.flatMap((d) => curr.map((e) => [...d, e])),
        [[]] as string[][]
      );
    };

    const attributeValuesArrays = validAttrs.map((a) => a.valores);
    const combinations = cartesian(attributeValuesArrays);

    const basePrice = parseFloat(precio) || 50;
    const defaultQty = Math.max(1, Math.floor((parseInt(cantidad, 10) || 10) / combinations.length));

    const generated: VarianteProducto[] = combinations.map((combo, idx) => {
      const opciones: Record<string, string> = {};
      validAttrs.forEach((attr, aIdx) => {
        opciones[attr.nombre] = combo[aIdx];
      });

      const titleParts = Object.entries(opciones).map(([k, v]) => `${k}: ${v}`);
      const titulo = titleParts.join(' / ');

      // Prefijo SKU
      const skuParts = Object.values(opciones)
        .map((v) => v.substring(0, 3).toUpperCase())
        .join('-');
      const skuVal = skuGeneral ? `${skuGeneral}-${skuParts}` : skuParts;

      return {
        id: `var_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        titulo,
        sku: skuVal,
        opciones,
        precio: basePrice,
        stock: defaultQty,
        activo: true,
      };
    });

    setVariantes(generated);
  };

  const handleAddManualVariant = () => {
    const titulo = prompt('Título o descripción de la variante (ej: Talla XL / Negro):');
    if (!titulo || !titulo.trim()) return;
    const basePrice = parseFloat(precio) || 50;

    const newVar: VarianteProducto = {
      id: `var_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      titulo: titulo.trim(),
      opciones: { Opción: titulo.trim() },
      precio: basePrice,
      stock: 5,
      activo: true,
    };

    setVariantes((prev) => [...prev, newVar]);
  };

  const handleUpdateVariant = (varId: string, field: keyof VarianteProducto, value: any) => {
    setVariantes((prev) =>
      prev.map((v) => {
        if (v.id === varId) {
          return { ...v, [field]: value };
        }
        return v;
      })
    );
  };

  const handleRemoveVariant = (varId: string) => {
    setVariantes((prev) => prev.filter((v) => v.id !== varId));
  };

  // ==========================================
  // SUBMIT
  // ==========================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isArreglo = tipo === 'arreglo';

    if (!nombre.trim()) {
      alert(isArreglo ? 'Ingresa el nombre del arreglo.' : 'Ingresa el nombre del producto.');
      return;
    }

    setIsSubmitting(true);
    const numPrecio = isArreglo ? 0 : (parseFloat(precio) || 0);
    const numCosto = isArreglo ? 0 : (parseFloat(costo) || 0);
    const numStockMin = isArreglo ? 0 : (parseInt(stockMinimo, 10) || 3);
    const cleanTallas = isArreglo ? [] : tallas.map(String).map((s) => s.trim()).filter(Boolean);
    const cleanTallasStock: Record<string, number> = {};
    if (!isArreglo) {
      cleanTallas.forEach((t) => {
        cleanTallasStock[t] = tallasStock[t] !== undefined ? Number(tallasStock[t]) : 0;
      });
    }

    const finalStock = isArreglo
      ? 999
      : cleanTallas.length > 0
      ? cleanTallas.reduce((acc, t) => acc + (cleanTallasStock[t] || 0), 0)
      : tieneVariantes && variantes.length > 0
      ? stockTotalVariantes
      : parseInt(cantidad, 10) || 0;
    const mainImageUrl = imagenes[0] || null;

    const payload = {
      nombre: nombre.trim(),
      tipo,
      descripcion: descripcion.trim() || undefined,
      precio: numPrecio,
      costo: numCosto,
      categoria_id: categoriaId || undefined,
      imagen_url: mainImageUrl || undefined,
      imagenes,
      activo,
      sku: isArreglo ? undefined : (skuGeneral.trim() || undefined),
      tallas: cleanTallas,
      colores: isArreglo ? [] : colores,
      tallas_stock: cleanTallasStock,
      tiene_variantes: isArreglo ? false : (tieneVariantes || cleanTallas.length > 0 || colores.length > 0),
      atributos: isArreglo ? [] : (tieneVariantes ? atributos : []),
      variantes: isArreglo ? [] : (tieneVariantes ? variantes : []),
    };

    if (isEditing && productoToEdit) {
      const res = await actualizarProducto(productoToEdit.id, payload, finalStock, numStockMin);
      if (!res.success) {
        alert('Error al actualizar: ' + (res.error || ''));
      }
    } else {
      const res = await crearProducto(payload, finalStock, numStockMin);
      if (!res.success) {
        alert('Error al crear producto: ' + (res.error || ''));
      }
    }

    setIsSubmitting(false);
    onProductoSaved();
    onClose();
  };

  const isSelectedCatArreglo = isArregloFutbol(categorias.find((c) => c.id === categoriaId), null, categorias);
  const activeTallaGroup = TALLA_GROUPS[tallaCategoryTab];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="relative w-full max-w-3xl bg-[#13110F] text-white rounded-3xl shadow-2xl shadow-black/80 border border-[#26221E] overflow-hidden my-3 sm:my-6 max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-7 border-b border-[#26221E] flex items-start justify-between bg-[#1A1816]/70 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E6C687]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#E6C687]">
                CATÁLOGO & INVENTARIO ALEXSTORE
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white font-heading leading-tight">
              {isEditing
                ? (tipo === 'arreglo' ? 'Editar Arreglo (WhatsApp)' : 'Editar Producto & Variantes')
                : (tipo === 'arreglo' ? 'Nuevo Arreglo (WhatsApp)' : 'Nuevo Producto & Variantes')}
            </h2>
            <p className="text-xs sm:text-sm text-[#A69F93] mt-1">
              {tipo === 'arreglo'
                ? 'Publica servicios o arreglos para pedidos y cotización directa por WhatsApp, sin precio fijo.'
                : 'Configura detalles, fotos, precios, atributos y combinaciones con control individual de existencias y SKU.'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#1A1816] text-[#A69F93] hover:text-white transition-colors cursor-pointer border border-transparent hover:border-[#38332B]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-5 sm:space-y-6 flex-1 overflow-y-auto">
          {/* Selector de Tipo: Producto vs Arreglo */}
          <div className="bg-[#1A1816] p-3 sm:p-4 rounded-2xl border border-[#2D2822] space-y-2.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-[#E6C687] block">
              TIPO DE PUBLICACIÓN *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTipo('producto')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                  tipo === 'producto'
                    ? 'bg-[#C59A4D]/15 border-[#C59A4D] text-white shadow-sm ring-1 ring-[#C59A4D]'
                    : 'bg-[#13110F] border-[#2D2822] text-[#A69F93] hover:border-[#3E3830]'
                }`}
              >
                <div className={`p-2.5 rounded-xl text-xl shrink-0 ${tipo === 'producto' ? 'bg-[#C59A4D] text-black font-black' : 'bg-[#221F1C] text-slate-300'}`}>
                  🛍️
                </div>
                <div>
                  <strong className="text-xs sm:text-sm font-bold block text-white">Producto para Venta</strong>
                  <span className="text-[11px] text-[#A69F93] block leading-snug mt-0.5">
                    Prenda o artículo con precio fijo, tallas e inventario para venta directa en tienda.
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTipo('arreglo');
                  setPrecio('0');
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                  tipo === 'arreglo'
                    ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-sm ring-1 ring-emerald-500'
                    : 'bg-[#13110F] border-[#2D2822] text-[#A69F93] hover:border-[#3E3830]'
                }`}
              >
                <div className={`p-2.5 rounded-xl text-xl shrink-0 ${tipo === 'arreglo' ? 'bg-emerald-500 text-black font-black' : 'bg-[#221F1C] text-slate-300'}`}>
                  ✂️
                </div>
                <div>
                  <strong className="text-xs sm:text-sm font-bold block text-white">Arreglo / Costura (WhatsApp)</strong>
                  <span className="text-[11px] text-emerald-400 block leading-snug mt-0.5">
                    Sin precio. Solo foto, nombre y descripción. Pedidos y cotizaciones por WhatsApp.
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Row 1: Categoría & Precio Base según Tipo */}
          <div className="space-y-3">
            {tipo === 'arreglo' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-[#5A554D] block mb-1.5">
                    CATEGORÍA *
                  </label>
                  <select
                    value={categoriaId}
                    onChange={(e) => setCategoriaId(e.target.value)}
                    className="w-full bg-white text-xs sm:text-sm text-[#1A1918] px-3.5 py-2.5 rounded-xl border border-[#E5DFD5] focus:outline-none focus:border-[#C59A4D]"
                  >
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2.5">
                  <MessageCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="text-[11px] leading-relaxed">
                    <strong>Sin precio en tienda:</strong> Los clientes verán la foto, el nombre y el botón verde <strong className="text-emerald-200">«Pedir Arreglo por WhatsApp»</strong> para coordinar la cotización contigo.
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-[#5A554D] block mb-1.5">
                    CATEGORÍA *
                  </label>
                  <select
                    value={categoriaId}
                    onChange={(e) => setCategoriaId(e.target.value)}
                    className="w-full bg-white text-xs sm:text-sm text-[#1A1918] px-3.5 py-2.5 rounded-xl border border-[#E5DFD5] focus:outline-none focus:border-[#C59A4D]"
                  >
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-[#5A554D]">
                      PRECIO BASE ($) *
                    </label>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8C8375]">$</span>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={precio}
                      onChange={(e) => setPrecio(e.target.value)}
                      placeholder="50"
                      className="w-full bg-white text-xs sm:text-sm text-[#1A1918] pl-8 pr-3.5 py-2.5 rounded-xl border border-[#E5DFD5] focus:outline-none focus:border-[#C59A4D]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-[#5A554D] block mb-1.5">
                    SKU / CÓDIGO BASE
                  </label>
                  <input
                    type="text"
                    value={skuGeneral}
                    onChange={(e) => setSkuGeneral(e.target.value)}
                    placeholder="Ej: ALX-CAM-01"
                    className="w-full bg-white text-xs sm:text-sm text-[#1A1918] px-3.5 py-2.5 rounded-xl border border-[#E5DFD5] focus:outline-none focus:border-[#C59A4D] font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Toggle Activo */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EBE6DD]">
            <div>
              <span className="text-xs font-bold text-[#1A1918] block">
                Producto Activo en Tienda
              </span>
              <span className="text-[11px] text-[#7A7368]">
                Los clientes pueden ver este producto y sus opciones en el catálogo público
              </span>
            </div>

            <button
              type="button"
              onClick={() => setActivo(!activo)}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 shrink-0 cursor-pointer ${
                activo ? 'bg-[#C59A4D]' : 'bg-[#D5CEC2]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  activo ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Nombre del Producto o Arreglo */}
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-[#5A554D] block mb-1.5">
              {tipo === 'arreglo' ? 'NOMBRE DEL ARREGLO / SERVICIO *' : 'NOMBRE DEL PRODUCTO *'}
            </label>
            <input
              type="text"
              required
              placeholder={
                tipo === 'arreglo'
                  ? 'Ej: Ajuste de Bastilla, Parche Especial de Campeón, Estampado de Nombre y Número, Costura Deportiva...'
                  : 'Ej: Camisa Premium Slim Fit, Calzado Deportivo, Gorra Edición Especial...'
              }
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-white text-xs sm:text-sm text-[#1A1918] px-3.5 py-2.5 rounded-xl border border-[#E5DFD5] focus:outline-none focus:border-[#C59A4D]"
            />
          </div>

          {/* Descripción Detallada */}
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-[#5A554D] block mb-1.5">
              {tipo === 'arreglo' ? 'DETALLES O INDICACIONES DEL ARREGLO' : 'DESCRIPCIÓN DETALLADA'}
            </label>
            <textarea
              rows={3}
              placeholder={
                tipo === 'arreglo'
                  ? 'Describe el tipo de trabajo, materiales, recomendaciones, tiempos de entrega aproximados o detalles que el cliente debe saber...'
                  : 'Describe los detalles de confección, materiales, estilo, especificaciones o recomendaciones de uso...'
              }
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full bg-white text-xs sm:text-sm text-[#1A1918] px-3.5 py-2.5 rounded-xl border border-[#E5DFD5] focus:outline-none focus:border-[#C59A4D]"
            />
          </div>

          {/* ======================================================== */}
          {/* OPCIONES MANUALES, TALLAS E INVENTARIO (SOLO PRODUCTOS)   */}
          {/* ======================================================== */}
          {tipo !== 'arreglo' && (
            <>
              {/* Opciones manuales: Tallas y Colores */}
              <div className="p-4 sm:p-5 rounded-3xl bg-[#FAF9F6] border-2 border-[#E5DFD5] space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-[#EBE5DB]">
              <div className="w-8 h-8 rounded-xl bg-[#141312] text-[#E6C687] flex items-center justify-center font-bold shrink-0">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-[#1A1918] font-heading">
                  Opciones para el Cliente: Tallas y Colores Disponibles
                </h3>
                <p className="text-[11px] text-[#7A7368]">
                  Las opciones que agregues aquí aparecerán en la tienda para que el cliente elija su talla y color antes de comprar
                </p>
              </div>
            </div>

            {/* SECCIÓN TALLAS */}
            <div className="space-y-2.5 p-3.5 bg-white rounded-2xl border border-[#EAE5DC]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase text-[#1A1918] flex items-center gap-1.5">
                  <span>👕 Tallas Disponibles ({tallas.length}):</span>
                </label>
                {tallas.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setTallas([])}
                    className="text-[10px] text-rose-600 hover:underline font-bold cursor-pointer"
                  >
                    Borrar todas
                  </button>
                )}
              </div>

              {/* Selector de tipo de talla: Letras o Números */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className="text-[11px] font-extrabold text-[#1A1918]">
                    ¿Cómo se mide la talla de este producto?
                  </span>
                  <span className="text-[10px] text-[#8C8375]">
                    Elige por Letras, Números o escribe a mano
                  </span>
                </div>

                {/* Pestañas de tipos de tallas */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                  {[
                    { id: 'letras' as const, label: '🔤 Letras (Adulto)', desc: 'XS, S, M, L, XL...' },
                    { id: 'ninos' as const, label: '🔢 Números Niños (2, 4, 6... 16)', desc: '2, 4, 6, 8, 10, 12, 14, 16' },
                    { id: 'calzado_us' as const, label: '👟 Calzado US (6-12)', desc: 'Guayos y zapatos' },
                    { id: 'calzado_eu' as const, label: '👟 Calzado EU (36-44)', desc: 'Tallas 36 a 44' },
                    { id: 'pantalones' as const, label: '👖 Shorts / Pantalón', desc: '28, 30, 32, 34...' },
                  ].map((tab) => {
                    const isActive = tallaCategoryTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setTallaCategoryTab(tab.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#141312] text-[#E6C687] shadow-xs'
                            : 'bg-[#FAF8F5] text-[#5A554D] border border-[#DDD7CC] hover:bg-[#F0ECE4]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Botones de tallas rápidas según la pestaña activa */}
                <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E5DFD5] space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="text-[10px] font-extrabold uppercase text-[#7A7368]">
                      {activeTallaGroup.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddGroupTallas(activeTallaGroup.tallas)}
                      className="text-[10px] font-bold text-[#C59A4D] hover:underline cursor-pointer"
                    >
                      + Agregar todas ({activeTallaGroup.tallas.length})
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {activeTallaGroup.tallas.map((t) => {
                      const exists = tallas.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => handleToggleTalla(t)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            exists
                              ? 'bg-[#141312] text-[#E6C687] border border-[#141312] shadow-sm ring-1 ring-[#E6C687]/40'
                              : 'bg-white text-[#2C2720] border border-[#DDD7CC] hover:border-[#141312] hover:bg-slate-50'
                          }`}
                        >
                          {exists ? `✓ ${t}` : `+ ${t}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Input manual para escribir CUALQUIER talla por número o letra (soporta comas) */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Escribe números o letras (ej: 2, 9, 8, 14 o 38, 39, 40 o M, L, XL)..."
                    value={tallaInput}
                    onChange={(e) => setTallaInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddManualTalla();
                      }
                    }}
                    className="flex-1 bg-[#FAF8F5] text-xs px-3.5 py-2 rounded-xl border border-[#E5DFD5] text-[#1A1918] placeholder-[#8C8375] focus:outline-none focus:border-[#C59A4D]"
                  />
                  <button
                    type="button"
                    onClick={handleAddManualTalla}
                    className="px-4 py-2 rounded-xl bg-[#141312] text-[#F5E6BE] text-xs font-black hover:bg-black transition-colors cursor-pointer shrink-0 shadow-xs"
                  >
                    + Agregar Talla(s)
                  </button>
                </div>
                <p className="text-[10px] text-[#7A7368]">
                  💡 Puedes escribir varias tallas separadas por coma (ejemplo: <strong>2, 9, 8, 14</strong>) y se agregarán individualmente con su propio inventario.
                </p>
              </div>

              {/* Chips de tallas activas y control de inventario por talla */}
              {tallas.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-[#1A1918]">
                      Tallas seleccionadas para este producto:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('¿Deseas quitar todas las tallas seleccionadas de este producto?')) {
                          setTallas([]);
                          setTallasStock({});
                        }
                      }}
                      className="text-[10px] text-rose-600 hover:underline font-bold cursor-pointer"
                    >
                      Limpiar todas
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {tallas.map((t, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141312] text-white text-xs font-black shadow-xs"
                      >
                        <span className="text-[#E6C687]">{t}</span>
                        <span className="text-[10px] text-slate-300 font-normal">
                          ({tallasStock[t] ?? 5}u)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTalla(t)}
                          className="text-[#E6C687] hover:text-white hover:bg-white/20 p-0.5 rounded cursor-pointer ml-0.5 transition-colors"
                          title={`Eliminar talla ${t}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Panel de asignación de cantidades por talla */}
                  <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#E0D9CD] space-y-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Boxes className="w-4 h-4 text-[#C59A4D]" />
                        <span className="text-xs font-black uppercase text-[#1A1918]">
                          Stock Específico por Talla ({tallas.length} tallas)
                        </span>
                      </div>
                      <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#141312] text-[#E6C687]">
                        Total: {stockTotalTallas} unids.
                      </span>
                    </div>

                    {/* Asignador masivo de stock para ahorrar tiempo */}
                    <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-[#E5DFD5] flex-wrap gap-2 text-xs">
                      <span className="text-[11px] font-bold text-[#5A554D]">
                        ⚡ Asignar el mismo stock a todas:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          value={stockMasivoInput}
                          onChange={(e) => setStockMasivoInput(e.target.value)}
                          className="w-14 text-center font-black text-xs bg-slate-50 border border-slate-300 rounded-lg py-1 text-black"
                        />
                        <button
                          type="button"
                          onClick={() => handleStockMasivo(parseInt(stockMasivoInput, 10) || 0)}
                          className="px-2.5 py-1 bg-[#141312] text-[#E6C687] hover:bg-black rounded-lg font-black text-[11px] cursor-pointer"
                        >
                          Aplicar a todas
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-[#7A7368]">
                      Indica cuántas unidades físicas tienes de cada número o letra:
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1 max-h-60 overflow-y-auto pr-1">
                      {tallas.map((t) => (
                        <div
                          key={t}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white border-2 border-[#D5CDC0] shadow-xs"
                        >
                          <span className="font-black text-xs text-black px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-300 min-w-8 text-center">
                            {t}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              value={tallasStock[t] ?? 0}
                              onChange={(e) => handleSetStockTalla(t, parseInt(e.target.value, 10) || 0)}
                              className="w-14 text-center font-black text-sm bg-zinc-100 text-black border-2 border-zinc-400 rounded-lg py-1 px-1 focus:outline-none focus:border-[#C59A4D] focus:bg-white"
                            />
                            <span className="text-[10px] text-zinc-700 font-extrabold">u.</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTalla(t)}
                              className="p-1 rounded-lg text-rose-500 hover:text-white hover:bg-rose-600 transition-colors cursor-pointer"
                              title={`Eliminar talla ${t}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SECCIÓN COLORES */}
            <div className="space-y-2.5 p-3.5 bg-white rounded-2xl border border-[#EAE5DC]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase text-[#1A1918] flex items-center gap-1.5">
                  <span>🎨 Colores Disponibles ({colores.length}):</span>
                </label>
                {colores.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setColores([])}
                    className="text-[10px] text-rose-600 hover:underline font-bold cursor-pointer"
                  >
                    Borrar todos
                  </button>
                )}
              </div>

              {/* Botones rápidos de colores */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-[#8C8375] font-bold mr-1">Rápidos:</span>
                {[
                  { name: 'Negro', bg: '#000000', border: false },
                  { name: 'Blanco', bg: '#ffffff', border: true },
                  { name: 'Azul', bg: '#1e3a8a', border: false },
                  { name: 'Rojo', bg: '#b91c1c', border: false },
                  { name: 'Gris', bg: '#64748b', border: false },
                  { name: 'Verde', bg: '#15803d', border: false },
                  { name: 'Beige', bg: '#f5f5dc', border: true },
                ].map((c) => {
                  const exists = colores.includes(c.name);
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => {
                        if (exists) {
                          setColores(colores.filter((x) => x !== c.name));
                        } else {
                          setColores([...colores, c.name]);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                        exists
                          ? 'bg-[#141312] text-[#E6C687] border border-[#141312] shadow-xs'
                          : 'bg-[#FAF8F5] text-[#5A554D] border border-[#DDD7CC] hover:border-[#141312]'
                      }`}
                    >
                      <span
                        className={`w-2.5 h-2.5 rounded-full inline-block ${c.border ? 'border border-[#999]' : ''}`}
                        style={{ backgroundColor: c.bg }}
                      />
                      <span>{exists ? `✓ ${c.name}` : `+ ${c.name}`}</span>
                    </button>
                  );
                })}
              </div>

              {/* Input manual para agregar cualquier color personalizado */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Escribe otro color manual (ej: Azul Rey, Vino Tinto, Dorado, Camuflaje...)"
                  value={colorInput}
                  onChange={(e) => setColorInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (colorInput.trim() && !colores.includes(colorInput.trim())) {
                        setColores([...colores, colorInput.trim()]);
                        setColorInput('');
                      }
                    }
                  }}
                  className="flex-1 bg-[#FAF8F5] text-xs px-3.5 py-2 rounded-xl border border-[#E5DFD5] focus:outline-none focus:border-[#C59A4D]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (colorInput.trim() && !colores.includes(colorInput.trim())) {
                      setColores([...colores, colorInput.trim()]);
                      setColorInput('');
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#141312] text-[#F5E6BE] text-xs font-bold hover:bg-black transition-colors cursor-pointer shrink-0"
                >
                  + Agregar Color
                </button>
              </div>

              {/* Chips de colores activos */}
              {colores.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {colores.map((c, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#141312] text-white text-xs font-bold shadow-xs"
                    >
                      <span>{c}</span>
                      <button
                        type="button"
                        onClick={() => setColores(colores.filter((_, i) => i !== idx))}
                        className="text-[#E6C687] hover:text-white cursor-pointer"
                        title="Eliminar color"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECCIÓN VARIANTES & OPCIONES PERSONALIZABLES             */}
          {/* ======================================================== */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[#FAF9F6] border-2 border-[#E5DFD5] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EBE5DB]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#141312] text-[#E6C687] flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-[#1A1918] font-heading">
                    Variantes y Opciones Personalizables
                  </h3>
                  <p className="text-[11px] text-[#7A7368]">
                    Tallas, colores, modelos, sabores, presentaciones o atributos con SKU y stock individual
                  </p>
                </div>
              </div>

              {/* Switch Activar Variantes */}
              <button
                type="button"
                onClick={() => setTieneVariantes(!tieneVariantes)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                  tieneVariantes
                    ? 'bg-[#141312] text-[#F5E6BE] shadow-sm'
                    : 'bg-[#EAE5DC] text-[#7A7368] hover:bg-[#DDD6CB]'
                }`}
              >
                <span>{tieneVariantes ? 'Variantes Activadas' : 'Activar Variantes'}</span>
              </button>
            </div>

            {tieneVariantes ? (
              <div className="space-y-5 animate-fade-in">
                {/* 1. Atributos Configurables */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#5A554D] flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-[#C59A4D]" />
                      1. Define los Atributos del Producto:
                    </span>
                    <button
                      type="button"
                      onClick={handleAddCustomAttribute}
                      className="text-xs font-bold text-[#C59A4D] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      + Atributo Personalizado
                    </button>
                  </div>

                  {/* Preset quick buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAddPresetAttribute('Talla', ['S', 'M', 'L', 'XL'])}
                      className="px-2.5 py-1 rounded-lg bg-white border border-[#DDD7CC] hover:border-[#141312] text-[10px] font-bold text-[#1A1918] cursor-pointer"
                    >
                      + Talla (S, M, L, XL)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddPresetAttribute('Calzado', ['38', '39', '40', '41', '42', '43'])}
                      className="px-2.5 py-1 rounded-lg bg-white border border-[#DDD7CC] hover:border-[#141312] text-[10px] font-bold text-[#1A1918] cursor-pointer"
                    >
                      + Calzado (38 - 43)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddPresetAttribute('Color', ['Negro', 'Blanco', 'Azul', 'Rojo'])}
                      className="px-2.5 py-1 rounded-lg bg-white border border-[#DDD7CC] hover:border-[#141312] text-[10px] font-bold text-[#1A1918] cursor-pointer"
                    >
                      + Color (Negro, Blanco, etc.)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddPresetAttribute('Modelo', ['Clásico', 'Edición 2026', 'Retro'])}
                      className="px-2.5 py-1 rounded-lg bg-white border border-[#DDD7CC] hover:border-[#141312] text-[10px] font-bold text-[#1A1918] cursor-pointer"
                    >
                      + Modelo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddPresetAttribute('Presentación', ['Individual', 'Pack x2', 'Caja Deluxe'])}
                      className="px-2.5 py-1 rounded-lg bg-white border border-[#DDD7CC] hover:border-[#141312] text-[10px] font-bold text-[#1A1918] cursor-pointer"
                    >
                      + Presentación
                    </button>
                  </div>

                  {/* List of attributes */}
                  <div className="space-y-2.5">
                    {atributos.map((attr, attrIdx) => (
                      <div
                        key={attrIdx}
                        className="p-3 bg-white rounded-2xl border border-[#EAE5DC] space-y-2 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-[#1A1918] uppercase tracking-wide">
                            {attr.nombre}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttribute(attrIdx)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                            title="Eliminar atributo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Values badges */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {attr.valores.map((val) => (
                            <span
                              key={val}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#DDD7CC] text-xs font-bold text-[#1A1918]"
                            >
                              <span>{val}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveValueFromAttribute(attrIdx, val)}
                                className="text-[#9C9488] hover:text-rose-600 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>

                        {/* Input to add value */}
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            placeholder={`Agregar valor a ${attr.nombre} (ej: XL o presiona Enter)...`}
                            value={newValInputs[attrIdx] || ''}
                            onChange={(e) =>
                              setNewValInputs((prev) => ({ ...prev, [attrIdx]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddValueToAttribute(attrIdx);
                              }
                            }}
                            className="flex-1 bg-[#FAF8F5] text-xs px-3 py-1.5 rounded-xl border border-[#E5DFD5] focus:outline-none focus:border-[#C59A4D]"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddValueToAttribute(attrIdx)}
                            className="px-3 py-1.5 rounded-xl bg-[#141312] text-white text-xs font-bold hover:bg-black transition-colors cursor-pointer"
                          >
                            + Agregar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Botón Generador de Combinaciones */}
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-black text-amber-950 block">
                      2. Combinaciones y Existencias de Variantes
                    </span>
                    <span className="text-[11px] text-amber-800">
                      {variantes.length === 0
                        ? 'Genera automáticamente las combinaciones de tus atributos o agrégalas manualmente'
                        : `${variantes.length} combinaciones generadas con control individual de stock`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleGenerateVariantCombinations}
                      className="px-3.5 py-2 rounded-xl bg-[#141312] hover:bg-black text-[#F5E6BE] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#E6C687]" />
                      <span>Generar Combinaciones</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddManualVariant}
                      className="px-3 py-2 rounded-xl bg-white border border-[#DDD7CC] hover:border-[#141312] text-xs font-bold text-[#1A1918] cursor-pointer"
                    >
                      + Manual
                    </button>
                  </div>
                </div>

                {/* Tabla de Variantes generadas */}
                {variantes.length > 0 && (
                  <div className="border border-[#E5DFD5] rounded-2xl overflow-hidden bg-white shadow-xs">
                    <div className="overflow-x-auto max-h-60">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#FAF8F5] text-[#7A7368] font-black uppercase text-[10px] tracking-wider border-b border-[#E5DFD5] sticky top-0">
                          <tr>
                            <th className="py-2.5 px-3">Variante / Opciones</th>
                            <th className="py-2.5 px-3">SKU</th>
                            <th className="py-2.5 px-3">Precio ($)</th>
                            <th className="py-2.5 px-3">Stock</th>
                            <th className="py-2.5 px-3 text-center">Estado</th>
                            <th className="py-2.5 px-3 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F0EAE1]">
                          {variantes.map((v) => (
                            <tr key={v.id} className={!v.activo ? 'opacity-50 bg-[#FAF8F5]' : ''}>
                              <td className="py-2 px-3 font-bold text-[#1A1918] min-w-[140px]">
                                {v.titulo}
                              </td>
                              <td className="py-2 px-3 min-w-[110px]">
                                <input
                                  type="text"
                                  value={v.sku || ''}
                                  onChange={(e) => handleUpdateVariant(v.id, 'sku', e.target.value)}
                                  placeholder="SKU-VAR"
                                  className="w-full bg-[#FAF8F5] text-[11px] font-mono px-2 py-1 rounded-lg border border-[#E5DFD5]"
                                />
                              </td>
                              <td className="py-2 px-3 min-w-[90px]">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={v.precio !== undefined ? v.precio : precio}
                                  onChange={(e) =>
                                    handleUpdateVariant(v.id, 'precio', parseFloat(e.target.value) || 0)
                                  }
                                  className="w-full bg-white text-black font-extrabold text-xs px-2.5 py-1.5 rounded-lg border-2 border-zinc-300 focus:outline-none focus:border-[#C59A4D]"
                                />
                              </td>
                              <td className="py-2 px-3 min-w-[80px]">
                                <input
                                  type="number"
                                  min="0"
                                  value={v.stock}
                                  onChange={(e) =>
                                    handleUpdateVariant(v.id, 'stock', Math.max(0, parseInt(e.target.value, 10) || 0))
                                  }
                                  className="w-full bg-white text-black font-black text-xs px-2.5 py-1.5 rounded-lg border-2 border-zinc-300 focus:outline-none focus:border-[#C59A4D]"
                                />
                              </td>
                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateVariant(v.id, 'activo', !v.activo)}
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase cursor-pointer ${
                                    v.activo
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-zinc-200 text-zinc-600'
                                  }`}
                                >
                                  {v.activo ? 'Activo' : 'Pausado'}
                                </button>
                              </td>
                              <td className="py-2 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveVariant(v.id)}
                                  className="p-1 text-[#9C9488] hover:text-rose-600 rounded cursor-pointer"
                                  title="Quitar variante"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="p-3 bg-[#FCFAF7] border-t border-[#E5DFD5] flex items-center justify-between text-xs">
                      <span className="text-[#7A7368] font-bold">
                        Stock total combinado de variantes activas:
                      </span>
                      <span className="font-black text-sm text-[#C59A4D]">
                        {stockTotalVariantes} unidades
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Inventario estándar simple si no tiene variantes */
              <div className="p-3.5 rounded-2xl bg-white border border-[#EBE6DD] space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {tallas.length > 0 ? (
                    <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#DDD7CC]">
                      <label className="text-[11px] font-bold text-[#5A554D] block mb-1">
                        Stock Total Calculado de Tallas
                      </label>
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm text-[#C59A4D]">{stockTotalTallas} unidades</span>
                        <span className="text-[10px] text-[#7A7368] font-mono">
                          ({tallas.map((t) => `${t}: ${tallasStock[t] ?? 0}`).join(' | ')})
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-[11px] font-bold text-[#5A554D] block mb-1">
                        Cantidad de Unidades Disponibles (Stock)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={cantidad}
                        onChange={(e) => setCantidad(e.target.value)}
                        placeholder="10"
                        className="w-full bg-white text-xs text-[#1A1918] px-3 py-2 rounded-xl border border-[#E5DFD5] focus:outline-none focus:border-[#C59A4D]"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-bold text-[#5A554D] block mb-1">
                      Alerta de Stock Mínimo
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={stockMinimo}
                      onChange={(e) => setStockMinimo(e.target.value)}
                      placeholder="3"
                      className="w-full bg-white text-xs text-[#1A1918] px-3 py-2 rounded-xl border border-[#E5DFD5] focus:outline-none focus:border-[#C59A4D]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

          {/* Fotos del Producto o Arreglo (0 de 4) */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#1A1918] block">
                  {tipo === 'arreglo' ? 'FOTOS / MUESTRAS DEL ARREGLO' : 'FOTOS DEL PRODUCTO'} ({imagenes.length} DE 4)
                </span>
                <p className="text-[11px] text-[#7A7368]">
                  {tipo === 'arreglo'
                    ? 'Sube fotos de muestras, trabajos previos o el modelo del arreglo para que los clientes lo vean en el catálogo.'
                    : 'Almacenadas en Supabase Storage. La primera imagen será la portada principal.'}
                </p>
              </div>

              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                {imagenes.length}/4 fotos cargadas
              </span>
            </div>

            {/* 4 slots preview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((slotIdx) => {
                const img = imagenes[slotIdx];
                const label =
                  slotIdx === 0
                    ? 'Foto Portada'
                    : slotIdx === 1
                    ? 'Foto #2'
                    : slotIdx === 2
                    ? 'Foto #3'
                    : 'Foto #4';

                return (
                  <div
                    key={slotIdx}
                    className="relative aspect-[3/4] rounded-2xl border-2 border-dashed border-[#DDD7CC] bg-[#FAF8F5] flex flex-col items-center justify-center p-2 text-center overflow-hidden"
                  >
                    {img && typeof img === 'string' && img.trim().length > 0 ? (
                      <>
                        <img src={img} alt="" className="w-full h-full object-cover rounded-xl" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(slotIdx)}
                          className="absolute top-2 right-2 p-1 rounded-full bg-rose-600 text-white hover:bg-rose-700 shadow"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="absolute bottom-1 left-2 text-[9px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded">
                          {label}
                        </span>
                      </>
                    ) : (
                      <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFilesUpload}
                          className="hidden"
                          disabled={imagenes.length >= 4}
                        />
                        <div className="w-8 h-8 rounded-full bg-[#EFEAE2] flex items-center justify-center text-[#7A7368] mb-1.5">
                          <Plus className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-[#1A1918]">{label}</span>
                        <span className="text-[10px] text-[#8C8375]">Click para subir</span>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Upload from device button */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
              <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#141312] hover:bg-black text-white text-xs font-black tracking-wider uppercase cursor-pointer transition-all shadow-md">
                <UploadCloud className="w-4 h-4 text-[#E6C687]" />
                <span>{uploadingImage ? 'Subiendo a Supabase Storage...' : 'Subir fotos desde dispositivo'}</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFilesUpload}
                  className="hidden"
                  disabled={imagenes.length >= 4}
                />
              </label>
              <span className="text-[11px] text-[#7A7368]">
                Formatos JPG, PNG, WEBP (hasta 10MB por foto)
              </span>
            </div>

            {/* Direct URL input */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C9488]" />
                <input
                  type="url"
                  placeholder="O pegar enlace directo de imagen (https://...)..."
                  value={directUrl}
                  onChange={(e) => setDirectUrl(e.target.value)}
                  className="w-full bg-white text-xs text-[#1A1918] pl-10 pr-3.5 py-2 rounded-xl border border-[#E5DFD5] focus:outline-none focus:border-[#C59A4D]"
                />
              </div>
              <button
                type="button"
                onClick={handleAddDirectUrl}
                className="px-4 py-2 rounded-xl bg-[#8C8375] hover:bg-[#6E685F] text-white text-xs font-bold shrink-0 transition-colors cursor-pointer"
              >
                Agregar Foto
              </button>
            </div>
          </div>

          {/* Footer actions */}
          <div className="pt-4 border-t border-[#26221E] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 sticky bottom-0 bg-[#13110F] py-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider text-[#A69F93] hover:text-white cursor-pointer text-center transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting || uploadingImage}
              className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-black font-extrabold text-xs tracking-wider uppercase transition-all shadow-lg active:scale-98 disabled:opacity-50 cursor-pointer text-center justify-center hover:brightness-110"
            >
              {isSubmitting
                ? 'Guardando...'
                : isEditing
                ? (tipo === 'arreglo' ? 'Actualizar Arreglo' : 'Actualizar Producto & Variantes')
                : (tipo === 'arreglo' ? 'Crear y Publicar Arreglo' : 'Crear Producto & Variantes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
