import { useEffect, useState } from "react";
import {
  Stack,
  Group,
  Text,
  Badge,
  Loader,
  Button,
  Paper,
  Collapse,
  UnstyledButton,
  Divider,
  Tooltip,
  Textarea,
} from "@mantine/core";
import { CustomDatePicker } from "../../../presentation/utils/date-picker-input";
import {
  CheckBadgeIcon,
  CalendarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  DocumentIcon,
  MapPinIcon,
  UserCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PaperClipIcon,
  PlusIcon,
  BuildingOfficeIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import { useHistorialContratosEmpleado } from "../hooks/useHistorialContratosEmpleado";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { ArchivoCard } from "../../../presentation/utils/archivo/archivo-card";
import { MultiFilePicker } from "../../../presentation/utils/archivo/multifile-picker";
import { CambiosLogHistorial } from "../../../presentation/utils/cambios-log-historial";
import { parseCambiosLog } from "../../../presentation/utils/parse-cambios-log";
import { useAuditoriaStore } from "../../../stores/auditoria.store";
import type { IArchivo } from "../../../shared/interfaces/archivo";
import type { RES_ContratoEmpleado, RES_EmpleadoConContrato } from "../../../service/responses/contrato-empleado";
import { ModalContratoEmpleado } from "./modal-contrato-empleado";
import { ModalAdendaContrato } from "./modal-adenda-contrato";
import { ModalAsignarHorario } from "../../programacion-horarios/presentation/modal-asignar-horario";
import type { RES_TurnoLaboral } from "../../programacion-horarios/service/turnos.responses";
import { TurnoLaboralService } from "../../programacion-horarios/service/turnos.service";
import { EstadoContrato } from "../../../shared/enums/contrato/estado-contrato";
import { ContratosEmpleadoService } from "../service/contratos-empleado.service";
import { useNotify } from "../../../hooks/useNotify";

interface ModalHistorialContratosEmpleadoProps {
  idEmpleado: number;
  nombreEmpleado: string;
  opened: boolean;
  close: () => void;
  onContratoCreado?: (payload: { empleado?: unknown }) => void;
  onCrearContratoClick?: () => void;
  esContratista?: boolean;
}

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  return dayjs(iso).format("DD/MM/YYYY");
};

const parseEvidencias = (raw: unknown): IArchivo[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as IArchivo[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as IArchivo[]) : [];
    } catch {
      return [];
    }
  }
  return [];
};

// parseCambiosLog se importa del helper puro en presentation/utils/parse-cambios-log

