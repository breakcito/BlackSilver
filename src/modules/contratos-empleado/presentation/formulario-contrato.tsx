import { useState, useEffect } from "react";
import {
  Stack,
  Group,
  TextInput,
  Select,
  Switch,
  Button,
  NumberInput,
  Text,
  Divider,
  Alert,
  ActionIcon,
} from "@mantine/core";
import {
  BriefcaseIcon,
  MapPinIcon,
  CalendarIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  BanknotesIcon,
  ClockIcon,
  CheckCircleIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useRegistroContratoEmpleado } from "../hooks/useRegistroContratoEmpleado";
import { TipoContrato } from "../../../shared/enums/tipo-contrato";
import { MultiFilePicker } from "../../../presentation/utils/archivo/multifile-picker";
import { CustomDatePicker } from "../../../presentation/utils/date-picker-input";
import type { DTO_CrearEmpleado } from "../../personal/service/empleados.requests";
import { useNotify } from "../../../hooks/useNotify";
import { useAuditoriaStore } from "../../../stores/auditoria.store";
import { ContratosEmpleadoService } from "../service/contratos-empleado.service";
import {
  Schema_CrearContratoEmpleado,
  type DTO_CrearContratoEmpleado,
} from "../service/contratos-empleado.requests";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { RegistroArea } from "../../organigrama/presentation/registro-area";
import { RegistroCargo } from "../../organigrama/presentation/registro-cargo";
import { useRegistroArea } from "../../organigrama/hooks/useRegistroArea";
import { useRegistroCargo } from "../../organigrama/hooks/useRegistroCargo";

interface FormularioContratoEmpleadoProps {
  idEmpleado: number;
  onSuccess?: (payload?: unknown) => void;
  onCancel?: () => void;
  embedded?: boolean;
  /**
   * Si se pasa, en lugar de hacer un POST standalone, se usa el endpoint
   * orquestador `POST /api/empleados/con-contrato` con los datos del empleado.
   */
  formEmpleado?: DTO_CrearEmpleado;
  fotoEmpleado?: File | null;
  /**
   * Contrato anterior del mismo empleado. Si se pasa, se pre-rellenan los
   * campos del nuevo contrato con los valores del anterior (excepto fechas
   * y remuneración editable). El usuario puede cambiar todo.
   */
  contratoAnterior?: import("../../../service/responses/contrato-empleado").RES_ContratoEmpleado;
  /**
   * Fecha mínima sugerida (YYYY-MM-DD) para el datepicker de fecha_inicio.
   * Solo restricción visual en el calendario; el backend no la valida.
   */
  fechaInicioSugerida?: string;
  esContratista?: boolean;
}

const toNum = (v: unknown) => {
  if (v === "" || v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Convierte un valor (Date | string | null | undefined) a un string YYYY-MM-DD.
 * Si es Date → ISO sin hora.
 * Si es string → lo retorna tal cual.
 * Si es null/undefined → "".
 */
const toIsoDate = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "";
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return "";
    return v.toISOString().split("T")[0];
  }
  if (typeof v === "string") return v;
  return "";
};

/**
 * Formatea un valor (Date | string | null | undefined) como DD/MM/YYYY.
 */
