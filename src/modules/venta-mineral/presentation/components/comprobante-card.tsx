import { Badge, Button, Divider, Group, Paper, Text } from "@mantine/core";
import { IconCash, IconPencil, IconReceipt } from "@tabler/icons-react";
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
  // onEliminar,
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
  // const tipoCambio = Number(comprobante.tipo_cambio ?? 1) || 1;

  /**
   * Saldo pendiente TOTAL, en la moneda del comprobante: el neto que falta
   * mas la detraccion que falta.
   *
   * La detraccion se cobra en soles, asi que en un comprobante en dolares
   * lo ya pagado de detraccion (que esta en soles) se convierte a dolares
   * para restarlo del monto de la detraccion del comprobante. Asi el saldo
   * pendiente es una sola cifra, coherente con los importes de arriba.
   */
  // const pendienteTotal =
  //   Math.round(
  //     (pendienteNeto +
  //       (esDolar
  //         ? Number(comprobante.monto_detraccion) -
  //           Number(comprobante.avance_detraccion) / tipoCambio
  //         : pendienteDetraccion)) *
  //       100,
  //   ) / 100;

  const contenido = (
    <>
      <Group justify="" align="flex-start" wrap="nowrap" gap="xs">
        <div className="min-w-0">
          {/* Codigo | estado | detalle: todo en una sola linea */}
          <Group gap="xs" wrap="wrap" align="center">
            <IconReceipt size={16} className="text-indigo-400 shrink-0" />
            <Text size="sm" fw={700} c="white" truncate>
              {comprobante.codigo_comprobante || "Sin codigo"}
            </Text>
            <Divider orientation="vertical" />
            <Badge
              color={colorEstado(comprobante.estado)}
              variant="light"
              size="sm"
              radius="sm"
            >
              {comprobante.estado}
            </Badge>
            <Divider orientation="vertical" />
            <Text size="xs" fw={700} c="pink.3" truncate>
              {etiqueta || "-"}
            </Text>
            <Divider orientation="vertical" />
            <Text size="xs" c="gray" fw={700}>
              F. emisión:{" "}
              {comprobante.fecha_emision
                ? dayjs(comprobante.fecha_emision).format("DD/MM/YYYY")
                : "-"}
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
          {onRegistrarPago &&
            (comprobante.avance_neto < comprobante.neto_a_pagar ||
              comprobante.avance_detraccion <
                comprobante.monto_detraccion_soles) && (
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
          {/* {onEliminar && (
            <Button
              variant="subtle"
              size="compact-xs"
              color="red"
              onClick={onEliminar}
              leftSection={<IconTrash size={12} />}
            >
              Eliminar
            </Button>
          )} */}
        </Group>
      </Group>

      <div
        className={`grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 lg:grid-cols-9`}
      >
        <div>
          <Text size="xs" c="gray">
            Subtotal
          </Text>
          <Text size="sm" fw={600} c="zinc.200">
            {simbolo} {formatNumber(comprobante.subtotal)}
          </Text>
        </div>
        <div>
          <Text size="xs" c="gray">
            IGV ({formatNumber(comprobante.porcentaje_igv)}%)
          </Text>
          <Text size="sm" fw={600} c="zinc.200">
            {simbolo} {formatNumber(comprobante.igv)}
          </Text>
        </div>
        <div>
          <Text size="xs" c="gray">
            Total
          </Text>
          <Text size="sm" fw={700} c="indigo.3">
            {simbolo} {formatNumber(comprobante.total)}
          </Text>
        </div>
        <div>
          <Text size="xs" c="gray">
            Detraccion ({formatNumber(comprobante.porcentaje_detraccion)}%)
          </Text>
          <Text size="sm" fw={600} c="orange.3">
            {esDolar
              ? `${simbolo} ${formatNumber(comprobante.monto_detraccion)}`
              : `S/ ${formatNumber(comprobante.monto_detraccion_soles)}`}
          </Text>
          {esDolar && (
            <Text size="sm" fw={600} c="orange.3">
              S/ {formatNumber(comprobante.monto_detraccion_soles)}
            </Text>
          )}
        </div>

        <div>
          <Text size="xs" c="gray">
            Neto a pagar
          </Text>
          <Text size="sm" fw={700} c="lime.3">
            {simbolo} {formatNumber(comprobante.neto_a_pagar)}
          </Text>
        </div>
        <div>
          <Text size="xs" c="gray">
            Neto pendiente
          </Text>
          <Text
            size="sm"
            fw={700}
            c={pendienteNeto > 0 ? "yellow.3" : "green.3"}
          >
            {simbolo} {formatNumber(pendienteNeto)}
          </Text>
        </div>
        <div>
          <Text size="xs" c="gray">
            Detracción pendiente
          </Text>
          <Text
            size="sm"
            fw={700}
            c={pendienteDetraccion > 0 ? "yellow.3" : "green.3"}
          >
            S/ {formatNumber(pendienteDetraccion)}
          </Text>
        </div>
      </div>

      <Text size="sm" c="gray" fw={700} mt="sm">
        PAGOS:
      </Text>

      {hayPagos ? (
        <Group gap="sm" mt={"4"}>
          {comprobante.pagos.map((pago) => (
            <div
              key={pago.id_pago}
              className="flex items-center gap-2 text-xs shrink-0 bg-teal-950 p-1.5 rounded-lg"
            >
              <span className="text-zinc-300">
                {dayjs(pago.fecha_hora_pago).format("DD/MM/YYYY HH:mm")} ·{" "}
                {pago.medio_pago}
                {pago.numero_operacion ? ` · ${pago.numero_operacion}` : ""}
                {pago.es_para_detraccion ? " · DETRACCIÓN" : " · NETO"}
              </span>
              <span className="text-zinc-200 font-semibold">
                {pago.es_para_detraccion ? "S/" : simbolo}{" "}
                {formatNumber(pago.monto_pagado)}
              </span>
            </div>
          ))}
        </Group>
      ) : (
        <Text size="xs" c="dimmed" className="italic">
          Sin pagos registrados
        </Text>
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
