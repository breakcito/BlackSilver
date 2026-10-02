import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Loader,
  Stack,
  Switch,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconCash,
  IconCircleX,
  IconEye,
  IconPlus,
  IconSearch,
  IconTrendingDown,
  IconUsers,
} from "@tabler/icons-react";
import type { DataTableColumn } from "mantine-datatable";
import dayjs from "dayjs";
import "dayjs/locale/es";

import { ProveedoresService } from "../../service/proveedores.service";
import type {
  AnticipoProveedorResponse,
  ProveedorResponse,
} from "../../service/proveedores.responses";
import { useNotify } from "../../../../hooks/useNotify";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import { DataTableEstandar } from "../../../../presentation/utils/datatable-estandar";
import { BotonRecargar } from "../../../../presentation/utils/boton-recargar";
import { formatMontoPEN } from "../../../../shared/functions/format-monto-pen";
import { getCoincidencias } from "../../../../shared/functions/get-coincidencias";
import { RegistroAnticipo } from "./components/registro-anticipo";
import { DetalleAnticipo } from "./components/detalle-anticipo";

dayjs.locale("es");

type FiltroEstado = "todos" | "conSaldo" | "sinSaldo" | "anulados";

const FILTROS: { value: FiltroEstado; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "conSaldo", label: "Con saldo" },
  { value: "sinSaldo", label: "Sin saldo" },
  { value: "anulados", label: "Anulados" },
];

interface Props {
  proveedor: ProveedorResponse;
  abierto: boolean;
  onClose: () => void;
  onChanged?: (anticipos: AnticipoProveedorResponse[]) => void;
}

/**
 * Indicador compacto de la cabecera del modal. Va en el `rightSection` en
 * vez de como tarjetas en el body: el resumen es contexto de lectura, no
 * contenido, asi que no debería empujar la tabla hacia abajo.
 *
 * Vive fuera del componente padre a proposito: declarada dentro, su
 * identidad cambiaria en cada render y React remontaria los 4 bloques en
 * cada tecla del buscador.
 */
const KpiCabecera = ({
  label,
  valor,
  icon,
  color,
  loading,
}: {
  label: string;
  valor: string;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}) => (
  <Group gap={6} wrap="nowrap">
    <span className={color}>{icon}</span>
    <div className="flex flex-col leading-none">
      <Text
        size="10px"
        fw={700}
        c={"gray.4"}
        className="uppercase tracking-wider whitespace-nowrap"
      >
        {label}
      </Text>
      {/* Mientras carga se muestra el spinner y no "S/ 0.00": un cero
          momentaneo se lee como saldo real y hace que el operador tome una
          decision sobre un dato que aun no existe. */}
      {loading ? (
        <Loader size="xs" color="indigo" className="mt-1" />
      ) : (
        <Text size="sm" fw={800} className={`font-mono ${color} mt-0.5`}>
          {valor}
        </Text>
      )}
    </div>
  </Group>
);

const SeparadorKpi = () => <div className="w-px h-7 bg-white/10" />;

/**
 * Gestion de anticipos de un proveedor de carbon.
 *
 * El componente es dueño de su propio `ModalEstandar` (a diferencia de los
 * modulos hermanos, que reciben el modal ya montado desde la pagina) porque
 * necesita inyectar los KPIs en el `rightSection` de su cabecera, y eso
 * solo es posible desde quien renderiza el modal.
 *
 * Vista maestro: KPIs en la cabecera + buscador + filtros + grilla. El
 * registro vive en un modal aparte y el detalle en otro, para que la lista
 * se pueda escanear de un vistazo (heuristica "Recognition rather than
 * recall": el operador compara montos, fechas y cuentas sin abrir nada).
 */
