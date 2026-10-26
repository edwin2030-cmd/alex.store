import { supabase } from './supabase';
import { UsuarioPanel, UserRole } from '../types';

const STORAGE_KEY_USER_PROFILE = 'alexstore_auth_profile';

/**
 * Permisos por rol para cada sección del panel administrativo
 * Roles del sistema:
 * - dueno: Acceso completo y control total
 * - cajero: Trabajador / Cajero (Productos, Inventario, Pedidos, Clientes, Categorías)
 */
export const ROLE_PERMISSIONS: Record<UserRole, {
  name: string;
  badgeColor: string;
  sections: string[];
  canManageUsers: boolean;
  canViewFinancials: boolean;
  canManageRoles: boolean;
}> = {
  dueno: {
    name: '👑 Dueño (Acceso Total)',
    badgeColor: 'bg-[#C59A4D] text-[#141312] border border-[#B3873B]',
    sections: ['dashboard', 'pedidos', 'ventas', 'caja', 'gastos', 'movimientos', 'productos', 'categorias', 'inventario', 'clientes', 'usuarios'],
    canManageUsers: true,
    canViewFinancials: true,
    canManageRoles: true,
  },
  administrador: {
    name: '⚡ Administrador (Operativo y Finanzas)',
    badgeColor: 'bg-indigo-600 text-white border border-indigo-500',
    sections: ['dashboard', 'pedidos', 'ventas', 'caja', 'gastos', 'movimientos', 'productos', 'categorias', 'inventario', 'clientes'],
    canManageUsers: false,
    canViewFinancials: true,
    canManageRoles: false,
  },
  cajero: {
    name: '💼 Trabajador / Cajero',
    badgeColor: 'bg-emerald-600 text-white border border-emerald-500',
    sections: ['pedidos', 'ventas', 'productos', 'inventario', 'clientes', 'categorias'],
    canManageUsers: false,
    canViewFinancials: false,
    canManageRoles: false,
  },
};

/**
 * Verifica si un rol tiene autorización para ver y operar en una sección dada
 */
export function canAccessSection(role: UserRole | undefined, section: string): boolean {
  if (!role) return false;
  const config = ROLE_PERMISSIONS[role];
  if (!config) return false;
  return config.sections.includes(section);
}

/**
 * Verifica si el actor puede editar o cambiar el estado de un usuario objetivo
 */
export function canModifyUser(actorRole: UserRole, targetUser: UsuarioPanel): boolean {
  // Solo el Dueño puede modificar usuarios y permisos
  if (actorRole !== 'dueno') return false;
  return true;
}

/**
 * Obtiene el perfil del usuario actual desde Supabase o almacenamiento local seguro
 */
export async function getPerfilUsuario(userId: string, email: string): Promise<UsuarioPanel | null> {
  const activeSavedRole = localStorage.getItem('alexstore_active_role');
  
  // 1. Revisar perfil almacenado previamente para respetar el rol Dueño
  let previousSaved: UsuarioPanel | null = null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_USER_PROFILE);
    if (saved) {
      previousSaved = JSON.parse(saved);
    }
  } catch {}

  try {
    const { data, error } = await supabase
      .from('perfiles_usuarios')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (!error && data) {
      // Si la sesión anterior era Dueño y no se ha cambiado explícitamente, mantener Dueño
      const finalRole: UserRole = (previousSaved?.rol === 'dueno' || activeSavedRole === 'dueno')
        ? 'dueno'
        : (data.rol as UserRole);

      const perfil: UsuarioPanel = {
        id: data.id || userId,
        email: data.email,
        nombre: data.nombre,
        rol: finalRole,
        activo: data.activo ?? true,
        creado_en: data.creado_en,
        actualizado_en: data.actualizado_en,
        creado_por: data.creado_por,
        actualizado_por: data.actualizado_por,
        ultimo_acceso: data.ultimo_acceso,
      };
      localStorage.setItem(STORAGE_KEY_USER_PROFILE, JSON.stringify(perfil));
      localStorage.setItem('alexstore_active_role', finalRole);
      return perfil;
    }
  } catch (err) {
    console.warn('Aviso consultando perfiles_usuarios en Supabase:', err);
  }

  // 2. Fallback a perfil almacenado previamente
  if (previousSaved && previousSaved.email === email) {
    if (activeSavedRole === 'dueno') {
      previousSaved.rol = 'dueno';
    }
    return previousSaved;
  }

  // 3. Si no existe perfil en la tabla pero el email coincide con el dueño base o es el primer usuario
  const esDuenoInicial =
    email.includes('admin') ||
    email.includes('alex') ||
    email.includes('dueno') ||
    email.includes('pedro') ||
    activeSavedRole === 'dueno';

  const perfilDefault: UsuarioPanel = {
    id: userId || 'usr_' + Date.now(),
    email,
    nombre: email.split('@')[0].toUpperCase(),
    rol: esDuenoInicial ? 'dueno' : 'cajero',
    activo: true,
    creado_en: new Date().toISOString(),
    creado_por: 'Sistema',
  };

  localStorage.setItem(STORAGE_KEY_USER_PROFILE, JSON.stringify(perfilDefault));
  localStorage.setItem('alexstore_active_role', perfilDefault.rol);
  return perfilDefault;
}