export const ModalHistorialContratosEmpleado = ({
  idEmpleado,
  nombreEmpleado,
  opened,
  close,
  onContratoCreado,
  onCrearContratoClick,
  esContratista = false,
}: ModalHistorialContratosEmpleadoProps) => {
  const { notifySuccess, notifyError } = useNotify();
  const { en_modo_auditable } = useAuditoriaStore();
  const { contratos, loading, reload, getUltimoContrato } =
    useHistorialContratosEmpleado(opened ? idEmpleado : null);

  const [expandedIds, setExpandedIds] = useState<Record<number, boolean>>({});
  const [modalNuevoContratoAbierto, setModalNuevoContratoAbierto] =
    useState(false);
  const [modalFinalizarAbierto, setModalFinalizarAbierto] = useState(false);
  const [contratoIdAFinalizar, setContratoIdAFinalizar] = useState<number | null>(null);
  const [fechaFinAnticipada, setFechaFinAnticipada] = useState<Date | null>(
    new Date()
  );
  const [motivoCierre, setMotivoCierre] = useState("");
  const [submittingFinalizar, setSubmittingFinalizar] = useState(false);
  const [modalAdendaAbierto, setModalAdendaAbierto] = useState(false);
  const [contratoAEditar, setContratoAEditar] = useState<RES_ContratoEmpleado | null>(null);

  // Cascada Contrato → Programación de Horarios.
  // Cuando el modal de Asignar Horario se abre desde una reasignación (adenda
  // con cambio de snapshot, o finalización de contrato), recibe un prefill.
  const [modalReasignarAbierto, setModalReasignarAbierto] = useState(false);
  // Guardamos los datos para reasignar:
  // - id_empleado pre-seleccionado
  // - datos del horario previo (turno, días, lugar) como base
  // - motivo: para el banner
  const [reAsignData, setReAsignData] = useState<{
    idEmpleado: number;
    prefill: import("../../programacion-horarios/hooks/useAsignarHorario").AsignarHorarioPrefill;
    motivo: string;
  } | null>(null);

  // Turnos laborales: necesarios para ModalAsignarHorario cuando se reabre
  // por la cascada. Lo cargamos una sola vez al montar el modal.
  const [turnosDisponibles, setTurnosDisponibles] = useState<RES_TurnoLaboral[]>([]);
  useEffect(() => {
    if (!opened) return;
    let cancelado = false;
    const cargar = async () => {
      try {
        const resp = await TurnoLaboralService.get_turnos();
        if (cancelado) return;
        if (resp.success) {
          const data = (resp.data as RES_TurnoLaboral[]).filter(
            (t) => t.estado === "Activo",
          );
          setTurnosDisponibles(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    void cargar();
    return () => {
      cancelado = true;
    };
  }, [opened]);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isExpanded = (id: number, index: number) => {
    if (expandedIds[id] !== undefined) return expandedIds[id];
    // Por defecto, abrir el primero (el más reciente)
    return index === 0;
  };

  // Detecta si hay un contrato Vigente por tiempo indefinido.
  // En ese caso, NO se permite crear uno nuevo: primero hay que finalizarlo.
  const vigenteIndefinido = contratos.find(
    (c) => c.estado === EstadoContrato.Vigente && c.por_tiempo_indefinido,
  );

  // Al crear un nuevo contrato desde el modal, se refresca el historial
  // y se avisa al padre para que actualice la fila del empleado.
  const handleContratoCreado = (payload?: unknown) => {
    setModalNuevoContratoAbierto(false);
    void reload();
    onContratoCreado?.(payload as { empleado?: unknown });
  };

  // Al abrir el modal de "Nuevo Contrato", se pasa el último contrato
  // del historial para que el form pre-rellene los campos.
  const handleAbrirNuevoContrato = () => {
    if (vigenteIndefinido) return; // Doble seguridad: no abrir si hay vigente indefinido.
    if (onCrearContratoClick) {
      onCrearContratoClick();
      return;
    }
    setModalNuevoContratoAbierto(true);
  };

  const [evidenciasFinalizar, setEvidenciasFinalizar] = useState<File[]>([]);

  const handleConfirmarFinalizar = async () => {
    if (!contratoIdAFinalizar || !fechaFinAnticipada || !motivoCierre.trim()) return;
    setSubmittingFinalizar(true);
    try {
      const resp = await ContratosEmpleadoService.finalizar_anticipado(
        contratoIdAFinalizar,
        dayjs(fechaFinAnticipada).format("YYYY-MM-DD"),
        motivoCierre.trim(),
        evidenciasFinalizar,
      );
      if (resp.success) {
        notifySuccess("Contrato finalizado anticipadamente");
        const data = resp.data as {
          empleado?: RES_EmpleadoConContrato["empleado"];
        };
        setModalFinalizarAbierto(false);
        setContratoIdAFinalizar(null);
        setMotivoCierre("");
        setEvidenciasFinalizar([]);
        void reload();
        if (data?.empleado) {
          onContratoCreado?.({ empleado: data.empleado });
        }
      } else {
        notifyError(resp.message ?? "No se pudo finalizar el contrato");
      }
    } catch (err) {
      console.error(err);
      notifyError("Error al finalizar el contrato");
    } finally {
      setSubmittingFinalizar(false);
    }
  };

  const calcularFechaInicioSugerida = (
    c: RES_ContratoEmpleado | undefined,
  ): string => {
    const hoy = new Date();
    const hoyLocalStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;

    if (!c) return hoyLocalStr;

    // Verificar si el último contrato sigue vigente hoy
    const esVigenteHoy = c.estado === EstadoContrato.Vigente &&
      (c.por_tiempo_indefinido || (c.fecha_fin && c.fecha_fin >= hoyLocalStr));

    if (esVigenteHoy && c.fecha_fin) {
      // Si sigue vigente hoy y tiene fecha de fin, sugerimos el día siguiente a su finalización
      const [y, m, d] = c.fecha_fin.split("-").map(Number);
      const fechaSiguiente = new Date(y, m - 1, d + 1);
      return `${fechaSiguiente.getFullYear()}-${String(fechaSiguiente.getMonth() + 1).padStart(2, "0")}-${String(fechaSiguiente.getDate()).padStart(2, "0")}`;
    }

    // En cualquier otro caso (término anticipado, finalizado o vencido),
    // sugerimos la fecha actual de hoy para que se active inmediatamente hoy.
    return hoyLocalStr;
  };



  const ultimoContrato = getUltimoContrato();

  return (
    <>
      <ModalEstandar
        opened={opened}
        close={close}
        title="Contratos del Empleado"
        size="xl"
      >
        <Stack gap="md" className="max-h-[78vh] overflow-y-auto px-2 py-2">
          {/* Header con icono + nombre del empleado */}
          <Group
            gap="md"
            className="px-4 py-3 rounded-2xl border border-zinc-800/60 bg-zinc-900/30"
            wrap="nowrap"
          >
            <div className="p-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 shrink-0">
              <UserCircleIcon className="w-6 h-6 text-indigo-400" />
            </div>
            <Stack gap={2}>
              <Text
                size="9px"
                fw={800}
                c="zinc.5"
                className="uppercase tracking-widest"
              >
                Empleado
              </Text>
              <Text size="sm" fw={800} className="text-zinc-100">
                {nombreEmpleado}
              </Text>
            </Stack>
          </Group>

          <Group justify="space-between" align="center" wrap="nowrap">
            <Group gap="xs">
              <Text
                size="xs"
                fw={900}
                c="zinc.4"
                className="uppercase tracking-widest"
              >
                Historial
              </Text>
              <Badge
                variant="light"
                color="indigo"
                radius="sm"
                size="sm"
                className="font-bold"
              >
                {contratos.length}{" "}
                {contratos.length === 1 ? "contrato" : "contratos"}
              </Badge>
            </Group>

            {vigenteIndefinido ? (
              <Tooltip
                label="Debes finalizar el contrato indefinido actual antes de crear uno nuevo."
                withArrow
                position="top"
              >
                <Button
                  size="xs"
                  radius="lg"
                  color="teal"
                  variant="light"
                  leftSection={<PlusIcon className="w-4 h-4" />}
                  onClick={handleAbrirNuevoContrato}
                  disabled
                  className="font-bold border border-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Nuevo Contrato
                </Button>
              </Tooltip>
            ) : (
              <Button
                size="xs"
                radius="lg"
                color="teal"
                variant="light"
                leftSection={<PlusIcon className="w-4 h-4" />}
                onClick={handleAbrirNuevoContrato}
                className="font-bold border border-teal-500/20"
              >
                Nuevo Contrato
              </Button>
            )}
          </Group>

          <Divider color="zinc.8" />

          {/* Contenido */}
          {loading ? (
            <Stack align="center" gap="md" py={60}>
              <Loader color="indigo" />
              <Text size="sm" c="dimmed">
                Cargando historial de contratos...
              </Text>
            </Stack>
          ) : contratos.length === 0 ? (
            <Stack align="center" gap="sm" py={60}>
              <CurrencyDollarIcon className="w-12 h-12 text-zinc-700" />
              <Text size="sm" c="dimmed" fw={600}>
                Este empleado no tiene contratos registrados aún.
              </Text>
            </Stack>
          ) : (
            <Stack gap="md" className="pb-4">
              {contratos.map((c, index) => {
                const expanded = isExpanded(c.id_contrato, index);
                const evidencias = parseEvidencias(c.evidencias);
                const cambiosLog = parseCambiosLog(c.cambios_log);
                const esSueldoMensual =
                  c.tipo_contrato === "Planilla" ||
                  c.tipo_contrato === "PeriodoPrueba";
                const sueldoMostrar = esSueldoMensual
                  ? c.sueldo_base
                  : c.salario_diario;
                const unidad = esSueldoMensual ? "" : " / día";
                const tipoContratoLabel =
                  c.tipo_contrato === "PeriodoPrueba"
                    ? "Periodo de Prueba"
                    : c.tipo_contrato === "Planilla"
                      ? "Planilla"
                      : "Jornada Diaria";
                const tieneCierreAnticipado = !!c.fecha_fin_anticipada;
                const estadoBadge = contratoEstadoBadge(c.estado);

                return (
                  <Paper
                    key={c.id_contrato}
                    radius="xl"
                    className={`border shadow-[0_4px_30px_rgba(0,0,0,0.1)] transition-all group relative overflow-hidden p-4 shrink-0 ${
                      estadoBadge.paperClass
                    }`}
                  >
                    {/* Highlight superior */}
                    <div
                      className={`absolute top-0 left-0 w-full h-1 bg-linear-to-r ${estadoBadge.barClass} group-hover:opacity-100 transition-opacity`}
                    />

                      <UnstyledButton
                        className="w-full"
                        onClick={() => toggleExpand(c.id_contrato)}
                      >
                        <Group justify="space-between" wrap="nowrap">
                          <Group gap="md" wrap="nowrap" className="min-w-0 flex-1">
                            <div
                              className={`p-3 rounded-2xl border shrink-0 ${estadoBadge.iconWrapperClass}`}
                            >
                              <DocumentIcon
                                className={`w-6 h-6 ${estadoBadge.iconClass}`}
                              />
                            </div>
                            <Stack gap={1} className="min-w-0 flex-1">
                              <Group gap="xs" wrap="nowrap" className="min-w-0">
                                <Text
                                  size="sm"
                                  fw={900}
                                  className="text-white truncate"
                                >
                                  {c.cargo ?? "—"}
                                </Text>
                                <Badge
                                  variant="light"
                                  color={
                                    c.tipo_contrato === "PeriodoPrueba"
                                      ? "violet"
                                      : c.tipo_contrato === "Planilla"
                                        ? "indigo"
                                        : "teal"
                                  }
                                  radius="sm"
                                  size="xs"
                                  className="font-bold"
                                >
                                  {tipoContratoLabel}
                                </Badge>
                                <Badge
                                  variant="light"
                                  color={estadoBadge.color}
                                  radius="sm"
                                  size="xs"
                                  leftSection={<CheckBadgeIcon className="w-3 h-3" />}
                                  className="font-bold"
                                >
                                  {estadoBadge.label}
                                </Badge>
                              </Group>

                              <Group gap="md" className="text-zinc-400 flex-wrap">
                                <Group gap={4} wrap="nowrap">
                                  <CalendarIcon className="w-4 h-4 text-indigo-400/70" />
                                  <Text
                                    size="xs"
                                    fw={600}
                                    className="whitespace-nowrap"
                                  >
                                    {formatDate(c.fecha_inicio)}
                                    {c.por_tiempo_indefinido
                                      ? " — Indefinido"
                                      : c.fecha_fin
                                        ? ` → ${formatDate(c.fecha_fin)} (${c.duracion_dias ?? 0} días)`
                                        : ""}
                                  </Text>
                                </Group>
                                {sueldoMostrar && (
                                  <Group gap={6} wrap="nowrap">
                                    <CurrencyDollarIcon className="w-4 h-4 text-emerald-400/70 shrink-0" />
                                    <Text
                                      size="xs"
                                      fw={800}
                                      className="text-emerald-400 font-mono whitespace-nowrap"
                                    >
                                      S/ {Number(sueldoMostrar).toFixed(2)}
                                      {unidad}
                                    </Text>
                                    {esSueldoMensual && !en_modo_auditable && c.sueldo_real !== null && c.sueldo_real !== undefined && c.sueldo_real !== "" && (
                                      <Text
                                        size="xs"
                                        fw={700}
                                        className="text-emerald-300/90 font-mono whitespace-nowrap"
                                      >
                                        (Sueldo real: S/ {Number(c.sueldo_real).toFixed(2)})
                                      </Text>
                                    )}
                                  </Group>
                                )}
                                {c.empresa && (
                                  <Group gap={4} wrap="nowrap">
                                    <BuildingOfficeIcon className="w-4 h-4 text-indigo-400/70" />
                                    <Text
                                      size="xs"
                                      fw={700}
                                      className="text-zinc-300 whitespace-nowrap"
                                    >
                                      {c.empresa}
                                    </Text>
                                  </Group>
                                )}
                              </Group>
                            </Stack>
                          </Group>

                          {c.estado === EstadoContrato.Vigente && (
                            <Group gap="xs" wrap="nowrap">
                              <Tooltip
                                label="Registrar Adenda / Modificar Contrato"
                                withArrow
                                position="top"
                              >
                                <Button
                                  size="xs"
                                  radius="md"
                                  color="indigo"
                                  variant="light"
                                  leftSection={<DocumentIcon className="w-3.5 h-3.5" />}
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    setContratoAEditar(c);
                                    setModalAdendaAbierto(true);
                                  }}
                                  className="font-bold border border-indigo-500/20"
                                >
                                  Adenda
                                </Button>
                              </Tooltip>

                              <Tooltip
                                label="Cerrar anticipadamente"
                                withArrow
                                position="top"
                              >
                                <Button
                                  size="xs"
                                  radius="md"
                                  color="orange"
                                  variant="light"
                                  leftSection={<XCircleIcon className="w-3.5 h-3.5" />}
                                  loading={contratoIdAFinalizar === c.id_contrato && submittingFinalizar}
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    setContratoIdAFinalizar(c.id_contrato);
                                    setFechaFinAnticipada(new Date());
                                    setMotivoCierre("");
                                    setModalFinalizarAbierto(true);
                                  }}
                                  className="font-bold border border-orange-500/20"
                                >
                                  Finalizar
                                </Button>
                              </Tooltip>
                            </Group>
                          )}

                          <div className="w-8 h-8 rounded-full bg-zinc-800/40 flex items-center justify-center shrink-0 border border-zinc-700/50 group-hover:bg-zinc-800/80 transition-colors">
                            {expanded ? (
                              <ChevronUpIcon className="w-4 h-4 text-zinc-400" />
                            ) : (
                              <ChevronDownIcon className="w-4 h-4 text-zinc-400" />
                            )}
                          </div>
                        </Group>
                      </UnstyledButton>

                      <Collapse in={expanded}>
                        <div className="mt-4 pt-4 border-t border-zinc-800/30">
                          <Stack gap="md">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {/* Almacén */}
                              {c.almacen && (
                                <div className="bg-zinc-950/40 rounded-xl p-4 border border-zinc-800/40">
                                  <Group gap="xs" mb="xs">
                                    <MapPinIcon className="w-3.5 h-3.5 text-indigo-400" />
                                    <Text
                                      size="9px"
                                      fw={800}
                                      c="zinc.5"
                                      className="uppercase tracking-widest"
                                    >
                                      Almacén
                                    </Text>
                                  </Group>
                                  <Text size="sm" fw={600} className="text-zinc-200">
                                    {c.almacen}
                                  </Text>
                                </div>
                              )}

                              {/* Labor */}
                              {c.labor && (
                                <div className="bg-zinc-950/40 rounded-xl p-4 border border-zinc-800/40">
                                  <Group gap="xs" mb="xs">
                                    <MapPinIcon className="w-3.5 h-3.5 text-indigo-400" />
                                    <Text
                                      size="9px"
                                      fw={800}
                                      c="zinc.5"
                                      className="uppercase tracking-widest"
                                    >
                                      Labor
                                    </Text>
                                  </Group>
                                  <Text size="sm" fw={600} className="text-zinc-200">
                                    {c.labor} {c.mina_nombre ? `(${c.mina_nombre})` : ""}
                                  </Text>
                                </div>
                              )}

                              {/* Oficina */}
                              {c.oficina && (
                                <div className="bg-zinc-950/40 rounded-xl p-4 border border-zinc-800/40">
                                  <Group gap="xs" mb="xs">
                                    <MapPinIcon className="w-3.5 h-3.5 text-indigo-400" />
                                    <Text
                                      size="9px"
                                      fw={800}
                                      c="zinc.5"
                                      className="uppercase tracking-widest"
                                    >
                                      Oficina
                                    </Text>
                                  </Group>
                                  <Text size="sm" fw={600} className="text-zinc-200">
                                    {c.oficina}
                                  </Text>
                                </div>
                              )}

                              {/* Fallback si no hay ningún lugar */}
                              {!c.almacen && !c.labor && !c.oficina && (
                                <div className="bg-zinc-950/40 rounded-xl p-4 border border-zinc-800/40 col-span-full">
                                  <Group gap="xs" mb="xs">
                                    <MapPinIcon className="w-3.5 h-3.5 text-indigo-400" />
                                    <Text
                                      size="9px"
                                      fw={800}
                                      c="zinc.5"
                                      className="uppercase tracking-widest"
                                    >
                                      Lugar
                                    </Text>
                                  </Group>
                                  <Text size="sm" fw={600} className="text-zinc-200">
                                    —
                                  </Text>
                                </div>
                              )}
                            </div>

                            {/* Cierre anticipado */}
                            {tieneCierreAnticipado && (
                               <Stack gap="xs">
                                 <Group gap="xs">
                                   <ClockIcon className="w-3.5 h-3.5 text-amber-400" />
                                   <Text
                                     size="9px"
                                     fw={800}
                                     c="amber.4"
                                     className="uppercase tracking-widest"
                                   >
                                     Cierre
                                   </Text>
                                   <Badge
                                     variant="light"
                                     color="amber"
                                     size="md"
                                     radius="md"
                                     className="font-mono font-bold"
                                   >
                                     {formatDate(c.fecha_fin_anticipada)}
                                   </Badge>
                                 </Group>
                                 {c.motivo_cierre && (
                                   <Group gap="xs" align="flex-start" className="pl-1">
                                     <Text size="xs" fw={700} className="text-zinc-400">
                                       Motivo de cierre:
                                     </Text>
                                     <Text size="xs" className="text-zinc-300 italic flex-1">
                                       {c.motivo_cierre}
                                     </Text>
                                   </Group>
                                 )}
                               </Stack>
                             )}

                            {evidencias.length > 0 && (
                              <div>
                                <Group gap="xs" mb="xs" className="pl-1">
                                  <PaperClipIcon className="w-3.5 h-3.5 text-zinc-500" />
                                  <Text
                                    size="9px"
                                    fw={800}
                                    c="zinc.4"
                                    className="uppercase tracking-widest"
                                  >
                                    Evidencias ({evidencias.length})
                                  </Text>
                                </Group>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {evidencias.map((ev, idx) => (
                                    <ArchivoCard
                                      key={`${c.id_contrato}-ev-${idx}`}
                                      archivo={ev}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}


                            {/* Historial de Adendas — componente genérico reutilizable */}
                            <CambiosLogHistorial
                              cambiosLog={cambiosLog}
                              titulo="Historial de Adendas"
                              primeraExpandida={false}
                            />
                          </Stack>
                        </div>
                      </Collapse>
                    </Paper>
                );
              })}
            </Stack>
          )}
        </Stack>
      </ModalEstandar>

      {/* Modal para crear un nuevo contrato del mismo empleado */}
      {modalNuevoContratoAbierto && (
        <ModalContratoEmpleado
          idEmpleado={idEmpleado}
          opened={modalNuevoContratoAbierto}
          close={() => setModalNuevoContratoAbierto(false)}
          onSuccess={handleContratoCreado}
          contratoAnterior={ultimoContrato ?? undefined}
          fechaInicioSugerida={calcularFechaInicioSugerida(ultimoContrato ?? undefined)}
          esContratista={esContratista}
        />
      )}
      {/* Modal para finalizar contrato anticipadamente */}
      <ModalEstandar
        opened={modalFinalizarAbierto}
        close={() => setModalFinalizarAbierto(false)}
        validateClose
        title="Finalizar Contrato Anticipadamente"
        size="md"
      >
        <Stack gap="md">
          <CustomDatePicker
            label="Fecha de Fin Anticipada"
            value={fechaFinAnticipada}
            onChange={(val) => setFechaFinAnticipada(val as Date | null)}
            required
            withAsterisk
          />
          <Textarea
            label="Motivo de Cierre"
            placeholder="Ej. Renuncia voluntaria, mutuo acuerdo, etc."
            required
            withAsterisk
            minRows={3}
            value={motivoCierre}
            onChange={(e) => setMotivoCierre(e.currentTarget.value)}
            classNames={{
              input: "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 text-white placeholder:text-zinc-500",
              label: "text-zinc-300 font-medium mb-1 text-sm",
            }}
          />

          <Divider label="Evidencias (opcional)" labelPosition="left" />
          <MultiFilePicker
            files={evidenciasFinalizar}
            onFilesChange={setEvidenciasFinalizar}
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
            multiple
            label="Adjuntar evidencias al finalizar"
            description="Documentos o imágenes de respaldo (acta de término, carta de renuncia, etc.)"
          />
          <Group justify="flex-end" gap="sm" mt="md">
            <Button
              variant="subtle"
              onClick={() => setModalFinalizarAbierto(false)}
              disabled={submittingFinalizar}
              radius="lg"
              className="text-zinc-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              color="orange"
              onClick={handleConfirmarFinalizar}
              loading={submittingFinalizar}
              disabled={!fechaFinAnticipada || !motivoCierre.trim()}
              radius="lg"
              className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-950/20"
            >
              Confirmar Finalización
            </Button>
          </Group>
        </Stack>
      </ModalEstandar>

      {/* Modal para registrar adenda */}
      {modalAdendaAbierto && contratoAEditar && (
        <ModalAdendaContrato
          contrato={contratoAEditar}
          nombreEmpleado={nombreEmpleado}
          opened={modalAdendaAbierto}
          close={() => {
            setModalAdendaAbierto(false);
            setContratoAEditar(null);
          }}
          onSuccess={(payload) => {
            reload();
            if (payload?.empleado) {
              onContratoCreado?.({ empleado: payload.empleado });
            } else {
              onContratoCreado?.({});
            }

            // =====================================================================
            // CASCADA: notificación amigable. Todo se ajustó automáticamente en backend.
            // =====================================================================
            const ajustadas =
              (payload?.programaciones_ajustadas?.actualizadas ?? 0) +
              (payload?.programaciones_ajustadas?.creadas ?? 0) +
              (payload?.programaciones_ajustadas?.divididas ?? 0);

            if (ajustadas > 0) {
              notifySuccess(
                "Adenda registrada correctamente. La programación de horario del trabajador se actualizó automáticamente con las nuevas condiciones.",
              );
            }
          }}
        />
      )}

      {/* Modal de reasignación de horario (cascada Contrato → Programación) */}
      {modalReasignarAbierto && reAsignData && (
        <ModalAsignarHorario
          opened={modalReasignarAbierto}
          close={() => {
            setModalReasignarAbierto(false);
            setReAsignData(null);
          }}
          turnos={turnosDisponibles}
          onSuccess={() => {
            notifySuccess("Horario reasignado correctamente");
            setModalReasignarAbierto(false);
            setReAsignData(null);
          }}
          prefill={reAsignData.prefill}
          empleadoPreseleccionado={reAsignData.idEmpleado}
          motivoReasignacion={reAsignData.motivo}
        />
      )}
    </>
  );
};

/**
 * Helper que mapea el estado del contrato a un set de clases y label
 * consistente para los badges y paper backgrounds.
 */
const contratoEstadoBadge = (estado: string): {
  label: string;
  color: string;
  paperClass: string;
  barClass: string;
  iconWrapperClass: string;
  iconClass: string;
} => {
  switch (estado) {
    case EstadoContrato.Vigente:
      return {
        label: "Vigente",
        color: "green",
        paperClass: "bg-teal-500/5 border-teal-500/30 hover:border-teal-500/50",
        barClass: "from-teal-500/40 via-teal-500/60 to-teal-500/10",
        iconWrapperClass: "bg-teal-500/10 border-teal-500/20",
        iconClass: "text-teal-400",
      };
    case EstadoContrato.Pendiente:
      return {
        label: "Pendiente",
        color: "blue",
        paperClass: "bg-blue-500/5 border-blue-500/30 hover:border-blue-500/50",
        barClass: "from-blue-500/40 via-blue-500/60 to-blue-500/10",
        iconWrapperClass: "bg-blue-500/10 border-blue-500/20",
        iconClass: "text-blue-400",
      };
    case EstadoContrato.TerminoAnticipado:
      return {
        label: "Término Anticipado",
        color: "orange",
        paperClass: "bg-orange-500/5 border-orange-500/30 hover:border-orange-500/50",
        barClass: "from-orange-500/40 via-orange-500/60 to-orange-500/10",
        iconWrapperClass: "bg-orange-500/10 border-orange-500/20",
        iconClass: "text-orange-400",
      };
    case EstadoContrato.Finalizado:
    default:
      return {
        label: "Finalizado",
        color: "gray",
        paperClass: "bg-zinc-900/30 border-zinc-800/80 hover:bg-zinc-900/50 hover:border-indigo-500/20",
        barClass: "from-zinc-500/20 via-indigo-500/30 to-indigo-500/5",
        iconWrapperClass: "bg-indigo-500/10 border-indigo-500/20",
        iconClass: "text-indigo-400",
      };
  }
};
