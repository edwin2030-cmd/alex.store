import React, { useState } from 'react';
import { X, Shield, AlertCircle, Check } from 'lucide-react';
import { UserRole, UsuarioPanel } from '../types';
import { actualizarUsuario } from '../lib/auth';

interface ModalEditarRolProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: UsuarioPanel | null;
  currentUser: UsuarioPanel;
  onUserUpdated: () => void;
}

export const ModalEditarRol: React.FC<ModalEditarRolProps> = ({
  isOpen,
  onClose,
  targetUser,
  currentUser,
  onUserUpdated,
}) => {
  if (!isOpen || !targetUser) return null;

  const [nombre, setNombre] = useState(targetUser.nombre);
  const [rol, setRol] = useState<UserRole>(targetUser.rol);
  const [activo, setActivo] = useState(targetUser.activo);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    // Seguridad: si es admin, no puede modificar al dueño
    if (currentUser.rol === 'administrador' && targetUser.rol === 'dueno') {
      setErrorMsg('No tienes autorización para modificar la cuenta del Dueño.');
      setLoading(false);
      return;
    }

    // Seguridad: si es admin, no puede asignar rol dueno o admin
    if (currentUser.rol === 'administrador' && rol !== 'cajero') {
      setErrorMsg('Los administradores únicamente pueden gestionar usuarios con rol Cajero.');
      setLoading(false);
      return;
    }

    try {
      const res = await actualizarUsuario(
        targetUser.id,
        {
          nombre: nombre.trim(),
          rol,
          activo,
        },
        currentUser.email,
        currentUser.rol
      );

      if (!res.success) {
        setErrorMsg(res.error || 'Error al actualizar usuario.');
        setLoading(false);
        return;
      }

      onUserUpdated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error inesperado al actualizar usuario.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm">
      <div className="min-h-full flex items-center justify-center p-3 sm:p-4 py-8">
        <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#E5DFD5] space-y-6 my-auto animate-fade-in">
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-[#F0EAE1]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#141312] text-[#E6C687] flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-lg text-[#1A1918]">Modificar Privilegios</h3>
                <span className="text-xs text-[#7A7368] font-mono">{targetUser.email}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-[#F2ECE1] text-[#7A7368] hover:text-[#1A1918] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#1A1918] block mb-1.5">
                Nombre del Usuario
              </label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-[#FCFAF7] text-sm text-[#1A1918] px-4 py-2.5 rounded-2xl border border-[#E5DFD5] focus:outline-none focus:border-[#C59A4D]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#1A1918] block mb-1.5">
                Rol Asignado
              </label>

              <div className="space-y-2">
                <label
                  onClick={() => setRol('cajero')}
                  className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-colors ${
                    rol === 'cajero' ? 'border-emerald-600 bg-emerald-50/70' : 'border-[#E5DFD5] bg-[#FCFAF7]'
                  }`}
                >
                  <input
                    type="radio"
                    name="role_radio"
                    checked={rol === 'cajero'}
                    onChange={() => setRol('cajero')}
                    className="mt-1 accent-emerald-600"
                  />
                  <div>
                    <strong className="text-xs text-[#1A1918] block">Trabajador o Cajero</strong>
                    <span className="text-[11px] text-[#7A7368]">
                      Productos, Inventario, Pedidos, Clientes y Categorías.
                    </span>
                  </div>
                </label>

                {currentUser.rol === 'dueno' && (
                  <label
                    onClick={() => setRol('dueno')}
                    className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-colors ${
                      rol === 'dueno' ? 'border-[#C59A4D] bg-[#FCFAF5]' : 'border-[#E5DFD5] bg-[#FCFAF7]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role_radio"
                      checked={rol === 'dueno'}
                      onChange={() => setRol('dueno')}
                      className="mt-1 accent-[#C59A4D]"
                    />
                    <div>
                      <strong className="text-xs text-[#1A1918] block">Dueño del Negocio</strong>
                      <span className="text-[11px] text-[#7A7368]">
                        Acceso total sin restricciones a todos los módulos y usuarios.
                      </span>
                    </div>
                  </label>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FCFAF7] border border-[#E5DFD5] flex items-center justify-between">
              <div>
                <span className="font-extrabold text-xs text-[#1A1918] block">Estado de Acceso</span>
                <span className="text-[11px] text-[#7A7368]">
                  {activo ? 'Cuenta activa con acceso al panel' : 'Cuenta bloqueada / suspendida'}
                </span>
              </div>
              <input
                type="checkbox"
                checked={activo}
                disabled={targetUser.rol === 'dueno' && currentUser.id === targetUser.id}
                onChange={(e) => setActivo(e.target.checked)}
                className="w-5 h-5 accent-emerald-600 rounded cursor-pointer disabled:opacity-30"
              />
            </div>

            <div className="pt-3 border-t border-[#F0EAE1] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#7A7368] hover:text-[#1A1918] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-[#141312] hover:bg-black text-[#E6C687] text-xs font-black uppercase tracking-wider disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
