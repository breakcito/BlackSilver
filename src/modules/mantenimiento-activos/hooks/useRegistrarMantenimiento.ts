import { useState, useEffect, useCallback, useMemo } from "react";
import dayjs from "dayjs";
import { useNotify } from "../../../hooks/useNotify";
import { MantenimientoService } from "../service/mantenimiento.service";
import { AuxService } from "../../../service/auxiliar.service";
import {
  Schema_CrearMantenimiento,
  issuesToFieldErrors,
  type DTO_CrearMantenimiento,
} from "../service/mantenimiento.requests";
import { getCoincidencias } from "../../../shared/functions/get-coincidencias";
import type { RES_ActivoFijoDisponible } from "../../../service/responses/activo-fijo";
import type { RES_Mina } from "../../../service/responses/mina";
import type { RES_Almacen } from "../../../service/responses/almacen";
import type { RES_Empleado } from "../../../service/responses/empleado";
import type { RES_Proveedor } from "../../../service/responses/proveedor";
import type { RES_PersonalExterno } from "../../../service/responses/personal-externo";
import type {
  RES_ProductoDespachadoPendiente,
  RES_ConsumoPendiente,
} from "../service/mantenimiento.responses";

interface UseRegistrarMantenimientoProps {
  initialActivoId?: number | null;
  onSuccess: () => void;
  activos: RES_ActivoFijoDisponible[];
}

export interface GastoItem {
  concepto: string;
  costo: number;
}

export interface ProductoConsumidoItem {
  id_entrega_detalle: number;
  producto: string;
  unidad: string;
  maxCantidad: number;
  cantidad: number;
  comentario: string;
}

