import {
  Badge,
  Button,
  Group,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import dayjs from "dayjs";

import { formatNumber } from "../../../../shared/functions/formatNumber";
import { colorCalidadCarbon } from "../../../../shared/functions/calidad-carbon";
import type { CargaVentaCarbonItem } from "../../service/venta-carbon.responses";

interface Props {
  cargas: CargaVentaCarbonItem[];
  /** Muestra el boton "Confirmar llegada" (cargas todavia en camino). */
  onConfirmarLlegada?: (carga: CargaVentaCarbonItem) => void;
  /**
   * Columnas de importes (precio base y neto). Solo tiene sentido en las
   * cargas que ya estan liquidadas.
   */
  mostrarImportes?: boolean;
  /**
   * Muestra los datos de la recepcion: vehiculo, analisis de calidad y si
   * la carga fue aceptada. Solo tiene sentido cuando la carga YA LLEGO.
   */
  mostrarRecepcion?: boolean;
  /** Numero con el que se rotula la primera carga. */
  offset?: number;
}

const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return dayjs(d).format("DD/MM/YYYY HH:mm");
};

/**
 * Tabla de cargas de una venta.
 *
 * Es la misma tabla para todas las secciones del detalle desplegado (en
 * camino, por liquidar y dentro de una liquidacion): asi una carga se ve
 * igual este donde este.
 *
 * `mostrarRecepcion` agrega los datos que solo existen cuando la carga ya
 * llego al almacen del cliente (vehiculo, analisis de calidad y aceptacion).
 */
