import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Collapse,
  Grid,
  Group,
  NumberInput,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBuildingStore,
  IconCalendar,
  IconChevronDown,
  IconChevronRight,
  IconCirclePlus,
  IconClipboardList,
  IconExclamationCircle,
  IconFlame,
  IconReceipt,
  IconTag,
  IconTrash,
  IconTruck,
  IconTruckDelivery,
  IconUser,
  IconUsers,
  IconUsersGroup,
} from "@tabler/icons-react";

import { useNotify } from "../../../hooks/useNotify";
import { AuxService } from "../../../service/auxiliar.service";
import type { RES_Almacen } from "../../../service/responses/almacen";
import type { RES_Empresa } from "../../../service/responses/empresa";
import type { RES_TipoCarbon } from "../../tipo-carbon/service/tipo-carbon.responses";
import type { RES_TarifaCarbon } from "../../../service/responses/tarifa-carbon";
import type { RES_Transportista } from "../../../service/responses/transportista";
import type { RES_LugarExtraccionCarbon } from "../../../service/responses/lugar-extraccion-carbon";
import { ProveedoresService } from "../../proveedores/service/proveedores.service";
import type { ProveedorResponse } from "../../proveedores/service/proveedores.responses";
import { TipoCarbonService } from "../../tipo-carbon/service/tipo-carbon.service";
import { CompraCarbonService } from "../service/compra-carbon.service";
import type { CompraCarbonResumen } from "../service/compra-carbon.responses";
import type { RES_PersonalExterno } from "../../../service/responses/personal-externo";
import { formatNumber } from "../../../shared/functions/formatNumber";
import { TipoEntidad } from "../../../shared/enums/_generic/tipo-entidad";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { MultiFilePicker } from "../../../presentation/utils/archivo/multifile-picker";
import { useEvidenciasCompraCarbon } from "../hooks/useEvidenciasCompraCarbon";
import type { IArchivo } from "../../../shared/interfaces/archivo";
import { FormTransportista } from "../../../presentation/utils/form-transportista";
import { FormTarifaCarbon } from "../../../presentation/utils/form-tarifa-carbon";
import { FormLugarExtraccion } from "../../../presentation/utils/form-lugar-extraccion";

interface Props {
  onCancel: () => void;
  onCreated: (cabecera: CompraCarbonResumen) => void;
}

interface LineaTemporal {
  // Tarifa y tipo (catálogo principal del item)
  id_tipo_carbon: number | null;
  id_tarifa_carbon: number | null;
  // Datos de la carga
  cantidad: number;
  precio_unitario: number;
  porcentaje_ceniza: number;
  porcentaje_humedad: number;
  placa: string;
  guia_remitente: string;
  guia_transportista: string;
  codigo_ticket_balanza: string;
  // Lugar de extracción (per-proveedor)
  id_lugar_extraccion: number | null;
  // Flete
  pagar_flete: boolean;
  id_transportista: number | null;
  costo_flete_por_tonelada: number;
}

