import { useMemo } from "react";
import {
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  Tabs,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  ScaleIcon,
  TruckIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

import { formatNumber } from "../../../../shared/functions/formatNumber";
import { EstadoCargaVentaCarbon } from "../../../../shared/enums/venta-carbon/estado-carga-venta-carbon";
import { TablaCargasVenta } from "./tabla-cargas-venta";
import { VentaCarbonLiquidacionPanel } from "./venta-carbon-liquidacion-panel";
import type {
  CargaVentaCarbonItem,
  ComprobanteVentaCarbonItem,
  LiquidacionVentaCarbonItem,
  VentaCarbonResumen,
} from "../../service/venta-carbon.responses";

interface Props {
  /** Venta con el arbol completo (cargas + liquidaciones). */
  detalle: VentaCarbonResumen | null;
  /** true mientras se descarga el detalle de la venta. */
  loading: boolean;
  onConfirmarLlegada: (
    venta: VentaCarbonResumen,
    carga: CargaVentaCarbonItem,
  ) => void;
  onLiquidarGrupo: (
    venta: VentaCarbonResumen,
    idTipoCarbon: number,
    idsCargas: number[],
  ) => void;
  onEditarLiquidacion: (
    venta: VentaCarbonResumen,
    liquidacion: LiquidacionVentaCarbonItem,
  ) => void;
  onConfirmarLiquidacion: (
    venta: VentaCarbonResumen,
    liquidacion: LiquidacionVentaCarbonItem,
  ) => void;
  onRegistrarComprobante: (
    venta: VentaCarbonResumen,
    liquidacion: LiquidacionVentaCarbonItem,
  ) => void;
  onRegistrarPago: (
    venta: VentaCarbonResumen,
    liquidacion: LiquidacionVentaCarbonItem,
    comprobante: ComprobanteVentaCarbonItem,
  ) => void;
}

/** Grupo de cargas listas para liquidar, agrupadas por tipo de carbon. */
interface GrupoCargas {
  idTipoCarbon: number;
  tipoCarbon: string;
  cargas: CargaVentaCarbonItem[];
  totalToneladas: number;
}

/** Pestana con su contador. */
const TabConContador = ({
  valor,
  icono,
  etiqueta,
  contador,
}: {
  valor: string;
  icono: React.ReactNode;
  etiqueta: string;
  contador: number;
}) => (
  <Tabs.Tab value={valor} leftSection={icono}>
    <Group gap={6} wrap="nowrap">
      <Text size="xs" fw={700}>
        {etiqueta}
      </Text>
      <Badge
        size="xs"
        circle
        variant={contador > 0 ? "filled" : "light"}
        color={contador > 0 ? "indigo" : "gray"}
      >
        {contador}
      </Badge>
    </Group>
  </Tabs.Tab>
);

/**
 * Detalle desplegado de una venta.
 *
 * Se carga bajo demanda: la fila del listado solo trae la cabecera, y el
 * arbol (cargas, liquidaciones, comprobantes y pagos) se pide cuando el
 * usuario despliega la venta.
 *
 * Las tres secciones (en camino / por liquidar / liquidaciones) van en tabs:
 * asi el detalle no crece hacia abajo y el usuario elige que ver.
 *
 * Las cargas se muestran siempre con la misma tabla (`TablaCargasVenta`),
 * este donde este. Lo unico que cambia es la seccion: una carga nunca
 * aparece en dos sitios a la vez.
 */
export const VentaCarbonDetalle = ({
  detalle,
  loading,
  onConfirmarLlegada,
  onLiquidarGrupo,
  onEditarLiquidacion,
  onConfirmarLiquidacion,
  onRegistrarComprobante,
  onRegistrarPago,
}: Props) => {
  const cargas = useMemo(() => detalle?.cargas ?? [], [detalle]);
  const liquidaciones = useMemo(
    () => detalle?.liquidaciones ?? [],
    [detalle],
  );

  /** Cargas que todavia no llegaron al almacen del cliente. */
  const cargasEnCamino = useMemo(
    () => cargas.filter((c) => c.estado === EstadoCargaVentaCarbon.EnCamino),
    [cargas],
  );

  /**
   * Cargas listas para liquidar: llegada confirmada y sin liquidacion.
   * Se agrupan por tipo de carbon porque una liquidacion solo puede
   * contener cargas de un mismo tipo.
   */
  const gruposPorLiquidar = useMemo<GrupoCargas[]>(() => {
    const grupos = new Map<number, GrupoCargas>();

    cargas.forEach((carga) => {
      if (carga.estado !== EstadoCargaVentaCarbon.LlegadaConfirmada) return;
      if (carga.id_liquidacion_venta_carbon) return;

      const idTipo = carga.id_tipo_carbon;
      const grupo = grupos.get(idTipo);
      if (grupo) {
        grupo.cargas.push(carga);
        grupo.totalToneladas += Number(carga.cantidad_toneladas) || 0;
        return;
      }

      grupos.set(idTipo, {
        idTipoCarbon: idTipo,
        tipoCarbon: carga.tipo_carbon ?? "Sin tipo",
        cargas: [carga],
        totalToneladas: Number(carga.cantidad_toneladas) || 0,
      });
    });

    return Array.from(grupos.values());
  }, [cargas]);

  if (loading) {
    return (
      <div className="px-4 py-6 bg-zinc-950/40 flex flex-col items-center gap-2">
        <Loader size="sm" color="indigo" />
        <Text size="xs" c="dimmed">
          Cargando detalle de la venta...
        </Text>
      </div>
    );
  }

  if (!detalle) {
    return (
      <div className="px-4 py-6 bg-zinc-950/40 text-center">
        <Text size="xs" c="dimmed" fs="italic">
          No se pudo cargar el detalle de la venta.
        </Text>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 bg-zinc-950/40">
      <Tabs defaultValue="en-camino" variant="outline" color="indigo">
        <Tabs.List mb="md">
          <TabConContador
            valor="en-camino"
            icono={<TruckIcon className="w-4 h-4" />}
            etiqueta="En camino"
            contador={cargasEnCamino.length}
          />
          <TabConContador
            valor="por-liquidar"
            icono={<ScaleIcon className="w-4 h-4" />}
            etiqueta="Por liquidar"
            contador={gruposPorLiquidar.length}
          />
          <TabConContador
            valor="liquidaciones"
            icono={<DocumentTextIcon className="w-4 h-4" />}
            etiqueta="Liquidaciones"
            contador={liquidaciones.length}
          />
        </Tabs.List>

        {/* EN CAMINO */}
        <Tabs.Panel value="en-camino">
          {cargasEnCamino.length === 0 ? (
            <Text size="xs" c="dimmed" fs="italic" ta="center" py="md">
              No hay cargas en camino.
            </Text>
          ) : (
            <TablaCargasVenta
              cargas={cargasEnCamino}
              onConfirmarLlegada={(carga) => onConfirmarLlegada(detalle, carga)}
            />
          )}
        </Tabs.Panel>

        {/* POR LIQUIDAR */}
        <Tabs.Panel value="por-liquidar">
          {gruposPorLiquidar.length === 0 ? (
            <Text size="xs" c="dimmed" fs="italic" ta="center" py="md">
              {cargas.length === 0
                ? "Esta venta aun no tiene cargas despachadas."
                : "No hay cargas pendientes de liquidacion."}
            </Text>
          ) : (
            <div className="flex flex-col gap-2">
              {gruposPorLiquidar.map((grupo) => (
                <Paper
                  key={grupo.idTipoCarbon}
                  p="sm"
                  radius="lg"
                  className="bg-zinc-900/60 border border-zinc-800"
                >
                  <Group justify="space-between" align="flex-start" mb="xs">
                    <Group gap="xs">
                      <Text size="xs" fw={800} c="white">
                        {grupo.tipoCarbon}
                      </Text>
                      <Badge
                        size="xs"
                        variant="light"
                        color="indigo"
                        radius="xl"
                      >
                        {grupo.cargas.length} cargas
                      </Badge>
                      <Badge size="xs" variant="light" color="gray" radius="xl">
                        {formatNumber(grupo.totalToneladas)} TN
                      </Badge>
                    </Group>

                    <Tooltip
                      label="Se liquidan todas las cargas del grupo; podes excluir alguna en el siguiente paso"
                      withArrow
                    >
                      <Button
                        size="xs"
                        radius="md"
                        variant="light"
                        color="blue"
                        leftSection={<ScaleIcon className="w-3.5 h-3.5" />}
                        onClick={() =>
                          onLiquidarGrupo(
                            detalle,
                            grupo.idTipoCarbon,
                            grupo.cargas.map((c) => c.id_carga_venta_carbon),
                          )
                        }
                      >
                        Liquidar este grupo
                      </Button>
                    </Tooltip>
                  </Group>

                  {/* Las cargas del grupo se ven igual que las de cualquier
                      otra seccion: misma tabla, mismas columnas. Como ya
                      llegaron, se muestran tambien los datos de la recepcion. */}
                  <TablaCargasVenta cargas={grupo.cargas} mostrarRecepcion />
                </Paper>
              ))}
            </div>
          )}
        </Tabs.Panel>

        {/* LIQUIDACIONES */}
        <Tabs.Panel value="liquidaciones">
          {liquidaciones.length === 0 ? (
            <Text size="xs" c="dimmed" fs="italic" ta="center" py="md">
              Esta venta aun no tiene liquidaciones.
            </Text>
          ) : (
            <div className="flex flex-col gap-2">
              {liquidaciones.map((liquidacion) => (
                <VentaCarbonLiquidacionPanel
                  key={liquidacion.id_liquidacion_venta_carbon}
                  venta={detalle}
                  liquidacion={liquidacion}
                  onEditarLiquidacion={onEditarLiquidacion}
                  onConfirmarLiquidacion={onConfirmarLiquidacion}
                  onRegistrarComprobante={onRegistrarComprobante}
                  onRegistrarPago={onRegistrarPago}
                />
              ))}
            </div>
          )}
        </Tabs.Panel>
      </Tabs>
    </div>
  );
};
