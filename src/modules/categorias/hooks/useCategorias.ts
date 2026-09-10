import { useState, useEffect, useMemo, useCallback } from "react";
import { useDisclosure } from "@mantine/hooks";
import { useNotify } from "../../../hooks/useNotify";
import { CategoriasService } from "../service/categorias.service";
import type { RES_CategoriaResumen } from "../service/categorias.responses";
import { useAuditoriaStore } from "../../../stores/auditoria.store";

export const useCategorias = () => {
  const { notify } = useNotify();

  // Estados de la lista
  const [categorias, setCategorias] = useState<RES_CategoriaResumen[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroClasificacion, setFiltroClasificacion] = useState<string | null>(null);
  const [filtroDestino, setFiltroDestino] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null);

  // Modales
  const [openedCreate, { open: openCreate, close: closeCreate }] =
    useDisclosure(false);
  const [openedEdit, { open: openEdit, close: closeEdit }] =
    useDisclosure(false);
  const [openedCambios, { open: openCambios, close: closeCambios }] =
    useDisclosure(false);

  // Edición / eliminación
  const [categoriaEnEdicion, setCategoriaEnEdicion] =
    useState<RES_CategoriaResumen | null>(null);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);

  const listar = useCallback(async () => {
    setLoading(true);
    try {
      const result = await CategoriasService.get_categorias();
      if (result.success) {
        setCategorias(result.data);
      } else {
        notify({ type: "error", content: result.message });
      }
    } catch (error) {
      notify({ type: "error", content: "Error al cargar las categorías" });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    listar();
  }, [listar]);

  const { en_modo_auditable } = useAuditoriaStore();

  const categoriasFiltradas = useMemo(() => {
    const q = busqueda.toLowerCase();
    return categorias
      .filter((cat) => !(en_modo_auditable && cat.es_auditable)) // Filtro modo auditoría
      .filter((cat) => {
        // Filtro por búsqueda
        const matchesBusqueda =
          !q ||
          cat.nombre.toLowerCase().includes(q) ||
          (cat.descripcion || "").toLowerCase().includes(q);

        // Filtro por clasificación
        let matchesClasif = true;
        if (filtroClasificacion) {
          if (filtroClasificacion === "Servicio") {
            matchesClasif = cat.tipo_producto === "Servicio";
          } else {
            matchesClasif =
              cat.clasificacion_bien === filtroClasificacion &&
              cat.tipo_producto === "Bien";
          }
        }

        // Filtro por destino de uso
        let matchesDestino = true;
        if (filtroDestino === "Mina") {
          matchesDestino = !!cat.para_mina;
        } else if (filtroDestino === "Cocina") {
          matchesDestino = !!cat.para_cocina;
        }

        // Filtro por estado
        let matchesEstado = true;
        if (filtroEstado) {
          matchesEstado = cat.estado === filtroEstado;
        }

        return matchesBusqueda && matchesClasif && matchesDestino && matchesEstado;
      });
  }, [
    categorias,
    busqueda,
    en_modo_auditable,
    filtroClasificacion,
    filtroDestino,
    filtroEstado,
  ]);

  const onCategoriaGuardada = (nueva: RES_CategoriaResumen) => {
    setCategorias((prev) => {
      const index = prev.findIndex(
        (c) => c.id_categoria === nueva.id_categoria,
      );
      if (index !== -1) {
        const actualizadas = [...prev];
        actualizadas[index] = nueva;
        return actualizadas;
      }
      return [nueva, ...prev];
    });
  };

  const abrirModalEdicion = useCallback(
    (categoria: RES_CategoriaResumen) => {
      setCategoriaEnEdicion(categoria);
      openEdit();
    },
    [openEdit],
  );

  const cerrarModalEdicion = useCallback(() => {
    setCategoriaEnEdicion(null);
    closeEdit();
  }, [closeEdit]);

  /**
   * Solicita la eliminación lógica al backend y retira la fila de la lista.
   * El backend devuelve la categoría ya Inactiva, pero como el listado filtra
   * las inactivas, el efecto visible es el mismo: desaparece.
   */
  const eliminarCategoria = useCallback(
    async (id_categoria: number): Promise<boolean> => {
      if (
        !window.confirm(
          "¿Está seguro de eliminar esta categoría? Esta acción la desactivará del catálogo.",
        )
      ) {
        return false;
      }

      setEliminandoId(id_categoria);
      try {
        const resp = await CategoriasService.eliminar_categoria(id_categoria);
        if (resp.success) {
          notify({ type: "success", content: resp.message });
          setCategorias((prev) =>
            prev.filter((c) => c.id_categoria !== id_categoria),
          );
          return true;
        }
        notify({ type: "error", content: resp.message });
        return false;
      } catch (error) {
        console.error(error);
        notify({ type: "error", content: "Error inesperado al eliminar" });
        return false;
      } finally {
        setEliminandoId(null);
      }
    },
    [notify],
  );

  return {
    categorias,
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

    // Modales
    openedCreate,
    openCreate,
    closeCreate,
    openedEdit,
    openedCambios,
    openCambios,
    closeCambios,

    // Edición
    categoriaEnEdicion,
    abrirModalEdicion,
    cerrarModalEdicion,

    // Eliminación
    eliminarCategoria,
    eliminandoId,

    // Handlers
    onCategoriaGuardada,
    recargar: listar,
  };
};
