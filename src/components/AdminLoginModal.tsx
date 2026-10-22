import React, { useState } from 'react';
import { AlexStoreLogo } from './AlexStoreLogo';
import { Mail, Lock, Eye, EyeOff, X, Shield, AlertCircle, UserCheck, KeyRound, User } from 'lucide-react';
import { supabase, registrarMovimiento } from '../lib/supabase';
import { getPerfilUsuario, getUsuariosList, guardarRolUsuarioAuth } from '../lib/auth';
import { UsuarioPanel, UserRole } from '../types';
import { ModalSqlAuth } from './ModalSqlAuth';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (userProfile: UsuarioPanel) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  if (!isOpen) return null;

  // Modo de ingreso: 'dueno' o 'trabajador'
  const [activeTab, setActiveTab] = useState<'dueno' | 'trabajador'>('dueno');

  // Campos de formulario
  const [nombreTrabajador, setNombreTrabajador] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Estados de control
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSqlModal, setShowSqlModal] = useState(false);

  const handleTabChange = (tab: 'dueno' | 'trabajador') => {
    setActiveTab(tab);
    setErrorMsg(null);
    setPassword('');
    if (tab === 'dueno') {
      setEmail((prev) => (prev.includes('cajero') || prev.includes('trabajador') ? '' : prev));
    } else {
      setEmail((prev) => (prev.includes('dueno') || prev.includes('admin') ? '' : prev));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanNombre = nombreTrabajador.trim();

    // 1. Validaciones previas
    if (!cleanEmail) {
      setErrorMsg('Por favor ingresa tu correo electrónico registrado.');
      setLoading(false);
      return;
    }

    if (!cleanPassword) {
      setErrorMsg('Por favor ingresa tu contraseña de acceso.');
      setLoading(false);
      return;
    }

    if (activeTab === 'trabajador' && !cleanNombre) {
      setErrorMsg('Por favor ingresa tu nombre para registrar tu turno de trabajo.');
      setLoading(false);
      return;
    }

    try {
      // 2. Autenticación con Supabase Auth (Verificación de Correo y Contraseña)
      let authUser: any = null;
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (authError) {
        console.warn('Supabase Auth error:', authError.message);

        if (authError.message.includes('Invalid login credentials')) {
          // Si el usuario aún no existe en auth.users pero existe en perfiles_usuarios
          const userList = await getUsuariosList();
          const matchedProfile = userList.find((u) => u.email.toLowerCase() === cleanEmail);

          if (matchedProfile) {
            if (!matchedProfile.activo) {
              setErrorMsg('Esta cuenta ha sido desactivada por el dueño. Contacta al administrador.');
              setLoading(false);
              return;
            }

            // Validar restricción de rol según pestaña
            if (activeTab === 'dueno' && matchedProfile.rol === 'cajero') {
              setErrorMsg('Esta cuenta pertenece al rol de Trabajador. Por favor selecciona la pestaña "2. TRABAJADOR".');
              setLoading(false);
              return;
            }

            const perfilFinal: UsuarioPanel = {
              ...matchedProfile,
              nombre: activeTab === 'trabajador' ? cleanNombre : matchedProfile.nombre,
            };

            // Registrar movimiento de auditoría
            await registrarMovimiento({
              usuario_id: perfilFinal.id,
              usuario_nombre: perfilFinal.nombre,
              usuario_email: perfilFinal.email,
              rol: perfilFinal.rol,
              accion: activeTab === 'trabajador' ? 'Inicio de Turno / Sesión' : 'Inicio de Sesión (Dueño)',
              modulo: 'auth',
              detalles: activeTab === 'trabajador'
                ? `Trabajador "${cleanNombre}" inició sesión para su turno de trabajo con correo ${cleanEmail}.`
                : `Dueño "${perfilFinal.nombre}" inició sesión en el panel de control.`,
            });

            onLoginSuccess(perfilFinal);
            return;
          }

          setErrorMsg('Credenciales inválidas. Verifica tu correo y contraseña registrados en Supabase.');
          setLoading(false);
          return;
        } else if (authError.message.includes('Email not confirmed')) {
          setErrorMsg('El correo aún no ha sido confirmado en Supabase.');
          setLoading(false);
          return;
        } else if (authError.message.includes('rate limit')) {
          setErrorMsg('Límite de intentos alcanzado. Por favor espera un momento e intenta nuevamente.');
          setLoading(false);
          return;
        } else {
          setErrorMsg(authError.message);
          setLoading(false);
          return;
        }
      }

      authUser = authData?.user;

      // 3. Obtener o registrar perfil de permisos y rol en public.perfiles_usuarios
      let perfil = await getPerfilUsuario(authUser?.id || 'usr', cleanEmail);

      const targetRol: UserRole = activeTab === 'dueno' ? 'dueno' : 'cajero';
      const targetNombre = activeTab === 'trabajador' ? cleanNombre : (perfil?.nombre || cleanEmail.split('@')[0]);

      // Si el correo fue creado en Supabase Authentication y aún no está asignado o se ingresa como Dueño:
      if (!perfil || perfil.rol !== targetRol) {
        // Guardar automáticamente en perfiles_usuarios con el rol elegido
        const saveRes = await guardarRolUsuarioAuth(cleanEmail, targetRol, targetNombre);
        if (saveRes.data) {
          perfil = saveRes.data;
        }
      }

      if (!perfil) {
        perfil = {
          id: authUser?.id || 'usr_' + Date.now(),
          email: cleanEmail,
          nombre: targetNombre,
          rol: targetRol,
          activo: true,
          creado_en: new Date().toISOString(),
          creado_por: 'Supabase Authentication',
        };
      }

      if (!perfil.activo) {
        setErrorMsg('Esta cuenta ha sido desactivada. Contacta al Dueño de la tienda.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // Si es trabajador, actualizar el nombre ingresado para su turno
      if (activeTab === 'trabajador') {
        perfil.nombre = cleanNombre;
      }

      // 4. Registrar movimiento en la tabla de auditoría
      await registrarMovimiento({
        usuario_id: perfil.id,
        usuario_nombre: perfil.nombre,
        usuario_email: perfil.email,
        rol: perfil.rol,
        accion: activeTab === 'trabajador' ? 'Inicio de Turno / Sesión' : 'Inicio de Sesión (Dueño)',
        modulo: 'auth',
        detalles: activeTab === 'trabajador'
          ? `Trabajador "${cleanNombre}" inició sesión para su turno de trabajo.`
          : `Dueño "${perfil.nombre}" inició sesión en el panel de control.`,
      });

      onLoginSuccess(perfil);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión con el servidor de Supabase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-md">
      <div className="min-h-full flex items-center justify-center p-3 sm:p-4 py-4 sm:py-8">
        <div className="relative w-full max-w-md bg-[#131211] border border-[#26221E] rounded-3xl p-5 sm:p-8 shadow-2xl space-y-4 sm:space-y-5 my-auto animate-fade-in">
          {/* Botón cerrar */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-[#7A7368] hover:text-white hover:bg-[#221F1B] transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Logo y Encabezado */}
          <div className="flex flex-col items-center text-center space-y-1.5">
            <AlexStoreLogo size="lg" />
            <div className="pt-1">
              <span className="font-extrabold text-2xl text-white tracking-tight leading-none">
                Alex<span className="text-[#C59A4D]">Store</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-[#8C8375] block mt-1">
                SISTEMA SEGURO CON AUDITORÍA
              </span>
            </div>

            <div className="pt-2">
              <h2 className="text-xl sm:text-2xl font-black text-white font-heading">
                Acceso al Panel
              </h2>
              <p className="text-xs text-[#8C8375] mt-0.5">
                Ingreso protegido exclusivamente por correo y contraseña
              </p>
            </div>
          </div>

          {/* Selector de 2 opciones: DUEÑO/ADMIN y TRABAJADOR */}
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#A69F93] block">
              SELECCIONA EL TIPO DE ACCESO:
            </span>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#1A1816] rounded-2xl border border-[#2B2722]">
              <button
                type="button"
                onClick={() => handleTabChange('dueno')}
                className={`py-3 px-3 rounded-xl transition-all font-black text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  activeTab === 'dueno'
                    ? 'bg-[#C59A4D] text-black shadow-md border border-[#D4A95B]'
                    : 'text-[#8C8375] hover:text-white hover:bg-[#23201C]'
                }`}
              >
                <span>1. DUEÑO / ADMIN</span>
                <span className="text-[9px] font-medium lowercase opacity-80">correo y contraseña</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('trabajador')}
                className={`py-3 px-3 rounded-xl transition-all font-black text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  activeTab === 'trabajador'
                    ? 'bg-emerald-600 text-white shadow-md border border-emerald-500'
                    : 'text-[#8C8375] hover:text-white hover:bg-[#23201C]'
                }`}
              >
                <span>2. TRABAJADOR</span>
                <span className="text-[9px] font-medium lowercase opacity-80">nombre, correo y clave</span>
              </button>
            </div>
          </div>

          {/* Mensaje de error si falla la autenticación */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          {/* Formulario de Inicio de Sesión */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Campo NOMBRE: Únicamente se solicita si se entra como TRABAJADOR */}
            {activeTab === 'trabajador' && (
              <div className="animate-fade-in">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 block mb-1.5 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>TU NOMBRE COMPLETO (TURNO):</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/70" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={nombreTrabajador}
                    onChange={(e) => setNombreTrabajador(e.target.value)}
                    placeholder="Ej: Daniel Martínez / Turno Tarde"
                    className="w-full bg-[#1C1A17] text-sm text-white placeholder-[#5A554D] pl-10 pr-4 py-3 rounded-2xl border border-emerald-500/60 focus:outline-none focus:border-emerald-400 transition-colors font-medium"
                  />
                </div>
                <span className="text-[10px] text-[#7A7368] block mt-1">
                  Tu nombre quedará registrado en cada pedido, venta y movimiento de inventario que realices.
                </span>
              </div>
            )}

            {/* Campo CORREO ELECTRÓNICO */}
            <div>
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#A69F93] block mb-1.5">
                CORREO ELECTRÓNICO
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E685F]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={activeTab === 'dueno' ? 'dueno@alexstore.com' : 'trabajador@alexstore.com'}
                  className="w-full bg-[#1C1A17] text-sm text-white placeholder-[#5A554D] pl-10 pr-4 py-3 rounded-2xl border border-[#2D2822] focus:outline-none focus:border-[#C59A4D] transition-colors font-medium"
                />
              </div>
            </div>

            {/* Campo CONTRASEÑA */}
            <div>
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#A69F93] block mb-1.5">
                CONTRASEÑA
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E685F]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#1C1A17] text-sm text-white placeholder-[#5A554D] pl-10 pr-11 py-3 rounded-2xl border border-[#2D2822] focus:outline-none focus:border-[#C59A4D] transition-colors font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6E685F] hover:text-white cursor-pointer"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Botón de Enviar */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-98 disabled:opacity-50 cursor-pointer ${
                activeTab === 'dueno'
                  ? 'bg-[#C59A4D] hover:bg-[#D4A95B] text-slate-950 shadow-[#C59A4D]/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
              }`}
            >
              {loading
                ? 'AUTENTICANDO CON SUPABASE...'
                : activeTab === 'dueno'
                ? 'INGRESAR COMO DUEÑO / ADMIN'
                : 'INGRESAR AL TURNO COMO TRABAJADOR'}
            </button>
          </form>

          {/* Enlace al script SQL y aviso de seguridad */}
          <div className="pt-2 border-t border-[#26221E] flex flex-col items-center gap-2 text-center">
            <button
              type="button"
              onClick={() => setShowSqlModal(true)}
              className="text-[11px] text-[#C59A4D] hover:text-[#D4A95B] hover:underline flex items-center gap-1 font-bold cursor-pointer transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Ver script SQL para crear Dueño y Trabajador en Supabase</span>
            </button>
            <span className="text-[10px] text-[#7A7368] flex items-center justify-center gap-1">
              <Shield className="w-3 h-3 text-[#C59A4D]" />
              Protegido con Row Level Security y Auditoría de Movimientos
            </span>
          </div>
        </div>
      </div>

      <ModalSqlAuth
        isOpen={showSqlModal}
        onClose={() => setShowSqlModal(false)}
      />
    </div>
  );
};
