import { ActionIcon, Badge, Group, Stack, Text, Tooltip } from "@mantine/core";
import { PencilSquareIcon } from "@heroicons/react/24/outline";

import { formatNumber } from "../../../../shared/functions/formatNumber";
import { EstadoCompraCarbon } from "../../../../shared/enums/compra-carbon/estado-compra-carbon";
import type {
  CargaCompraCarbonItem,
  CompraCarbonDetalleResponse,
  CompraCarbonResumen,
} from "../../service/compra-carbon.responses";

interface Props {
  /** Compra a la que pertenece la fila desplegada. */
  compra: CompraCarbonResumen;
  /** Detalle con las cargas. null mientras carga o si falló la consulta. */
  detalle: CompraCarbonDetalleResponse | null;
  /** true mientras se descarga el detalle. */
  loading: boolean;
  /** Callback para editar una carga individual. */
  onEditarCarga?: (carga: CargaCompraCarbonItem) => void;
}

const formatPEN = (n: number | string | null | undefined) =>
  `S/ ${formatNumber(Number(n) || 0)}`;

/**
 * Determina si una carga individual puede editarse. Regla: la cabecera NO
 * debe estar Pagado/Cerrado/Anulado, y la carga NO debe estar Anulada,
 * Pagada, ni tener comprobante/pago/comprobante de transporte asignado.
 * Esto refleja las validaciones del backend.
 */
const puedeEditarCarga = (
  carga: CargaCompraCarbonItem,
  cabecera: CompraCarbonDetalleResponse["cabecera"],
): boolean => {
  if (!cabecera) return false;
  if (
    cabecera.estado === EstadoCompraCarbon.Pagado ||
    cabecera.estado === EstadoCompraCarbon.Cerrado ||
    cabecera.estado === EstadoCompraCarbon.Anulado
  ) {
    return false;
  }
  if (carga.estado === "Anulado" || carga.estado === "Pagado") return false;
  if (
    carga.id_comprobante_compra_carbon ||
    carga.id_pago_compra_carbon ||
    carga.id_comprobante_transporte_carbon
  ) {
    return false;
  }
  return true;
};

/**
 * Detalle de una compra de carbon: la lista de cargas que la componen.
 *
 * Se renderiza dentro de la fila desplegada de la tabla principal (igual
 * que el detalle de una venta de carbon), no en un modal.
 */
