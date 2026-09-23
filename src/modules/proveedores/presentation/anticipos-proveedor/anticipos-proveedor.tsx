import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { TimeInput } from "@mantine/dates";
import {
  IconAlertTriangle,
  IconBuildingBank,
  IconCash,
  IconCircleX,
  IconNotes,
  IconPaperclip,
  IconPlus,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import "dayjs/locale/es";

import { AuxService } from "../../../../service/auxiliar.service";
import type { ProveedoresService } from "../../service/proveedores.service";
import type {
  AnticipoProveedorResponse,
  IArchivo,
} from "../../service/proveedores.responses";
import type { RegistrarAnticipoRequest } from "../../service/proveedores.requests";
import { MedioPago } from "../../../../shared/enums/anticipo-proveedor/medio-pago";
import type { RES_Empresa } from "../../../../service/responses/empresa";
import type { RES_CuentaEmpresa } from "../../../../service/responses/cuenta-empresa";
import { EstadoBase } from "../../../../shared/enums/_generic/estado-base";
import { useNotify } from "../../../../hooks/useNotify";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import { ArchivoCard } from "../../../../presentation/utils/archivo/archivo-card";
import { MultiFilePicker } from "../../../../presentation/utils/archivo/multifile-picker";
import { CustomDatePicker } from "../../../../presentation/utils/date-picker-input";
import { subirAnticipos } from "../../service/upload-anticipos";
import { ThemeIcon } from "@mantine/core";
import { formatMontoPEN } from "../../../../shared/functions/format-monto-pen";

dayjs.locale("es");

// fieldClasses: estilo dark premium alineado con control-uso (Reglas de
// codigo #8 del README). Inputs comparten el mismo look para que el
// operador no sienta que el modulo de anticipos vive en otro sistema.
const fieldClasses = {
  input:
    "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
  label: "text-zinc-400 font-medium text-xs",
};

interface Props {
  idProveedor: number;
  razonSocial: string;
  service: typeof ProveedoresService;
  onChanged?: (anticipos: AnticipoProveedorResponse[]) => void;
}

const DEFAULT_CUPPER_ID = 1;

export const AnticiposProveedor = ({
  idProveedor,
  service,
  onChanged,
}: Props) => {
  const { notifySuccess, notifyError } = useNotify();

  const [anticipos, setAnticipos] = useState<AnticipoProveedorResponse[]>([]);
  const [loading, setLoading] = useState(false);

  // Catálogos
  const [empresas, setEmpresas] = useState<RES_Empresa[]>([]);
  const [cuentas, setCuentas] = useState<RES_CuentaEmpresa[]>([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);
  const [loadingCuentas, setLoadingCuentas] = useState(false);

  // Form. Medio de pago preseleccionado al primero (Transferencia) para
  // que el operador no tenga que elegir si la operacion tipica es esa.
  // Fecha y hora arrancan VACIAS para que el operador pueda borrarlas
  // libremente sin que el sistema las rellene automaticamente. Si elige
  // Efectivo, los campos opcionales (fecha/hora/operacion) siguen
  // visibles: si el usuario los llena, se envian al backend.
  const [idEmpresa, setIdEmpresa] = useState<string | null>(
    String(DEFAULT_CUPPER_ID),
  );
  const [idCuenta, setIdCuenta] = useState<string | null>(null);
  const [medioPago, setMedioPago] = useState<string | null>(
    MedioPago.Transferencia,
  );
  const [fechaPago, setFechaPago] = useState<Date | null>(null);
  const [horaPagoStr, setHoraPagoStr] = useState<string>("");
  const [numeroOperacion, setNumeroOperacion] = useState("");
  const [saldo, setSaldo] = useState<string>("");
  const [evidenciasFiles, setEvidenciasFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Ref del TimeInput para invocar `showPicker()` nativo al click/focus.
  // Mismo truco que control-uso -> Hora Inicio (refInicioRefs...showPicker).
  // Asi el operador ve el reloj (horas / minutos) sin tipear el primer
  // caracter.
  const horaPagoRef = useRef<HTMLInputElement>(null);

  // Normaliza HH:MM -> HH:MM (descarta segundos si los trae el input).
  const formatHora = (val: string): string => {
    const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(val ?? "");
    return match ? `${match[1]}:${match[2]}` : "";
  };

  // Anulacion
  const [confirmarAnular, setConfirmarAnular] =
    useState<AnticipoProveedorResponse | null>(null);
  const [anulandoId, setAnulandoId] = useState<number | null>(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const resp = await service.getAnticiposPorProveedor(idProveedor);
      if (resp.success && Array.isArray(resp.data)) {
        setAnticipos(resp.data);
        onChanged?.(resp.data);
      } else {
        notifyError(resp.message || "No se pudieron cargar los anticipos");
      }
    } catch (err) {
      console.error(err);
      notifyError("Error al cargar los anticipos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idProveedor]);

  // Catalogo de empresas (siempre se carga)
  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoadingCatalogos(true);
      try {
        const empRes = await AuxService.get_empresas({ estado: EstadoBase.Activo });
        if (cancel) return;
        if (empRes.success && Array.isArray(empRes.data)) {
          setEmpresas(empRes.data);
        }
      } catch (e) {
        console.error("No se pudieron cargar las empresas", e);
      } finally {
        if (!cancel) setLoadingCatalogos(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  // Catalogo de cuentas: depende de la empresa seleccionada.
  // Cuando el set llega por primera vez, preseleccionamos la primera
  // cuenta para que el operador no tenga que elegir (mismo patron que
  // medio_pago). Si el usuario cambia de empresa y la cuenta anterior ya
  // no esta en el nuevo set, la limpiamos.
  useEffect(() => {
    if (!idEmpresa) {
      setCuentas([]);
      setIdCuenta(null);
      return;
    }
    let cancel = false;
    setLoadingCuentas(true);
    (async () => {
      try {
        const empId = Number(idEmpresa);
        const ctRes = await AuxService.get_cuentas_empresa({
          id_empresa: empId,
          estado: EstadoBase.Activo,
        });
        if (cancel) return;
        if (ctRes.success && Array.isArray(ctRes.data)) {
          const lista = ctRes.data as RES_CuentaEmpresa[];
          setCuentas(lista);
          setIdCuenta((prev) => {
            if (lista.length === 0) return null;
            if (prev === null) return String(lista[0].id_cuenta_bancaria);
            const ok = lista.some(
              (c) => String(c.id_cuenta_bancaria) === prev,
            );
            return ok ? prev : String(lista[0].id_cuenta_bancaria);
          });
        }
      } catch (e) {
        console.error("No se pudieron cargar las cuentas de empresa", e);
      } finally {
        if (!cancel) setLoadingCuentas(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [idEmpresa]);

  const requiereBanco =
    medioPago === MedioPago.Transferencia ||
    medioPago === MedioPago.Deposito;

  const handleRegistrar = async () => {
    setError(null);

    const saldoNum = Number(saldo);
    if (!saldo || isNaN(saldoNum) || saldoNum <= 0) {
      setError("El saldo inicial debe ser un numero mayor a 0");
      return;
    }

    if (!idEmpresa) {
      setError("Selecciona la empresa");
      return;
    }

    // Si medio_pago es Transferencia o Deposito, los tres campos
    // (cuenta, fecha/hora y nro de operacion) son obligatorios. Si es
    // Efectivo, son opcionales: si el operador los lleno, se envian;
    // si los dejo vacios, llegan como null.
    if (requiereBanco) {
      if (!idCuenta) {
        setError(
          "Para " +
            medioPago +
            " debes seleccionar la cuenta bancaria de la empresa",
        );
        return;
      }
      if (!fechaPago) {
        setError("Para " + medioPago + " debes indicar la fecha del pago");
        return;
      }
      if (!numeroOperacion.trim()) {
        setError(
          "Para " + medioPago + " debes indicar el numero de operacion",
        );
        return;
      }
    }

    // Componer fecha_hora_pago a partir de fechaPago + horaPagoStr.
    // Solo se envia si el operador escribio al menos la fecha. Si
    // completo la fecha pero dejo la hora vacia, usamos 00:00 para
    // mantener el formato Y-m-d H:i:s del backend.
    let fechaHoraPago: string | null = null;
    if (fechaPago) {
      const fechaBase = dayjs(fechaPago).format("YYYY-MM-DD");
      const hora = horaPagoStr.trim() === "" ? "00:00" : horaPagoStr;
      const candidato = dayjs(`${fechaBase} ${hora}`);
      if (!candidato.isValid()) {
        setError("La hora del pago no es valida");
        return;
      }
      fechaHoraPago = candidato.format("YYYY-MM-DD HH:mm:ss");
    }

    setGuardando(true);
    try {
      // 1) Subir archivos al storage (si hay). Un fallo aqui aborta
      //    el registro para no dejar un anticipo sin sus evidencias.
      let evidenciasSubidas: IArchivo[] = [];
      if (evidenciasFiles.length > 0) {
        try {
          evidenciasSubidas = await subirAnticipos(evidenciasFiles);
        } catch (err) {
          console.error(err);
          const msg =
            err instanceof Error
              ? err.message
              : "No se pudieron subir las evidencias";
          setError(msg);
          notifyError(msg);
          setGuardando(false);
          return;
        }
      }

      const payload: RegistrarAnticipoRequest = {
        id_empresa: Number(idEmpresa),
        id_cuenta_bancaria_empresa:
          !requiereBanco && !idCuenta ? null : idCuenta ? Number(idCuenta) : null,
        medio_pago: medioPago as MedioPago | null,
        fecha_hora_pago: fechaHoraPago,
        numero_operacion: numeroOperacion.trim() || null,
        saldo: saldoNum,
        evidencias:
          evidenciasSubidas.length > 0 ? evidenciasSubidas : null,
      };

      const resp = await service.registrarAnticipoPorProveedor(
        idProveedor,
        payload,
      );
      if (resp.success) {
        notifySuccess("Anticipo registrado correctamente");
        // Limpiar solo los campos del detalle. NO tocamos idEmpresa ni
        // medioPago: ya estan bien elegidos. idCuenta se vuelve a
        // preseleccionar sola cuando termine el re-render por `cuentas`.
        // Fecha y hora vuelven a quedar vacias para que el operador
        // pueda borrarlas o rellenarlas a voluntad.
        setIdCuenta(null);
        setFechaPago(null);
        setHoraPagoStr("");
        setNumeroOperacion("");
        setSaldo("");
        setEvidenciasFiles([]);
        await cargar();
      } else {
        setError(resp.message || "No se pudo registrar el anticipo");
      }
    } catch (err) {
      console.error(err);
      notifyError("Error al registrar el anticipo");
    } finally {
      setGuardando(false);
    }
  };

  const handleAnular = async (a: AnticipoProveedorResponse) => {
    setAnulandoId(a.id_anticipo);
    try {
      const resp = await service.anularAnticipoPorProveedor(
        idProveedor,
        a.id_anticipo,
      );
      if (resp.success) {
        notifySuccess("Anticipo anulado correctamente");
        setConfirmarAnular(null);
        await cargar();
      } else {
        notifyError(resp.message || "No se pudo anular el anticipo");
      }
    } catch (err) {
      console.error(err);
      notifyError("Error al anular el anticipo");
    } finally {
      setAnulandoId(null);
    }
  };

  const dataEmpresas = useMemo(
    () =>
      empresas.map((e) => ({
        value: String(e.id_empresa),
        label: e.razon_social,
      })),
    [empresas],
  );

  const dataCuentas = useMemo(
    () =>
      cuentas.map((c) => ({
        value: String(c.id_cuenta_bancaria),
        label: `${c.banco} - ${c.moneda} - ${c.numero_cuenta}`,
      })),
    [cuentas],
  );

  const medioPagoData = [
    { value: MedioPago.Transferencia, label: "Transferencia" },
    { value: MedioPago.Deposito, label: "Depósito" },
    { value: MedioPago.Efectivo, label: "Efectivo" },
  ];

  return (
    <Stack gap="md">
      <div className="bg-zinc-900/50 p-5 rounded-xl border border-zinc-800 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-linear-to-b from-indigo-500 to-indigo-700" />
        <h3 className="text-zinc-200 font-semibold text-sm mb-4 flex items-center gap-2 uppercase tracking-wider">
          <IconNotes size={18} className="text-indigo-400" />
          Nuevo anticipo
        </h3>

        {error && (
          <Alert
            icon={<IconAlertTriangle size={16} />}
            color="red"
            variant="filled"
            className="mb-4"
          >
            {error}
          </Alert>
        )}

        <Stack gap="md">
        <Group grow align="flex-start">
          <Select
            label="Empresa"
            withAsterisk
            radius="lg"
            size="xs"
            searchable
            placeholder={loadingCatalogos ? "Cargando..." : "Seleccione"}
            comboboxProps={{ withinPortal: true }}
            data={dataEmpresas}
            value={idEmpresa}
            onChange={setIdEmpresa}
            disabled={loadingCatalogos && empresas.length === 0}
            classNames={fieldClasses}
          />
          <Select
            label="Medio de pago"
            radius="lg"
            size="xs"
            clearable
            placeholder="Seleccione"
            autoComplete="off"
            comboboxProps={{ withinPortal: true }}
            data={medioPagoData}
            value={medioPago}
            onChange={(v) => {
              setMedioPago(v);
              if (v === null) {
                setIdCuenta(null);
                setFechaPago(null);
                setHoraPagoStr("");
                setNumeroOperacion("");
              }
            }}
            classNames={fieldClasses}
          />
        </Group>

        <Group grow align="flex-start">
          <Select
            label={
              "Cuenta bancaria de la empresa" +
              (idEmpresa ? "" : " (selecciona una empresa primero)")
            }
            withAsterisk={requiereBanco}
            radius="lg"
            size="xs"
            searchable
            clearable
            placeholder={
              !idEmpresa
                ? "Seleccione una empresa"
                : loadingCuentas
                  ? "Cargando..."
                  : "Seleccione"
            }
            comboboxProps={{ withinPortal: true }}
            data={dataCuentas}
            value={idCuenta}
            onChange={setIdCuenta}
            disabled={!idEmpresa}
            classNames={fieldClasses}
          />
          <TextInput
            label={
              <span>
                Numero de operacion{" "}
                {requiereBanco && (
                  <span style={{ color: "var(--mantine-color-red-6)" }}>
                    *
                  </span>
                )}
              </span>
            }
            placeholder="Ingrese el numero de operacion"
            radius="lg"
            size="xs"
            type="text"
            value={numeroOperacion}
            onChange={(event) => {
              const cleaned = (event.currentTarget.value ?? "")
                .replace(/\D/g, "")
                .slice(0, 12);
              setNumeroOperacion(cleaned);
            }}
            classNames={fieldClasses}
            name="anticipo_numero_operacion"
            autoComplete="off"
            data-form-type="other"
            data-lpignore="true"
          />
        </Group>

        <Group grow align="flex-start">
          <CustomDatePicker
            label="Fecha del pago"
            placeholder="Seleccione fecha"
            value={fechaPago}
            onChange={(val) => setFechaPago(val)}
            classNames={fieldClasses}
            radius="lg"
            size="xs"
            withAsterisk={requiereBanco}
          />
          <div>
            <TimeInput
              ref={horaPagoRef}
              label="Hora del pago"
              placeholder="HH:MM"
              value={horaPagoStr}
              onChange={(event) =>
                setHoraPagoStr(formatHora(event.currentTarget.value))
              }
              onClick={() => horaPagoRef.current?.showPicker?.()}
              onFocus={() => horaPagoRef.current?.showPicker?.()}
              classNames={fieldClasses}
              size="xs"
              radius="lg"
              withAsterisk={requiereBanco}
              name="anticipo_hora_pago"
              autoComplete="off"
              data-form-type="other"
              data-lpignore="true"
            />
            {horaPagoStr && (
              <Text
                size="10px"
                c="blue.4"
                fw={700}
                mt={3}
                className="ml-1"
              >
                ({dayjs(`2000-01-01 ${horaPagoStr}`).format("hh:mm A")})
              </Text>
            )}
          </div>
          <TextInput
            label={
              <Group gap={6} wrap="nowrap">
                <IconCash size={14} />
                <span>
                  Saldo (S/) <span style={{ color: "var(--mantine-color-red-6)" }}>*</span>
                </span>
              </Group>
            }
            radius="lg"
            size="xs"
            type="text"
            placeholder="Ingrese el saldo"
            value={saldo}
            onChange={(event) => {
              const raw = event.currentTarget.value ?? "";
              const cleaned = raw
                .replace(/[^0-9.]/g, "")
                .replace(/(\..*)\./g, "$1");
              setSaldo(cleaned);
            }}
            classNames={fieldClasses}
            name="anticipo_saldo"
            autoComplete="off"
            data-form-type="other"
            data-lpignore="true"
          />
        </Group>

        <MultiFilePicker
          label="Evidencias (PDF, JPG, PNG, etc.)"
          description="Opcional. Se subiran al guardar."
          files={evidenciasFiles}
          onFilesChange={setEvidenciasFiles}
        />

        <Group justify="flex-end">
          <Button
            type="button"
            leftSection={<IconPlus size={14} />}
            radius="xl"
            loading={guardando}
            onClick={handleRegistrar}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20"
          >
            Registrar anticipo
          </Button>
        </Group>
        </Stack>
      </div>

      {/* === LISTADO DE ANTICIPOS REGISTRADOS === */}
      <h3 className="text-zinc-300 font-medium text-sm uppercase tracking-widest px-1">
        Anticipos registrados
      </h3>

      {loading && anticipos.length === 0 ? (
        <div className="text-zinc-500 text-xs italic px-3 py-2 border border-dashed border-zinc-800 rounded-lg">
          Cargando anticipos...
        </div>
      ) : anticipos.length === 0 ? (
        <div className="text-zinc-500 text-xs italic px-3 py-2 border border-dashed border-zinc-800 rounded-lg">
          Este proveedor no tiene anticipos registrados.
        </div>
      ) : (
        <Stack gap="xs">
          {anticipos.map((a) => {
            // Defensiva: si el backend serializa `esta_anulado` como 0/1
            // en vez de true/false, `Boolean(...)` lo normaliza y evita
            // cualquier `0`/`` suelto que un renderizacion pobre pudiera
            // exponer cerca de "Fecha de pago".
            const anulado = Boolean(a.esta_anulado);
            const anulando = anulandoId === a.id_anticipo;
            // Estado derivado: si esta anulado, "Anulado"; si saldo_actual
            // quedo en 0, "Sin Saldo"; en cualquier otro caso, "Con Saldo".
            // El backend persiste el estado en la columna, pero no lo
            // recalcula automaticamente cuando el saldo se consume: el
            // display siempre debe reflejar el saldo vivo.
            const estadoDisplay = anulado
              ? "Anulado"
              : a.saldo_actual <= 0
                ? "Sin Saldo"
                : "Con Saldo";
            const estadoColor: "red" | "gray" | "teal" = anulado
              ? "red"
              : a.saldo_actual <= 0
                ? "gray"
                : "teal";
            // Si el saldo es 0, el badge "Saldo actual: S/0.00" es ruido:
            // ya esta el badge "Sin Saldo" transmitiendo lo mismo.
            const mostrarSaldoActual = a.saldo_actual > 0;

            return (
              <div
                key={a.id_anticipo}
                className={
                  "p-4 bg-zinc-900/40 border rounded-xl transition-colors " +
                  (anulado
                    ? "border-red-900/40 opacity-70"
                    : "border-zinc-800/60 hover:border-indigo-700/60 hover:bg-zinc-900/60")
                }
              >
                {/* Fila 1: Empresa + N° + Estado + Anular */}
                <Group justify="space-between" wrap="nowrap" align="flex-start" gap="md">
                  <Group gap="md" wrap="nowrap" className="min-w-0 flex-1">
                    <ThemeIcon
                      variant="light"
                      color="indigo"
                      size="xl"
                      radius="xl"
                      className="shrink-0"
                    >
                      <IconBuildingBank size={20} stroke={1.5} />
                    </ThemeIcon>
                    <div className="flex flex-col min-w-0 gap-0.5">
                      <Text
                        size="sm"
                        fw={600}
                        className="text-zinc-100 truncate"
                      >
                        {a.empresa_nombre ?? "—"}
                      </Text>
                      {a.numero_operacion && (
                        <Text size="xs" className="text-zinc-400 font-mono">
                          N°: {a.numero_operacion}
                        </Text>
                      )}
                      {a.cuenta_bancaria_numero && (
                        <Text size="xs" className="text-zinc-500 truncate">
                          Cta: {a.cuenta_bancaria_numero}{" "}
                          {a.cuenta_bancaria_moneda && `(${a.cuenta_bancaria_moneda})`}
                        </Text>
                      )}
                    </div>
                  </Group>
                  <Group gap="xs" wrap="nowrap" className="shrink-0">
                    <Badge
                      color={estadoColor}
                      variant={anulado ? "filled" : "light"}
                      size="md"
                      radius="xl"
                    >
                      {estadoDisplay}
                    </Badge>
                    {!anulado && (
                      <Button
                        variant="subtle"
                        color="red"
                        size="xs"
                        radius="xl"
                        leftSection={<IconCircleX size={14} />}
                        loading={anulando}
                        onClick={() => setConfirmarAnular(a)}
                      >
                        Anular
                      </Button>
                    )}
                  </Group>
                </Group>

                {/* Fila 2: Medio de pago + Saldo actual (badges grandes) */}
                <Group gap="xs" mt="sm" wrap="wrap">
                  {a.medio_pago && (
                    <Badge
                      color="gray"
                      variant="light"
                      size="md"
                      radius="xl"
                      leftSection={<IconCash size={12} />}
                    >
                      {a.medio_pago}
                    </Badge>
                  )}
                  {mostrarSaldoActual && (
                    <Badge
                      color={estadoColor}
                      variant="filled"
                      size="md"
                      radius="xl"
                      leftSection={<IconCash size={12} />}
                    >
                      Saldo actual: {formatMontoPEN(a.saldo_actual)}
                    </Badge>
                  )}
                </Group>

                {/* Fila 3: Registrado por + Fecha pago (líneas de detalle) */}
                <Stack gap={4} mt="sm">
                  <Group gap={6} wrap="nowrap">
                    <Text
                      size="10px"
                      fw={700}
                      className="text-zinc-600 uppercase tracking-widest"
                    >
                      Registrado por:
                    </Text>
                    <Text size="xs" className="text-zinc-300">
                      {[
                        a.empleado_registro_nombre ?? "",
                        a.empleado_registro_apellido ?? "",
                      ]
                        .filter(Boolean)
                        .join(" ") || "—"}
                      {" - "}
                      {dayjs(a.created_at).format("DD MMM YYYY HH:mm")}
                    </Text>
                  </Group>
                  {a.fecha_hora_pago && (
                    <Group gap={6} wrap="nowrap">
                      <Text
                        size="10px"
                        fw={700}
                        className="text-zinc-600 uppercase tracking-widest"
                      >
                        Fecha de pago:
                      </Text>
                      <Text size="xs" className="text-zinc-300">
                        {dayjs(a.fecha_hora_pago).format("DD MMM YYYY HH:mm")}
                      </Text>
                    </Group>
                  )}
                </Stack>

                {/* Fila 3.5: Archivos de evidencia adjuntos al registro */}
                {Array.isArray(a.evidencias) && a.evidencias.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-800/60">
                    <Group gap={6} mb="xs">
                      <IconPaperclip size={12} className="text-zinc-500" />
                      <Text
                        size="10px"
                        fw={700}
                        className="text-zinc-500 uppercase tracking-widest"
                      >
                        Archivos de evidencia ({a.evidencias.length})
                      </Text>
                    </Group>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {a.evidencias.map((ev) => (
                        <ArchivoCard
                          key={ev.path_relativo}
                          archivo={ev}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Fila 4: Anulado por (solo si aplica) */}
                {anulado && a.empleado_anulacion_nombre && (
                  <Group gap={6} wrap="nowrap" mt="xs" className="pt-2 border-t border-red-900/30">
                    <Text
                      size="10px"
                      fw={700}
                      className="text-red-400 uppercase tracking-widest"
                    >
                      Anulado por:
                    </Text>
                    <Text size="xs" className="text-red-300">
                      {[
                        a.empleado_anulacion_nombre,
                        a.empleado_anulacion_apellido ?? "",
                      ]
                        .filter(Boolean)
                        .join(" ") || "—"}
                      {a.fecha_hora_anulacion &&
                        " - " +
                          dayjs(a.fecha_hora_anulacion).format(
                            "DD MMM YYYY HH:mm",
                          )}
                    </Text>
                  </Group>
                )}
              </div>
            );
          })}
        </Stack>
      )}

      <ModalEstandar
        opened={confirmarAnular !== null}
        close={() => setConfirmarAnular(null)}
        title="Anular anticipo"
        size="sm"
      >
        {confirmarAnular && (
          <Stack gap="md">
            <Alert
              icon={<IconAlertTriangle size={16} />}
              color="red"
              variant="filled"
            >
              Vas a anular el anticipo de{" "}
              <strong>{formatMontoPEN(confirmarAnular.saldo_actual)}</strong>{" "}
              del {dayjs(confirmarAnular.created_at).format("DD MMM YYYY")}.
            </Alert>
            <Group justify="flex-end" gap="sm">
              <Button
                variant="subtle"
                color="gray"
                radius="xl"
                onClick={() => setConfirmarAnular(null)}
              >
                Cancelar
              </Button>
              <Button
                color="red"
                radius="xl"
                loading={anulandoId === confirmarAnular.id_anticipo}
                leftSection={<IconCircleX size={14} />}
                onClick={() => handleAnular(confirmarAnular)}
              >
                Si, anular
              </Button>
            </Group>
          </Stack>
        )}
      </ModalEstandar>
    </Stack>
  );
};
