import { useState, useCallback, useEffect, useMemo } from "react";
import { ContratistasService } from "../service/empleados.service";
import type { RES_ContratistaResumen } from "../service/empleados.responses";

import { useAuditoriaStore } from "../../../stores/auditoria.store";

export const useContratistas = () => {
  const { en_modo_auditable } = useAuditoriaStore();
  const [idMina, setIdMina] = useState<number | null>(null);
  const [contratistas, setContratistas] = useState<RES_ContratistaResumen[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [idActualizandoFoto, setIdActualizandoFoto] = useState<number | null>(
    null,
  );
  // Selección masiva (fotocheck)
  const [seleccionados, setSeleccionados] = useState<Set<number>>(
    new Set(),
  );
  const [modalFotocheckAbierto, setModalFotocheckAbierto] = useState(false);

  const listar = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await ContratistasService.get_contratistas();
      if (resp.success) setContratistas(resp.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    listar();
  }, [listar]);

  const filtrados = useMemo(() => {
    let results = contratistas;

    if (en_modo_auditable) {
      results = results.filter((c) => {
        if (!c.con_contrato || !c.id_contrato_vigente) {
          return false;
        }
        const tipo = c.tipo_contrato_vigente;
        return tipo === "Planilla" || tipo === "PeriodoPrueba";
      });
    }

    // Filtro por Mina Local
    if (idMina) {
      results = results.filter((e) => e.id_mina === idMina);
    }

    // Filtro por Búsqueda Local
    const query = busqueda.toLowerCase().trim();
    if (query) {
      results = results.filter(
        (e) =>
          e.nombre.toLowerCase().includes(query) ||
          e.apellido.toLowerCase().includes(query) ||
          e.dni?.includes(query),
      );
    }

    return results;
  }, [contratistas, idMina, busqueda, en_modo_auditable]);

  const pushNuevoContratista = (nuevo: RES_ContratistaResumen) => {
    setContratistas((prev) => [nuevo, ...prev]);
  };

  const actualizarContratistaEnLista = useCallback(
    (editado: RES_ContratistaResumen) => {
      setContratistas((prev) =>
        prev.map((e) =>
          e.id_contratista === editado.id_contratista ? editado : e,
        ),
      );
    },
    [],
  );

  const actualizarFoto = async (idContratista: number, file: File) => {
    setIdActualizandoFoto(idContratista);
    try {
      const resp = await ContratistasService.actualizar_foto(
        idContratista,
        file,
      );
      if (resp.success) {
        setContratistas((prev) =>
          prev.map((e) =>
            e.id_contratista === idContratista
              ? { ...e, url_foto: resp.data }
              : e,
          ),
        );
        return true;
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIdActualizandoFoto(null);
    }
    return false;
  };

  // Selección masiva (fotocheck)
  const toggleSeleccion = useCallback((idContratista: number) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(idContratista)) next.delete(idContratista);
      else next.add(idContratista);
      return next;
    });
  }, []);

  const toggleSeleccionarTodos = useCallback(() => {
    setSeleccionados((prev) => {
      const visibles = filtrados.map((c) => c.id_contratista);
      const todosVisiblesSeleccionados = visibles.every((id) =>
        prev.has(id),
      );
      if (todosVisiblesSeleccionados) {
        const next = new Set(prev);
        visibles.forEach((id) => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      visibles.forEach((id) => next.add(id));
      return next;
    });
  }, [filtrados]);

  const limpiarSeleccion = useCallback(() => {
    setSeleccionados(new Set());
  }, []);

  const abrirModalFotocheck = useCallback(() => {
    if (seleccionados.size === 0) return;
    setModalFotocheckAbierto(true);
  }, [seleccionados.size]);

  const abrirModalFotocheckIndividual = useCallback(
    (c: RES_ContratistaResumen) => {
      setSeleccionados(new Set([c.id_contratista]));
      setModalFotocheckAbierto(true);
    },
    [],
  );

  const cerrarModalFotocheck = useCallback(() => {
    setModalFotocheckAbierto(false);
  }, []);

  // Lista de seleccionados como array (preserva el orden del listado filtrado)
  const contratistasSeleccionados = useMemo(
    () => filtrados.filter((c) => seleccionados.has(c.id_contratista)),
    [filtrados, seleccionados],
  );

  const todosVisiblesSeleccionados = useMemo(() => {
    if (filtrados.length === 0) return false;
    return filtrados.every((c) => seleccionados.has(c.id_contratista));
  }, [filtrados, seleccionados]);

  const algunosVisiblesSeleccionados = useMemo(
    () => filtrados.some((c) => seleccionados.has(c.id_contratista)),
    [filtrados, seleccionados],
  );

  const minasUnicas = useMemo(() => {
    const map = new Map<number, string>();
    contratistas.forEach((c) => {
      if (c.id_mina && c.mina) {
        map.set(c.id_mina, c.mina);
      }
    });
    return Array.from(map.entries()).map(([id, nombre]) => ({
      id_mina: id,
      nombre,
    }));
  }, [contratistas]);

  const [modalContratoEmpleado, setModalContratoEmpleado] = useState<{
    abierto: boolean;
    idEmpleado: number | null;
    nombre: string;
  } | null>(null);

  const [modalHistorialContratos, setModalHistorialContratos] = useState<{
    abierto: boolean;
    idEmpleado: number | null;
    nombre: string;
  } | null>(null);
  const [contratistaEnEdicion, setContratistaEnEdicion] =
    useState<RES_ContratistaResumen | null>(null);

  const abrirModalContrato = useCallback((id: number, nombre: string) => {
    setModalContratoEmpleado({ abierto: true, idEmpleado: id, nombre });
  }, []);

  const cerrarModalContrato = useCallback(() => {
    setModalContratoEmpleado(null);
  }, []);

  const abrirModalHistorial = useCallback((id: number, nombre: string) => {
    setModalHistorialContratos({ abierto: true, idEmpleado: id, nombre });
  }, []);

  const cerrarModalHistorial = useCallback(() => {
    setModalHistorialContratos(null);
  }, []);

  const abrirModalEdicion = useCallback(
    (c: RES_ContratistaResumen) => {
      setContratistaEnEdicion(c);
    },
    [],
  );

  const cerrarModalEdicion = useCallback(() => {
    setContratistaEnEdicion(null);
  }, []);

  const onContratoCreado = useCallback(
    (payload?: { empleado?: RES_ContratistaResumen }) => {
      cerrarModalContrato();
      if (payload?.empleado) {
        actualizarContratistaEnLista(payload.empleado);
        return;
      }
      void listar();
    },
    [cerrarModalContrato, actualizarContratistaEnLista, listar],
  );

  return {
    minas: minasUnicas,
    idMina,
    setIdMina,
    contratistas: filtrados,
    loading,
    busqueda,
    setBusqueda,
    recargar: () => listar(),
    pushNuevoContratista,
    actualizarFoto,
    actualizarContratistaEnLista,
    idActualizandoFoto,

    // Modales de Contrato
    modalContratoEmpleado,
    abrirModalContrato,
    cerrarModalContrato,
    onContratoCreado,
    modalHistorialContratos,
    abrirModalHistorial,
    cerrarModalHistorial,

    // Modal de Edición
    contratistaEnEdicion,
    abrirModalEdicion,
    cerrarModalEdicion,

    // Toggle con_contrato
    toggleConContrato: async (ids: number[], conContrato: boolean) => {
      try {
        const resp = await ContratistasService.toggle_con_contrato(ids, conContrato);
        if (resp.success) {
          setContratistas((prev) =>
            prev.map((c) =>
              ids.includes(c.id_contratista)
                ? { ...c, con_contrato: conContrato }
                : c,
            ),
          );
          setSeleccionados(new Set());
          return true;
        }
      } catch (err) {
        console.error(err);
      }
      return false;
    },

    // Eliminar (borrado logico: cambia estado a Inactivo)
    eliminarContratista: async (idContratista: number) => {
      try {
        const resp = await ContratistasService.eliminar_contratista(
          idContratista,
        );
        if (resp.success) {
          setContratistas((prev) =>
            prev.filter((c) => c.id_contratista !== idContratista),
          );
          return true;
        }
      } catch (err) {
        console.error(err);
      }
      return false;
    },

    // Selección masiva
    seleccionados,
    contratistasSeleccionados,
    toggleSeleccion,
    toggleSeleccionarTodos,
    limpiarSeleccion,
    todosVisiblesSeleccionados,
    algunosVisiblesSeleccionados,
    modalFotocheckAbierto,
    abrirModalFotocheck,
    abrirModalFotocheckIndividual,
    cerrarModalFotocheck,
  };
};