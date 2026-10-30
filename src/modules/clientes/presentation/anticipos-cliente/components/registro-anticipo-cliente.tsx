import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Group,
  Loader,
  NumberInput,
  Select,
  Stack,
  Textarea,
  TextInput,
} from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import dayjs from "dayjs";
import "dayjs/locale/es";

import { MedioPago } from "../../../../../shared/enums/anticipo-cliente/medio-pago";
import { getCoincidencias } from "../../../../../shared/functions/get-coincidencias";
import { AuxService } from "../../../../../service/auxiliar.service";
import type { RES_Empresa } from "../../../../../service/responses/empresa";
import type { RES_CuentaEmpresa } from "../../../../../service/responses/cuenta-empresa";
import { EstadoBase } from "../../../../../shared/enums/_generic/estado-base";
import { useNotify } from "../../../../../hooks/useNotify";
import { MultiFilePicker } from "../../../../../presentation/utils/archivo/multifile-picker";
import { CustomDatePicker } from "../../../../../presentation/utils/date-picker-input";
import {
  Schema_RegistrarAnticipoCliente,
  type RegistrarAnticipoClienteRequest,
} from "../../../service/clientes.requests";
import type { AnticipoClienteResponse } from "../../../service/clientes.responses";
import { ClientesService } from "../../../service/clientes.service";

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

const MAX_OBSERVACION = 1000;

interface Props {
  idCliente: number;
  /**
   * Recibe el anticipo recien creado, ya hidratado por el backend con el
   * mismo shape que devuelve el listado. El padre lo agrega a la lista en
   * vez de volver a pedirla entera.
   */
  onRegistrado: (anticipo: AnticipoClienteResponse) => void;
  /** Cierra el modal (boton "Cerrar" o el camino de exito del guardado). */
  onCancel: () => void;
}

/**
 * Formulario de registro de un anticipo RECIBIDO de un cliente de carbon.
 *
 * Diferencias con el anticipo a proveedor, que son de fondo y no de
 * forma: aqui la plata ENTRA a la empresa, asi que solo existe la cuenta
 * bancaria de la EMPRESA (donde se recibio el dinero). No hay cuenta
 * destino del cliente ni cambista.
 *
 * Decisiones de usabilidad (heuristicas de Nielsen):
 * - El monto es el campo protagonista: `NumberInput` con 2 decimales
 *   fijos, en vez de un `TextInput` enmascarado.
 * - Los errores se atribuyen al campo que los produce (Zod + prop
 *   `error`) en vez de acumularse en un Alert global arriba del form. El
 *   Alert queda solo para lo que devuelve el servidor.
 * - Al cambiar el medio de pago, los campos que dependen de el cambian de
 *   obligatorios a opcionales y viceversa: en Efectivo no hay cuenta
 *   bancaria ni operacion que exigir.
 * - Tras guardar, el modal se cierra y el listado de atras queda
 *   refrescado con la fila nueva.
 */
