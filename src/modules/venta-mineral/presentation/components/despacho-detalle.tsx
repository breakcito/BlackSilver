import { useCallback, useMemo, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconCash,
  IconChevronDown,
  IconDroplet,
  IconFlask,
  IconPencil,
  IconPlus,
  IconReceipt,
  IconScale,
  IconTrash,
  IconTruckDelivery,
  IconWallet,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import { enPlural } from "../../../../shared/functions/en-plural";
import { EstadoLiquidacionMineral } from "../../../../shared/enums/venta-mineral/estado-liquidacion-mineral";
import type {
  SeccionDespachoMineral,
  TipoComprobanteDespacho,
} from "../../service/venta-mineral.requests";
import type {
  AnalisisLaboratorioItem,
  ComprobanteDespachoItem,
  DespachoMineralDetalle,
  FleteDespachoItem,
  GastoDespachoItem,
  LiquidacionMineralItem,
} from "../../service/venta-mineral.responses";
import { ComprobanteCard } from "./comprobante-card";
import {
  colorEstadoComprobante,
  pendientesComprobante,
  tieneSaldoPendiente,
} from "./comprobante-estado";
import { ConfirmarEliminar } from "./confirmar-eliminar";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import { simboloMoneda } from "../forms/calculos-despacho";
import { PencilSquareIcon } from "@heroicons/react/24/outline";

interface Props {
  detalle: DespachoMineralDetalle;
  /**
   * Seccion que se esta recargando: en esa sola seccion se dibuja el
   * indicador de carga. `null` cuando no hay nada recargandose.
   */
  seccionCargando?: SeccionDespachoMineral | null;
  onVolver?: () => void;
  onRegistrarGasto: () => void;
  onEditarGasto: (gasto: GastoDespachoItem) => void;
  /** Las eliminaciones devuelven la promesa: el confirmador la espera. */
  onEliminarGasto: (gasto: GastoDespachoItem) => void | Promise<unknown>;
  onRegistrarFlete: () => void;
  onEditarFlete: (flete: FleteDespachoItem) => void;
  onRegistrarBalanza: (flete: FleteDespachoItem) => void;
  onEliminarFlete: (flete: FleteDespachoItem) => void | Promise<unknown>;
  onRegistrarComprobante: (
    tipo: TipoComprobanteDespacho,
    /** Analisis concretos a facturar (opcional). */
    analisis?: AnalisisLaboratorioItem[],
  ) => void;
  onEditarComprobante: (
    tipo: TipoComprobanteDespacho,
    comprobante: ComprobanteDespachoItem,
  ) => void;
  onEliminarComprobante: (
    tipo: TipoComprobanteDespacho,
    comprobante: ComprobanteDespachoItem,
  ) => void | Promise<unknown>;
  onRegistrarPago: (
    tipo: TipoComprobanteDespacho,
    comprobante: ComprobanteDespachoItem,
  ) => void;
  onRegistrarAnalisis: () => void;
  onEditarAnalisis: (analisis: AnalisisLaboratorioItem) => void;
  onEliminarAnalisis: (
    analisis: AnalisisLaboratorioItem,
  ) => void | Promise<unknown>;
  onRegistrarLiquidacion: () => void;
  onEditarLiquidacion: (liquidacion: LiquidacionMineralItem) => void;
  onEliminarLiquidacion: (
    liquidacion: LiquidacionMineralItem,
  ) => void | Promise<unknown>;
}

/**
 * Simbolo y color de cada elemento quimico. El color es el mismo que el
 * de los inputs del modal de analisis.
 */
const ELEMENTO_QUIMICO = {
  Oro: { sigla: "Au", color: "border-yellow-400/60 text-yellow-400" },
  Plata: { sigla: "Ag", color: "border-pink-300/60 text-pink-300" },
  Cobre: { sigla: "Cu", color: "border-orange-400/60 text-orange-400" },
  Zinc: { sigla: "Zn", color: "border-teal-300/60 text-teal-300" },
  Arsenico: { sigla: "As", color: "border-purple-400/60 text-purple-400" },
  Hierro: { sigla: "Fe", color: "border-sky-400/60 text-sky-400" },
  Plomo: { sigla: "Pb", color: "border-indigo-400/60 text-indigo-400" },
} as const;

/**
 * Cuadradito con el simbolo del elemento quimico, como en la tabla
 * periodica.
 */
const CuadroElemento = ({ elemento }: { elemento: string }) => {
  const datos =
    ELEMENTO_QUIMICO[elemento as keyof typeof ELEMENTO_QUIMICO] ??
    ELEMENTO_QUIMICO.Oro;

  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded border text-[11px] font-bold leading-none ${datos.color}`}
    >
      {datos.sigla}
    </span>
  );
};

/**
 * Color de cada elemento quimico en el listado de liquidaciones.
 */
const COLOR_ELEMENTO_QUIMICO = {
  Oro: "yellow",
  Plata: "gray",
  Cobre: "orange",
  Zinc: "teal",
  Arsenico: "grape",
  Hierro: "blue",
  Plomo: "indigo",
} as const;

/**
 * Tarjeta de una liquidacion de mineral.
 *
 * Los datos van en una sola linea con el criterio de la cabecera del
 * despacho: etiqueta gris, valor con color y divisores verticales.
 */
const TarjetaLiquidacion = ({
  liquidacion,
  onEditar,
  onEliminar,
  onToggleFactura,
  facturaAbierta,
  factura,
}: {
  liquidacion: LiquidacionMineralItem;
  onEditar: () => void;
  onEliminar: () => void;
  /** Abre u oculta la factura (comprobante) de la liquidacion. */
  onToggleFactura?: () => void;
  facturaAbierta?: boolean;
  /** Factura de la liquidacion (se muestra al desplegar). */
  factura?: React.ReactNode;
}) => (
  <Paper
    p="sm"
    radius="md"
    className="bg-zinc-900/60 border border-zinc-800/70"
  >
    <Group justify="space-between" wrap="nowrap" align="flex-start">
      <div className="min-w-0">
        {/* Elemento, codigo, estado y cliente */}
        <Group gap="xs" align="center" wrap="wrap">
          <CuadroElemento elemento={liquidacion.elemento_quimico} />
          <Text size="sm" fw={700} c="zinc.100" className="font-mono">
            {liquidacion.codigo_liquidacion ?? "Sin codigo"}
          </Text>
          <Badge
            color={
              COLOR_ELEMENTO_QUIMICO[
                liquidacion.elemento_quimico as keyof typeof COLOR_ELEMENTO_QUIMICO
              ] ?? "gray"
            }
            variant="light"
            size="sm"
            radius="sm"
          >
            {liquidacion.elemento_quimico}
          </Badge>
          <Badge
            color={
              liquidacion.estado === EstadoLiquidacionMineral.Pagada
                ? "green"
                : liquidacion.estado === EstadoLiquidacionMineral.Aprobada
                  ? "indigo"
                  : "gray"
            }
            variant="light"
            size="sm"
            radius="sm"
          >
            {liquidacion.estado}
          </Badge>
          <Text size="xs" c="zinc.600">
            |
          </Text>
          <Text size="xs" c="zinc.300" truncate>
            {liquidacion.cliente ?? "Sin cliente"}
            {liquidacion.fecha_liquidacion ? (
              <>
                {" · "}
                <Text span size="xs" fw={600} c="teal.3">
                  {dayjs(liquidacion.fecha_liquidacion).format("DD/MM/YYYY")}
                </Text>
              </>
            ) : null}
          </Text>
        </Group>

        {/* Pesos, ley, valor y deducciones en una sola linea */}
        <Group gap="xs" mt={8} align="center" wrap="wrap">
          <Text size="xs" c="gray">
            TMS{" "}
            <Text span size="xs" fw={700} c="blue">
              {formatNumber(liquidacion.peso_seco)} t
            </Text>
          </Text>
          <Divider orientation="vertical" />
          <Text size="xs" c="gray">
            Neto{" "}
            <Text span size="xs" fw={700} c="pink">
              {formatNumber(liquidacion.peso_neto)} t
            </Text>
          </Text>
          <Divider orientation="vertical" />
          <Text size="xs" c="gray">
            Ley{" "}
            <Text span size="xs" fw={700} c="cyan">
              {formatNumber(liquidacion.ley_elemento)}
            </Text>
          </Text>
          <Divider orientation="vertical" />
          <Text size="xs" c="gray">
            Valor{" "}
            <Text span size="xs" fw={700} c="orange.3">
              $ {formatNumber(liquidacion.valor_por_tonelada)}/t
            </Text>
          </Text>
          <Divider orientation="vertical" />
          <Text size="xs" c="gray">
            Deducciones{" "}
            <Text span size="xs" fw={700} c="lime.3">
              $ {formatNumber(liquidacion.total_deducciones)}
            </Text>
          </Text>
        </Group>
      </div>

      <Group gap={4} wrap="nowrap">
        <Text size="sm" fw={700} c="lime.3">
          $ {formatNumber(liquidacion.total)}
        </Text>
        <Button
          variant="subtle"
          color="indigo"
          size="compact-xs"
          onClick={onEditar}
          leftSection={<IconPencil size={12} />}
        >
          Editar
        </Button>
        <Button
          variant="subtle"
          color="red"
          size="compact-xs"
          onClick={onEliminar}
          leftSection={<IconTrash size={12} />}
        >
          Eliminar
        </Button>
        {onToggleFactura && (
          <Tooltip
            label={facturaAbierta ? "Ocultar factura" : "Ver factura"}
            withArrow
          >
            <ActionIcon
              variant="subtle"
              color="teal"
              size="md"
              radius="md"
              onClick={onToggleFactura}
            >
              <IconChevronDown
                size={16}
                className={
                  facturaAbierta
                    ? "rotate-180 transition-transform"
                    : "transition-transform"
                }
              />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
    </Group>

    {/* La factura de la liquidacion se despliega desde aqui. */}
    {factura && facturaAbierta && <div className="mt-3">{factura}</div>}
  </Paper>
);

/**
 * Ley de un metal: la sigla y el valor en un recuadro horizontal, con su
 * borde coloreado (como en la tabla periodica).
 *
 * Los colores son los mismos que los de los inputs del modal de analisis.
 * Una ley en cero no se dibuja: solo ocupa espacio.
 */
const LeyCuadro = ({
  sigla,
  valor,
  color,
}: {
  sigla: string;
  valor: number;
  color: string;
}) => {
  if (!valor) return null;

  return (
    <span
      className={`inline-flex items-center justify-center gap-1 h-7 px-2 rounded border text-[10px] font-bold leading-none ${color}`}
    >
      <span>{sigla}</span>
      <span className="font-mono">{formatNumber(valor)}</span>
    </span>
  );
};

/**
 * Datos del laboratorio de un analisis: laboratorio, codigo y fecha.
 */
const DatosAnalisis = ({ analisis }: { analisis: AnalisisLaboratorioItem }) => (
  <Text size="xs" c="gray" truncate>
    {analisis.laboratorio ?? "Sin laboratorio"} · Cod. lab.{" "}
    <Text span size="xs" c="gray">
      {analisis.codigo_laboratorio ?? "-"}
    </Text>
    {analisis.fecha_analisis ? (
      <>
        {" · "}
        <Text span size="xs" fw={600} c="teal.3">
          {dayjs(analisis.fecha_analisis).format("DD/MM/YYYY")}
        </Text>
      </>
    ) : null}
  </Text>
);

/**
 * Leyes de un analisis: una sigla por cuadradito, con su color.
 */
const LeyesAnalisis = ({ analisis }: { analisis: AnalisisLaboratorioItem }) => (
  <Group gap="xs" mt={8} align="center" wrap="wrap">
    <LeyCuadro
      sigla="Au"
      valor={Number(analisis.ley_oro ?? 0)}
      color="border-yellow-400/60 text-yellow-400"
    />
    <LeyCuadro
      sigla="Ag"
      valor={Number(analisis.ley_plata ?? 0)}
      color="border-pink-300/60 text-pink-300"
    />
    <LeyCuadro
      sigla="Cu"
      valor={Number(analisis.ley_cobre ?? 0)}
      color="border-orange-400/60 text-orange-400"
    />
    <LeyCuadro
      sigla="Zn"
      valor={Number(analisis.ley_zinc ?? 0)}
      color="border-teal-300/60 text-teal-300"
    />
    <LeyCuadro
      sigla="As"
      valor={Number(analisis.ley_arsenico ?? 0)}
      color="border-purple-400/60 text-purple-400"
    />
    <LeyCuadro
      sigla="Fe"
      valor={Number(analisis.ley_hierro ?? 0)}
      color="border-sky-400/60 text-sky-400"
    />
    <LeyCuadro
      sigla="Pb"
      valor={Number(analisis.ley_plomo ?? 0)}
      color="border-indigo-400/60 text-indigo-400"
    />
    {Number(analisis.porcentaje_humedad) > 0 && (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400">
        <IconDroplet size={14} className="text-cyan-400" />
        Humedad {formatNumber(analisis.porcentaje_humedad)}%
      </span>
    )}
  </Group>
);

/**
 * Acciones de un analisis: editar y eliminar.
 */
const AccionesAnalisis = ({
  onEditar,
  onEliminar,
}: {
  onEditar: () => void;
  onEliminar: () => void;
}) => (
  <>
    <Tooltip label="Editar">
      <ActionIcon
        variant="subtle"
        color="indigo"
        size="sm"
        onClick={onEditar}
        aria-label="Editar"
      >
        <IconPencil size={15} />
      </ActionIcon>
    </Tooltip>

    <Tooltip label="Eliminar">
      <ActionIcon
        variant="subtle"
        color="red"
        size="sm"
        onClick={onEliminar}
        aria-label="Eliminar"
      >
        <IconTrash size={15} />
      </ActionIcon>
    </Tooltip>
  </>
);

/**
 * Tarjeta de un analisis SIN factura (pendiente de facturar o asumido por
 * el cliente).
 */
const TarjetaAnalisis = ({
  analisis,
  onEditar,
  onEliminar,
}: {
  analisis: AnalisisLaboratorioItem;
  onEditar: () => void;
  onEliminar: () => void;
}) => (
  <Paper
    p="sm"
    radius="md"
    className="bg-zinc-900/60 border border-zinc-800/70"
  >
    {/* Codigo, badge y datos del laboratorio en la misma linea */}
    <Stack gap={"2"}>
      <Group justify="space-between" align="center">
        <Group gap="xs" align="center" wrap="wrap">
          <Text
            size="xs"
            fw={700}
            c="white"
            className="font-mono uppercase"
            mt={2}
          >
            {analisis.codigo_cliente ?? "Sin codigo"}
          </Text>
          {/* <Badge
            color={analisis.asumido_por === "Propio" ? "indigo" : "gray"}
            variant="light"
            size="sm"
            radius="sm"
          >
            {analisis.asumido_por === "Propio"
              ? "Asume la empresa"
              : "Asume el cliente"}
          </Badge> */}
          <AccionesAnalisis onEditar={onEditar} onEliminar={onEliminar} />
        </Group>

        <Group gap={4} wrap="nowrap">
          <Text size="sm" fw={700} c="orange.3">
            S/ {formatNumber(analisis.costo_servicio)}
          </Text>
        </Group>
      </Group>

      <DatosAnalisis analisis={analisis} />
      <LeyesAnalisis analisis={analisis} />
    </Stack>
  </Paper>
);

/**
 * Fila de un analisis DENTRO de la tarjeta de su factura.
 *
 * La factura ya identifica al lote (codigo) y al comprobante: la fila solo
 * aporta lo propio del analisis (laboratorio, codigo, fecha, leyes y costo).
 */
const FilaAnalisis = ({
  analisis,
  onEditar,
  onEliminar,
}: {
  analisis: AnalisisLaboratorioItem;
  onEditar: () => void;
  onEliminar: () => void;
}) => (
  <div className="p-2 rounded-lg border border-zinc-800/80 bg-zinc-950/40">
    <Stack gap={4}>
      <Group justify="space-between">
        <Stack gap={"2"}>
          <Group gap={"xs"}>
            <Text size="xs" c={"white"} fw={600} className="uppercase" mt={2}>
              {analisis.codigo_cliente}
            </Text>
            <AccionesAnalisis onEditar={onEditar} onEliminar={onEliminar} />
          </Group>
          <DatosAnalisis analisis={analisis} />
        </Stack>
        <Group gap={4} wrap="nowrap" className="shrink-0">
          <Text size="sm" fw={700} c="orange.3">
            S/ {formatNumber(analisis.costo_servicio)}
          </Text>
        </Group>
      </Group>

      <LeyesAnalisis analisis={analisis} />
    </Stack>
  </div>
);

/**
 * Indicador de recarga de una seccion del despacho.
 *
 * Solo se dibuja en la seccion que cambio: el resto del detalle sigue
 * legible mientras el backend responde.
 */
const IndicadorCarga = ({
  seccion,
  cargando,
}: {
  seccion: SeccionDespachoMineral;
  cargando?: SeccionDespachoMineral | null;
}) => {
  if (cargando !== seccion) return null;

  return (
    <Group gap={6} align="center" wrap="nowrap">
      <Loader size={12} color="indigo" />
      <Text size="xs" fw={600} c="indigo.3">
        Actualizando...
      </Text>
    </Group>
  );
};

/**
 * Tarjeta de una FACTURA de analisis.
 *
 * Los analisis que cubre una misma comprobante se muestran juntos: la
 * factura se identifica una sola vez (lote, estado y numero de comprobante)
 * y debajo van los analisis que la componen. Antes cada analisis repetia la
 * cabecera y parecian documentos distintos.
 */
const TarjetaFacturaAnalisis = ({
  comprobante,
  analisis,
  facturaAbierta,
  onToggleFactura,
  onEditarAnalisis,
  onEliminarAnalisis,
  onEditarComprobante,
  onRegistrarPago,
  onEliminarComprobante,
}: {
  /** Comprobante que factura el grupo. */
  comprobante: ComprobanteDespachoItem | null;
  /** Analisis que cubre el comprobante. */
  analisis: AnalisisLaboratorioItem[];
  /** La factura (importes y pagos) esta desplegada. */
  facturaAbierta: boolean;
  onToggleFactura: () => void;
  onEditarAnalisis: (analisis: AnalisisLaboratorioItem) => void;
  onEliminarAnalisis: (analisis: AnalisisLaboratorioItem) => void;
  onEditarComprobante: (comprobante: ComprobanteDespachoItem) => void;
  onRegistrarPago: (comprobante: ComprobanteDespachoItem) => void;
  onEliminarComprobante: (comprobante: ComprobanteDespachoItem) => void;
}) => {
  // Estado de pago de la factura: se ve SIN desplegar la tarjeta, que es
  // donde el usuario decide si tiene algo que pagar.
  const pendientes = comprobante ? pendientesComprobante(comprobante) : null;
  const saldoPendiente = comprobante ? tieneSaldoPendiente(comprobante) : false;
  const cantidadPagos = comprobante?.pagos?.length ?? 0;

  return (
    <Paper
      p="sm"
      radius="md"
      className="bg-zinc-900/60 border border-zinc-800/70"
    >
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        {/* La factura se identifica UNA vez */}
        <Group gap="xs" align="center" wrap="wrap" className="min-w-0">
          <IconReceipt size={16} className="text-teal-400 shrink-0" />

          {comprobante?.codigo_comprobante && (
            <Badge color="pink" variant="light" size="sm" radius="sm">
              {comprobante.codigo_comprobante}
            </Badge>
          )}

          {/* Pagos: el estado del comprobante y su saldo se ven de entrada, sin
          tener que desplegar la factura. */}
          {comprobante && (
            <>
              <Group gap="xs" wrap="wrap" className="min-w-0">
                <Badge
                  color={colorEstadoComprobante(comprobante.estado)}
                  variant="light"
                  size="sm"
                  radius="sm"
                >
                  {comprobante.estado}
                </Badge>

                {saldoPendiente && pendientes && (
                  <>
                    <Text size="xs" fw={700} c="blue.3">
                      {`Neto pendiente ${simboloMoneda(comprobante.moneda)} ${formatNumber(pendientes.neto)}`}
                    </Text>
                    <Text size="xs" fw={700} c="yellow.3">
                      {`Detraccion pendiente ${simboloMoneda(comprobante.moneda)} ${formatNumber(pendientes.detraccion)}`}
                    </Text>
                  </>
                )}

                {cantidadPagos > 0 && (
                  <Tooltip label="Ver los pagos de la factura" withArrow>
                    <Button
                      variant="subtle"
                      color="gray"
                      size="compact-xs"
                      radius="md"
                      onClick={() => {
                        if (!facturaAbierta) onToggleFactura();
                      }}
                    >
                      {cantidadPagos} {enPlural("pago", cantidadPagos)}
                    </Button>
                  </Tooltip>
                )}
              </Group>

              {saldoPendiente && (
                <Button
                  variant="light"
                  color="teal"
                  size="compact-xs"
                  radius="md"
                  onClick={() => onRegistrarPago(comprobante)}
                  leftSection={<IconCash size={12} />}
                  className="shrink-0"
                >
                  Pagar
                </Button>
              )}
            </>
          )}
        </Group>

        {comprobante && (
          <Tooltip
            label={facturaAbierta ? "Ocultar factura" : "Ver factura"}
            withArrow
          >
            <ActionIcon
              variant="subtle"
              color="teal"
              size="md"
              radius="md"
              onClick={onToggleFactura}
            >
              <IconChevronDown
                size={16}
                className={
                  facturaAbierta
                    ? "rotate-180 transition-transform"
                    : "transition-transform"
                }
              />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>

      {/* Los analisis de la factura, uno debajo del otro */}
      <Group gap="xs" mt="4" grow>
        {analisis.map((a) => (
          <FilaAnalisis
            key={a.id_analisis_laboratorio}
            analisis={a}
            onEditar={() => onEditarAnalisis(a)}
            onEliminar={() => onEliminarAnalisis(a)}
          />
        ))}
      </Group>

      {/* La factura (importes y pagos) se despliega dentro de la tarjeta */}
      {facturaAbierta && comprobante && (
        <div className="mt-3 pt-3 border-t border-zinc-800/70">
          <ComprobanteCard
            comprobante={comprobante}
            etiqueta=""
            embebido
            onEditar={() => onEditarComprobante(comprobante)}
            onRegistrarPago={() => onRegistrarPago(comprobante)}
            onEliminar={() => onEliminarComprobante(comprobante)}
          />
        </div>
      )}
    </Paper>
  );
};

/**
 * Detalle de un despacho de mineral.
 *
 * El despacho se separa en cinco pestanas: cada una muestra la informacion
 * de esa parte del proceso y sus acciones. Todos los documentos cuelgan del
 * despacho y se editan en el sitio.
 */
export const DespachoDetalle = ({
  detalle,
  seccionCargando,
  onRegistrarGasto,
  onEditarGasto,
  onEliminarGasto,
  onRegistrarFlete,
  onEditarFlete,
  onRegistrarBalanza,
  onEliminarFlete,
  onRegistrarComprobante,
  onEditarComprobante,
  onEliminarComprobante,
  onRegistrarPago,
  onRegistrarAnalisis,
  onEditarAnalisis,
  onEliminarAnalisis,
  onRegistrarLiquidacion,
  onEditarLiquidacion,
  onEliminarLiquidacion,
}: Props) => {
  const [aEliminar, setAEliminar] = useState<{
    titulo: string;
    descripcion: string;
    /** La accion puede ser asincrona: el confirmador espera su fin. */
    accion: () => void | Promise<unknown>;
  } | null>(null);

  /** Flete pendiente de confirmacion de elimination. */
  const [fleteAEliminar, setFleteAEliminar] =
    useState<FleteDespachoItem | null>(null);
  /** El flete se esta borrando en el backend. */
  const [eliminandoFlete, setEliminandoFlete] = useState(false);

  /** Comprobantes de analisis cuya factura esta desplegada. */
  const [comprobantesAbiertos, setComprobantesAbiertos] = useState<number[]>(
    [],
  );

  /** Comprobante de liquidacion cuya factura esta desplegada. */
  const [facturaDesplegada, setFacturaDesplegada] = useState<number | null>(
    null,
  );

  /** Despliega u oculta la factura de un comprobante de analisis. */
  const alternarComprobante = useCallback((idComprobante: number) => {
    setComprobantesAbiertos((prev) =>
      prev.includes(idComprobante)
        ? prev.filter((id) => id !== idComprobante)
        : [...prev, idComprobante],
    );
  }, []);

  /**
   * Flete del despacho. El mineral se lleva en una sola unidad, asi que el
   * despacho tiene un unico flete.
   */
  const flete = detalle.fletes[0] ?? null;

  /* ---------------- Agrupacion de analisis ----------------
   *
   * Los analisis se separan en tres grupos: los de la empresa que aun no se
   * facturan (los unicos facturables), los de la empresa ya facturados (por
   * comprobante) y los que asume el cliente (no se facturan).
   */

  const analisisEmpresa = useMemo(
    () => detalle.analisis.filter((a) => a.asumido_por === "Propio"),
    [detalle.analisis],
  );

  const analisisCliente = useMemo(
    () => detalle.analisis.filter((a) => a.asumido_por !== "Propio"),
    [detalle.analisis],
  );

  const analisisSinFacturar = useMemo(
    () => analisisEmpresa.filter((a) => !a.id_comprobante_analisis_despacho),
    [analisisEmpresa],
  );

  const analisisFacturados = useMemo(
    () => analisisEmpresa.filter((a) => !!a.id_comprobante_analisis_despacho),
    [analisisEmpresa],
  );

  /** Analisis de la empresa agrupados por el comprobante que los factura. */
  const analisisPorComprobante = useMemo(() => {
    const porComprobante = new Map<number, AnalisisLaboratorioItem[]>();

    analisisFacturados.forEach((analisis) => {
      const id = analisis.id_comprobante_analisis_despacho as number;
      porComprobante.set(id, [...(porComprobante.get(id) ?? []), analisis]);
    });

    return Array.from(porComprobante.entries());
  }, [analisisFacturados]);

  /** Comprobante que factura un grupo de analisis. */
  const comprobanteDeAnalisis = useCallback(
    (idComprobante: number) =>
      detalle.comprobantes_analisis.find(
        (c) => c.id_comprobante === idComprobante,
      ),
    [detalle.comprobantes_analisis],
  );

  return (
    <Stack gap="md" className="animate-fade-in">
      <Tabs defaultValue="gastos" variant="outline" color="indigo">
        <Tabs.List>
          <Tabs.Tab value="gastos" leftSection={<IconWallet size={14} />}>
            Gastos
          </Tabs.Tab>
          <Tabs.Tab value="flete" leftSection={<IconTruckDelivery size={14} />}>
            Flete
          </Tabs.Tab>
          <Tabs.Tab value="molienda" leftSection={<IconScale size={14} />}>
            Molienda
          </Tabs.Tab>
          <Tabs.Tab value="analisis" leftSection={<IconFlask size={14} />}>
            Analisis
          </Tabs.Tab>
          <Tabs.Tab value="liquidacion" leftSection={<IconReceipt size={14} />}>
            Liquidaciones
          </Tabs.Tab>
        </Tabs.List>

        {/* ---------------- GASTOS ---------------- */}
        <Tabs.Panel value="gastos" pt="md" mb={"4rem"}>
          <div className=" ml-4">
            <Group justify="" mb={"xs"} gap={"sm"}>
              <Group gap="xs">
                <Text size="sm" fw={700} c="white">
                  Gastos del despacho
                </Text>
                <IndicadorCarga seccion="gastos" cargando={seccionCargando} />
                <Badge color="pink" variant="light" size="sm" radius="md">
                  Total: S/ {formatNumber(detalle.total_gastos)}
                </Badge>
              </Group>
              <Button
                size="compact-xs"
                radius="md"
                variant="light"
                color="indigo"
                leftSection={<IconPlus size={12} />}
                onClick={onRegistrarGasto}
              >
                Registrar gasto
              </Button>
            </Group>

            {detalle.gastos.length === 0 ? (
              <Text size="xs" c="gray" ta="center" py="md">
                Todavia no hay gastos registrados. Aqui van los winches y los
                winchadores del despacho.
              </Text>
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 5 }} spacing="xs">
                {detalle.gastos.map((gasto) => (
                  <Paper
                    key={gasto.id_gasto_despacho}
                    p="xs"
                    radius="md"
                    className="bg-zinc-900/60 border border-zinc-800/70 min-w-0"
                  >
                    <Group justify="space-between" wrap="nowrap" gap="xs">
                      <Group gap="xs" wrap="nowrap" className="min-w-0">
                        <Badge
                          color={
                            gasto.tipo_gasto === "Winche" ? "orange" : "cyan"
                          }
                          variant="light"
                          size="sm"
                          radius="sm"
                        >
                          {gasto.tipo_gasto}
                        </Badge>

                        <Group gap={2} wrap="nowrap">
                          <Tooltip label="Editar gasto" withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="indigo"
                              size="md"
                              radius="md"
                              onClick={() => onEditarGasto(gasto)}
                            >
                              <IconPencil size={14} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Eliminar gasto" withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              size="md"
                              radius="md"
                              onClick={() =>
                                setAEliminar({
                                  titulo: "Eliminar gasto",
                                  descripcion: `Se eliminara el gasto de S/ ${formatNumber(gasto.monto)}.`,
                                  accion: () => onEliminarGasto(gasto),
                                })
                              }
                            >
                              <IconTrash size={14} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Group>
                      <Text
                        size="sm"
                        fw={700}
                        c="orange.3"
                        className="shrink-0"
                      >
                        S/ {formatNumber(gasto.monto)}
                      </Text>
                    </Group>

                    <Group
                      justify="space-between"
                      wrap="nowrap"
                      gap="xs"
                      mt={4}
                    >
                      <Text size="xs" c="zinc.200" truncate>
                        {gasto.descripcion ?? "Sin descripcion"}
                      </Text>
                      <Text size="11px" c="gray.5" truncate>
                        {gasto.created_at
                          ? dayjs(gasto.created_at).format("DD/MM/YYYY")
                          : "-"}
                      </Text>
                    </Group>
                  </Paper>
                ))}
              </SimpleGrid>
            )}
          </div>
        </Tabs.Panel>

        {/* ---------------- FLETE ---------------- */}
        <Tabs.Panel value="flete" pt="md" mb={"4rem"}>
          <Stack gap="md">
            <div className="ml-4">
              <Group
                justify="space-between"
                align="center"
                wrap="wrap"
                gap="sm"
              >
                <Group gap="xs" wrap="wrap" align="center" className="min-w-0">
                  <Text size="sm" fw={700} c="white">
                    Flete de la carga
                  </Text>

                  <IndicadorCarga seccion="flete" cargando={seccionCargando} />

                  {flete && (
                    <>
                      <Group gap={4} wrap="nowrap">
                        {flete ? (
                          <>
                            <Tooltip
                              label="Editar información del flete"
                              withArrow
                            >
                              <Button
                                variant="subtle"
                                color="indigo"
                                size="compact-xs"
                                onClick={() => onEditarFlete(flete)}
                                leftSection={<IconPencil size={12} />}
                              >
                                Editar
                              </Button>
                            </Tooltip>
                            {/* <Button
                        variant="subtle"
                        color="red"
                        size="compact-xs"
                        onClick={() => setFleteAEliminar(flete)}
                        leftSection={<IconTrash size={12} />}
                      >
                        Eliminar
                      </Button> */}
                          </>
                        ) : (
                          <Button
                            size="compact-xs"
                            radius="md"
                            variant="light"
                            color="indigo"
                            leftSection={<IconPlus size={12} />}
                            onClick={onRegistrarFlete}
                          >
                            Registrar flete
                          </Button>
                        )}

                        {/* {flete.id_comprobante_flete_despacho && (
                          <Badge
                            color="indigo"
                            variant="light"
                            size="sm"
                            radius="sm"
                          >
                            Facturado
                          </Badge>
                        )} */}
                      </Group>

                      <Divider orientation="vertical" />
                      <Text size="xs" c="gray">
                        Placa{" "}
                        <Text span size="xs" fw={700} c="blue">
                          {flete.placa ?? "-"}
                        </Text>
                      </Text>
                      <Divider orientation="vertical" />
                      <Text size="xs" c="gray">
                        Medidas{" "}
                        <Text span size="xs" fw={700} c="cyan">
                          {formatNumber(flete.largo)} x{" "}
                          {formatNumber(flete.ancho)} x{" "}
                          {formatNumber(flete.alto)} m
                        </Text>
                      </Text>
                      <Divider orientation="vertical" />
                      <Text size="xs" c="gray">
                        Transportista{" "}
                        <Text span size="xs" fw={700} c="lime.3">
                          {flete.transportista ?? "-"}
                        </Text>
                      </Text>
                      <Divider orientation="vertical" />
                      <Text size="xs" c="gray">
                        Licencia{" "}
                        <Text span size="xs" fw={700} c="orange.3">
                          {flete.licencia_conductor ?? "-"}
                        </Text>
                      </Text>
                      <Divider orientation="vertical" />
                      <Text size="xs" c="gray">
                        1ra Guia{" "}
                        <Text span size="xs" fw={700} c="pink">
                          {flete.guia_remitente ?? "-"}
                        </Text>
                      </Text>

                      <Divider orientation="vertical" />
                      <Text size="xs" c="gray">
                        2da Guia{" "}
                        <Text span size="xs" fw={700} c="cyan">
                          {flete.segunda_guia_remitente ?? "-"}
                        </Text>
                      </Text>

                      <Divider orientation="vertical" />
                      <Text size="xs" c="gray">
                        Peso 1ra guia{" "}
                        <Text span size="xs" fw={700} c="blue">
                          {formatNumber(flete.peso_guia)} t
                        </Text>
                      </Text>
                      <Divider orientation="vertical" />
                      <Text size="xs" c="gray">
                        Peso neto{" "}
                        <Text span size="xs" fw={700} c="pink">
                          {formatNumber(flete.peso_neto)} t
                        </Text>
                      </Text>

                      <Divider orientation="vertical" />
                      <Text size="xs" c="gray">
                        Ticket{" "}
                        <Text span size="xs" fw={700} c="orange.3">
                          {flete.codigo_ticket_balanza ?? "-"}
                        </Text>
                      </Text>
                      <Tooltip
                        label={
                          flete.codigo_ticket_balanza
                            ? "Editar ticket de balanza"
                            : "Registrar ticket de balanza"
                        }
                        withArrow
                      >
                        <ActionIcon
                          variant="light"
                          color="teal"
                          size="xs"
                          onClick={() => onRegistrarBalanza(flete)}
                        >
                          <PencilSquareIcon className="size-4" />
                        </ActionIcon>
                      </Tooltip>
                      <Divider orientation="vertical" />
                      <Text size="xs" c="gray">
                        F. Pesaje{" "}
                        <Text span size="xs" fw={700} c="lime.3">
                          {flete.fecha_hora_pesaje
                            ? dayjs(flete.fecha_hora_pesaje).format(
                                "DD/MM/YYYY HH:mm",
                              )
                            : "-"}
                        </Text>
                      </Text>
                    </>
                  )}
                </Group>
              </Group>

              {detalle.fletes.length === 0 && (
                <Text size="xs" c="gray" ta="center" py="md">
                  Todavia no hay flete. El mineral del despacho se lleva en una
                  sola unidad: registra el vehiculo, su guia y el ticket de
                  balanza.
                </Text>
              )}

              {/* El comprobante de flete vive DENTRO de la tarjeta del
                  flete: el comprobante no es ajeno a la carga. */}
              <Divider my="sm" className="border-zinc-800" />

              {detalle.comprobantes_flete.length === 0 ? (
                <Group justify="space-between" align="center" gap="sm">
                  <Text size="xs" c="gray">
                    Sin comprobante de flete. Se factura la carga del despacho
                    al precio por tonelada.
                  </Text>
                  <Button
                    size="compact-xs"
                    radius="md"
                    variant="light"
                    color="indigo"
                    leftSection={<IconPlus size={12} />}
                    onClick={() => onRegistrarComprobante("flete")}
                  >
                    Registrar comprobante
                  </Button>
                </Group>
              ) : (
                <Stack gap="sm">
                  {detalle.comprobantes_flete.map((comprobante, indice) => (
                    <div key={comprobante.id_comprobante}>
                      {indice > 0 && (
                        <Divider my="sm" className="border-zinc-800" />
                      )}
                      <ComprobanteCard
                        embebido
                        comprobante={comprobante}
                        etiqueta={`${formatNumber(comprobante.toneladas_cobradas ?? 0)}t facturadas`}
                        onEditar={() =>
                          onEditarComprobante("flete", comprobante)
                        }
                        onRegistrarPago={() =>
                          onRegistrarPago("flete", comprobante)
                        }
                        onEliminar={() =>
                          setAEliminar({
                            titulo: "Eliminar comprobante de flete",
                            descripcion:
                              "Se eliminara el comprobante y sus pagos. El flete quedara libre para facturar de nuevo.",
                            accion: () =>
                              onEliminarComprobante("flete", comprobante),
                          })
                        }
                      />
                    </div>
                  ))}
                </Stack>
              )}
            </div>
          </Stack>
        </Tabs.Panel>

        {/* ---------------- MOLIENDA ---------------- */}
        <Tabs.Panel value="molienda" pt="md" mb={"4rem"}>
          <div className="ml-4">
            <Group justify="" mb="xs">
              <Group gap="xs" align="center">
                <Text size="sm" fw={700} c="white">
                  Comprobante de molienda
                </Text>
                <IndicadorCarga seccion="molienda" cargando={seccionCargando} />
              </Group>
              {detalle.comprobantes_molienda.length === 0 && (
                <Button
                  size="compact-xs"
                  radius="md"
                  variant="light"
                  color="indigo"
                  leftSection={<IconPlus size={12} />}
                  onClick={() => onRegistrarComprobante("molienda")}
                >
                  Registrar comprobante
                </Button>
              )}
            </Group>

            {detalle.comprobantes_molienda.length === 0 ? (
              <Paper
                p="md"
                radius="lg"
                className="bg-zinc-900/40 border border-zinc-800"
              >
                <Text size="xs" c="gray" ta="center" py="md">
                  Sin comprobante de molienda. Es la factura del molino de
                  destino por este despacho.
                </Text>
              </Paper>
            ) : (
              <Stack gap="sm">
                {detalle.comprobantes_molienda.map((comprobante) => (
                  <ComprobanteCard
                    key={comprobante.id_comprobante}
                    comprobante={comprobante}
                    etiqueta={`Molienda · ${detalle.molino ?? "sin molino"}`}
                    onEditar={() =>
                      onEditarComprobante("molienda", comprobante)
                    }
                    onRegistrarPago={() =>
                      onRegistrarPago("molienda", comprobante)
                    }
                    onEliminar={() =>
                      setAEliminar({
                        titulo: "Eliminar comprobante de molienda",
                        descripcion: "Se eliminara el comprobante y sus pagos.",
                        accion: () =>
                          onEliminarComprobante("molienda", comprobante),
                      })
                    }
                  />
                ))}
              </Stack>
            )}
          </div>
        </Tabs.Panel>

        {/* ---------------- ANALISIS ---------------- */}
        <Tabs.Panel value="analisis" pt="md" mb={"4rem"}>
          <Stack gap="md">
            <Paper
              p="md"
              radius="lg"
              className="bg-zinc-900/40 border border-zinc-800"
            >
              <Group justify="" mb="sm" gap={"sm"}>
                <Group gap="xs" align="center">
                  <Text size="sm" fw={700} c="white">
                    Analisis de laboratorio
                  </Text>
                  <IndicadorCarga
                    seccion="analisis"
                    cargando={seccionCargando}
                  />
                </Group>
                <Button
                  size="compact-xs"
                  radius="md"
                  variant="light"
                  color="indigo"
                  leftSection={<IconPlus size={12} />}
                  onClick={onRegistrarAnalisis}
                >
                  Registrar analisis
                </Button>
              </Group>

              {detalle.analisis.length === 0 ? (
                <Text size="xs" c="gray" ta="center" py="md">
                  Sin analisis de laboratorio. Registra el laboratorio, las
                  leyes y el costo del servicio.
                </Text>
              ) : (
                <Stack gap="md">
                  {/* GRUPO 1: analisis de la empresa sin facturar */}
                  <div>
                    <Group justify="" mb="xs">
                      <Group gap="xs">
                        <Text size="xs" fw={700} c="indigo.3">
                          De la empresa · sin facturar
                        </Text>
                        <Badge
                          color="indigo"
                          variant="light"
                          size="xs"
                          radius="sm"
                        >
                          {analisisSinFacturar.length}
                        </Badge>
                      </Group>
                      {analisisSinFacturar.length > 0 && (
                        <Button
                          size="compact-xs"
                          radius="md"
                          variant="light"
                          color="teal"
                          leftSection={<IconReceipt size={12} />}
                          onClick={() =>
                            onRegistrarComprobante(
                              "analisis",
                              analisisSinFacturar,
                            )
                          }
                        >
                          Facturar analisis
                        </Button>
                      )}
                    </Group>

                    {analisisSinFacturar.length === 0 ? (
                      <Text size="xs" c="dimmed">
                        No hay analisis de la empresa pendientes de facturar.
                      </Text>
                    ) : (
                      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="xs">
                        {analisisSinFacturar.map((analisis) => (
                          <TarjetaAnalisis
                            key={analisis.id_analisis_laboratorio}
                            analisis={analisis}
                            onEditar={() => onEditarAnalisis(analisis)}
                            onEliminar={() =>
                              setAEliminar({
                                titulo: "Eliminar analisis",
                                descripcion:
                                  "Se eliminara el analisis del despacho.",
                                accion: () => onEliminarAnalisis(analisis),
                              })
                            }
                          />
                        ))}
                      </SimpleGrid>
                    )}
                  </div>

                  {/* GRUPO 2: analisis de la empresa ya facturados */}
                  {analisisFacturados.length > 0 && (
                    <div>
                      <Group gap="xs" mb="xs">
                        <Text size="xs" fw={700} c="teal.3">
                          De la empresa · facturados
                        </Text>
                        <Badge
                          color="teal"
                          variant="light"
                          size="xs"
                          radius="sm"
                        >
                          {analisisFacturados.length}
                        </Badge>
                      </Group>

                      <SimpleGrid cols={{ base: 2, md: 2 }} spacing="xs">
                        {analisisPorComprobante.map(
                          ([idComprobante, lista]) => {
                            const comprobante =
                              comprobanteDeAnalisis(idComprobante);

                            const abierto =
                              comprobantesAbiertos.includes(idComprobante);

                            return (
                              <TarjetaFacturaAnalisis
                                key={idComprobante}
                                comprobante={comprobante ?? null}
                                analisis={lista}
                                facturaAbierta={abierto}
                                onToggleFactura={() =>
                                  alternarComprobante(idComprobante)
                                }
                                onEditarAnalisis={onEditarAnalisis}
                                onEliminarAnalisis={(analisis) =>
                                  setAEliminar({
                                    titulo: "Eliminar analisis",
                                    descripcion:
                                      "Se eliminara el analisis del despacho.",
                                    accion: () => onEliminarAnalisis(analisis),
                                  })
                                }
                                onEditarComprobante={(comp) =>
                                  onEditarComprobante("analisis", comp)
                                }
                                onRegistrarPago={(comp) =>
                                  onRegistrarPago("analisis", comp)
                                }
                                onEliminarComprobante={(comp) =>
                                  setAEliminar({
                                    titulo: "Eliminar comprobante de analisis",
                                    descripcion:
                                      "Se eliminara el comprobante y sus pagos. Los analisis quedaran libres para facturar de nuevo.",
                                    accion: () =>
                                      onEliminarComprobante("analisis", comp),
                                  })
                                }
                              />
                            );
                          },
                        )}
                      </SimpleGrid>
                    </div>
                  )}

                  {/* GRUPO 3: analisis asumidos por el cliente */}
                  {analisisCliente.length > 0 && (
                    <div>
                      <Group gap="xs" mb="xs">
                        <Text size="xs" fw={700} c="grape.3">
                          Asumidos por el cliente
                        </Text>
                        <Badge
                          color="grape"
                          variant="light"
                          size="xs"
                          radius="sm"
                        >
                          {analisisCliente.length}
                        </Badge>
                      </Group>

                      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="xs">
                        {analisisCliente.map((analisis) => (
                          <TarjetaAnalisis
                            key={analisis.id_analisis_laboratorio}
                            analisis={analisis}
                            onEditar={() => onEditarAnalisis(analisis)}
                            onEliminar={() =>
                              setAEliminar({
                                titulo: "Eliminar analisis",
                                descripcion:
                                  "Se eliminara el analisis del despacho.",
                                accion: () => onEliminarAnalisis(analisis),
                              })
                            }
                          />
                        ))}
                      </SimpleGrid>
                    </div>
                  )}
                </Stack>
              )}
            </Paper>
          </Stack>
        </Tabs.Panel>

        {/* ---------------- LIQUIDACIONES ---------------- */}
        <Tabs.Panel value="liquidacion" pt="md" mb={"4rem"}>
          <Stack gap="md">
            <div className="ml-4">
              <Group justify="" mb="sm" gap={"sm"}>
                <Group gap="xs" align="center">
                  <Text size="sm" fw={700} c="white">
                    Liquidaciones de mineral
                  </Text>
                  <IndicadorCarga
                    seccion="liquidacion"
                    cargando={seccionCargando}
                  />
                </Group>
                <Group gap="xs">
                  <Button
                    size="compact-xs"
                    radius="md"
                    variant="light"
                    color="indigo"
                    leftSection={<IconPlus size={12} />}
                    onClick={onRegistrarLiquidacion}
                  >
                    Registrar liquidacion
                  </Button>
                  {detalle.liquidaciones.length > 0 &&
                    detalle.comprobantes_liquidacion.length <
                      detalle.liquidaciones.length && (
                      <Button
                        size="compact-xs"
                        radius="md"
                        variant="light"
                        color="teal"
                        leftSection={<IconReceipt size={12} />}
                        onClick={() => onRegistrarComprobante("liquidacion")}
                      >
                        Facturar liquidacion
                      </Button>
                    )}
                </Group>
              </Group>

              {detalle.liquidaciones.length === 0 ? (
                <Text size="xs" c="gray" ta="center" py="md">
                  Sin liquidaciones. Se registran por elemento quimico (oro,
                  plata, cobre, zinc, arsenico, hierro o plomo) con las leyes
                  acordadas con el cliente.
                </Text>
              ) : (
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xs" className="mr-4">
                  {detalle.liquidaciones.map((liquidacion) => {
                    const comprobante = detalle.comprobantes_liquidacion.find(
                      (c) =>
                        c.id_liquidacion_mineral ===
                        liquidacion.id_liquidacion_mineral,
                    );
                    const abierta =
                      facturaDesplegada === liquidacion.id_liquidacion_mineral;

                    return (
                      <TarjetaLiquidacion
                        key={liquidacion.id_liquidacion_mineral}
                        liquidacion={liquidacion}
                        onEditar={() => onEditarLiquidacion(liquidacion)}
                        onEliminar={() =>
                          setAEliminar({
                            titulo: "Eliminar liquidacion",
                            descripcion:
                              "Se eliminara la liquidacion y su comprobante (si no tiene pagos).",
                            accion: () => onEliminarLiquidacion(liquidacion),
                          })
                        }
                        onToggleFactura={
                          comprobante
                            ? () =>
                                setFacturaDesplegada(
                                  abierta
                                    ? null
                                    : liquidacion.id_liquidacion_mineral,
                                )
                            : undefined
                        }
                        facturaAbierta={abierta}
                        factura={
                          comprobante ? (
                            <ComprobanteCard
                              comprobante={comprobante}
                              etiqueta={
                                comprobante.codigo_liquidacion ?? "Liquidacion"
                              }
                              onEditar={() =>
                                onEditarComprobante("liquidacion", comprobante)
                              }
                              onRegistrarPago={() =>
                                onRegistrarPago("liquidacion", comprobante)
                              }
                              onEliminar={() =>
                                setAEliminar({
                                  titulo: "Eliminar comprobante de liquidacion",
                                  descripcion:
                                    "Se eliminara el comprobante y sus pagos.",
                                  accion: () =>
                                    onEliminarComprobante(
                                      "liquidacion",
                                      comprobante,
                                    ),
                                })
                              }
                            />
                          ) : null
                        }
                      />
                    );
                  })}
                </SimpleGrid>
              )}
            </div>
          </Stack>
        </Tabs.Panel>
      </Tabs>

      <ConfirmarEliminar
        opened={aEliminar !== null}
        close={() => setAEliminar(null)}
        titulo={aEliminar?.titulo ?? ""}
        descripcion={aEliminar?.descripcion ?? ""}
        onConfirmar={async () => {
          await aEliminar?.accion();
          setAEliminar(null);
        }}
      />

      {/* Eliminacion del flete */}
      <ModalEstandar
        opened={fleteAEliminar !== null}
        close={() => setFleteAEliminar(null)}
        title="Eliminar flete"
        size="md"
      >
        <Stack gap="md">
          <Alert
            color="red"
            variant="light"
            title="Atencion"
            radius="md"
            icon={<IconTrash size={18} />}
          >
            Se eliminara el flete
            {fleteAEliminar?.placa ? ` ${fleteAEliminar.placa}` : ""} y su
            ticket de balanza. Esta accion no se puede deshacer.
          </Alert>

          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              radius="lg"
              size="xs"
              disabled={eliminandoFlete}
              onClick={() => setFleteAEliminar(null)}
            >
              Cancelar
            </Button>
            <Button
              color="red"
              radius="lg"
              size="xs"
              loading={eliminandoFlete}
              leftSection={<IconTrash size={14} />}
              onClick={async () => {
                if (!fleteAEliminar) return;
                setEliminandoFlete(true);
                try {
                  await onEliminarFlete(fleteAEliminar);
                  setFleteAEliminar(null);
                } finally {
                  setEliminandoFlete(false);
                }
              }}
            >
              Si, eliminar
            </Button>
          </Group>
        </Stack>
      </ModalEstandar>
    </Stack>
  );
};
