import React, { useState } from 'react';
import { X, UserPlus, Mail, Lock, User, Shield, AlertCircle, Check, Eye, EyeOff, Sparkles, KeyRound } from 'lucide-react';
import { UserRole, UsuarioPanel } from '../types';
import { crearUsuarioPanel } from '../lib/supabase';

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
  const [showPassword, setShowPassword] = useState(false);
  const [rol, setRol] = useState<UserRole>('cajero');
  const [activo, setActivo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let generated = 'Alex';
    for (let i = 0; i < 6; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    generated += '26!';
    setPassword(generated);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const cleanNombre = nombre.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanNombre) {
      setErrorMsg('Ingresa el nombre completo del colaborador.');
      setLoading(false);
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Ingresa un correo electrónico válido.');
      setLoading(false);
      return;
    }

    if (!cleanPass || cleanPass.length < 6) {
      setErrorMsg('La contraseña debe tener mínimo 6 caracteres para guardarse en Supabase Authentication.');
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
      const res = await crearUsuarioPanel({
        email: cleanEmail,
        password: cleanPass,
        nombre: cleanNombre,
        rol,
        creadoPorEmail: currentUser.email,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Error al crear usuario en Supabase.');
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md">
      <div className="min-h-full flex items-center justify-center p-3 sm:p-4 py-8">
        <div className="relative w-full max-w-lg bg-[#13110F] rounded-3xl p-4 sm:p-8 shadow-2xl shadow-black/80 border border-[#26221E] space-y-5 sm:space-y-6 my-auto animate-fade-in max-h-[92dvh] overflow-y-auto text-white">
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-[#26221E]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#1A1816] border border-[#38332B] text-[#E6C687] flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-lg text-white">Registrar Usuario en Supabase</h3>
                <span className="text-xs text-[#A69F93]">
                  Se guarda en Authentication y en la base de datos
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-[#1A1816] text-[#A69F93] hover:text-white transition-colors cursor-pointer border border-transparent hover:border-[#38332B]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Banner informativo Supabase Auth */}
          <div className="p-3.5 rounded-2xl bg-[#1A1816] border border-[#C59A4D]/30 text-[#E6C687] text-xs flex items-start gap-2.5">
            <KeyRound className="w-4 h-4 text-[#C59A4D] shrink-0 mt-0.5" />
            <span>
              La cuenta se creará en <strong>Supabase Authentication</strong> y se le asignará el rol de <strong>{rol === 'dueno' ? '👑 Dueño' : '💼 Trabajador'}</strong> para acceder de inmediato al panel.
            </span>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-850/60 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre */}
            <div>
              <label className="text-xs font-bold text-[#E6C687] flex items-center gap-1.5 mb-1.5">
                <User className="w-3.5 h-3.5 text-[#C59A4D]" />
                <span>Nombre Completo *</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Daniel Martínez"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-[#1A1816] text-sm text-white placeholder-[#787168] px-4 py-2.5 rounded-2xl border border-[#38332B] focus:outline-none focus:border-[#E6C687] transition-colors"
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-bold text-[#E6C687] flex items-center gap-1.5 mb-1.5">
                <Mail className="w-3.5 h-3.5 text-[#C59A4D]" />
                <span>Correo Electrónico (para iniciar sesión) *</span>
              </label>
              <input
                type="email"
                required
                placeholder="daniel@alexmstore.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#1A1816] text-sm text-white placeholder-[#787168] px-4 py-2.5 rounded-2xl border border-[#38332B] focus:outline-none focus:border-[#E6C687] transition-colors"
              />
            </div>

            {/* Contraseña Inicial */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#E6C687] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#C59A4D]" />
                  <span>Contraseña de Acceso *</span>
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-[11px] font-bold text-[#E6C687] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-[#E6C687]" />
                  <span>Generar segura</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#1A1816] text-sm text-white placeholder-[#787168] pl-4 pr-11 py-2.5 rounded-2xl border border-[#38332B] focus:outline-none focus:border-[#E6C687] transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A69F93] hover:text-white p-1 cursor-pointer"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Selector de Rol */}
            <div>
              <label className="text-xs font-bold text-[#E6C687] flex items-center gap-1.5 mb-1.5">
                <Shield className="w-3.5 h-3.5 text-[#C59A4D]" />
                <span>Rol en la Tienda *</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {/* Opción Cajero */}
                <button
                  type="button"
                  onClick={() => setRol('cajero')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    rol === 'cajero'
                      ? 'border-emerald-500 bg-emerald-950/30 shadow-xs'
                      : 'border-[#26221E] bg-[#1A1816] hover:border-[#38332B]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-xs text-white">💼 Trabajador / Cajero</span>
                    {rol === 'cajero' && <Check className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <p className="text-[11px] text-[#A69F93]">
                    Acceso operativo: Productos, Inventario, Pedidos, Clientes y Categorías.
                  </p>
                </button>

                {/* Opción Dueño */}
                <button
                  type="button"
                  onClick={() => setRol('dueno')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    rol === 'dueno'
                      ? 'border-[#E6C687] bg-[#E6C687]/10 shadow-xs'
                      : 'border-[#26221E] bg-[#1A1816] hover:border-[#38332B]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-xs text-white">👑 Dueño del Negocio</span>
                    {rol === 'dueno' && <Check className="w-4 h-4 text-[#E6C687]" />}
                  </div>
                  <p className="text-[11px] text-[#A69F93]">
                    Acceso total sin restricciones a todos los módulos y finanzas.
                  </p>
                </button>
              </div>
            </div>

            {/* Estado Activo */}
            <div className="p-3.5 rounded-2xl bg-[#1A1816] border border-[#26221E] flex items-center justify-between">
              <div>
                <span className="font-extrabold text-xs text-white block">Cuenta Activa</span>
                <span className="text-[11px] text-[#A69F93]">
                  Permite iniciar sesión de inmediato en el panel
                </span>
              </div>
              <input
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
                className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
              />
            </div>

            {/* Acciones */}
            <div className="pt-3 border-t border-[#26221E] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-[#A69F93] hover:text-white transition-colors cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-black text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-md text-center justify-center hover:brightness-110 active:scale-95"
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
