import {
  Badge,
  Group,
  Table,
  Text,
  ActionIcon,
  Tooltip,
  Button,
  Checkbox,
  Stack,
} from "@mantine/core";
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  TruckIcon,
  PaperAirplaneIcon,
  NoSymbolIcon,
} from "@heroicons/react/24/outline";
import { Estado_RequerimientoDetalle } from "../../../../../shared/enums/requerimiento-almacen/requerimiento";
import { formatNumber } from "../../../../../shared/functions/formatNumber";
import type { DetalleRequerimientoExtendido } from "../../../service/atencion.responses";
import { enPlural } from "../../../../../shared/functions/en-plural";

interface InfoItemsTableProps {
  detalles: DetalleRequerimientoExtendido[];
  selectedItemsIds: number[];
  toggleItemSelection: (id: number) => void;
  isAllEligibleSelected: boolean;
  hasPartialEligibleSelection: boolean;
  toggleSelectAllEligible: () => void;
  openHistorialGlobal: () => void;
  openEntregaBatch: () => void;
  idsParaAccionMasiva: number[];
  setSelectedItemId: (id: number | null) => void;
  openAprobar: () => void;
  openRechazo: () => void;
  logistica: { open: () => void };
  isAllPendingSelected: boolean;
  seleccionarTodoLoPendiente: () => void;
  getStatusColor: (status: string) => string;
  toggleSeleccionMasiva: (id: number) => void;
  setSelectedItemName: (name: string) => void;
  openTrace: () => void;
  isProcessing: number | null;
  /**
   * True cuando el requerimiento padre esta anulado.
   * Deshabilita toda interaccion de seleccion / despacho.
   */
  deshabilitadoPorAnulacion?: boolean;
}

