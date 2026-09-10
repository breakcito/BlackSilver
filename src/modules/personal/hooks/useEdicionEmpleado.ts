import { useState, useCallback, useEffect, useMemo } from "react";
import { useNotify } from "../../../hooks/useNotify";
import { EmpleadosService } from "../service/empleados.service";
import { AuxService } from "../../../service/auxiliar.service";
import {
  Schema_ActualizarEmpleado,
  type DTO_ActualizarEmpleado,
} from "../service/empleados.requests";
import type { RES_EmpleadoResumen } from "../service/empleados.responses";
import type {
  RES_Area,
  RES_Cargo,
} from "../../../service/responses/organigrama";
import type { RES_Empresa } from "../../../service/responses/empresa";

/**
 * Hook orquestador para la edición de un empleado.
 *
 *  - Carga catálogos de áreas, cargos y empresas (solo si el
 *    empleado NO tiene contrato vigente y se mostrarán esos campos).
 *  - Pre-rellena el form con el registro recibido.
 *  - submit: valida con Zod (Schema_ActualizarEmpleado) y delega
 *    al service. Si el usuario eligió una foto nueva, hace un
 *    `actualizar_foto` adicional después del PUT exitoso.
 */
export const useEdicionEmpleado = (
  empleado: RES_EmpleadoResumen,
  onSuccess: (editado: RES_EmpleadoResumen) => void,
) => {
  const { notify } = useNotify();
  const tieneContratoVigente =
    Boolean(empleado.con_contrato) && empleado.id_contrato_vigente !== null;

  const [form, setForm] = useState<DTO_ActualizarEmpleado>({
    nombre: empleado.nombre ?? "",
    apellido: empleado.apellido ?? "",
    genero: (empleado.genero as DTO_ActualizarEmpleado["genero"]) ?? null,
    dni: empleado.dni ?? "",
    fecha_nacimiento: empleado.fecha_nacimiento ?? "",
    direccion: empleado.direccion ?? "",
    telefono: empleado.telefono ?? "",
    email: empleado.email ?? "",
    id_cargo: empleado.id_cargo ?? null,
    id_empresa: empleado.id_empresa ?? null,
  });

  const [idArea, setIdArea] = useState<number | null>(empleado.id_area ?? null);
  const [areas, setAreas] = useState<RES_Area[]>([]);
  const [todosCargos, setTodosCargos] = useState<RES_Cargo[]>([]);
  const [empresas, setEmpresas] = useState<RES_Empresa[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);
  const [fotoFile, setFotoFile] = useState<File | null>(null);

  const cargarCatalogos = useCallback(async () => {
    setLoadingCatalogos(true);
    try {
      const [areasRes, cargosRes, empresasRes] = await Promise.all([
        AuxService.get_areas().catch(() => ({ success: false, data: [] })),
        AuxService.get_cargos().catch(() => ({ success: false, data: [] })),
        AuxService.get_empresas().catch(() => ({ success: false, data: [] })),
      ]);
      if (areasRes.success) setAreas(areasRes.data as RES_Area[]);
      if (cargosRes.success) setTodosCargos(cargosRes.data as RES_Cargo[]);
      if (empresasRes.success) setEmpresas(empresasRes.data as RES_Empresa[]);
    } finally {
      setLoadingCatalogos(false);
    }
  }, []);

  useEffect(() => {
    if (!tieneContratoVigente) {
      void cargarCatalogos();
    }
  }, [cargarCatalogos, tieneContratoVigente]);

  // En edicion NO filtramos por area: mostramos TODOS los cargos siempre.
  // Esto garantiza que el cargo actual del empleado SIEMPRE este presente
  // en el data del Select, sin depender de data inconsistency con id_area.
  const cargos = useMemo(() => {
    return todosCargos;
  }, [todosCargos]);

  const setField = <K extends keyof DTO_ActualizarEmpleado>(
    field: K,
    value: DTO_ActualizarEmpleado[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const setIdAreaConCargo = (value: number | null, keepCargo = false) => {
    setIdArea(value);
    if (!keepCargo) {
      setForm((prev) => ({ ...prev, id_cargo: null }));
    }
  };

  const handleFoto = (file: File | null) => {
    if (file && file.size > 2 * 1024 * 1024) {
      notify({
        type: "error",
        content: `La imagen "${file.name}" supera el límite máximo permitido.`,
      });
      return;
    }
    setFotoFile(file);
  };

  const submit = async () => {
    const validation = Schema_ActualizarEmpleado.safeParse(form);
    if (!validation.success) {
      notify({ type: "info", content: validation.error.issues[0].message });
      return;
    }

    setLoading(true);
    try {
      // Si tiene contrato vigente, omitir id_cargo/id_empresa del
      // payload (el backend los ignorará de todos modos, pero
      // evitamos mandar información que no aplica).
      const payload: DTO_ActualizarEmpleado = { ...validation.data };
      if (tieneContratoVigente) {
        payload.id_cargo = null;
        payload.id_empresa = null;
      }

      const resp = await EmpleadosService.actualizar_empleado(
        empleado.id_empleado,
        payload,
      );
      console.log("[EDICION_EMPLEADO] PUT response:", resp);
      if (!resp.success) {
        notify({ type: "error", content: resp.message });
        return;
      }

      // Si el usuario cambió la foto, subirla después del PUT.
      let urlFinal = resp.data.url_foto;
      if (fotoFile) {
        const fotoResp = await EmpleadosService.actualizar_foto(
          empleado.id_empleado,
          fotoFile,
        );
        if (fotoResp.success) {
          urlFinal = fotoResp.data;
        } else {
          notify({
            type: "info",
            content:
              "Datos actualizados, pero no se pudo actualizar la foto.",
          });
        }
      }

      notify({ type: "success", content: resp.message });
      onSuccess({ ...resp.data, url_foto: urlFinal });
    } catch (err) {
      console.error(err);
      notify({ type: "error", content: "Error inesperado" });
    } finally {
      setLoading(false);
    }
  };

  return {
    form,
    setField,
    idArea,
    setIdArea: setIdAreaConCargo,
    areas,
    cargos,
    empresas,
    loading,
    loadingCatalogos,
    tieneContratoVigente,
    fotoFile,
    handleFoto,
    submit,
  };
};
