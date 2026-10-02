import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  NumberInput,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { TimeInput } from "@mantine/dates";
import {
  IconAlertTriangle,
  IconBuildingBank,
  IconNotes,
  IconWallet,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import "dayjs/locale/es";

import { MedioPago } from "../../../../../shared/enums/anticipo-proveedor/medio-pago";
import { getCoincidencias } from "../../../../../shared/functions/get-coincidencias";
import { formatMontoPEN } from "../../../../../shared/functions/format-monto-pen";
import { AuxService } from "../../../../../service/auxiliar.service";
import type { RES_Empresa } from "../../../../../service/responses/empresa";
import type { RES_CuentaEmpresa } from "../../../../../service/responses/cuenta-empresa";
import { EstadoBase } from "../../../../../shared/enums/_generic/estado-base";
import { useNotify } from "../../../../../hooks/useNotify";
import { MultiFilePicker } from "../../../../../presentation/utils/archivo/multifile-picker";
import { CustomDatePicker } from "../../../../../presentation/utils/date-picker-input";
import {
  Schema_RegistrarAnticipo,
  type RegistrarAnticipoRequest,
} from "../../../service/proveedores.requests";
import type { CuentaBancariaResponse } from "../../../service/proveedores.responses";
import type { ProveedoresService } from "../../../service/proveedores.service";

dayjs.locale("es");

// Estilo dark premium compartido con el resto del modulo (README FE, regla 8).
const fieldClasses = {
  input:
    "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
  label: "text-zinc-400 font-medium text-xs mb-1",
};

const MEDIOS_PAGO = [
  { value: MedioPago.Transferencia, label: "Transferencia" },
  { value: MedioPago.Deposito, label: "Depósito" },
  { value: MedioPago.Efectivo, label: "Efectivo" },
];

const DEFAULT_CUPPER_ID = 1;
const MAX_OBSERVACION = 500;

/**
 * Z-index de los dropdowns de este form.
 *
 * Este modal se monta con `zIndex={10001}` para quedar por encima del
 * modal de anticipos. El problema: Mantine v8 NO hereda el z-index del
 * modal hacia los popovers hijos. `Popover` usa un valor estatico
 * (`getDefaultZIndex("popover")` = 300) y se.portalea a `body`, asi que
 * un dropdown a 300 queda POR DEBAJO de un modal a 10001: se abre pero no
 * se ve, y el Select parece muerto.
 *
 * Hay que subirlo a mano. `comboboxProps` es el bag de props que
 * `Combobox` reenvia a su `Popover` interno, asi que ahi va el `zIndex`
 * (ver `node_modules/@mantine/core/esm/components/Combobox/Combobox.mjs`:
 * `<Popover {...others} />`, donde `others` viene de `comboboxProps`).
 *
 * El 10005 es el mismo margen que ya usa `registro-contratista.tsx` para
 * su modal anidado.
 */
const Z_DROPDOWN = 10005;

interface Props {
  idProveedor: number;
  /** Cuentas bancarias del PROVEEDOR: es el destino del dinero. */
  cuentasProveedor: CuentaBancariaResponse[];
  /**
   * Lo controla el padre porque el switch se renderiza en el
   * `rightSection` del modal, fuera de este componente.
   */
  pagoATerceros: boolean;
  service: typeof ProveedoresService;
  /** Se dispara tras un registro exitoso para refrescar el listado. */
  onRegistrado: () => Promise<void> | void;
  onCancel: () => void;
}

/**
 * Formulario de registro de anticipo.
 *
 * Decisiones de usabilidad (heuristicas de Nielsen):
 * - El monto es el campo protagonista: `NumberInput` con separador de
 *   miles y 2 decimales fijos, en vez del `TextInput` enmascarado que
 *   obligaba a tipear el punto decimal a mano.
 * - Los errores se atribuyen al campo que los produce (Zod + prop
 *   `error`) en vez de acumularse en un Alert global arriba del form. El
 *   Alert queda solo para lo que devuelve el servidor.
 * - "Pago a terceros" deshabilita la cuenta destino, que no aplica, en
 *   vez de dejar que se registre una cuenta que el usuario ya marco
 *   como irrelevante.
 * - Se preservan empresa, medio de pago y cuentas tras guardar: registrar
 *   varios anticipos del mismo pago es el caso tipico, no la excepcion.
 */
export const RegistroAnticipo = ({
  idProveedor,
  cuentasProveedor,
  pagoATerceros,
  service,
  onRegistrado,
  onCancel,
}: Props) => {
  const { notifySuccess } = useNotify();

  const [idEmpresa, setIdEmpresa] = useState(String(DEFAULT_CUPPER_ID));
  const [idCuentaEmpresa, setIdCuentaEmpresa] = useState<string | null>(null);
  const [medioPago, setMedioPago] = useState<string | null>(
    MedioPago.Transferencia,
  );
  const [idCuentaProveedor, setIdCuentaProveedor] = useState<string | null>(
    null,
  );
  const [monto, setMonto] = useState<number | string>("");
  const [fechaPago, setFechaPago] = useState<Date | null>(null);
  const [horaPago, setHoraPago] = useState("");
  const [numeroOperacion, setNumeroOperacion] = useState("");
  const [factura, setFactura] = useState("");
  const [observacion, setObservacion] = useState("");
  const [evidencias, setEvidencias] = useState<File[]>([]);

  const [empresas, setEmpresas] = useState<RES_Empresa[]>([]);
  const [cuentasEmpresa, setCuentasEmpresa] = useState<RES_CuentaEmpresa[]>([]);
  const [busquedaEmpresa, setBusquedaEmpresa] = useState("");
  const [busquedaCuentaEmpresa, setBusquedaCuentaEmpresa] = useState("");
  const [busquedaCuentaProveedor, setBusquedaCuentaProveedor] = useState("");

  // Los catalogos vienen de la API. Sin esto el Select abre vacio y el
  // operador no sabe si esta cargando o si de verdad no hay opciones.
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [loadingCuentas, setLoadingCuentas] = useState(false);

  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  /** Borra el error de un campo en cuanto el usuario lo corrige: un error
   *  que sigue visible pese a estar arreglado hace dudar de si el form
   *  ya quedo validado. */
  const limpiarError = (campo: string) => {
    setErrores((prev) => {
      if (!(campo in prev)) return prev;
      const next = { ...prev };
      delete next[campo];
      return next;
    });
  };

  // --- Catalogos ---------------------------------------------------------

  useEffect(() => {
    let cancel = false;
    setLoadingEmpresas(true);
    (async () => {
      try {
        const resp = await AuxService.get_empresas({
          estado: EstadoBase.Activo,
        });
        if (!cancel && resp.success && Array.isArray(resp.data)) {
          setEmpresas(resp.data);
        }
      } catch (e) {
        console.error("No se pudieron cargar las empresas", e);
      } finally {
        if (!cancel) setLoadingEmpresas(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!idEmpresa) {
      setCuentasEmpresa([]);
      setLoadingCuentas(false);
      return;
    }
    let cancel = false;
    setLoadingCuentas(true);
    // Se vacia al cambiar de empresa: si no, durante la espera el operador
    // veria las cuentas de la empresa anterior y podria pickear una que no
    // es de la que esta seleccionada.
    setCuentasEmpresa([]);
    (async () => {
      try {
        const resp = await AuxService.get_cuentas_empresa({
          id_empresa: Number(idEmpresa),
          estado: EstadoBase.Activo,
        });
        if (cancel) return;
        if (resp.success && Array.isArray(resp.data)) {
          setCuentasEmpresa(resp.data as RES_CuentaEmpresa[]);
        }
      } catch (e) {
        console.error("No se pudieron cargar las cuentas de la empresa", e);
      } finally {
        if (!cancel) setLoadingCuentas(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [idEmpresa]);

  // Preselecciona la primera cuenta de la empresa para que el operador no
  // tenga que elegirla en cada registro. Si cambia de empresa y la cuenta
  // anterior ya no existe en el nuevo set, se reasigna la primera.
  useEffect(() => {
    if (cuentasEmpresa.length === 0) {
      setIdCuentaEmpresa(null);
      return;
    }
    const sigueValida = cuentasEmpresa.some(
      (c) => String(c.id_cuenta_bancaria) === idCuentaEmpresa,
    );
    if (!sigueValida) {
      setIdCuentaEmpresa(String(cuentasEmpresa[0].id_cuenta_bancaria));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuentasEmpresa]);

  // --- Datos para los Select (getCoincidencias) --------------------------

  const empresasVisibles = useMemo(() => {
    const q = busquedaEmpresa.trim();
    if (!q) return empresas;
    return getCoincidencias(empresas, q, { keys: ["razon_social"] }).map(
      (r) => r.item,
    );
  }, [empresas, busquedaEmpresa]);

  const cuentasEmpresaVisibles = useMemo(() => {
    const q = busquedaCuentaEmpresa.trim();
    if (!q) return cuentasEmpresa;
    return getCoincidencias(cuentasEmpresa, q, {
      keys: ["banco", "numero_cuenta"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [cuentasEmpresa, busquedaCuentaEmpresa]);

  const cuentasProveedorVisibles = useMemo(() => {
    const q = busquedaCuentaProveedor.trim();
    if (!q) return cuentasProveedor;
    return getCoincidencias(cuentasProveedor, q, {
      keys: ["banco", "banco_abv", "numero_cuenta"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [cuentasProveedor, busquedaCuentaProveedor]);

  const requiereBanco =
    medioPago === MedioPago.Transferencia || medioPago === MedioPago.Deposito;

  const cuentaEmpresaElegida = cuentasEmpresa.find(
    (c) => String(c.id_cuenta_bancaria) === idCuentaEmpresa,
  );
  const cuentaProveedorElegida = cuentasProveedor.find(
    (c) => String(c.id_cuenta_bancaria) === idCuentaProveedor,
  );

  const etiquetaCuentaEmpresa = cuentaEmpresaElegida
    ? `${cuentaEmpresaElegida.banco} · ${cuentaEmpresaElegida.moneda} · ${cuentaEmpresaElegida.numero_cuenta}`
    : "";
  const etiquetaCuentaProveedor = cuentaProveedorElegida
    ? `${cuentaProveedorElegida.banco} · ${cuentaProveedorElegida.moneda} · ${cuentaProveedorElegida.numero_cuenta}`
    : "";

  const hayCambios =
    monto !== "" ||
    fechaPago !== null ||
    horaPago !== "" ||
    numeroOperacion !== "" ||
    factura !== "" ||
    observacion !== "" ||
    evidencias.length > 0;

  const limpiarCampos = () => {
    setMonto("");
    setFechaPago(null);
    setHoraPago("");
    setNumeroOperacion("");
    setFactura("");
    setObservacion("");
    setEvidencias([]);
  };

  const handleGuardar = async () => {
    setErrorServidor(null);

    // `fecha_hora_pago` solo se arma si el operador capturo al menos la
    // fecha. Con fecha pero sin hora usamos 00:00 para respetar el
    // formato Y-m-d H:i:s que espera el backend.
    let fechaHoraPago: string | null = null;
    if (fechaPago) {
      const fechaBase = dayjs(fechaPago).format("YYYY-MM-DD");
      const hora = horaPago.trim() === "" ? "00:00" : horaPago.trim();
      const candidato = dayjs(`${fechaBase} ${hora}`);
      if (!candidato.isValid()) {
        limpiarError("horaPago");
        setErrores((prev) => ({
          ...prev,
          horaPago: "La hora del pago no es valida",
        }));
        return;
      }
      fechaHoraPago = candidato.format("YYYY-MM-DD HH:mm:ss");
    }
    limpiarError("horaPago");

    const payload: RegistrarAnticipoRequest = {
      id_empresa: Number(idEmpresa),
      id_cuenta_bancaria_empresa: idCuentaEmpresa
        ? Number(idCuentaEmpresa)
        : null,
      id_cuenta_bancaria_proveedor:
        !pagoATerceros && idCuentaProveedor ? Number(idCuentaProveedor) : null,
      medio_pago: medioPago as RegistrarAnticipoRequest["medio_pago"],
      fecha_hora_pago: fechaHoraPago,
      numero_operacion: numeroOperacion.trim() || null,
      codigo_comprobante: factura.trim() || null,
      observacion: observacion.trim() || null,
      pago_a_terceros: pagoATerceros,
      saldo: typeof monto === "number" ? monto : Number(monto),
      evidencias,
    };

    const parsed = Schema_RegistrarAnticipo.safeParse(payload);
    if (!parsed.success) {
      const porCampo: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const campo = issue.path[0];
        if (typeof campo === "string" && !porCampo[campo]) {
          porCampo[campo] = issue.message;
        }
      });
      setErrores(porCampo);
      return;
    }
    setErrores({});

    setGuardando(true);
    try {
      // Un solo POST: los archivos viajan en el mismo multipart que los
      // datos y los persiste el backend con `ArchivoHelper`. Asi no queda
      // un anticipo guardado con evidencias a medio subir, ni archivos
      // huerfanos en el storage si el registro falla.
      const resp = await service.registrarAnticipoPorProveedor(
        idProveedor,
        payload,
      );

      if (!resp.success) {
        setErrorServidor(resp.message || "No se pudo registrar el anticipo");
        return;
      }

      notifySuccess("Anticipo registrado correctamente");
      limpiarCampos();
      await onRegistrado();
    } catch (err) {
      console.error(err);
      // Un fallo de red con multipart suele ser el envio del archivo (por
      // tamano o tipo). Lo decimos explicitamente para que el operador no
      // repita 20 veces pensando que el problema es el saldo.
      setErrorServidor(
        "No se pudo enviar el registro. Revisa el tamano y el tipo de las evidencias e intenta de nuevo.",
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Stack gap="lg">
      {errorServidor && (
        <Alert
          icon={<IconAlertTriangle size={16} />}
          color="red"
          variant="filled"
        >
          {errorServidor}
        </Alert>
      )}

      {/* --- Pago --- */}
      <Group grow>
        <Select
          label="Empresa"
          withAsterisk
          radius="lg"
          size="xs"
          searchable
          clearable
          placeholder={loadingEmpresas ? "Cargando..." : "Seleccione"}
          comboboxProps={{ withinPortal: true, zIndex: Z_DROPDOWN }}
          data={
            loadingEmpresas
              ? []
              : empresasVisibles.map((e) => ({
                  value: String(e.id_empresa),
                  label: e.razon_social,
                }))
          }
          value={idEmpresa}
          onChange={(v) => {
            if (!v) return;
            setIdEmpresa(v);
            limpiarError("id_empresa");
          }}
          searchValue={busquedaEmpresa}
          onSearchChange={setBusquedaEmpresa}
          nothingFoundMessage={
            loadingEmpresas ? "Cargando..." : "Sin coincidencias"
          }
          disabled={loadingEmpresas}
          rightSection={
            loadingEmpresas ? <Loader size="xs" color="indigo" /> : undefined
          }
          error={errores.id_empresa}
          classNames={fieldClasses}
        />
        <Select
          label="Medio de pago"
          withAsterisk
          clearable
          radius="lg"
          size="xs"
          placeholder="Seleccione"
          comboboxProps={{ withinPortal: true, zIndex: Z_DROPDOWN }}
          data={MEDIOS_PAGO}
          value={medioPago}
          onChange={(v) => {
            setMedioPago(v);
            limpiarError("medio_pago");
          }}
          error={errores.medio_pago}
          classNames={fieldClasses}
        />
        <NumberInput
          placeholder="0.00"
          size="xs"
          label="Monto del anticipo"
          radius="lg"
          fw={700}
          fixedDecimalScale
          thousandSeparator=","
          prefix="S/ "
          value={monto}
          onChange={(v) => {
            setMonto(v);
            limpiarError("saldo");
          }}
          error={errores.saldo}
          hideControls
          required
          classNames={{
            input:
              "bg-zinc-900/70 border-indigo-500/30 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 text-white  font-mono transition-all",
          }}
        />
      </Group>

      {/* --- Cuentas: origen (empresa) y destino (proveedor) --- */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
        <Group gap={6} align="center">
          <IconWallet size={12} className="text-teal-400" />
          <Text size="xs" fw={700} c={"gray.3"} className="uppercase " mt={2}>
            Cuentas
          </Text>
        </Group>
        <Group grow align="flex-start">
          <Select
            label={
              <>
                De dónde sale el dinero{" "}
                {requiereBanco && <span className="text-red-5">*</span>}
              </>
            }
            radius="lg"
            size="xs"
            searchable
            clearable
            placeholder={
              loadingCuentas
                ? "Cargando..."
                : requiereBanco
                  ? "Seleccione"
                  : "No aplica"
            }
            comboboxProps={{ withinPortal: true, zIndex: Z_DROPDOWN }}
            data={
              loadingCuentas
                ? []
                : cuentasEmpresaVisibles.map((c) => ({
                    value: String(c.id_cuenta_bancaria),
                    label: `${c.banco} · ${c.moneda} · ${c.numero_cuenta}`,
                  }))
            }
            value={idCuentaEmpresa}
            onChange={(v) => {
              setIdCuentaEmpresa(v);
              limpiarError("id_cuenta_bancaria_empresa");
            }}
            searchValue={busquedaCuentaEmpresa}
            onSearchChange={setBusquedaCuentaEmpresa}
            nothingFoundMessage={
              loadingCuentas ? "Cargando..." : "Sin coincidencias"
            }
            disabled={!idEmpresa || !requiereBanco || loadingCuentas}
            rightSection={
              loadingCuentas ? <Loader size="xs" color="indigo" /> : undefined
            }
            error={errores.id_cuenta_bancaria_empresa}
            classNames={fieldClasses}
          />
          <Select
            label="Cuenta destino del proveedor"
            radius="lg"
            size="xs"
            searchable
            clearable
            placeholder={pagoATerceros ? "No aplica" : "Seleccione (opcional)"}
            comboboxProps={{ withinPortal: true, zIndex: Z_DROPDOWN }}
            data={cuentasProveedorVisibles.map((c) => ({
              value: String(c.id_cuenta_bancaria),
              label: `${c.banco} · ${c.moneda} · ${c.numero_cuenta}${c.cci ? ` · CCI ${c.cci}` : ""}`,
            }))}
            value={idCuentaProveedor}
            onChange={(v) => {
              setIdCuentaProveedor(v);
              limpiarError("id_cuenta_bancaria_proveedor");
            }}
            searchValue={busquedaCuentaProveedor}
            onSearchChange={setBusquedaCuentaProveedor}
            nothingFoundMessage="Sin coincidencias"
            disabled={pagoATerceros}
            error={errores.id_cuenta_bancaria_proveedor}
            classNames={fieldClasses}
          />
        </Group>
        {pagoATerceros && (
          <Text size="xs" c="yellow.4" mt="xs">
            El dinero no se depositó en una cuenta del proveedor.
          </Text>
        )}
      </div>

      {/* --- Referencia bancaria y fecha --- */}
      <Group grow align="flex-start">
        <TextInput
          label={"Número de operación"}
          placeholder="Ej. OP-987654"
          radius="lg"
          size="xs"
          value={numeroOperacion}
          onChange={(e) => {
            setNumeroOperacion(e.currentTarget.value.slice(0, 64));
            limpiarError("numero_operacion");
          }}
          error={errores.numero_operacion}
          classNames={fieldClasses}
          name="anticipo_numero_operacion"
          autoComplete="off"
          data-form-type="other"
          data-lpignore="true"
          required={requiereBanco}
        />
        <CustomDatePicker
          label={"Fecha del pago"}
          placeholder="Seleccione fecha"
          value={fechaPago}
          onChange={(v) => {
            setFechaPago(v);
            limpiarError("fecha_hora_pago");
          }}
          popoverProps={{ zIndex: Z_DROPDOWN }}
          error={errores.fecha_hora_pago}
          classNames={fieldClasses}
          required={requiereBanco}
          radius="lg"
          size="xs"
        />
        <TimeInput
          label="Hora"
          placeholder="HH:MM"
          radius="lg"
          size="xs"
          value={horaPago}
          onChange={(e) => {
            const match = /^(\d{2}):(\d{2})/.exec(e.currentTarget.value ?? "");
            setHoraPago(match ? `${match[1]}:${match[2]}` : "");
          }}
          error={errores.horaPago}
          classNames={fieldClasses}
          name="anticipo_hora_pago"
          autoComplete="off"
          data-form-type="other"
          data-lpignore="true"
        />
      </Group>

      {/* --- Comprobante --- */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
        <Group gap={6} align="center">
          <IconNotes size={12} className="text-blue-400" />
          <Text size="xs" fw={700} c={"gray.3"} className="uppercase " mt={2}>
            Comprobante
          </Text>
        </Group>
        <Group grow align="flex-start">
          <TextInput
            label="Factura / comprobante"
            placeholder="Ej. F001-00123"
            radius="lg"
            size="xs"
            value={factura}
            onChange={(e) => {
              setFactura(e.currentTarget.value.slice(0, 64));
              limpiarError("codigo_comprobante");
            }}
            error={errores.codigo_comprobante}
            classNames={fieldClasses}
            name="anticipo_codigo_comprobante"
            autoComplete="off"
            data-form-type="other"
            data-lpignore="true"
          />
          <Textarea
            label="Observación"
            placeholder="Motivo, detalle del pago a terceros, etc."
            radius="lg"
            size="xs"
            autosize
            minRows={1}
            maxRows={4}
            value={observacion}
            onChange={(e) => {
              setObservacion(e.currentTarget.value);
              limpiarError("observacion");
            }}
            maxLength={MAX_OBSERVACION}
            error={errores.observacion}
            classNames={fieldClasses}
            name="anticipo_observacion"
            autoComplete="off"
            data-form-type="other"
            data-lpignore="true"
          />
        </Group>
        <Text size="10px" c="dimmed" ta="right" mt={4}>
          {observacion.length}/{MAX_OBSERVACION}
        </Text>
      </div>

      <MultiFilePicker
        label="Evidencias"
        description="Opcional. PDF, JPG, PNG, etc."
        files={evidencias}
        onFilesChange={setEvidencias}
      />

      {/* --- Resumen: el operador ve a donde va el dinero antes de guardar --- */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3">
        <Text
          size="10px"
          fw={700}
          className="uppercase tracking-widest text-zinc-500 mb-2"
        >
          Resumen del pago
        </Text>
        <Group justify="space-between" gap="md" wrap="nowrap">
          <Group gap="xs" wrap="nowrap" className="min-w-0 flex-1">
            <IconBuildingBank size={16} className="shrink-0 text-zinc-500" />
            <Text size="xs" className="truncate" c="zinc.3">
              {etiquetaCuentaEmpresa || "Cuenta de la empresa sin elegir"}
            </Text>
            <Text size="xs" c="zinc.6" className="shrink-0">
              →
            </Text>
            <Badge
              size="sm"
              radius="xl"
              variant="light"
              color={pagoATerceros ? "yellow" : "indigo"}
              className="shrink-0"
            >
              {pagoATerceros ? "Tercero" : "Proveedor"}
            </Badge>
            <Text size="xs" className="truncate" c="zinc.3">
              {pagoATerceros
                ? "cuenta no registrada"
                : etiquetaCuentaProveedor || "sin cuenta indicada"}
            </Text>
          </Group>
          <Text
            size="sm"
            fw={700}
            className="font-mono text-emerald-400 shrink-0"
          >
            {monto !== "" && Number.isFinite(Number(monto))
              ? formatMontoPEN(Number(monto))
              : "S/ 0.00"}
          </Text>
        </Group>
      </div>

      <Group justify="space-between">
        <Button
          variant="subtle"
          color="gray"
          radius="xl"
          size="xs"
          onClick={limpiarCampos}
          disabled={!hayCambios}
        >
          Limpiar
        </Button>
        <Group gap="sm">
          <Button
            variant="default"
            radius="xl"
            size="xs"
            onClick={onCancel}
            disabled={guardando}
            className="bg-zinc-800! text-zinc-300! border-zinc-700!"
          >
            Cerrar
          </Button>
          <Button
            radius="xl"
            size="xs"
            loading={guardando}
            onClick={handleGuardar}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20"
          >
            Registrar anticipo
          </Button>
        </Group>
      </Group>
    </Stack>
  );
};