const formatDateDisplay = (
  val: Date | string | null | undefined,
): string => {
  const iso = toIsoDate(val);
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export const FormularioContratoEmpleado = ({
  idEmpleado,
  onSuccess,
  onCancel,
  embedded = false,
  formEmpleado,
  fotoEmpleado,
  contratoAnterior,
  fechaInicioSugerida,
  esContratista = false,
}: FormularioContratoEmpleadoProps) => {
  const { notify } = useNotify();
  const { en_modo_auditable } = useAuditoriaStore();
  const {
    form,
    setField,
    idArea,
    setIdArea,
    evidencias,
    setEvidencias,
    areas,
    setAreas,
    cargos,
    setTodosCargos,
    cargosSelectData,
    empresasSelectData,
    almacenes,
    labores,
    tipoLugar,
    setTipoLugar,
    lugarIdActual,
    setLugarId,
    loadingAreas,
    loadingCargos,
    loadingAlmacenes,
    loadingLabores,
    loadingEmpresas,
    loadingOficinas,
    oficinas,
    tiposContratoOptions,
    periodosDuracionOptions,
    duracionDiasCalc,
    loading,
    handleSubmit,
  } = useRegistroContratoEmpleado(idEmpleado, (payload) => onSuccess?.(payload));

  const [openedAddArea, setOpenedAddArea] = useState(false);
  const [openedAddCargo, setOpenedAddCargo] = useState(false);

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
      setField("id_cargo", nuevoCargo.id_cargo);
      if (nuevoCargo.id_area) {
        setIdArea(nuevoCargo.id_area);
      }
      setOpenedAddCargo(false);
    },
    () => setOpenedAddCargo(false),
    idArea
  );

  const [fechaFinError, setFechaFinError] = useState<string | null>(null);
  const [datosPrecargados, setDatosPrecargados] = useState(false);

  // Pre-rellenar el form con los datos del contrato anterior (solo una vez al montar)
  useEffect(() => {
    if (contratoAnterior && !datosPrecargados && !form.id_cargo) {
      // Cargo
      if (contratoAnterior.id_cargo) {
        setField("id_cargo", contratoAnterior.id_cargo);
      }
      // Empresa
      if (contratoAnterior.id_empresa) {
        setField("id_empresa", contratoAnterior.id_empresa);
      }
      // Tipo de contrato
      if (
        contratoAnterior.tipo_contrato === "Planilla" ||
        contratoAnterior.tipo_contrato === "JornadaDiaria" ||
        contratoAnterior.tipo_contrato === "PeriodoPrueba"
      ) {
        setField(
          "tipo_contrato",
          contratoAnterior.tipo_contrato as TipoContrato,
        );
      }
      // Remuneración según tipo
      if (
        contratoAnterior.tipo_contrato === "Planilla" ||
        contratoAnterior.tipo_contrato === "PeriodoPrueba"
      ) {
        if (contratoAnterior.sueldo_base !== null) {
          setField(
            "sueldo_base",
            Number(contratoAnterior.sueldo_base),
          );
        }
      } else if (contratoAnterior.tipo_contrato === "JornadaDiaria") {
        if (contratoAnterior.salario_diario !== null) {
          setField(
            "salario_diario",
            Number(contratoAnterior.salario_diario),
          );
        }
      }
      // Por tiempo indefinido
      setField(
        "por_tiempo_indefinido",
        Boolean(contratoAnterior.por_tiempo_indefinido),
      );
      // Almacén
      if (contratoAnterior.id_almacen) {
        setTipoLugar("almacen");
        setField("id_almacen", contratoAnterior.id_almacen);
      }
      // Labor
      if (contratoAnterior.id_labor) {
        setTipoLugar("labor");
        setField("id_labor", contratoAnterior.id_labor);
      }
      setDatosPrecargados(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contratoAnterior]);

  // Auto-completar fecha_inicio con la fecha sugerida (un día después del
  // contrato anterior). Se aplica al cargar los datos precargados del contrato anterior.
  useEffect(() => {
    if (
      fechaInicioSugerida &&
      datosPrecargados
    ) {
      setField("fecha_inicio", fechaInicioSugerida);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datosPrecargados, fechaInicioSugerida]);

  // Validación reactiva: fecha_fin debe ser >= fecha_inicio
  useEffect(() => {
    if (form.fecha_fin && form.fecha_inicio && form.fecha_fin < form.fecha_inicio) {
      setFechaFinError("La fecha de fin no puede ser menor a la fecha de inicio");
    } else {
      setFechaFinError(null);
    }
  }, [form.fecha_fin, form.fecha_inicio]);

  const [submitting, setSubmitting] = useState(false);

  const fieldClasses = {
    input:
      "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
    label: "text-zinc-300 mb-1 font-medium",
  };

  const esSueldoMensual =
    form.tipo_contrato === TipoContrato.Planilla ||
    form.tipo_contrato === TipoContrato.PeriodoPrueba;
  const esPlanilla = esSueldoMensual;
  const esJornada = form.tipo_contrato === TipoContrato.JornadaDiaria;
  const esIndefinido = !!form.por_tiempo_indefinido;
  const esEmbebidoConEmpleado = embedded && !!formEmpleado;

  const handleFinal = async () => {
    // Si viene del form de empleado, usa el endpoint orquestador
    if (esEmbebidoConEmpleado) {
      // Forzar un id_empleado válido solo para pasar la validación.
      // El endpoint orquestador ignora este campo (se borra abajo) y crea
      // el empleado nuevo junto con el contrato.
      const formParaValidar = { ...form, id_empleado: 1 };
      const validation = SchemaOrq(formParaValidar);
      if (!validation.success) {
        notify({
          type: "info",
          content: validation.error.issues[0].message,
        });
        return;
      }
      const totalSize = (fotoEmpleado ? fotoEmpleado.size : 0) + evidencias.reduce((acc, f) => acc + f.size, 0);
      if (totalSize > 8 * 1024 * 1024) {
        notify({
          type: "error",
          content: "El total de archivos supera el límite máximo permitido.",
        });
        return;
      }

      setSubmitting(true);
      try {
        const empleadoPayload: Record<string, unknown> = {
          ...formEmpleado,
        };
        const contratoPayload: Record<string, unknown> = {
          ...validation.data,
        };
        delete contratoPayload.id_empleado;

        const resp =
          await ContratosEmpleadoService.crear_empleado_con_contrato(
            empleadoPayload,
            contratoPayload,
            fotoEmpleado ?? null,
            evidencias,
          );

        if (!resp.success) {
          notify({ type: "error", content: resp.message || "Error" });
          return;
        }
        notify({ type: "success", content: resp.message });
        onSuccess?.(resp.data);
      } catch (err) {
        console.error(err);
        notify({
          type: "error",
          content: "Error inesperado al registrar empleado con contrato",
        });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Modo standalone: POST /api/contratos-empleado
    await handleSubmit();
  };

  const submittingTotal = submitting || loading;

  return (
    <Stack gap="md">
      {/* Fila 1: Área · Cargo · Tipo de Contrato */}
      <Group grow align="flex-start" gap="md">
        {!esContratista && (
          <>
            <div className="flex gap-2 items-end">
              <Select
                label="Área"
                placeholder={loadingAreas ? "Cargando áreas..." : "Seleccione área"}
                data={areas.map((a) => ({
                  value: a.id_area.toString(),
                  label: a.nombre,
                }))}
                value={idArea?.toString() || null}
                onChange={(val) => setIdArea(val ? Number(val) : null)}
                leftSection={<BriefcaseIcon className="w-4 h-4 text-zinc-500" />}
                classNames={fieldClasses}
                radius="lg"
                size="xs"
                searchable
                disabled={loadingAreas || submittingTotal}
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
                disabled={submittingTotal}
              >
                <PlusIcon className="w-5 h-5 text-white" />
              </ActionIcon>
            </div>
            <div className="flex gap-2 items-end">
              <Select
                label="Cargo"
                placeholder={loadingCargos ? "Cargando..." : "Seleccione cargo"}
                data={cargosSelectData}
                value={
                  form.id_cargo && form.id_cargo > 0 ? String(form.id_cargo) : null
                }
                onChange={(val) => {
                  const cargoId = val ? Number(val) : 0;
                  setField("id_cargo", cargoId);
                  if (cargoId) {
                    const cargo = cargos.find((c) => c.id_cargo === cargoId);
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
                disabled={loadingCargos || submittingTotal}
                searchable
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
                disabled={submittingTotal}
              >
                <PlusIcon className="w-5 h-5 text-white" />
              </ActionIcon>
            </div>
          </>
        )}
        <Select
          label="Tipo de Contrato"
          placeholder="Seleccione"
          data={tiposContratoOptions}
          value={form.tipo_contrato ?? null}
          onChange={(val) =>
            setField(
              "tipo_contrato",
              (val as TipoContrato) ?? TipoContrato.Planilla,
            )
          }
          leftSection={<DocumentTextIcon className="w-4 h-4 text-zinc-500" />}
          classNames={fieldClasses}
          radius="lg"
          size="xs"
          required
          comboboxProps={{ withinPortal: true }}
          disabled={submittingTotal}
        />
      </Group>

      {/* Fila 2: Empresa · Remuneración (Sueldo Base o Salario Diario) */}
      <Group grow align="flex-start" gap="md">
        <Select
          label="Empresa"
          placeholder={
            loadingEmpresas ? "Cargando empresas..." : "Seleccione empresa"
          }
          data={empresasSelectData}
          value={form.id_empresa ? String(form.id_empresa) : null}
          onChange={(val) =>
            setField("id_empresa", val ? Number(val) : 0)
          }
          leftSection={<BuildingOfficeIcon className="w-4 h-4 text-zinc-500" />}
          classNames={fieldClasses}
          radius="lg"
          size="xs"
          searchable
          required
          withAsterisk
          comboboxProps={{ withinPortal: true }}
          disabled={submittingTotal}
        />
        {esPlanilla && (
          <>
            <NumberInput
              label={form.tipo_contrato === TipoContrato.PeriodoPrueba ? "Sueldo Mensual (S/)" : "Sueldo Base (S/)"}
              placeholder="Ej. 1500.00"
              decimalScale={2}
              fixedDecimalScale
              hideControls
              value={form.sueldo_base ?? ""}
              onChange={(v) => setField("sueldo_base", toNum(v))}
              leftSection={<CurrencyDollarIcon className="w-4 h-4 text-zinc-500" />}
              classNames={fieldClasses}
              radius="lg"
              size="xs"
              min={0}
              disabled={submittingTotal}
              withAsterisk
            />
            {!en_modo_auditable && (
              <NumberInput
                label="Sueldo Real (S/)"
                placeholder="Ej. 1800.00"
                decimalScale={2}
                fixedDecimalScale
                hideControls
                value={form.sueldo_real ?? ""}
                onChange={(v) => setField("sueldo_real", toNum(v))}
                leftSection={<CurrencyDollarIcon className="w-4 h-4 text-emerald-500" />}
                classNames={fieldClasses}
                radius="lg"
                size="xs"
                min={0}
                disabled={submittingTotal}
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
            value={form.salario_diario ?? ""}
            onChange={(v) => setField("salario_diario", toNum(v))}
            leftSection={<BanknotesIcon className="w-4 h-4 text-zinc-500" />}
            classNames={fieldClasses}
            radius="lg"
            size="xs"
            min={0}
            disabled={submittingTotal}
            withAsterisk
          />
        )}
      </Group>

      <Divider label="Vigencia del contrato" labelPosition="left" />
      <Group grow align="flex-start" gap="md">
        <CustomDatePicker
          label="Fecha de Inicio"
          placeholder="Seleccione fecha"
          value={form.fecha_inicio || null}
          onChange={(val) => setField("fecha_inicio", toIsoDate(val))}
          size="xs"
          disabled={submittingTotal}
          minDate={
            fechaInicioSugerida
              ? new Date(`${fechaInicioSugerida}T00:00:00`)
              : undefined
          }
        />
        <CustomDatePicker
          label="Fecha de Fin"
          placeholder="Seleccione fecha"
          value={form.fecha_fin || null}
          onChange={(val) => setField("fecha_fin", toIsoDate(val))}
          size="xs"
          disabled={esIndefinido || submittingTotal}
          error={fechaFinError ?? undefined}
          minDate={
            form.fecha_inicio ? new Date(`${form.fecha_inicio}T00:00:00`) : undefined
          }
        />
      </Group>

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
          checked={esIndefinido}
          onChange={(e) =>
            setField("por_tiempo_indefinido", e.currentTarget.checked)
          }
          color="indigo"
          size="md"
          disabled={submittingTotal}
        />
      </div>

      {!esIndefinido && (
        <Group grow align="flex-start" gap="md">
          <NumberInput
            label="Duración"
            placeholder="Ej. 3"
            hideControls
            value={form.duracion ?? ""}
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
            data={periodosDuracionOptions}
            value={form.periodo_duracion ?? null}
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

      <Divider label="Lugar de trabajo" labelPosition="left" />
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
          disabled={submittingTotal}
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
            tipoLugar === "almacen"
              ? loadingAlmacenes
                ? "Cargando almacenes..."
                : "Seleccione almacén"
              : tipoLugar === "labor"
                ? loadingLabores
                  ? "Cargando labores..."
                  : "Seleccione labor"
                : tipoLugar === "oficina"
                  ? loadingOficinas
                    ? "Cargando oficinas..."
                    : "Seleccione oficina"
                  : "Primero seleccione el tipo"
          }
          data={
            tipoLugar === "almacen"
              ? almacenes.map((a) => ({
                  value: a.id_almacen.toString(),
                  label: a.nombre,
                }))
              : tipoLugar === "labor"
                ? labores.map((l) => ({
                    value: l.id_labor.toString(),
                    label: l.nombre,
                  }))
                : tipoLugar === "oficina"
                  ? oficinas.map((o) => ({
                      value: o.id_oficina.toString(),
                      label: o.nombre,
                    }))
                  : []
          }
          value={lugarIdActual ? String(lugarIdActual) : null}
          onChange={(val) => setLugarId(val ? Number(val) : null)}
          leftSection={
            tipoLugar === "almacen" ? (
              <BuildingOfficeIcon className="w-4 h-4 text-zinc-500" />
            ) : tipoLugar === "oficina" ? (
              <BuildingOfficeIcon className="w-4 h-4 text-zinc-500" />
            ) : (
              <MapPinIcon className="w-4 h-4 text-zinc-500" />
            )
          }
          classNames={fieldClasses}
          radius="lg"
          size="xs"
          required
          withAsterisk
          searchable
          clearable
          comboboxProps={{ withinPortal: true }}
          disabled={
            !tipoLugar ||
            (tipoLugar === "almacen" && loadingAlmacenes) ||
            (tipoLugar === "labor" && loadingLabores) ||
            (tipoLugar === "oficina" && loadingOficinas) ||
            submittingTotal
          }
        />
      </Group>

      <Divider label="Evidencias (opcional)" labelPosition="left" />
      <MultiFilePicker
        files={evidencias}
        onFilesChange={setEvidencias}
        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
        multiple
        label="Adjuntar evidencias"
        description="Imágenes o documentos (PDF, JPG, PNG, XLSX, etc.)"
      />
      {/* Suprimido: los botones "Limpiar todas" y "Quitar última" — el MultiFilePicker
          ya tiene su propio "Limpiar todo" y tachito por archivo. */}

      {esEmbebidoConEmpleado && (
        <Alert
          variant="light"
          color="indigo"
          radius="md"
          icon={<CheckCircleIcon className="w-4 h-4" />}
          styles={{ message: { fontSize: "12px" } }}
        >
          Si todo está conforme, se asignará el contrato al empleado{" "}
          <strong>
            {formEmpleado?.nombre} {formEmpleado?.apellido}
          </strong>
          .
        </Alert>
      )}

      <Group justify="space-between" mt="md">
        <div className="text-xs text-zinc-500">
          {duracionDiasCalc !== null && !esIndefinido && (
            <Text size="xs" c="dimmed">
              Vigencia calculada: {formatDateDisplay(form.fecha_inicio)} → {formatDateDisplay(form.fecha_fin)} ({duracionDiasCalc} días)
            </Text>
          )}
        </div>
        {!embedded && (
          <Group gap="md">
            {onCancel && (
              <Button
                variant="subtle"
                onClick={onCancel}
                disabled={submittingTotal}
                radius="lg"
                size="sm"
                className="text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
              >
                Cancelar
              </Button>
            )}
            <Button
              loading={submittingTotal}
              onClick={() => {
                void handleFinal();
              }}
              radius="lg"
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20 px-8"
            >
              {esEmbebidoConEmpleado
                ? "Guardar Empleado y Contrato"
                : "Guardar Contrato"}
            </Button>
          </Group>
        )}
      </Group>

      {embedded && onCancel && (
        <Group justify="flex-end" gap="md" mt="md">
          <Button
            variant="subtle"
            onClick={onCancel}
            disabled={submittingTotal}
            radius="lg"
            size="sm"
            className="text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
          >
            Cancelar
          </Button>
          <Button
            loading={submittingTotal}
            onClick={() => {
              void handleFinal();
            }}
            radius="lg"
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20 px-8"
          >
            {esEmbebidoConEmpleado
              ? "Guardar Empleado y Contrato"
              : "Guardar Contrato"}
          </Button>
        </Group>
      )}
      {/* Sub-modal: Registrar Área al vuelo */}
      <ModalEstandar
        opened={openedAddArea}
        close={() => setOpenedAddArea(false)}
        title="Registrar Nueva Área"
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

      {/* Sub-modal: Registrar Cargo al vuelo */}
      <ModalEstandar
        opened={openedAddCargo}
        close={() => setOpenedAddCargo(false)}
        title="Registrar Nuevo Cargo"
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
    </Stack>
  );
};

// Validación Zod local (duplicado del import) — usado en modo embebido
const SchemaOrq = (data: unknown) =>
  Schema_CrearContratoEmpleado.safeParse(
    data as DTO_CrearContratoEmpleado,
  );

// Re-export de tipo auxiliar
export type { TipoContrato };
