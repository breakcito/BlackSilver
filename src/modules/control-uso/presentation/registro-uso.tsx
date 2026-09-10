import {
  Button,
  Group,
  NumberInput,
  Stack,
  Textarea,
  Text,
  Badge,
  Card,
  SimpleGrid,
  Select,
  SegmentedControl,
  Center,
  Box,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { useState, useEffect, useMemo, useRef } from "react";
import { useNotify } from "../../../hooks/useNotify";
import { ControlUsoService } from "../service/control-uso.service";
import { AuxService } from "../../../service/auxiliar.service";
import { MinasService } from "../../../modules/minas-labores/service/minas.service";
import { ClientesService } from "../../../modules/clientes/service/clientes.service";
import type { RES_ControlUsoLog, RES_Tarifa } from "../service/control-uso.responses";
import type { RES_ActivoFijoDisponible } from "../../../service/responses/activo-fijo";
import {
  Cog8ToothIcon,
  TruckIcon,
  ArrowPathRoundedSquareIcon,
  MapPinIcon,
  BriefcaseIcon,
  PlusIcon,
  QueueListIcon,
  PlusCircleIcon,
  TrashIcon,
  ClockIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import { TimeInput } from "@mantine/dates";
import "@mantine/dates/styles.css";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { DataTableEstandar } from "../../../presentation/utils/datatable-estandar";
import { NuevaTarifaModal } from "./nueva-tarifa-modal";
import { CustomDatePicker } from "../../../presentation/utils/date-picker-input";

interface Props {
  asset: RES_ActivoFijoDisponible;
  tipoControl: "horometro" | "odometro" | "vueltas";
  onSuccess: (nuevosLogs: RES_ControlUsoLog[]) => void;
  onCancel: () => void;
}

interface ItemForm {
  id: string;
  horaInicioStr: string;
  horaFinStr: string;
  lecturaInicio: number | "";
  lecturaFin: number | "";
  observacion: string;
}

interface ItemVueltasForm {
  id: string;
  cantidadVueltas: number | "";
  cantidadSacos: number | "";
  horometroInicio: number | "";
  horometroFin: number | "";
  observacion: string;
}

const generarIdItem = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 9);

export const RegistroUso = ({
  asset,
  tipoControl,
  onSuccess,
  onCancel,
}: Props) => {
  const { notifyError } = useNotify();
  const idActivoFijo = asset.id_activo;

  const fieldClasses = {
    input:
      "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
    label: "text-zinc-300 mb-1 font-medium",
  };

  // Cabecera compartida por todos los tipos de control
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);

  const [tarifas, setTarifas] = useState<RES_Tarifa[]>([]);
  const [minas, setMinas] = useState<{ value: string; label: string }[]>([]);
  const [labores, setLabores] = useState<{ value: string; label: string }[]>([]);
  const [lotesMineral, setLotesMineral] = useState<{ value: string; label: string }[]>([]);
  const [clientes, setClientes] = useState<{ value: string; label: string }[]>([]);

  const [esParaMina, setEsParaMina] = useState<boolean>(true);
  const [idMina, setIdMina] = useState<string | null>(null);
  const [idLabor, setIdLabor] = useState<string | null>(null);
  const [idLoteMineral, setIdLoteMineral] = useState<string | null>(null);
  const [idCliente, setIdCliente] = useState<string | null>(null);
  const [tipoCarga, setTipoCarga] = useState<string | null>(null);
  const [idTarifa, setIdTarifa] = useState<string | null>(null);

  const [modalTarifaOpened, setModalTarifaOpened] = useState(false);
  const [modalHistorialOpened, setModalHistorialOpened] = useState(false);

  // ===== Estados single (odometro) =====
  const [fechaDia, setFechaDia] = useState<Date | null>(new Date());

  const [lecturaInicio, setLecturaInicio] = useState<number | "">("");
  const [lecturaFin, setLecturaFin] = useState<number | "">("");
  const [observacion, setObservacion] = useState("");

  // ===== Estados bulk (horometro, vueltas) =====
  const [items, setItems] = useState<ItemForm[]>([]);
  const [itemsVueltas, setItemsVueltas] = useState<ItemVueltasForm[]>([]);
  const refInicioRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const refFinRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const selectedTarifa = useMemo(() => {
    return tarifas.find((t) => t.id.toString() === idTarifa) || null;
  }, [idTarifa, tarifas]);

  const precioUnitario = selectedTarifa ? Number(selectedTarifa.precio_unitario) : 0;

  // Detecta si la tarifa seleccionada es de material Saco (sin precio) - usado en vueltas
  const esTarifaSaco = selectedTarifa
    ? (selectedTarifa.tipo_material || "").toLowerCase().includes("saco")
    : false;

  // Load initial data: cabecera + datos especificos segun tipoControl
  useEffect(() => {
    if (!idActivoFijo) return;

    const fetchData = async () => {
      setLoadingData(true);
      try {
        // Tarifas
        const respTarifas = await ControlUsoService.getTarifas(idActivoFijo);
        if (respTarifas.success) {
          setTarifas(respTarifas.data);

          const tarifasDeTipo = respTarifas.data.filter(
            (t) => t.tipo_control === tipoControl,
          );
          if (tarifasDeTipo.length > 0) {
            const lastTarifa = tarifasDeTipo.reduce((prev, current) =>
              prev.id > current.id ? prev : current,
            );
            setIdTarifa(lastTarifa.id.toString());
          } else {
            setIdTarifa(null);
          }
        }

        // Minas
        const respMinas = await AuxService.get_minas();
        if (respMinas.success) {
          setMinas(
            respMinas.data.map((m: { id_mina: string | number; nombre: string }) => ({
              value: m.id_mina.toString(),
              label: m.nombre,
            })),
          );
        }

        // Clientes
        const respClientes = await ClientesService.getClientes();
        if (Array.isArray(respClientes)) {
          setClientes(
            respClientes.map((c: { id_cliente: string | number; razon_social: string }) => ({
              value: c.id_cliente.toString(),
              label: c.razon_social,
            })),
          );
        }

        // Lotes Mineral
        const respLotes = await AuxService.get_lotes_mineral();
        if (respLotes.success) {
          setLotesMineral(
            respLotes.data.map((lm: { id_lote_mineral: string | number; codigo: string }) => ({
              value: lm.id_lote_mineral.toString(),
              label: lm.codigo,
            })),
          );
        }

        // Lecturas/Items iniciales segun tipo
        if (tipoControl === "horometro") {
          // Bulk: poblar el primer item con el ultimo horometro
          const resp = await ControlUsoService.getUltimoHorometro(idActivoFijo);
          const horometroSugerido: number | "" = resp.success
            ? resp.data.ultimo_horometro || ""
            : "";
          setItems([
            {
              id: generarIdItem(),
              horaInicioStr: "08:00",
              horaFinStr: "10:00",
              lecturaInicio: horometroSugerido,
              lecturaFin: "",
              observacion: "",
            },
          ]);
        } else if (tipoControl === "vueltas") {
          // Bulk: primer item con 0 vueltas / sacos opcionales
          setItemsVueltas([
            {
              id: generarIdItem(),
              cantidadVueltas: 0,
              cantidadSacos: "",
              horometroInicio: "",
              horometroFin: "",
              observacion: "",
            },
          ]);
        } else if (tipoControl === "odometro") {
          const resp = await ControlUsoService.getUltimoOdometro(idActivoFijo);
          if (resp.success) {
            setLecturaInicio(resp.data.ultimo_odometro);
            setLecturaFin(0);
          }
        }
      } catch (err) {
        console.error(err);
        notifyError("Error cargando datos iniciales");
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [idActivoFijo, tipoControl, notifyError]);

  // Cuando cambia la mina, cargar labores
  useEffect(() => {
    if (idMina) {
      const fetchLab = async () => {
        try {
          const resp = await MinasService.getLabores(Number(idMina));
          if (resp.success) {
            setLabores(
              resp.data.map((l: { id_labor: string | number; nombre: string | null }) => ({
                value: l.id_labor.toString(),
                label: l.nombre || "Sin nombre",
              })),
            );
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchLab();
    } else {
      setLabores([]);
      setIdLabor(null);
    }
  }, [idMina]);

  // Dynamic naming segun tipo (single)
  const labelLectura = tipoControl === "horometro" ? "Horometro" : tipoControl === "odometro" ? "Odometro" : "Vueltas";
  const labelDiferencia = tipoControl === "vueltas" ? "Vueltas" : tipoControl === "horometro" ? "Horas" : "Km";
  const unitMeasure = tipoControl === "vueltas" ? "vuelta(s)" : tipoControl === "horometro" ? "hrs" : "Km";

  // Calculo totalUso single (solo se usa para odometro; las ramas bulk calculan por item)
  const totalUso = useMemo(() => {
    if (tipoControl === "odometro") {
      return Math.max(0, (Number(lecturaFin) || 0) - (Number(lecturaInicio) || 0));
    }
    return 0;
  }, [
    tipoControl,
    lecturaInicio,
    lecturaFin,
  ]);

  const costoTotal = useMemo(() => {
    return totalUso * precioUnitario;
  }, [totalUso, precioUnitario]);

  // Calculos por item (bulk horometro)
  const calculosPorItem = useMemo(() => {
    return items.map((it) => {
      if (!fechaDia || !it.horaInicioStr || !it.horaFinStr) {
        return { totalHoras: 0, costoTotal: 0 };
      }
      const baseDate = dayjs(fechaDia).format("YYYY-MM-DD");
      const dtInicio = dayjs(`${baseDate} ${it.horaInicioStr}`);
      let dtFin = dayjs(`${baseDate} ${it.horaFinStr}`);
      if (!dtInicio.isValid() || !dtFin.isValid()) {
        return { totalHoras: 0, costoTotal: 0 };
      }
      if (dtFin.isBefore(dtInicio) || dtFin.isSame(dtInicio)) {
        dtFin = dtFin.add(1, "day");
      }
      const diffSecs = dtFin.diff(dtInicio, "second");
      if (diffSecs <= 0) {
        return { totalHoras: 0, costoTotal: 0 };
      }
      const totalHoras = Math.round((diffSecs / 3600) * 100) / 100;
      const costoTotalCalc = Math.round(totalHoras * (precioUnitario || 0) * 100) / 100;
      return { totalHoras, costoTotal: costoTotalCalc };
    });
  }, [items, fechaDia, precioUnitario]);

  const totalGeneral = useMemo(() => {
    return calculosPorItem.reduce(
      (acc, c) => ({
        horas: acc.horas + (c.totalHoras || 0),
        costo: acc.costo + (c.costoTotal || 0),
      }),
      { horas: 0, costo: 0 },
    );
  }, [calculosPorItem]);

  // Handlers bulk horometro
  const formatHora = (val: string): string => {
    const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(val ?? "");
    return match ? `${match[1]}:${match[2]}` : "";
  };

  const actualizarItem = (
    id: string,
    campo: keyof Omit<ItemForm, "id">,
    valor: string | number | "",
  ) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [campo]: valor } : it)),
    );
  };

  const agregarItem = () => {
    const ultimo = items[items.length - 1];
    const horometroSugerido: number | "" =
      ultimo && ultimo.lecturaFin !== "" ? Number(ultimo.lecturaFin) : "";
    setItems((prev) => [
      ...prev,
      {
        id: generarIdItem(),
        horaInicioStr: "08:00",
        horaFinStr: "10:00",
        lecturaInicio: horometroSugerido,
        lecturaFin: "",
        observacion: "",
      },
    ]);
  };

  const quitarItem = (id: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));
  };

  // Calculos por item (bulk vueltas)
  const calculosPorItemVueltas = useMemo(() => {
    return itemsVueltas.map((it) => {
      const vueltas = Number(it.cantidadVueltas) || 0;
      const sacos = Number(it.cantidadSacos) || 0;
      const costo = vueltas * (precioUnitario || 0);
      return { vueltas, sacos, costo };
    });
  }, [itemsVueltas, precioUnitario]);

  const totalGeneralVueltas = useMemo(() => {
    return calculosPorItemVueltas.reduce(
      (acc, c) => ({
        vueltas: acc.vueltas + (c.vueltas || 0),
        sacos: acc.sacos + (c.sacos || 0),
        costo: acc.costo + (c.costo || 0),
      }),
      { vueltas: 0, sacos: 0, costo: 0 },
    );
  }, [calculosPorItemVueltas]);

  const actualizarItemVueltas = (
    id: string,
    campo: keyof Omit<ItemVueltasForm, "id">,
    valor: number | "" | string,
  ) => {
    setItemsVueltas((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [campo]: valor } : it)),
    );
  };

  const agregarItemVueltas = () => {
    setItemsVueltas((prev) => [
      ...prev,
      {
        id: generarIdItem(),
        cantidadVueltas: 0,
        cantidadSacos: esTarifaSaco ? 0 : "",
        horometroInicio: "",
        horometroFin: "",
        observacion: "",
      },
    ]);
  };

  const quitarItemVueltas = (id: string) => {
    setItemsVueltas((prev) =>
      prev.length > 1 ? prev.filter((it) => it.id !== id) : prev,
    );
  };

  // Enriquecer un log nuevo con los labels locales de catalogos
  const enriquecerLog = (log: RES_ControlUsoLog): RES_ControlUsoLog => {
    const e = { ...log };
    if (idMina) e.mina = minas.find((m) => m.value === String(idMina))?.label || null;
    if (idLabor) e.labor = labores.find((l) => l.value === String(idLabor))?.label || null;
    if (idLoteMineral)
      e.lote_mineral =
        lotesMineral.find((lm) => lm.value === String(idLoteMineral))?.label || null;
    if (idCliente)
      e.cliente = clientes.find((c) => c.value === String(idCliente))?.label || null;
    return e;
  };

  // Enriquecido adicional para vueltas (tarifa_desc, tipo_material, etc.)
  const enriquecerLogVueltas = (log: RES_ControlUsoLog): RES_ControlUsoLog => {
    const e = { ...log };
    if (idTarifa) {
      const t = tarifas.find((tar) => tar.id === Number(idTarifa));
      if (t) {
        e.tarifa_desc = t.descripcion;
        e.tipo_material = t.tipo_material;
        e.tarifa_material = t.tipo_material;
        e.tarifa_distancia_metros = t.distancia_metros;
      }
    }
    return e;
  };

  // Submit: ramifica segun tipoControl
  const handleSubmit = async () => {
    if (!idActivoFijo) {
      notifyError("Por favor seleccione un activo fijo.");
      return;
    }

    // ===== Validaciones comunes =====
    if (tipoControl === "vueltas" && !idMina) {
      notifyError("La mina es obligatoria para registrar un control por vueltas.");
      return;
    }
    if (tipoControl === "vueltas" && !idLabor) {
      notifyError("La labor es obligatoria para registrar un control por vueltas.");
      return;
    }

    if (tipoControl === "horometro") {
      if (!fechaDia) {
        notifyError("Por favor seleccione la fecha del trabajo.");
        return;
      }
      // Validacion de cada item
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const idx = i + 1;
        if (!it.horaInicioStr || !it.horaFinStr) {
          notifyError(`Bloque #${idx}: complete las horas de inicio y fin.`);
          return;
        }
        if (calculosPorItem[i].totalHoras <= 0) {
          notifyError(
            `Bloque #${idx}: la hora de fin debe ser posterior a la hora de inicio.`,
          );
          return;
        }
        if (
          it.lecturaInicio !== "" &&
          it.lecturaFin !== "" &&
          Number(it.lecturaFin) <= Number(it.lecturaInicio)
        ) {
          notifyError(
            `Bloque #${idx}: el horometro final no puede ser menor o igual al inicial.`,
          );
          return;
        }
      }
    }

    if (tipoControl === "vueltas") {
      // Validacion cabecera
      if (!idMina) {
        notifyError("La mina es obligatoria para registrar un control por vueltas.");
        return;
      }
      if (!idLabor) {
        notifyError("La labor es obligatoria para registrar un control por vueltas.");
        return;
      }
      // Validacion por item
      for (let i = 0; i < itemsVueltas.length; i++) {
        const it = itemsVueltas[i];
        const idx = i + 1;
        if (Number(it.cantidadVueltas) <= 0) {
          notifyError(`Bloque #${idx}: la cantidad de vueltas debe ser mayor a cero.`);
          return;
        }
        if (
          esTarifaSaco &&
          (it.cantidadSacos === "" || Number(it.cantidadSacos) <= 0)
        ) {
          notifyError(`Bloque #${idx}: la cantidad de sacos es obligatoria.`);
          return;
        }
        if (
          it.horometroInicio !== "" &&
          it.horometroFin !== "" &&
          Number(it.horometroFin) <= Number(it.horometroInicio)
        ) {
          notifyError(
            `Bloque #${idx}: el horometro final no puede ser menor o igual al inicial.`,
          );
          return;
        }
      }
    }

    if (
      tipoControl === "odometro" &&
      (Number(lecturaFin) || 0) < (Number(lecturaInicio) || 0)
    ) {
      notifyError(
        `La lectura final del ${labelLectura} no puede ser menor a la lectura inicial.`,
      );
      return;
    }

    setSaving(true);
    try {
      // ===== Bulk horometro =====
      if (tipoControl === "horometro") {
        const payload = {
          id_activo_fijo: idActivoFijo,
          fecha_trabajo: dayjs(fechaDia).format("YYYY-MM-DD"),
          id_tarifa: idTarifa ? Number(idTarifa) : null,
          precio_unitario: precioUnitario,
          es_para_mina: esParaMina,
          id_mina: esParaMina && idMina ? Number(idMina) : null,
          id_labor: esParaMina && idLabor ? Number(idLabor) : null,
          id_cliente: !esParaMina && idCliente ? Number(idCliente) : null,
          id_lote_mineral: idLoteMineral ? Number(idLoteMineral) : null,
          tipo_carga: tipoCarga || null,
          items: items.map((it) => ({
            hora_inicio: it.horaInicioStr,
            hora_fin: it.horaFinStr,
            horometro_inicio:
              it.lecturaInicio === "" || it.lecturaInicio === null
                ? null
                : Number(it.lecturaInicio),
            horometro_fin:
              it.lecturaFin === "" || it.lecturaFin === null
                ? null
                : Number(it.lecturaFin),
            observacion: it.observacion.trim() ? it.observacion.trim() : null,
          })),
        };

        const resp = await ControlUsoService.registrarUsoBulk(payload);
        if (resp.success) {
          const enriched = (resp.data as RES_ControlUsoLog[]).map(enriquecerLog);
          onSuccess(enriched);
        } else {
          notifyError(resp.message || "Error al registrar los controles de uso");
        }
        return;
      }

      // ===== Bulk vueltas =====
      if (tipoControl === "vueltas") {
        const payload = {
          id_activo_fijo: idActivoFijo,
          id_tarifa: idTarifa ? Number(idTarifa) : null,
          precio_unitario: precioUnitario,
          id_mina: Number(idMina),
          id_labor: Number(idLabor),
          items: itemsVueltas.map((it) => ({
            cantidad_vueltas: Number(it.cantidadVueltas),
            cantidad_sacos:
              esTarifaSaco && it.cantidadSacos !== "" && it.cantidadSacos !== null
                ? Number(it.cantidadSacos)
                : null,
            horometro_inicio:
              it.horometroInicio === "" || it.horometroInicio === null
                ? null
                : Number(it.horometroInicio),
            horometro_fin:
              it.horometroFin === "" || it.horometroFin === null
                ? null
                : Number(it.horometroFin),
            observacion: it.observacion.trim() ? it.observacion.trim() : null,
          })),
        };

        const resp = await ControlUsoService.registrarUsoBulkVueltas(payload);
        if (resp.success) {
          const enriched = (resp.data as RES_ControlUsoLog[]).map((l) =>
            enriquecerLogVueltas(enriquecerLog(l)),
          );
          onSuccess(enriched);
        } else {
          notifyError(resp.message || "Error al registrar los controles de uso");
        }
        return;
      }

      // ===== Single (odometro) =====
      const dtInicioStr = dayjs().format("YYYY-MM-DD HH:mm:ss");
      const dtFinStr: string | null = null;

      const resp = await ControlUsoService.registrarUso({
        id_activo_fijo: idActivoFijo,
        fecha_hora_inicio_control: dtInicioStr,
        fecha_hora_fin_control: dtFinStr,

        horometro_inicio: undefined,
        horometro_fin: undefined,
        odometro_inicio: Number(lecturaInicio) || 0,
        odometro_fin: Number(lecturaFin) || 0,
        cantidad_vueltas: undefined,
        cantidad_sacos: undefined,

        precio_unitario: precioUnitario,
        id_tarifa: idTarifa ? Number(idTarifa) : undefined,

        es_para_mina: undefined,
        id_mina: undefined,
        id_labor: undefined,
        id_lote_mineral: undefined,
        id_cliente: undefined,
        tipo_carga: undefined,

        observacion: observacion ? observacion.trim() : null,
      });

      if (resp.success) {
        onSuccess([enriquecerLog(resp.data)]);
      } else {
        notifyError(resp.message || "Error al registrar el control de uso");
      }
    } catch (err) {
      notifyError("Error de conexion al guardar los registros.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap="md" className="p-1">
      {/* Asset card (cabecera) */}
      <div className="relative overflow-hidden bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 flex gap-3.5 transition-all">
        <div className="absolute -right-8 -top-8 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center justify-center shrink-0 w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
          {tipoControl === "horometro" ? (
            <Cog8ToothIcon className="w-5 h-5 text-indigo-400" />
          ) : tipoControl === "odometro" ? (
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
            <Badge size="xs" color="pink" variant="light" className="font-bold shrink-0 border border-pink-500/10">
              {asset.correlativo}
            </Badge>
          </div>
          <Text size="sm" fw={800} className="text-white leading-snug truncate">
            {asset.producto}
          </Text>
          {(asset.almacen || asset.mina) && (
            <Text size="10px" className="text-zinc-500 mt-1.5 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500/50 animate-pulse" />
              <span className="font-medium">Ubicacion:</span>
              <span className="text-zinc-400 font-semibold truncate">
                {asset.almacen || asset.mina}
              </span>
            </Text>
          )}
        </div>
      </div>

      {/* Tarifa de Uso (cabecera) */}
      <SimpleGrid cols={1} spacing="md">
        <Group gap={6} align="flex-end" wrap="nowrap">
          <Select
            className="flex-1"
            label="Tarifa de Uso"
            placeholder="Seleccione tarifa..."
            data={tarifas
              .filter((t) => t.tipo_control === tipoControl)
              .map((t) => {
                const esSaco = (t.tipo_material || "").toLowerCase().includes("saco");
                if (tipoControl === "vueltas") {
                  const parts = [
                    esSaco ? "Sin precio" : `S/. ${Number(t.precio_unitario).toFixed(2)}`,
                    t.distancia_metros ? `x ${t.distancia_metros}m` : null,
                    t.tipo_material ? `x ${t.tipo_material}` : null,
                  ].filter(Boolean);
                  return { value: t.id.toString(), label: parts.join(" ") };
                }
                return {
                  value: t.id.toString(),
                  label: [
                    `S/. ${Number(t.precio_unitario).toFixed(2)}`,
                    t.tipo_material ? `x ${t.tipo_material}` : null,
                    t.descripcion ? `- ${t.descripcion}` : null,
                  ].filter(Boolean).join(" "),
                };
              })}
            classNames={fieldClasses}
            value={idTarifa}
            onChange={setIdTarifa}
            searchable
            clearable
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
      </SimpleGrid>

      {/* Bloque Horometro: Bulk (N items) */}
      {tipoControl === "horometro" ? (
        <Stack gap="sm">
          <CustomDatePicker
            label="Fecha del Trabajo"
            placeholder="Seleccione fecha"
            value={fechaDia}
            onChange={(val) => setFechaDia(val as Date | null)}
            radius="lg"
            size="xs"
          />

          <Select
            label="Lote Mineral (Opc.)"
            placeholder="Seleccione lote de mineral..."
            data={lotesMineral}
            value={idLoteMineral}
            onChange={setIdLoteMineral}
            searchable
            clearable
            classNames={fieldClasses}
            radius="lg"
            size="xs"
          />

          {/* Destino del Trabajo (cabecera del bulk) */}
          <Card withBorder padding="md" radius="lg" className="bg-zinc-950/20 border-zinc-800/60">
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
                    placeholder="Seleccione labor"
                    data={labores}
                    value={idLabor}
                    onChange={setIdLabor}
                    searchable
                    clearable
                    disabled={!idMina}
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

          <Select
            label="Tipo de Carga"
            placeholder="Seleccione..."
            data={["Arrumaje de Mineral", "Carguio de Mineral"]}
            value={tipoCarga}
            onChange={setTipoCarga}
            clearable
            classNames={fieldClasses}
            radius="lg"
            size="xs"
          />

          {/* Items: N bloques de horario */}
          <Stack gap="sm">
            {items.map((it, idx) => (
              <Card
                key={it.id}
                withBorder
                padding="md"
                radius="lg"
                className="bg-zinc-950/40 border-zinc-800"
              >
                <Group justify="space-between" align="center" mb="sm" wrap="nowrap">
                  <Group gap="xs" wrap="nowrap">
                    <Badge color="indigo" variant="light" size="sm" radius="sm">
                      Bloque #{idx + 1}
                    </Badge>
                    <Text size="xs" c="zinc.500" fw={600}>
                      Horario independiente
                    </Text>
                  </Group>
                  {items.length > 1 && (
                    <Tooltip label="Quitar bloque">
                      <ActionIcon
                        onClick={() => quitarItem(it.id)}
                        variant="subtle"
                        color="red"
                        size="sm"
                        radius="xl"
                        aria-label={`Quitar bloque ${idx + 1}`}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>

                <SimpleGrid cols={2} spacing="md">
                  <div>
                    <TimeInput
                      ref={(el) => {
                        refInicioRefs.current[it.id] = el;
                      }}
                      label="Hora Inicio"
                      placeholder="08:00"
                      value={it.horaInicioStr}
                      onChange={(event) => {
                        actualizarItem(it.id, "horaInicioStr", formatHora(event.currentTarget.value));
                      }}
                      onClick={() => refInicioRefs.current[it.id]?.showPicker?.()}
                      classNames={fieldClasses}
                      size="xs"
                      radius="lg"
                      required
                    />
                    {it.horaInicioStr && (
                      <Text size="10px" c="blue.4" fw={700} mt={3} className="ml-1">
                        ({dayjs(`2000-01-01 ${it.horaInicioStr}`).format("hh:mm A")})
                      </Text>
                    )}
                  </div>

                  <div>
                    <TimeInput
                      ref={(el) => {
                        refFinRefs.current[it.id] = el;
                      }}
                      label="Hora Fin"
                      placeholder="10:00"
                      value={it.horaFinStr}
                      onChange={(event) => {
                        actualizarItem(it.id, "horaFinStr", formatHora(event.currentTarget.value));
                      }}
                      onClick={() => refFinRefs.current[it.id]?.showPicker?.()}
                      classNames={fieldClasses}
                      size="xs"
                      radius="lg"
                      required
                    />
                    {it.horaFinStr && (
                      <Text size="10px" c="blue.4" fw={700} mt={3} className="ml-1">
                        ({dayjs(`2000-01-01 ${it.horaFinStr}`).format("hh:mm A")})
                        {it.horaInicioStr &&
                          it.horaFinStr &&
                          dayjs(`2000-01-01 ${it.horaFinStr}`).isBefore(
                            dayjs(`2000-01-01 ${it.horaInicioStr}`),
                          ) && (
                            <span className="text-amber-400 font-bold ml-1">(Dia siguiente)</span>
                          )}
                      </Text>
                    )}
                  </div>
                </SimpleGrid>

                <SimpleGrid cols={2} spacing="md" mt="sm" className="opacity-85">
                  <NumberInput
                    label="Horometro Inicial (Opc.)"
                    placeholder="Ej: 1250.00"
                    value={it.lecturaInicio}
                    onChange={(val) => actualizarItem(it.id, "lecturaInicio", val as number | "")}
                    min={0}
                    decimalScale={2}
                    fixedDecimalScale
                    classNames={fieldClasses}
                    size="xs"
                    radius="lg"
                    disabled={loadingData}
                  />
                  <NumberInput
                    label="Horometro Final (Opc.)"
                    placeholder="Ej: 1252.00"
                    value={it.lecturaFin}
                    onChange={(val) => actualizarItem(it.id, "lecturaFin", val as number | "")}
                    min={0}
                    decimalScale={2}
                    fixedDecimalScale
                    classNames={fieldClasses}
                    size="xs"
                    radius="lg"
                    disabled={loadingData}
                  />
                </SimpleGrid>

                <Textarea
                  label="Observacion"
                  placeholder="Notas u observaciones de este bloque (opcional)..."
                  value={it.observacion}
                  onChange={(e) => actualizarItem(it.id, "observacion", e.currentTarget.value)}
                  classNames={fieldClasses}
                  size="xs"
                  radius="lg"
                  minRows={2}
                  mt="sm"
                />

                <SimpleGrid cols={2} spacing="md" mt="md">
                  <Group gap={6} align="center" wrap="nowrap">
                    <ClockIcon className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div className="min-w-0">
                      <Text size="9px" c="zinc.500" fw={900} tt="uppercase" lts="0.08em">
                        Total Horas
                      </Text>
                      <Text size="md" fw={800} className="text-indigo-300">
                        {calculosPorItem[idx]?.totalHoras?.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }) ?? "0.00"}{" "}
                        <span className="text-[10px] text-zinc-500 italic font-medium">hrs</span>
                      </Text>
                    </div>
                  </Group>
                  <Group gap={6} align="center" wrap="nowrap" justify="flex-end">
                    <BanknotesIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="min-w-0 text-right">
                      <Text size="9px" c="zinc.500" fw={900} tt="uppercase" lts="0.08em">
                        Costo Operativo
                      </Text>
                      <Text size="md" fw={800} className="text-emerald-300">
                        S/.{" "}
                        {calculosPorItem[idx]?.costoTotal?.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }) ?? "0.00"}
                      </Text>
                    </div>
                  </Group>
                </SimpleGrid>
              </Card>
            ))}

            <Button
              variant="light"
              color="indigo"
              size="sm"
              radius="lg"
              leftSection={<PlusCircleIcon className="w-5 h-5" />}
              onClick={agregarItem}
              disabled={saving}
              className="border border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/15 text-indigo-300 font-bold"
            >
              Anadir control
            </Button>
          </Stack>

          {items.length > 1 && (
            <Card withBorder padding="sm" radius="lg" className="bg-zinc-950/60 border-indigo-500/30">
              <Group justify="space-between" align="center" wrap="wrap">
                <Group gap="xs">
                  <Badge size="sm" color="indigo" variant="filled" radius="sm">
                    {items.length} controles
                  </Badge>
                  <Text size="xs" c="zinc.400" fw={600}>
                    Total general
                  </Text>
                </Group>
                <Group gap="lg">
                  <Group gap={6}>
                    <Text size="10px" c="zinc.500" tt="uppercase" fw={900}>
                      Horas
                    </Text>
                    <Text size="sm" fw={800} className="text-indigo-300">
                      {totalGeneral.horas.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      <span className="text-[10px] text-zinc-500 italic">hrs</span>
                    </Text>
                  </Group>
                  <Group gap={6}>
                    <Text size="10px" c="zinc.500" tt="uppercase" fw={900}>
                      Costo
                    </Text>
                    <Text size="sm" fw={800} className="text-emerald-300">
                      S/.{" "}
                      {totalGeneral.costo.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                  </Group>
                </Group>
              </Group>
            </Card>
          )}
        </Stack>
      ) : tipoControl === "odometro" ? (
        // ===== Single: Odometro (intacto, original) =====
        <SimpleGrid cols={2} spacing="md">
          <NumberInput
            label={`${labelLectura} Inicial`}
            value={lecturaInicio}
            onChange={(val) => setLecturaInicio(val as number | "")}
            min={0}
            decimalScale={2}
            fixedDecimalScale
            required
            size="xs"
            radius="lg"
            disabled={loadingData}
          />
          <NumberInput
            label={`${labelLectura} Final`}
            value={lecturaFin}
            onChange={(val) => setLecturaFin(val as number | "")}
            min={0}
            decimalScale={2}
            fixedDecimalScale
            required
            size="xs"
            radius="lg"
            disabled={loadingData}
          />
        </SimpleGrid>
      ) : (
        // ===== Bulk: Vueltas (cabecera + N items, mismo patron que horometro) =====
        <Stack gap="sm">
          {/* Cabecera de bloque: Mina* y Labor (compartidos por todos los items) */}
          <Card withBorder padding="md" radius="lg" className="bg-zinc-950/20 border-zinc-800/60">
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
          </Card>

          {/* Items: N bloques de vueltas */}
          <Stack gap="sm">
            {itemsVueltas.map((it, idx) => (
              <Card
                key={it.id}
                withBorder
                padding="md"
                radius="lg"
                className="bg-zinc-950/40 border-zinc-800"
              >
                <Group justify="space-between" align="center" mb="sm" wrap="nowrap">
                  <Group gap="xs" wrap="nowrap">
                    <Badge color="indigo" variant="light" size="sm" radius="sm">
                      Bloque #{idx + 1}
                    </Badge>
                    <Text size="xs" c="zinc.500" fw={600}>
                      Viaje independiente
                    </Text>
                  </Group>
                  {itemsVueltas.length > 1 && (
                    <Tooltip label="Quitar bloque">
                      <ActionIcon
                        onClick={() => quitarItemVueltas(it.id)}
                        variant="subtle"
                        color="red"
                        size="sm"
                        radius="xl"
                        aria-label={`Quitar bloque ${idx + 1}`}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>

                <SimpleGrid cols={esTarifaSaco ? 2 : 1} spacing="md">
                  <NumberInput
                    label="Cantidad de Vueltas"
                    placeholder="Ej: 3"
                    value={it.cantidadVueltas}
                    onChange={(val) => actualizarItemVueltas(it.id, "cantidadVueltas", val as number | "")}
                    min={0}
                    decimalScale={0}
                    fixedDecimalScale
                    required
                    classNames={fieldClasses}
                    size="xs"
                    radius="lg"
                  />
                  {esTarifaSaco && (
                    <NumberInput
                      label="Cantidad de Sacos"
                      placeholder="Ej: 30"
                      value={it.cantidadSacos}
                      onChange={(val) => actualizarItemVueltas(it.id, "cantidadSacos", val as number | "")}
                      min={0}
                      allowDecimal={false}
                      required
                      classNames={fieldClasses}
                      size="xs"
                      radius="lg"
                    />
                  )}
                </SimpleGrid>

                <SimpleGrid cols={2} spacing="md" mt="sm" className="opacity-85">
                  <NumberInput
                    label="Horometro Inicial (Opc.)"
                    placeholder="Ej: 1250.00"
                    value={it.horometroInicio}
                    onChange={(val) => actualizarItemVueltas(it.id, "horometroInicio", val as number | "")}
                    min={0}
                    decimalScale={2}
                    fixedDecimalScale
                    classNames={fieldClasses}
                    size="xs"
                    radius="lg"
                  />
                  <NumberInput
                    label="Horometro Final (Opc.)"
                    placeholder="Ej: 1252.00"
                    value={it.horometroFin}
                    onChange={(val) => actualizarItemVueltas(it.id, "horometroFin", val as number | "")}
                    min={0}
                    decimalScale={2}
                    fixedDecimalScale
                    classNames={fieldClasses}
                    size="xs"
                    radius="lg"
                  />
                </SimpleGrid>

                <Textarea
                  label="Observacion"
                  placeholder="Notas u observaciones de este bloque (opcional)..."
                  value={it.observacion}
                  onChange={(e) => actualizarItemVueltas(it.id, "observacion", e.currentTarget.value)}
                  classNames={fieldClasses}
                  size="xs"
                  radius="lg"
                  minRows={2}
                  mt="sm"
                />

                <SimpleGrid cols={2} spacing="md" mt="md">
                  <Group gap={6} align="center" wrap="nowrap">
                    <ArrowPathRoundedSquareIcon className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div className="min-w-0">
                      <Text size="9px" c="zinc.500" fw={900} tt="uppercase" lts="0.08em">
                        Total Vueltas
                      </Text>
                      <Text size="md" fw={800} className="text-indigo-300">
                        {calculosPorItemVueltas[idx]?.vueltas?.toLocaleString() ?? "0"}{" "}
                        <span className="text-[10px] text-zinc-500 italic font-medium">vuelta(s)</span>
                      </Text>
                    </div>
                  </Group>
                  <Group gap={6} align="center" wrap="nowrap" justify="flex-end">
                    <BanknotesIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="min-w-0 text-right">
                      <Text size="9px" c="zinc.500" fw={900} tt="uppercase" lts="0.08em">
                        Costo Operativo
                      </Text>
                      <Text size="md" fw={800} className="text-emerald-300">
                        S/.{" "}
                        {calculosPorItemVueltas[idx]?.costo?.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }) ?? "0.00"}
                      </Text>
                    </div>
                  </Group>
                </SimpleGrid>
              </Card>
            ))}

            <Button
              variant="light"
              color="indigo"
              size="sm"
              radius="lg"
              leftSection={<PlusCircleIcon className="w-5 h-5" />}
              onClick={agregarItemVueltas}
              disabled={saving}
              className="border border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/15 text-indigo-300 font-bold"
            >
              Anadir control
            </Button>
          </Stack>

          {itemsVueltas.length > 1 && (
            <Card withBorder padding="sm" radius="lg" className="bg-zinc-950/60 border-indigo-500/30">
              <Group justify="space-between" align="center" wrap="wrap">
                <Group gap="xs">
                  <Badge size="sm" color="indigo" variant="filled" radius="sm">
                    {itemsVueltas.length} controles
                  </Badge>
                  <Text size="xs" c="zinc.400" fw={600}>
                    Total general
                  </Text>
                </Group>
                <Group gap="lg">
                  <Group gap={6}>
                    <Text size="10px" c="zinc.500" tt="uppercase" fw={900}>
                      Vueltas
                    </Text>
                    <Text size="sm" fw={800} className="text-indigo-300">
                      {totalGeneralVueltas.vueltas.toLocaleString()}{" "}
                      <span className="text-[10px] text-zinc-500 italic">vlts</span>
                    </Text>
                  </Group>
                  {esTarifaSaco && (
                    <Group gap={6}>
                      <Text size="10px" c="zinc.500" tt="uppercase" fw={900}>
                        Sacos
                      </Text>
                      <Text size="sm" fw={800} className="text-amber-300">
                        {totalGeneralVueltas.sacos.toLocaleString()}
                      </Text>
                    </Group>
                  )}
                  <Group gap={6}>
                    <Text size="10px" c="zinc.500" tt="uppercase" fw={900}>
                      Costo
                    </Text>
                    <Text size="sm" fw={800} className="text-emerald-300">
                      S/.{" "}
                      {totalGeneralVueltas.costo.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                  </Group>
                </Group>
              </Group>
            </Card>
          )}
        </Stack>
      )}

      {/* Tarjeta de total y costo (solo single: odometro) */}
      {tipoControl === "odometro" && (
        <Card
          withBorder
          padding="sm"
          radius="lg"
          className="bg-zinc-950/40 border-zinc-800"
        >
          <Group justify="space-between" align="center">
            <Stack gap={2}>
              <Text size="xs" c="zinc.400" fw={600}>
                Total {labelDiferencia}
              </Text>
              <Group gap={6}>
                <Text size="xl" fw={800} className="text-indigo-400">
                  {totalUso.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
                <Text size="xs" c="zinc.500" className="mt-1.5 italic">
                  {unitMeasure}
                </Text>
              </Group>
            </Stack>

            <Stack gap={2} align="flex-end">
              <Text size="xs" c="zinc.400" fw={600}>
                Costo Operativo Total
              </Text>
              <Badge
                size="lg"
                variant="gradient"
                gradient={{ from: "indigo.5", to: "indigo.8" }}
                radius="lg"
                fw={800}
                h={32}
                className="px-4"
              >
                S/.{" "}
                {costoTotal.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Badge>
            </Stack>
          </Group>
        </Card>
      )}

      {/* Observacion (solo single: odometro; la rama bulk de vueltas tiene observacion por bloque) */}
      {tipoControl === "odometro" && (
        <Textarea
          label="Observacion"
          placeholder="Ingrese notas u observaciones..."
          value={observacion}
          onChange={(e) => setObservacion(e.currentTarget.value)}
          classNames={fieldClasses}
          size="xs"
          radius="lg"
          minRows={2}
        />
      )}

      {/* Acciones */}
      <Group justify="flex-end" mt="lg" gap="xs">
        <Button variant="subtle" color="zinc.5" onClick={onCancel} disabled={saving} size="xs" radius="lg">
          Cancelar
        </Button>
        <Button color="indigo" onClick={handleSubmit} loading={saving} size="xs" radius="lg">
          {tipoControl === "horometro" && items.length > 1
            ? `Guardar ${items.length} Controles`
            : tipoControl === "vueltas" && itemsVueltas.length > 1
              ? `Guardar ${itemsVueltas.length} Controles`
              : "Guardar Control"}
        </Button>
      </Group>

      {/* Modal tarifas (intacto) */}
      <ModalEstandar
        opened={modalTarifaOpened}
        close={() => setModalTarifaOpened(false)}
        title={`Tarifas por uso - ${tipoControl.charAt(0).toUpperCase() + tipoControl.slice(1)}`}
        size="sm"
      >
        <NuevaTarifaModal
          asset={asset}
          initialTipoControl={tipoControl}
          onCancel={() => setModalTarifaOpened(false)}
          onSuccess={async (nuevaTarifa) => {
            try {
              const respTarifas = await ControlUsoService.getTarifas(idActivoFijo);
              if (respTarifas.success) {
                setTarifas(respTarifas.data);
              } else {
                setTarifas((prev) => [...prev, nuevaTarifa]);
              }
            } catch {
              setTarifas((prev) => [...prev, nuevaTarifa]);
            }
            setIdTarifa(nuevaTarifa.id.toString());
            setModalTarifaOpened(false);
          }}
        />
      </ModalEstandar>

      {/* Historial de Tarifas Modal (intacto) */}
      <ModalEstandar
        opened={modalHistorialOpened}
        close={() => setModalHistorialOpened(false)}
        title={`Historial de Tarifas - ${tipoControl.charAt(0).toUpperCase() + tipoControl.slice(1)}`}
        size="xl"
      >
        <div className="mt-2 h-[350px]">
          <DataTableEstandar
            idAccessor="id"
            loading={false}
            records={tarifas
              .filter((t) => t.tipo_control === tipoControl)
              .sort((a, b) => b.id - a.id)}
            columns={[
              {
                accessor: "id",
                title: "#",
                width: 50,
                render: (_record, index) => (
                  <span className="text-zinc-500 text-xs font-mono">{(index ?? 0) + 1}</span>
                ),
              },
              {
                accessor: "precio_unitario",
                title: "Precio Unit.",
                render: (record) => {
                  if (Number(record.precio_unitario) === 0) {
                    return <span className="text-zinc-600 text-xs italic">Sin precio</span>;
                  }
                  return (
                    <Badge color="violet" variant="filled" size="sm" radius="sm">
                      S/. {Number(record.precio_unitario).toFixed(2)}
                    </Badge>
                  );
                },
              },
              // Columna Distancia: solo en Vueltas
              ...(tipoControl === "vueltas"
                ? [
                    {
                      accessor: "distancia_metros",
                      title: "Distancia hasta",
                      render: (record: (typeof tarifas)[0]) =>
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
              ...(tipoControl === "vueltas"
                ? [
                    {
                      accessor: "tipo_material",
                      title: "Material",
                      render: (record: (typeof tarifas)[0]) =>
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
                    <span className="text-zinc-400 text-xs">{record.descripcion}</span>
                  ) : (
                    <span className="text-zinc-600 text-xs italic">Sin descripcion</span>
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
  );
};

export default RegistroUso;