export const useRegistrarMantenimiento = ({
  initialActivoId,
  onSuccess,
  activos,
}: UseRegistrarMantenimientoProps) => {
  const { notifySuccess, notifyError } = useNotify();

  // Catalogs loading
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [loadingPersonal, setLoadingPersonal] = useState(false);
  const [loadingTodoPersonal, setLoadingTodoPersonal] = useState(false);
  const [loadingDespachados, setLoadingDespachados] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Ver más states
  const [verTodosProveedores, setVerTodosProveedores] = useState(false);
  const [verTodoPersonal, setVerTodoPersonal] = useState(false);

  // Catalogs
  const [minas, setMinas] = useState<RES_Mina[]>([]);
  const [almacenes, setAlmacenes] = useState<RES_Almacen[]>([]);
  const [empleados, setEmpleados] = useState<RES_Empleado[]>([]);
  const [proveedores, setProveedores] = useState<RES_Proveedor[]>([]);
  const [personalExterno, setPersonalExterno] = useState<RES_PersonalExterno[]>(
    [],
  );

  // Pending products/consumptions lists
  const [entregasPendientes, setEntregasPendientes] = useState<
    RES_ProductoDespachadoPendiente[]
  >([]);
  const [consumosPendientes, setConsumosPendientes] = useState<
    RES_ConsumoPendiente[]
  >([]);
  const [consumosConfirmados, setConsumosConfirmados] = useState<number[]>([]);

  // Form states
  const [idActivoFijo, setIdActivoFijo] = useState<number | null>(
    initialActivoId || null,
  );
  const [tipoLugar, setTipoLugar] = useState<"almacen" | "mina" | "otro" | "">(
    "",
  );
  const [idMina, setIdMina] = useState<number | null>(null);
  const [idAlmacen, setIdAlmacen] = useState<number | null>(null);
  const [lugarOtro, setLugarOtro] = useState("");

  const [tipoEjecutor, setTipoEjecutor] = useState<"interno" | "externo">(
    "interno",
  );
  const [idEmpleadoEjecutor, setIdEmpleadoEjecutor] = useState<number | null>(
    null,
  );
  const [idProveedor, setIdProveedor] = useState<number | null>(null);
  const [idPersonalExterno, setIdPersonalExterno] = useState<number | null>(
    null,
  );
  const [idEmpleadoSupervisor, setIdEmpleadoSupervisor] = useState<
    number | null
  >(null);

  const [fechaHoraMantenimiento, setFechaHoraMantenimiento] =
    useState<Date | null>(new Date());
  const [observacion, setObservacion] = useState("");
  const [serieFactura, setSerieFactura] = useState("");
  const [numeroFactura, setNumeroFactura] = useState("");
  const [costoManoObra, setCostoManoObra] = useState<number | string>("");

  const [otrosGastos, setOtrosGastos] = useState<GastoItem[]>([]);
  const [productosConsumidos, setProductosConsumidos] = useState<
    ProductoConsumidoItem[]
  >([]);
  const [evidencias, setEvidencias] = useState<File[]>([]);

  // Errores de campo derivados del safeParse de Zod (se pintan inline).
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Queries de busqueda de los Selects (controladas para getCoincidencias).
  // Supervisor y Ejecutor tienen queries separadas: son dos Selects visibles a
  // la vez y compartirla filtraria ambos con el texto del otro.
  const [qActivo, setQActivo] = useState("");
  const [qSupervisor, setQSupervisor] = useState("");
  const [qEjecutor, setQEjecutor] = useState("");
  const [qProveedor, setQProveedor] = useState("");
  const [qPersonal, setQPersonal] = useState("");
  const [qLugar, setQLugar] = useState("");

  /** Limpia el error de un campo en cuanto el usuario lo corrige. */
  const clearFieldError = useCallback((campo: string) => {
    setFieldErrors((prev) => {
      if (!prev[campo]) return prev;
      const next = { ...prev };
      delete next[campo];
      return next;
    });
  }, []);

  // Initial catalogs fetch
  useEffect(() => {
    const loadCatalogs = async () => {
      setLoadingCatalogs(true);
      try {
        const [resMinas, resAlmacenes, resEmpleados, resProveedores] =
          await Promise.all([
            AuxService.get_minas(),
            AuxService.get_almacenes(),
            AuxService.get_empleados(),
            AuxService.get_proveedores({ para_mantenimiento: true }),
          ]);

        if (resMinas.success && resMinas.data) setMinas(resMinas.data);
        if (resAlmacenes.success && resAlmacenes.data)
          setAlmacenes(resAlmacenes.data);
        if (resEmpleados.success && resEmpleados.data)
          setEmpleados(resEmpleados.data);
        if (resProveedores.success && resProveedores.data)
          setProveedores(resProveedores.data);
      } catch (err) {
        console.error(err);
        notifyError("Error al cargar catálogos");
      } finally {
        setLoadingCatalogs(false);
      }
    };
    loadCatalogs();
  }, [notifyError]);

  // Handle ver todos proveedores
  const handleVerTodosProveedores = async () => {
    if (verTodosProveedores) {
      setVerTodosProveedores(false);
    } else {
      setLoadingCatalogs(true);
      try {
        const res = await AuxService.get_proveedores();
        if (res.success && res.data) {
          setProveedores((prev) => {
            const map = new Map(prev.map((p) => [p.id_proveedor, p]));
            res.data.forEach((p) => {
              if (!map.has(p.id_proveedor)) {
                map.set(p.id_proveedor, p);
              }
            });
            return Array.from(map.values());
          });
          setVerTodosProveedores(true);
        }
      } catch (err) {
        console.error(err);
        notifyError("Error al cargar todos los proveedores");
      } finally {
        setLoadingCatalogs(false);
      }
    }
  };

  // Handle ver todo personal externo
  const handleVerTodoPersonal = async () => {
    if (verTodoPersonal) {
      setVerTodoPersonal(false);
    } else {
      setLoadingTodoPersonal(true);
      try {
        const res = await AuxService.get_personal_externo();
        if (res.success && res.data) {
          setPersonalExterno((prev) => {
            const map = new Map(prev.map((pe) => [pe.id_personal, pe]));
            res.data.forEach((pe) => {
              if (!map.has(pe.id_personal)) {
                map.set(pe.id_personal, pe);
              }
            });
            return Array.from(map.values());
          });
          setVerTodoPersonal(true);
        }
      } catch (err) {
        console.error(err);
        notifyError("Error al cargar todo el personal externo");
      } finally {
        setLoadingTodoPersonal(false);
      }
    }
  };

  // Catálogo de activos con búsqueda tolerante (Fuse + FlexSearch + substring).
  const activosSelectData = useMemo(() => {
    const q = qActivo.trim();
    const lista = q
      ? getCoincidencias(activos, q, {
          keys: ["producto", "correlativo", "categoria"],
          fuseThreshold: 0.4,
        }).map((r) => r.item)
      : activos;
    return lista.map((a) => ({
      value: String(a.id_activo),
      label: `${a.correlativo} - ${a.producto}`,
    }));
  }, [activos, qActivo]);

  // Un Select de empleados por contexto: el texto buscado por el supervisor
  // no debe recortar el catalogo del ejecutor (y viceversa).
  const construirSelectEmpleados = useCallback(
    (q: string) => {
      const limpio = q.trim();
      const lista = limpio
        ? getCoincidencias(empleados, limpio, {
            keys: ["nombre_completo"],
            fuseThreshold: 0.4,
          }).map((r) => r.item)
        : empleados;
      return lista.map((e) => ({
        value: String(e.id_empleado),
        label: e.nombre_completo,
      }));
    },
    [empleados],
  );

  const supervisorSelectData = useMemo(
    () => construirSelectEmpleados(qSupervisor),
    [construirSelectEmpleados, qSupervisor],
  );

  const ejecutorSelectData = useMemo(
    () => construirSelectEmpleados(qEjecutor),
    [construirSelectEmpleados, qEjecutor],
  );

  // Memoized providers data
  const proveedoresSelectData = useMemo(() => {
    let list = proveedores;
    if (!verTodosProveedores) {
      list = proveedores.filter(
        (p) =>
          p.para_mantenimiento === true ||
          Number(p.para_mantenimiento) === 1 ||
          p.id_proveedor === idProveedor,
      );
    }
    const q = qProveedor.trim();
    if (q) {
      list = getCoincidencias(list, q, {
        keys: ["razon_social"],
        fuseThreshold: 0.4,
      }).map((r) => r.item);
    }
    return list.map((p) => ({
      value: String(p.id_proveedor),
      label: p.razon_social,
    }));
  }, [proveedores, verTodosProveedores, idProveedor, qProveedor]);

  // Memoized personal data
  const personalExternoSelectData = useMemo(() => {
    let list = personalExterno;
    if (!verTodoPersonal && idProveedor) {
      list = personalExterno.filter(
        (pe) =>
          pe.id_proveedor === idProveedor ||
          pe.id_personal === idPersonalExterno,
      );
    }
    const q = qPersonal.trim();
    if (q) {
      list = getCoincidencias(list, q, {
        keys: ["nombre", "apellido"],
        fuseThreshold: 0.4,
      }).map((r) => r.item);
    }
    return list.map((pe) => ({
      value: String(pe.id_personal),
      label: `${pe.nombre} ${pe.apellido}`.trim(),
    }));
  }, [personalExterno, verTodoPersonal, idProveedor, idPersonalExterno, qPersonal]);

  // Catalogo agrupado de lugares (almacenes / minas / otro).
  const lugarSelectData = useMemo(() => {
    const data: { group: string; items: { value: string; label: string }[] }[] =
      [];
    if (almacenes.length > 0) {
      data.push({
        group: "Almacenes",
        items: almacenes.map((a) => ({
          value: `almacen-${a.id_almacen}`,
          label: a.nombre,
        })),
      });
    }
    if (minas.length > 0) {
      data.push({
        group: "Minas",
        items: minas.map((m) => ({
          value: `mina-${m.id_mina}`,
          label: m.nombre,
        })),
      });
    }
    data.push({
      group: "Otros",
      items: [{ value: "otro", label: "Otro (Especificar)..." }],
    });

    const q = qLugar.trim();
    if (!q) return data;

    // Filtra los items de cada grupo; si un grupo se queda vacio, se descarta.
    // "Otros" nunca se descarta: es la unica via para un lugar que no esta en
    // el catalogo, asi que debe seguir disponible aunque la query no matchee.
    return data
      .map((g) => {
        if (g.group === "Otros") return g;
        const items = getCoincidencias(g.items, q, {
          keys: ["label"],
          fuseThreshold: 0.4,
        }).map((r) => r.item);
        return { ...g, items };
      })
      .filter((g) => g.items.length > 0);
  }, [almacenes, minas, qLugar]);

  // Load provider personnel when provider changes
  useEffect(() => {
    setIdPersonalExterno(null);
    setPersonalExterno([]);
    setVerTodoPersonal(false);
    if (!idProveedor) return;

    const loadPersonal = async () => {
      setLoadingPersonal(true);
      try {
        const res = await AuxService.get_personal_externo({
          id_proveedor: idProveedor,
        });
        if (res.success && res.data) {
          setPersonalExterno(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingPersonal(false);
      }
    };
    loadPersonal();
  }, [idProveedor]);

  // Handle active asset change: pre-populate location & fetch pending products
  useEffect(() => {
    setEntregasPendientes([]);
    setConsumosPendientes([]);
    setProductosConsumidos([]);
    setConsumosConfirmados([]);
    if (!idActivoFijo) return;

    // Prepopulate location
    const act = activos.find((a) => a.id_activo === idActivoFijo);
    if (act) {
      if (act.id_almacen) {
        setTipoLugar("almacen");
        setIdAlmacen(act.id_almacen);
        setIdMina(null);
        setLugarOtro("");
      } else if (act.id_mina) {
        setTipoLugar("mina");
        setIdMina(act.id_mina);
        setIdAlmacen(null);
        setLugarOtro("");
      } else {
        setTipoLugar("");
        setIdMina(null);
        setIdAlmacen(null);
        setLugarOtro("");
      }
    }

    // Fetch pending products
    const loadDespachados = async () => {
      setLoadingDespachados(true);
      try {
        const res =
          await MantenimientoService.getProductosDespachados(idActivoFijo);
        if (res.success && res.data) {
          const { entregas_pendientes, consumos_pendientes } = res.data;
          setEntregasPendientes(entregas_pendientes || []);
          setConsumosPendientes(consumos_pendientes || []);

          // Auto fill form consumidos with 0
          const items: ProductoConsumidoItem[] = (
            entregas_pendientes || []
          ).map((d) => ({
            id_entrega_detalle: d.id_entrega_detalle,
            producto: d.producto,
            unidad: d.unidad_base_abv,
            maxCantidad: d.restante_base,
            cantidad: 0,
            comentario: "",
          }));
          setProductosConsumidos(items);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingDespachados(false);
      }
    };
    loadDespachados();
  }, [idActivoFijo, activos]);

  // Manage otros_gastos
  const agregarGasto = useCallback(() => {
    setOtrosGastos((prev) => [...prev, { concepto: "", costo: 0 }]);
  }, []);

  const eliminarGasto = useCallback((index: number) => {
    setOtrosGastos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const actualizarGasto = useCallback(
    (index: number, field: keyof GastoItem, value: string | number) => {
      setOtrosGastos((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value } as GastoItem;
        return next;
      });
    },
    [],
  );

  // Manage products consumidos quantities
  const actualizarCantidadProducto = useCallback(
    (index: number, val: number) => {
      setProductosConsumidos((prev) => {
        const next = [...prev];
        const maxVal = next[index].maxCantidad;
        next[index].cantidad = Math.max(0, Math.min(val, maxVal));
        return next;
      });
    },
    [],
  );

  const actualizarComentarioProducto = useCallback(
    (index: number, val: string) => {
      setProductosConsumidos((prev) => {
        const next = [...prev];
        next[index].comentario = val;
        return next;
      });
    },
    [],
  );

  // Toggle consumo confirmado ID
  const toggleConsumoConfirmado = useCallback((id_consumo: number) => {
    setConsumosConfirmados((prev) =>
      prev.includes(id_consumo)
        ? prev.filter((id) => id !== id_consumo)
        : [...prev, id_consumo],
    );
  }, []);

  const handleConfirmarPersonalExterno = useCallback(
    (nuevo: RES_PersonalExterno) => {
      setPersonalExterno((prev) => [...prev, nuevo]);
      setIdPersonalExterno(nuevo.id_personal);
    },
    [],
  );

  const handleConfirmarProveedor = useCallback((nuevo: RES_Proveedor) => {
    setProveedores((prev) => [...prev, nuevo]);
    setIdProveedor(nuevo.id_proveedor);
  }, []);

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      id_activo_fijo: idActivoFijo,
      tipo_ejecutor: tipoEjecutor,
      id_mina: tipoLugar === "mina" ? idMina : null,
      id_almacen: tipoLugar === "almacen" ? idAlmacen : null,
      lugar_trabajo: tipoLugar === "otro" ? lugarOtro.trim() || null : null,
      id_empleado_ejecutor:
        tipoEjecutor === "interno" ? idEmpleadoEjecutor : null,
      id_proveedor: tipoEjecutor === "externo" ? idProveedor : null,
      id_personal_externo:
        tipoEjecutor === "externo" ? idPersonalExterno : null,
      fecha_hora_mantenimiento: fechaHoraMantenimiento
        ? dayjs(fechaHoraMantenimiento).format("YYYY-MM-DD HH:mm:ss")
        : "",
      observacion: observacion.trim() || null,
      serie_factura: serieFactura.trim().toUpperCase() || null,
      numero_factura: numeroFactura.trim().toUpperCase() || null,
      costo_mano_obra: costoManoObra === "" ? null : Number(costoManoObra),
      // No se filtran los gastos con costo 0 en silencio: si el usuario escribio
      // el concepto pero dejo el costo vacio, Zod tiene que avisarle en vez de
      // descartar la fila y guardarla como si nunca existiera.
      otros_gastos: otrosGastos.filter(
        (g) => g.concepto.trim() !== "" || Number(g.costo) > 0,
      ),
      productos_consumidos: productosConsumidos.filter((p) => p.cantidad > 0),
    };

    const validacion = Schema_CrearMantenimiento.safeParse(payload);

    if (!validacion.success) {
      const errores = issuesToFieldErrors(validacion.error.issues);
      setFieldErrors(errores);
      const primerError = Object.values(errores)[0];
      if (primerError) {
        notifyError(primerError);
      }
      return;
    }

    setFieldErrors({});

    // `lugar_trabajo` guarda siempre el nombre resuelto del lugar (no el id),
    // para que el listado no tenga que resolver warehouses/minas en el cliente.
    const lugarResuelto =
      tipoLugar === "otro"
        ? (lugarOtro.trim() || null)
        : tipoLugar === "almacen"
          ? (almacenes.find((a) => a.id_almacen === idAlmacen)?.nombre ?? null)
          : tipoLugar === "mina"
            ? (minas.find((m) => m.id_mina === idMina)?.nombre ?? null)
            : null;

    const dto: DTO_CrearMantenimiento = {
      id_activo_fijo: payload.id_activo_fijo as number,
      id_mina: payload.id_mina,
      id_almacen: payload.id_almacen,
      id_empleado_supervisor: idEmpleadoSupervisor,
      id_proveedor: payload.id_proveedor,
      id_personal_externo: payload.id_personal_externo,
      id_empleado_ejecutor: payload.id_empleado_ejecutor,
      fecha_hora_mantenimiento: payload.fecha_hora_mantenimiento,
      observacion: payload.observacion,
      lugar_trabajo: lugarResuelto,
      serie_factura: validacion.data.serie_factura,
      numero_factura: validacion.data.numero_factura,
      costo_mano_obra: payload.costo_mano_obra,
      otros_gastos: payload.otros_gastos.length > 0 ? payload.otros_gastos : null,
      productos_consumidos:
        payload.productos_consumidos.length > 0
          ? payload.productos_consumidos.map((p) => ({
              id_entrega_detalle: p.id_entrega_detalle,
              cantidad: p.cantidad,
              comentario: p.comentario.trim() || null,
            }))
          : null,
      consumos_confirmados:
        consumosConfirmados.length > 0 ? consumosConfirmados : null,
      evidencias: evidencias.length > 0 ? evidencias : null,
    };

    setSubmitting(true);
    try {
      const res = await MantenimientoService.crearMantenimiento(dto);
      if (res.success) {
        notifySuccess("Mantenimiento registrado con éxito");
        onSuccess();
      } else {
        notifyError(res.message || "Error al registrar mantenimiento");
      }
    } catch (err) {
      console.error(err);
      notifyError("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  };

  return {
    state: {
      activos,
      minas,
      almacenes,
      empleados,
      proveedores,
      personalExterno,
      entregasPendientes,
      consumosPendientes,
      consumosConfirmados,
      verTodosProveedores,
      verTodoPersonal,
      idActivoFijo,
      setIdActivoFijo,
      tipoLugar,
      setTipoLugar,
      idMina,
      setIdMina,
      idAlmacen,
      setIdAlmacen,
      lugarOtro,
      setLugarOtro,
      tipoEjecutor,
      setTipoEjecutor,
      idEmpleadoEjecutor,
      setIdEmpleadoEjecutor,
      idProveedor,
      setIdProveedor,
      idPersonalExterno,
      setIdPersonalExterno,
      idEmpleadoSupervisor,
      setIdEmpleadoSupervisor,
      fechaHoraMantenimiento,
      setFechaHoraMantenimiento,
      observacion,
      setObservacion,
      serieFactura,
      setSerieFactura,
      numeroFactura,
      setNumeroFactura,
      costoManoObra,
      setCostoManoObra,
      otrosGastos,
      productosConsumidos,
      evidencias,
      setEvidencias,
      fieldErrors,
    },
    status: {
      loadingCatalogs,
      loadingPersonal,
      loadingTodoPersonal,
      loadingDespachados,
      submitting,
    },
    actions: {
      agregarGasto,
      eliminarGasto,
      actualizarGasto,
      actualizarCantidadProducto,
      actualizarComentarioProducto,
      handleConfirmarPersonalExterno,
      handleConfirmarProveedor,
      handleSubmit,
      handleVerTodosProveedores,
      handleVerTodoPersonal,
      toggleConsumoConfirmado,
      clearFieldError,
    },
    selectsData: {
      activosSelectData,
      supervisorSelectData,
      ejecutorSelectData,
      proveedoresSelectData,
      personalExternoSelectData,
      lugarSelectData,
    },
    searchData: {
      qActivo,
      setQActivo,
      qSupervisor,
      setQSupervisor,
      qEjecutor,
      setQEjecutor,
      qProveedor,
      setQProveedor,
      qPersonal,
      setQPersonal,
      qLugar,
      setQLugar,
    },
  };
};
