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
  IconArrowLeft,
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
import { EstadoLiquidacionMineral } from "../../../../shared/enums/venta-mineral/estado-liquidacion-mineral";
import type { TipoComprobanteDespacho } from "../../service/venta-mineral.requests";
import type {
  AnalisisLaboratorioItem,
  ComprobanteDespachoItem,
  DespachoMineralDetalle,
  FleteDespachoItem,
  GastoDespachoItem,
  LiquidacionMineralItem,
} from "../../service/venta-mineral.responses";
import { ComprobanteCard } from "./comprobante-card";
import { ConfirmarEliminar } from "./confirmar-eliminar";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";

interface Props {
  detalle: DespachoMineralDetalle;
  /** El detalle se esta recargando (spinner). */
  loading?: boolean;
  onVolver?: () => void;
  onRegistrarGasto: () => void;
  onEditarGasto: (gasto: GastoDespachoItem) => void;
  onEliminarGasto: (gasto: GastoDespachoItem) => void;
  onRegistrarFlete: () => void;
  onEditarFlete: (flete: FleteDespachoItem) => void;
  onRegistrarBalanza: (flete: FleteDespachoItem) => void;
  onEliminarFlete: (flete: FleteDespachoItem) => void;
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
  ) => void;
  onRegistrarPago: (
    tipo: TipoComprobanteDespacho,
    comprobante: ComprobanteDespachoItem,
  ) => void;
  onRegistrarAnalisis: () => void;
  onEditarAnalisis: (analisis: AnalisisLaboratorioItem) => void;
  onEliminarAnalisis: (analisis: AnalisisLaboratorioItem) => void;
  onRegistrarLiquidacion: () => void;
  onEditarLiquidacion: (liquidacion: LiquidacionMineralItem) => void;
  onEliminarLiquidacion: (liquidacion: LiquidacionMineralItem) => void;
}

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
 * Tarjeta de un analisis dentro del listado del despacho.
 */