export const TablaCargasVenta = ({
  cargas,
  onConfirmarLlegada,
  mostrarImportes = false,
  mostrarRecepcion = false,
  offset = 0,
}: Props) => {
  if (cargas.length === 0) return null;

  return (
    <Table
      highlightOnHover
      withTableBorder={false}
      verticalSpacing="xs"
      horizontalSpacing="sm"
    >
      <Table.Thead>
        <Table.Tr>
          <Table.Th
            ta={"center"}
            w={50}
            className="text-zinc-400 text-xs font-semibold"
          >
            #
          </Table.Th>
          <Table.Th
            ta={"center"}
            w={100}
            className="text-zinc-400 text-xs font-semibold"
          >
            Tipo / Calidad
          </Table.Th>
          {mostrarRecepcion && (
            <Table.Th
              ta={"center"}
              w={100}
              className="text-zinc-400 text-xs font-semibold"
            >
              Vehiculo
            </Table.Th>
          )}
          <Table.Th
            ta={"center"}
            w={80}
            className="text-zinc-400 text-xs font-semibold"
          >
            TN
          </Table.Th>
          <Table.Th
            ta={"center"}
            w={110}
            className="text-zinc-400 text-xs font-semibold"
          >
            Salida / Ingreso
          </Table.Th>
          <Table.Th
            ta={"center"}
            w={110}
            className="text-zinc-400 text-xs font-semibold"
          >
            Guias / Ticket
          </Table.Th>
          {mostrarRecepcion && (
            <>
              <Table.Th
                ta={"center"}
                w={180}
                className="text-zinc-400 text-xs font-semibold"
              >
                Analisis
              </Table.Th>
              <Table.Th
                ta={"center"}
                w={150}
                className="text-zinc-400 text-xs font-semibold"
              >
                Observación
              </Table.Th>
            </>
          )}
          {mostrarImportes && (
            <>
              <Table.Th
                ta={"center"}
                w={100}
                className="text-zinc-400 text-xs font-semibold"
              >
                Precios
              </Table.Th>
              {/* <Table.Th
                ta={"center"}
                w={100}
                className="text-zinc-400 text-xs font-semibold"
              >
                Neto
              </Table.Th> */}
            </>
          )}
          <Table.Th
            ta={"center"}
            w={100}
            className="text-zinc-400 text-xs font-semibold"
          >
            Accion
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {cargas.map((carga, i) => {
          const granulometria = carga.analisis_granulometria;

          return (
            <Table.Tr key={carga.id_carga_venta_carbon}>
              <Table.Td ta={"center"}>
                <Badge size="xs" variant="light" color="indigo" radius="sm">
                  #{i + 1 + offset}
                </Badge>
              </Table.Td>
              <Table.Td ta={"center"}>
                <div className="flex flex-col gap-1 items-center">
                  <Text size="xs" fw={600} c="zinc.100">
                    {carga.tipo_carbon}
                  </Text>
                  <Badge
                    size="xs"
                    variant="light"
                    color={colorCalidadCarbon(carga.calidad)}
                    radius="sm"
                  >
                    {carga.calidad ?? "Sin calidad"}
                  </Badge>
                </div>
              </Table.Td>
              {mostrarRecepcion && (
                <Table.Td ta={"center"}>
                  <div className="flex flex-col gap-1 items-center">
                    <Group gap={4}>
                      <Text
                        size="xs"
                        fw={600}
                        c="zinc.200"
                        className="font-mono"
                      >
                        {carga.vehiculo_placa ?? "—"}
                      </Text>
                      {carga.vehiculo_tipo && (
                        <Badge size="xs" color="cyan" radius="sm">
                          {carga.vehiculo_tipo}
                        </Badge>
                      )}
                    </Group>
                    {carga.segunda_placa && (
                      <Text size="11px" c="gray" className="font-mono">
                        2da: {carga.segunda_placa}
                      </Text>
                    )}
                  </div>
                </Table.Td>
              )}
              <Table.Td ta={"center"}>
                <Text size="xs" fw={700} c="zinc.100">
                  {formatNumber(carga.cantidad_toneladas)}
                </Text>
              </Table.Td>
              <Table.Td ta={"center"}>
                <div className="flex flex-col gap-0.5">
                  <Text size="xs" c="zinc.400">
                    {formatDateTime(carga.fecha_hora_salida)}
                  </Text>
                  <Text size="xs" c="indigo.3">
                    {formatDateTime(carga.fecha_hora_ingreso)}
                  </Text>
                </div>
              </Table.Td>
              <Table.Td ta={"center"}>
                <div className="flex flex-col gap-2.5 items-center">
                  <Text size="xs" c="zinc.200" className="font-mono">
                    <span className="font-bold">GRR: </span>
                    {carga.guia_remitente || "—"}
                  </Text>
                  <Text size="xs" c="zinc.200" className="font-mono">
                    <span className="font-bold">GRT: </span>{" "}
                    {carga.guia_transportista || "—"}
                  </Text>
                  <Text size="11px" c="gray" className="font-mono">
                    <span className="font-bold">TICKET: </span>{" "}
                    {carga.codigo_ticket_balanza
                      ? carga.codigo_ticket_balanza
                      : "-"}
                  </Text>
                </div>
              </Table.Td>
              {mostrarRecepcion && (
                <>
                  <Table.Td ta={"center"}>
                    <div className="flex flex-col gap-2.5 items-center">
                      <Group gap={6}>
                        <Badge size="sm" color="dark.3">
                          {formatNumber(carga.porcentaje_ceniza)}% Ce
                        </Badge>
                        <Badge size="sm" color="blue">
                          {formatNumber(carga.porcentaje_humedad)}% H2O
                        </Badge>
                      </Group>

                      <Group gap={6}>
                        <Badge size="sm" color="yellow">
                          {formatNumber(carga.porcentaje_azufre)}% S
                        </Badge>

                        {Number(carga.porcentaje_pizarra) > 0 && (
                          <Badge size="sm" color="gray.1" c={"dark"}>
                            {formatNumber(carga.porcentaje_pizarra)}% Pizarra
                          </Badge>
                        )}
                      </Group>

                      {granulometria && (
                        <Stack gap={5}>
                          <Text
                            size="xs"
                            fw={600}
                            c="gray"
                            className="font-mono"
                          >
                            Granulométricos
                          </Text>
                          <Group gap={16}>
                            <Text size="xs" c="teal" className="font-mono">
                              &gt;1":{" "}
                              {formatNumber(granulometria.mayor_a_uno ?? 0)}%
                            </Text>
                            <Text size="xs" c="pink" className="font-mono">
                              &lt;1":{" "}
                              {formatNumber(granulometria.menor_a_uno ?? 0)}%
                            </Text>
                            <Text size="xs" c="cyan" className="font-mono">
                              1/2": {formatNumber(granulometria.un_medio ?? 0)}%
                            </Text>
                          </Group>
                        </Stack>
                      )}
                    </div>
                  </Table.Td>
                  <Table.Td ta={"center"}>
                    <Stack gap={12} align="center">
                      <Badge
                        size="sm"
                        variant="light"
                        color={carga.fue_aceptado ? "teal" : "red"}
                        radius="md"
                      >
                        {carga.fue_aceptado ? "Aceptado" : "Rechazado"}
                      </Badge>
                      <Text
                        size="xs"
                        c="gray"
                        lineClamp={1}
                        fw={600}
                        title={carga.observacion?.toUpperCase() || "-"}
                      >
                        {carga.observacion?.toUpperCase() || "-"}
                      </Text>
                    </Stack>
                  </Table.Td>
                </>
              )}
              {mostrarImportes && (
                <>
                  <Table.Td ta={"center"}>
                    <div className="flex items-center justify-center">
                      <div className="flex flex-col gap-1.5 text-left">
                        <Text size="xs" c="blue" fw={700}>
                          Base: S/ {formatNumber(carga.precio_base)}
                        </Text>
                        <Text size="xs" c="lime" fw={700}>
                          Bono: S/ {formatNumber(carga.bono)}
                        </Text>
                        <Text size="xs" c="pink" fw={700}>
                          Desc.: S/ {formatNumber(carga.descuento)}
                        </Text>
                        {/* <Text size="xs" fw={700} c="lime">
                          Sub.: S/ {formatNumber(carga.subtotal)}
                        </Text>
                        <Text size="xs" fw={700} c="lime">
                          IGV: S/ {formatNumber(carga.monto_igv)}
                        </Text> */}
                        {/* <Text size="xs" fw={700} c="lime">
                          Total: S/ {formatNumber(carga.total)}
                        </Text> */}
                        <Text size="xs" fw={700} c="yellow">
                          Detr.: S/ {formatNumber(carga.monto_detraccion)}
                        </Text>
                        <Text size="xs" fw={700} c="teal">
                          Neto: S/ {formatNumber(carga.neto_a_pagar)}
                        </Text>
                      </div>
                    </div>
                  </Table.Td>
                  {/* <Table.Td ta={"center"}>
                    <Text size="xs" fw={700} c="lime">
                      S/ {formatNumber(carga.neto_a_pagar)}
                    </Text>
                  </Table.Td> */}
                </>
              )}
              <Table.Td ta={"center"}>
                {onConfirmarLlegada ? (
                  <Button
                    size="xs"
                    radius="md"
                    color="teal"
                    variant="light"
                    leftSection={<CheckCircleIcon className="w-3.5 h-3.5" />}
                    onClick={() => onConfirmarLlegada(carga)}
                    className="font-semibold"
                  >
                    Confirmar llegada
                  </Button>
                ) : (
                  <Text size="xs" c="dimmed">
                    —
                  </Text>
                )}
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
};
