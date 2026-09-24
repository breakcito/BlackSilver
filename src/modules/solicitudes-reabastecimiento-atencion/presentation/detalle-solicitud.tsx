import {
  Badge,
  Group,
  Loader,
  Paper,
  Stack,
  Table,
  Text,
  ActionIcon,
  Tooltip,
  Button,
  Textarea,
  Checkbox,
} from "@mantine/core";
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  TruckIcon,
  UserIcon,
  MapPinIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  NoSymbolIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";

import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { useDetalleSolicitud } from "../hooks/useDetalleSolicitud";
import { HeaderCard, InfoItem } from "./components/detail-elements";
import type { DetalleSolicitudExtendido } from "../service/solicitudes-atencion.responses";
import { formatNumber } from "../../../shared/functions/formatNumber";
import { RegistroEntrega } from "./registro-entrega/registro-entrega";
import { HistorialEntregas } from "./historial-entregas";
import { TrazabilidadDetalle } from "./trazabilidad-detalle";
import { RegistrarPrestamoAlmacen } from "./registrar-prestamo-almacen";
import { HandRaisedIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import type { RES_Solicitud } from "../../../service/responses/solicitudes-reabastecimiento/solicitud";
import { Estado_SolicitudDetalle } from "../../../shared/enums/solicitud-reabastecimiento/solicitud";
import { NuevaCotizacionDesdeSolicitud } from "../../cotizaciones/presentation/components/nueva-cotizacion-solicitud";
import { ModalSeleccionAuditable } from "../../cotizaciones/presentation/components/modal-seleccion-auditable";
import { useDisclosure } from "@mantine/hooks";
import { useState } from "react";

interface DetalleSolicitudProps {
  solicitud: RES_Solicitud;
  onSuccess: () => void;
}

export const DetalleSolicitud = ({
  solicitud,
  onSuccess,
}: DetalleSolicitudProps) => {
  // State del modal "Cotizar desde Solicitud". Vive aqui (no en el hook) porque
  // depende de los items seleccionados que son UI-only.
  const [openedCotizar, { open: openCotizar, close: closeCotizar }] =
    useDisclosure(false);
  // Modal intermedio: cuando los items seleccionados mezclan productos
  // auditables y no auditables, el usuario debe elegir subset antes de cotizar.
  const [
    openedModalAuditable,
    { open: openModalAuditable, close: closeModalAuditable },
  ] = useDisclosure(false);
  // Items filtrados que se pasan a NuevaCotizacionDesdeSolicitud. Cuando
  // hay mezcla, queda seteado al subset elegido en el modal intermedio.
  const [itemsParaCotizar, setItemsParaCotizar] = useState<
    DetalleSolicitudExtendido[]
  >([]);

  const handleCotizarClick = () => {
    const seleccionados = detalles.filter((d) =>
      selectedItemsIds.includes(d.id_solicitud_detalle),
    );
    if (seleccionados.length === 0) return;

    const auditables = seleccionados.filter((d) => d.es_auditable);
    const noAuditables = seleccionados.filter((d) => !d.es_auditable);

    if (auditables.length === 0 || noAuditables.length === 0) {
      // Sin mezcla: el subset es TODOS los seleccionados. Ir directo.
      setItemsParaCotizar(seleccionados);
      openCotizar();
      return;
    }

    // Hay mezcla: pedirle al usuario que elija.
    setItemsParaCotizar(seleccionados);
    openModalAuditable();
  };

  const handleElegirAuditable = (subset: "auditable" | "no_auditable") => {
    setItemsParaCotizar((prev) =>
      prev.filter((d) =>
        subset === "auditable" ? d.es_auditable : !d.es_auditable,
      ),
    );
    closeModalAuditable();
    openCotizar();
  };

  const {
    loading,
    detalles,
    openedTrace,
    openTrace,
    closeTrace,
    openedRechazo,
    openRechazo,
    closeRechazo,
    openedAprobar,
    openAprobar,
    closeAprobar,
    openedEntrega,
    openEntrega,
    closeEntrega,
    openedHistorial,
    openHistorial,
    closeHistorial,
    selectedItemId,
    setSelectedItemId,
    selectedItemName,
    setSelectedItemName,
    comentarioAccion,
    setComentarioAccion,
    isProcessing,
    progresoGeneral,
    handleAprobar,
    handleRechazar,
    getStatusColor,
    loadData,
    selectedItemsIds,
    setSelectedItemsIds,
    toggleItemSelection,
    idsParaAccionMasiva,
    toggleSeleccionMasiva,
    isAllPendingSelected,
    seleccionarTodoLoPendiente,
    isAllEligibleSelected,
    toggleSelectAllEligible,
    openedPrestamo,
    openPrestamo,
    closePrestamo,
  } = useDetalleSolicitud({
    idSolicitud: solicitud.id_solicitud,
    onSuccess,
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader color="indigo" size="lg" />
      </div>
    );
  }

  return (
    <Stack gap="xl" className="pb-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-2">
        <HeaderCard
          icon={UserIcon}
          label="Solicitante"
          value={solicitud.solicitado_por}
          color="indigo"
        />
        <HeaderCard
          icon={CheckBadgeIcon}
          label="Cód. Solicitud"
          value={solicitud.correlativo}
          color="violet"
        />
        <HeaderCard
          icon={MapPinIcon}
          label="Almacén Solicitante"
          value={solicitud.almacen_solicitante}
          color="amber"
        />
        <Paper
          p="md"
          radius="lg"
          className="bg-zinc-500/10 border border-zinc-500/20 relative overflow-hidden group hover:bg-zinc-500/20 transition-all"
        >
          <ClockIcon className="absolute -right-2 -bottom-2 w-16 h-16 text-zinc-400/10 rotate-12 group-hover:scale-110 transition-transform" />
          <Stack gap={2} className="relative z-10 w-full h-full">
            <Group gap={6}>
              <ClockIcon className="w-4 h-4 text-zinc-500" />
              <Text
                size="xs"
                c="zinc.5"
                fw={800}
                className="uppercase tracking-widest"
              >
                Fecha Requerida
              </Text>
            </Group>
            <Text
              size="md"
              fw={800}
              className="text-zinc-100 tracking-tight leading-tight font-mono"
            >
              {solicitud.fecha_entrega_requerida ? (
                dayjs(solicitud.fecha_entrega_requerida).format("DD/MM/YYYY")
              ) : (
                <span className="text-zinc-500 text-sm font-normal italic">
                  No especificada
                </span>
              )}
            </Text>
          </Stack>
        </Paper>
      </div>

      <Paper
        p="md"
        radius="lg"
        className="bg-transparent border border-zinc-800/50 mx-2"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <InfoItem
            label="Prioridad"
            value={solicitud.premura}
            color="orange"
          />
          <InfoItem label="Estado" value={solicitud.estado} color="green" />
          <InfoItem
            label="Fecha de Registro"
            value={dayjs(solicitud.created_at).format("DD/MM/YYYY HH:mm")}
            icon={ClockIcon}
            isMono
          />
          {solicitud.correlativo_requerimiento && (
            <InfoItem
              label="Ref. Requerimiento"
              value={`${solicitud.correlativo_requerimiento}`}
              color="indigo"
            />
          )}
        </div>
      </Paper>

      <Paper
        p="md"
        radius="xl"
        className="bg-zinc-900/50 border border-zinc-800"
      >
        <Group justify="space-between" mb={8} px={4}>
          <Text
            size="xs"
            fw={800}
            className="text-zinc-400 tracking-tighter uppercase"
          >
            Progreso General de Atención
          </Text>
          <Text size="sm" fw={900} c="indigo.4">
            {progresoGeneral}%
          </Text>
        </Group>
        <div className="relative h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-linear-to-r from-indigo-500 to-indigo-400 transition-all duration-1000"
            style={{ width: `${progresoGeneral}%` }}
          />
        </div>
      </Paper>

      <div className="space-y-4">
        <Group justify="space-between" align="center" px={4}>
          <Group gap="xs">
            <div className="p-1.5 bg-indigo-500/10 rounded-lg">
              <TruckIcon className="w-5 h-5 text-indigo-400" />
            </div>
            <Text
              fw={800}
              className="text-zinc-100 italic tracking-tight text-lg"
            >
              Items de Solicitud
            </Text>
          </Group>
          <Group gap="sm">
            <Button
              variant="light"
              color="indigo"
              size="xs"
              leftSection={<ClockIcon className="w-4 h-4" />}
              onClick={openHistorial}
            >
              Historial de Entregas
            </Button>
            <Tooltip
              disabled={
                !detalles.some(
                  (d) =>
                    d.estado === Estado_SolicitudDetalle.EsperandoAprobacion,
                )
              }
              label="La solicitud debe estar aprobada para solicitar un préstamo entre almacenes"
              position="top"
              withArrow
            >
              <span>
                <Button
                  variant="light"
                  color="orange"
                  size="xs"
                  leftSection={<HandRaisedIcon className="w-4 h-4" />}
                  onClick={openPrestamo}
                  disabled={detalles.some(
                    (d) =>
                      d.estado === Estado_SolicitudDetalle.EsperandoAprobacion,
                  )}
                >
                  Solicitar Préstamo
                </Button>
              </span>
            </Tooltip>
            <Tooltip
              label={
                selectedItemsIds.length === 0
                  ? "Selecciona items de la solicitud para poder cotizar"
                  : "Cotizar los items seleccionados a proveedores"
              }
              position="top"
              withArrow
            >
              <Button
                variant="light"
                color="teal"
                size="xs"
                leftSection={<DocumentTextIcon className="w-4 h-4" />}
                onClick={handleCotizarClick}
                disabled={selectedItemsIds.length === 0}
              >
                Cotizar ({selectedItemsIds.length})
              </Button>
            </Tooltip>
            <Button
              color="indigo"
              size="xs"
              leftSection={<TruckIcon className="w-4 h-4" />}
              disabled={selectedItemsIds.length === 0}
              onClick={openEntrega}
            >
              Registrar Entrega ({selectedItemsIds.length})
            </Button>

            {detalles.some(
              (d) => d.estado === Estado_SolicitudDetalle.EsperandoAprobacion,
            ) && (
              <>
                <Button
                  color="green"
                  variant="filled"
                  size="xs"
                  leftSection={<CheckCircleIcon className="w-4 h-4" />}
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
                  leftSection={<XCircleIcon className="w-4 h-4" />}
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

            <Badge variant="light" color="indigo" radius="md">
              {detalles.length} Productos
            </Badge>
          </Group>
        </Group>

        <div className="overflow-hidden border border-zinc-800 rounded-2xl shadow-2xl bg-zinc-950/20">
          <Table verticalSpacing="md" horizontalSpacing="xl">
            <thead className="bg-zinc-900/80 text-zinc-400 text-xs font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4 text-center w-12">#</th>
                <th className="px-4 py-4 text-center w-10">
                  {detalles.some(
                    (d) =>
                      (d.estado === Estado_SolicitudDetalle.Aprobado ||
                        d.estado === Estado_SolicitudDetalle.EnDespacho ||
                        d.estado ===
                          Estado_SolicitudDetalle.SolicitandoPrestamo) &&
                      d.pendiente_base > 0,
                  ) && (
                    <div className="flex justify-center">
                      <Checkbox
                        checked={isAllEligibleSelected}
                        onChange={toggleSelectAllEligible}
                        color="indigo"
                        size="xs"
                        className="cursor-pointer translate-y-px"
                      />
                    </div>
                  )}
                </th>
                <th className="px-6 py-4 text-left">Producto</th>
                <th className="px-6 py-4 text-center">Cantidad Solicitada</th>
                <th className="px-6 py-4 text-center w-44">Progreso</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-center w-36">
                  <Group gap={4} justify="center">
                    <span>Acciones</span>
                    {detalles.some(
                      (d) =>
                        d.estado ===
                        Estado_SolicitudDetalle.EsperandoAprobacion,
                    ) && (
                      <Tooltip label="Seleccionar todos los pendientes">
                        <Checkbox
                          size="xs"
                          color="indigo"
                          checked={isAllPendingSelected}
                          onChange={seleccionarTodoLoPendiente}
                        />
                      </Tooltip>
                    )}
                  </Group>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {detalles.map((item: DetalleSolicitudExtendido, idx: number) => {
                // El item fue cargado con smart calc si el backend persiste
                // los 4 campos de magnitud. En ese caso mostramos el formato
                // "items x unidad/ítem = total base" en lugar del clasico.
                const usaMagnitud =
                  Number(item.con_magnitud ?? 0) === 1 &&
                  typeof item.cantidad_items === "number" &&
                  item.cantidad_items > 0 &&
                  typeof item.valor_magnitud === "number" &&
                  typeof item.valor_magnitud_base === "number";
                return (
                <tr
                  key={item.id_solicitud_detalle}
                  className="hover:bg-zinc-900/40 transition-colors group"
                >
                  <td className="px-6 py-4 text-center text-xs font-mono text-zinc-500">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-4 text-center">
                    {(item.estado === Estado_SolicitudDetalle.Aprobado ||
                      item.estado === Estado_SolicitudDetalle.EnDespacho ||
                      item.estado ===
                        Estado_SolicitudDetalle.SolicitandoPrestamo) &&
                    item.pendiente_base > 0 ? (
                      <Checkbox
                        checked={selectedItemsIds.includes(
                          item.id_solicitud_detalle,
                        )}
                        onChange={() =>
                          toggleItemSelection(item.id_solicitud_detalle)
                        }
                        color="indigo"
                        size="sm"
                      />
                    ) : (
                      <div className="flex justify-center">
                        <NoSymbolIcon className="w-5 h-5 text-gray-500" />
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

                        return (
                          <Group gap={4}>
                            <Badge
                              variant="light"
                              color={
                                stock <= 0
                                  ? "red"
                                  : stock < pendiente
                                    ? "orange"
                                    : "green"
                              }
                              size="xs"
                              radius="sm"
                            >
                              Stock: {formatNumber(stock)}{" "}
                              {item.unidad_medida_base_abv}
                            </Badge>
                            {item.cantidad_prestada_total_base > 0 && (
                              <Tooltip label="Cantidad total prestada desde otros almacenes">
                                <Badge
                                  variant="filled"
                                  color="orange"
                                  size="xs"
                                  radius="sm"
                                >
                                  Prestado:{" "}
                                  {formatNumber(
                                    item.cantidad_prestada_total_base,
                                  )}
                                </Badge>
                              </Tooltip>
                            )}
                          </Group>
                        );
                      })()}
                    </Stack>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Group justify="center" gap={4}>
                      {usaMagnitud ? (
                        // Modelo "magnitud por item": mostramos
                        // "items x unidad/ítem = total base".
                        <>
                          <Badge
                            variant="filled"
                            color="cyan"
                            radius="sm"
                            className="font-bold shadow-xs whitespace-nowrap"
                          >
                            {formatNumber(item.cantidad_items ?? 0)}
                          </Badge>
                          <Badge
                            variant="filled"
                            color="zinc"
                            radius="sm"
                            size="sm"
                            className="font-black px-4"
                          >
                            × {formatNumber(item.valor_magnitud ?? 0)}{" "}
                            {item.unidad_medida_sol_abv}
                          </Badge>
                          <Badge
                            variant="filled"
                            color="pink"
                            radius="sm"
                            className="font-bold shadow-xs whitespace-nowrap"
                          >
                            = {formatNumber(item.valor_magnitud_base ?? 0)}{" "}
                            {item.unidad_medida_base_abv}
                          </Badge>
                        </>
                      ) : (
                        // Modelo clasico: "cantidad en unidad detalle x factor".
                        <>
                          <Badge
                            variant="filled"
                            color="cyan"
                            radius="sm"
                            className="font-bold shadow-xs whitespace-nowrap"
                          >
                            {formatNumber(item.cantidad_solicitada)}{" "}
                            {item.unidad_medida_sol_abv}
                          </Badge>{" "}
                          {item.unidad_medida_base_abv !==
                            item.unidad_medida_sol_abv && (
                            <>
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
                                {item.unidad_medida_sol_abv}
                              </Badge>
                              <Badge
                                variant="filled"
                                color="pink"
                                radius="sm"
                                className="font-bold shadow-xs whitespace-nowrap"
                              >
                                {formatNumber(item.cantidad_solicitada_base)}{" "}
                                {item.unidad_medida_base_abv}
                              </Badge>
                            </>
                          )}
                        </>
                      )}
                    </Group>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col gap-1.5 w-full">
                      <div className="flex justify-between items-center px-1">
                        <Text size="10px" fw={800} c="zinc.5">
                          Entregado: {formatNumber(item.cantidad_entregada)}{" "}
                          {item.unidad_medida_sol_abv}
                        </Text>
                        <Text size="10px" fw={900} c="indigo.4">
                          {item.porcentaje_progreso}%
                        </Text>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 transition-all duration-700"
                          style={{ width: `${item.porcentaje_progreso}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Stack gap={4} align="center">
                      <Badge
                        variant="light"
                        color={getStatusColor(item.estado)}
                        radius="md"
                        size="sm"
                        className="font-bold uppercase"
                      >
                        {item.estado}
                      </Badge>
                      {item.comentario_decision && (
                        <Tooltip label={item.comentario_decision} withArrow>
                          <Text
                            size="10px"
                            fw={700}
                            c="orange.4"
                            className="max-w-32 truncate"
                          >
                            {item.comentario_decision}
                          </Text>
                        </Tooltip>
                      )}
                    </Stack>
                  </td>
                  <td className="px-6 py-4">
                    <Group gap={8} justify="center" wrap="nowrap">
                      <Tooltip label="Seguimiento">
                        <ActionIcon
                          variant="subtle"
                          color="zinc"
                          onClick={() => {
                            setSelectedItemId(item.id_solicitud_detalle);
                            setSelectedItemName(item.producto);
                            openTrace();
                          }}
                        >
                          <ClockIcon className="w-4 h-4" />
                        </ActionIcon>
                      </Tooltip>
                      {item.estado ===
                        Estado_SolicitudDetalle.EsperandoAprobacion && (
                        <>
                          <Tooltip label="Aprobar">
                            <ActionIcon
                              variant="filled"
                              color="green"
                              onClick={() => {
                                setSelectedItemId(item.id_solicitud_detalle);
                                openAprobar();
                              }}
                              disabled={
                                !!isProcessing &&
                                isProcessing === item.id_solicitud_detalle
                              }
                            >
                              <CheckCircleIcon className="w-5 h-5" />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Rechazar">
                            <ActionIcon
                              variant="filled"
                              color="red"
                              onClick={() => {
                                setSelectedItemId(item.id_solicitud_detalle);
                                openRechazo();
                              }}
                              disabled={
                                !!isProcessing &&
                                isProcessing === item.id_solicitud_detalle
                              }
                            >
                              <XCircleIcon className="w-5 h-5" />
                            </ActionIcon>
                          </Tooltip>

                          <Tooltip label="Acción masiva">
                            <Checkbox
                              size="xs"
                              color="indigo"
                              checked={idsParaAccionMasiva.includes(
                                item.id_solicitud_detalle,
                              )}
                              onChange={() =>
                                toggleSeleccionMasiva(item.id_solicitud_detalle)
                              }
                              className="ml-1"
                            />
                          </Tooltip>
                        </>
                      )}
                    </Group>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      </div>

      <ModalEstandar
        opened={openedTrace}
        close={closeTrace}
        title="Seguimiento de Producto"
        size="md"
      >
        {selectedItemId && (
          <TrazabilidadDetalle
            idDetalle={selectedItemId}
            productoNombre={selectedItemName}
          />
        )}
      </ModalEstandar>

      <ModalEstandar
        opened={openedRechazo}
        close={closeRechazo}
        title="Rechazar Ítem"
        size="md"
      >
        <Stack gap="md">
          <Paper
            p="md"
            className="bg-red-500/10 border border-red-900/50 rounded-xl flex items-start gap-4"
          >
            <ExclamationTriangleIcon className="w-8 h-8 text-red-400 mt-1" />
            <Text size="sm" className="text-red-100 italic">
              {selectedItemId
                ? "Esta acción marcará el producto como rechazado."
                : `Esta acción marcará ${idsParaAccionMasiva.length} productos como rechazados.`}
            </Text>
          </Paper>
          <Textarea
            label="Motivo del rechazo"
            placeholder="Escriba aquí..."
            minRows={4}
            value={comentarioAccion}
            onChange={(e) => setComentarioAccion(e.currentTarget.value)}
          />
          <Group justify="end">
            <Button variant="subtle" color="zinc" onClick={closeRechazo}>
              Cancelar
            </Button>
            <Button
              color="red"
              disabled={!comentarioAccion.trim() || isProcessing !== null}
              loading={isProcessing !== null}
              onClick={handleRechazar}
            >
              Rechazar
            </Button>
          </Group>
        </Stack>
      </ModalEstandar>

      <ModalEstandar
        opened={openedAprobar}
        close={closeAprobar}
        title="Aprobar Ítem"
        size="md"
      >
        <Stack gap="md">
          <Paper
            p="md"
            className="bg-green-500/10 border border-green-900/50 rounded-xl flex items-start gap-4"
          >
            <CheckCircleIcon className="w-8 h-8 text-green-400 mt-1" />
            <Text size="sm" className="text-green-100 italic">
              {selectedItemId
                ? "¿Desea aprobar este producto? Puede ingresar un comentario opcional."
                : `¿Desea aprobar ${idsParaAccionMasiva.length} productos? Puede ingresar un comentario opcional.`}
            </Text>
          </Paper>
          <Textarea
            label="Comentario (Opcional)"
            placeholder="Escriba aquí..."
            minRows={4}
            value={comentarioAccion}
            onChange={(e) => setComentarioAccion(e.currentTarget.value)}
          />
          <Group justify="end">
            <Button variant="subtle" color="zinc" onClick={closeAprobar}>
              Cancelar
            </Button>
            <Button
              color="green"
              loading={isProcessing !== null}
              onClick={handleAprobar}
            >
              Aprobar
            </Button>
          </Group>
        </Stack>
      </ModalEstandar>

      <ModalEstandar
        opened={openedEntrega}
        close={closeEntrega}
        title="Registrar Entrega"
        size="65%"
      >
        <RegistroEntrega
          idSolicitud={solicitud.id_solicitud}
          idEmpleadoSolicitante={solicitud.id_empleado_solicitante}
          selectedDetalles={detalles.filter((d) =>
            selectedItemsIds.includes(d.id_solicitud_detalle),
          )}
          onSuccess={() => {
            closeEntrega();
            setSelectedItemsIds([]);
            loadData(true);
            onSuccess();
          }}
          onCancel={closeEntrega}
        />
      </ModalEstandar>

      <ModalEstandar
        opened={openedHistorial}
        close={closeHistorial}
        title="Historial de Entregas"
        size="70%"
      >
        <HistorialEntregas idSolicitud={solicitud.id_solicitud} />
      </ModalEstandar>
      <ModalEstandar
        opened={openedPrestamo}
        close={closePrestamo}
        title="Solicitar un Préstamo"
        size="75%"
      >
        <RegistrarPrestamoAlmacen
          solicitud={solicitud}
          detalles={detalles}
          onSuccess={() => {
            closePrestamo();
            loadData(true);
          }}
          onCancel={closePrestamo}
        />
      </ModalEstandar>

      <NuevaCotizacionDesdeSolicitud
        opened={openedCotizar}
        onClose={closeCotizar}
        idSolicitud={solicitud.id_solicitud}
        items={itemsParaCotizar.map((d: DetalleSolicitudExtendido) => ({
          id_solicitud_reabastecimiento_detalle: d.id_solicitud_detalle,
          id_producto: d.id_producto,
          id_unidad_medida_base: d.id_unidad_medida_base,
          cantidad_solicitada_base: d.cantidad_solicitada_base,
        }))}
        onSuccess={() => {
          loadData(true);
        }}
      />

      <ModalSeleccionAuditable
        opened={openedModalAuditable}
        onClose={closeModalAuditable}
        auditables={itemsParaCotizar
          .filter((d: DetalleSolicitudExtendido) => d.es_auditable)
          .map((d: DetalleSolicitudExtendido) => ({
            id: d.id_producto,
            nombre: d.producto,
          }))}
        noAuditables={itemsParaCotizar
          .filter((d: DetalleSolicitudExtendido) => !d.es_auditable)
          .map((d: DetalleSolicitudExtendido) => ({
            id: d.id_producto,
            nombre: d.producto,
          }))}
        onElegir={handleElegirAuditable}
      />
    </Stack>
  );
};