export const RegistroAnticipoCliente = ({
  idCliente,
  onRegistrado,
  onCancel,
}: Props) => {
  const { notifySuccess } = useNotify();

  const [idEmpresa, setIdEmpresa] = useState<string | null>(null);
  const [medioPago, setMedioPago] = useState<string | null>(
    MedioPago.Transferencia,
  );
  const [idCuentaEmpresa, setIdCuentaEmpresa] = useState<string | null>(null);
  const [monto, setMonto] = useState<number | string>("");
  // Por defecto: la fecha de hoy, para no obligar al operador a tipearla.
  const [fechaPago, setFechaPago] = useState<Date | null>(() => new Date());
  const [numeroOperacion, setNumeroOperacion] = useState("");
  const [comprobante, setComprobante] = useState("");
  const [observacion, setObservacion] = useState("");
  const [evidencias, setEvidencias] = useState<File[]>([]);

  const [empresas, setEmpresas] = useState<RES_Empresa[]>([]);
  const [cuentasEmpresa, setCuentasEmpresa] = useState<RES_CuentaEmpresa[]>([]);
  const [busquedaEmpresa, setBusquedaEmpresa] = useState("");
  const [busquedaCuentaEmpresa, setBusquedaCuentaEmpresa] = useState("");

  // Los catalogos vienen de la API. Sin esto el Select abre vacio y el
  // operador no sabe si esta cargando o si de verdad no hay opciones.
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [loadingCuentas, setLoadingCuentas] = useState(false);

  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  /** Borra el error de un campo en cuanto el usuario lo corrige. */
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
        if (cancel || !resp.success || !Array.isArray(resp.data)) return;
        setEmpresas(resp.data);
        // La empresa por defecto es la primera activa del catalogo: el id
        // NO se hardcodea, se resuelve desde el maestro de empresas.
        if (resp.data.length > 0) {
          setIdEmpresa(String(resp.data[0].id_empresa));
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

  // Transferencia y Depósito salen de una cuenta bancaria: sin cuenta,
  // fecha y numero de operacion el anticipo no es trazable. En Efectivo
  // no hay cuenta bancaria involucrada.
  const requiereBanco =
    medioPago === MedioPago.Transferencia || medioPago === MedioPago.Deposito;

  const handleGuardar = async () => {
    setErrorServidor(null);

    // `fecha_hora_pago` se persiste solo con la fecha (el back le agrega
    // ` 00:00:00` si no viene con hora, para respetar el DATETIME).
    const fechaHoraPago = fechaPago
      ? dayjs(fechaPago).format("YYYY-MM-DD")
      : null;

    const payload: RegistrarAnticipoClienteRequest = {
      id_empresa: Number(idEmpresa),
      id_cuenta_bancaria_empresa: idCuentaEmpresa
        ? Number(idCuentaEmpresa)
        : null,
      medio_pago: medioPago as RegistrarAnticipoClienteRequest["medio_pago"],
      fecha_hora_pago: fechaHoraPago,
      numero_operacion: numeroOperacion.trim() || null,
      codigo_comprobante: comprobante.trim() || null,
      observacion: observacion.trim() || null,
      saldo: typeof monto === "number" ? monto : Number(monto),
      evidencias,
    };

    const parsed = Schema_RegistrarAnticipoCliente.safeParse(payload);
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
      const resp = await ClientesService.registrarAnticipoPorCliente(
        idCliente,
        payload,
      );

      if (!resp.success) {
        setErrorServidor(resp.message || "No se pudo registrar el anticipo");
        return;
      }

      notifySuccess("Anticipo registrado correctamente");
      onCancel();
      // El POST ya devuelve la fila creada con el mismo SELECT que usa el
      // listado, asi que se la pasa al padre en vez de pedirle la lista
      // entera otra vez.
      onRegistrado(resp.data);
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
      <Group grow align="flex-start">
        <Select
          label="Empresa que recibe el dinero"
          withAsterisk
          radius="lg"
          size="xs"
          searchable
          clearable
          placeholder={loadingEmpresas ? "Cargando..." : "Seleccione"}
          data={empresasVisibles.map((e) => ({
            value: String(e.id_empresa),
            label: e.razon_social,
          }))}
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
          comboboxProps={{ withinPortal: true }}
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
          label="Monto del Anticipo (S/)"
          placeholder="0.00"
          value={monto}
          onChange={(v) => {
            setMonto(v);
            limpiarError("saldo");
          }}
          fixedDecimalScale
          hideControls
          error={errores.saldo}
          classNames={fieldClasses}
          size="xs"
          radius="lg"
          required
        />
      </Group>

      {/* --- Cuenta de la empresa (destino del dinero) --- */}
      <Select
        label="Cuenta bancaria de la empresa (donde se recibió el dinero)"
        radius="lg"
        size="xs"
        searchable
        clearable
        withAsterisk={requiereBanco}
        required={requiereBanco}
        placeholder={loadingCuentas ? "Cargando..." : "Seleccione"}
        data={cuentasEmpresaVisibles.map((c) => ({
          value: String(c.id_cuenta_bancaria),
          label: `${c.banco} (${c.numero_cuenta}) - ${c.moneda}`,
        }))}
        value={idCuentaEmpresa}
        onChange={(v) => {
          setIdCuentaEmpresa(v);
          limpiarError("id_cuenta_bancaria_empresa");
        }}
        searchValue={busquedaCuentaEmpresa}
        onSearchChange={setBusquedaCuentaEmpresa}
        nothingFoundMessage="Sin coincidencias"
        disabled={!idEmpresa || loadingCuentas}
        comboboxProps={{ withinPortal: true }}
        rightSection={
          loadingCuentas ? <Loader size="xs" color="indigo" /> : undefined
        }
        error={errores.id_cuenta_bancaria_empresa}
        classNames={fieldClasses}
      />

      {/* --- Referencia bancaria, fecha y comprobante --- */}
      <Group grow align="flex-start">
        {requiereBanco && (
          <TextInput
            label="N° Operación bancaria"
            placeholder="Ej. OP-987654"
            radius="lg"
            size="xs"
            value={numeroOperacion}
            onChange={(e) => {
              setNumeroOperacion(e.currentTarget.value.toUpperCase().slice(0, 128));
              limpiarError("numero_operacion");
            }}
            error={errores.numero_operacion}
            classNames={fieldClasses}
            withAsterisk
            required
          />
        )}
        <CustomDatePicker
          label="Fecha del pago"
          placeholder="Seleccione fecha"
          value={fechaPago}
          onChange={(v) => {
            setFechaPago(v);
            limpiarError("fecha_hora_pago");
          }}
          error={errores.fecha_hora_pago}
          classNames={fieldClasses}
          required={requiereBanco}
          withAsterisk={requiereBanco}
          radius="lg"
          size="xs"
        />
        <TextInput
          label="Comprobante / factura (opcional)"
          placeholder="Ej. F001-00123"
          radius="lg"
          size="xs"
          value={comprobante}
          onChange={(e) => {
            setComprobante(e.currentTarget.value.toUpperCase().slice(0, 128));
            limpiarError("codigo_comprobante");
          }}
          error={errores.codigo_comprobante}
          classNames={fieldClasses}
        />
      </Group>

      {/* --- Observacion --- */}
      <Textarea
        label="Observación"
        placeholder="Detalle del anticipo recibido..."
        radius="lg"
        size="xs"
        autosize
        minRows={2}
        maxRows={5}
        value={observacion}
        onChange={(e) => {
          setObservacion(e.currentTarget.value.slice(0, MAX_OBSERVACION));
          limpiarError("observacion");
        }}
        error={errores.observacion}
        classNames={fieldClasses}
      />

      <MultiFilePicker
        label="Evidencias"
        description="Opcional. PDF, JPG, PNG, etc."
        files={evidencias}
        onFilesChange={setEvidencias}
      />

      <Group justify="flex-end">
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
    </Stack>
  );
};