const toBackendDateTime = (d: Date | string | null): string => {
  const date = typeof d === "string" ? new Date(d) : d;
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const inputClasses = {
  input:
    "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
  dropdown:
    "bg-zinc-950 border-zinc-800 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl",
  option:
    "text-zinc-300 hover:bg-zinc-800 hover:text-white data-[selected]:bg-indigo-600 data-[selected]:text-white font-medium transition-colors",
  label: "text-zinc-300 mb-1.5 font-semibold tracking-tight",
};

const formatPEN = (n: number) => `S/ ${formatNumber(n)}`;

const SectionHeader = ({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) => (
  <div className="flex flex-col gap-2 flex-1 min-w-0">
    <div className="flex items-center gap-2">
      <Icon className="w-5 h-5 text-amber-500 shrink-0" />
      <Text
        fw={700}
        size="sm"
        c="white"
        className="tracking-tight uppercase truncate"
      >
        {title}
      </Text>
    </div>
    <div className="h-0.5 w-full bg-linear-to-r from-amber-500/50 to-transparent rounded-full" />
  </div>
);
const round2 = (n: number) => Math.round(n * 100) / 100;

const lineaVacia = (): LineaTemporal => ({
  id_tipo_carbon: null,
  id_tarifa_carbon: null,
  cantidad: 0,
  precio_unitario: 0,
  porcentaje_ceniza: 0,
  porcentaje_humedad: 0,
  placa: "",
  guia_remitente: "",
  guia_transportista: "",
  codigo_ticket_balanza: "",
  id_lugar_extraccion: null,
  pagar_flete: false,
  id_transportista: null,
  costo_flete_por_tonelada: 0,
});

export const RegistroCompraCarbon = ({ onCancel, onCreated }: Props) => {
  const { notifyError, notifySuccess } = useNotify();

  const [empresas, setEmpresas] = useState<RES_Empresa[]>([]);
  const [almacenes, setAlmacenes] = useState<RES_Almacen[]>([]);
  const [proveedoresNatural, setProveedoresNatural] = useState<
    ProveedorResponse[]
  >([]);
  const [proveedoresJuridica, setProveedoresJuridica] = useState<
    ProveedorResponse[]
  >([]);
  const [tipos, setTipos] = useState<RES_TipoCarbon[]>([]);
  const [tarifas, setTarifas] = useState<RES_TarifaCarbon[]>([]);
  const [transportistas, setTransportistas] = useState<RES_Transportista[]>([]);
  const [lugaresExtraccion, setLugaresExtraccion] = useState<
    RES_LugarExtraccionCarbon[]
  >([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);

  const [filtroTipoEntidad, setFiltroTipoEntidad] = useState<TipoEntidad>(
    TipoEntidad.Juridica,
  );

  const [idEmpresa, setIdEmpresa] = useState<string | null>(null);
  const [idAlmacen, setIdAlmacen] = useState<string | null>(null);
  const [idProveedor, setIdProveedor] = useState<string | null>(null);
  const [idRepresentante, setIdRepresentante] = useState<string | null>(null);
  const [personal, setPersonal] = useState<RES_PersonalExterno[]>([]);
  const [loadingPersonal, setLoadingPersonal] = useState(false);
  const [aplicaIgv, setAplicaIgv] = useState<boolean>(false);
  const [porcentajeIgv, setPorcentajeIgv] = useState<number | string>(18);
  const [fechaHora, setFechaHora] = useState<Date | null>(new Date());

  // Evidencias: archivos seleccionados por el usuario. Se suben al storage
  // al momento de guardar la compra y se envian con el payload.
  const [evidenciasFiles, setEvidenciasFiles] = useState<File[]>([]);
  const { subirArchivos: subirArchivosEvidencia } =
    useEvidenciasCompraCarbon(0);

  const [detalles, setDetalles] = useState<LineaTemporal[]>([lineaVacia()]);
  const [detallesExpandidos, setDetallesExpandidos] = useState<
    Record<number, boolean>
  >({});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal: nuevo transportista
  const [
    openNuevoTransportista,
    { open: showNuevoTransportista, close: closeNuevoTransportista },
  ] = useDisclosure(false);
  const [targetTransportistaIdx, setTargetTransportistaIdx] = useState<
    number | null
  >(null);

  // Modal: nueva tarifa de carbon (siempre del tipo actual del item)
  const [openNuevaTarifa, { open: showNuevaTarifa, close: closeNuevaTarifa }] =
    useDisclosure(false);
  const [targetTarifaIdx, setTargetTarifaIdx] = useState<number | null>(null);

  // Modal: nuevo lugar de extracción
  const [openNuevoLugar, { open: showNuevoLugar, close: closeNuevoLugar }] =
    useDisclosure(false);
  const [targetLugarIdx, setTargetLugarIdx] = useState<number | null>(null);

  // Carga inicial de catalogos cabecera.
  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoadingCatalogos(true);
      const [
        empresasRes,
        almacenesRes,
        proveedoresArr,
        tiposRes,
        tarifasRes,
        transportistasRes,
      ] = await Promise.all([
        AuxService.get_empresas(),
        AuxService.get_almacenes({ para_carbon: true }),
        ProveedoresService.getProveedores({ para_carbon: true }),
        TipoCarbonService.getTipos({ para_compra: true }),
        AuxService.get_tarifas_carbon(),
        AuxService.get_transportistas(),
      ]);
      if (cancel) return;
      if (empresasRes.success) {
        setEmpresas(empresasRes.data);
        // Autoelegir la empresa con id_empresa = 1 (Cupper). Si no existe,
        // se queda en null y el usuario elige manualmente.
        const empDefault = empresasRes.data.find((e) => e.id_empresa === 1);
        if (empDefault) setIdEmpresa(String(empDefault.id_empresa));
      }
      if (almacenesRes.success && Array.isArray(almacenesRes.data)) {
        setAlmacenes(almacenesRes.data);
      }
      if (proveedoresArr) {
        setProveedoresNatural(
          proveedoresArr.filter((p) => p.tipo_entidad === TipoEntidad.Natural),
        );
        setProveedoresJuridica(
          proveedoresArr.filter((p) => p.tipo_entidad === TipoEntidad.Juridica),
        );
      }
      if (tiposRes.success) setTipos(tiposRes.data);
      if (tarifasRes.success && Array.isArray(tarifasRes.data)) {
        setTarifas(tarifasRes.data);
      }
      if (transportistasRes.success && Array.isArray(transportistasRes.data)) {
        setTransportistas(transportistasRes.data);
      }
      setLoadingCatalogos(false);
    })();
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    setIdProveedor(null);
    setIdRepresentante(null);
    setPersonal([]);
    setLugaresExtraccion([]);
    setDetalles((prev) =>
      prev.map((d) => ({ ...d, id_lugar_extraccion: null })),
    );
  }, [filtroTipoEntidad]);

  useEffect(() => {
    if (!idProveedor) {
      setPersonal([]);
      setIdRepresentante(null);
      setLugaresExtraccion([]);
      setDetalles((prev) =>
        prev.map((d) => ({ ...d, id_lugar_extraccion: null })),
      );
      return;
    }
    let cancel = false;
    (async () => {
      setLoadingPersonal(true);
      try {
        const [personasRes, lugaresRes] = await Promise.all([
          AuxService.get_personal_externo({
            id_proveedor: Number(idProveedor),
          }),
          AuxService.get_lugares_extraccion_carbon(Number(idProveedor)),
        ]);
        if (cancel) return;
        if (personasRes.success) {
          setPersonal(personasRes.data);
          setIdRepresentante(
            personasRes.data.length > 0
              ? String(personasRes.data[0].id_personal)
              : null,
          );
        }
        if (lugaresRes.success && Array.isArray(lugaresRes.data)) {
          setLugaresExtraccion(lugaresRes.data);
        }
      } finally {
        if (!cancel) setLoadingPersonal(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [idProveedor]);

  const proveedoresFiltrados = useMemo(
    () =>
      filtroTipoEntidad === TipoEntidad.Natural
        ? proveedoresNatural
        : proveedoresJuridica,
    [filtroTipoEntidad, proveedoresNatural, proveedoresJuridica],
  );

  const opcionesProveedor = useMemo(
    () =>
      proveedoresFiltrados.map((p) => ({
        value: String(p.id_proveedor),
        label: p.razon_social,
      })),
    [proveedoresFiltrados],
  );

  const opcionesRepresentante = useMemo(
    () =>
      personal.map((r) => ({
        value: String(r.id_personal),
        label: r.nombre + " " + r.apellido,
      })),
    [personal],
  );

  const opcionesAlmacen = useMemo(
    () =>
      almacenes.map((a) => {
        const ubicacion = [
          a.departamento_nombre,
          a.provincia_nombre,
          a.distrito_nombre,
        ]
          .filter(Boolean)
          .join(" / ");
        const label = ubicacion ? `${a.nombre} - ${ubicacion}` : a.nombre;
        return { value: String(a.id_almacen), label };
      }),
    [almacenes],
  );

  const opcionesTipos = useMemo(
    () =>
      tipos.map((t) => ({
        value: String(t.id_tipo_carbon),
        label: t.codigo ? `${t.nombre} (${t.codigo})` : t.nombre,
      })),
    [tipos],
  );

  const opcionesTransportistas = useMemo(
    () =>
      transportistas.map((t) => ({
        value: String(t.id_transportista),
        // RUC es obligatorio en registros nuevos; se cae al DNI solo para
        // registros previos que no tengan RUC cargado.
        label: t.ruc
          ? `${t.razon_social} · RUC ${t.ruc}`
          : t.dni
            ? `${t.razon_social} · DNI ${t.dni}`
            : t.razon_social,
      })),
    [transportistas],
  );

  const opcionesLugares = useMemo(
    () =>
      lugaresExtraccion.map((l) => ({
        value: String(l.id_lugar_extraccion),
        label:
          [l.departamento_nombre, l.provincia_nombre, l.distrito_nombre]
            .filter(Boolean)
            .join(" / ") + (l.direccion ? ` · ${l.direccion}` : ""),
      })),
    [lugaresExtraccion],
  );

  const totalAntesDescuento = useMemo(
    () =>
      round2(
        detalles.reduce(
          (acc, d) =>
            d.id_tipo_carbon && d.cantidad > 0 && d.precio_unitario >= 0
              ? acc + d.cantidad * d.precio_unitario
              : acc,
          0,
        ),
      ),
    [detalles],
  );

  const descuentoFleteTotal = useMemo(
    () =>
      round2(
        detalles.reduce(
          (acc, d) =>
            d.pagar_flete && d.id_tipo_carbon && d.cantidad > 0
              ? acc + d.cantidad * (Number(d.costo_flete_por_tonelada) || 0)
              : acc,
          0,
        ),
      ),
    [detalles],
  );

  const totalConDescuento = useMemo(
    () => round2(totalAntesDescuento - descuentoFleteTotal),
    [totalAntesDescuento, descuentoFleteTotal],
  );

  const igvPctNum = Number(porcentajeIgv) || 0;
  const igvMonto = useMemo(
    () => (aplicaIgv ? round2(totalAntesDescuento * (igvPctNum / 100)) : 0),
    [aplicaIgv, igvPctNum, totalAntesDescuento],
  );

  const handleAddLinea = () => {
    setDetalles((prev) => {
      const next = [...prev, lineaVacia()];
      setDetallesExpandidos((e) => ({ ...e, [next.length - 1]: true }));
      return next;
    });
  };

  const handleRemoveLinea = (idx: number) => {
    setDetalles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleLineaChange = <K extends keyof LineaTemporal>(
    idx: number,
    field: K,
    value: LineaTemporal[K],
  ) => {
    setDetalles((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d)),
    );
  };

  /**
   * Devuelve la tarifa cuyo rango de ceniza contiene `ceniza` para el
   * `idTipo` dado. La tarifa se aplica automaticamente segun el porcentaje
   * de ceniza de la carga (no la elige el usuario manualmente).
   */
  const tarifaPara = (
    idTipo: number | null,
    ceniza: number,
  ): RES_TarifaCarbon | null => {
    if (!idTipo || !ceniza || ceniza <= 0) return null;
    return (
      tarifas.find(
        (t) =>
          t.id_tipo_carbon === idTipo &&
          ceniza >= Number(t.inicio_porcentaje_ceniza) &&
          ceniza <= Number(t.fin_porcentaje_ceniza),
      ) ?? null
    );
  };

  /** Reemplaza la linea conservando tipo/ceniza y recomputando tarifa+precio. */
  const actualizarTarifaAuto = <T extends LineaTemporal>(
    linea: T,
    cambios: Partial<T>,
  ): T => {
    const next = { ...linea, ...cambios };
    const tarifa = tarifaPara(next.id_tipo_carbon, next.porcentaje_ceniza);
    return {
      ...next,
      id_tarifa_carbon: tarifa?.id_tarifa_carbon ?? null,
      // Solo autocompletamos precio si encontramos una tarifa; si no,
      // preservamos lo que el usuario haya tipeado manualmente.
      precio_unitario: tarifa
        ? Number(tarifa.precio_unitario)
        : next.precio_unitario,
    };
  };

  // Si el usuario cambia el tipo de carbon, reubicamos la tarifa
  // correspondiente al nuevo tipo + ceniza actual.
  const handleTipoCarbonChange = (idx: number, value: number | null) => {
    setDetalles((prev) =>
      prev.map((d, i) =>
        i === idx ? actualizarTarifaAuto(d, { id_tipo_carbon: value }) : d,
      ),
    );
  };

  // Al cambiar el porcentaje de ceniza, reubicamos la tarifa.
  const handleCenizaChange = (idx: number, value: number) => {
    setDetalles((prev) =>
      prev.map((d, i) =>
        i === idx ? actualizarTarifaAuto(d, { porcentaje_ceniza: value }) : d,
      ),
    );
  };

  const handleSubmit = async () => {
    setError(null);

    if (!idEmpresa || !idProveedor) {
      setError("Empresa y proveedor son requeridos");
      return;
    }
    if (!idAlmacen) {
      setError("Almacen requerido");
      return;
    }
    if (!fechaHora) {
      setError("La fecha y hora de ingreso son requeridas");
      return;
    }

    const detallesValidos = detalles.filter(
      (d) => d.id_tipo_carbon && d.cantidad > 0 && d.precio_unitario >= 0,
    );
    if (detallesValidos.length === 0) {
      setError("Agrega al menos un item valido (tipo, cantidad > 0, precio)");
      return;
    }

    for (let i = 0; i < detallesValidos.length; i++) {
      const d = detallesValidos[i];
      if (d.pagar_flete) {
        if (!d.id_transportista) {
          setError(`Item ${i + 1}: transportista requerido si paga flete`);
          return;
        }
        if (Number(d.costo_flete_por_tonelada) <= 0) {
          setError(
            `Item ${i + 1}: costo de flete por tonelada debe ser mayor a 0`,
          );
          return;
        }
      }
    }

    setSaving(true);
    try {
      // 1) Subir los archivos de evidencia al storage (si hay).
      let evidenciasSubidas: IArchivo[] = [];
      if (evidenciasFiles.length > 0) {
        try {
          evidenciasSubidas = await subirArchivosEvidencia(evidenciasFiles);
        } catch (e) {
          console.error(e);
          setError("No se pudieron subir los archivos de evidencia");
          setSaving(false);
          return;
        }
      }

      // 2) Construir el payload con las evidencias ya subidas.
      const payload: Parameters<typeof CompraCarbonService.crearCompra>[0] = {
        id_empresa: Number(idEmpresa),
        id_proveedor: Number(idProveedor),
        id_almacen: Number(idAlmacen),
        aplica_igv: aplicaIgv,
        porcentaje_igv: aplicaIgv ? Number(porcentajeIgv) || 0 : 0,
        fecha_hora_ingreso: toBackendDateTime(fechaHora),
        evidencias: evidenciasSubidas.length > 0 ? evidenciasSubidas : null,
        detalles: detallesValidos.map((d) => ({
          id_tipo_carbon: d.id_tipo_carbon as number,
          id_tarifa_carbon: d.id_tarifa_carbon,
          id_lugar_extraccion: d.id_lugar_extraccion,
          placa: d.placa || null,
          guia_remitente: d.guia_remitente || null,
          guia_transportista: d.guia_transportista || null,
          codigo_ticket_balanza: d.codigo_ticket_balanza || null,
          cantidad: d.cantidad,
          porcentaje_ceniza: d.porcentaje_ceniza,
          porcentaje_humedad: d.porcentaje_humedad,
          precio_unitario: d.precio_unitario,
          pagar_flete: d.pagar_flete,
          id_transportista: d.pagar_flete ? d.id_transportista : null,
          costo_flete_por_tonelada: d.pagar_flete
            ? Number(d.costo_flete_por_tonelada) || 0
            : 0,
        })),
      };

      // 3) Crear la compra.
      const resp = await CompraCarbonService.crearCompra(payload);
      if (resp.success) {
        notifySuccess(resp.message || "Compra registrada correctamente");
        const cab = resp.data.cabecera;
        const resumen: CompraCarbonResumen = {
          id_compra_carbon: cab.id_compra_carbon,
          id_empresa: cab.id_empresa,
          empresa: cab.empresa,
          id_proveedor: cab.id_proveedor,
          proveedor: cab.proveedor,
          proveedor_tipo_entidad: cab.proveedor_tipo_entidad,
          proveedor_ruc: cab.proveedor_ruc,
          proveedor_dni: cab.proveedor_dni,
          id_almacen: cab.id_almacen,
          almacen: cab.almacen ?? null,
          id_empleado_registro: cab.id_empleado_registro,
          empleado_registro: cab.empleado_registro,
          id_empleado_aprueba: cab.id_empleado_aprueba,
          empleado_aprueba: cab.empleado_aprueba ?? null,
          aplica_igv: cab.aplica_igv,
          porcentaje_igv: cab.porcentaje_igv,
          correlativo: cab.correlativo,
          numero_correlativo: cab.numero_correlativo,
          fecha_hora_ingreso: cab.fecha_hora_ingreso,
          fecha_hora_aprobacion: cab.fecha_hora_aprobacion,
          total_antes_descuento: cab.total_antes_descuento,
          monto_igv: cab.monto_igv,
          descuento_flete: cab.descuento_flete,
          total_con_descuento: cab.total_con_descuento,
          estado_pago: cab.estado_pago ?? null,
          created_at: cab.created_at,
          estado: cab.estado,
          cantidad_items: resp.data.detalles.length,
          evidencias: cab.evidencias ?? [],
        };
        onCreated(resumen);
      } else {
        notifyError(resp.message || "No se pudo registrar la compra");
      }
    } catch (e) {
      console.error(e);
      notifyError("Error al registrar la compra de carbon");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Stack gap={32} className="animate-fade-in">
      {error && (
        <Alert
          icon={<IconExclamationCircle size={16} />}
          color="red"
          variant="filled"
        >
          {error}
        </Alert>
      )}

      {/* SECCION: Datos de la Compra */}
      <section>
        <Grid align="end">
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Select
              label="Empresa que compra"
              placeholder={loadingCatalogos ? "Cargando..." : "Seleccione"}
              radius="lg"
              size="sm"
              searchable
              withAsterisk
              data={empresas.map((e) => ({
                value: String(e.id_empresa),
                label: e.razon_social,
              }))}
              value={idEmpresa}
              onChange={setIdEmpresa}
              classNames={inputClasses}
              nothingFoundMessage="Sin empresas"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Select
              label="Almacen de destino"
              placeholder={
                loadingCatalogos
                  ? "Cargando..."
                  : opcionesAlmacen.length === 0
                    ? "Sin almacenes para carbon"
                    : "Seleccione"
              }
              radius="lg"
              size="sm"
              searchable
              withAsterisk
              disabled={opcionesAlmacen.length === 0}
              data={opcionesAlmacen}
              value={idAlmacen}
              onChange={setIdAlmacen}
              classNames={inputClasses}
              nothingFoundMessage="Sin almacenes"
              leftSection={
                <IconBuildingStore size={16} className="text-zinc-400" />
              }
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <DateTimePicker
              label="Fecha y hora de ingreso"
              placeholder="Seleccione fecha y hora"
              radius="lg"
              size="sm"
              withAsterisk
              leftSection={<IconCalendar size={16} />}
              value={fechaHora}
              onChange={(v) => {
                if (!v) {
                  setFechaHora(null);
                  return;
                }
                if (typeof v === "string") {
                  setFechaHora(new Date(v));
                } else {
                  setFechaHora(v);
                }
              }}
              classNames={inputClasses}
            />
          </Grid.Col>

          {/* Aplica IGV + Porcentaje */}
          <Grid.Col span={{ base: 12, md: 3 }}>
            <div className="p-3 bg-zinc-900/30 border border-zinc-800 rounded-xl flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-zinc-300 font-medium text-sm">
                  Aplica IGV
                </span>
              </div>
              <Switch
                checked={aplicaIgv}
                onChange={(e) => setAplicaIgv(e.currentTarget.checked)}
                color="indigo"
                size="md"
                className="cursor-pointer"
              />
            </div>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <NumberInput
              label="IGV (%)"
              radius="lg"
              size="sm"
              min={0}
              max={100}
              disabled={!aplicaIgv}
              value={porcentajeIgv}
              onChange={(v) => setPorcentajeIgv(v)}
              classNames={inputClasses}
              leftSection={<IconReceipt size={14} />}
            />
          </Grid.Col>

          {/* Proveedor + toggle Natural/Juridica + Representante */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <div className="flex items-end gap-2">
              <Select
                label={`Proveedor (${
                  filtroTipoEntidad === TipoEntidad.Natural
                    ? "Natural"
                    : "Juridica"
                })`}
                placeholder={
                  loadingCatalogos
                    ? "Cargando..."
                    : opcionesProveedor.length === 0
                      ? "Sin proveedores para esta opcion"
                      : "Seleccione"
                }
                radius="lg"
                size="sm"
                searchable
                withAsterisk
                disabled={opcionesProveedor.length === 0}
                data={opcionesProveedor}
                value={idProveedor}
                onChange={setIdProveedor}
                classNames={inputClasses}
                nothingFoundMessage="Sin coincidencias"
                leftSection={
                  <IconBuildingStore size={16} className="text-zinc-400" />
                }
                className="flex-1"
              />
              <Tooltip
                label={
                  filtroTipoEntidad === TipoEntidad.Natural
                    ? "Ver proveedores juridicos"
                    : "Ver proveedores naturales"
                }
                position="top"
                withArrow
              >
                <ActionIcon
                  variant="light"
                  color={
                    filtroTipoEntidad === TipoEntidad.Natural
                      ? "teal"
                      : "indigo"
                  }
                  onClick={() =>
                    setFiltroTipoEntidad((prev) =>
                      prev === TipoEntidad.Natural
                        ? TipoEntidad.Juridica
                        : TipoEntidad.Natural,
                    )
                  }
                  radius="lg"
                  size="lg"
                  className="shrink-0"
                  style={{ height: 36, width: 36 }}
                >
                  {filtroTipoEntidad === TipoEntidad.Natural ? (
                    <IconUsersGroup className="w-5 h-5" />
                  ) : (
                    <IconUsers className="w-5 h-5" />
                  )}
                </ActionIcon>
              </Tooltip>
            </div>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Select
              label="Contacto (opc.)"
              placeholder={
                !idProveedor
                  ? "Seleccione un proveedor"
                  : loadingPersonal
                    ? "Cargando..."
                    : opcionesRepresentante.length === 0
                      ? "Sin personal"
                      : "Seleccione"
              }
              radius="lg"
              size="sm"
              searchable
              clearable
              disabled={!idProveedor || loadingPersonal}
              data={opcionesRepresentante}
              value={idRepresentante}
              onChange={setIdRepresentante}
              classNames={inputClasses}
              nothingFoundMessage="Sin personal"
              leftSection={<IconUser size={16} className="text-zinc-400" />}
            />
          </Grid.Col>
        </Grid>
      </section>

      {/* SECCION: Evidencias (opcional) */}
      <MultiFilePicker
        files={evidenciasFiles}
        onFilesChange={setEvidenciasFiles}
        label="Archivos de evidencia"
        description="Imagenes o documentos (PDF, JPG, PNG, etc.)"
      />

      {/* SECCION: Items */}
      <section>
        <Group justify="space-between" align="center" wrap="nowrap" mb="sm">
          <SectionHeader icon={IconFlame} title="Items a registrar" />
          <Button
            leftSection={<IconCirclePlus size={14} />}
            radius="lg"
            size="xs"
            variant="light"
            color="indigo"
            onClick={handleAddLinea}
            className="font-bold shrink-0"
          >
            Agregar item
          </Button>
        </Group>

        {detalles.map((linea, idx) => {
          const subtotalAntes = round2(linea.cantidad * linea.precio_unitario);
          const descuentoFlete = linea.pagar_flete
            ? round2(linea.cantidad * Number(linea.costo_flete_por_tonelada))
            : 0;
          const subtotalCon = round2(subtotalAntes - descuentoFlete);
          const expanded = detallesExpandidos[idx] ?? false;

          return (
            <div
              key={idx}
              className="mb-3 rounded-xl border border-zinc-800/60 bg-zinc-950/40 p-3"
            >
              {/* Fila principal */}
              <Grid align="end">
                <Grid.Col span={{ base: 12, md: 3 }}>
                  <Select
                    label={idx === 0 ? "Tipo" : undefined}
                    placeholder="Seleccione"
                    radius="lg"
                    size="sm"
                    searchable
                    withAsterisk
                    data={opcionesTipos.filter((o) => {
                      const enUso = detalles.some(
                        (d, i) =>
                          i !== idx && d.id_tipo_carbon === Number(o.value),
                      );
                      return !enUso;
                    })}
                    value={
                      linea.id_tipo_carbon ? String(linea.id_tipo_carbon) : null
                    }
                    onChange={(v) =>
                      handleTipoCarbonChange(idx, v ? Number(v) : null)
                    }
                    classNames={inputClasses}
                    nothingFoundMessage="Sin tipos"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 6, md: 3 }}>
                  <NumberInput
                    label={idx === 0 ? "% Ceniza" : undefined}
                    placeholder={
                      !linea.id_tipo_carbon ? "Selecciona un tipo" : "0.00"
                    }
                    radius="lg"
                    size="sm"
                    withAsterisk
                    disabled={!linea.id_tipo_carbon}
                    min={0}
                    max={100}
                    fixedDecimalScale
                    value={linea.porcentaje_ceniza}
                    onChange={(v) =>
                      handleCenizaChange(
                        idx,
                        typeof v === "number" ? v : Number(v) || 0,
                      )
                    }
                    classNames={inputClasses}
                    leftSection={<span className="text-xs">%</span>}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 6, md: 3 }}>
                  <NumberInput
                    label={idx === 0 ? "Toneladas" : undefined}
                    radius="lg"
                    size="sm"
                    min={0}
                    required
                    value={linea.cantidad}
                    onChange={(v) =>
                      handleLineaChange(
                        idx,
                        "cantidad",
                        typeof v === "number" ? v : Number(v) || 0,
                      )
                    }
                    classNames={inputClasses}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 6, md: 3 }}>
                  <NumberInput
                    label={idx === 0 ? "Precio × TN" : undefined}
                    radius="lg"
                    size="sm"
                    min={0}
                    required
                    fixedDecimalScale
                    value={linea.precio_unitario}
                    onChange={(v) =>
                      handleLineaChange(
                        idx,
                        "precio_unitario",
                        typeof v === "number" ? v : Number(v) || 0,
                      )
                    }
                    classNames={inputClasses}
                    leftSection={<span className="text-xs">S/</span>}
                  />
                </Grid.Col>
              </Grid>

              {/* Tarifa aplicada (derivada de tipo + % ceniza) */}
              {linea.id_tipo_carbon && linea.porcentaje_ceniza > 0 && (
                <Group mt="xs" gap="xs" wrap="wrap">
                  {(() => {
                    const tarifa = tarifaPara(
                      linea.id_tipo_carbon,
                      linea.porcentaje_ceniza,
                    );
                    if (tarifa) {
                      return (
                        <Badge
                          color="teal"
                          variant="light"
                          size="sm"
                          radius="md"
                          leftSection={
                            <IconTag size={12} className="text-teal-400" />
                          }
                        >
                          {`Tarifa aplicada: ${tarifa.inicio_porcentaje_ceniza}% - ${tarifa.fin_porcentaje_ceniza}% ceniza · S/ ${formatNumber(
                            Number(tarifa.precio_unitario),
                          )} × TN`}
                        </Badge>
                      );
                    }
                    return (
                      <>
                        <Badge
                          color="yellow"
                          variant="light"
                          size="sm"
                          radius="md"
                          leftSection={
                            <IconExclamationCircle
                              size={12}
                              className="text-yellow-400"
                            />
                          }
                        >
                          {`Sin tarifa para ${formatNumber(linea.porcentaje_ceniza)}% ceniza`}
                        </Badge>
                        <Button
                          variant="subtle"
                          color="indigo"
                          size="xs"
                          radius="lg"
                          leftSection={<IconCirclePlus size={14} />}
                          onClick={() => {
                            setTargetTarifaIdx(idx);
                            showNuevaTarifa();
                          }}
                          className="font-bold"
                        >
                          Crear tarifa
                        </Button>
                      </>
                    );
                  })()}
                </Group>
              )}

              {/* Accion: toggle detalles / eliminar */}
              <Group justify="space-between" align="center" mt="xs">
                <Button
                  variant="subtle"
                  color="zinc"
                  size="xs"
                  radius="lg"
                  leftSection={
                    expanded ? (
                      <IconChevronDown size={14} />
                    ) : (
                      <IconChevronRight size={14} />
                    )
                  }
                  onClick={() =>
                    setDetallesExpandidos((prev) => ({
                      ...prev,
                      [idx]: !prev[idx],
                    }))
                  }
                >
                  {expanded ? "Ocultar detalles" : "Ver detalles"}
                </Button>
                <Button
                  variant="subtle"
                  color="red"
                  size="xs"
                  radius="lg"
                  leftSection={<IconTrash size={14} />}
                  onClick={() => handleRemoveLinea(idx)}
                  disabled={detalles.length <= 1}
                >
                  Quitar
                </Button>
              </Group>

              {/* Detalles expandibles */}
              <Collapse in={expanded}>
                <div className="mt-3 pt-3 border-t border-zinc-800/60">
                  <Grid align="end">
                    {/* Lugar de extracción con + button externo */}
                    <Grid.Col span={{ base: 12, md: 5 }}>
                      <Select
                        label="Lugar de extracción"
                        placeholder={
                          !idProveedor
                            ? "Selecciona un proveedor"
                            : loadingPersonal
                              ? "Cargando..."
                              : opcionesLugares.length === 0
                                ? "Sin lugares para este proveedor"
                                : "Seleccione"
                        }
                        radius="lg"
                        size="sm"
                        searchable
                        clearable
                        required
                        disabled={!idProveedor}
                        data={opcionesLugares}
                        value={
                          linea.id_lugar_extraccion
                            ? String(linea.id_lugar_extraccion)
                            : null
                        }
                        onChange={(v) =>
                          handleLineaChange(
                            idx,
                            "id_lugar_extraccion",
                            v ? Number(v) : null,
                          )
                        }
                        classNames={inputClasses}
                        nothingFoundMessage="Sin lugares"
                        leftSection={
                          <IconClipboardList
                            size={14}
                            className="text-zinc-400"
                          />
                        }
                      />
                    </Grid.Col>
                    <Grid.Col
                      span={{ base: 12, md: 1 }}
                      className="flex md:items-end"
                    >
                      <Tooltip
                        label="Nuevo lugar de extracción"
                        withArrow
                        position="top"
                      >
                        <ActionIcon
                          variant="light"
                          color="indigo"
                          radius="lg"
                          size="lg"
                          className="w-full"
                          onClick={() => {
                            if (!idProveedor) return;
                            setTargetLugarIdx(idx);
                            showNuevoLugar();
                          }}
                          disabled={!idProveedor}
                          style={{ height: 36 }}
                        >
                          <IconCirclePlus size={18} />
                        </ActionIcon>
                      </Tooltip>
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 3 }}>
                      <TextInput
                        label="Placa"
                        placeholder="ABC-123"
                        radius="lg"
                        size="sm"
                        required
                        value={linea.placa}
                        onChange={(e) =>
                          handleLineaChange(
                            idx,
                            "placa",
                            e.currentTarget.value.toUpperCase(),
                          )
                        }
                        classNames={inputClasses}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 3 }}>
                      <TextInput
                        label="Ticket balanza"
                        placeholder="T-0001"
                        required
                        radius="lg"
                        size="sm"
                        value={linea.codigo_ticket_balanza}
                        onChange={(e) =>
                          handleLineaChange(
                            idx,
                            "codigo_ticket_balanza",
                            e.currentTarget.value.toUpperCase(),
                          )
                        }
                        classNames={inputClasses}
                      />
                    </Grid.Col>

                    <Grid.Col span={{ base: 6, md: 3 }}>
                      <NumberInput
                        label="% Humedad"
                        radius="lg"
                        size="sm"
                        min={0}
                        required
                        max={100}
                        fixedDecimalScale
                        value={linea.porcentaje_humedad}
                        onChange={(v) =>
                          handleLineaChange(
                            idx,
                            "porcentaje_humedad",
                            typeof v === "number" ? v : Number(v) || 0,
                          )
                        }
                        classNames={inputClasses}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 6, md: 3 }}>
                      <TextInput
                        label="Guia remitente"
                        placeholder="GR-0001"
                        radius="lg"
                        required
                        size="sm"
                        value={linea.guia_remitente}
                        onChange={(e) =>
                          handleLineaChange(
                            idx,
                            "guia_remitente",
                            e.currentTarget.value.toUpperCase(),
                          )
                        }
                        classNames={inputClasses}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 6, md: 3 }}>
                      <TextInput
                        label="Guia transportista (opc.)"
                        placeholder="GT-0001"
                        radius="lg"
                        size="sm"
                        value={linea.guia_transportista}
                        onChange={(e) =>
                          handleLineaChange(
                            idx,
                            "guia_transportista",
                            e.currentTarget.value.toUpperCase(),
                          )
                        }
                        classNames={inputClasses}
                      />
                    </Grid.Col>

                    {/* Switch pagar flete */}
                    <Grid.Col
                      span={{ base: 6, md: 3 }}
                      className="flex flex-row gap-2 items-center mb-3"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-zinc-300 font-medium text-sm">
                          ¿Pagar flete?
                        </span>
                      </div>
                      <Switch
                        checked={linea.pagar_flete}
                        onChange={(e) =>
                          handleLineaChange(
                            idx,
                            "pagar_flete",
                            e.currentTarget.checked,
                          )
                        }
                        color="indigo"
                        size="md"
                        className="cursor-pointer"
                      />
                    </Grid.Col>
                  </Grid>

                  {linea.pagar_flete && (
                    <Grid mt="xs" align="end">
                      <Grid.Col span={{ base: 12, md: 5 }}>
                        <Select
                          label="Transportista"
                          placeholder={
                            opcionesTransportistas.length === 0
                              ? "Sin transportistas"
                              : "Seleccione"
                          }
                          radius="lg"
                          size="sm"
                          searchable
                          withAsterisk
                          data={opcionesTransportistas}
                          value={
                            linea.id_transportista
                              ? String(linea.id_transportista)
                              : null
                          }
                          onChange={(v) =>
                            handleLineaChange(
                              idx,
                              "id_transportista",
                              v ? Number(v) : null,
                            )
                          }
                          classNames={inputClasses}
                          leftSection={
                            <IconTruckDelivery
                              size={14}
                              className="text-zinc-400"
                            />
                          }
                          nothingFoundMessage="Sin transportistas"
                        />
                      </Grid.Col>
                      <Grid.Col
                        span={{ base: 12, md: 1 }}
                        className="flex md:items-end"
                      >
                        <Tooltip
                          label="Nuevo transportista"
                          withArrow
                          position="top"
                        >
                          <ActionIcon
                            variant="light"
                            color="indigo"
                            radius="lg"
                            size="lg"
                            className="w-full"
                            onClick={() => {
                              setTargetTransportistaIdx(idx);
                              showNuevoTransportista();
                            }}
                            style={{ height: 36 }}
                          >
                            <IconCirclePlus size={18} />
                          </ActionIcon>
                        </Tooltip>
                      </Grid.Col>
                      <Grid.Col span={{ base: 6, md: 3 }}>
                        <NumberInput
                          label="Costo flete × TN"
                          radius="lg"
                          size="sm"
                          required
                          min={0}
                          fixedDecimalScale
                          value={linea.costo_flete_por_tonelada}
                          onChange={(v) =>
                            handleLineaChange(
                              idx,
                              "costo_flete_por_tonelada",
                              typeof v === "number" ? v : Number(v) || 0,
                            )
                          }
                          classNames={inputClasses}
                          leftSection={
                            <IconTruck size={14} className="text-zinc-400" />
                          }
                        />
                      </Grid.Col>
                    </Grid>
                  )}

                  {/* Subtotales computados del item */}
                  <Grid mt="xs">
                    <Grid.Col span={{ base: 6, md: 4 }}>
                      <div className="text-center">
                        <Text
                          size="10px"
                          c="dimmed"
                          fw={700}
                          className="uppercase tracking-wider"
                        >
                          Subtotal
                        </Text>
                        <Text
                          size="sm"
                          fw={800}
                          c="zinc.2"
                          className="font-mono"
                        >
                          {formatPEN(subtotalAntes)}
                        </Text>
                      </div>
                    </Grid.Col>
                    <Grid.Col span={{ base: 6, md: 4 }}>
                      <div className="text-center">
                        <Text
                          size="10px"
                          c="dimmed"
                          fw={700}
                          className="uppercase tracking-wider"
                        >
                          Descuento flete
                        </Text>
                        <Text
                          size="sm"
                          fw={800}
                          c="yellow.4"
                          className="font-mono"
                        >
                          {formatPEN(descuentoFlete)}
                        </Text>
                      </div>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 4 }}>
                      <div className="text-center">
                        <Text
                          size="10px"
                          c="dimmed"
                          fw={700}
                          className="uppercase tracking-wider"
                        >
                          Subtotal Neto
                        </Text>
                        <Text
                          size="sm"
                          fw={900}
                          c="indigo.3"
                          className="font-mono"
                        >
                          {formatPEN(subtotalCon)}
                        </Text>
                      </div>
                    </Grid.Col>
                  </Grid>
                </div>
              </Collapse>
            </div>
          );
        })}

        {/* Resumen Tributario al pie */}
        <Grid mt="md" justify="flex-end">
          <Grid.Col span={{ base: 12, sm: 10, md: 7, lg: 6 }}>
            <div className="bg-zinc-900/30 px-4 py-3 rounded-xl border border-zinc-800/50 space-y-1.5">
              <div className="flex justify-between items-center">
                <Text
                  size="xs"
                  c="dimmed"
                  fw={700}
                  className="uppercase tracking-wider"
                >
                  Total
                </Text>
                <Text
                  size="xs"
                  fw={700}
                  className="font-mono text-zinc-300 tabular-nums"
                >
                  {formatPEN(totalAntesDescuento)}
                </Text>
              </div>
              {descuentoFleteTotal > 0 && (
                <div className="flex justify-between items-center">
                  <Text
                    size="xs"
                    c="dimmed"
                    fw={700}
                    className="uppercase tracking-wider"
                  >
                    (-) Descuento flete
                  </Text>
                  <Text
                    size="xs"
                    fw={700}
                    className="font-mono text-yellow.400 tabular-nums"
                  >
                    - {formatPEN(descuentoFleteTotal)}
                  </Text>
                </div>
              )}
              <div className="flex justify-between items-center">
                <Text
                  size="xs"
                  c="dimmed"
                  fw={700}
                  className="uppercase tracking-wider"
                >
                  Total Neto
                </Text>
                <Text
                  size="xs"
                  fw={900}
                  className="font-mono text-indigo-300 tabular-nums"
                >
                  {formatPEN(totalConDescuento)}
                </Text>
              </div>
              {aplicaIgv && (
                <div className="flex justify-between items-center">
                  <Text
                    size="xs"
                    c="dimmed"
                    fw={700}
                    className="uppercase tracking-wider"
                  >
                    IGV {igvPctNum.toFixed(2)}%
                  </Text>
                  <Text
                    size="xs"
                    fw={700}
                    className="font-mono text-zinc-300 tabular-nums"
                  >
                    {formatPEN(igvMonto)}
                  </Text>
                </div>
              )}
            </div>
          </Grid.Col>
        </Grid>
      </section>

      {/* Acciones */}
      <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
        <Button variant="subtle" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          loading={saving}
          disabled={loadingCatalogos}
          leftSection={<IconTag size={16} />}
          className="bg-linear-to-r from-zinc-100 to-zinc-300 text-zinc-900 hover:from-white hover:to-zinc-200 shadow-lg shadow-zinc-900/20"
        >
          Registrar compra
        </Button>
      </div>

      {/* Modal: Nuevo transportista */}
      <ModalEstandar
        opened={openNuevoTransportista}
        close={closeNuevoTransportista}
        title="Nuevo Transportista"
        size="md"
      >
        <FormTransportista
          onSuccess={(nuevo) => {
            setTransportistas((prev) => [...prev, nuevo]);
            if (targetTransportistaIdx !== null) {
              handleLineaChange(
                targetTransportistaIdx,
                "id_transportista",
                nuevo.id_transportista,
              );
            }
            closeNuevoTransportista();
            setTargetTransportistaIdx(null);
          }}
          onCancel={closeNuevoTransportista}
        />
      </ModalEstandar>

      {/* Modal: Nueva tarifa de carbon (prefill tipo del item) */}
      <ModalEstandar
        opened={openNuevaTarifa}
        close={closeNuevaTarifa}
        title="Nueva Tarifa"
        size="md"
      >
        <FormTarifaCarbon
          idTipoCarbonInicial={
            targetTarifaIdx !== null
              ? (detalles[targetTarifaIdx]?.id_tipo_carbon ?? null)
              : null
          }
          cenizaReferenciaInicial={
            targetTarifaIdx !== null
              ? (detalles[targetTarifaIdx]?.porcentaje_ceniza ?? 0)
              : 0
          }
          onSuccess={(nueva) => {
            setTarifas((prev) => [...prev, nueva]);
            // Re-evaluamos la tarifa para la linea target (puede que la
            // nueva tarifa ahora cubra el rango de ceniza de esa carga).
            if (targetTarifaIdx !== null) {
              setDetalles((prev) =>
                prev.map((d, i) =>
                  i === targetTarifaIdx ? actualizarTarifaAuto(d, {}) : d,
                ),
              );
            }
            closeNuevaTarifa();
            setTargetTarifaIdx(null);
          }}
          onCancel={closeNuevaTarifa}
        />
      </ModalEstandar>

      {/* Modal: Nuevo lugar de extracción */}
      <ModalEstandar
        opened={openNuevoLugar}
        close={closeNuevoLugar}
        title="Nuevo Lugar de Extraccion"
        size="md"
      >
        {idProveedor ? (
          <FormLugarExtraccion
            idProveedor={Number(idProveedor)}
            onSuccess={(nuevo) => {
              setLugaresExtraccion((prev) => [...prev, nuevo]);
              if (targetLugarIdx !== null) {
                handleLineaChange(
                  targetLugarIdx,
                  "id_lugar_extraccion",
                  nuevo.id_lugar_extraccion,
                );
              }
              closeNuevoLugar();
              setTargetLugarIdx(null);
            }}
            onCancel={closeNuevoLugar}
          />
        ) : null}
      </ModalEstandar>
    </Stack>
  );
};
