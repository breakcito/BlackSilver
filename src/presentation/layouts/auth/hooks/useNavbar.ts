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
      if (!Array.isArray(mod.submenus)) continue;

      const activeSub = mod.submenus.find(
        (sub: RES_Submenu) =>
          Array.isArray(sub.modulos) &&
          sub.modulos.some(
            (sec: RES_Modulo) =>
              location.pathname === `/${sec.path}` ||
              location.pathname.startsWith(`/${sec.path}/`),
          ),
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
      if (!Array.isArray(menuItem.submenus)) return;
      menuItem.submenus.forEach((submenu) => {
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

  // Ejecutar búsqueda difusa (Fuzzy + FlexSearch) con getCoincidencias
  const searchResults: SearchResult<SearchableModuloItem>[] = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return getCoincidencias(searchableItems, searchQuery, {
      keys: ["nombre", "submenu_nombre", "menu_nombre", "tags_string"],
      useNormalization: true,
      fuseThreshold: 0.4,
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