export const AnticiposProveedor = ({
  proveedor,
  abierto,
  onClose,
  onChanged,
}: Props) => {
  const { notifySuccess, notifyError } = useNotify();

  const idProveedor = proveedor.id_proveedor;
  const cuentasProveedor = proveedor.cuentas_bancarias ?? [];

  const [anticipos, setAnticipos] = useState<AnticipoProveedorResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<FiltroEstado>("todos");

  const [openRegistro, setOpenRegistro] = useState(false);
  const [pagoATerceros, setPagoATerceros] = useState(false);
  const [detalle, setDetalle] = useState<AnticipoProveedorResponse | null>(
    null,
  );
  const [confirmarAnular, setConfirmarAnular] =
    useState<AnticipoProveedorResponse | null>(null);
  const [anulandoId, setAnulandoId] = useState<number | null>(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const resp =
        await ProveedoresService.getAnticiposPorProveedor(idProveedor);
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

  // --- Derivados ---------------------------------------------------------

  /**
   * El estado mostrado se deriva del saldo vivo, no de la columna
   * `estado`: el backend no la recalcula cuando una liquidacion consume
   * el saldo, asi que leer la columna mostraria "Con Saldo" para un
   * anticipo ya cancelado.
   */
  const metrics = useMemo(() => {
    let saldoDisponible = 0;
    let montoRegistrado = 0;
    let consumido = 0;
    let anulados = 0;

    anticipos.forEach((a) => {
      const inicial = Number(a.saldo_inicial) || 0;
      const actual = Number(a.saldo_actual) || 0;
      if (a.esta_anulado == 1) {
        anulados += 1;
        return;
      }
      montoRegistrado += inicial;
      consumido += Math.max(inicial - actual, 0);
      saldoDisponible += actual;
    });

    return { saldoDisponible, montoRegistrado, consumido, anulados };
  }, [anticipos]);

  const visibles = useMemo(() => {
    const porEstado = anticipos.filter((a) => {
      const anulado = Boolean(a.esta_anulado);
      if (filtro === "anulados") return anulado;
      if (anulado) return false;
      if (filtro === "conSaldo") return Number(a.saldo_actual) > 0;
      if (filtro === "sinSaldo") return Number(a.saldo_actual) <= 0;
      return true;
    });

    const q = busqueda.trim();
    if (!q) return porEstado;

    // Busqueda tolerante sobre los campos por los que el operador
    // realmente recuerda un anticipo: el numero de operacion, la
    // factura, la observacion y las cuentas.
    return getCoincidencias(porEstado, q, {
      keys: [
        "numero_operacion",
        "codigo_comprobante",
        "observacion",
        "cuenta_proveedor_numero",
        "cuenta_bancaria_numero",
        "empresa_nombre",
      ],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [anticipos, busqueda, filtro]);

  // --- Acciones ----------------------------------------------------------

  const handleAnular = async (a: AnticipoProveedorResponse) => {
    setAnulandoId(a.id_anticipo);
    try {
      const resp = await ProveedoresService.anularAnticipoPorProveedor(
        idProveedor,
        a.id_anticipo,
      );
      if (resp.success) {
        notifySuccess("Anticipo anulado correctamente");
        setConfirmarAnular(null);
        setDetalle(null);
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

  // --- Columnas ----------------------------------------------------------
  //
  // Memorizadas: `DataTableEstandar` reasigna un accessor UUID a cada
  // columna sin `accessor` y su useMemo depende de la identidad del array.
  // Un array nuevo en cada render regeneraria los UUIDs y remontaria los
  // encabezados en cada keystroke del buscador.

  const columns: DataTableColumn<AnticipoProveedorResponse>[] = useMemo(
    () => [
      { accessor: "index", title: "#", textAlign: "center", width: 50 },
      {
        accessor: "fecha_hora_pago",
        title: "Fecha de pago",
        width: 110,
        textAlign: "center",
        render: (a) => (
          <div>
            <Text size="xs" className="text-zinc-200 font-mono">
              {a.fecha_hora_pago
                ? dayjs(a.fecha_hora_pago).format("DD/MM/YYYY")
                : "—"}
            </Text>
            <Text size="11px" c="gray.4" className="font-mono">
              {a.fecha_hora_pago
                ? dayjs(a.fecha_hora_pago).format("HH:mm")
                : `Reg. ${dayjs(a.created_at).format("DD/MM/YY")}`}
            </Text>
          </div>
        ),
      },
      {
        accessor: "numero_operacion",
        title: "Operación",
        width: 110,
        textAlign: "center",
        render: (a) => (
          <Stack gap={6} justify="center" align="center">
            <Text size="xs" c={"teal"} fw={700}>
              {a.numero_operacion || "—"}
            </Text>
            <Badge color="lime" variant="light" size="sm" radius="xl">
              {a.medio_pago}
            </Badge>
          </Stack>
        ),
      },
      {
        accessor: "codigo_comprobante",
        title: "Comprobante",
        width: 130,
        textAlign: "center",
        render: (a) => (
          <div className="min-w-0">
            <Text size="xs" className="font-mono text-zinc-300 truncate">
              {a.codigo_comprobante || "—"}
            </Text>
            {a.observacion && (
              <Text
                size="10px"
                c="dimmed"
                truncate
                maw={180}
                title={a.observacion}
              >
                {a.observacion}
              </Text>
            )}
          </div>
        ),
      },
      {
        accessor: "id_cuenta_bancaria_empresa",
        title: "Origen",
        textAlign: "center",
        width: 180,
        render: (a) => (
          <div className="min-w-0">
            <Text size="xs" className="" c={"gray.3"} fw={600}>
              {a.empresa_nombre ?? "—"}
            </Text>
            <Badge size="sm" color="cyan">
              {a.cuenta_bancaria_numero
                ? `${a.cuenta_bancaria_moneda ?? ""} ${a.cuenta_bancaria_numero ? " - " + a.cuenta_bancaria_numero : ""}`.trim()
                : "sin cuenta"}
            </Badge>
          </div>
        ),
      },
      {
        accessor: "id_cuenta_bancaria_proveedor",
        title: "Destino",
        width: 180,
        textAlign: "center",
        render: (a) => {
          if (a.pago_a_terceros) {
            return (
              <Badge
                color="yellow"
                variant="light"
                size="sm"
                radius="xl"
                leftSection={<IconUsers size={11} />}
              >
                A terceros
              </Badge>
            );
          }
          return (
            <div className="min-w-0">
              <Text size="xs" className="" c={"gray.3"} fw={600}>
                {a.cuenta_proveedor_banco ?? "—"}
              </Text>
              <Text size="11px" c="gray.5" className="font-mono ">
                {a.cuenta_proveedor_numero
                  ? `${a.cuenta_proveedor_moneda ?? ""} ${a.cuenta_proveedor_numero}`.trim()
                  : ""}
              </Text>
            </div>
          );
        },
      },
      {
        accessor: "saldo_actual",
        title: "Saldo",
        width: 110,
        textAlign: "center",
        render: (a) => {
          const inicial = Number(a.saldo_inicial) || 0;
          const actual = Number(a.saldo_actual) || 0;
          const consumido = Math.max(inicial - actual, 0);
          return (
            <div>
              <Text
                size="xs"
                fw={700}
                className={
                  "font-mono " +
                  (a.esta_anulado == 1
                    ? "text-red-400"
                    : actual > 0
                      ? "text-emerald-400"
                      : "text-zinc-500")
                }
              >
                {formatMontoPEN(actual)}
              </Text>
              {consumido > 0 && (
                <Text size="10px" c="dimmed" className="font-mono">
                  de {formatMontoPEN(inicial)}
                </Text>
              )}
            </div>
          );
        },
      },
      {
        accessor: "estado",
        title: "Estado",
        width: 120,
        textAlign: "center",
        render: (a) => {
          const anulado = Boolean(a.esta_anulado);
          const actual = Number(a.saldo_actual) || 0;
          return (
            <Badge
              color={anulado ? "red" : actual > 0 ? "teal" : "gray"}
              variant={anulado ? "filled" : "light"}
              size="sm"
              radius="xl"
            >
              {anulado ? "Anulado" : actual > 0 ? "Con saldo" : "Sin saldo"}
            </Badge>
          );
        },
      },
      {
        accessor: "acciones",
        title: "Acciones",
        width: 120,
        textAlign: "center",
        render: (a) => {
          const anulado = Boolean(a.esta_anulado);
          return (
            <Group gap={2} justify="center" wrap="nowrap">
              <Tooltip label="Ver detalle" position="top" withArrow>
                <ActionIcon
                  variant="subtle"
                  color="indigo"
                  size="md"
                  radius="xl"
                  onClick={() => setDetalle(a)}
                  aria-label="Ver detalle del anticipo"
                >
                  <IconEye size={16} stroke={1.8} />
                </ActionIcon>
              </Tooltip>
              {!anulado && (
                <Tooltip label="Anular" position="top" withArrow>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="md"
                    radius="xl"
                    loading={anulandoId === a.id_anticipo}
                    onClick={() => setConfirmarAnular(a)}
                    aria-label="Anular anticipo"
                  >
                    <IconCircleX size={16} stroke={1.8} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>
          );
        },
      },
    ],
    [anulandoId],
  );

  // --- Render ------------------------------------------------------------

  return (
    <>
      <ModalEstandar
        opened={abierto}
        close={onClose}
        title={`Anticipos: ${proveedor.razon_social}`}
        size="min(1500px, 96vw)"
        rightSection={
          <Group gap="md" wrap="nowrap">
            <KpiCabecera
              label="Saldo disponible"
              valor={formatMontoPEN(metrics.saldoDisponible)}
              icon={<IconCash size={13} />}
              color="text-emerald-400"
              loading={loading}
            />
            <SeparadorKpi />
            <KpiCabecera
              label="Registrado"
              valor={formatMontoPEN(metrics.montoRegistrado)}
              icon={<IconCash size={13} />}
              color="text-indigo-400"
              loading={loading}
            />
            <SeparadorKpi />
            <KpiCabecera
              label="Consumido"
              valor={formatMontoPEN(metrics.consumido)}
              icon={<IconTrendingDown size={13} />}
              color="text-pink-400"
              loading={loading}
            />
            <SeparadorKpi />
            <KpiCabecera
              label="Anulados"
              valor={String(metrics.anulados)}
              icon={<IconCircleX size={13} />}
              color="text-red-400"
              loading={loading}
            />
          </Group>
        }
      >
        <Stack gap="md">
          {/* --- Buscador + filtros --- */}
          <Group justify="space-between" gap="sm" wrap="wrap">
            <TextInput
              placeholder="Buscar por operación, factura, observación o cuenta..."
              leftSection={<IconSearch size={16} className="text-zinc-400" />}
              radius="lg"
              size="xs"
              value={busqueda}
              onChange={(e) => setBusqueda(e.currentTarget.value)}
              className="flex-1 min-w-56"
              classNames={{
                input:
                  "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
              }}
            />
            <Group gap="xs" wrap="nowrap">
              {FILTROS.map((f) => (
                <Badge
                  key={f.value}
                  component="button"
                  type="button"
                  onClick={() => setFiltro(f.value)}
                  variant={filtro === f.value ? "filled" : "light"}
                  color={filtro === f.value ? "indigo" : "zinc"}
                  size="md"
                  radius="xl"
                  className="cursor-pointer transition-all"
                >
                  {f.label}
                </Badge>
              ))}
              <BotonRecargar onReload={cargar} loading={loading} />
              <Button
                leftSection={<IconPlus size={14} />}
                radius="xl"
                size="xs"
                onClick={() => {
                  setPagoATerceros(false);
                  setOpenRegistro(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20"
              >
                Registrar anticipo
              </Button>
            </Group>
          </Group>

          {/* --- Grilla --- */}
          <DataTableEstandar
            idAccessor="id_anticipo"
            columns={columns}
            records={visibles}
            loading={loading}
            initialPageSize={10}
            minHeight={280}
            noRecordsText={
              busqueda.trim()
                ? "Ningun anticipo coincide con la busqueda"
                : "Este proveedor no tiene anticipos en este filtro"
            }
          />

          <Text size="11px" c="gray.5">
            Mostrando {visibles.length} de {anticipos.length} anticipo(s). Los
            anulados no se descuentan del saldo.
          </Text>
        </Stack>
      </ModalEstandar>

      {/* --- Modal: registro --- */}
      <ModalEstandar
        opened={openRegistro}
        close={() => setOpenRegistro(false)}
        title="Registrar anticipo"
        size="xl"
        zIndex={10001}
        rightSection={
          <Switch
            checked={pagoATerceros}
            onChange={(e) => setPagoATerceros(e.currentTarget.checked)}
            size="sm"
            color="yellow"
            radius="xl"
            label={
              <Text
                size="xs"
                fw={600}
                c={pagoATerceros ? "yellow.3" : "zinc.4"}
              >
                Pago a terceros
              </Text>
            }
          />
        }
      >
        <RegistroAnticipo
          idProveedor={idProveedor}
          cuentasProveedor={cuentasProveedor}
          pagoATerceros={pagoATerceros}
          service={ProveedoresService}
          onRegistrado={cargar}
          onCancel={() => setOpenRegistro(false)}
        />
      </ModalEstandar>

      {/* --- Modal: detalle --- */}
      <ModalEstandar
        opened={detalle !== null}
        close={() => setDetalle(null)}
        title="Detalle del anticipo"
        size="lg"
      >
        {detalle && <DetalleAnticipo anticipo={detalle} />}
      </ModalEstandar>

      {/* --- Modal: confirmar anulacion --- */}
      <ModalEstandar
        opened={confirmarAnular !== null}
        close={() => setConfirmarAnular(null)}
        title="Anular anticipo"
        size="sm"
      >
        {confirmarAnular && (
          <Stack gap="md">
            <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-3">
              <Text size="sm" className="text-red-200">
                Vas a anular el anticipo de{" "}
                <strong>{formatMontoPEN(confirmarAnular.saldo_inicial)}</strong>{" "}
                registrado el{" "}
                {dayjs(confirmarAnular.created_at).format("DD/MM/YYYY")}.
              </Text>
              <Text size="xs" c="red.4" mt={4}>
                El saldo de {formatMontoPEN(confirmarAnular.saldo_actual)}{" "}
                volverá a estar disponible para el proveedor. La accion no se
                puede deshacer.
              </Text>
            </div>
            <Group justify="flex-end" gap="sm">
              <Button
                variant="subtle"
                color="gray"
                radius="xl"
                size="xs"
                onClick={() => setConfirmarAnular(null)}
              >
                Cancelar
              </Button>
              <Button
                color="red"
                radius="xl"
                size="xs"
                loading={anulandoId === confirmarAnular.id_anticipo}
                onClick={() => handleAnular(confirmarAnular)}
              >
                Si, anular
              </Button>
            </Group>
          </Stack>
        )}
      </ModalEstandar>
    </>
  );
};
