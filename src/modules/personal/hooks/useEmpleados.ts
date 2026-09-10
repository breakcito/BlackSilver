import { useState, useCallback, useEffect, useMemo } from "react";
import { EmpleadosService } from "../service/empleados.service";
import type { RES_EmpleadoResumen } from "../service/empleados.responses";

import { useAuditoriaStore } from "../../../stores/auditoria.store";

export const useEmpleados = () => {
  const { en_modo_auditable } = useAuditoriaStore();
  const [empleados, setEmpleados] = useState<RES_EmpleadoResumen[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroArea, setFiltroArea] = useState<string | null>(null);
  const [filtroEmpresa, setFiltroEmpresa] = useState<string | null>(null);
  const [empleadoIndividual, setEmpleadoIndividual] = useState<RES_EmpleadoResumen | null>(null);
  const [idActualizandoFoto, setIdActualizandoFoto] = useState<number | null>(
    null,
  );
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
  const [empleadoEnEdicion, setEmpleadoEnEdicion] =
    useState<RES_EmpleadoResumen | null>(null);

  // Selección masiva (fotocheck)
  const [seleccionados, setSeleccionados] = useState<Set<number>>(
    new Set(),
  );
  const [modalFotocheckAbierto, setModalFotocheckAbierto] = useState(false);

  const listar = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await EmpleadosService.get_empleados();
      if (resp.success) setEmpleados(resp.data);
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
    let results = empleados;

    if (en_modo_auditable) {
      results = results.filter((e) => {
        if (!e.con_contrato || !e.id_contrato_vigente) {
          return false;
        }
        const tipo = e.tipo_contrato_vigente;
        return tipo === "Planilla" || tipo === "PeriodoPrueba";
      });
    }

    const query = busqueda.toLowerCase().trim();
    if (query) {
      results = results.filter(
        (e) =>
          e.nombre.toLowerCase().includes(query) ||
          e.apellido.toLowerCase().includes(query) ||
          e.dni?.includes(query) ||
          (e.cargo ?? "").toLowerCase().includes(query) ||
          (e.area ?? "").toLowerCase().includes(query),
      );
    }

    if (filtroArea) {
      results = results.filter((e) => e.area === filtroArea);
    }

    if (filtroEmpresa) {
      results = results.filter((e) => e.empresa === filtroEmpresa);
    }

    return results;
  }, [empleados, busqueda, filtroArea, filtroEmpresa, en_modo_auditable]);

  const areasUnicas = useMemo(() => {
    const set = new Set(empleados.map((e) => e.area).filter(Boolean));
    return Array.from(set) as string[];
  }, [empleados]);

  const empresasUnicas = useMemo(() => {
    const set = new Set(empleados.map((e) => e.empresa).filter(Boolean));
    return Array.from(set) as string[];
  }, [empleados]);

  const pushNuevoEmpleado = (nuevo: RES_EmpleadoResumen) => {
    setEmpleados((prev) => [nuevo, ...prev]);
  };

  const actualizarEmpleadoEnLista = (editado: RES_EmpleadoResumen) => {
    setEmpleados((prev) =>
      prev.map((e) => (e.id_empleado === editado.id_empleado ? editado : e)),
    );
  };

  const actualizarFoto = async (idEmpleado: number, file: File) => {
    setIdActualizandoFoto(idEmpleado);
    try {
      const resp = await EmpleadosService.actualizar_foto(idEmpleado, file);
      if (resp.success) {
        setEmpleados((prev) =>
          prev.map((e) =>
            e.id_empleado === idEmpleado ? { ...e, url_foto: resp.data } : e,
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

  const abrirModalContrato = (idEmpleado: number, nombre: string) => {
    setModalContratoEmpleado({
      abierto: true,
      idEmpleado,
      nombre,
    });
  };

  const cerrarModalContrato = () => {
    setModalContratoEmpleado(null);
  };

  const abrirModalHistorial = (idEmpleado: number, nombre: string) => {
    setModalHistorialContratos({ abierto: true, idEmpleado, nombre });
  };

  const cerrarModalHistorial = () => {
    setModalHistorialContratos(null);
  };

  const abrirModalEdicion = (emp: RES_EmpleadoResumen) => {
    setEmpleadoEnEdicion(emp);
  };

  const cerrarModalEdicion = () => {
    setEmpleadoEnEdicion(null);
  };

  const onContratoCreado = async (
    payload?: { empleado?: import("../service/empleados.responses").RES_EmpleadoResumen },
  ) => {
    cerrarModalContrato();
    if (payload?.empleado) {
      // Update reactivo: el backend ya devuelve el empleado actualizado
      // (id_contrato_vigente + cargo del contrato). Sin refetch total.
      actualizarEmpleadoEnLista(payload.empleado);
      return;
    }
    // Fallback: si por alguna razón no llega el payload, refetch completo.
    await listar();
  };

  // Selección masiva para fotocheck
  const toggleSeleccion = useCallback((idEmpleado: number) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(idEmpleado)) next.delete(idEmpleado);
      else next.add(idEmpleado);
      return next;
    });
  }, []);

  const toggleSeleccionarTodos = useCallback(() => {
    setSeleccionados((prev) => {
      const visibles = filtrados.map((e) => e.id_empleado);
      const todosVisiblesSeleccionados = visibles.every((id) =>
        prev.has(id),
      );
      if (todosVisiblesSeleccionados) {
        // Deseleccionar solo los visibles
        const next = new Set(prev);
        visibles.forEach((id) => next.delete(id));
        return next;
      }
      // Seleccionar todos los visibles
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

  const abrirModalFotocheckIndividual = useCallback((emp: RES_EmpleadoResumen) => {
    setEmpleadoIndividual(emp);
    setModalFotocheckAbierto(true);
  }, []);

  const cerrarModalFotocheck = useCallback(() => {
    setModalFotocheckAbierto(false);
    setEmpleadoIndividual(null);
  }, []);

  // Empleados seleccionados como array (preserva el orden del listado filtrado).
  // En modo individual, busca el empleado actualizado en `empleados` (el array
  // reactivo) para reflejar cambios de foto sin recargar la página.
  const empleadosSeleccionados = useMemo(() => {
    if (empleadoIndividual) {
      const actualizado = empleados.find(
        (e) => e.id_empleado === empleadoIndividual.id_empleado,
      );
      return [actualizado ?? empleadoIndividual];
    }
    return filtrados.filter((e) => seleccionados.has(e.id_empleado));
  }, [filtrados, seleccionados, empleadoIndividual, empleados]);

  // Para el "todos seleccionados / indeterminado" del checkbox del header
  const todosVisiblesSeleccionados = useMemo(() => {
    if (filtrados.length === 0) return false;
    return filtrados.every((e) => seleccionados.has(e.id_empleado));
  }, [filtrados, seleccionados]);

  const algunosVisiblesSeleccionados = useMemo(() => {
    return filtrados.some((e) => seleccionados.has(e.id_empleado));
  }, [filtrados, seleccionados]);

  return {
    empleados: filtrados,
    loading,
    busqueda,
    setBusqueda,
    filtroArea,
    setFiltroArea,
    filtroEmpresa,
    setFiltroEmpresa,
    areasUnicas,
    empresasUnicas,
    recargar: () => listar(),
    pushNuevoEmpleado,
    actualizarFoto,
    actualizarEmpleadoEnLista,
    idActualizandoFoto,
    modalContratoEmpleado,
    abrirModalContrato,
    cerrarModalContrato,
    onContratoCreado,
    modalHistorialContratos,
    abrirModalHistorial,
    cerrarModalHistorial,

    // Modal de Edición
    empleadoEnEdicion,
    abrirModalEdicion,
    cerrarModalEdicion,

    // Habilitar / Deshabilitar contrato
    toggleConContrato: async (ids: number[], conContrato: boolean) => {
      try {
        const resp = await EmpleadosService.toggle_con_contrato(ids, conContrato);
        if (resp.success) {
          setEmpleados((prev) =>
            prev.map((e) =>
              ids.includes(e.id_empleado)
                ? { ...e, con_contrato: conContrato }
                : e,
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
    eliminarEmpleado: async (idEmpleado: number) => {
      try {
        const resp = await EmpleadosService.eliminar_empleado(idEmpleado);
        if (resp.success) {
          setEmpleados((prev) =>
            prev.filter((e) => e.id_empleado !== idEmpleado),
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
    empleadosSeleccionados,
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
