import React, { useState, useEffect } from 'react';
import { Categoria } from '../types';
import { X, UploadCloud, Image as ImageIcon } from 'lucide-react';
import { crearCategoria, actualizarCategoria, subirFotoStorage } from '../lib/supabase';

interface ModalNuevaCategoriaProps {
  isOpen: boolean;
  onClose: () => void;
  categoriaToEdit?: Categoria | null;
  onCategoriaSaved: () => void;
}

export const ModalNuevaCategoria: React.FC<ModalNuevaCategoriaProps> = ({
  isOpen,
  onClose,
  categoriaToEdit,
  onCategoriaSaved,
}) => {
  if (!isOpen) return null;

  const isEditing = Boolean(categoriaToEdit);

  const [nombre, setNombre] = useState(categoriaToEdit?.nombre || '');
  const [descripcion, setDescripcion] = useState(categoriaToEdit?.descripcion || '');
  const [imagenUrl, setImagenUrl] = useState(categoriaToEdit?.imagen_url || '');
  const [activa, setActiva] = useState(categoriaToEdit?.activa ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (categoriaToEdit) {
      setNombre(categoriaToEdit.nombre);
      setDescripcion(categoriaToEdit.descripcion || '');
      setImagenUrl(categoriaToEdit.imagen_url || '');
      setActiva(categoriaToEdit.activa);
    }
  }, [categoriaToEdit]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadingImage(true);
      const res = await subirFotoStorage(e.target.files[0], 'productos');
      if (res.url) {
        setImagenUrl(res.url);
      }
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      alert('Ingresa el nombre de la categoría.');
      return;
    }

    setIsSubmitting(true);

    if (isEditing && categoriaToEdit) {
      const res = await actualizarCategoria(categoriaToEdit.id, {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        imagen_url: imagenUrl || undefined,
        activa,
      });

      if (!res.success) {
        alert('Error al actualizar: ' + (res.error || ''));
      }
    } else {
      const res = await crearCategoria({
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        imagen_url: imagenUrl || undefined,
        activa,
      });

      if (!res.success) {
        alert('Error al crear: ' + (res.error || ''));
      }
    }

    setIsSubmitting(false);
    onCategoriaSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#13110F] rounded-3xl shadow-2xl shadow-black/80 border border-[#26221E] overflow-hidden my-3 sm:my-6 max-h-[90dvh] flex flex-col text-white">
        {/* Header */}
        <div className="p-4 sm:p-7 border-b border-[#26221E] flex items-start justify-between shrink-0 bg-[#1A1816]/50">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white font-heading leading-tight">
              {isEditing ? 'Editar Categoría' : 'Nueva Categoría'}
            </h2>
            <p className="text-xs sm:text-sm text-[#A69F93] mt-1">
              Crea o edita una categoría para organizar el catálogo de la tienda
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
        <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-4 sm:space-y-5 flex-1 overflow-y-auto">
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-[#E6C687] block mb-1.5">
              NOMBRE DE LA CATEGORÍA *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Calzado, Accesorios, Tecnología..."
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-[#1A1816] text-xs sm:text-sm text-white placeholder-[#787168] px-3.5 py-2.5 rounded-xl border border-[#38332B] focus:outline-none focus:border-[#E6C687]"
            />
          </div>

          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-[#E6C687] block mb-1.5">
              DESCRIPCIÓN
            </label>
            <textarea
              rows={3}
              placeholder="Breve detalle sobre los productos incluidos..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full bg-[#1A1816] text-xs sm:text-sm text-white placeholder-[#787168] px-3.5 py-2.5 rounded-xl border border-[#38332B] focus:outline-none focus:border-[#E6C687] resize-none"
            />
          </div>

          {/* Imagen Representativa */}
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-[#E6C687] block mb-1.5">
              IMAGEN REPRESENTATIVA
            </label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-[#38332B] bg-[#1A1816] flex items-center justify-center overflow-hidden shrink-0">
                {imagenUrl ? (
                  <img src={imagenUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-[#787168]" />
                )}
              </div>

              <div className="space-y-1">
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A1816] hover:bg-[#26221E] border border-[#38332B] text-[#E6C687] text-xs font-bold cursor-pointer transition-all">
                  <UploadCloud className="w-4 h-4 text-[#C59A4D]" />
                  <span>{uploadingImage ? 'Cargando...' : 'Cargar desde dispositivo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-[#A69F93]">
                  Se guardará en Supabase Storage (bucket productos).
                </p>
              </div>
            </div>
          </div>

          {/* Toggle Activa */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setActiva(!activa)}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                activa ? 'bg-emerald-600' : 'bg-[#38332B]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  activa ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-xs font-bold text-white">
              Categoría Activa (Visible en Catálogo)
            </span>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-[#26221E] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
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
                ? 'Actualizar Categoría'
                : 'CREAR CATEGORÍA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
