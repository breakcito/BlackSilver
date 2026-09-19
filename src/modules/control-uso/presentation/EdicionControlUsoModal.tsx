import { useEffect, useState } from "react";
import {
  Stack,
  Group,
  Text,
  Select,
  Textarea,
  NumberInput,
  Button,
  SegmentedControl,
  Card,
  Badge,
  Box,
  Center,
  Checkbox,
  Loader,
  SimpleGrid,
  Grid,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import {
  Cog8ToothIcon,
  TruckIcon,
  ArrowPathRoundedSquareIcon,
  MapPinIcon,
  BriefcaseIcon,
  BanknotesIcon,
  ClockIcon,
  PlusIcon,
  QueueListIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import { TimeInput } from "@mantine/dates";
import "@mantine/dates/styles.css";
import { useNotify } from "../../../hooks/useNotify";
import { AuxService } from "../../../service/auxiliar.service";
import { ClientesService } from "../../clientes/service/clientes.service";
import { ControlUsoService } from "../service/control-uso.service";
import { MinasService } from "../../minas-labores/service/minas.service";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { DataTableEstandar } from "../../../presentation/utils/datatable-estandar";
import { CustomDatePicker } from "../../../presentation/utils/date-picker-input";
import { NuevaTarifaModal } from "./nueva-tarifa-modal";
import type { RES_ControlUsoLog, RES_Tarifa } from "../service/control-uso.responses";
import { TipoTurno } from "../../../shared/enums/_generic/tipo-turno";
import { formatNumber } from "../../../shared/functions/formatNumber";

interface Props {
  opened: boolean;
  close: () => void;
  /** El registro que se esta editando (null si el modal no aplica). */
  target: RES_ControlUsoLog | null;
  /** Tras guardar exitosamente, refresca el listado. */
  onSuccess: () => Promise<void> | void;
}

const TIPO_CARGA_OPTIONS = [
  { value: "Arrumaje de Mineral", label: "Arrumaje de Mineral" },
  { value: "Carguio de Mineral", label: "Carguio de Mineral" },
];

const numberOrNull = (v: string | number | null | undefined): number | null => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Helpers de defaults por mina (mismo patron que `registro-uso.tsx`).
 * Algamarca -> autocompletar Usar Horas. Sayapullo -> Usar Horometro.
 */
const getDefaultsForMina = (
  nombreMina: string | null | undefined,
): { usarHoras: boolean; usarHorometro: boolean } => {
  if (!nombreMina) return { usarHoras: false, usarHorometro: false };
  const n = nombreMina.trim().toLowerCase();
  if (n === "algamarca") return { usarHoras: true, usarHorometro: false };
  if (n === "sayapullo") return { usarHoras: false, usarHorometro: true };
  return { usarHoras: false, usarHorometro: false };
};

/** Formatea horas para display consistente con el registro. */
const formatHoras = (v: number): string => {
  if (!Number.isFinite(v) || v === 0) return "0.00";
  const trunc = Math.trunc(v * 100) / 100;
  const remainder = Math.abs(v - trunc);
  const hayMas = remainder > 1e-9;
  let s = trunc.toFixed(2);
  if (hayMas) s += "\u2026";
  return s;
};

export const EdicionControlUsoModal = ({
  opened,
  close,
  target,
  onSuccess,
}: Props) => {
  const { notifyError, notifySuccess } = useNotify();

  // Catálogos
  const [minas, setMinas] = useState<{ value: string; label: string }[]>([]);
  const [clientes, setClientes] = useState<
    { value: string; label: string }[]
  >([]);
  const [tarifas, setTarifas] = useState<RES_Tarifa[]>([]);
  const [labores, setLabores] = useState<{ value: string; label: string }[]>(
    [],
  );
  const [loadingLabores, setLoadingLabores] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [lotesMineral, setLotesMineral] = useState<
    { id_lote_mineral: number; codigo: string; contratista?: string }[]
  >([]);

  // Estado del form (campos operativos)
  const [tipoTurno, setTipoTurno] = useState<TipoTurno | "">("");
  const [fechaTrabajo, setFechaTrabajo] = useState<Date | null>(null);
  const [usarHoras, setUsarHoras] = useState(false);
  const [usarHorometro, setUsarHorometro] = useState(false);
  const [horaInicioStr, setHoraInicioStr] = useState("");
  const [horaFinStr, setHoraFinStr] = useState("");
  const [horometroInicio, setHorometroInicio] = useState<number | "">("");
  const [horometroFin, setHorometroFin] = useState<number | "">("");
  const [cantidadVueltas, setCantidadVueltas] = useState<number | "">("");
  const [cantidadSacos, setCantidadSacos] = useState<number | "">("");
  const [idTarifa, setIdTarifa] = useState<string | null>(null);
  const [precioUnitario, setPrecioUnitario] = useState(0);
  const [esParaMina, setEsParaMina] = useState<boolean>(true);
  const [idMina, setIdMina] = useState<string | null>(null);
  const [idLabor, setIdLabor] = useState<string | null>(null);
  const [idLoteMineral, setIdLoteMineral] = useState<string | null>(null);
  const [idCliente, setIdCliente] = useState<string | null>(null);
  const [tipoCarga, setTipoCarga] = useState<string | null>(null);
  const [observacion, setObservacion] = useState("");

  const [saving, setSaving] = useState(false);

  // Modales auxiliares (Historial / Nueva Tarifa) — igual que el registro.
  const [modalTarifaOpened, setModalTarifaOpened] = useState(false);
  const [modalHistorialOpened, setModalHistorialOpened] = useState(false);

  // Tipo de control del registro.
  const esVueltas =
    target?.cantidad_vueltas !== null && target?.cantidad_vueltas !== undefined;
  const esOdometro =
    target?.odometro_inicio !== null && target?.odometro_inicio !== undefined;
  const esHorometro = !esVueltas && !esOdometro;

  // Tipo de control normalizado (string) para pasar a NuevaTarifaModal
  // y para filtrar el select.
  const tipoControlStr: "horometro" | "odometro" | "vueltas" = esHorometro
    ? "horometro"
    : esOdometro
      ? "odometro"
      : "vueltas";

  // Helper: construye un RES_ActivoFijoDisponible minimo desde el target
  // para pasarselo a NuevaTarifaModal (que solo usa `id_activo`).
  const targetAsAsset = target
    ? ({
        id_activo: target.id_activo_fijo,
        correlativo: target.correlativo ?? "",
        id_almacen: null,
        almacen: target.ubicacion_activo ?? null,
        en_almacen_principal: null,
        id_mina: target.id_mina ?? null,
        mina: target.mina ?? null,
        id_producto: 0,
        producto: target.producto ?? "",
        es_auditable: false,
        id_categoria: 0,
        categoria: target.categoria ?? "",
        para_transporte: false,
        control_por_odometro: target.control_por_odometro === 1,
        control_por_horometro: target.control_por_horometro === 1,
        control_por_vueltas: !esHorometro && !esOdometro,
        id_unidad_medida_base: 0,
        unidad_medida_base: "",
        unidad_medida_base_abv: "",
      } as const)
    : null;

  const fieldClasses = {
    input:
      "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
    label: "text-zinc-300 mb-1 font-medium",
  };

  // Cargar catalogos base al abrir el modal.
  useEffect(() => {
    if (!opened) return;

    const fetchBaseData = async () => {
      setLoadingData(true);
      try {
        const respMinas = await AuxService.get_minas();
        if (respMinas.success) {
          setMinas(
            respMinas.data.map((m: { id_mina: string | number; nombre: string }) => ({
              value: m.id_mina.toString(),
              label: m.nombre,
            })),
          );
        }

        const respClientes = await ClientesService.getClientes();
        if (Array.isArray(respClientes)) {
          setClientes(
            respClientes.map(
              (c: { id_cliente: string | number; razon_social: string }) => ({
                value: c.id_cliente.toString(),
                label: c.razon_social,
              }),
            ),
          );
        }

        const respLotes = await AuxService.get_lotes_mineral();
        if (respLotes.success) {
          setLotesMineral(respLotes.data);
        }
      } catch (err) {
        console.error(err);
        notifyError("Error cargando datos iniciales");
      } finally {
        setLoadingData(false);
      }
    };

    fetchBaseData();
  }, [opened, notifyError]);

  // Cargar tarifas del activo al abrir (o al cambiar el activo via target).
  useEffect(() => {
    if (!opened || !target) return;
    ControlUsoService.getTarifas(Number(target.id_activo_fijo)).then((r) => {
      if (r.success) {
        // El response ya trae todos los campos; los declarados por
        // RES_Tarifa que la API puede omitir los rellenamos con defaults.
        // `created_at` se preserva tal cual para que el historial no
        // muestre "Invalid Date".
        const completas = r.data.map(
          (t): RES_Tarifa => ({
            id: t.id,
            id_activo_fijo: Number(target.id_activo_fijo),
            tipo_control: t.tipo_control,
            precio_unitario: t.precio_unitario,
            descripcion: t.descripcion,
            id_tipo_material: null,
            tipo_material: t.tipo_material,
            distancia_metros: t.distancia_metros,
            created_at: t.created_at ?? "",
          }),
        );
        setTarifas(completas);
      }
    });
  }, [opened, target]);

  // Cargar labores al cambiar la mina seleccionada.
  useEffect(() => {
    if (!opened || !idMina) {
      setLabores([]);
      setIdLabor(null);
      setLoadingLabores(false);
      return;
    }
    let cancelado = false;
    setLoadingLabores(true);
    setLabores([]);
    MinasService.getLabores(Number(idMina))
      .then((resp) => {
        if (cancelado) return;
        if (resp.success) {
          setLabores(
            resp.data.map(
              (l: { id_labor: string | number; nombre: string | null }) => ({
                value: l.id_labor.toString(),
                label: l.nombre || "Sin nombre",
              }),
            ),
          );
        }
      })
      .catch((e) => {
        if (!cancelado) console.error(e);
      })
      .finally(() => {
        if (!cancelado) setLoadingLabores(false);
      });
    return () => {
      cancelado = true;
    };
  }, [idMina, opened]);

  // Defaults por mina para los checks de "Usar Horas" / "Usar Horometro".
  useEffect(() => {
    if (!esHorometro) return;
    if (!idMina) return;
    const nombre = minas.find((m) => m.value === idMina)?.label ?? null;
    const defaults = getDefaultsForMina(nombre);
    setUsarHoras(defaults.usarHoras);
    setUsarHorometro(defaults.usarHorometro);
    if (defaults.usarHoras) {
      // No pisamos los valores si ya hay algo escrito (evitamos pisar
      // la edicion manual del usuario).
    } else {
      setHoraInicioStr("");
      setHoraFinStr("");
    }
    if (defaults.usarHorometro) {
      // idem
    } else {
      setHorometroInicio("");
      setHorometroFin("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idMina]);

  // Cargar valores del target al abrir.
  useEffect(() => {
    if (!opened || !target) return;

    setTipoTurno((target.tipo_turno as TipoTurno) ?? "");
    // Fecha del trabajo: usamos fecha_hora_inicio_control como referencia.
    if (target.fecha_hora_inicio_control) {
      setFechaTrabajo(new Date(target.fecha_hora_inicio_control));
    } else {
      setFechaTrabajo(null);
    }
    // Horas: extraer HH:MM de fecha_hora_inicio_control / fin.
    if (target.fecha_hora_inicio_control) {
      const d = new Date(target.fecha_hora_inicio_control);
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      setHoraInicioStr(`${hh}:${mm}`);
    } else {
      setHoraInicioStr("");
    }
    if (target.fecha_hora_fin_control) {
      const d = new Date(target.fecha_hora_fin_control);
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      setHoraFinStr(`${hh}:${mm}`);
    } else {
      setHoraFinStr("");
    }
    // Si hay horometro_inicio/fin -> usarHorometro = true; si no, false.
    if (
      target.horometro_inicio !== null &&
      target.horometro_inicio !== undefined &&
      target.horometro_inicio !== ""
    ) {
      setUsarHorometro(true);
    } else {
      setUsarHorometro(false);
    }
    // Si hay horas -> usarHoras = true.
    if (target.fecha_hora_inicio_control && target.fecha_hora_fin_control) {
      setUsarHoras(true);
    } else {
      setUsarHoras(false);
    }
    setHorometroInicio(
      target.horometro_inicio !== null && target.horometro_inicio !== undefined
        ? Number(target.horometro_inicio)
        : "",
    );
    setHorometroFin(
      target.horometro_fin !== null && target.horometro_fin !== undefined
        ? Number(target.horometro_fin)
        : "",
    );
    setCantidadVueltas(
      target.cantidad_vueltas !== null && target.cantidad_vueltas !== undefined
        ? Number(target.cantidad_vueltas)
        : "",
    );
    setCantidadSacos(
      target.cantidad_sacos !== null && target.cantidad_sacos !== undefined
        ? Number(target.cantidad_sacos)
        : "",
    );
    setIdTarifa(target.id_tarifa ? String(target.id_tarifa) : null);
    setEsParaMina(
      target.es_para_mina !== null && target.es_para_mina !== undefined
        ? Boolean(Number(target.es_para_mina))
        : true,
    );
    setIdMina(target.id_mina ? String(target.id_mina) : null);
    setIdLabor(target.id_labor ? String(target.id_labor) : null);
    setIdLoteMineral(
      target.id_lote_mineral ? String(target.id_lote_mineral) : null,
    );
    setIdCliente(target.id_cliente ? String(target.id_cliente) : null);
    setTipoCarga(target.tipo_carga ?? null);
    setObservacion(target.observacion ?? "");
  }, [opened, target]);

  // Sincronizar precioUnitario con la tarifa seleccionada (mismo patron que
  // registro-uso.tsx).
  useEffect(() => {
    const t = tarifas.find((x) => String(x.id) === idTarifa);
    setPrecioUnitario(t ? Number(t.precio_unitario) : 0);
  }, [idTarifa, tarifas]);

  if (!target) return null;

  // Calculo de horas del bloque para mostrar en el resumen del modal.
  let totalHorasBloque = 0;
  if (esHorometro) {
    if (usarHoras && horaInicioStr && horaFinStr && fechaTrabajo) {
      const base = dayjs(fechaTrabajo).format("YYYY-MM-DD");
      const a = dayjs(`${base} ${horaInicioStr}`);
      let b = dayjs(`${base} ${horaFinStr}`);
      if (!b.isAfter(a)) b = b.add(1, "day");
      const diffSecs = b.diff(a, "second");
      if (diffSecs > 0) totalHorasBloque = diffSecs / 3600;
    } else if (usarHorometro && horometroInicio !== "" && horometroFin !== "") {
      totalHorasBloque = Math.max(
        0,
        Number(horometroFin) - Number(horometroInicio),
      );
    }
  }
  const totalCostoBloque = totalHorasBloque * (precioUnitario || 0);

  // Formato HH:MM robusto para inputs de hora.
  const formatHora = (val: string): string => {
    const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(val ?? "");
    return match ? `${match[1]}:${match[2]}` : "";
  };

  const guardar = async () => {
    setSaving(true);
    try {
      // Reconstruir fecha_hora_inicio_control / fin segun los checks.
      let fechaHoraInicio: string | null = null;
      let fechaHoraFin: string | null = null;

      if (esHorometro) {
        if (usarHoras && fechaTrabajo && horaInicioStr && horaFinStr) {
          const base = dayjs(fechaTrabajo).format("YYYY-MM-DD");
          const a = dayjs(`${base} ${horaInicioStr}`);
          let b = dayjs(`${base} ${horaFinStr}`);
          if (!b.isAfter(a)) b = b.add(1, "day");
          fechaHoraInicio = a.format("YYYY-MM-DD HH:mm:ss");
          fechaHoraFin = b.format("YYYY-MM-DD HH:mm:ss");
        } else if (usarHorometro && fechaTrabajo) {
          // Sin horario, usamos la fecha del dia + 00:00:00.
          fechaHoraInicio = dayjs(fechaTrabajo)
            .startOf("day")
            .format("YYYY-MM-DD HH:mm:ss");
        }
      } else if (fechaTrabajo) {
        fechaHoraInicio = dayjs(fechaTrabajo)
          .startOf("day")
          .format("YYYY-MM-DD HH:mm:ss");
      }

      const payload: Record<string, unknown> = {
        tipo_turno: tipoTurno === "" ? null : tipoTurno,
        fecha_hora_inicio_control: fechaHoraInicio,
        fecha_hora_fin_control: fechaHoraFin,
        horometro_inicio: numberOrNull(horometroInicio),
        horometro_fin: numberOrNull(horometroFin),
        odometro_inicio: target.odometro_inicio ?? null,
        odometro_fin: target.odometro_fin ?? null,
        cantidad_vueltas: numberOrNull(cantidadVueltas),
        cantidad_sacos: numberOrNull(cantidadSacos),
        precio_unitario: precioUnitario || 0,
        observacion: observacion.trim() === "" ? null : observacion.trim(),
        id_tarifa: idTarifa ? Number(idTarifa) : null,
        es_para_mina: esParaMina,
        id_mina: idMina ? Number(idMina) : null,
        id_labor: idLabor ? Number(idLabor) : null,
        id_lote_mineral: idLoteMineral ? Number(idLoteMineral) : null,
        id_cliente: idCliente ? Number(idCliente) : null,
        tipo_carga: tipoCarga,
      };

      const resp = await ControlUsoService.actualizarControlUso(
        Number(target.id_log),
        payload,
      );
      if (resp.success) {
        notifySuccess("Control de uso actualizado correctamente.");
        await onSuccess();
        close();
      } else {
        notifyError(resp.message || "No se pudo actualizar el control de uso");
      }
    } catch (err) {
      console.error(err);
      notifyError("Error inesperado al actualizar el control de uso");
    } finally {
      setSaving(false);
    }
  };

  // Label / unidad segun tipo (mismo patron que el registro).
  return (
    <ModalEstandar
      opened={opened}
      close={() => {
        if (!saving) close();
      }}
      title={`Editar Control por ${
        esHorometro
          ? "Horómetro"
          : esOdometro
            ? "Odómetro"
            : "Vueltas"
      }`}
      size="xl"
    >
      <Stack gap="md" className="p-1">
        {/* Asset card (cabecera informativa, no editable) - mismo diseno
            que el registro. */}
        <div className="relative overflow-hidden bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 flex gap-3.5 transition-all">
          <div className="absolute -right-8 -top-8 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-center shrink-0 w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            {esHorometro ? (
              <Cog8ToothIcon className="w-5 h-5 text-indigo-400" />
            ) : esOdometro ? (
              <TruckIcon className="w-5 h-5 text-indigo-400" />
            ) : (
              <ArrowPathRoundedSquareIcon className="w-5 h-5 text-indigo-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500">
                Activo Fijo
              </span>
              <Badge
                size="xs"
                color="pink"
                variant="light"
                className="font-bold shrink-0 border border-pink-500/10"
              >
                {target.correlativo}
              </Badge>
            </div>
            <Text size="sm" fw={800} className="text-white leading-snug truncate">
              {target.producto}
            </Text>
            {(target.ubicacion_activo || target.mina) && (
              <Text
                size="10px"
                className="text-zinc-500 mt-1.5 flex items-center gap-1.5"
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500/50 animate-pulse" />
                <span className="font-medium">Ubicacion:</span>
                <span className="text-zinc-400 font-semibold truncate">
                  {target.ubicacion_activo || target.mina}
                </span>
              </Text>
            )}
          </div>
        </div>

        {/* Cabecera. El layout varia por tipo:
              - horometro: Tarifa + Fecha del Trabajo (SimpleGrid cols=2)
              - odometro:  Tarifa sola          (SimpleGrid cols=1)
              - vueltas:   Tarifa + Cantidad Vueltas + Fecha (Grid 3 cols)
            El Select de Tarifa incluye los botones Historial / Nueva
            Tarifa (igual que en el registro) para que el usuario pueda
            revisar el historial o agregar una tarifa rapido desde la
            edicion sin tener que salir. */}
        {esVueltas ? (
          // En vueltas la cabecera (Tarifa + Cantidad + Fecha) vive
          // DENTRO del Bloque Vueltas mas abajo, igual que en el
          // registro. Aqui no renderizamos nada.
          <></>
        ) : (
          // Cabecera horometro / odometro: SimpleGrid simple (Tarifa +
          // opcional Fecha del Trabajo si es horometro).
          <SimpleGrid cols={esHorometro ? 2 : 1} spacing="md">
            <Group gap={6} align="flex-end" wrap="nowrap">
              <Select
                className="flex-1"
                label="Tarifa de Uso"
                placeholder="Seleccione tarifa..."
                data={tarifas
                  .filter(
                    (t) =>
                      t.tipo_control === (esHorometro
                        ? "horometro"
                        : "odometro"),
                  )
                  .map((t) => {
                    const parts = [
                      `S/. ${Number(t.precio_unitario).toFixed(2)}`,
                      t.tipo_material ? `x ${t.tipo_material}` : null,
                      t.descripcion ? `- ${t.descripcion}` : null,
                    ].filter(Boolean);
                    return { value: String(t.id), label: parts.join(" ") };
                  })}
                value={idTarifa}
                onChange={setIdTarifa}
                searchable
                clearable
                classNames={fieldClasses}
                radius="lg"
                size="xs"
              />
              <Tooltip label="Historial de Tarifas">
                <ActionIcon
                  onClick={() => setModalHistorialOpened(true)}
                  variant="light"
                  color="zinc.4"
                  size={32}
                  radius="lg"
                  className="mb-[3px] border border-zinc-700/50"
                >
                  <QueueListIcon className="w-4 h-4" />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Nueva Tarifa">
                <ActionIcon
                  onClick={() => setModalTarifaOpened(true)}
                  variant="filled"
                  color="indigo.6"
                  size={32}
                  radius="lg"
                  className="mb-[3px]"
                >
                  <PlusIcon className="w-4 h-4" />
                </ActionIcon>
              </Tooltip>
            </Group>
            {esHorometro && (
              <CustomDatePicker
                label="Fecha del Trabajo"
                placeholder="Seleccione fecha"
                value={fechaTrabajo}
                onChange={(val) => setFechaTrabajo(val)}
                classNames={fieldClasses}
                radius="lg"
                size="xs"
                required
              />
            )}
          </SimpleGrid>
        )}

        {/* Lote Mineral + Tipo de Carga (solo horometro / odometro, mismo
            diseno que el registro). En vueltas NO se muestran (el
            registro de vueltas tiene su propio card Mina/Labor/Lote). */}
        {(esHorometro || esOdometro) && (
          <SimpleGrid cols={2} spacing="md">
            <Select
              label="Lote Mineral (Opc.)"
              placeholder="Seleccione lote de mineral..."
              data={lotesMineral.map((lm) => ({
                value: String(lm.id_lote_mineral),
                label: `${lm.contratista ? `${lm.contratista.split(" ")[0]} - ` : ""}${lm.codigo}`,
              }))}
              value={idLoteMineral}
              onChange={setIdLoteMineral}
              searchable
              clearable
              classNames={fieldClasses}
              radius="lg"
              size="xs"
            />
            <Select
              label="Tipo de Carga (Opc.)"
              placeholder="Seleccione..."
              data={TIPO_CARGA_OPTIONS}
              value={tipoCarga}
              onChange={setTipoCarga}
              clearable
              classNames={fieldClasses}
              radius="lg"
              size="xs"
            />
          </SimpleGrid>
        )}

        {/* Cabecera ESPECIFICA de vueltas: Mina (required) + Labor +
            Lote Mineral (opcional, filtrado por labor). Reemplaza al
            "Destino del Trabajo" generico porque vueltas SIEMPRE va a
            mina (es_para_mina=true en el service). */}
        {esVueltas && (
          <Card
            withBorder
            padding="md"
            radius="lg"
            className="bg-zinc-950/20 border-zinc-800/60"
          >
            <SimpleGrid cols={2} spacing="md">
              <Select
                label="Mina"
                placeholder="Seleccione mina"
                data={minas}
                value={idMina}
                onChange={setIdMina}
                searchable
                required
                classNames={fieldClasses}
                radius="lg"
                size="xs"
              />
              <Select
                label="Labor"
                placeholder="Seleccione labor"
                data={labores}
                value={idLabor}
                onChange={setIdLabor}
                searchable
                disabled={!idMina}
                classNames={fieldClasses}
                radius="lg"
                size="xs"
              />
            </SimpleGrid>
            <Select
              mt="md"
              label="Lote de Mineral (Opcional)"
              placeholder={
                idLabor
                  ? "Seleccione lote de la labor (opcional)..."
                  : "Seleccione primero una labor"
              }
              data={lotesMineral
                .filter(() => Boolean(idLabor))
                .map((lm) => ({
                  value: String(lm.id_lote_mineral),
                  label: `${lm.contratista ? `${lm.contratista.split(" ")[0]} - ` : ""}${lm.codigo}`,
                }))}
              value={idLoteMineral}
              onChange={setIdLoteMineral}
              searchable
              clearable
              disabled={!idLabor}
              classNames={fieldClasses}
              radius="lg"
              size="xs"
            />
          </Card>
        )}

        {/* Destino del Trabajo (solo horometro / odometro, mismo
            diseno que el registro). En vueltas se omite porque arriba
            va el card Mina/Labor/Lote y vueltas SIEMPRE es para mina. */}
        {!esVueltas && (
          <Card
            withBorder
            padding="md"
            radius="lg"
            className="bg-zinc-950/20 border-zinc-800/60"
          >
            <Group justify="flex-start" align="center" mb="sm" gap="xs">
              <Text size="xs" fw={600} className="text-zinc-300">
                Destino del Trabajo:
              </Text>
              <SegmentedControl
                value={esParaMina ? "mina" : "terceros"}
                onChange={(value) => setEsParaMina(value === "mina")}
                data={[
                  {
                    value: "mina",
                    label: (
                      <Center style={{ gap: 6 }}>
                        <MapPinIcon className="w-4 h-4" />
                        <Box>En Mina</Box>
                      </Center>
                    ),
                  },
                  {
                    value: "terceros",
                    label: (
                      <Center style={{ gap: 6 }}>
                        <BriefcaseIcon className="w-4 h-4" />
                        <Box>Para Terceros</Box>
                      </Center>
                    ),
                  },
                ]}
                radius="md"
                size="xs"
                classNames={{
                  root: "bg-zinc-900/50 border border-zinc-800",
                  control: "border-none",
                  indicator: "bg-indigo-600",
                  label: "text-zinc-400 data-[active]:text-white font-bold",
                }}
              />
            </Group>

            <SimpleGrid cols={esParaMina ? 2 : 1} spacing="md" mt="md">
              {esParaMina ? (
                <>
                  <Select
                    label="Mina"
                    placeholder="Seleccione mina"
                    data={minas}
                    value={idMina}
                    onChange={setIdMina}
                    searchable
                    required
                    classNames={fieldClasses}
                    radius="lg"
                    size="xs"
                  />
                  <Select
                    label="Labor (Opcional)"
                    placeholder={
                      loadingLabores
                        ? "Cargando labores..."
                        : "Seleccione labor"
                    }
                    data={labores}
                    value={idLabor}
                    onChange={setIdLabor}
                    searchable
                    clearable
                    disabled={!idMina || loadingLabores}
                    rightSection={
                      loadingLabores ? (
                        <Loader size={12} color="indigo" />
                      ) : undefined
                    }
                    classNames={fieldClasses}
                    radius="lg"
                    size="xs"
                  />
                </>
              ) : (
                <Select
                  label="Cliente"
                  placeholder="Seleccione cliente"
                  data={clientes}
                  value={idCliente}
                  onChange={setIdCliente}
                  searchable
                  required
                  classNames={fieldClasses}
                  radius="lg"
                  size="xs"
                />
              )}
            </SimpleGrid>
          </Card>
        )}

        {/* Bloque Horometro (single, no agregar/quitar) - mismo diseno
            que el registro. */}
        {esHorometro && (
          <Card
            withBorder
            padding="md"
            radius="lg"
            className="bg-zinc-950/40 border-zinc-800"
          >
            <Group justify="space-between" align="center" mb="sm" wrap="nowrap">
              <Group gap="xs" wrap="nowrap">
                <Badge color="indigo" variant="light" size="sm" radius="sm">
                  Bloque #1
                </Badge>
                <Text size="xs" c="zinc.500" fw={600}>
                  Horario independiente
                </Text>
              </Group>
              <Group gap="md" align="center" wrap="nowrap">
                <Checkbox
                  label="Usar Horas"
                  checked={usarHoras}
                  onChange={(event) => {
                    const value = event.currentTarget.checked;
                    setUsarHoras(value);
                    if (!value) {
                      setHoraInicioStr("");
                      setHoraFinStr("");
                    }
                  }}
                  radius="sm"
                  size="xs"
                  color="indigo"
                />
                <Checkbox
                  label="Usar Horometro"
                  checked={usarHorometro}
                  onChange={(event) => {
                    const value = event.currentTarget.checked;
                    setUsarHorometro(value);
                    if (!value) {
                      setHorometroInicio("");
                      setHorometroFin("");
                    }
                  }}
                  radius="sm"
                  size="xs"
                  color="indigo"
                />
              </Group>
            </Group>

            <SimpleGrid cols={2} spacing="md">
              <div>
                <TimeInput
                  label={
                    usarHoras ? "Hora Inicio" : "Hora Inicio (no aplica)"
                  }
                  placeholder="08:00"
                  value={horaInicioStr}
                  onChange={(event) =>
                    setHoraInicioStr(formatHora(event.currentTarget.value))
                  }
                  classNames={fieldClasses}
                  size="xs"
                  radius="lg"
                  required={usarHoras}
                  disabled={!usarHoras}
                />
                {horaInicioStr && usarHoras && (
                  <Text
                    size="10px"
                    c="blue.4"
                    fw={700}
                    mt={3}
                    className="ml-1"
                  >
                    ({dayjs(`2000-01-01 ${horaInicioStr}`).format("hh:mm A")})
                  </Text>
                )}
              </div>

              <div>
                <TimeInput
                  label={usarHoras ? "Hora Fin" : "Hora Fin (no aplica)"}
                  placeholder="10:00"
                  value={horaFinStr}
                  onChange={(event) =>
                    setHoraFinStr(formatHora(event.currentTarget.value))
                  }
                  classNames={fieldClasses}
                  size="xs"
                  radius="lg"
                  required={usarHoras}
                  disabled={!usarHoras}
                />
                {horaFinStr && usarHoras && (
                  <Text
                    size="10px"
                    c="blue.4"
                    fw={700}
                    mt={3}
                    className="ml-1"
                  >
                    ({dayjs(`2000-01-01 ${horaFinStr}`).format("hh:mm A")})
                    {horaInicioStr &&
                      horaFinStr &&
                      dayjs(`2000-01-01 ${horaFinStr}`).isBefore(
                        dayjs(`2000-01-01 ${horaInicioStr}`),
                      ) && (
                        <span className="text-amber-400 font-bold ml-1">
                          (Dia siguiente)
                        </span>
                      )}
                  </Text>
                )}
              </div>
            </SimpleGrid>

            <Select
              label="Turno (opcional)"
              placeholder="Seleccione turno..."
              data={[
                { value: TipoTurno.Dia, label: "Día" },
                { value: TipoTurno.Noche, label: "Noche" },
              ]}
              value={tipoTurno === "" ? null : tipoTurno}
              onChange={(val) =>
                setTipoTurno((val ?? "") as TipoTurno | "")
              }
              clearable
              classNames={fieldClasses}
              radius="lg"
              size="xs"
              mt="sm"
            />

            <SimpleGrid cols={2} spacing="md" mt="sm" className="opacity-85">
              <NumberInput
                label={
                  usarHorometro
                    ? "Horometro Inicial"
                    : "Horometro Inicial (no aplica)"
                }
                placeholder="Ej: 1250.00"
                value={horometroInicio}
                onChange={(val) =>
                  setHorometroInicio(val as number | "")
                }
                min={0}
                decimalScale={2}
                fixedDecimalScale
                classNames={fieldClasses}
                size="xs"
                radius="lg"
                required={usarHorometro}
                disabled={!usarHorometro || loadingData}
              />
              <NumberInput
                label={
                  usarHorometro
                    ? "Horometro Final"
                    : "Horometro Final (no aplica)"
                }
                placeholder="Ej: 1252.00"
                value={horometroFin}
                onChange={(val) => setHorometroFin(val as number | "")}
                min={0}
                decimalScale={2}
                fixedDecimalScale
                classNames={fieldClasses}
                size="xs"
                radius="lg"
                required={usarHorometro}
                disabled={!usarHorometro || loadingData}
              />
            </SimpleGrid>

            <Textarea
              label="Observacion"
              placeholder="Notas u observaciones de este bloque (opcional)..."
              value={observacion}
              onChange={(e) => setObservacion(e.currentTarget.value)}
              classNames={fieldClasses}
              size="xs"
              radius="lg"
              minRows={2}
              mt="sm"
            />

            {/* Resumen Total Horas / Costo (mismo patron que el registro) */}
            <SimpleGrid cols={2} spacing="md" mt="md">
              <Group gap={6} align="center" wrap="nowrap">
                <ClockIcon className="w-4 h-4 text-indigo-400 shrink-0" />
                <div className="min-w-0">
                  <Text
                    size="9px"
                    c="zinc.500"
                    fw={900}
                    tt="uppercase"
                    lts="0.08em"
                  >
                    Total Horas
                  </Text>
                  <Text size="md" fw={800} className="text-indigo-300">
                    {formatHoras(totalHorasBloque)}{" "}
                    <span className="text-[10px] text-zinc-500 italic font-medium">
                      hrs
                    </span>
                  </Text>
                </div>
              </Group>
              <Group
                gap={6}
                align="center"
                wrap="nowrap"
                justify="flex-end"
              >
                <BanknotesIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="min-w-0 text-right">
                  <Text
                    size="9px"
                    c="zinc.500"
                    fw={900}
                    tt="uppercase"
                    lts="0.08em"
                  >
                    Costo Operativo
                  </Text>
                  <Text size="md" fw={800} className="text-emerald-300">
                    S/.{" "}
                    {totalCostoBloque.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </div>
              </Group>
            </SimpleGrid>
          </Card>
        )}

        {/* Bloque Odometro (single, no agregar/quitar). */}
        {esOdometro && (
          <Card
            withBorder
            padding="md"
            radius="lg"
            className="bg-zinc-950/40 border-zinc-800"
          >
            <Group justify="space-between" align="center" mb="sm" wrap="nowrap">
              <Group gap="xs" wrap="nowrap">
                <Badge color="indigo" variant="light" size="sm" radius="sm">
                  Bloque #1
                </Badge>
                <Text size="xs" c="zinc.500" fw={600}>
                  Kilometraje independiente
                </Text>
              </Group>
            </Group>
            <SimpleGrid cols={2} spacing="md">
              <NumberInput
                label="Odometro Inicial"
                value={target.odometro_inicio ?? ""}
                disabled
                classNames={fieldClasses}
                size="xs"
                radius="lg"
              />
              <NumberInput
                label="Odometro Final"
                value={target.odometro_fin ?? ""}
                disabled
                classNames={fieldClasses}
                size="xs"
                radius="lg"
              />
            </SimpleGrid>
            <Textarea
              label="Observacion"
              value={observacion}
              onChange={(e) => setObservacion(e.currentTarget.value)}
              classNames={fieldClasses}
              size="xs"
              radius="lg"
              minRows={2}
              mt="sm"
            />
          </Card>
        )}

        {/* Bloque Vueltas (single, no agregar/quitar) - mismo diseno que
            el registro: Cabecera (Tarifa + Cantidad + Fecha), Fila 2 con
            Turno + Horometros + Cantidad de Sacos (si aplica), Observacion
            y Resumen Total Vueltas/Costo. */}
        {esVueltas && (() => {
          const tarifaItem = tarifas.find(
            (t) => String(t.id) === idTarifa,
          );
          const esSacoItem = tarifaItem
            ? (tarifaItem.tipo_material || "")
                .toLowerCase()
                .includes("saco")
            : false;
          return (
            <Card
              withBorder
              padding="md"
              radius="lg"
              className="bg-zinc-950/40 border-zinc-800"
            >
              <Group justify="space-between" align="center" mb="sm" wrap="nowrap">
                <Group gap="xs" wrap="nowrap">
                  <Badge color="indigo" variant="light" size="sm" radius="sm">
                    Bloque #1
                  </Badge>
                  <Text size="xs" c="zinc.500" fw={600}>
                    Viaje independiente
                  </Text>
                </Group>
              </Group>

              {/* Fila 1: Tarifa de Uso | Cantidad de Vueltas | Fecha del Trabajo.
                  Los tres al mismo ancho (Cantidad y Fecha ambos span=3)
                  para que se vean cuadrados. */}
              <Grid align="flex-end" gutter="md">
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Group gap={6} align="flex-end" wrap="nowrap">
                    <Select
                      className="flex-1"
                      label="Tarifa de Uso"
                      placeholder="Seleccione tarifa..."
                      data={tarifas
                        .filter((t) => t.tipo_control === "vueltas")
                        .map((t) => {
                          const esSaco = (t.tipo_material || "")
                            .toLowerCase()
                            .includes("saco");
                          const parts = [
                            esSaco
                              ? "Sin precio"
                              : `S/. ${Number(t.precio_unitario).toFixed(2)}`,
                            t.distancia_metros ? `x ${t.distancia_metros}m` : null,
                            t.tipo_material ? `x ${t.tipo_material}` : null,
                          ].filter(Boolean);
                          return { value: String(t.id), label: parts.join(" ") };
                        })}
                      value={idTarifa}
                      onChange={setIdTarifa}
                      searchable
                      clearable
                      classNames={fieldClasses}
                      radius="lg"
                      size="xs"
                    />
                    <Tooltip label="Historial de Tarifas">
                      <ActionIcon
                        onClick={() => setModalHistorialOpened(true)}
                        variant="light"
                        color="zinc.4"
                        size={32}
                        radius="lg"
                        className="mb-[3px] border border-zinc-700/50"
                      >
                        <QueueListIcon className="w-4 h-4" />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Nueva Tarifa">
                      <ActionIcon
                        onClick={() => setModalTarifaOpened(true)}
                        variant="filled"
                        color="indigo.6"
                        size={32}
                        radius="lg"
                        className="mb-[3px]"
                      >
                        <PlusIcon className="w-4 h-4" />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Grid.Col>

                {/* Cantidad de Vueltas: mismo ancho que Fecha del Trabajo
                    (span=3) para que se vean cuadrados en la fila. */}
                <Grid.Col span={{ base: 6, sm: 3 }}>
                  <NumberInput
                    label="Cantidad de Vueltas"
                    placeholder="Ej: 3"
                    value={cantidadVueltas}
                    onChange={(val) =>
                      setCantidadVueltas(val as number | "")
                    }
                    min={0}
                    decimalScale={0}
                    fixedDecimalScale
                    classNames={fieldClasses}
                    size="xs"
                    radius="lg"
                    required
                  />
                </Grid.Col>

                {/* Fecha del Trabajo: al final del row, span=3. */}
                <Grid.Col span={{ base: 6, sm: 3 }}>
                  <CustomDatePicker
                    label="Fecha del Trabajo"
                    placeholder="Seleccione fecha"
                    value={fechaTrabajo}
                    onChange={(val) => setFechaTrabajo(val)}
                    classNames={fieldClasses}
                    radius="lg"
                    size="xs"
                    required
                  />
                </Grid.Col>
              </Grid>

              {/* Fila 2: Turno (opcional) | Horometro Inicial (Opc.) |
                  Horometro Final (Opc.) | Cantidad de Sacos (solo si la
                  tarifa es Saco, al lado de Horometro Final). */}
              <Grid align="flex-end" gutter="md" mt="sm">
                <Grid.Col span={esSacoItem ? 3 : 4}>
                  <Select
                    label="Turno (opcional)"
                    placeholder="Seleccione turno..."
                    data={[
                      { value: TipoTurno.Dia, label: "Día" },
                      { value: TipoTurno.Noche, label: "Noche" },
                    ]}
                    value={tipoTurno === "" ? null : tipoTurno}
                    onChange={(val) =>
                      setTipoTurno((val ?? "") as TipoTurno | "")
                    }
                    clearable
                    classNames={fieldClasses}
                    radius="lg"
                    size="xs"
                  />
                </Grid.Col>
                <Grid.Col span={esSacoItem ? 3 : 4}>
                  <NumberInput
                    label="Horometro Inicial (Opc.)"
                    placeholder="Ej: 1250.00"
                    value={horometroInicio}
                    onChange={(val) =>
                      setHorometroInicio(val as number | "")
                    }
                    min={0}
                    decimalScale={2}
                    fixedDecimalScale
                    classNames={fieldClasses}
                    size="xs"
                    radius="lg"
                  />
                </Grid.Col>
                <Grid.Col span={esSacoItem ? 3 : 4}>
                  <NumberInput
                    label="Horometro Final (Opc.)"
                    placeholder="Ej: 1252.00"
                    value={horometroFin}
                    onChange={(val) =>
                      setHorometroFin(val as number | "")
                    }
                    min={0}
                    decimalScale={2}
                    fixedDecimalScale
                    classNames={fieldClasses}
                    size="xs"
                    radius="lg"
                  />
                </Grid.Col>
                {esSacoItem && (
                  <Grid.Col span={3}>
                    <NumberInput
                      label="Cantidad de Sacos"
                      placeholder="Ej: 30"
                      value={cantidadSacos}
                      onChange={(val) =>
                        setCantidadSacos(val as number | "")
                      }
                      min={0}
                      decimalScale={0}
                      classNames={fieldClasses}
                      size="xs"
                      radius="lg"
                    />
                  </Grid.Col>
                )}
              </Grid>

              <Textarea
                label="Observacion"
                placeholder="Notas u observaciones de este bloque (opcional)..."
                value={observacion}
                onChange={(e) => setObservacion(e.currentTarget.value)}
                classNames={fieldClasses}
                size="xs"
                radius="lg"
                minRows={2}
                mt="sm"
              />

              {/* Resumen Total Vueltas + Costo (mismo patron que el
                  registro). Si la tarifa es Saco, el Total Vueltas queda
                  en "-" (los sacos no son vueltas). */}
              <SimpleGrid cols={2} spacing="md" mt="md">
                <Group gap={6} align="center" wrap="nowrap">
                  <ArrowPathRoundedSquareIcon className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div className="min-w-0">
                    <Text
                      size="9px"
                      c="zinc.500"
                      fw={900}
                      tt="uppercase"
                      lts="0.08em"
                    >
                      Total Vueltas
                    </Text>
                    <Text size="md" fw={800} className="text-indigo-300">
                      {esSacoItem
                        ? "-"
                        : `${formatNumber(Number(cantidadVueltas) || 0)} `}
                      {!esSacoItem && (
                        <span className="text-[10px] text-zinc-500 italic font-medium">
                          vuelta(s)
                        </span>
                      )}
                    </Text>
                  </div>
                </Group>
                <Group
                  gap={6}
                  align="center"
                  wrap="nowrap"
                  justify="flex-end"
                >
                  <BanknotesIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="min-w-0 text-right">
                    <Text
                      size="9px"
                      c="zinc.500"
                      fw={900}
                      tt="uppercase"
                      lts="0.08em"
                    >
                      Costo Operativo
                    </Text>
                    <Text size="md" fw={800} className="text-emerald-300">
                      S/.{" "}
                      {(
                        (Number(cantidadVueltas) || 0) *
                        (precioUnitario || 0)
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                  </div>
                </Group>
              </SimpleGrid>
            </Card>
          );
        })()}

        <Group justify="flex-end" gap="sm" mt="sm">
          <Button
            variant="default"
            size="xs"
            radius="lg"
            disabled={saving}
            onClick={close}
            className="bg-zinc-800! text-zinc-300! border-zinc-700!"
          >
            Cancelar
          </Button>
          <Button
            color="indigo.6"
            size="xs"
            radius="lg"
            loading={saving}
            onClick={guardar}
            className="bg-indigo-600! hover:bg-indigo-700! text-white! font-bold"
          >
            Guardar Cambios
          </Button>
        </Group>

        {/* Modal "Nueva Tarifa" — igual que en el registro. Permite
            agregar una tarifa nueva para este activo sin salir del modal
            de edicion. */}
        {targetAsAsset && (
          <ModalEstandar
            opened={modalTarifaOpened}
            close={() => setModalTarifaOpened(false)}
            title={`Tarifas por uso - ${
              tipoControlStr.charAt(0).toUpperCase() + tipoControlStr.slice(1)
            }`}
            size="sm"
          >
            <NuevaTarifaModal
              asset={targetAsAsset}
              initialTipoControl={tipoControlStr}
              onCancel={() => setModalTarifaOpened(false)}
              onSuccess={async (nuevaTarifa) => {
                // Refrescamos la lista de tarifas para que el select
                // muestre la nueva.
                try {
                  const respTarifas = await ControlUsoService.getTarifas(
                    Number(target.id_activo_fijo),
                  );
                  if (respTarifas.success) {
                    setTarifas(respTarifas.data);
                  } else {
                    setTarifas((prev) => [...prev, nuevaTarifa]);
                  }
                } catch {
                  setTarifas((prev) => [...prev, nuevaTarifa]);
                }
                // Si la tarifa nueva es del tipo de control actual, la
                // seleccionamos automaticamente.
                if (nuevaTarifa.tipo_control === tipoControlStr) {
                  setIdTarifa(nuevaTarifa.id.toString());
                }
                setModalTarifaOpened(false);
              }}
            />
          </ModalEstandar>
        )}

        {/* Modal "Historial de Tarifas" — igual que en el registro. */}
        <ModalEstandar
          opened={modalHistorialOpened}
          close={() => setModalHistorialOpened(false)}
          title={`Historial de Tarifas - ${
            tipoControlStr.charAt(0).toUpperCase() + tipoControlStr.slice(1)
          }`}
          size="xl"
        >
          <div className="mt-2 h-[350px]">
            <DataTableEstandar
              idAccessor="id"
              loading={false}
              records={tarifas
                .filter((t) => t.tipo_control === tipoControlStr)
                .sort((a, b) => b.id - a.id)}
              columns={[
                {
                  accessor: "id",
                  title: "#",
                  width: 50,
                  render: (_record, index) => (
                    <span className="text-zinc-500 text-xs font-mono">
                      {(index ?? 0) + 1}
                    </span>
                  ),
                },
                {
                  accessor: "precio_unitario",
                  title: "Precio Unit.",
                  render: (record) => {
                    if (Number(record.precio_unitario) === 0) {
                      return (
                        <span className="text-zinc-600 text-xs italic">
                          Sin precio
                        </span>
                      );
                    }
                    return (
                      <Badge color="violet" variant="filled" size="sm" radius="sm">
                        S/. {Number(record.precio_unitario).toFixed(2)}
                      </Badge>
                    );
                  },
                },
                // Columna Distancia: solo en Vueltas
                ...(tipoControlStr === "vueltas"
                  ? [
                      {
                        accessor: "distancia_metros",
                        title: "Distancia hasta",
                        render: (record: RES_Tarifa) =>
                          record.distancia_metros ? (
                            <Badge size="xs" color="teal" variant="filled">
                              {record.distancia_metros} m.
                            </Badge>
                          ) : (
                            <span className="text-zinc-600 text-xs italic">-</span>
                          ),
                      },
                    ]
                  : []),
                // Columna Material: solo en Vueltas
                ...(tipoControlStr === "vueltas"
                  ? [
                      {
                        accessor: "tipo_material",
                        title: "Material",
                        render: (record: RES_Tarifa) =>
                          record.tipo_material ? (
                            <Badge size="xs" color="pink" variant="filled">
                              {record.tipo_material}
                            </Badge>
                          ) : (
                            <span className="text-zinc-600 text-xs italic">-</span>
                          ),
                      },
                    ]
                  : []),
                {
                  accessor: "descripcion",
                  title: "Descripcion",
                  render: (record) =>
                    record.descripcion ? (
                      <span className="text-zinc-400 text-xs">
                        {record.descripcion}
                      </span>
                    ) : (
                      <span className="text-zinc-600 text-xs italic">
                        Sin descripcion
                      </span>
                    ),
                },
                {
                  accessor: "created_at",
                  title: "Fecha Creacion",
                  render: (record) => (
                    <span className="text-zinc-400 text-xs">
                      {dayjs(record.created_at).format("DD MMM YYYY, HH:mm")}
                    </span>
                  ),
                },
              ]}
            />
          </div>
        </ModalEstandar>
      </Stack>
    </ModalEstandar>
  );
};

// ============================================================================
// Tipos auxiliares
// ============================================================================
// (Eliminado: usamos RES_Tarifa directamente desde el service.)