const TarjetaAnalisis = ({
  analisis,
  comprobante,
  onEditar,
  onEliminar,
  onVerFactura,
  facturaAbierta,
}: {
  analisis: AnalisisLaboratorioItem;
  /** Comprobante que lo cubre (si ya esta facturado). */
  comprobante?: ComprobanteDespachoItem | null;
  onEditar: () => void;
  onEliminar: () => void;
  /** Abre la factura del comprobante que lo cubre (solo si ya esta facturado). */
  onVerFactura?: () => void;
  facturaAbierta?: boolean;
}) => (
  <Paper
    p="sm"
    radius="md"
    className="bg-zinc-900/60 border border-zinc-800/70"
  >
    <Group justify="space-between" wrap="nowrap" align="flex-start">
      <div className="min-w-0">
        {/* Codigo, badges y datos del laboratorio en la misma linea */}
        <Group gap="xs" align="center" wrap="wrap">
          <Text size="sm" fw={700} c="zinc.100" className="font-mono">
            {analisis.codigo_cliente ?? "Sin codigo"}
          </Text>
          <Badge
            color={analisis.asumido_por === "Propio" ? "indigo" : "gray"}
            variant="light"
            size="xs"
            radius="sm"
          >
            {analisis.asumido_por === "Propio"
              ? "Asume la empresa"
              : "Asume el cliente"}
          </Badge>
          {analisis.id_comprobante_analisis_despacho && (
            <Badge color="teal" variant="light" size="xs" radius="sm">
              Facturado
            </Badge>
          )}
          {comprobante?.codigo_comprobante && (
            <Badge color="pink" variant="light" size="xs" radius="sm">
              {comprobante.codigo_comprobante}
            </Badge>
          )}
          <Text size="xs" c="zinc.600">
            |
          </Text>
          <Text size="xs" c="zinc.300" truncate>
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
        </Group>

        {/* Leyes: una sigla por cuadradito, con su color */}
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
      </div>

      <Group gap={4} wrap="nowrap">
        <Text size="sm" fw={700} c="orange.3">
          S/ {formatNumber(analisis.costo_servicio)}
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
        {onVerFactura && (
          <Tooltip
            label={facturaAbierta ? "Ocultar factura" : "Ver factura"}
            withArrow
          >
            <ActionIcon
              variant="subtle"
              color="teal"
              size="md"
              radius="md"
              onClick={onVerFactura}
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
  </Paper>
);

/**
 * Detalle de un despacho de mineral.
 *
 * El despacho se separa en cinco pestanas: cada una muestra la informacion
 * de esa parte del proceso y sus acciones. Todos los documentos cuelgan del
 * despacho y se editan en el sitio.
 */
export const DespachoDetalle = ({
  detalle,
  loading,
  onVolver,
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
    accion: () => void;
  } | null>(null);

  /** Flete pendiente de confirmacion de elimination. */
  const [fleteAEliminar, setFleteAEliminar] = useState<FleteDespachoItem | null>(
    null,
  );

  /** Comprobantes de analisis cuya factura esta desplegada. */
  const [comprobantesAbiertos, setComprobantesAbiertos] = useState<number[]>([]);

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
    () =>
      analisisEmpresa.filter((a) => !a.id_comprobante_analisis_despacho),
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

  const totalGastado =
    (detalle.total_gastos ?? 0) +
    (detalle.total_facturado_molienda ?? 0) +
    (detalle.total_facturado_analisis ?? 0);

  const totalFacturado =
    (detalle.total_facturado ?? 0) +
    (detalle.total_facturado_molienda ?? 0) +
    (detalle.total_facturado_analisis ?? 0) +
    (detalle.total_facturado_liquidacion ?? 0);

  const totalPagado =
    (detalle.total_pagado ?? 0) +
    (detalle.total_pagado_molienda ?? 0) +
    (detalle.total_pagado_analisis ?? 0) +
    (detalle.total_pagado_liquidacion ?? 0);

  /**
   * Parte en dolares de los importes: solo el comprobante de flete puede
   * estar en dolares. Los agregados de arriba estan siempre en soles.
   */
  const totalFacturadoDolares = detalle.total_facturado_dolares ?? 0;
  const totalPagadoDolares = detalle.total_pagado_dolares ?? 0;

  return (
    <Stack gap="md" className="animate-fade-in">
      {/* Cabecera del despacho: compacta, sin columnas gigantes */}
      <Paper
        p="xs"
        radius="lg"
        className="bg-zinc-900/60 border border-zinc-800"
      >
        <Group justify="space-between" align="center" wrap="nowrap" gap="sm">
          <Group gap="sm" wrap="wrap" className="min-w-0">
            {onVolver && (
              <Button
                variant="subtle"
                color="gray"
                size="compact-sm"
                onClick={onVolver}
                leftSection={<IconArrowLeft size={16} />}
              >
                Volver
              </Button>
            )}

            {/* Indicadores en una sola fila, con el mismo criterio y la
                misma paleta que la liquidacion de venta de carbon: etiqueta
                en gris, valor con color y divisores verticales. */}
            <Group gap="xs" wrap="wrap" align="center" className="min-w-0">
              <Text size="xs" c="gray">
                Sacos{" "}
                <Text span size="xs" fw={700} c="blue">
                  {formatNumber(detalle.cantidad_sacos)}
                </Text>
              </Text>
              <Divider orientation="vertical" />
              <Text size="xs" c="gray">
                Peso{" "}
                <Text span size="xs" fw={700} c="pink">
                  {formatNumber(detalle.peso_neto_total)} t
                </Text>
              </Text>
              <Divider orientation="vertical" />
              <Text size="xs" c="gray">
                Gastos{" "}
                <Text span size="xs" fw={700} c="orange.3">
                  S/ {formatNumber(totalGastado)}
                </Text>
              </Text>
              <Divider orientation="vertical" />
              <Text size="xs" c="gray">
                Facturado{" "}
                <Text span size="xs" fw={700} c="cyan">
                  S/ {formatNumber(totalFacturado)}
                  {totalFacturadoDolares > 0 && (
                    <Text span size="xs" fw={700} c="teal.3">
                      {" "}
                      · $ {formatNumber(totalFacturadoDolares)}
                    </Text>
                  )}
                </Text>
              </Text>
              <Divider orientation="vertical" />
              <Text size="xs" c="gray">
                Pagado{" "}
                <Text span size="xs" fw={700} c="lime.3">
                  S/ {formatNumber(totalPagado)}
                  {totalFacturadoDolares > 0 && (
                    <Text span size="xs" fw={700} c="teal.3">
                      {" "}
                      · $ {formatNumber(totalPagadoDolares)}
                    </Text>
                  )}
                </Text>
              </Text>
              <Divider orientation="vertical" />
              <Text size="xs" c="gray">
                Contratista{" "}
                <Text span size="xs" fw={700} c="zinc.200">
                  {detalle.contratista ?? "-"}
                </Text>
              </Text>
            </Group>
          </Group>

          <Group gap={4} wrap="nowrap">
            {loading && <Loader size="xs" color="indigo" />}
          </Group>
        </Group>

        {detalle.observaciones && (
          <Text size="xs" c="gray" mt="sm">
            {detalle.observaciones}
          </Text>
        )}
      </Paper>

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
        <Tabs.Panel value="gastos" pt="md">
          <Paper
            p="md"
            radius="lg"
            className="bg-zinc-900/40 border border-zinc-800"
          >
            <Group justify="space-between" mb="sm">
              <Group gap="xs">
                <Text size="sm" fw={700} c="white">
                  Gastos del despacho
                </Text>
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
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
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
                          size="xs"
                          radius="sm"
                        >
                          {gasto.tipo_gasto}
                        </Badge>
                        <Text size="xs" c="zinc.200" truncate>
                          {gasto.descripcion ?? "Sin descripcion"}
                        </Text>
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
                      <Text size="11px" c="gray" truncate>
                        {gasto.empleado_registro ?? "Sin registro"} ·{" "}
                        {gasto.created_at
                          ? dayjs(gasto.created_at).format("DD/MM/YYYY")
                          : "-"}
                      </Text>
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
                  </Paper>
                ))}
              </SimpleGrid>
            )}
          </Paper>
        </Tabs.Panel>

        {/* ---------------- FLETE ---------------- */}
        <Tabs.Panel value="flete" pt="md">
          <Stack gap="md">
            <Paper
              p="md"
              radius="lg"
              className="bg-zinc-900/40 border border-zinc-800"
            >
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

                  {flete && (
                    <>
                      {flete.id_comprobante_flete_despacho && (
                        <Badge
                          color="indigo"
                          variant="light"
                          size="xs"
                          radius="sm"
                        >
                          Facturado
                        </Badge>
                      )}

                      <Divider orientation="vertical" />
                      <Text size="xs" c="gray">
                        Placa{" "}
                        <Text span size="xs" fw={700} c="blue">
                          {flete.placa ?? "-"}
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
                        Licencia{" "}
                        <Text span size="xs" fw={700} c="orange.3">
                          {flete.licencia_conductor ?? "-"}
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
                        Peso guia{" "}
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
                        Medidas{" "}
                        <Text span size="xs" fw={700} c="cyan">
                          {formatNumber(flete.largo)} x{" "}
                          {formatNumber(flete.ancho)} x{" "}
                          {formatNumber(flete.alto)} m
                        </Text>
                      </Text>
                      <Divider orientation="vertical" />
                      <Text size="xs" c="gray">
                        Balanza{" "}
                        <Text span size="xs" fw={700} c="orange.3">
                          {flete.codigo_ticket_balanza ?? "-"}
                        </Text>
                      </Text>
                      <Divider orientation="vertical" />
                      <Text size="xs" c="gray">
                        Pesaje{" "}
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

                <Group gap={4} wrap="nowrap">
                  {flete ? (
                    <>
                      <Button
                        variant="light"
                        color="teal"
                        size="compact-xs"
                        onClick={() => onRegistrarBalanza(flete)}
                        leftSection={<IconScale size={12} />}
                      >
                        {flete.codigo_ticket_balanza
                          ? "Editar ticket de balanza"
                          : "Registrar ticket de balanza"}
                      </Button>
                      <Button
                        variant="subtle"
                        color="indigo"
                        size="compact-xs"
                        onClick={() => onEditarFlete(flete)}
                        leftSection={<IconPencil size={12} />}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="subtle"
                        color="red"
                        size="compact-xs"
                        onClick={() => setFleteAEliminar(flete)}
                        leftSection={<IconTrash size={12} />}
                      >
                        Eliminar
                      </Button>
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
                        etiqueta={`${formatNumber(comprobante.toneladas_cobradas ?? 0)} t facturadas`}
                        onEditar={() => onEditarComprobante("flete", comprobante)}
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
            </Paper>
          </Stack>
        </Tabs.Panel>

        {/* ---------------- MOLIENDA ---------------- */}
        <Tabs.Panel value="molienda" pt="md">
          <Group justify="space-between" mb="sm">
            <Text size="sm" fw={700} c="white">
              Comprobante de molienda
            </Text>
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
                Sin comprobante de molienda. Es la factura del molino de destino
                por este despacho.
              </Text>
            </Paper>
          ) : (
            <Stack gap="sm">
              {detalle.comprobantes_molienda.map((comprobante) => (
                <ComprobanteCard
                  key={comprobante.id_comprobante}
                  comprobante={comprobante}
                  etiqueta={`Molienda · ${detalle.molino ?? "sin molino"}`}
                  onEditar={() => onEditarComprobante("molienda", comprobante)}
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
        </Tabs.Panel>

        {/* ---------------- ANALISIS ---------------- */}
        <Tabs.Panel value="analisis" pt="md">
          <Stack gap="md">
            <Paper
              p="md"
              radius="lg"
              className="bg-zinc-900/40 border border-zinc-800"
            >
              <Group justify="space-between" mb="sm">
                <Text size="sm" fw={700} c="white">
                  Analisis de laboratorio
                </Text>
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
                  <Paper
                    p="sm"
                    radius="md"
                    className="bg-zinc-950/40 border border-zinc-800"
                  >
                    <Group justify="space-between" mb="xs">
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
                            onRegistrarComprobante("analisis", analisisSinFacturar)
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
                      <Stack gap="xs">
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
                      </Stack>
                    )}
                  </Paper>

                  {/* GRUPO 2: analisis de la empresa ya facturados */}
                  {analisisFacturados.length > 0 && (
                    <Paper
                      p="sm"
                      radius="md"
                      className="bg-zinc-950/40 border border-zinc-800"
                    >
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

                      <Stack gap="xs">
                        {analisisPorComprobante.map(
                          ([idComprobante, lista]) => {
                            const comprobante = comprobanteDeAnalisis(
                              idComprobante,
                            );
                            const abierto =
                              comprobantesAbiertos.includes(idComprobante);

                            return (
                              <div key={idComprobante}>
                                <Stack gap="xs">
                                  {lista.map((analisis) => (
                                    <TarjetaAnalisis
                                      key={
                                        analisis.id_analisis_laboratorio
                                      }
                                      analisis={analisis}
                                      comprobante={comprobante}
                                      onEditar={() =>
                                        onEditarAnalisis(analisis)
                                      }
                                      onEliminar={() =>
                                        setAEliminar({
                                          titulo: "Eliminar analisis",
                                          descripcion:
                                            "Se eliminara el analisis del despacho.",
                                          accion: () =>
                                            onEliminarAnalisis(analisis),
                                        })
                                      }
                                      onVerFactura={() =>
                                        alternarComprobante(idComprobante)
                                      }
                                      facturaAbierta={abierto}
                                    />
                                  ))}
                                </Stack>

                                {/* La factura del comprobante se despliega
                                    desde el analisis que la cubre. */}
                                {abierto && comprobante && (
                                  <div className="mt-2">
                                    <ComprobanteCard
                                      comprobante={comprobante}
                                      etiqueta={`${comprobante.analisis?.length ?? lista.length} analisis`}
                                      onEditar={() =>
                                        onEditarComprobante(
                                          "analisis",
                                          comprobante,
                                        )
                                      }
                                      onRegistrarPago={() =>
                                        onRegistrarPago(
                                          "analisis",
                                          comprobante,
                                        )
                                      }
                                      onEliminar={() =>
                                        setAEliminar({
                                          titulo:
                                            "Eliminar comprobante de analisis",
                                          descripcion:
                                            "Se eliminara el comprobante y sus pagos. Los analisis quedaran libres para facturar de nuevo.",
                                          accion: () =>
                                            onEliminarComprobante(
                                              "analisis",
                                              comprobante,
                                            ),
                                        })
                                      }
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          },
                        )}
                      </Stack>
                    </Paper>
                  )}

                  {/* GRUPO 3: analisis asumidos por el cliente */}
                  {analisisCliente.length > 0 && (
                    <Paper
                      p="sm"
                      radius="md"
                      className="bg-zinc-950/40 border border-zinc-800"
                    >
                      <Group gap="xs" mb="xs">
                        <Text size="xs" fw={700} c="zinc.300">
                          Asumidos por el cliente
                        </Text>
                        <Badge
                          color="gray"
                          variant="light"
                          size="xs"
                          radius="sm"
                        >
                          {analisisCliente.length}
                        </Badge>
                      </Group>

                      <Stack gap="xs">
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
                      </Stack>
                    </Paper>
                  )}
                </Stack>
              )}
            </Paper>
          </Stack>
        </Tabs.Panel>

        {/* ---------------- LIQUIDACIONES ---------------- */}
        <Tabs.Panel value="liquidacion" pt="md">
          <Stack gap="md">
            <Paper
              p="md"
              radius="lg"
              className="bg-zinc-900/40 border border-zinc-800"
            >
              <Group justify="space-between" mb="sm">
                <Text size="sm" fw={700} c="white">
                  Liquidaciones de mineral
                </Text>
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
                  Sin liquidaciones. Se registran por elemento quimico (oro o
                  plata) con las leyes acordadas con el cliente.
                </Text>
              ) : (
                <Stack gap="xs">
                  {detalle.liquidaciones.map((liquidacion) => (
                    <Paper
                      key={liquidacion.id_liquidacion_mineral}
                      p="sm"
                      radius="md"
                      className="bg-zinc-900/60 border border-zinc-800/70"
                    >
                      <Group justify="space-between" wrap="nowrap">
                        <div className="min-w-0">
                          <Group gap="xs">
                            <Text
                              size="sm"
                              fw={700}
                              c="zinc.100"
                              className="font-mono"
                            >
                              {liquidacion.codigo_liquidacion ?? "Sin codigo"}
                            </Text>
                            <Badge
                              color={
                                liquidacion.elemento_quimico === "Oro"
                                  ? "yellow"
                                  : "gray"
                              }
                              variant="light"
                              size="xs"
                              radius="sm"
                            >
                              {liquidacion.elemento_quimico}
                            </Badge>
                            <Badge
                              color={
                                liquidacion.estado ===
                                EstadoLiquidacionMineral.Pagada
                                  ? "green"
                                  : liquidacion.estado ===
                                      EstadoLiquidacionMineral.Aprobada
                                    ? "indigo"
                                    : "gray"
                              }
                              variant="light"
                              size="xs"
                              radius="sm"
                            >
                              {liquidacion.estado}
                            </Badge>
                          </Group>
                          <Text size="xs" c="gray" mt={2}>
                            {liquidacion.cliente ?? "Sin cliente"} ·{" "}
                            {liquidacion.fecha_liquidacion
                              ? dayjs(liquidacion.fecha_liquidacion).format(
                                  "DD/MM/YYYY",
                                )
                              : "sin fecha"}
                          </Text>
                          <Text size="xs" c="gray">
                            TMS {formatNumber(liquidacion.peso_seco)} t · Neto{" "}
                            {formatNumber(liquidacion.peso_neto)} t · Ley{" "}
                            {formatNumber(liquidacion.ley_elemento)} · S/{" "}
                            {formatNumber(liquidacion.valor_por_tonelada)}/t
                          </Text>
                        </div>
                        <Group gap={4} wrap="nowrap">
                          <Text size="sm" fw={700} c="lime.3">
                            S/ {formatNumber(liquidacion.neto)}
                          </Text>
                          <Button
                            variant="subtle"
                            color="indigo"
                            size="compact-xs"
                            onClick={() => onEditarLiquidacion(liquidacion)}
                            leftSection={<IconPencil size={12} />}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="subtle"
                            color="red"
                            size="compact-xs"
                            onClick={() =>
                              setAEliminar({
                                titulo: "Eliminar liquidacion",
                                descripcion:
                                  "Se eliminara la liquidacion y su comprobante (si no tiene pagos).",
                                accion: () =>
                                  onEliminarLiquidacion(liquidacion),
                              })
                            }
                            leftSection={<IconTrash size={12} />}
                          >
                            Eliminar
                          </Button>
                        </Group>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Paper>

            {detalle.comprobantes_liquidacion.map((comprobante) => (
              <ComprobanteCard
                key={comprobante.id_comprobante}
                comprobante={comprobante}
                etiqueta={comprobante.codigo_liquidacion ?? "Liquidacion"}
                onEditar={() => onEditarComprobante("liquidacion", comprobante)}
                onRegistrarPago={() =>
                  onRegistrarPago("liquidacion", comprobante)
                }
                onEliminar={() =>
                  setAEliminar({
                    titulo: "Eliminar comprobante de liquidacion",
                    descripcion: "Se eliminara el comprobante y sus pagos.",
                    accion: () =>
                      onEliminarComprobante("liquidacion", comprobante),
                  })
                }
              />
            ))}
          </Stack>
        </Tabs.Panel>
      </Tabs>

      <ConfirmarEliminar
        opened={aEliminar !== null}
        close={() => setAEliminar(null)}
        titulo={aEliminar?.titulo ?? ""}
        descripcion={aEliminar?.descripcion ?? ""}
        onConfirmar={() => {
          aEliminar?.accion();
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
              onClick={() => setFleteAEliminar(null)}
            >
              Cancelar
            </Button>
            <Button
              color="red"
              radius="lg"
              size="xs"
              leftSection={<IconTrash size={14} />}
              onClick={() => {
                if (!fleteAEliminar) return;
                onEliminarFlete(fleteAEliminar);
                setFleteAEliminar(null);
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
