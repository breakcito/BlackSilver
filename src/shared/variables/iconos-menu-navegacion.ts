import type { ComponentType } from "react";
import {
  BuildingOffice2Icon,
  UserGroupIcon,
  UsersIcon,
  TruckIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ArrowsRightLeftIcon,
  ReceiptRefundIcon,
  ShoppingCartIcon,
  CubeIcon,
  ClockIcon,
  BriefcaseIcon,
  FireIcon,
  WrenchIcon,
} from "@heroicons/react/24/outline";

// Normaliza un nombre a slug estable (lowercase, sin acentos, guiones).
// Se usa como clave de mapeo para nodos SIN path (contenedores).
const slugify = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Mapeo de iconos para el menu de navegacion.
//
// El campo `path` admite DOS tipos de clave:
// - Para nodos cliqueables (menu/submenu/modulo hoja con `path` no nulo en el
//   backend): el segmento de URL real devuelto por la API. Es estable y unico
//   entre niveles (no hay dos registros menu/submenu/modulo con el mismo path).
// - Para contenedores (menu/submenu con `path` null): el slug del `nombre`.
//   Mismo formato que los antiguos `menu_path`/`submenu_path`. Estable mientras
//   no se renombre el contenedor (si se renombra, se actualiza esta entrada).
//
// Se evita usar `id_menu`/`id_submenu` porque esos IDs cambian entre DEV y PROD.
export interface IconoMenuEntrada {
  path: string;
  icono: ComponentType<{ className?: string }>;
}

export const iconos_menu_navegacion: IconoMenuEntrada[] = [
  // ----- Menus contenedores (slug del nombre) -----
  { path: "configuracion", icono: Cog6ToothIcon },
  { path: "logistica", icono: TruckIcon },
  { path: "operaciones", icono: WrenchIcon },

  // ----- Submenus contenedores (slug del nombre) -----
  { path: "empresa", icono: BuildingOffice2Icon },
  { path: "personal", icono: UserGroupIcon },
  { path: "usuarios", icono: UsersIcon },
  { path: "socios-comerciales", icono: BriefcaseIcon },
  { path: "inventario", icono: ClipboardDocumentListIcon },
  { path: "requerimientos-de-almacen", icono: DocumentTextIcon },
  { path: "solicitudes-de-reabastecimiento", icono: ArrowsRightLeftIcon },
  { path: "prestamos-a-almacen", icono: ReceiptRefundIcon },
  { path: "compras", icono: ShoppingCartIcon },
  { path: "control-de-activos", icono: ClipboardDocumentListIcon },
  { path: "control-de-personal", icono: ClockIcon },
  { path: "produccion", icono: CubeIcon },

  // ----- Nodos cliqueables (path real devuelto por el backend) -----
  // Menu (hoja directa)
  { path: "compra-carbon", icono: FireIcon },

  // Configuracion / Empresa
  { path: "empresas", icono: BuildingOffice2Icon },
  { path: "concesiones", icono: BuildingOffice2Icon },
  { path: "minas", icono: BuildingOffice2Icon },
  { path: "almacenes", icono: BuildingOffice2Icon },

  // Configuracion / Personal
  { path: "areas-cargos", icono: UserGroupIcon },
  { path: "trabajadores", icono: UserGroupIcon },

  // Configuracion / Usuarios
  { path: "roles", icono: UsersIcon },
  { path: "cuentas", icono: UsersIcon },

  // Configuracion / Socios Comerciales
  { path: "proveedores", icono: BriefcaseIcon },
  { path: "clientes", icono: BriefcaseIcon },

  // Logistica / Inventario
  { path: "categorias", icono: ClipboardDocumentListIcon },
  { path: "productos", icono: ClipboardDocumentListIcon },
  { path: "activos", icono: ClipboardDocumentListIcon },
  { path: "lotes", icono: ClipboardDocumentListIcon },
  { path: "kardex", icono: ClipboardDocumentListIcon },

  // Logistica / Requerimientos de Almacen
  { path: "atencion-requerimientos", icono: DocumentTextIcon },

  // Logistica / Solicitudes de Reabastecimiento
  { path: "solicitudes", icono: ArrowsRightLeftIcon },
  { path: "atencion-solicitudes", icono: ArrowsRightLeftIcon },

  // Logistica / Prestamos a Almacen
  { path: "prestamos", icono: ReceiptRefundIcon },
  { path: "atencion-prestamos", icono: ReceiptRefundIcon },

  // Logistica / Compras
  { path: "cotizaciones", icono: ShoppingCartIcon },
  { path: "ordenes-compra", icono: ShoppingCartIcon },
  { path: "recepcion-transferencias", icono: ShoppingCartIcon },

  // Operaciones / Control de Activos
  { path: "uso", icono: ClipboardDocumentListIcon },
  { path: "mantenimiento", icono: ClipboardDocumentListIcon },

  // Operaciones / Control de Personal
  { path: "programacion-horarios", icono: ClockIcon },
  { path: "asistencia", icono: ClockIcon },
  { path: "planilla", icono: ClockIcon },

  // Operaciones / Produccion
  { path: "consumo", icono: CubeIcon },
  { path: "lote-mineral", icono: CubeIcon },
  { path: "produccion-mineral", icono: CubeIcon },
];

// Lookup hibrido:
// - Si el item tiene `path` no nulo (cliqueable) -> busca por path real.
// - Si `path` es null (contenedor) -> busca por slug del `nombre`.
// Devuelve `null` cuando no hay match; el caller decide el fallback generico.
export const getIconoPorItem = (
  item: { path: string | null; nombre: string },
): IconoMenuEntrada["icono"] | null => {
  if (item.path) {
    const byPath = iconos_menu_navegacion.find(
      (i) => i.path === item.path,
    );
    if (byPath) return byPath.icono;
  }
  const slug = slugify(item.nombre);
  if (!slug) return null;
  return (
    iconos_menu_navegacion.find((i) => i.path === slug)?.icono ?? null
  );
};
