import { useTitlePage } from "../../../hooks/useTitlePage";
import { useCategorias } from "./useCategorias";
import { useRegistroCategoria } from "./useRegistroCategoria";

export const useCategoriasPage = () => {
  useTitlePage("Categorías");

  const {
    loading,
    busqueda,
    setBusqueda,
    filtroClasificacion,
    setFiltroClasificacion,
    filtroDestino,
    setFiltroDestino,
    filtroEstado,
    setFiltroEstado,
    categoriasFiltradas,
    openedCreate,
    openCreate,
    closeCreate,
    openedEdit,
    openedCambios,
    openCambios,
    closeCambios,
    categoriaEnEdicion,
    abrirModalEdicion,
    cerrarModalEdicion,
    eliminarCategoria,
    eliminandoId,
    onCategoriaGuardada,
    categorias,
    recargar,
  } = useCategorias();

  const registro = useRegistroCategoria({
    categoriasExistentes: categorias,
    onSuccess: onCategoriaGuardada,
    onClose: closeCreate,
  });

  /**
   * Instancia separada del hook para la edición. Se mantiene aparte del de
   * registro para que ambos formularios no compartan estado (y así el modal
   * de "Nueva Categoría" no aparezca pre-rellenado con lo último editado).
   */
  const edicion = useRegistroCategoria({
    categoriasExistentes: categorias,
    onSuccess: onCategoriaGuardada,
    onClose: cerrarModalEdicion,
    categoriaEdicion: categoriaEnEdicion,
  });

  return {
    // useCategorias
    loading,
    busqueda,
    setBusqueda,
    filtroClasificacion,
    setFiltroClasificacion,
    filtroDestino,
    setFiltroDestino,
    filtroEstado,
    setFiltroEstado,
    categoriasFiltradas,
    openedCreate,
    openCreate,
    closeCreate,
    openedEdit,
    openedCambios,
    openCambios,
    closeCambios,
    categoriaEnEdicion,
    abrirModalEdicion,
    cerrarModalEdicion,
    eliminarCategoria,
    eliminandoId,
    onCategoriaGuardada,
    categorias,
    recargar,

    // useRegistroCategoria
    registro,
    edicion,
  };
};
