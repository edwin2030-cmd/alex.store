import React, { useState, useEffect } from 'react';
import { Categoria, Producto } from '../types';
import { X, UploadCloud, Plus, Trash2, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import { crearProducto, actualizarProducto, subirFotoStorage } from '../lib/supabase';

interface ModalNuevoProductoProps {
  isOpen: boolean;
  onClose: () => void;
  categorias: Categoria[];
  productoToEdit?: Producto | null;
  onProductoSaved: () => void;
}

export const ModalNuevoProducto: React.FC<ModalNuevoProductoProps> = ({
  isOpen,
  onClose,
  categorias,
  productoToEdit,
  onProductoSaved,
}) => {
  if (!isOpen) return null;

  const isEditing = Boolean(productoToEdit);

  const [nombre, setNombre] = useState(productoToEdit?.nombre || '');
  const [categoriaId, setCategoriaId] = useState(productoToEdit?.categoria_id || (categorias[0]?.id || ''));
  const [precio, setPrecio] = useState(productoToEdit?.precio ? String(productoToEdit.precio) : '50');
  const [activo, setActivo] = useState(productoToEdit?.activo ?? true);
  const [cantidad, setCantidad] = useState(productoToEdit?.stock !== undefined ? String(productoToEdit.stock) : '10');
  const [stockMinimo, setStockMinimo] = useState(productoToEdit?.stock_minimo !== undefined ? String(productoToEdit.stock_minimo) : '3');
  const [descripcion, setDescripcion] = useState(productoToEdit?.descripcion || '');
  const [imagenes, setImagenes] = useState<string[]>(productoToEdit?.imagenes || (productoToEdit?.imagen_url ? [productoToEdit.imagen_url] : []));
  const [directUrl, setDirectUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (productoToEdit) {
      setNombre(productoToEdit.nombre);
      setCategoriaId(productoToEdit.categoria_id || (categorias[0]?.id || ''));
      setPrecio(String(productoToEdit.precio));
      setActivo(productoToEdit.activo);
      setCantidad(String(productoToEdit.stock ?? 10));
      setStockMinimo(String(productoToEdit.stock_minimo ?? 3));
      setDescripcion(productoToEdit.descripcion || '');
      setImagenes(productoToEdit.imagenes || (productoToEdit.imagen_url ? [productoToEdit.imagen_url] : []));
    }
  }, [productoToEdit, categorias]);

  // Handle local files upload (up to 4)
  const handleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files).slice(0, 4 - imagenes.length);
    if (files.length === 0) return;

    setUploadingImage(true);
    const uploadedUrls: string[] = [];

    for (const file of files) {
      const res = await subirFotoStorage(file, 'productos');
      if (res.url) {
        uploadedUrls.push(res.url);
      }
    }

    setImagenes((prev) => [...prev, ...uploadedUrls].slice(0, 4));
    setUploadingImage(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      alert('Ingresa el nombre del producto.');
      return;
    }

    setIsSubmitting(true);
    const numPrecio = parseFloat(precio) || 0;
    const numCantidad = parseInt(cantidad, 10) || 0;
    const numStockMin = parseInt(stockMinimo, 10) || 3;
    const mainImageUrl = imagenes[0] || null;

    if (isEditing && productoToEdit) {
      const res = await actualizarProducto(
        productoToEdit.id,
        {
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || undefined,
          precio: numPrecio,
          categoria_id: categoriaId || undefined,
          imagen_url: mainImageUrl || undefined,
          imagenes,
          activo,
        },
        numCantidad,
        numStockMin
      );

      if (!res.success) {
        alert('Error al actualizar: ' + (res.error || ''));
      }
    } else {
      const res = await crearProducto(
        {
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || undefined,
          precio: numPrecio,
          categoria_id: categoriaId || undefined,
          imagen_url: mainImageUrl || undefined,
          imagenes,
          activo,
        },
        numCantidad,
        numStockMin
      );

      if (!res.success) {
        alert('Error al crear producto: ' + (res.error || ''));
      }
    }

    setIsSubmitting(false);
    onProductoSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#E5DFD5] overflow-hidden my-6">
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-[#F0EAE1] flex items-start justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#1A1918] font-heading leading-tight">
              {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
            </h2>
            <p className="text-xs sm:text-sm text-[#7A7368] mt-1">
              Crea un nuevo producto en public.productos con hasta 4 fotos e inventario
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#F2ECE1] text-[#7A7368] hover:text-[#1A1918] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body (Images 8 and 9) */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
          {/* Row 1: Categoria & Precio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-[#5A554D] block mb-1.5">
                CATEGORÍA
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
              <label className="text-[11px] font-black uppercase tracking-wider text-[#5A554D] block mb-1.5">
                PRECIO ($) *
              </label>
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
          </div>

          {/* Toggle Activo */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setActivo(!activo)}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                activo ? 'bg-[#C59A4D]' : 'bg-[#D5CEC2]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  activo ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-xs font-bold text-[#1A1918]">
              Producto Activo (Visible en Catálogo)
            </span>
          </div>

          {/* Inventario Inicial Box (Image 8) */}
          <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EBE6DD] space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-[#7A7368] block">
              INVENTARIO INICIAL (PUBLIC.INVENTARIO)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-[#5A554D] block mb-1">
                  Cantidad de Unidades Disponibles
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

          {/* Nombre del Producto */}
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-[#5A554D] block mb-1.5">
              NOMBRE DEL PRODUCTO *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Camiseta del Real Madrid (Blanca 26/27) Dorsal 10 Mbappe"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-white text-xs sm:text-sm text-[#1A1918] px-3.5 py-2.5 rounded-xl border border-[#E5DFD5] focus:outline-none focus:border-[#C59A4D]"
            />
          </div>

          {/* Descripción Detallada */}
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-[#5A554D] block mb-1.5">
              DESCRIPCIÓN DETALLADA
            </label>
            <textarea
              rows={3}
              placeholder="Describe las características principales, materiales, dimensiones, tallas disponibles..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full bg-white text-xs sm:text-sm text-[#1A1918] px-3.5 py-2.5 rounded-xl border border-[#E5DFD5] focus:outline-none focus:border-[#C59A4D]"
            />
          </div>

          {/* Fotos del Producto (0 de 4) (Image 9) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#1A1918] block">
                  FOTOS DEL PRODUCTO ({imagenes.length} DE 4)
                </span>
                <p className="text-[11px] text-[#7A7368]">
                  Puedes subir hasta 4 imágenes por producto. La primera será la portada principal.
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
                    {img ? (
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

            {/* Upload from device button (Image 9) */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
              <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#141312] hover:bg-black text-white text-xs font-black tracking-wider uppercase cursor-pointer transition-all shadow-md">
                <UploadCloud className="w-4 h-4 text-[#E6C687]" />
                <span>{uploadingImage ? 'Subiendo...' : 'Subir fotos desde dispositivo'}</span>
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
                (Puedes seleccionar hasta 4 fotos simultáneamente)
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
                className="px-4 py-2 rounded-xl bg-[#8C8375] hover:bg-[#6E685F] text-white text-xs font-bold shrink-0 transition-colors"
              >
                Agregar Foto
              </button>
            </div>
          </div>

          {/* Footer actions */}
          <div className="pt-4 border-t border-[#F0EAE1] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-xs font-extrabold uppercase tracking-wider text-[#7A7368] hover:text-[#1A1918]"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting || uploadingImage}
              className="px-7 py-3 rounded-2xl bg-[#141312] hover:bg-black text-[#F5E6BE] font-extrabold text-xs tracking-wider uppercase transition-all shadow-lg active:scale-98 disabled:opacity-50"
            >
              {isSubmitting
                ? 'Guardando...'
                : isEditing
                ? 'Actualizar Producto'
                : 'Crear Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
