import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Alert,
  Button,
  Group,
  Loader,
  NumberInput,
  Select,
  Stack,
  TextInput,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconPlus,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import "dayjs/locale/es";

import { MedioPago } from "../../../../../shared/enums/anticipo-proveedor/medio-pago";
import { getCoincidencias } from "../../../../../shared/functions/get-coincidencias";
import { AuxService } from "../../../../../service/auxiliar.service";
import {
  CambistaService,
  type RES_Cambista,
} from "../../../../../service/cambista.service";
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
import type {
  AnticipoProveedorResponse,
  CuentaBancariaResponse,
} from "../../../service/proveedores.responses";
import type { ProveedoresService } from "../../../service/proveedores.service";
import { ModalNuevoCambista } from "./modal-nuevo-cambista";

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
  /**
   * Recibe el anticipo recien creado, ya hidratado por el backend con el
   * mismo shape que devuelve el listado. El padre lo agrega a la lista en
   * vez de volver a pedirla entera.
   */
  onRegistrado: (anticipo: AnticipoProveedorResponse) => void;
  /**
   * Cierra el modal. Lo invocan el boton "Cerrar" y el camino de exito del
   * guardado, no solo un cancelamiento.
   */
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
 * - Tras guardar, el modal se cierra y el listado de atrás queda
 *   refrescado: si el operador tiene que registrar más anticipos vuelve a
 *   abrirlo, y dejarlo abierto hacía dudar de si el registro se había
 *   guardado o si faltaba confirmarlo.
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
  // Por defecto: la fecha de hoy, para no obligar al operador a tipearla dos
  // veces al dia siguiente de cargar el modulo.
  const [fechaPago, setFechaPago] = useState<Date | null>(() => new Date());
  const [numeroOperacion, setNumeroOperacion] = useState("");
  const [factura, setFactura] = useState("");
  const [observacion, setObservacion] = useState("");
  const [evidencias, setEvidencias] = useState<File[]>([]);

  const [empresas, setEmpresas] = useState<RES_Empresa[]>([]);
  const [cuentasEmpresa, setCuentasEmpresa] = useState<RES_CuentaEmpresa[]>([]);
  const [busquedaEmpresa, setBusquedaEmpresa] = useState("");
  const [cambistas, setCambistas] = useState<RES_Cambista[]>([]);
  const [idCambista, setIdCambista] = useState<string | null>(null);
  const [busquedaCambista, setBusquedaCambista] = useState("");
  const [modalNuevoCambistaAbierto, setModalNuevoCambistaAbierto] =
    useState(false);
  const [loadingCambistas, setLoadingCambistas] = useState(true);
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
    // Cambistas: lista chica y estable, la cargamos 1 sola vez al
    // montar. El "+" reabre `CambistaService.listar()` desde el modal de
    // alta para refrescar el select.
    let cancel = false;
    setLoadingCambistas(true);
    (async () => {
      try {
        const resp = await CambistaService.listar();
        if (!cancel && resp.success && Array.isArray(resp.data)) {
          setCambistas(resp.data);
        }
      } catch (e) {
        console.error("No se pudieron cargar los cambistas", e);
      } finally {
        if (!cancel) setLoadingCambistas(false);
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

  // Pago a terceros: vaciamos la cuenta destino al activar el switch,
  // para que la UI arranque sin nada seleccionado (como pide el operador).
  // Al desactivarlo, no tocamos la seleccion: si el operador la dejo
  // cargada antes de activar el switch, se mantiene.
  useEffect(() => {
    if (pagoATerceros) {
      setIdCuentaProveedor(null);
    }
  }, [pagoATerceros]);

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
  const requiereCambista = medioPago === MedioPago.Efectivo;

  const cambistasVisibles = useMemo(() => {
    const q = busquedaCambista.trim();
    if (!q) return cambistas;
    return getCoincidencias(cambistas, q, {
      keys: ["nombre"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [cambistas, busquedaCambista]);

  const handleGuardar = async () => {
    setErrorServidor(null);

    // `fecha_hora_pago` se persiste solo con la fecha (el back le agrega
    // ` 00:00:00` si no viene con hora, para respetar el DATETIME).
    const fechaHoraPago = fechaPago
      ? dayjs(fechaPago).format("YYYY-MM-DD")
      : null;

    const payload: RegistrarAnticipoRequest = {
      id_empresa: Number(idEmpresa),
      id_cuenta_bancaria_empresa: idCuentaEmpresa
        ? Number(idCuentaEmpresa)
        : null,
      id_cuenta_bancaria_proveedor:
        !pagoATerceros && idCuentaProveedor ? Number(idCuentaProveedor) : null,
      // En Efectivo la plata sale del bolsillo del cambista, no de una
      // cuenta. Para los demas medios de pago va null (el back lo
      // normaliza de todos modos).
      id_cambista: idCambista ? Number(idCambista) : null,
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
      // El padre remonta `<RegistroAnticipo>` (key=`openRegistro`): no hace
      // falta limpiar campos manualmente, el siguiente `useState` ya
      // arranca con la fecha de hoy y los strings vacios.
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
      <Group grow>
        <Select
          label="Empresa"
          withAsterisk
          radius="lg"
          size="xs"
          searchable
          clearable
          placeholder={loadingEmpresas ? "Cargando..." : "Seleccione"}
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
          error={errores.saldo}
          classNames={fieldClasses}
          size="xs"
          radius="lg"
          required
        />
      </Group>

      {/* --- Cuentas: origen (empresa) y destino (proveedor) | solo si requiereBanco --- */}
      {requiereBanco && (
        <Group grow align="flex-start">
          <Select
            label="Cuenta de la empresa (origen)"
            radius="lg"
            size="xs"
            searchable
            clearable
            withAsterisk
            required
            placeholder={
              loadingCuentas
                ? "Cargando..."
                : "Seleccione"
            }
            data={
              loadingCuentas
                ? []
                : cuentasEmpresaVisibles.map((c) => ({
                    value: String(c.id_cuenta_bancaria),
                    label: `${c.banco} (${c.numero_cuenta}) - ${c.moneda}`,
                  }))
            }
            value={idCuentaEmpresa}
            onChange={(v) => {
              setIdCuentaEmpresa(v);
              limpiarError("id_cuenta_bancaria_empresa");
            }}
            searchValue={busquedaCuentaEmpresa}
            onSearchChange={setBusquedaCuentaEmpresa}
            nothingFoundMessage="Sin coincidencias"
            disabled={!idEmpresa || loadingCuentas}
            rightSection={
              loadingCuentas ? <Loader size="xs" color="indigo" /> : undefined
            }
            error={errores.id_cuenta_bancaria_empresa}
            classNames={fieldClasses}
          />
          <Select
            label="Cuenta del proveedor (destino)"
            radius="lg"
            size="xs"
            searchable
            clearable
            withAsterisk={!pagoATerceros}
            required={!pagoATerceros}
            placeholder="Seleccione"
            data={cuentasProveedorVisibles.map((c) => ({
              value: String(c.id_cuenta_bancaria),
              label: `${c.banco} (${c.numero_cuenta})`,
            }))}
            value={idCuentaProveedor}
            onChange={(v) => {
              setIdCuentaProveedor(v);
              limpiarError("id_cuenta_bancaria_proveedor");
            }}
            searchValue={busquedaCuentaProveedor}
            onSearchChange={setBusquedaCuentaProveedor}
            nothingFoundMessage="Sin coincidencias"
            error={errores.id_cuenta_bancaria_proveedor}
            classNames={fieldClasses}
          />
        </Group>
      )}

      {/* --- Referencia bancaria, fecha y factura --- */}
      <Group grow align="flex-start">
        {requiereBanco ? (
          <TextInput
            label={"N° Operación bancaria"}
            placeholder="Ej. OP-987654"
            radius="lg"
            size="xs"
            value={numeroOperacion}
            onChange={(e) => {
              setNumeroOperacion(
                e.currentTarget.value.toUpperCase().slice(0, 64),
              );
              limpiarError("numero_operacion");
            }}
            error={errores.numero_operacion}
            classNames={fieldClasses}
            withAsterisk
            required
          />
        ) : requiereCambista ? (
          <Group align="flex-end" wrap="nowrap" gap="xs">
            <Select
              label="Cambista"
              radius="lg"
              size="xs"
              searchable
              clearable
              withAsterisk
              required
              placeholder={
                loadingCambistas ? "Cargando..." : "Seleccione"
              }
              data={
                loadingCambistas
                  ? []
                  : cambistasVisibles.map((c) => ({
                      value: String(c.id_cambista),
                      label: c.nombre,
                    }))
              }
              value={idCambista}
              onChange={(v) => {
                setIdCambista(v);
                limpiarError("id_cambista");
              }}
              searchValue={busquedaCambista}
              onSearchChange={setBusquedaCambista}
              nothingFoundMessage="Sin coincidencias"
              disabled={loadingCambistas}
              rightSection={
                loadingCambistas ? (
                  <Loader size="xs" color="indigo" />
                ) : undefined
              }
              error={errores.id_cambista}
              classNames={fieldClasses}
              style={{ flexGrow: 1, minWidth: 0 }}
            />
            <ActionIcon
              onClick={() => setModalNuevoCambistaAbierto(true)}
              color="indigo"
              variant="light"
              size="lg"
              title="Anadir cambista"
              aria-label="Anadir cambista"
              className="mb-1"
            >
              <IconPlus size={18} />
            </ActionIcon>
          </Group>
        ) : null}
        <CustomDatePicker
          label={"Fecha del pago"}
          placeholder="Seleccione fecha"
          value={fechaPago}
          onChange={(v) => {
            setFechaPago(v);
            limpiarError("fecha_hora_pago");
          }}
          error={errores.fecha_hora_pago}
          classNames={fieldClasses}
          required={requiereBanco}
          radius="lg"
          size="xs"
          withAsterisk
        />
        <TextInput
          label="Factura / comprobante"
          placeholder="Ej. F001-00123"
          radius="lg"
          size="xs"
          value={factura}
          onChange={(e) => {
            setFactura(e.currentTarget.value.toUpperCase().slice(0, 64));
            limpiarError("codigo_comprobante");
          }}
          error={errores.codigo_comprobante}
          classNames={fieldClasses}
        />
      </Group>

      {/* --- Observacion --- */}
      <TextInput
        label="Observación"
        placeholder="Motivo, detalle del pago a terceros, etc."
        radius="lg"
        size="xs"
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

      <ModalNuevoCambista
        opened={modalNuevoCambistaAbierto}
        close={() => setModalNuevoCambistaAbierto(false)}
        onCreated={(c) => {
          // Refrescamos la lista con la fila que acaba de crear el back
          // (incluye id y nombre). Como usamos `id_cambista` para
          // autoseleccionar, NO necesitamos volver a pegarle al
          // GET /cambistas.
          setCambistas((prev) => {
            const sinDup = prev.filter(
              (x) => x.id_cambista !== c.id_cambista,
            );
            return [...sinDup, c].sort((a, b) =>
              a.nombre.localeCompare(b.nombre),
            );
          });
          setIdCambista(String(c.id_cambista));
          setBusquedaCambista("");
        }}
      />
    </Stack>
  );
};
