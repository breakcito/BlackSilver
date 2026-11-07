import { Badge, Button, Group, Paper, Text } from "@mantine/core";
import {
  IconCash,
  IconPencil,
  IconReceipt,
  IconTrash,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import { EstadoComprobanteDespacho } from "../../../../shared/enums/venta-mineral/estado-comprobante-despacho";
import type { ComprobanteDespachoItem } from "../../service/venta-mineral.responses";

/**
 * Tarjeta de un comprobante de despacho con sus importes y el saldo
 * pendiente de pago.
 *
 * Muestra la cascada completa (subtotal, IGV, total, detraccion, neto) para
 * que el usuario vea de donde sale el neto, y separa el saldo pendiente del
 * neto y de la detraccion: son dos cuentas distintas.
 */
interface Props {
  comprobante: ComprobanteDespachoItem;
  etiqueta: string;
  onEditar?: () => void;
  onEliminar?: () => void;
  onRegistrarPago?: () => void;
  onVerPagos?: () => void;
}

const colorEstado = (estado: EstadoComprobanteDespacho) => {
  if (estado === EstadoComprobanteDespacho.Pagado) return "green";
  if (estado === EstadoComprobanteDespacho.EnProcesoPago) return "yellow";
  return "gray";
};

export const ComprobanteCard = ({
  comprobante,
  etiqueta,
  onEditar,
  onEliminar,
  onRegistrarPago,
  onVerPagos,
}: Props) => {
  const pendienteNeto = Math.max(
    0,
    Number(comprobante.neto_a_pagar) - Number(comprobante.avance_neto),
  );
  const pendienteDetraccion = Math.max(
    0,
    Number(comprobante.monto_detraccion) - Number(comprobante.avance_detraccion),
  );
  const hayPagos = (comprobante.pagos?.length ?? 0) > 0;

  return (
    <Paper
      p="md"
      radius="lg"
      className="bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors"
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <div className="min-w-0">
          <Group gap="xs">
            <IconReceipt size={16} className="text-indigo-400 shrink-0" />
            <Text size="sm" fw={700} c="white" truncate>
              {comprobante.codigo_comprobante || "Sin codigo"}
            </Text>
            <Badge
              color={colorEstado(comprobante.estado)}
              variant="light"
              size="xs"
              radius="sm"
            >
              {comprobante.estado}
            </Badge>
          </Group>

          <Text size="xs" c="dimmed" mt={2}>
            {etiqueta}
            {comprobante.transportista
              ? ` · ${comprobante.transportista}`
              : ""}
            {comprobante.cliente ? ` · ${comprobante.cliente}` : ""}
            {comprobante.fecha_emision
              ? ` · ${dayjs(comprobante.fecha_emision).format("DD/MM/YYYY")}`
              : ""}
          </Text>
        </div>

        <Group gap={4} wrap="nowrap" className="shrink-0">
          {onEditar && (
            <Button
              variant="subtle"
              size="compact-xs"
              color="indigo"
              onClick={onEditar}
              leftSection={<IconPencil size={12} />}
            >
              Editar
            </Button>
          )}
          {onRegistrarPago && (
            <Button
              variant="light"
              size="compact-xs"
              color="teal"
              onClick={onRegistrarPago}
              leftSection={<IconCash size={12} />}
            >
              Pagar
            </Button>
          )}
          {onVerPagos && hayPagos && (
            <Button
              variant="subtle"
              size="compact-xs"
              color="gray"
              onClick={onVerPagos}
            >
              {comprobante.pagos?.length} pago
              {comprobante.pagos?.length === 1 ? "" : "s"}
            </Button>
          )}
          {onEliminar && (
            <Button
              variant="subtle"
              size="compact-xs"
              color="red"
              onClick={onEliminar}
              leftSection={<IconTrash size={12} />}
            >
              Eliminar
            </Button>
          )}
        </Group>
      </Group>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
        <div>
          <Text size="xs" c="dimmed">
            Subtotal
          </Text>
          <Text size="sm" fw={600} c="zinc.200">
            S/ {formatNumber(comprobante.subtotal)}
          </Text>
        </div>
        <div>
          <Text size="xs" c="dimmed">
            IGV ({formatNumber(comprobante.porcentaje_igv)}%)
          </Text>
          <Text size="sm" fw={600} c="zinc.200">
            S/ {formatNumber(comprobante.igv)}
          </Text>
        </div>
        <div>
          <Text size="xs" c="dimmed">
            Total
          </Text>
          <Text size="sm" fw={700} c="indigo.3">
            S/ {formatNumber(comprobante.total)}
          </Text>
        </div>
        <div>
          <Text size="xs" c="dimmed">
            Detraccion ({formatNumber(comprobante.porcentaje_detraccion)}%)
          </Text>
          <Text size="sm" fw={600} c="orange.3">
            S/ {formatNumber(comprobante.monto_detraccion)}
          </Text>
        </div>
        <div>
          <Text size="xs" c="dimmed">
            Neto a pagar
          </Text>
          <Text size="sm" fw={700} c="lime.3">
            S/ {formatNumber(comprobante.neto_a_pagar)}
          </Text>
        </div>
        <div>
          <Text size="xs" c="dimmed">
            Saldo pendiente
          </Text>
          <Text
            size="sm"
            fw={700}
            c={pendienteNeto + pendienteDetraccion > 0 ? "yellow.3" : "green.3"}
          >
            S/ {formatNumber(pendienteNeto + pendienteDetraccion)}
          </Text>
        </div>
      </div>

      {comprobante.importes_bloqueados && (
        <Text size="xs" c="yellow.4" mt="sm">
          El comprobante ya tiene pagos: los importes no se pueden modificar.
        </Text>
      )}

      {hayPagos && (
        <div className="mt-3 pt-3 border-t border-zinc-800/70 space-y-1">
          {comprobante.pagos.map((pago) => (
            <div
              key={pago.id_pago}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span className="text-zinc-400 truncate">
                {dayjs(pago.fecha_hora_pago).format("DD/MM/YYYY HH:mm")} ·{" "}
                {pago.medio_pago}
                {pago.numero_operacion ? ` · ${pago.numero_operacion}` : ""}
                {pago.es_para_detraccion ? " · detraccion" : ""}
              </span>
              <span
                className="text-zinc-200 font-semibold shrink-0"
                style={{ color: undefined }}
              >
                S/ {formatNumber(pago.monto_pagado)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Paper>
  );
};
