import { Link } from "react-router-dom";
import { Skeleton, TextInput } from "@mantine/core";
import {
  XMarkIcon,
  ChevronRightIcon,
  HomeIcon,
  CubeIcon,
  ArrowRightEndOnRectangleIcon,
  MagnifyingGlassIcon,
  HashtagIcon,
} from "@heroicons/react/24/outline";
import { getIconoPorItem } from "../../../../shared/variables/iconos-menu-navegacion";
import type { RES_Submenu } from "../../../../service/responses/menu-navegacion";
import { useNavbar } from "../hooks/useNavbar";
import { motion, AnimatePresence } from "motion/react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
    },
  },
} as const;

interface NavbarProps {
  onClose: () => void;
}

export const Navbar = ({ onClose }: NavbarProps) => {
  const {
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
  } = useNavbar(onClose);

  const fieldClasses = {
    input:
      "bg-white/5 border-white/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 text-white placeholder:text-zinc-500 transition-all text-xs rounded-xl pr-8",
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm 
        transition-opacity duration-300 ${isClosing ? "opacity-0 pointer-events-none" : "animate-fadeIn"}`}
      onClick={handleClose}
    >
      <nav
        className={`absolute left-4 top-4 bottom-4 w-87.5 max-w-[85vw] 
          bg-zinc-950/80 backdrop-blur-3xl rounded-4xl border border-white/10 
          shadow-[0_0_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden 
          ring-1 ring-white/5 flex flex-col transition-all duration-300 ${
            isClosing ? "opacity-0 -translate-x-[110%]" : "animate-slideInLeft"
          }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con gradiente sutil y toggle de búsqueda animado */}
        <div
          className="relative flex items-center justify-between px-6 py-4 border-b 
            border-white/5 bg-linear-to-b from-white/5 to-transparent shrink-0 h-17"
        >
          <AnimatePresence mode="wait">
            {!isSearchOpen ? (
              /* ESTADO REPOSO: NAVEGACIÓN + LUPA AL LADO */
              <motion.div
                key="header-title"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3"
              >
                <div
                  className="w-2 h-2 rounded-full bg-blue-500 
                  shadow-[0_0_12px_rgba(59,130,246,0.8)] animate-pulse"
                />
                <span className="font-bold text-white text-[15px] tracking-wide">
                  NAVEGACIÓN
                </span>

                <button
                  onClick={handleOpenSearch}
                  className="p-1.5  text-zinc-400 hover:text-white hover:bg-white/10 
                    rounded-xl transition-all duration-200 group flex items-center gap-1"
                  title="Buscar módulo"
                >
                  <MagnifyingGlassIcon className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                </button>
              </motion.div>
            ) : (
              /* ESTADO BÚSQUEDA: ANIMACIÓN QUE OCULTA "NAVEGACIÓN" Y DESPLIEGA EL INPUT CON FOCUS AUTO */
              <motion.div
                key="header-search"
                initial={{ opacity: 0, width: "0%", x: -10 }}
                animate={{ opacity: 1, width: "100%", x: 0 }}
                exit={{ opacity: 0, width: "0%", x: -10 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="flex items-center gap-2 flex-1 mr-3 overflow-hidden"
              >
                <div className="relative w-full">
                  <TextInput
                    autoFocus
                    ref={inputRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        if (searchQuery) {
                          handleClearSearch();
                        } else {
                          handleCloseSearch();
                        }
                      }
                    }}
                    placeholder="Buscar módulo..."
                    size="xs"
                    radius="lg"
                    classNames={fieldClasses}
                    leftSection={
                      <MagnifyingGlassIcon className="w-3.5 h-3.5 text-blue-400" />
                    }
                    rightSection={
                      searchQuery ? (
                        <button
                          onClick={handleClearSearch}
                          className="p-1 text-zinc-500 hover:text-white transition-colors"
                        >
                          <XMarkIcon className="w-3.5 h-3.5" />
                        </button>
                      ) : null
                    }
                  />
                </div>
                <button
                  onClick={handleCloseSearch}
                  className="p-1.5 text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors shrink-0"
                  title="Cancelar búsqueda"
                >
                  Cancelar
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleClose}
            className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 
              rounded-xl transition-all duration-300 group shrink-0 text-xs"
            aria-label="Cerrar menú"
          >
            <XMarkIcon
              className="w-5 h-5 group-hover:rotate-90 transition-transform 
              duration-300"
            />
          </button>
        </div>

        {/* Menu Items / Resultados de Búsqueda */}
        <div
          className="p-4 space-y-2 overflow-y-auto h-[calc(100%-68px)] 
            custom-scrollbar"
        >
          {isSearchOpen || searchQuery.trim() ? (
            /* Vista de Resultados de Búsqueda (Fuzzy + Tags) */
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2 text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                <span>Resultados ({searchResults.length})</span>
                <span className="text-zinc-600">Búsqueda inteligente</span>
              </div>

              {!searchQuery.trim() ? (
                <div className="py-8 text-center space-y-2 px-4">
                  <div className="w-9 h-9 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                    <MagnifyingGlassIcon className="w-4 h-4 animate-pulse" />
                  </div>
                  <p className="text-xs text-zinc-400">
                    Empieza a escribir para encontrar módulos por nombre o
                    palabras clave...
                  </p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-8 text-center space-y-3 px-4">
                  <div className="w-10 h-10 mx-auto rounded-full bg-white/5 flex items-center justify-center text-zinc-500 border border-white/5">
                    <MagnifyingGlassIcon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-zinc-300">
                      No se encontraron módulos
                    </p>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Prueba con términos como &quot;insumos&quot;,
                      &quot;proveedores&quot;, &quot;despacho&quot; o
                      &quot;asistencia&quot;.
                    </p>
                  </div>
                </div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-1.5"
                >
                  {searchResults.map((res) => {
                    const modulo = res.item;
                    const ModuloIcon =
                      getIconoPorItem(modulo) || CubeIcon;

                    const moduloUrl = modulo.url || `/${modulo.path}`;
                    const isCurrentRoute = location.pathname === moduloUrl;

                    return (
                      <motion.div
                        variants={itemVariants}
                        key={moduloUrl}
                      >
                        <Link
                          to={moduloUrl}
                          onClick={handleClose}
                          className={`group flex flex-col p-3 rounded-2xl border transition-all duration-200 ${
                            isCurrentRoute
                              ? "bg-blue-500/10 border-blue-500/30 text-white shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                              : "bg-white/3 border-white/5 hover:bg-white/8 hover:border-white/10 text-zinc-300"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <div
                                className={`p-1.5 rounded-xl shrink-0 transition-colors ${
                                  isCurrentRoute
                                    ? "bg-blue-500/20 text-blue-400"
                                    : "bg-white/5 text-zinc-400 group-hover:text-blue-400 group-hover:bg-white/10"
                                }`}
                              >
                                <ModuloIcon className="w-4 h-4" />
                              </div>
                              <span className="text-sm font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis">
                                {modulo.nombre}
                              </span>
                            </div>
                            <ChevronRightIcon className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white transition-colors shrink-0" />
                          </div>

                          {/* Breadcrumb del Módulo */}
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500 pl-8">
                            <span className="truncate">
                              {modulo.menu_nombre}
                            </span>
                            <span>/</span>
                            <span className="truncate text-zinc-400 font-medium">
                              {modulo.submenu_nombre}
                            </span>
                          </div>

                          {/* Previsualización discreta de Tags en coincidencias */}
                          {modulo.tags && modulo.tags.length > 0 && (
                            <div className="mt-2 pl-8 flex items-center gap-1 flex-wrap">
                              {modulo.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded-md bg-white/4 text-zinc-400 border border-white/5"
                                >
                                  <HashtagIcon className="w-2.5 h-2.5 opacity-60" />
                                  {tag}
                                </span>
                              ))}
                              {modulo.tags.length > 3 && (
                                <span className="text-[10px] text-zinc-600">
                                  +{modulo.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </Link>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </div>
          ) : (
            /* Vista Normal de Navegación */
            <>
              {/* Home */}
              <Link
                to="/home"
                onClick={handleClose}
                className={`group w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl 
                  transition-all duration-300 relative ${
                    location.pathname === "/home"
                      ? "bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)] ring-1 ring-white/20"
                      : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
                  }`}
              >
                <HomeIcon
                  className={`w-4 h-4 transition-colors ${
                    location.pathname === "/home"
                      ? "text-blue-400"
                      : "group-hover:text-blue-400"
                  }`}
                />
                <span className="text-sm font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
                  Inicio
                </span>
              </Link>

              <div className="h-px bg-white/5 mx-2 my-4" />

              {/* Renderizar menu de navegacion o esqueletos de carga */}
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="skeleton"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4 px-2"
                  >
                    {[...Array(5)].map((_, i) => (
                      <Skeleton
                        key={i}
                        height={40}
                        radius="xl"
                        animate
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.03)",
                        }}
                      />
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-2"
                  >
                    {Array.isArray(menu) &&
                      menu.map((menuItem) => {
                        const MenuIcon =
                          getIconoPorItem(menuItem) || CubeIcon;
                        const isMenuExpanded = expanded === menuItem.nombre;
                        const menuUrl = menuItem.path
                          ? `/${menuItem.path}`
                          : "";
                        const isMenuActive =
                          !!menuUrl &&
                          (location.pathname === menuUrl ||
                            location.pathname.startsWith(`${menuUrl}/`));

                        // Hoja: ruta directa (sin hijos) -> Link
                        if (!menuItem.es_desplegable) {
                          return (
                            <motion.div
                              variants={itemVariants}
                              key={menuItem.id_menu || menuItem.nombre}
                              className="space-y-1"
                            >
                              <Link
                                to={menuUrl}
                                onClick={handleClose}
                                className={`group w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 ${
                                  isMenuActive
                                    ? "bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)] ring-1 ring-white/20"
                                    : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <MenuIcon
                                    className={`w-4 h-4 transition-colors ${
                                      isMenuActive
                                        ? "text-blue-400"
                                        : "group-hover:text-blue-400"
                                    }`}
                                  />
                                  <span className="text-sm font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
                                    {menuItem.nombre || "Sin nombre"}
                                  </span>
                                </div>
                                <ArrowRightEndOnRectangleIcon className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors shrink-0" />
                              </Link>
                            </motion.div>
                          );
                        }

                        // Contenedor: tiene hijos -> botón expandible
                        return (
                          <motion.div
                            variants={itemVariants}
                            key={menuItem.id_menu || menuItem.nombre}
                            className="space-y-1"
                          >
                            <button
                              onClick={() => {
                                setExpanded(
                                  isMenuExpanded ? null : menuItem.nombre,
                                );
                                setExpandedSub(null);
                              }}
                              className={`group w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 ${
                                isMenuExpanded
                                  ? "bg-white/5 text-white ring-1 ring-white/10"
                                  : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <MenuIcon
                                  className={`w-4 h-4 transition-colors ${
                                    isMenuExpanded
                                      ? "text-blue-400"
                                      : "group-hover:text-blue-400"
                                  }`}
                                />
                                <span className="text-sm font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
                                  {menuItem.nombre || "Sin nombre"}
                                </span>
                              </div>
                              <ChevronRightIcon
                                className={`w-4 h-4 transition-all duration-300 ${
                                  isMenuExpanded
                                    ? "rotate-90 text-blue-400"
                                    : "text-zinc-500"
                                }`}
                              />
                            </button>

                            {/* Submenus (Nivel 2) */}
                            <div
                              className={`grid transition-all duration-200 ease-in-out ${
                                isMenuExpanded &&
                                Array.isArray(menuItem.submenus) &&
                                menuItem.submenus.length > 0
                                  ? "grid-rows-[1fr] opacity-100 mt-1"
                                  : "grid-rows-[0fr] opacity-0 mt-0"
                              }`}
                            >
                              <div className="overflow-hidden">
                                <div className="ml-4 pl-3 border-l border-white/5 space-y-1">
                                  {Array.isArray(menuItem.submenus) &&
                                    menuItem.submenus.map(
                                      (submenu: RES_Submenu) => {
                                        const SubmenuIcon =
                                          getIconoPorItem(submenu) ||
                                          CubeIcon;
                                        const isSubmenuExpanded =
                                          expandedSub === submenu.nombre;
                                        const submenuUrl = submenu.path
                                          ? `/${submenu.path}`
                                          : "";
                                        const isSubmenuActive =
                                          !!submenuUrl &&
                                          (location.pathname === submenuUrl ||
                                            location.pathname.startsWith(
                                              `${submenuUrl}/`,
                                            ));

                                        // Hoja: ruta directa (sin hijos) -> Link
                                        if (!submenu.es_desplegable) {
                                          return (
                                            <div
                                              key={
                                                submenu.id_submenu ||
                                                submenu.nombre
                                              }
                                              className="space-y-1"
                                            >
                                              <Link
                                                to={submenuUrl}
                                                onClick={handleClose}
                                                className={`group w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-300 ${
                                                  isSubmenuActive
                                                    ? "text-blue-400 bg-blue-400/10 font-medium"
                                                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/2"
                                                }`}
                                              >
                                                <div className="flex items-center gap-2.5 overflow-hidden">
                                                  <SubmenuIcon
                                                    className={`w-3.5 h-3.5 shrink-0 ${
                                                      isSubmenuActive
                                                        ? "text-blue-400"
                                                        : "group-hover:text-blue-400/70"
                                                    }`}
                                                  />
                                                  <span className="text-[13px] font-medium tracking-wide whitespace-nowrap overflow-hidden text-ellipsis">
                                                    {submenu.nombre ||
                                                      "Sin nombre"}
                                                  </span>
                                                </div>
                                                {submenu.path && (
                                                  <ArrowRightEndOnRectangleIcon
                                                    className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                                                      isSubmenuActive
                                                        ? "text-blue-400"
                                                        : "text-zinc-500 group-hover:text-white"
                                                    }`}
                                                  />
                                                )}
                                              </Link>
                                            </div>
                                          );
                                        }

                                        // Contenedor: tiene hijos -> botón expandible
                                        return (
                                          <div
                                            key={
                                              submenu.id_submenu ||
                                              submenu.nombre
                                            }
                                            className="space-y-1"
                                          >
                                            <button
                                              onClick={() =>
                                                setExpandedSub(
                                                  isSubmenuExpanded
                                                    ? null
                                                    : submenu.nombre,
                                                )
                                              }
                                              className={`w-full flex items-center justify-between group px-3 py-2 rounded-xl transition-all duration-300 ${
                                                isSubmenuExpanded
                                                  ? "text-zinc-200 bg-white/5"
                                                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/2"
                                              }`}
                                            >
                                              <div className="flex items-center gap-2.5 overflow-hidden">
                                                <SubmenuIcon
                                                  className={`w-3.5 h-3.5 shrink-0 ${
                                                    isSubmenuExpanded
                                                      ? "text-blue-400/70"
                                                      : "group-hover:text-blue-400/70"
                                                  }`}
                                                />
                                                <span className="text-[13px] font-medium tracking-wide whitespace-nowrap overflow-hidden text-ellipsis">
                                                  {submenu.nombre ||
                                                    "Sin nombre"}
                                                </span>
                                              </div>
                                              <ChevronRightIcon
                                                className={`w-3.5 h-3.5 transition-all duration-300 ${
                                                  isSubmenuExpanded
                                                    ? "rotate-90 text-blue-400/70"
                                                    : "text-zinc-500"
                                                }`}
                                              />
                                            </button>

                                            {/* Módulos (Nivel 3 - Final) */}
                                            <div
                                              className={`grid transition-all duration-300 ease-in-out ${
                                                isSubmenuExpanded &&
                                                Array.isArray(
                                                  submenu.modulos,
                                                ) &&
                                                submenu.modulos.length > 0
                                                  ? "grid-rows-[1fr] opacity-100 py-1"
                                                  : "grid-rows-[0fr] opacity-0 py-0"
                                              }`}
                                            >
                                              <div className="overflow-hidden">
                                                <div className="ml-2 pl-4 border-l border-white/5 space-y-1">
                                                  {Array.isArray(
                                                    submenu.modulos,
                                                  ) &&
                                                    submenu.modulos.map(
                                                      (modulo) => {
                                                        const moduloUrl = `/${modulo.path}`;
                                                        const isModuloActive =
                                                          location.pathname === moduloUrl ||
                                                          location.pathname.startsWith(`${moduloUrl}/`);
                                                        return (
                                                          <Link
                                                            key={
                                                              modulo.id_modulo ||
                                                              modulo.nombre
                                                            }
                                                            to={moduloUrl}
                                                            onClick={
                                                              handleClose
                                                            }
                                                            className={`flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-lg transition-all duration-200 ${
                                                              isModuloActive
                                                                ? "text-blue-400 bg-blue-400/10 font-medium"
                                                                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                                                            }`}
                                                          >
                                                            <ArrowRightEndOnRectangleIcon
                                                              className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                                                                isModuloActive
                                                                  ? "text-blue-400"
                                                                  : "text-zinc-500"
                                                              }`}
                                                            />
                                                            <span className="text-sm whitespace-nowrap overflow-hidden text-ellipsis block">
                                                              {modulo.nombre ||
                                                                "Sin nombre"}
                                                            </span>
                                                          </Link>
                                                        );
                                                      },
                                                    )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      },
                                    )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </nav>
    </div>
  );
};