export const InfoItemsTable = ({
  detalles,
  selectedItemsIds,
  toggleItemSelection,
  isAllEligibleSelected,
  hasPartialEligibleSelection,
  toggleSelectAllEligible,
  openHistorialGlobal,
  openEntregaBatch,
  idsParaAccionMasiva,
  setSelectedItemId,
  openAprobar,
  openRechazo,
  logistica,
  isAllPendingSelected,
  seleccionarTodoLoPendiente,
  getStatusColor,
  toggleSeleccionMasiva,
  setSelectedItemName,
  openTrace,
  isProcessing,
  deshabilitadoPorAnulacion = false,
}: InfoItemsTableProps) => {
  return (
    <div className="space-y-4">
      <Group justify="space-between" align="center" px={4}>
        <Group gap="xs">
          <div className="p-1.5 bg-indigo-500/10 rounded-lg">
            <TruckIcon className="size-5 text-indigo-400" />
          </div>
          <Text
            fw={700}
            className="text-zinc-100 italic tracking-tight text-sm"
          >
            Items Solicitados
          </Text>
        </Group>
        <Group gap="sm">
          <Button
            variant="light"
            color="indigo"
            size="xs"
            leftSection={<ClockIcon className="size-4" />}
            onClick={openHistorialGlobal}
          >
            Historial de Entregas
          </Button>
          <Button
            color="indigo"
            size="xs"
            leftSection={<TruckIcon className="size-4" />}
            disabled={selectedItemsIds.length === 0 || deshabilitadoPorAnulacion}
            onClick={openEntregaBatch}
          >
            Nueva Entrega
          </Button>
          {detalles.some(
            (d) =>
              d.estado ===
              Estado_RequerimientoDetalle.EsperandoAprobacion.toString(),
          ) && (
            <>
              <Button
                color="green"
                variant="filled"
                size="xs"
                leftSection={<CheckCircleIcon className="size-4" />}
                disabled={idsParaAccionMasiva.length === 0}
                onClick={() => {
                  setSelectedItemId(null);
                  openAprobar();
                }}
              >
                Aprobar ({idsParaAccionMasiva.length})
              </Button>
              <Button
                color="red"
                variant="filled"
                size="xs"
                leftSection={<XCircleIcon className="size-4" />}
                disabled={idsParaAccionMasiva.length === 0}
                onClick={() => {
                  setSelectedItemId(null);
                  openRechazo();
                }}
              >
                Rechazar ({idsParaAccionMasiva.length})
              </Button>
            </>
          )}
          <Button
            color="blue"
            variant="light"
            size="xs"
            leftSection={<PaperAirplaneIcon className="size-4" />}
            disabled={
              !detalles.some(
                (d) =>
                  d.estado ===
                  Estado_RequerimientoDetalle.EsperandoAprobacion.toString(),
              )
            }
            onClick={logistica.open}
          >
            Consultar con Logística
          </Button>
          <Badge variant="light" color="indigo" radius="md">
            {detalles.length} {detalles.length === 1 ? "Producto" : "Productos"}
          </Badge>
        </Group>
      </Group>

      <div className="overflow-x-auto border border-zinc-800 rounded-2xl shadow-2xl bg-zinc-950/20">
        <Table verticalSpacing="md" horizontalSpacing="xl">
          <thead className="bg-zinc-900/80 text-zinc-400 text-xs font-bold tracking-wider">
            <tr>
              <th className="px-6 py-4 text-center flex flex-row gap-3 justify-center items-center">
                #
                {detalles.some(
                  (d) =>
                    d.estado ===
                      Estado_RequerimientoDetalle.Aprobado.toString() ||
                    d.estado ===
                      Estado_RequerimientoDetalle.EnDespacho.toString(),
                ) && (
                  <div className="flex justify-center">
                    <Checkbox
                      checked={isAllEligibleSelected}
                      indeterminate={hasPartialEligibleSelection}
                      onChange={toggleSelectAllEligible}
                      color="indigo"
                      size="xs"
                      disabled={deshabilitadoPorAnulacion}
                      className={
                        deshabilitadoPorAnulacion
                          ? "cursor-not-allowed translate-y-px"
                          : "cursor-pointer translate-y-px"
                      }
                    />
                  </div>
                )}
              </th>
              <th className="px-6 py-4 text-left">Producto</th>
              <th className="px-6 py-4 text-center min-w-45">
                Cantidad solicitada
              </th>
              <th className="px-6 py-4 text-center w-44">Progreso</th>
              <th className="px-6 py-4 text-left">Destino / Comentario</th>
              <th className="px-6 py-4 text-center">Estado</th>
              <th className="px-6 py-4 text-center w-48">
                <Group gap={4} justify="center">
                  <span>Acciones</span>
                  {detalles.some(
                    (d) =>
                      d.estado ===
                      Estado_RequerimientoDetalle.EsperandoAprobacion.toString(),
                  ) && (
                    <Tooltip label="Seleccionar todos los pendientes">
                      <Checkbox
                        size="xs"
                        color="indigo"
                        checked={isAllPendingSelected}
                        onChange={seleccionarTodoLoPendiente}
                        disabled={deshabilitadoPorAnulacion}
                      />
                    </Tooltip>
                  )}
                </Group>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {detalles.map(
              (item: DetalleRequerimientoExtendido, idx: number) => (
                <tr
                  key={item.id_requerimiento_almacen_detalle}
                  className="hover:bg-zinc-900/40 transition-colors group"
                >
                  <td className="px-6 py-4 text-center text-xs font-mono text-zinc-500 flex flex-row items-center justify-center gap-3">
                    {idx + 1}
                    {item.estado ===
                      Estado_RequerimientoDetalle.Aprobado.toString() ||
                    item.estado ===
                      Estado_RequerimientoDetalle.AprobadoLogistica.toString() ||
                    item.estado ===
                      Estado_RequerimientoDetalle.EnDespacho.toString() ? (
                      <Checkbox
                        checked={selectedItemsIds.includes(
                          item.id_requerimiento_almacen_detalle,
                        )}
                        onChange={() =>
                          toggleItemSelection(
                            item.id_requerimiento_almacen_detalle,
                          )
                        }
                        color="indigo"
                        size="sm"
                        disabled={deshabilitadoPorAnulacion}
                        className={
                          deshabilitadoPorAnulacion
                            ? "cursor-not-allowed"
                            : "cursor-pointer"
                        }
                      />
                    ) : (
                      <div
                        className="flex justify-center"
                        title="No se puede despachar este producto"
                      >
                        <NoSymbolIcon className="size-5 text-gray-500" />
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <Stack gap={4}>
                      <Text
                        size="sm"
                        fw={800}
                        className="text-zinc-100 group-hover:text-indigo-400 transition-colors tracking-tight"
                      >
                        {item.producto}
                      </Text>
                      {(() => {
                        const stock = Number(item.stock_disponible_base || 0);
                        const pendiente = item.pendiente_base;

                        if (stock <= 0) {
                          return (
                            <Badge
                              variant="light"
                              color="red"
                              size="xs"
                              radius="sm"
                            >
                              Sin stock
                            </Badge>
                          );
                        }

                        if (stock < pendiente) {
                          return (
                            <Badge
                              variant="light"
                              color="orange"
                              size="xs"
                              radius="sm"
                            >
                              Stock insuficiente
                            </Badge>
                          );
                        }

                        return (
                          <Badge
                            variant="light"
                            color="green"
                            size="xs"
                            radius="sm"
                          >
                            Stock disponible
                          </Badge>
                        );
                      })()}
                    </Stack>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-row gap-0.5 justify-center items-center flex-wrap">
                      {Number(item.con_magnitud) === 1 &&
                        item.cantidad_items !== null &&
                        item.cantidad_items !== undefined &&
                        item.valor_magnitud !== null &&
                        item.valor_magnitud !== undefined && (
                          <div className="flex flex-col items-center justify-center">
                            <Badge
                              variant="filled"
                              color="violet"
                              radius="sm"
                              size="sm"
                              className="font-black px-4"
                            >
                              {formatNumber(item.cantidad_items)}{" "}
                              {enPlural(item.producto, item.cantidad_items)}
                            </Badge>
                            <Badge
                              variant="filled"
                              color="zinc"
                              radius="sm"
                              size="sm"
                              className="font-black px-4"
                            >
                              × {formatNumber(item.valor_magnitud)}{" "}
                              {item.unidad_medida_req_abv}{" "}
                              <span className="lowercase">c/u</span>
                            </Badge>
                          </div>
                        )}

                      <div className="flex flex-col items-center justify-center">
                        <Badge
                          variant="filled"
                          color="cyan.7"
                          radius="sm"
                          size="sm"
                          className="font-black px-4"
                        >
                          {formatNumber(item.cantidad_solicitada)}{" "}
                          {item.unidad_medida_req_abv}
                        </Badge>
                        {item.id_unidad_medida_base !==
                          item.id_unidad_medida_req && (
                          <Badge
                            variant="filled"
                            color="zinc"
                            radius="sm"
                            size="sm"
                            className="font-black px-4"
                          >
                            {formatNumber(item.contenido_por_presentacion)}{" "}
                            {item.unidad_medida_base_abv}{" "}
                            <span className="lowercase">x</span>{" "}
                            {item.unidad_medida_req_abv}
                          </Badge>
                        )}
                      </div>
                      {item.id_unidad_medida_base !==
                        item.id_unidad_medida_req && (
                        <Badge
                          variant="filled"
                          color="pink"
                          radius="sm"
                          className="font-bold shadow-xs whitespace-nowrap"
                        >
                          {formatNumber(item.cantidad_solicitada_base)}{" "}
                          {item.unidad_medida_base_abv}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col gap-1.5 w-full">
                      <div className="flex justify-between items-center px-1">
                        <Text size="10px" fw={800} c="zinc.5">
                          Atendido: {formatNumber(item.cantidad_entregada)}{" "}
                          {item.unidad_medida_req_abv}
                        </Text>
                        <Text size="10px" fw={900} c="indigo.4">
                          {item.porcentaje_progreso}%
                        </Text>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/30">
                        <div
                          className="h-full bg-linear-to-r from-indigo-600 to-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.3)] transition-all duration-700"
                          style={{ width: `${item.porcentaje_progreso}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <Text
                      size="xs"
                      c="zinc.5"
                      className="italic leading-tight whitespace-pre-wrap"
                    >
                      {item.comentario || (
                        <span className="text-zinc-500">Sin comentarios</span>
                      )}
                    </Text>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Badge
                      variant="light"
                      color={getStatusColor(item.estado)}
                      radius="md"
                      size="sm"
                      className="font-bold px-3 py-2.5"
                    >
                      {item.estado}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Group gap={8} justify="center" wrap="nowrap">
                      <Tooltip label="Ver Seguimiento" position="top" withArrow>
                        <ActionIcon
                          variant="subtle"
                          color="zinc"
                          onClick={() => {
                            setSelectedItemId(
                              item.id_requerimiento_almacen_detalle,
                            );
                            setSelectedItemName(item.producto);
                            openTrace();
                          }}
                        >
                          <ClockIcon className="size-4" />
                        </ActionIcon>
                      </Tooltip>

                      {item.estado ===
                        Estado_RequerimientoDetalle.EsperandoAprobacion.toString() && (
                        <>
                          <Tooltip label="Aprobar" position="top" withArrow>
                            <ActionIcon
                              variant="filled"
                              color="green"
                              onClick={() => {
                                setSelectedItemId(
                                  item.id_requerimiento_almacen_detalle,
                                );
                                openAprobar();
                              }}
                              disabled={isProcessing !== null}
                            >
                              <CheckCircleIcon className="size-5 text-white" />
                            </ActionIcon>
                          </Tooltip>

                          <Tooltip label="Rechazar" position="top" withArrow>
                            <ActionIcon
                              variant="filled"
                              color="red"
                              onClick={() => {
                                setSelectedItemId(
                                  item.id_requerimiento_almacen_detalle,
                                );
                                openRechazo();
                              }}
                              disabled={isProcessing !== null}
                            >
                              <XCircleIcon className="size-5 text-white" />
                            </ActionIcon>
                          </Tooltip>
                        </>
                      )}

                      {item.estado ===
                        Estado_RequerimientoDetalle.EsperandoAprobacion.toString() && (
                        <Tooltip label="Acción masiva" position="top" withArrow>
                          <Checkbox
                            size="xs"
                            color="indigo"
                            checked={idsParaAccionMasiva.includes(
                              item.id_requerimiento_almacen_detalle,
                            )}
                            onChange={() =>
                              toggleSeleccionMasiva(
                                item.id_requerimiento_almacen_detalle,
                              )
                            }
                            className="ml-1"
                          />
                        </Tooltip>
                      )}
                    </Group>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
};