/**
 * Obtiene la lista de usuarios registrados para el módulo de administración
 */
export async function getUsuariosList(): Promise<UsuarioPanel[]> {
  try {
    const { data, error } = await supabase
      .from('perfiles_usuarios')
      .select('*')
      .order('creado_en', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((u) => ({
        id: u.id,
        email: u.email,
        nombre: u.nombre,
        rol: u.rol as UserRole,
        activo: u.activo ?? true,
        creado_en: u.creado_en,
        actualizado_en: u.actualizado_en,
        creado_por: u.creado_por,
        actualizado_por: u.actualizado_por,
        ultimo_acceso: u.ultimo_acceso,
      }));
    }
  } catch (err) {
    console.warn('Error cargando lista de usuarios de Supabase:', err);
  }

  // Si la tabla no está creada aún en Supabase, devolver usuarios de demostración local
  try {
    const localUsers = localStorage.getItem('alexstore_local_usuarios');
    if (localUsers) {
      return JSON.parse(localUsers);
    }
  } catch {
    // ignore
  }

  // Lista inicial por defecto si la base de datos no tiene perfiles aún
  const defaultList: UsuarioPanel[] = [
    {
      id: 'dueno-principal',
      email: 'admin@alexmstore.com',
      nombre: 'Propietario AlexStore',
      rol: 'dueno',
      activo: true,
      creado_en: new Date().toISOString(),
      creado_por: 'Sistema Inicial',
    },
    {
      id: 'cajero-principal',
      email: 'cajero@alexmstore.com',
      nombre: 'Cajero / Mostrador',
      rol: 'cajero',
      activo: true,
      creado_en: new Date().toISOString(),
      creado_por: 'admin@alexmstore.com',
    },
  ];

  localStorage.setItem('alexstore_local_usuarios', JSON.stringify(defaultList));
  return defaultList;
}

/**
 * Crea un nuevo usuario en perfiles_usuarios
 */
export async function crearNuevoUsuario(
  nuevo: {
    email: string;
    nombre: string;
    rol: UserRole;
    activo: boolean;
  },
  creadorEmail: string,
  creadorRol: UserRole
): Promise<{ success: boolean; data?: UsuarioPanel; error?: string }> {
  // Validación de permisos estricta: Solo el dueño puede crear usuarios
  if (creadorRol !== 'dueno') {
    return { success: false, error: 'Solo el Dueño tiene permisos para registrar nuevos usuarios.' };
  }

  const idGenerado =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
  const fechaActual = new Date().toISOString();

  const usuarioRecord: UsuarioPanel = {
    id: idGenerado,
    email: nuevo.email.trim().toLowerCase(),
    nombre: nuevo.nombre.trim(),
    rol: nuevo.rol,
    activo: nuevo.activo,
    creado_en: fechaActual,
    actualizado_en: fechaActual,
    creado_por: creadorEmail,
  };

  try {
    const { data, error } = await supabase
      .from('perfiles_usuarios')
      .insert([
        {
          id: idGenerado,
          email: usuarioRecord.email,
          nombre: usuarioRecord.nombre,
          rol: usuarioRecord.rol,
          activo: usuarioRecord.activo,
          creado_por: creadorEmail,
          creado_en: fechaActual,
          actualizado_en: fechaActual,
        },
      ])
      .select();

    if (!error && data && data[0]) {
      return { success: true, data: data[0] };
    }
  } catch (err: any) {
    console.warn('Fallo guardando usuario en Supabase:', err);
  }

  // Persistencia local para continuidad inmediata
  try {
    const list = await getUsuariosList();
    const updated = [usuarioRecord, ...list.filter((u) => u.email !== usuarioRecord.email)];
    localStorage.setItem('alexstore_local_usuarios', JSON.stringify(updated));
    return { success: true, data: usuarioRecord };
  } catch (e: any) {
    return { success: false, error: e.message || 'Error al crear usuario' };
  }
}

/**
 * Actualiza el rol o estado de un usuario con validación de seguridad
 */
