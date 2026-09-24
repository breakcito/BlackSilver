export interface RES_Nodo {
  id_menu?: number;
  id_submenu?: number;
  id_modulo?: number;
}

export interface RES_ModuloMenu {
  id: number;
  id_submenu: number;
  nombre: string;
  path: string;
  numero_orden: number;
  estado: string;
}

export interface RES_SubmenuMenu {
  id: number;
  id_menu: number;
  nombre: string;
  path: string;
  numero_orden: number;
  es_desplegable: boolean;
  estado: string;
  modulos: RES_ModuloMenu[];
}

export interface RES_MenuArbol {
  id: number;
  nombre: string;
  path: string;
  numero_orden: number;
  es_desplegable: boolean;
  estado: string;
  submenus: RES_SubmenuMenu[];
}
