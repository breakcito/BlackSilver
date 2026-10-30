import {
  Badge,
  Button,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconCheck,
  IconDeviceFloppy,
  IconReceipt,
  IconWallet,
} from "@tabler/icons-react";
import dayjs from "dayjs";

import { useState } from "react";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import { TablaCargasVenta } from "./tabla-cargas-venta";
import { EstadoComprobanteVentaCarbon } from "../../../../shared/enums/venta-carbon/estado-comprobante-venta-carbon";
import type {
  ComprobanteVentaCarbonItem,
  LiquidacionVentaCarbonItem,
  VentaCarbonResumen,
} from "../../service/venta-carbon.responses";

interface Props {
  venta: VentaCarbonResumen;
  liquidacion: LiquidacionVentaCarbonItem;
  onEditarLiquidacion: (
    venta: VentaCarbonResumen,
    liquidacion: LiquidacionVentaCarbonItem,
  ) => void;
  onConfirmarLiquidacion: (
    venta: VentaCarbonResumen,
    liquidacion: LiquidacionVentaCarbonItem,
  ) => Promise<void> | void;
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

const formatPEN = (val: number | null | undefined) =>
  `S/ ${formatNumber(Number(val ?? 0))}`;

// const colorEstadoLiquidacion = (estado: string) =>
//   estado === EstadoLiquidacionVentaCarbon.Confirmada ? "teal" : "blue";

const colorEstadoComprobante = (estado: string) => {
  switch (estado) {
    case EstadoComprobanteVentaCarbon.Pagado:
      return "teal";
    case EstadoComprobanteVentaCarbon.EnProcesoPago:
      return "blue";
    default:
      return "yellow";
  }
};

/**
 * Panel de una liquidacion: cabecera con sus datos, totales, las cargas que
 * la componen, su comprobante y los pagos de ese comprobante.
 */
export const VentaCarbonLiquidacionPanel = ({
  venta,
  liquidacion,
  onEditarLiquidacion,
  onConfirmarLiquidacion,
  onRegistrarComprobante,
  onRegistrarPago,
}: Props) => {
  const comprobante = liquidacion.comprobante;

  /**
   * Id de la liquidacion que se esta confirmando. Mientras dura la
   * operacion el boton muestra su estado de carga y el resto de acciones
   * quedan deshabilitadas.
   */
  const [confirmando, setConfirmando] = useState<number | null>(null);
  const enCurso = confirmando !== null;

  return (
    <Paper p="sm" radius="lg" className="bg-zinc-900/60 border border-zinc-800">
      {/* Cabecera de la liquidacion */}
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <Group gap="xs">
          <Text size="xs" fw={800} c="white">
            {liquidacion.tipo_carbon ?? "—"}
          </Text>
          {/* <Badge
              size="xs"
              variant="light"
              color={colorEstadoLiquidacion(String(liquidacion.estado))}
              radius="xl"
            >
              {liquidacion.estado}
            </Badge> */}
          {liquidacion.codigo_orden_compra && (
            <Badge size="sm" variant="outline" color="lime" radius="xl">
              OC {liquidacion.codigo_orden_compra}
            </Badge>
          )}
          {liquidacion.numero_reporte && (
            <Badge size="sm" variant="outline" color="blue.4" radius="xl">
              Nro {liquidacion.numero_reporte}
            </Badge>
          )}
          {liquidacion.version && (
            <Badge size="sm" variant="outline" color="teal" radius="xl">
              {liquidacion.version}
            </Badge>
          )}
          <Text size="xs" c="gray" mt={1}>
            Aprobación:{" "}
            {liquidacion.fecha_aprobacion
              ? `${dayjs(liquidacion.fecha_aprobacion).format("DD/MM/YYYY")}`
              : "-"}
          </Text>
          <Text size="xs" c="gray" mt={1}>
            Registrado por: {liquidacion.empleado_registro ?? "—"}
          </Text>
          <Text size="xs" c="gray" mt={1}>
            {liquidacion.fecha_hora_confirmacion
              ? `Confirmado: ${dayjs(liquidacion.fecha_hora_confirmacion).format("DD/MM/YYYY HH:mm")}`
              : ""}
          </Text>

          <Divider orientation="vertical" />
          <Text size="xs" c="gray">
            Subtotal{" "}
            <Text span size="xs" fw={700} c="blue">
              {formatPEN(liquidacion.subtotal)}
            </Text>
          </Text>
          <Divider orientation="vertical" />
          <Text size="xs" c="gray">
            IGV{" "}
            <Text span size="xs" fw={700} c="pink">
              {formatPEN(liquidacion.monto_igv)}
            </Text>
          </Text>
          <Divider orientation="vertical" />
          <Text size="xs" c="gray">
            Total{" "}
            <Text span size="xs" fw={700} c="cyan">
              {formatPEN(liquidacion.total)}
            </Text>
          </Text>
          <Divider orientation="vertical" />
          <Text size="xs" c="gray">
            Detraccion{" "}
            <Text span size="xs" fw={700} c="orange.3">
              {formatPEN(liquidacion.monto_detraccion)}
            </Text>
          </Text>
          <Divider orientation="vertical" />
          <Text size="xs" c="gray">
            Neto{" "}
            <Text span size="xs" fw={800} c="lime.3">
              {formatPEN(liquidacion.neto_a_pagar)}
            </Text>
          </Text>
        </Group>

        <Group gap={6} wrap="nowrap">
          {!liquidacion.esta_confirmado ? (
            <>
              <Button
                size="xs"
                radius="md"
                variant="light"
                color="gray"
                leftSection={<IconDeviceFloppy size={14} />}
                onClick={() => onEditarLiquidacion(venta, liquidacion)}
                disabled={enCurso}
              >
                Editar
              </Button>
              <Button
                size="xs"
                radius="md"
                variant="light"
                color="teal"
                leftSection={<IconCheck size={14} />}
                loading={
                  confirmando === liquidacion.id_liquidacion_venta_carbon
                }
                disabled={enCurso}
                onClick={async () => {
                  setConfirmando(liquidacion.id_liquidacion_venta_carbon);
                  try {
                    await onConfirmarLiquidacion(venta, liquidacion);
                  } finally {
                    setConfirmando(null);
                  }
                }}
              >
                Confirmar
              </Button>
            </>
          ) : comprobante === null ? (
            <Button
              size="xs"
              radius="md"
              variant="light"
              color="indigo"
              leftSection={<IconReceipt size={14} />}
              onClick={() => onRegistrarComprobante(venta, liquidacion)}
              disabled={enCurso}
            >
              Registrar comprobante
            </Button>
          ) : (
            <Button
              size="xs"
              radius="md"
              variant="light"
              color="indigo"
              leftSection={<IconWallet size={14} />}
              disabled={
                comprobante.estado === EstadoComprobanteVentaCarbon.Pagado
              }
              onClick={() => onRegistrarPago(venta, liquidacion, comprobante)}
            >
              Registrar pago
            </Button>
          )}
        </Group>
      </Group>

      {/* Cargas de la liquidacion: misma tabla que el resto de secciones */}
      {liquidacion.cargas.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-sm">
          <Text size="xs" fw={700} c="white">
            Cargas ({liquidacion.cargas.length})
          </Text>
          <TablaCargasVenta
            cargas={liquidacion.cargas}
            mostrarRecepcion
            mostrarImportes
          />
        </div>
      )}

      {/* Comprobante */}
      {comprobante && (
        <Paper
          p="xs"
          mt="sm"
          radius="md"
          className="bg-zinc-950/60 border border-zinc-700"
        >
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <div>
              <Group gap="xs">
                <IconReceipt size={14} className="text-indigo-400" />
                <Text size="xs" fw={800} c="white">
                  Comprobante {comprobante.codigo_comprobante}
                </Text>
                <Badge
                  size="xs"
                  variant="light"
                  color={colorEstadoComprobante(String(comprobante.estado))}
                  radius="xl"
                >
                  {comprobante.estado}
                </Badge>
              </Group>
              <Text size="11px" c="gray" mt={2}>
                Emision:{" "}
                {comprobante.fecha_emision
                  ? dayjs(comprobante.fecha_emision).format("DD/MM/YYYY")
                  : "—"}{" "}
                · Registrado por {comprobante.empleado_registro ?? "—"}
              </Text>
            </div>
          </Group>

          <Group gap="lg" mt="xs" wrap="wrap">
            <Text size="xs" c="gray">
              Base{" "}
              <Text span size="xs" fw={700} c="zinc.200">
                {formatPEN(comprobante.base_imponible)}
              </Text>
            </Text>
            <Text size="xs" c="gray">
              Total{" "}
              <Text span size="xs" fw={700} c="indigo.3">
                {formatPEN(comprobante.importe_total)}
              </Text>
            </Text>
            <Text size="xs" c="gray">
              Detraccion{" "}
              <Text span size="xs" fw={700} c="orange.3">
                {formatPEN(comprobante.monto_detraccion)}
              </Text>
            </Text>
            <Text size="xs" c="gray">
              Neto{" "}
              <Text span size="xs" fw={800} c="lime.3">
                {formatPEN(comprobante.monto_neto)}
              </Text>
            </Text>
          </Group>

          <Group gap="lg" mt={4} wrap="wrap">
            <Text size="11px" c="gray">
              Pagado (neto):{" "}
              <Text span size="11px" fw={700} c="teal.3">
                {formatPEN(comprobante.avance_pago_neto)}
              </Text>{" "}
              / pendiente{" "}
              <Text span size="11px" fw={700} c="yellow.3">
                {formatPEN(
                  Math.max(
                    0,
                    Number(comprobante.monto_neto) -
                      Number(comprobante.avance_pago_neto),
                  ),
                )}
              </Text>
            </Text>
            <Text size="11px" c="gray">
              Pagado (detraccion):{" "}
              <Text span size="11px" fw={700} c="teal.3">
                {formatPEN(comprobante.avance_pago_detraccion)}
              </Text>{" "}
              / pendiente{" "}
              <Text span size="11px" fw={700} c="yellow.3">
                {formatPEN(
                  Math.max(
                    0,
                    Number(comprobante.monto_detraccion) -
                      Number(comprobante.avance_pago_detraccion),
                  ),
                )}
              </Text>
            </Text>
          </Group>

          {/* Pagos del comprobante */}
          {comprobante.pagos.length > 0 && (
            <Stack gap={4} mt="sm">
              <Text size="xs" fw={700} c="white">
                Pagos ({comprobante.pagos.length})
              </Text>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {comprobante.pagos.map((pago) => (
                  <Paper
                    key={pago.id_pago_venta_carbon}
                    p="xs"
                    radius="md"
                    className="bg-zinc-800 border border-zinc-700 min-w-0 flex flex-col justify-between gap-2"
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <Badge
                        size="xs"
                        variant="light"
                        color={pago.es_para_detraccion ? "orange" : "teal"}
                        radius="xl"
                      >
                        {pago.es_para_detraccion ? "Detraccion" : "Neto"}
                      </Badge>
                      <Text size="sm" fw={700} c="white" className="shrink-0">
                        {formatPEN(pago.monto_pagado)}
                      </Text>
                    </Group>
                    <Text size="11px" c="gray" truncate>
                      {pago.medio_pago} · Op: {pago.numero_operacion || "S/N"}
                    </Text>
                    <Text size="11px" c="gray" truncate>
                      {pago.fecha_hora_pago
                        ? dayjs(pago.fecha_hora_pago).format("DD/MM/YYYY HH:mm")
                        : "—"}
                      {pago.empresa_banco ? ` · ${pago.empresa_banco}` : ""}
                    </Text>
                  </Paper>
                ))}
              </div>
            </Stack>
          )}
        </Paper>
      )}
    </Paper>
  );
};
