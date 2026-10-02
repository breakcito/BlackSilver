import { useEffect, useMemo, useState } from "react";
import {
  Stack,
  Group,
  Text,
  Select,
  MultiSelect,
  Switch,
  Button,
  Divider,
  Alert,
  Badge,
  Checkbox,
  Avatar,
  Tooltip,
  ActionIcon,
  Popover,
} from "@mantine/core";
import {
  CalendarDaysIcon,
  UsersIcon,
  ClockIcon,
  PlusIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  PencilIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { CustomDatePicker } from "../../../presentation/utils/date-picker-input";
import {
  useAsignarHorario,
  type AsignarHorarioPrefill,
} from "../hooks/useAsignarHorario";
import { useEmpleadosElegibles } from "../hooks/useEmpleadosElegibles";
import type { RES_TurnoLaboral } from "../service/turnos.responses";
import type { RES_EmpleadoElegible } from "../service/programacion.responses";
import { useNotify } from "../../../hooks/useNotify";

interface ModalAsignarHorarioProps {
  opened: boolean;
  close: () => void;
  turnos: RES_TurnoLaboral[];
  onSuccess?: () => void;
  onRegistrarTurnoClick?: () => void;
  prefill?: AsignarHorarioPrefill;
  empleadoPreseleccionado?: number;
  motivoReasignacion?: string;
  turnoNuevoCreadoId?: number | null;
}

const NOMBRES_DIAS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const toIso = (v: Date | string | null | undefined): string => {
  if (!v) return "";
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return "";
    return v.toISOString().split("T")[0];
  }
  return v;
};

const formatDMY = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const format12h = (timeStr: string | null | undefined): string => {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  let hour = parseInt(parts[0], 10);
  const min = parts[1];
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  hour = hour ? hour : 12;
  const hourStr = hour < 10 ? `0${hour}` : `${hour}`;
  return `${hourStr}:${min} ${ampm}`;
};

