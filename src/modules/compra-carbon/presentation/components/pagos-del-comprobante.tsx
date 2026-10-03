import { Badge, Group, Stack, Text } from "@mantine/core";
import { ArchivoCard } from "../../../../presentation/utils/archivo/archivo-card";
import type { IArchivo } from "../../../../shared/interfaces/archivo";
import { formatPEN } from "./input-classes";
import type {
  PagoCompraCarbonResponse,
  PagoTransporteCarbonResponse,
} from "../../service/compra-carbon.responses";

export type PagoCarbon =
  | PagoCompraCarbonResponse
  | PagoTransporteCarbonResponse;

/** Una fila del historial: qué se pagó, por dónde y cuánto. */
export const LineaPago = ({ pago }: { pago: PagoCarbon }) => (
  <div className="py-2">
    <Group gap={6} wrap="wrap">
      <Badge
        size="xs"
        variant="light"
        color={pago.es_para_detraccion ? "yellow" : "indigo"}
      >
        {pago.es_para_detraccion ? "Detracción" : "Neto"}
      </Badge>
      <Text size="11px" c="dimmed">
        {pago.medio_pago}
        {pago.numero_operacion ? ` · Op ${pago.numero_operacion}` : ""} ·{" "}
        {pago.fecha_hora_pago}
      </Text>
    </Group>

    <Group gap={6} mt={4} justify="space-between" wrap="nowrap">
      <Text size="11px" c="zinc.5" className="font-mono truncate">
        {pago.banco_empresa_abv ?? pago.banco_empresa}{" "}
        {pago.cuenta_empresa_numero} → {pago.banco_destino_abv ?? "—"}{" "}
        {pago.cuenta_destino_numero}
      </Text>
      <Text
        fw={900}
        size="xs"
        c={pago.es_para_detraccion ? "yellow.4" : "emerald.4"}
        className="font-mono shrink-0"
      >
        {formatPEN(pago.monto_pagado)}
      </Text>
    </Group>

    {pago.observacion && (
      <Text size="11px" c="zinc.5" fs="italic" mt={2} truncate>
        {pago.observacion}
      </Text>
    )}

    {pago.evidencias.length > 0 && (
      <Stack gap={4} mt={6}>
        {pago.evidencias.map((ev: IArchivo) => (
          <ArchivoCard key={ev.path_relativo} archivo={ev} />
        ))}
      </Stack>
    )}
  </div>
);

interface Props {
  pagos: PagoCarbon[];
  vacio: string;
}

/**
 * Historial de pagos de un comprobante.
 *
 * Se dibuja DENTRO del comprobante, en un sub-bloque con fondo propio y
 * borde superior: asi se lee de un vistazo que el pago documenta ese
 * documento y no que es una seccion aparte.
 */
export const PagosDelComprobante = ({ pagos, vacio }: Props) => {
  if (pagos.length === 0) {
    return (
      <Text size="11px" c="dimmed" fs="italic">
        {vacio}
      </Text>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-1">
      <Text size="10px" fw={600} c="dimmed" className="pt-1 pb-0.5">
        Pagos · {pagos.length}
      </Text>

      <div className="divide-y divide-zinc-800">
        {pagos.map((p) => (
          <LineaPago key={p.id_pago} pago={p} />
        ))}
      </div>
    </div>
  );
};