export async function actualizarUsuario(
  id: string,
  actualizaciones: {
    nombre?: string;
    rol?: UserRole;
    activo?: boolean;
  },
  actorEmail: string,
  actorRol: UserRole
): Promise<{ success: boolean; error?: string }> {
  if (actorRol === 'cajero') {
    return { success: false, error: 'Acceso denegado: rol cajero no autorizado.' };
  }

  const list = await getUsuariosList();
  const targetUser = list.find((u) => u.id === id);

  if (!targetUser) {
    return { success: false, error: 'Usuario no encontrado.' };
  }

  // El dueño no puede ser desactivado o degradado por un administrador
  if (targetUser.rol === 'dueno' && actorRol !== 'dueno') {
    return {
      success: false,
      error: 'Operación no permitida: Solo el dueño puede modificar privilegios de la cuenta principal.',
    };
  }

  // Un administrador no puede ascenderse a sí mismo a dueño
  if (actualizaciones.rol === 'dueno' && actorRol !== 'dueno') {
    return {
      success: false,
      error: 'Solo el dueño actual puede transferir la propiedad del negocio.',
    };
  }

  const fechaActual = new Date().toISOString();

  try {
    const { error } = await supabase
      .from('perfiles_usuarios')
      .update({
        ...actualizaciones,
        actualizado_en: fechaActual,
        actualizado_por: actorEmail,
      })
      .eq('id', id);

    if (!error) {
      return { success: true };
    }
  } catch (err) {
    console.warn('Error actualizando en Supabase:', err);
  }

  // Fallback local
  try {
    const updatedList = list.map((u) =>
      u.id === id
        ? {
            ...u,
            ...actualizaciones,
            actualizado_en: fechaActual,
            actualizado_por: actorEmail,
          }
        : u
    );
    localStorage.setItem('alexstore_local_usuarios', JSON.stringify(updatedList));
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Elimina un usuario (exclusivo para el Dueño)
 */
export async function eliminarUsuario(
  id: string,
  actorEmail: string,
  actorRol: UserRole
): Promise<{ success: boolean; error?: string }> {
  if (actorRol !== 'dueno') {
    return {
      success: false,
      error: 'Exclusivo para el Dueño: Los administradores y cajeros no pueden eliminar usuarios.',
    };
  }

  const list = await getUsuariosList();
  const targetUser = list.find((u) => u.id === id);

  if (targetUser?.email === actorEmail) {
    return {
      success: false,
      error: 'Por seguridad, no puedes eliminar tu propia cuenta de dueño en sesión activa.',
    };
  }

  try {
    if (targetUser?.email) {
      // Intentar llamada RPC de limpieza profunda en auth.users y perfiles
      try {
        await supabase.rpc('eliminar_usuario_sistema', { p_email: targetUser.email });
      } catch {}

      await supabase
        .from('perfiles_usuarios')
        .delete()
        .eq('email', targetUser.email);
    }

    const { error } = await supabase
      .from('perfiles_usuarios')
      .delete()
      .eq('id', id);

    if (!error) {
      const updatedList = list.filter((u) => u.id !== id && u.email !== targetUser?.email);
      localStorage.setItem('alexstore_local_usuarios', JSON.stringify(updatedList));
      return { success: true };
    }
  } catch (err) {
    console.warn('Error eliminando en Supabase:', err);
  }

  // Fallback local
  try {
    const updatedList = list.filter((u) => u.id !== id);
    localStorage.setItem('alexstore_local_usuarios', JSON.stringify(updatedList));
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Cierra la sesión activa en Supabase Auth y limpia el almacenamiento local
 */
export async function cerrarSesion(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('Aviso al cerrar sesión en Supabase:', err);
  }
  localStorage.removeItem(STORAGE_KEY_USER_PROFILE);
}

/**
 * Recupera el perfil del usuario autenticado guardado en caché de sesión
 */
export function getSavedUserProfile(): UsuarioPanel | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_USER_PROFILE);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Guarda o actualiza el rol (Dueño o Trabajador) para un correo creado en Supabase Authentication
 */
export async function guardarRolUsuarioAuth(
  email: string,
  rol: UserRole,
  nombre?: string
): Promise<{ success: boolean; data?: UsuarioPanel; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const nombreFinal = nombre?.trim() || cleanEmail.split('@')[0];
  const fechaActual = new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from('perfiles_usuarios')
      .upsert(
        {
          email: cleanEmail,
          nombre: nombreFinal,
          rol,
          activo: true,
          actualizado_en: fechaActual,
        },
        { onConflict: 'email' }
      )
      .select();

    if (!error && data && data[0]) {
      const list = await getUsuariosList();
      const updatedList = [data[0], ...list.filter((u) => u.email !== cleanEmail)];
      localStorage.setItem('alexstore_local_usuarios', JSON.stringify(updatedList));
      return { success: true, data: data[0] };
    }
  } catch (err: any) {
    console.warn('Error en upsert Supabase:', err);
  }

  // Fallback local
  try {
    const list = await getUsuariosList();
    const existing = list.find((u) => u.email === cleanEmail);
    const updated: UsuarioPanel = {
      id: existing?.id || 'usr_' + Date.now(),
      email: cleanEmail,
      nombre: nombreFinal,
      rol,
      activo: true,
      creado_en: existing?.creado_en || fechaActual,
      actualizado_en: fechaActual,
      creado_por: 'Panel de Control',
    };
    const newList = [updated, ...list.filter((u) => u.email !== cleanEmail)];
    localStorage.setItem('alexstore_local_usuarios', JSON.stringify(newList));
    return { success: true, data: updated };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