export const ModalAsignarHorario = ({
  opened,
  close,
  turnos,
  onSuccess,
  onRegistrarTurnoClick,
  prefill,
  empleadoPreseleccionado,
  motivoReasignacion,
  turnoNuevoCreadoId,
}: ModalAsignarHorarioProps) => {
  const { notifyError } = useNotify();
  const {
    form,
    setField,
    toggleDia,
    reset,
    loading,
    handleSubmit,
    tipoLugar,
    setTipoLugar,
    lugarIdActual,
    setLugarId,
    turnosEspecialesPorDia,
    setTurnoEspecialDia,
  } = useAsignarHorario(
    () => {
      onSuccess?.();
      close();
    },
    prefill,
    empleadoPreseleccionado ? [empleadoPreseleccionado] : undefined,
  );

  useEffect(() => {
    if (opened && turnoNuevoCreadoId && form.id_turno_laboral !== turnoNuevoCreadoId) {
      setField("id_turno_laboral", turnoNuevoCreadoId);
    }
  }, [opened, turnoNuevoCreadoId, form.id_turno_laboral, setField]);

  // Determinar fecha_fin para la consulta de elegibles.
  // Si es indefinido, se envía null (el backend aceptará siempre).
  const fechaFinParaElegibles = form.por_tiempo_indefinido
    ? null
    : toIso(form.fecha_fin) || null;

  // Carga de catálogos auxiliares.
  const [almacenesOptions, setAlmacenesOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [laboresOptions, setLaboresOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [oficinasOptions, setOficinasOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);

  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      try {
        const [alm, lab, ofi] = await Promise.all([
          import("../../../service/auxiliar.service").then((m) =>
            m.AuxService.get_almacenes({ es_principal: false }),
          ),
          import("../../../service/auxiliar.service").then((m) =>
            m.AuxService.get_labores(),
          ),
          import("../../../service/auxiliar.service").then((m) =>
            m.AuxService.get_oficinas(),
          ),
        ]);
        if (cancelado) return;
        if (alm.success) {
          const data = alm.data as Array<{
            id_almacen: number;
            nombre: string;
            es_principal: number;
          }>;
          setAlmacenesOptions(
            data.map((a) => ({ value: String(a.id_almacen), label: a.nombre })),
          );
        }
        if (lab.success) {
          const data = lab.data as Array<{ id_labor: number; nombre: string }>;
          setLaboresOptions(
            data.map((l) => ({ value: String(l.id_labor), label: l.nombre })),
          );
        }
        if (ofi.success) {
          const data = ofi.data as Array<{ id_oficina: number; nombre: string }>;
          setOficinasOptions(
            data.map((o) => ({ value: String(o.id_oficina), label: o.nombre })),
          );
        }
      } catch (err) {
        console.error(err);
      }
    };
    if (opened) {
      void cargar();
    }
    return () => {
      cancelado = true;
    };
  }, [opened]);

  // Hook de empleados: pasar fecha_fin (o null si es indefinido)
  // Se le permite seleccionar cualquier empleado elegible independientemente del tipo de lugar.
  const { empleados, loading: loadingEmpleados } = useEmpleadosElegibles(
    opened ? fechaFinParaElegibles : null,
    null,
    null,
  );

  const empleadosOptions = useMemo(
    () =>
      empleados.map((e: RES_EmpleadoElegible) => ({
        value: String(e.id_empleado),
        label: `${e.nombre_completo}`,
        disabled: !e.puede_cubrir,
        // Propiedades personalizadas que se pasan al renderOption
        puedeCubrir: e.puede_cubrir,
        fechaFinContrato: e.contrato_fecha_fin,
        urlFoto: e.url_foto,
        dni: e.dni,
      })),
    [empleados],
  );

  // EFECTO: Si un empleado ya estaba seleccionado y su contrato expira antes de la fecha elegida
  // (es decir, puede_cubrir cambia a false), se remueve de los seleccionados para evitar errores al guardar,
  // aunque seguirá figurando como "Fuera de rango" al desplegar el selector.
  const empleadosSeleccionadosStr = useMemo(
    () => form.empleados.join(","),
    [form.empleados],
  );

  useEffect(() => {
    if (form.empleados.length === 0 || empleados.length === 0) return;
    const idsValidos = new Set(
      empleados.filter((e) => e.puede_cubrir).map((e) => e.id_empleado),
    );
    const empleadosFiltrados = form.empleados.filter((id) => idsValidos.has(id));

    if (empleadosFiltrados.length !== form.empleados.length) {
      setField("empleados", empleadosFiltrados);
    }
    // Usamos la representación string estable para evitar ciclos infinitos de re-renderizado
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empleados, empleadosSeleccionadosStr, setField]);

  const handleConfirmar = async () => {
    if (form.id_turno_laboral <= 0) {
      notifyError("Debe seleccionar un turno laboral");
      return;
    }
    if (form.empleados.length === 0) {
      notifyError("Debe seleccionar al menos un empleado");
      return;
    }
    if (!form.por_tiempo_indefinido && !form.fecha_fin) {
      notifyError("Debe indicar una fecha de fin o activar tiempo indefinido");
      return;
    }
    if (form.dias_laborables.split("").filter((c) => c === "1").length === 0) {
      notifyError("Debe marcar al menos un día laborable");
      return;
    }
    await handleSubmit();
  };

  const fieldClasses = {
    input:
      "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
    label: "text-zinc-300 mb-1 font-medium",
  };

  return (
    <ModalEstandar
      opened={opened}
      close={close}
      title="Asignar Horario"
      validateClose
      size="xl"
    >
      <Stack gap="md">
        {motivoReasignacion && (
          <Alert
            variant="light"
            color="indigo"
            icon={<ExclamationTriangleIcon className="w-5 h-5" />}
            radius="lg"
            className="bg-indigo-500/5 border-indigo-500/30"
            classNames={{ message: "text-zinc-200 text-sm" }}
          >
            <strong>Reasignación por cambio de contrato.</strong>{" "}
            {motivoReasignacion}
            <br />
            <span className="text-zinc-400 text-xs">
              Se precargaron los datos del horario anterior. Verifica los
              valores antes de guardar.
            </span>
          </Alert>
        )}
        <Group align="flex-end" gap="xs">
          <div style={{ flex: 1 }}>
            <Select
              label="Horario"
              placeholder={
                turnos.length === 0
                  ? "Cree primero un horario en 'Registrar Horarios'"
                  : "Seleccione un horario"
              }
              data={turnos.map((t) => ({
                value: String(t.id),
                label: `${t.tipo_turno} · ${format12h(t.hora_ingreso)} - ${format12h(t.hora_salida)}`,
              }))}
              value={
                form.id_turno_laboral > 0 ? String(form.id_turno_laboral) : null
              }
              onChange={(v) => setField("id_turno_laboral", v ? Number(v) : 0)}
              leftSection={<ClockIcon className="w-4 h-4 text-zinc-500" />}
              classNames={fieldClasses}
              radius="lg"
              size="xs"
              required
              withAsterisk
              searchable
              comboboxProps={{ withinPortal: true }}
              disabled={loading}
            />
          </div>
          {onRegistrarTurnoClick && (
            <Tooltip label="Registrar nuevo horario">
              <ActionIcon
                color="indigo"
                variant="filled"
                size="30px"
                radius="lg"
                onClick={onRegistrarTurnoClick}
                disabled={loading}
              >
                <PlusIcon className="w-5 h-5 text-white" />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>

        <Group grow align="flex-start" gap="md">
          <Select
            label="Tipo de lugar"
            placeholder="Seleccione"
            data={[
              { value: "almacen", label: "Almacén" },
              { value: "labor", label: "Labor" },
              { value: "oficina", label: "Oficina" },
            ]}
            value={tipoLugar || null}
            onChange={(val) =>
              setTipoLugar(
                (val as "" | "almacen" | "labor" | "oficina" | null) ?? "",
              )
            }
            leftSection={<MapPinIcon className="w-4 h-4 text-zinc-500" />}
            classNames={fieldClasses}
            radius="lg"
            size="xs"
            required
            withAsterisk
            comboboxProps={{ withinPortal: true }}
            disabled={loading}
          />
          <Select
            label={
              tipoLugar === "almacen"
                ? "Almacén"
                : tipoLugar === "labor"
                  ? "Labor"
                  : tipoLugar === "oficina"
                    ? "Oficina"
                    : "Específico"
            }
            placeholder={
              tipoLugar === ""
                ? "Primero seleccione el tipo"
                : tipoLugar === "almacen"
                  ? "Seleccione almacén"
                  : tipoLugar === "labor"
                    ? "Seleccione labor"
                    : "Seleccione oficina"
            }
            data={
              tipoLugar === "almacen"
                ? almacenesOptions
                : tipoLugar === "labor"
                  ? laboresOptions
                  : tipoLugar === "oficina"
                    ? oficinasOptions
                    : []
            }
            value={lugarIdActual ? String(lugarIdActual) : null}
            onChange={(val) => setLugarId(val ? Number(val) : null)}
            leftSection={
              <BuildingOfficeIcon className="w-4 h-4 text-zinc-500" />
            }
            classNames={fieldClasses}
            radius="lg"
            size="xs"
            required
            withAsterisk
            searchable
            clearable
            comboboxProps={{ withinPortal: true }}
            disabled={!tipoLugar || loading}
          />
        </Group>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <CustomDatePicker
            label="Fecha de Inicio"
            placeholder="Seleccione fecha"
            value={form.fecha_inicio || null}
            onChange={(val) => setField("fecha_inicio", toIso(val))}
            size="xs"
            disabled={loading}
          />
          <CustomDatePicker
            label="Fecha de Fin"
            placeholder="Seleccione fecha"
            value={form.fecha_fin || null}
            onChange={(val) => setField("fecha_fin", toIso(val))}
            size="xs"
            disabled={form.por_tiempo_indefinido || loading}
            minDate={
              form.fecha_inicio
                ? new Date(`${form.fecha_inicio}T00:00:00`)
                : undefined
            }
          />
          <div className="flex flex-col gap-1.5 h-full justify-end">
            <span className="text-[11px] text-transparent select-none font-medium leading-normal">
              Spacer
            </span>
            <div className="flex items-center h-[30px]">
              <Switch
                label="Por tiempo indefinido"
                checked={form.por_tiempo_indefinido}
                onChange={(e) => {
                  const checked = e.currentTarget.checked;
                  setField("por_tiempo_indefinido", checked);
                  if (checked) {
                    setField("fecha_fin", null);
                  }
                }}
                color="indigo"
                size="sm"
                classNames={{ label: "text-zinc-300 font-medium" }}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <div>
          <MultiSelect
            label="Empleados Involucrados"
            placeholder="Seleccione uno o varios empleados"
            data={empleadosOptions}
            value={form.empleados.map(String)}
            onChange={(values) =>
              setField(
                "empleados",
                values.map((v) => Number(v)),
              )
            }
            searchable
            clearable
            maxDropdownHeight={320}
            leftSection={<UsersIcon className="w-4 h-4 text-zinc-500" />}
            classNames={fieldClasses}
            radius="lg"
            size="xs"
            comboboxProps={{ withinPortal: true }}
            disabled={loading || loadingEmpleados}
            renderOption={({ option, checked }) => {
              const opt = option as unknown as {
                puedeCubrir?: boolean;
                fechaFinContrato?: string | null;
                urlFoto?: string | null;
                dni?: string | null;
                label: string;
              };
              const node = (
                <Group gap="sm" wrap="nowrap" className="w-full">
                  <Avatar
                    src={opt.urlFoto ?? undefined}
                    size={26}
                    radius="xl"
                    color="indigo"
                    variant="light"
                  >
                    {opt.label?.[0] ?? "?"}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <Text size="xs" fw={600} className="text-zinc-200 truncate">
                      {opt.label}
                    </Text>
                    <Group gap={6} wrap="nowrap">
                      {opt.dni && (
                        <Text size="10px" className="text-zinc-500 font-mono">
                          DNI {opt.dni}
                        </Text>
                      )}
                      {!opt.puedeCubrir && opt.fechaFinContrato && (
                        <Text
                          size="10px"
                          className="text-amber-500 font-medium"
                        >
                          • Culmina el {formatDMY(opt.fechaFinContrato)}
                        </Text>
                      )}
                    </Group>
                  </div>
                  {!opt.puedeCubrir && (
                    <Badge color="orange" variant="light" size="xs">
                      Fuera de rango
                    </Badge>
                  )}
                  {checked && (
                    <Badge color="indigo" variant="filled" size="xs">
                      OK
                    </Badge>
                  )}
                </Group>
              );
              return node;
            }}
          />
          <Text
            size="11px"
            className="pl-1 text-rose-400/90 font-medium"
            mt={4}
          >
            Solo aparecen empleados con contrato vigente Activo.
          </Text>
        </div>

        <Divider
          label={
            <Group gap={4}>
              <Text size="xs" fw={500}>
                Días Laborables (Domingo a Sábado)
              </Text>
              <Text size="xs" c="red" fw={700}>
                *
              </Text>
            </Group>
          }
          labelPosition="left"
        />

        <Group
          gap="xs"
          wrap="wrap"
          className="bg-zinc-900/30 p-2.5 rounded-xl border border-zinc-800/80"
        >
          <Text size="xs" fw={600} className="text-zinc-400 mr-1">
            Selección rápida:
          </Text>
          <Button
            size="xs"
            variant="light"
            color="indigo"
            radius="md"
            onClick={() => setField("dias_laborables", "0111110")}
            disabled={loading}
          >
            Lunes a Viernes
          </Button>
          <Button
            size="xs"
            variant="light"
            color="indigo"
            radius="md"
            onClick={() => setField("dias_laborables", "0111111")}
            disabled={loading}
          >
            Lunes a Sábado
          </Button>
          <Button
            size="xs"
            variant="light"
            color="indigo"
            radius="md"
            onClick={() => setField("dias_laborables", "1111111")}
            disabled={loading}
          >
            Lunes a Domingo
          </Button>
          <Button
            size="xs"
            variant="subtle"
            color="gray"
            radius="md"
            onClick={() => setField("dias_laborables", "0000000")}
            disabled={loading}
          >
            Limpiar todo
          </Button>
        </Group>

        <Group grow gap="xs">
          {NOMBRES_DIAS.map((nombre, indice) => {
            const arr = form.dias_laborables.split("");
            const activo = arr[indice] === "1";
            const turnoEspecialId = turnosEspecialesPorDia[indice];
            const esEspecial = activo && Boolean(turnoEspecialId);

            // Obtener el turno que aplicará para este día
            const idTurnoAplicable = turnoEspecialId || form.id_turno_laboral;
            const turnoObj = turnos.find((t) => t.id === idTurnoAplicable);

            return (
              <div
                key={indice}
                className={`relative flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                  activo
                    ? esEspecial
                      ? "bg-amber-500/15 border-amber-500/60 shadow-sm shadow-amber-950/20"
                      : "bg-indigo-500/15 border-indigo-500/50"
                    : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
                }`}
              >
                {/* Lápiz para personalizar turno del día si el día está activo */}
                {activo && (
                  <Popover
                    position="top"
                    withArrow
                    shadow="md"
                    trapFocus
                    withinPortal
                    closeOnClickOutside={false}
                  >
                    <Popover.Target>
                      <Tooltip
                        label={
                          esEspecial
                            ? `Turno personalizado: ${turnoObj?.tipo_turno ?? ""}`
                            : "Personalizar horario para este día"
                        }
                        position="top"
                        withArrow
                      >
                        <ActionIcon
                          size="18px"
                          radius="xl"
                          variant={esEspecial ? "filled" : "subtle"}
                          color={esEspecial ? "amber" : "gray"}
                          className="absolute top-1 right-1 opacity-80 hover:opacity-100"
                          disabled={loading}
                        >
                          <PencilIcon className="w-2.5 h-2.5" />
                        </ActionIcon>
                      </Tooltip>
                    </Popover.Target>

                    <Popover.Dropdown className="bg-zinc-900 border border-zinc-700/80 p-3 rounded-xl w-64 shadow-2xl">
                      <Stack gap="xs">
                        <Text size="xs" fw={600} className="text-zinc-200">
                          Horario para {nombre}
                        </Text>
                        <Select
                          size="xs"
                          radius="lg"
                          classNames={fieldClasses}
                          leftSection={
                            <ClockIcon className="w-3.5 h-3.5 text-zinc-500" />
                          }
                          data={turnos.map((t) => ({
                            value: String(t.id),
                            label: `${t.tipo_turno} (${format12h(t.hora_ingreso)} - ${format12h(t.hora_salida)})`,
                          }))}
                          value={String(
                            idTurnoAplicable > 0 ? idTurnoAplicable : "",
                          )}
                          onChange={(val) => {
                            if (!val) return;
                            const numVal = Number(val);
                            if (numVal === form.id_turno_laboral) {
                              setTurnoEspecialDia(indice, null);
                            } else {
                              setTurnoEspecialDia(indice, numVal);
                            }
                          }}
                          comboboxProps={{ withinPortal: false }}
                        />
                        {esEspecial && (
                          <Button
                            size="compact-xs"
                            variant="subtle"
                            color="gray"
                            onClick={() => setTurnoEspecialDia(indice, null)}
                          >
                            Restablecer a general
                          </Button>
                        )}
                      </Stack>
                    </Popover.Dropdown>
                  </Popover>
                )}

                <Checkbox
                  checked={activo}
                  onChange={() => toggleDia(indice)}
                  color={esEspecial ? "amber" : "indigo"}
                  size="sm"
                  aria-label={nombre}
                  disabled={loading}
                />

                <Text
                  size="10px"
                  fw={600}
                  className={
                    activo
                      ? esEspecial
                        ? "text-amber-300 uppercase tracking-wider"
                        : "text-indigo-300 uppercase tracking-wider"
                      : "text-zinc-500 uppercase tracking-wider"
                  }
                >
                  {nombre.slice(0, 3)}
                </Text>

                {/* Subtexto breve con horas o indicador especial */}
                {activo && (
                  <Text
                    size="8px"
                    fw={500}
                    className={`truncate max-w-full font-mono ${
                      esEspecial
                        ? "text-amber-400/90 font-semibold"
                        : "text-zinc-400"
                    }`}
                  >
                    {turnoObj
                      ? `${format12h(turnoObj.hora_ingreso).replace(/\s[AP]M/, "")}-${format12h(turnoObj.hora_salida).replace(/\s[AP]M/, "")}`
                      : "Turno"}
                  </Text>
                )}
              </div>
            );
          })}
        </Group>

        {form.empleados.length > 1 && (
          <Alert
            variant="light"
            color="grape"
            radius="md"
            icon={<UsersIcon className="w-4 h-4" />}
            styles={{ message: { fontSize: "12px" } }}
          >
            <strong>Ingreso masivo:</strong> se crearán {form.empleados.length}{" "}
            programaciones individuales (una por empleado) con el mismo turno y
            rango.
          </Alert>
        )}

        {!form.por_tiempo_indefinido && form.fecha_fin && (
          <Text size="xs" c="dimmed" className="flex items-center gap-1">
            <CalendarDaysIcon className="w-3.5 h-3.5" />
            Vigencia calculada: {formatDMY(form.fecha_inicio)} →{" "}
            {formatDMY(form.fecha_fin)}
          </Text>
        )}

        <Group justify="flex-end" mt="md" gap="md">
          <Button
            variant="subtle"
            onClick={() => {
              reset();
              close();
            }}
            disabled={loading}
            radius="lg"
            size="sm"
            className="text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
          >
            Cancelar
          </Button>
          <Button
            loading={loading}
            onClick={() => {
              void handleConfirmar();
            }}
            radius="lg"
            size="sm"
            leftSection={<ClockIcon className="w-4 h-4" />}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20 px-8"
          >
            Asignar Horario
          </Button>
        </Group>
      </Stack>
    </ModalEstandar>
  );
};