export const CompraCarbonDetalle = ({
  compra,
  detalle,
  loading,
  onEditarCarga,
}: Props) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
        <Text size="xs" c="dimmed" className="uppercase tracking-widest">
          Cargando cargas...
        </Text>
      </div>
    );
  }

  if (!detalle) {
    return (
      <div className="flex items-center justify-center py-8">
        <Text size="xs" c="dimmed">
          No se pudo cargar el detalle de la compra.
        </Text>
      </div>
    );
  }

  const cargas = detalle.cargas;

  return (
    <div className="space-y-2 p-4">
      <Group justify="space-between" align="center" mb="xs">
        <Group gap="xs">
          <Text
            size="xs"
            fw={800}
            c="zinc.4"
            className="uppercase tracking-widest"
          >
            Cargas Recibidas ({cargas.length})
          </Text>
          {compra.estado === EstadoCompraCarbon.Cerrado && (
            <Badge color="orange" variant="light" size="xs" radius="sm">
              Compra Cerrada
            </Badge>
          )}
        </Group>
      </Group>

      {cargas.length === 0 ? (
        <div className="border border-dashed border-zinc-800 rounded-2xl p-10 text-center bg-zinc-900/30">
          <Stack align="center" gap="sm">
            <Text size="sm" fw={700} c="zinc.100">
              Sin cargas registradas
            </Text>
            <Text size="xs" c="dimmed" maw={480}>
              Esta orden preliminar aún no tiene cargas o camiones despachados
              por el proveedor. Registra cada cargamento que vaya ingresando a
              planta desde el botón de la columna Cargas.
            </Text>
          </Stack>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-xs text-zinc-300">
            <thead className="bg-zinc-900 text-zinc-400 text-[11px] font-medium uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-center w-8">#</th>
                <th className="py-2 text-center w-24">Tipo</th>
                <th className="px-3 py-2 text-center w-16">Ticket</th>
                <th className="px-3 py-2 text-center w-28">Lugar Ext.</th>
                <th className="px-3 py-2 text-center w-32">Transportista</th>
                <th className="px-3 py-2 text-center w-24">GR / GT</th>
                <th className="px-3 py-2 text-center w-24">Leyes</th>
                <th className="px-3 py-2 text-center w-24">Toneladas</th>
                <th className="px-3 py-2 text-center w-24">Flete x TN</th>
                <th className="px-3 py-2 text-center w-24">Subtotal</th>
                <th className="px-3 py-2 text-center w-24">IGV</th>
                <th className="px-3 py-2 text-center w-24">Detr.</th>
                <th className="px-3 py-2 text-center w-24">Neto</th>
                <th className="px-3 py-2 text-center w-32">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-900/40">
              {cargas.map((d: CargaCompraCarbonItem, idx: number) => (
                <tr
                  key={d.id_carga_compra_carbon}
                  className="hover:bg-white/5 transition-colors"
                >
                  <td className="px-3 py-2 text-center text-zinc-500">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-2 flex justify-center">
                    <Stack gap={4} justify="center" align="center">
                      <Text fw={700} c="zinc.100" size="xs">
                        {d.tipo_carbon_nombre}
                      </Text>
                      {d.tipo_carbon_codigo && (
                        <Badge
                          size="xs"
                          color="cyan"
                          variant="filled"
                          radius="sm"
                        >
                          {d.tipo_carbon_codigo}
                        </Badge>
                      )}
                    </Stack>
                  </td>
                  <td className="px-3 py-2 font-mono text-zinc-300 text-center">
                    {d.codigo_ticket_balanza || <Text c="dimmed">—</Text>}
                  </td>
                  <td className="px-3 py-2 text-center text-zinc-300">
                    {d.lugar_extraccion_direccion || <Text c="dimmed">—</Text>}
                  </td>
                  <td className="px-3 py-2 text-zinc.100 text-center">
                    {d.transportista_razon_social || <Text c="dimmed">—</Text>}
                  </td>
                  <td className="px-3 py-2 flex flex-row justify-center">
                    <div className="flex flex-col items-start justify-center gap-1.5">
                      <Text className="font-mono text-zinc-300" size="xs">
                        GR: {d.guia_remitente || "—"}
                      </Text>
                      <Text className="font-mono text-zinc-300" size="xs">
                        GT: {d.guia_transportista || "—"}
                      </Text>
                    </div>
                  </td>

                  <td className="px-3 py-2 text-center">
                    <div className="flex flex-col gap-2 items-center justify-center">
                      {d.porcentaje_ceniza > 0 ? (
                        <Badge
                          variant="light"
                          color="grape"
                          size="sm"
                          radius="md"
                        >
                          {formatNumber(Number(d.porcentaje_ceniza))} %Ce
                        </Badge>
                      ) : (
                        <Text c="dimmed">—</Text>
                      )}
                      {d.porcentaje_humedad > 0 ? (
                        <Badge
                          variant="light"
                          color="blue"
                          size="sm"
                          radius="md"
                        >
                          {formatNumber(Number(d.porcentaje_humedad))} %H2O
                        </Badge>
                      ) : (
                        <Text c="dimmed">—</Text>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center font-mono font-bold text-white">
                    <Text size="xs" c={"teal"} fw={800}>
                      {formatNumber(Number(d.cantidad))} TN
                    </Text>
                    <Text size="11px" mt={5} c={"yellow"} fw={600}>
                      {formatPEN(Number(d.precio_unitario))} x TN
                    </Text>
                  </td>

                  <td className="px-3 py-2 text-center">
                    <Text size="xs" fw={700} c={"blue.3"}>
                      {Number(d.costo_flete_por_tonelada) > 0
                        ? formatPEN(Number(d.costo_flete_por_tonelada))
                        : "—"}
                    </Text>
                  </td>

                  <td className="px-3 py-2 text-center">
                    <Text size="xs" fw={800} c={"teal"}>
                      {formatPEN(Number(d.subtotal))}
                    </Text>
                    <Text size="11px" mt={5} c={"yellow"} fw={600}>
                      {formatPEN(Number(d.precio_materia_prima))} M. PRIMA
                    </Text>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Text size="xs" fw={700} c={"gray.4"}>
                      {formatPEN(Number(d.monto_igv))}
                    </Text>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Text size="xs" fw={700} c={"orange.4"}>
                      {formatPEN(Number(d.monto_detraccion))}
                    </Text>
                  </td>
                  <td className="px-3 py-2 text-center font-mono text-emerald-400 font-bold">
                    {formatPEN(Number(d.neto_a_pagar))}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Badge
                        size="xs"
                        variant="light"
                        color={
                          d.estado === "Pagado"
                            ? "emerald"
                            : d.estado === "Anulado"
                              ? "red"
                              : "blue"
                        }
                      >
                        {d.estado || "En Liquidación"}
                      </Badge>
                      {/* Lapicito para editar la carga individual. Solo
                          se muestra si la cabecera y la carga lo permiten. */}
                      {puedeEditarCarga(d, detalle.cabecera) && (
                        <Tooltip
                          label="Editar carga"
                          withArrow
                          position="top"
                        >
                          <ActionIcon
                            variant="subtle"
                            color="indigo"
                            radius="xl"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditarCarga?.(d);
                            }}
                          >
                            <PencilSquareIcon className="w-3.5 h-3.5" />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
