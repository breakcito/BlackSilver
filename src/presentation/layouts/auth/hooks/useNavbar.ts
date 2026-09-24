import { useState, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useMenuNav } from "../../../../hooks/useMenuNav";
import type {
  RES_Submenu,
  RES_Modulo,
} from "../../../../service/responses/menu-navegacion";
import { getCoincidencias, type SearchResult } from "../../../../shared/functions/get-coincidencias";
import { getTagsParaModulo } from "../../../../shared/variables/tags-modulos";

export interface SearchableModuloItem {
  id_modulo: number;
  nombre: string;
  url: string;
  path: string;
  menu_nombre: string;
  submenu_nombre: string;
  tags: string[];
  tags_string: string;
}

const normalizeQuery = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const getRelevanceScore = (item: SearchableModuloItem, q: string): number => {
  const name = normalizeQuery(item.nombre);
  if (name === q) return 0;
  if (name.startsWith(q)) return 10;
  const words = name.split(/\s+/);
  if (words.some((w) => w.startsWith(q))) return 20;
  if (name.includes(q)) return 30;

  const tags = normalizeQuery(item.tags_string);
  const tagWords = tags.split(/\s+/);
  if (tagWords.some((w) => w.startsWith(q))) return 40;
  if (tags.includes(q)) return 50;

  const sub = normalizeQuery(item.submenu_nombre);
  if (sub.startsWith(q)) return 60;
  if (sub.includes(q)) return 70;

  const menu = normalizeQuery(item.menu_nombre);
  if (menu.startsWith(q)) return 80;
  if (menu.includes(q)) return 90;

  return 100;
};

// Hook principal de la barra de navegación
export const useNavbar = (onClose: () => void) => {
  const location = useLocation();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);
  const [syncedPath, setSyncedPath] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { menu, loading } = useMenuNav();

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 280);
  };

  const handleOpenSearch = () => {
    setIsSearchOpen(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery("");
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    inputRef.current?.focus();
  };

  // Sincronizar expansión con la ruta actual durante el renderizado (evita cascading renders en useEffect)
  if (
    location.pathname !== syncedPath &&
    !loading &&
    Array.isArray(menu) &&
    menu.length > 0
  ) {
    let foundModName: string | null = null;
    let foundSubName: string | null = null;

    for (const mod of menu) {
      // 1. Menú de nivel 1 directo (hoja, ej: Compra de Carbón)
      if (
        !mod.es_desplegable &&
        mod.path &&
        (location.pathname === `/${mod.path}` ||
          location.pathname.startsWith(`/${mod.path}/`))
      ) {
        foundModName = mod.nombre;
        foundSubName = null;
        break;
      }

      if (!Array.isArray(mod.submenus)) continue;

      // 2. Submenú activo (directo o con módulos hijos)
      const activeSub = mod.submenus.find(
        (sub: RES_Submenu) =>
          (sub.path &&
            (location.pathname === `/${sub.path}` ||
              location.pathname.startsWith(`/${sub.path}/`))) ||
          (Array.isArray(sub.modulos) &&
            sub.modulos.some(
              (sec: RES_Modulo) =>
                location.pathname === `/${sec.path}` ||
                location.pathname.startsWith(`/${sec.path}/`),
            )),
      );

      if (activeSub) {
        foundModName = mod.nombre;
        foundSubName = activeSub.nombre;
        break;
      }
    }

    setSyncedPath(location.pathname);
    if (foundModName) {
      setExpanded(foundModName);
      setExpandedSub(foundSubName);
    }
  }

  // Aplanar el menú para búsqueda omnidireccional
  const searchableItems: SearchableModuloItem[] = useMemo(() => {
    if (!Array.isArray(menu)) return [];
    const list: SearchableModuloItem[] = [];

    menu.forEach((menuItem) => {
      // Menú directo nivel 1
      if (!menuItem.es_desplegable && menuItem.path) {
        const autoTags = getTagsParaModulo(
          menuItem.path || menuItem.nombre || "",
        );
        list.push({
          id_modulo: menuItem.id_menu,
          nombre: menuItem.nombre,
          url: `/${menuItem.path}`,
          path: menuItem.path,
          menu_nombre: menuItem.nombre,
          submenu_nombre: menuItem.nombre,
          tags: autoTags,
          tags_string: autoTags.join(" "),
        });
      }

      if (!Array.isArray(menuItem.submenus)) return;
      menuItem.submenus.forEach((submenu) => {
        // Submenú directo nivel 2 (hoja)
        if (!submenu.es_desplegable && submenu.path) {
          const autoTags = getTagsParaModulo(
            submenu.path || submenu.nombre || "",
          );
          list.push({
            id_modulo: submenu.id_submenu,
            nombre: submenu.nombre,
            url: `/${submenu.path}`,
            path: submenu.path,
            menu_nombre: menuItem.nombre,
            submenu_nombre: submenu.nombre,
            tags: autoTags,
            tags_string: autoTags.join(" "),
          });
        }

        if (!Array.isArray(submenu.modulos)) return;
        submenu.modulos.forEach((mod) => {
          const autoTags = getTagsParaModulo(
            mod.path || mod.nombre || "",
            mod.tags,
          );
          list.push({
            id_modulo: mod.id_modulo,
            nombre: mod.nombre,
            url: `/${mod.path}`,
            path: mod.path,
            menu_nombre: menuItem.nombre,
            submenu_nombre: submenu.nombre,
            tags: autoTags,
            tags_string: autoTags.join(" "),
          });
        });
      });
    });

    return list;
  }, [menu]);

  // Ejecutar búsqueda difusa (Fuzzy + FlexSearch) con getCoincidencias ordenada por relevancia
  const searchResults: SearchResult<SearchableModuloItem>[] = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return [];
    const results = getCoincidencias(searchableItems, q, {
      keys: ["nombre", "submenu_nombre", "menu_nombre", "tags_string"],
      useNormalization: true,
      fuseThreshold: 0.4,
    });

    const normQ = normalizeQuery(q);
    return [...results].sort((a, b) => {
      const scoreA = getRelevanceScore(a.item, normQ);
      const scoreB = getRelevanceScore(b.item, normQ);
      if (scoreA !== scoreB) {
        return scoreA - scoreB;
      }
      return a.index - b.index;
    });
  }, [searchableItems, searchQuery]);

  return {
    location,
    expanded,
    setExpanded,
    expandedSub,
    setExpandedSub,
    isClosing,
    menu,
    loading,
    handleClose,
    searchQuery,
    setSearchQuery,
    searchResults,
    handleClearSearch,
    isSearchOpen,
    handleOpenSearch,
    handleCloseSearch,
    inputRef,
  };
};
