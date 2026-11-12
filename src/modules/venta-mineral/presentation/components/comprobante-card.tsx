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
import { Moneda } from "../../../../shared/enums/_generic/moneda";
import { simboloMoneda } from "../forms/calculos-despacho";
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
  /** Se dibuja dentro de otra tarjeta (sin borde ni fondo propios). */
  embebido?: boolean;
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
  embebido,
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
    Number(comprobante.monto_detraccion_soles) -
      Number(comprobante.avance_detraccion),
  );
  const hayPagos = (comprobante.pagos?.length ?? 0) > 0;

  /** Moneda del comprobante: solo el de flete puede estar en dolares. */
  const moneda = comprobante.moneda ?? Moneda.Soles;
  const esDolar = moneda === Moneda.Dolares;
  const simbolo = simboloMoneda(moneda);
  const tipoCambio = Number(comprobante.tipo_cambio ?? 1) || 1;

  /**
   * Saldo pendiente TOTAL, en la moneda del comprobante: el neto que falta
   * mas la detraccion que falta.
   *
   * La detraccion se cobra en soles, asi que en un comprobante en dolares
   * lo ya pagado de detraccion (que esta en soles) se convierte a dolares
   * para restarlo del monto de la detraccion del comprobante. Asi el saldo
   * pendiente es una sola cifra, coherente con los importes de arriba.
   */
  const pendienteTotal = Math.round(
    (pendienteNeto +
      (esDolar
        ? Number(comprobante.monto_detraccion) -
          Number(comprobante.avance_detraccion) / tipoCambio
        : pendienteDetraccion)) *
      100,
  ) / 100;

  const contenido = (
    <>
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
        <div className="min-w-0">
          {/* Codigo | estado | detalle: todo en una sola linea */}
          <Group gap="xs" wrap="wrap" align="center">
            <IconReceipt size={16} className="text-indigo-400 shrink-0" />
            <Text size="sm" fw={700} c="white" truncate>
              {comprobante.codigo_comprobante || "Sin codigo"}
            </Text>
            <Text size="xs" c="zinc.600">
              |
            </Text>
            <Badge
              color={colorEstado(comprobante.estado)}
              variant="light"
              size="xs"
              radius="sm"
            >
              {comprobante.estado}
            </Badge>
            <Text size="xs" c="zinc.600">
              |
            </Text>
            <Text size="xs" c="dimmed" truncate>
              {etiqueta && (
                <Text span size="xs" fw={700} c="pink.3">
                  {etiqueta}
                </Text>
              )}
              {comprobante.transportista && (
                <>
                  {" · "}
                  <Text span size="xs" fw={600} c="grape.4">
                    {comprobante.transportista}
                  </Text>
                </>
              )}
              {comprobante.fecha_emision && (
                <>
                  {" · "}
                  <Text span size="xs" fw={600} c="teal.3">
                    {dayjs(comprobante.fecha_emision).format("DD/MM/YYYY")}
                  </Text>
                </>
              )}
            </Text>
          </Group>
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

      <div
        className={`grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 ${
          esDolar ? "lg:grid-cols-7" : "lg:grid-cols-6"
        }`}
      >
        <div>
          <Text size="xs" c="dimmed">
            Subtotal
          </Text>
          <Text size="sm" fw={600} c="zinc.200">
            {simbolo} {formatNumber(comprobante.subtotal)}
          </Text>
        </div>
        <div>
          <Text size="xs" c="dimmed">
            IGV ({formatNumber(comprobante.porcentaje_igv)}%)
          </Text>
          <Text size="sm" fw={600} c="zinc.200">
            {simbolo} {formatNumber(comprobante.igv)}
          </Text>
        </div>
        <div>
          <Text size="xs" c="dimmed">
            Total
          </Text>
          <Text size="sm" fw={700} c="indigo.3">
            {simbolo} {formatNumber(comprobante.total)}
          </Text>
        </div>
        <div>
          <Text size="xs" c="dimmed">
            Detraccion ({formatNumber(comprobante.porcentaje_detraccion)}%)
          </Text>
          <Text size="sm" fw={600} c="orange.3">
            {esDolar
              ? `${simbolo} ${formatNumber(comprobante.monto_detraccion)}`
              : `S/ ${formatNumber(comprobante.monto_detraccion_soles)}`}
          </Text>
        </div>
        {esDolar && (
          <div>
            <Text size="xs" c="dimmed">
              Detraccion en soles
            </Text>
            <Text size="sm" fw={600} c="orange.3">
              S/ {formatNumber(comprobante.monto_detraccion_soles)}
            </Text>
          </div>
        )}
        <div>
          <Text size="xs" c="dimmed">
            Neto a pagar
          </Text>
          <Text size="sm" fw={700} c="lime.3">
            {simbolo} {formatNumber(comprobante.neto_a_pagar)}
          </Text>
        </div>
        <div>
          <Text size="xs" c="dimmed">
            Saldo pendiente
          </Text>
          <Text
            size="sm"
            fw={700}
            c={pendienteTotal > 0 ? "yellow.3" : "green.3"}
          >
            {simbolo} {formatNumber(pendienteTotal)}
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
                {pago.es_para_detraccion ? "S/" : simbolo}{" "}
                {formatNumber(pago.monto_pagado)}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (embebido) {
    return <div className="min-w-0">{contenido}</div>;
  }

  return (
    <Paper
      p="md"
      radius="lg"
      className="bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors"
    >
      {contenido}
    </Paper>
  );
};
