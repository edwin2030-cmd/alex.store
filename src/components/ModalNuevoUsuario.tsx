import React, { useState } from 'react';
import { X, UserPlus, Mail, Lock, User, Shield, AlertCircle, Check } from 'lucide-react';
import { UserRole, UsuarioPanel } from '../types';
import { crearNuevoUsuario } from '../lib/auth';
import { supabase } from '../lib/supabase';

interface ModalNuevoUsuarioProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UsuarioPanel;
  onUserCreated: () => void;
}

export const ModalNuevoUsuario: React.FC<ModalNuevoUsuarioProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserCreated,
}) => {
  if (!isOpen) return null;

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<UserRole>('cajero');
  const [activo, setActivo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    if (!nombre.trim()) {
      setErrorMsg('Ingresa el nombre completo del colaborador.');
      setLoading(false);
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Ingresa un correo electrónico válido.');
      setLoading(false);
      return;
    }

    // Un administrador solo puede crear cajeros
    if (currentUser.rol === 'administrador' && rol !== 'cajero') {
      setErrorMsg('Como Administrador, únicamente tienes autorización para crear cuentas de Cajero / Trabajador.');
      setLoading(false);
      return;
    }

    try {
      // Registrar credenciales en Supabase Authentication si se proveyó contraseña
      if (password.trim() && password.trim().length >= 6) {
        try {
          await supabase.auth.signUp({
            email: email.trim().toLowerCase(),
            password: password.trim(),
            options: {
              data: {
                nombre: nombre.trim(),
                rol,
              },
            },
          });
        } catch (authErr) {
          console.warn('Aviso registrando en Supabase Auth:', authErr);
        }
      }

      const res = await crearNuevoUsuario(
        {
          nombre: nombre.trim(),
          email: email.trim().toLowerCase(),
          rol,
          activo,
        },
        currentUser.email,
        currentUser.rol
      );

      if (!res.success) {
        setErrorMsg(res.error || 'Error al crear usuario.');
        setLoading(false);
        return;
      }

      onUserCreated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error inesperado al crear cuenta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm">
      <div className="min-h-full flex items-center justify-center p-3 sm:p-4 py-8">
        <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#E5DFD5] space-y-6 my-auto animate-fade-in">
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-[#F0EAE1]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#141312] text-[#E6C687] flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-lg text-[#1A1918]">Registrar Nuevo Usuario</h3>
                <span className="text-xs text-[#7A7368]">
                  Crea una cuenta para un trabajador o administrador
                </span>
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
            {/* Nombre */}
            <div>
              <label className="text-xs font-bold text-[#1A1918] flex items-center gap-1.5 mb-1.5">
                <User className="w-3.5 h-3.5 text-[#C59A4D]" />
                <span>Nombre Completo *</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Daniel Martínez"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-[#FCFAF7] text-sm text-[#1A1918] placeholder-[#9C9488] px-4 py-2.5 rounded-2xl border border-[#E5DFD5] focus:outline-none focus:border-[#C59A4D] transition-colors"
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-bold text-[#1A1918] flex items-center gap-1.5 mb-1.5">
                <Mail className="w-3.5 h-3.5 text-[#C59A4D]" />
                <span>Correo Electrónico *</span>
              </label>
              <input
                type="email"
                required
                placeholder="daniel@alexmstore.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#FCFAF7] text-sm text-[#1A1918] placeholder-[#9C9488] px-4 py-2.5 rounded-2xl border border-[#E5DFD5] focus:outline-none focus:border-[#C59A4D] transition-colors"
              />
            </div>

            {/* Contraseña Inicial */}
            <div>
              <label className="text-xs font-bold text-[#1A1918] flex items-center gap-1.5 mb-1.5">
                <Lock className="w-3.5 h-3.5 text-[#C59A4D]" />
                <span>Contraseña Inicial *</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contraseña segura (mínimo 6 caracteres)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#FCFAF7] text-sm text-[#1A1918] placeholder-[#9C9488] px-4 py-2.5 rounded-2xl border border-[#E5DFD5] focus:outline-none focus:border-[#C59A4D] transition-colors font-mono"
              />
            </div>

            {/* Selector de Rol */}
            <div>
              <label className="text-xs font-bold text-[#1A1918] flex items-center gap-1.5 mb-1.5">
                <Shield className="w-3.5 h-3.5 text-[#C59A4D]" />
                <span>Rol y Nivel de Privilegios *</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {/* Opción Cajero */}
                <button
                  type="button"
                  onClick={() => setRol('cajero')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    rol === 'cajero'
                      ? 'border-emerald-600 bg-emerald-50/70 shadow-xs'
                      : 'border-[#E5DFD5] bg-[#FCFAF7] hover:border-[#C59A4D]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-xs text-[#1A1918]">💼 Trabajador / Cajero</span>
                    {rol === 'cajero' && <Check className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <p className="text-[11px] text-[#7A7368]">
                    Acceso operativo: Productos, Inventario, Pedidos, Clientes y Categorías.
                  </p>
                </button>

                {/* Opción Dueño */}
                <button
                  type="button"
                  onClick={() => setRol('dueno')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    rol === 'dueno'
                      ? 'border-[#C59A4D] bg-[#FCFAF5] shadow-xs'
                      : 'border-[#E5DFD5] bg-[#FCFAF7] hover:border-[#C59A4D]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-xs text-[#1A1918]">👑 Dueño del Negocio</span>
                    {rol === 'dueno' && <Check className="w-4 h-4 text-[#C59A4D]" />}
                  </div>
                  <p className="text-[11px] text-[#7A7368]">
                    Acceso total sin restricciones a todos los módulos y finanzas.
                  </p>
                </button>
              </div>
            </div>

            {/* Estado Activo */}
            <div className="p-3.5 rounded-2xl bg-[#FCFAF7] border border-[#E5DFD5] flex items-center justify-between">
              <div>
                <span className="font-extrabold text-xs text-[#1A1918] block">Cuenta Activa</span>
                <span className="text-[11px] text-[#7A7368]">
                  Permite iniciar sesión de inmediato en el panel
                </span>
              </div>
              <input
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
                className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
              />
            </div>

            {/* Acciones */}
            <div className="pt-3 border-t border-[#F0EAE1] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#7A7368] hover:text-[#1A1918] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-[#141312] hover:bg-black text-[#E6C687] text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {loading ? 'Creando cuenta...' : 'Crear Usuario'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
