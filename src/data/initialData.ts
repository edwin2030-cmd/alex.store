import { Categoria, Producto } from '../types';

// Categorías base para inicializar el catálogo de AlexStore
export const CATEGORIAS_INICIALES: Categoria[] = [
  {
    id: "c2d9d965-19ed-4903-b3e1-e49e542d503f",
    nombre: "Nba temporada actual",
    descripcion: "Jerseys oficiales temporada actual NBA",
    imagen_url: null,
    activa: true,
    activo: true,
  },
  {
    id: "66ab239d-f1eb-4578-a917-bc338d2f1b97",
    nombre: "Camisetas del Real Madrid",
    descripcion: "Equipacion del Real Madrid",
    imagen_url: null,
    activa: true,
    activo: true,
  },
  {
    id: "0eafa76a-6c1a-4394-8816-97044404f229",
    nombre: "Camiseta del Barcelona",
    descripcion: "Equipación oficial FC Barcelona",
    imagen_url: null,
    activa: true,
    activo: true,
  },
  {
    id: "46697972-9a74-4356-b292-8d66db46fe33",
    nombre: "Camiseta del fútbol",
    descripcion: "Clubes europeos e internacionales",
    imagen_url: null,
    activa: true,
    activo: true,
  }
];

// Productos vacíos desde 0 tal como solicitó el usuario para añadirlos desde el panel de gestión
export const PRODUCTOS_INICIALES: Producto[] = [];

export const INVENTARIO_INICIAL: Record<string, number> = {};
