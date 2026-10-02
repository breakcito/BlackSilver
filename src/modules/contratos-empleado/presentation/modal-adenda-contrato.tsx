import { useState, useEffect, useMemo } from "react";
import {
  Stack,
  Group,
  Select,
  Switch,
  Button,
  NumberInput,
  TextInput,
  Text,
  Divider,
  Textarea,
  Card,
  ActionIcon,
  Alert,
} from "@mantine/core";
import {
  BriefcaseIcon,
  MapPinIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  BanknotesIcon,
  ClockIcon,
  UserCircleIcon,
  PlusIcon,
  CalendarIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { CustomDatePicker } from "../../../presentation/utils/date-picker-input";
import { MultiFilePicker } from "../../../presentation/utils/archivo/multifile-picker";
import { useNotify } from "../../../hooks/useNotify";
import { useAuditoriaStore } from "../../../stores/auditoria.store";
import { ContratosEmpleadoService } from "../service/contratos-empleado.service";
import type {
  RES_ContratoEmpleado,
  RES_EmpleadoConContrato,
} from "../../../service/responses/contrato-empleado";
import type { RES_Almacen } from "../../../service/responses/almacen";
import { AuxService } from "../../../service/auxiliar.service";
import type { RES_Area, RES_Cargo } from "../../../service/responses/organigrama";
import type { RES_Labor } from "../../../service/responses/labor";
import type { RES_Empresa } from "../../../service/responses/empresa";
import type { RES_Oficina } from "../../../service/responses/oficina";
import { TipoContrato } from "../../../shared/enums/tipo-contrato";
import { RegistroArea } from "../../organigrama/presentation/registro-area";
import { RegistroCargo } from "../../organigrama/presentation/registro-cargo";
import { useRegistroArea } from "../../organigrama/hooks/useRegistroArea";
import { useRegistroCargo } from "../../organigrama/hooks/useRegistroCargo";

interface ModalAdendaContratoProps {
  contrato: RES_ContratoEmpleado;
  nombreEmpleado: string;
  opened: boolean;
  close: () => void;
  onSuccess?: (payload: {
    contrato: RES_ContratoEmpleado;
    empleado: RES_EmpleadoConContrato["empleado"];
    programaciones_ajustadas?: {
      actualizadas: number;
      divididas: number;
      creadas: number;
    };
  }) => void;
}

/**
 * Detector: ¿qué cosas cambian respecto al contrato original?
 * Sirve para mostrar banners preventivos en el modal antes de guardar.
 */
interface CambioDetectado {
  afectaSnapshot: boolean;
  afectaLugar: boolean;
  campoLabel: string;
}

function detectarCambios(
  contrato: RES_ContratoEmpleado,
  form: {
    tipoContrato: string;
    sueldoBase: number | null;
    sueldoReal: number | null;
    salarioDiario: number | null;
    idAlmacen: number | null;
    idLabor: number | null;
    idOficina: number | null;
  },
): CambioDetectado[] {
  const cambios: CambioDetectado[] = [];

  if (form.tipoContrato !== contrato.tipo_contrato) {
    cambios.push({
      afectaSnapshot: true,
      afectaLugar: false,
      campoLabel: "Tipo de Contrato",
    });
  }
  if (toNum(form.sueldoBase) !== toNum(contrato.sueldo_base)) {
    cambios.push({
      afectaSnapshot: true,
      afectaLugar: false,
      campoLabel: "Sueldo Base",
    });
  }
  if (toNum(form.sueldoReal) !== toNum(contrato.sueldo_real)) {
    cambios.push({
      afectaSnapshot: true,
      afectaLugar: false,
      campoLabel: "Sueldo Real",
    });
  }
  if (toNum(form.salarioDiario) !== toNum(contrato.salario_diario)) {
    cambios.push({
      afectaSnapshot: true,
      afectaLugar: false,
      campoLabel: "Salario Diario",
    });
  }

  const originalTipoLugar = contrato.id_almacen
    ? "almacen"
    : contrato.id_labor
      ? "labor"
      : contrato.id_oficina
        ? "oficina"
        : "";
  if (form.idAlmacen !== null) {
    if (form.idAlmacen !== contrato.id_almacen) {
      cambios.push({
        afectaSnapshot: false,
        afectaLugar: true,
        campoLabel: "Almacén",
      });
    }
  } else if (form.idLabor !== null) {
    if (form.idLabor !== contrato.id_labor) {
      cambios.push({
        afectaSnapshot: false,
        afectaLugar: true,
        campoLabel: "Labor",
      });
    }
  } else if (form.idOficina !== null) {
    if (form.idOficina !== contrato.id_oficina) {
      cambios.push({
        afectaSnapshot: false,
        afectaLugar: true,
        campoLabel: "Oficina",
      });
    }
  }
  // Silenciar warning de unused
  void originalTipoLugar;

  return cambios;
}

const toNum = (v: unknown) => {
  if (v === "" || v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const toIsoDate = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "";
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return "";
    return v.toISOString().split("T")[0];
  }
  if (typeof v === "string") return v;
  return "";
};

export const ModalAdendaContrato = ({
  contrato,
  nombreEmpleado,
  opened,
  close,
  onSuccess,
}: ModalAdendaContratoProps) => {
  const { notifySuccess, notifyError } = useNotify();
  const { en_modo_auditable } = useAuditoriaStore();

  // Catalogs state
  const [areas, setAreas] = useState<RES_Area[]>([]);
  const [todosCargos, setTodosCargos] = useState<RES_Cargo[]>([]);
  const [empresas, setEmpresas] = useState<RES_Empresa[]>([]);
  const [almacenes, setAlmacenes] = useState<RES_Almacen[]>([]);
  const [labores, setLabores] = useState<RES_Labor[]>([]);
  const [oficinas, setOficinas] = useState<RES_Oficina[]>([]);
  const [idArea, setIdArea] = useState<number | null>(null);

  // Loading states
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states prefilled with current contract
  const [idCargo, setIdCargo] = useState<number>(contrato.id_cargo);
  const [idEmpresa, setIdEmpresa] = useState<number>(contrato.id_empresa ?? 0);
  const [tipoContrato, setTipoContrato] = useState<string>(contrato.tipo_contrato);
  const [sueldoBase, setSueldoBase] = useState<number | null>(toNum(contrato.sueldo_base));
  const [sueldoReal, setSueldoReal] = useState<number | null>(toNum(contrato.sueldo_real) ?? toNum(contrato.sueldo_base));
  const [salarioDiario, setSalarioDiario] = useState<number | null>(toNum(contrato.salario_diario));
  const [fechaInicio, setFechaInicio] = useState<string>(contrato.fecha_inicio);
  const [porTiempoIndefinido, setPorTiempoIndefinido] = useState<boolean>(contrato.por_tiempo_indefinido);
  const [fechaFin, setFechaFin] = useState<string>(contrato.fecha_fin ?? "");
  const [duracion, setDuracion] = useState<number | null>(contrato.duracion);
  const [periodoDuracion, setPeriodoDuracion] = useState<string | null>(contrato.periodo_duracion);

  // Compute duracionDiasCalc automatically
  const duracionDiasCalc = useMemo(() => {
    if (!fechaInicio || !fechaFin) return null;
    const d1 = new Date(fechaInicio);
    const d2 = new Date(fechaFin);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
    const diff = d2.getTime() - d1.getTime();
    return diff > 0 ? Math.floor(diff / (1000 * 60 * 60 * 24)) : 0;
  }, [fechaInicio, fechaFin]);
  
  // Workplace Type
  const [tipoLugar, setTipoLugar] = useState<"" | "almacen" | "labor" | "oficina">(() => {
    if (contrato.id_almacen) return "almacen";
    if (contrato.id_labor) return "labor";
    if (contrato.id_oficina) return "oficina";
    return "";
  });
  const [idAlmacen, setIdAlmacen] = useState<number | null>(contrato.id_almacen);
  const [idLabor, setIdLabor] = useState<number | null>(contrato.id_labor);
  const [idOficina, setIdOficina] = useState<number | null>(contrato.id_oficina);
  const [evidencias, setEvidencias] = useState<File[]>([]);

  // Area / Cargo quick-creation modal states
  const [openedAddArea, setOpenedAddArea] = useState(false);
  const [openedAddCargo, setOpenedAddCargo] = useState(false);

  // Adenda reason
  const [motivo, setMotivo] = useState("");

  const regArea = useRegistroArea(
    (nuevaArea) => {
      setAreas((prev) => [...prev, nuevaArea]);
      setIdArea(nuevaArea.id_area);
      setOpenedAddArea(false);
    },
    () => setOpenedAddArea(false)
  );

  const regCargo = useRegistroCargo(
    (nuevoCargo) => {
      setTodosCargos((prev) => [...prev, nuevoCargo]);
      setIdCargo(nuevoCargo.id_cargo);
      if (nuevoCargo.id_area) {
        setIdArea(nuevoCargo.id_area);
      }
      setOpenedAddCargo(false);
    },
    () => setOpenedAddCargo(false),
    idArea
  );

  // Load catalogs
  useEffect(() => {
    if (!opened) return;
    const cargar = async () => {
      setLoadingCatalogos(true);
      try {
        const [areasRes, cargosRes, almacenesRes, laboresRes, empresasRes, oficinasRes] =
          await Promise.all([
            AuxService.get_areas().catch(() => ({ success: false, data: [] })),
            AuxService.get_cargos().catch(() => ({ success: false, data: [] })),
            AuxService.get_almacenes({ es_principal: false }).catch(() => ({
              success: false,
              data: [],
            })),
            AuxService.get_labores().catch(() => ({ success: false, data: [] })),
            AuxService.get_empresas().catch(() => ({ success: false, data: [] })),
            AuxService.get_oficinas().catch(() => ({ success: false, data: [] })),
          ]);

        if (areasRes.success) setAreas(areasRes.data as RES_Area[]);
        if (cargosRes.success) {
          const rawCargos = cargosRes.data as RES_Cargo[];
          setTodosCargos(rawCargos);
          const currentCargo = rawCargos.find((c) => c.id_cargo === contrato.id_cargo);
          if (currentCargo && currentCargo.id_area) {
            setIdArea(currentCargo.id_area);
          }
        }
        if (almacenesRes.success) setAlmacenes(almacenesRes.data as RES_Almacen[]);
        if (laboresRes.success) setLabores(laboresRes.data as RES_Labor[]);
        if (empresasRes.success) setEmpresas(empresasRes.data as RES_Empresa[]);
        if (oficinasRes.success) setOficinas(oficinasRes.data as RES_Oficina[]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingCatalogos(false);
      }
    };
    void cargar();
  }, [opened, contrato]);

  // Compute filtered cargos based on selected Area
  const cargos = useMemo(() => {
    const sinArea = todosCargos.filter((c) => c.id_area === null);
    if (!idArea) return todosCargos;
    const delArea = todosCargos.filter((c) => c.id_area === idArea);
    return [...delArea, ...sinArea];
  }, [todosCargos, idArea]);

  const cargosSelectData = useMemo(() => {
    const grouped = new Map<string, { value: string; label: string }[]>();
    cargos.forEach((c) => {
      const area = areas.find((a) => a.id_area === c.id_area);
      const groupName = area ? area.nombre : "Sin área asignada";
      if (!grouped.has(groupName)) grouped.set(groupName, []);
      grouped.get(groupName)!.push({
        value: c.id_cargo.toString(),
        label: c.nombre,
      });
    });
    return Array.from(grouped.entries()).map(([group, items]) => ({
      group,
      items,
    }));
  }, [cargos, areas]);

  const empresasSelectData = useMemo(
    () =>
      empresas.map((e) => ({
        value: e.id_empresa.toString(),
        label: e.razon_social,
      })),
    [empresas],
  );


  // Auto-calculate dates duracion_dias
  useEffect(() => {
    if (porTiempoIndefinido || !fechaInicio || !fechaFin) return;
    const d1 = new Date(fechaInicio);
    const d2 = new Date(fechaFin);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return;
    const diff = d2.getTime() - d1.getTime();
    if (diff > 0) {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      // Auto-suggest duration and period if not manually updated
      if (days >= 365) {
        setDuracion(Math.round(days / 365));
        setPeriodoDuracion("anual");
      } else if (days >= 30) {
        setDuracion(Math.round(days / 30));
        setPeriodoDuracion("mensual");
      } else {
        setDuracion(days);
        setPeriodoDuracion("diario");
      }
    }
  }, [fechaInicio, fechaFin, porTiempoIndefinido]);

  const tieneCambios = useMemo(() => {
    if (idCargo !== contrato.id_cargo) return true;
    if ((idEmpresa || null) !== (contrato.id_empresa ?? null)) return true;
    if (tipoContrato !== contrato.tipo_contrato) return true;
    if (toNum(sueldoBase) !== toNum(contrato.sueldo_base)) return true;
    if (toNum(sueldoReal) !== toNum(contrato.sueldo_real)) return true;
    if (toNum(salarioDiario) !== toNum(contrato.salario_diario)) return true;
    if (fechaInicio !== contrato.fecha_inicio) return true;
    if (porTiempoIndefinido !== contrato.por_tiempo_indefinido) return true;
    if ((fechaFin || null) !== (contrato.fecha_fin ?? null)) return true;

    // Workplace
    const originalTipoLugar = contrato.id_almacen ? "almacen" : contrato.id_labor ? "labor" : contrato.id_oficina ? "oficina" : "";
    if (tipoLugar !== originalTipoLugar) return true;
    if (tipoLugar === "almacen" && idAlmacen !== contrato.id_almacen) return true;
    if (tipoLugar === "labor" && idLabor !== contrato.id_labor) return true;
    if (tipoLugar === "oficina" && idOficina !== contrato.id_oficina) return true;

    // Evidencias
    if (evidencias.length > 0) return true;

    return false;
  }, [
    idCargo, contrato.id_cargo,
    idEmpresa, contrato.id_empresa,
    tipoContrato, contrato.tipo_contrato,
    sueldoBase, contrato.sueldo_base,
    sueldoReal, contrato.sueldo_real,
    salarioDiario, contrato.salario_diario,
    fechaInicio, contrato.fecha_inicio,
    porTiempoIndefinido, contrato.por_tiempo_indefinido,
    fechaFin, contrato.fecha_fin,
    tipoLugar, idAlmacen, contrato.id_almacen,
    idLabor, contrato.id_labor,
    idOficina, contrato.id_oficina,
    evidencias
  ]);

  // Detección reactiva de cambios para banners preventivos.
  const cambiosDetectados = useMemo<CambioDetectado[]>(
    () =>
      detectarCambios(contrato, {
        tipoContrato,
        sueldoBase,
        sueldoReal,
        salarioDiario,
        idAlmacen: tipoLugar === "almacen" ? idAlmacen : null,
        idLabor: tipoLugar === "labor" ? idLabor : null,
        idOficina: tipoLugar === "oficina" ? idOficina : null,
      }),
    [
      contrato,
      tipoContrato,
      sueldoBase,
      sueldoReal,
      salarioDiario,
      tipoLugar,
      idAlmacen,
      idLabor,
      idOficina,
    ],
  );

  const hayCambioSnapshot = cambiosDetectados.some((c) => c.afectaSnapshot);
  const hayCambioLugar = cambiosDetectados.some((c) => c.afectaLugar);

  const handleSaveAdenda = async () => {
    if (!motivo.trim()) {
      notifyError("Debe ingresar un motivo para registrar la adenda.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        id_cargo: idCargo,
        id_empresa: idEmpresa || 0,
        tipo_contrato: tipoContrato,
        sueldo_base: esPlanilla ? sueldoBase : null,
        sueldo_real: esPlanilla
          ? (sueldoReal !== null && sueldoReal !== undefined ? sueldoReal : sueldoBase)
          : null,
        salario_diario: esJornada ? salarioDiario : null,
        fecha_inicio: fechaInicio,
        por_tiempo_indefinido: porTiempoIndefinido,
        // Siempre enviamos los tres campos de lugar; el backend los normaliza (0 → null)
        id_almacen: tipoLugar === "almacen" ? (idAlmacen ?? 0) : 0,
        id_labor: tipoLugar === "labor" ? (idLabor ?? 0) : 0,
        id_oficina: tipoLugar === "oficina" ? (idOficina ?? 0) : 0,
      };

      if (!porTiempoIndefinido) {
        payload.fecha_fin = fechaFin;
        payload.duracion = duracion;
        payload.periodo_duracion = periodoDuracion;
      }

      const resp = await ContratosEmpleadoService.registrar_adenda(
        contrato.id_contrato,
        motivo.trim(),
        payload,
        evidencias,
      );

      if (resp.success) {
        notifySuccess("Adenda registrada correctamente.");
        const data = resp.data as {
          contrato: RES_ContratoEmpleado;
          empleado: RES_EmpleadoConContrato["empleado"];
          programaciones_ajustadas?: {
            actualizadas: number;
            divididas: number;
            creadas: number;
          };
        };
        onSuccess?.(data);
        close();
      } else {
        notifyError(resp.message ?? "Ocurrió un error al registrar la adenda.");
      }
    } catch (err) {
      console.error(err);
      notifyError("Error inesperado al registrar adenda.");
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClasses = {
    input:
      "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
    label: "text-zinc-300 mb-1 font-medium",
  };

  const esSueldoMensual =
    tipoContrato === TipoContrato.Planilla ||
    tipoContrato === TipoContrato.PeriodoPrueba;
  const esPlanilla = esSueldoMensual;
  const esJornada = tipoContrato === TipoContrato.JornadaDiaria;

  return (
    <>
      <ModalEstandar
        opened={opened}
        close={close}
        title="Registrar Adenda"
        validateClose
        size="lg"
      >
        <Stack gap="md">
          {nombreEmpleado && (
            <Card withBorder radius="lg" p="sm" className="bg-indigo-500/5 border-indigo-500/30">
              <Group gap="xs" wrap="nowrap">
                <UserCircleIcon className="w-4 h-4 text-indigo-400 shrink-0" />
                <Text size="xs" fw={700} c="indigo.3" tt="uppercase">
                  Empleado:
                </Text>
                <Text size="sm" fw={700} className="text-zinc-100 uppercase tracking-wider">
                  {nombreEmpleado}
                </Text>
              </Group>
            </Card>
          )}

          {/* Banner informativo sobre sincronización automática de horarios */}
          {(hayCambioSnapshot || hayCambioLugar) && (
            <Alert
              variant="light"
              color="indigo"
              radius="lg"
              icon={<InformationCircleIcon className="w-5 h-5" />}
              className="bg-indigo-500/5 border-indigo-500/30"
              classNames={{ message: "text-zinc-200 text-sm" }}
            >
              <div className="font-bold mb-1 text-indigo-300">
                Aviso de programación de horario
              </div>
              <div className="text-zinc-400 text-xs leading-relaxed">
                Al guardar esta adenda, si el trabajador cuenta con una programación de horario
                activa, esta se actualizará automáticamente a partir de la fecha de inicio de la
                adenda, conservando el histórico y aplicando los nuevos valores
                {hayCambioLugar ? " (incluyendo el nuevo lugar de trabajo)" : ""}.
              </div>
            </Alert>
          )}

          {/* Fila 1: Área · Cargo · Tipo de Contrato */}
          <Group grow align="flex-start" gap="md">
            <div className="flex gap-2 items-end">
              <Select
                label="Área"
                placeholder={loadingCatalogos ? "Cargando áreas..." : "Seleccione área"}
                data={areas.map((a) => ({
                  value: a.id_area.toString(),
                  label: a.nombre,
                }))}
                value={idArea?.toString() || null}
                onChange={(val) => {
                  const areaId = val ? Number(val) : null;
                  setIdArea(areaId);
                  setIdCargo(0); // reset cargo
                }}
                leftSection={<BriefcaseIcon className="w-4 h-4 text-zinc-500" />}
                classNames={fieldClasses}
                radius="lg"
                size="xs"
                searchable
                disabled={loadingCatalogos || submitting}
                comboboxProps={{ withinPortal: true }}
                className="flex-1"
              />
              <ActionIcon
                size="lg"
                radius="xl"
                variant="filled"
                color="indigo"
                className="shrink-0 bg-indigo-600 hover:bg-indigo-700 transition-colors mb-px h-[38px] w-[38px]"
                onClick={() => setOpenedAddArea(true)}
                disabled={submitting}
              >
                <PlusIcon className="w-5 h-5 text-white" />
              </ActionIcon>
            </div>

            <div className="flex gap-2 items-end">
              <Select
                label="Cargo"
                placeholder={loadingCatalogos ? "Cargando cargos..." : "Seleccione cargo"}
                data={cargosSelectData}
                value={idCargo > 0 ? idCargo.toString() : null}
                onChange={(val) => {
                  const cargoId = val ? Number(val) : 0;
                  setIdCargo(cargoId);
                  if (cargoId) {
                    const cargo = todosCargos.find((c) => c.id_cargo === cargoId);
                    if (cargo && cargo.id_area) {
                      setIdArea(cargo.id_area);
                    }
                  }
                }}
                leftSection={<BriefcaseIcon className="w-4 h-4 text-zinc-500" />}
                classNames={fieldClasses}
                radius="lg"
                size="xs"
                required
                withAsterisk
                searchable
                disabled={loadingCatalogos || submitting}
                comboboxProps={{ withinPortal: true }}
                className="flex-1"
              />
              <ActionIcon
                size="lg"
                radius="xl"
                variant="filled"
                color="indigo"
                className="shrink-0 bg-indigo-600 hover:bg-indigo-700 transition-colors mb-px h-[38px] w-[38px]"
                onClick={() => setOpenedAddCargo(true)}
                disabled={submitting}
              >
                <PlusIcon className="w-5 h-5 text-white" />
              </ActionIcon>
            </div>

            <Select
              label="Tipo de Contrato"
              placeholder="Seleccione"
              data={[
                { value: TipoContrato.Planilla, label: "Planilla" },
                { value: TipoContrato.JornadaDiaria, label: "Jornada Diaria" },
                { value: TipoContrato.PeriodoPrueba, label: "Periodo de Prueba" },
              ]}
              value={tipoContrato}
              onChange={(val) => {
                const nuevoTipo = val ?? TipoContrato.Planilla;
                setTipoContrato(nuevoTipo);
                setSueldoBase(null);
                setSueldoReal(null);
                setSalarioDiario(null);
              }}
              leftSection={<DocumentTextIcon className="w-4 h-4 text-zinc-500" />}
              classNames={fieldClasses}
              radius="lg"
              size="xs"
              required
              disabled={submitting}
              comboboxProps={{ withinPortal: true }}
            />
          </Group>

          {/* Fila 2: Empresa · Remuneración (Sueldo Base o Salario Diario) */}
          <Group grow align="flex-start" gap="md">
            <Select
              label="Empresa"
              placeholder={loadingCatalogos ? "Cargando empresas..." : "Seleccione empresa"}
              data={empresasSelectData}
              value={idEmpresa > 0 ? idEmpresa.toString() : null}
              onChange={(val) => setIdEmpresa(val ? Number(val) : 0)}
              leftSection={<BuildingOfficeIcon className="w-4 h-4 text-zinc-500" />}
              classNames={fieldClasses}
              radius="lg"
              size="xs"
              required
              withAsterisk
              searchable
              disabled={loadingCatalogos || submitting}
              comboboxProps={{ withinPortal: true }}
            />
            {esPlanilla && (
              <>
                <NumberInput
                  label={tipoContrato === TipoContrato.PeriodoPrueba ? "Sueldo Mensual (S/)" : "Sueldo Base (S/)"}
                  placeholder="Ej. 1500.00"
                  decimalScale={2}
                  fixedDecimalScale
                  hideControls
                  value={sueldoBase ?? ""}
                  onChange={(v) => {
                    const num = toNum(v);
                    setSueldoBase(num);
                  }}
                  leftSection={<CurrencyDollarIcon className="w-4 h-4 text-zinc-500" />}
                  classNames={fieldClasses}
                  radius="lg"
                  size="xs"
                  min={0}
                  disabled={submitting}
                  required
                  withAsterisk
                />
                {!en_modo_auditable && (
                  <NumberInput
                    label="Sueldo Real (S/)"
                    placeholder="Ej. 1800.00"
                    decimalScale={2}
                    fixedDecimalScale
                    hideControls
                    value={sueldoReal ?? ""}
                    onChange={(v) => setSueldoReal(toNum(v))}
                    leftSection={<CurrencyDollarIcon className="w-4 h-4 text-emerald-500" />}
                    classNames={fieldClasses}
                    radius="lg"
                    size="xs"
                    min={0}
                    disabled={submitting}
                  />
                )}
              </>
            )}
            {esJornada && (
              <NumberInput
                label="Salario Diario (S/)"
                placeholder="Ej. 50.00"
                decimalScale={2}
                fixedDecimalScale
                hideControls
                value={salarioDiario ?? ""}
                onChange={(v) => setSalarioDiario(toNum(v))}
                leftSection={<BanknotesIcon className="w-4 h-4 text-zinc-500" />}
                classNames={fieldClasses}
                radius="lg"
                size="xs"
                min={0}
                disabled={submitting}
                required
                withAsterisk
              />
            )}
          </Group>

          {/* Fila 3: Lugar de Trabajo */}
          <Group grow align="flex-start" gap="md">
            <Select
              label="Tipo de Lugar"
              placeholder="Seleccione tipo"
              data={[
                { value: "almacen", label: "Almacén" },
                { value: "labor", label: "Labor" },
                { value: "oficina", label: "Oficina" },
              ]}
              value={tipoLugar}
              onChange={(val) => {
                const valLugar = (val as "" | "almacen" | "labor" | "oficina") ?? "";
                setTipoLugar(valLugar);
                setIdAlmacen(null);
                setIdLabor(null);
                setIdOficina(null);
              }}
              leftSection={<MapPinIcon className="w-4 h-4 text-zinc-500" />}
              classNames={fieldClasses}
              radius="lg"
              size="xs"
              disabled={submitting}
              comboboxProps={{ withinPortal: true }}
            />

            {tipoLugar === "almacen" && (
              <Select
                label="Almacén"
                placeholder="Seleccione almacén"
                data={almacenes.map((a) => ({
                  value: a.id_almacen.toString(),
                  label: a.nombre,
                }))}
                value={idAlmacen?.toString() || null}
                onChange={(val) => setIdAlmacen(val ? Number(val) : null)}
                leftSection={<MapPinIcon className="w-4 h-4 text-zinc-500" />}
                classNames={fieldClasses}
                radius="lg"
                size="xs"
                required
                withAsterisk
                disabled={loadingCatalogos || submitting}
                comboboxProps={{ withinPortal: true }}
              />
            )}

            {tipoLugar === "labor" && (
              <Select
                label="Labor"
                placeholder="Seleccione labor"
                data={labores.map((l) => ({
                  value: l.id_labor.toString(),
                  label: l.nombre,
                }))}
                value={idLabor?.toString() || null}
                onChange={(val) => setIdLabor(val ? Number(val) : null)}
                leftSection={<MapPinIcon className="w-4 h-4 text-zinc-500" />}
                classNames={fieldClasses}
                radius="lg"
                size="xs"
                required
                withAsterisk
                disabled={loadingCatalogos || submitting}
                comboboxProps={{ withinPortal: true }}
              />
            )}

            {tipoLugar === "oficina" && (
              <Select
                label="Oficina"
                placeholder="Seleccione oficina"
                data={oficinas.map((o) => ({
                  value: o.id_oficina.toString(),
                  label: o.nombre,
                }))}
                value={idOficina?.toString() || null}
                onChange={(val) => setIdOficina(val ? Number(val) : null)}
                leftSection={<MapPinIcon className="w-4 h-4 text-zinc-500" />}
                classNames={fieldClasses}
                radius="lg"
                size="xs"
                required
                withAsterisk
                disabled={loadingCatalogos || submitting}
                comboboxProps={{ withinPortal: true }}
              />
            )}
          </Group>

          <Divider label="Vigencia y Duración" labelPosition="left" />

          {/* Fila 4: Vigencia */}
          <Group grow align="flex-start" gap="md">
            <CustomDatePicker
              label="Fecha de Inicio"
              placeholder="Seleccione fecha"
              value={fechaInicio ? new Date(`${fechaInicio}T00:00:00`) : null}
              onChange={(val) => setFechaInicio(toIsoDate(val))}
              size="xs"
              disabled={submitting}
            />
            <CustomDatePicker
              label="Fecha de Fin"
              placeholder="Seleccione fecha"
              value={fechaFin ? new Date(`${fechaFin}T00:00:00`) : null}
              onChange={(val) => setFechaFin(toIsoDate(val))}
              size="xs"
              disabled={porTiempoIndefinido || submitting}
              minDate={fechaInicio ? new Date(`${fechaInicio}T00:00:00`) : undefined}
            />
          </Group>

          {/* Fila 5: Switch Indefinido */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/10">
            <div className="flex gap-2.5 items-center">
              <ClockIcon className="w-5 h-5 text-indigo-400" />
              <Stack gap={0}>
                <Text size="sm" fw={700} className="text-zinc-200">
                  Contrato Indefinido
                </Text>
                <Text size="11px" className="text-zinc-500">
                  Active esta opción si el contrato no tiene una fecha de vencimiento fija.
                </Text>
              </Stack>
            </div>
            <Switch
              checked={porTiempoIndefinido}
              onChange={(e) => {
                const isChecked = e.currentTarget.checked;
                setPorTiempoIndefinido(isChecked);
                if (isChecked) {
                  setFechaFin("");
                  setDuracion(null);
                  setPeriodoDuracion(null);
                }
              }}
              disabled={submitting}
              size="md"
              color="indigo"
            />
          </div>

          {!porTiempoIndefinido && (
            <Group grow align="flex-start" gap="md">
              <NumberInput
                label="Duración"
                placeholder="Ej. 3"
                hideControls
                value={duracion ?? ""}
                disabled
                leftSection={<CalendarIcon className="w-4 h-4 text-zinc-500" />}
                classNames={{
                  ...fieldClasses,
                  input: `${fieldClasses.input} bg-zinc-950/50 text-zinc-400 cursor-not-allowed`,
                }}
                radius="lg"
                size="xs"
              />
              <Select
                label="Periodo"
                placeholder="Seleccione"
                data={[
                  { value: "diario", label: "Días" },
                  { value: "mensual", label: "Meses" },
                  { value: "anual", label: "Años" },
                ]}
                value={periodoDuracion}
                disabled
                leftSection={<CalendarIcon className="w-4 h-4 text-zinc-500" />}
                classNames={{
                  ...fieldClasses,
                  input: `${fieldClasses.input} bg-zinc-950/50 text-zinc-400 cursor-not-allowed`,
                }}
                radius="lg"
                size="xs"
                comboboxProps={{ withinPortal: true }}
              />
              <TextInput
                label="Duración (días)"
                value={duracionDiasCalc !== null ? `${duracionDiasCalc}` : ""}
                readOnly
                disabled
                placeholder="Se calcula automático"
                leftSection={<ClockIcon className="w-4 h-4 text-zinc-500" />}
                classNames={{
                  ...fieldClasses,
                  input: `${fieldClasses.input} bg-zinc-950/50 text-zinc-400 cursor-not-allowed`,
                }}
                radius="lg"
                size="xs"
              />
            </Group>
          )}

          <Divider label="Evidencias (opcional)" labelPosition="left" />
          <MultiFilePicker
            files={evidencias}
            onFilesChange={setEvidencias}
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
            multiple
            label="Adjuntar evidencias"
            description="Imágenes o documentos (PDF, JPG, PNG, XLSX, etc.)"
          />



          {/* Motivo de la Adenda */}
          <Textarea
            label="Motivo de la Adenda"
            placeholder="Ej. Aumento salarial acordado, cambio de labor minera, extensión de vigencia, etc."
            required
            withAsterisk
            minRows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.currentTarget.value)}
            classNames={fieldClasses}
          />

          {/* Botones de acción */}
          <Group justify="flex-end" gap="sm" mt="md">
            <Button
              variant="subtle"
              onClick={close}
              disabled={submitting}
              radius="lg"
              className="text-zinc-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              color="indigo"
              onClick={handleSaveAdenda}
              loading={submitting}
              disabled={
                loadingCatalogos ||
                !tieneCambios ||
                !idCargo ||
                (esPlanilla && sueldoBase === null) ||
                (esJornada && salarioDiario === null) ||
                (!porTiempoIndefinido && !fechaFin) ||
                !motivo.trim()
              }
              radius="lg"
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-950/20"
            >
              Registrar Adenda
            </Button>
          </Group>
        </Stack>
      </ModalEstandar>

      {/* Quick create modals for Area and Cargo */}
      {openedAddArea && (
        <ModalEstandar
          opened={openedAddArea}
          close={() => setOpenedAddArea(false)}
          title="Agregar Área"
          validateClose
          size="md"
        >
          <RegistroArea
            nombre={regArea.nombre}
            setNombre={regArea.setNombre}
            cargos={regArea.cargos}
            addCargo={regArea.addCargo}
            removeCargo={regArea.removeCargo}
            updateCargo={regArea.updateCargo}
            loading={regArea.loading}
            error={regArea.error}
            onSave={regArea.handleGuardar}
            onCancel={() => setOpenedAddArea(false)}
          />
        </ModalEstandar>
      )}

      {openedAddCargo && (
        <ModalEstandar
          opened={openedAddCargo}
          close={() => setOpenedAddCargo(false)}
          title="Agregar Cargo"
          validateClose
          size="md"
        >
          <RegistroCargo
            nombre={regCargo.nombre}
            setNombre={regCargo.setNombre}
            loading={regCargo.loading}
            error={regCargo.error}
            onSave={regCargo.handleGuardar}
            onCancel={() => setOpenedAddCargo(false)}
            contextLabel={
              idArea
                ? `Área asociada: ${areas.find((a) => a.id_area === idArea)?.nombre || ""}`
                : "Sin área asociada"
            }
          />
        </ModalEstandar>
      )}
    </>
  );
};
