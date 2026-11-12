import { useState } from "react";
import {
  ActionIcon,
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

interface Props {
  detalle: DespachoMineralDetalle;
  /** El detalle se esta recargando (spinner). */
  loading?: boolean;
  onVolver?: () => void;
  onEditarDespacho: () => void;
  onEliminarDespacho: () => void;
  onRegistrarGasto: () => void;
  onEditarGasto: (gasto: GastoDespachoItem) => void;
  onEliminarGasto: (gasto: GastoDespachoItem) => void;
  onRegistrarFlete: () => void;
  onEditarFlete: (flete: FleteDespachoItem) => void;
  onRegistrarBalanza: (flete: FleteDespachoItem) => void;
  onEliminarFlete: (flete: FleteDespachoItem) => void;
  onRegistrarComprobante: (tipo: TipoComprobanteDespacho) => void;
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
  onEditarDespacho,
  onEliminarDespacho,
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
                </Text>
              </Text>
              <Divider orientation="vertical" />
              <Text size="xs" c="gray">
                Pagado{" "}
                <Text span size="xs" fw={700} c="lime.3">
                  S/ {formatNumber(totalPagado)}
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
            <Tooltip label="Editar despacho" withArrow>
              <Button
                variant="light"
                color="indigo"
                size="compact-xs"
                onClick={onEditarDespacho}
                leftSection={<IconPencil size={12} />}
              >
                Editar
              </Button>
            </Tooltip>
            <Tooltip label="Eliminar despacho" withArrow>
              <Button
                variant="subtle"
                color="red"
                size="compact-xs"
                onClick={() =>
                  setAEliminar({
                    titulo: "Eliminar despacho",
                    descripcion:
                      "Se eliminaran el despacho, sus gastos, fletes, comprobantes, analisis y liquidaciones. No se puede deshacer.",
                    accion: onEliminarDespacho,
                  })
                }
                leftSection={<IconTrash size={12} />}
              >
                Eliminar
              </Button>
            </Tooltip>
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
              <Group justify="space-between" mb="sm">
                <Text size="sm" fw={700} c="white">
                  Flete de la carga
                </Text>
                {detalle.fletes.length === 0 && (
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

              {detalle.fletes.length === 0 ? (
                <Text size="xs" c="gray" ta="center" py="md">
                  Todavia no hay flete. El mineral del despacho se lleva en una
                  sola unidad: registra el vehiculo, su guia y el ticket de
                  balanza.
                </Text>
              ) : (
                <Stack gap="xs">
                  {detalle.fletes.map((flete) => (
                    <Paper
                      key={flete.id_flete_despacho}
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
                              {flete.placa ?? "Sin placa"}
                            </Text>
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
                            {flete.codigo_ticket_balanza && (
                              <Badge
                                color="teal"
                                variant="light"
                                size="xs"
                                radius="sm"
                              >
                                Balanza: {flete.codigo_ticket_balanza}
                              </Badge>
                            )}
                          </Group>
                          <Text size="xs" c="gray" mt={2}>
                            {flete.transportista ?? "Sin transportista"} · Guia{" "}
                            {flete.guia_remitente ?? "-"} · Licencia{" "}
                            {flete.licencia_conductor ?? "-"}
                          </Text>
                          <Text size="xs" c="gray">
                            Peso guia {formatNumber(flete.peso_guia)} t
                            {flete.peso_neto > 0
                              ? ` · Peso neto ${formatNumber(flete.peso_neto)} t`
                              : " · Sin peso de balanza"}{" "}
                            · Medidas {formatNumber(flete.largo)} x{" "}
                            {formatNumber(flete.ancho)} x{" "}
                            {formatNumber(flete.alto)} m
                          </Text>
                          {flete.fecha_hora_pesaje && (
                            <Text size="xs" c="gray">
                              Pesaje:{" "}
                              {dayjs(flete.fecha_hora_pesaje).format(
                                "DD/MM/YYYY HH:mm",
                              )}
                            </Text>
                          )}
                        </div>
                        <Group gap={4} wrap="nowrap">
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
                            onClick={() =>
                              setAEliminar({
                                titulo: "Eliminar flete",
                                descripcion:
                                  "Se eliminara el flete y su ticket de balanza.",
                                accion: () => onEliminarFlete(flete),
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

            <Group justify="space-between">
              <Text size="sm" fw={700} c="white">
                Comprobante de flete
              </Text>
              {detalle.comprobantes_flete.length === 0 && (
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
              )}
            </Group>

            {detalle.comprobantes_flete.length === 0 ? (
              <Text size="xs" c="gray" ta="center" py="md">
                Sin comprobante de flete. Se factura la carga del despacho al
                precio por tonelada.
              </Text>
            ) : (
              <Stack gap="sm">
                {detalle.comprobantes_flete.map((comprobante) => (
                  <ComprobanteCard
                    key={comprobante.id_comprobante}
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
                ))}
              </Stack>
            )}
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
                <Group gap="xs">
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
                  {detalle.comprobantes_analisis.length === 0 &&
                    detalle.analisis.length > 0 && (
                      <Button
                        size="compact-xs"
                        radius="md"
                        variant="light"
                        color="teal"
                        leftSection={<IconReceipt size={12} />}
                        onClick={() => onRegistrarComprobante("analisis")}
                      >
                        Facturar analisis
                      </Button>
                    )}
                </Group>
              </Group>

              {detalle.analisis.length === 0 ? (
                <Text size="xs" c="gray" ta="center" py="md">
                  Sin analisis de laboratorio. Registra el laboratorio, las
                  leyes y el costo del servicio.
                </Text>
              ) : (
                <Stack gap="xs">
                  {detalle.analisis.map((analisis) => (
                    <Paper
                      key={analisis.id_analisis_laboratorio}
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
                              {analisis.codigo_cliente ?? "Sin codigo"}
                            </Text>
                            <Badge
                              color={
                                analisis.asumido_por === "Propio"
                                  ? "indigo"
                                  : "gray"
                              }
                              variant="light"
                              size="xs"
                              radius="sm"
                            >
                              {analisis.asumido_por === "Propio"
                                ? "Asume la empresa"
                                : "Asume el cliente"}
                            </Badge>
                            {analisis.id_comprobante_analisis_despacho && (
                              <Badge
                                color="teal"
                                variant="light"
                                size="xs"
                                radius="sm"
                              >
                                Facturado
                              </Badge>
                            )}
                          </Group>
                          <Text size="xs" c="gray" mt={2}>
                            {analisis.laboratorio ?? "Sin laboratorio"} · Cod.
                            lab. {analisis.codigo_laboratorio ?? "-"}
                            {analisis.fecha_analisis
                              ? ` · ${dayjs(analisis.fecha_analisis).format("DD/MM/YYYY")}`
                              : ""}
                          </Text>
                          <Text size="xs" c="gray">
                            Au {formatNumber(analisis.ley_oro)} · Ag{" "}
                            {formatNumber(analisis.ley_plata)} · Cu{" "}
                            {formatNumber(analisis.ley_cobre)} · Zn{" "}
                            {formatNumber(analisis.ley_zinc)} · As{" "}
                            {formatNumber(analisis.ley_arsenico)} · Humedad{" "}
                            {formatNumber(analisis.porcentaje_humedad)}%
                          </Text>
                        </div>
                        <Group gap={4} wrap="nowrap">
                          <Text size="sm" fw={700} c="orange.3">
                            S/ {formatNumber(analisis.costo_servicio)}
                          </Text>
                          <Button
                            variant="subtle"
                            color="indigo"
                            size="compact-xs"
                            onClick={() => onEditarAnalisis(analisis)}
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
                                titulo: "Eliminar analisis",
                                descripcion:
                                  "Se eliminara el analisis del despacho.",
                                accion: () => onEliminarAnalisis(analisis),
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

            {detalle.comprobantes_analisis.map((comprobante) => (
              <ComprobanteCard
                key={comprobante.id_comprobante}
                comprobante={comprobante}
                etiqueta={`${comprobante.analisis?.length ?? 0} analisis`}
                onEditar={() => onEditarComprobante("analisis", comprobante)}
                onRegistrarPago={() => onRegistrarPago("analisis", comprobante)}
                onEliminar={() =>
                  setAEliminar({
                    titulo: "Eliminar comprobante de analisis",
                    descripcion:
                      "Se eliminara el comprobante y sus pagos. Los analisis quedaran libres para facturar de nuevo.",
                    accion: () =>
                      onEliminarComprobante("analisis", comprobante),
                  })
                }
              />
            ))}
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
    </Stack>
  );
};
