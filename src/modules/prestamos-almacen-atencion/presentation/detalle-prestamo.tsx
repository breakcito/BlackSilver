import {
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  Stack,
  Table,
  Text,
  Textarea,
  Tooltip,
  ActionIcon,
  Checkbox,
  Center,
} from "@mantine/core";
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  TruckIcon,
  UserCircleIcon,
  ClockIcon,
  XCircleIcon,
  BuildingOffice2Icon,
  CheckBadgeIcon,
  NoSymbolIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import { useDetallePrestamo } from "../hooks/useDetallePrestamo";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { RegistrarEntregaModal } from "./registro-entrega/registrar-entrega-modal";
import { HistorialEntregasPrestamo } from "./historial-entregas-prestamo";
import { HistorialReposicionesPrestamo } from "./historial-reposiciones-prestamo";
import { TrazabilidadPrestamo } from "./trazabilidad-prestamo";
import { PrestamoStatusBadge } from "./components/prestamo-status-badge";
import { formatNumber } from "../../../shared/functions/formatNumber";
import { HeaderCard } from "./components/detail-elements";
import type { RES_Prestamo } from "../../../service/responses/prestamos/prestamo";
import { Estado_PrestamoDetalle } from "../../../shared/enums/prestamo-almacen/prestamo";

interface Props {
  prestamo: RES_Prestamo;
  idAlmacenPrestamista: number;
  onDespachoRegistrado: () => void;
}

export const DetallePrestamo = ({
  prestamo,
  idAlmacenPrestamista,
  onDespachoRegistrado,
}: Props) => {
  const {
    loading,
    detalles,
    entregas,
    progresoGeneral,
    // Modales
    openedTrace,
    openTrace,
    closeTrace,
    openedAprobar,
    openAprobar,
    closeAprobar,
    openedRechazo,
    openRechazo,
    closeRechazo,
    openedNuevaEntrega,
    openNuevaEntrega,
    closeNuevaEntrega,
    openedHistorial,
    openHistorial,
    closeHistorial,
    loadingEntregas,
    cargarEntregas,
    // Reposiciones
    reposiciones,
    loadingRepos,
    openedHistorialRepos,
    openHistorialRepos,
    closeHistorialRepos,
    cargarReposiciones,
    // Selección
    selectedItemId,
    setSelectedItemId,
    selectedItemName,
    setSelectedItemName,
    comentarioAccion,
    setComentarioAccion,
    isProcessing,
    trazabilidad,
    loadingTrace,
    obtenerTrazabilidad,
    handleCambiarEstado,
    selectedItemsIds,
    toggleItemSelection,
    deselectAllItems,
    cargarDatos,
    // Masivo
    isAllEligibleSelected,
    hasPartialEligibleSelection,
    toggleSelectAllEligible,
    itemsEligibleIds,
    // Masivo aprobación
    idsParaAccionMasiva,
    toggleSeleccionMasiva,
    isAllPendingSelected,
    seleccionarTodoLoPendiente,
  } = useDetallePrestamo({
    idPrestamo: prestamo.id_prestamo,
    onSuccess: onDespachoRegistrado,
  });

  if (loading) {
    return (
      <Center py={60}>
        <Loader size="lg" color="indigo" />
      </Center>
    );
  }

  return (
    <Stack gap="xl" className="pb-10 font-sans">
      {/* Header: Datos Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-2">
        <HeaderCard
          icon={BuildingOffice2Icon}
          label="Almacén Solicitante"
          value={prestamo.almacen_solicitante}
          color="indigo"
        />
        <HeaderCard
          icon={CheckBadgeIcon}
          label="Cód. Préstamo"
          value={prestamo.correlativo}
          color="violet"
        />
        <HeaderCard
          icon={UserCircleIcon}
          label="Responsable"
          value={prestamo.registrado_por}
          color="amber"
        />
        <HeaderCard
          icon={CalendarDaysIcon}
          label="Fecha Préstamo"
          value={dayjs(prestamo.fecha_hora_prestamo).format("DD/MM/YYYY")}
          color="emerald"
        />
      </div>

      {/* Sub-header: Estados, Fechas y Solicitud Ref */}
      <Paper
        p="md"
        radius="lg"
        bg="transparent"
        className="border border-zinc-800/50 mx-2"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Stack gap={4}>
            <Text
              size="xs"
              c="zinc.5"
              fw={800}
              className="uppercase tracking-widest leading-none mb-1"
            >
              Estado General
            </Text>
            <Badge
              color="indigo"
              variant="light"
              size="sm"
              radius="sm"
              className="border border-indigo-900/30 font-bold"
            >
              {prestamo.estado}
            </Badge>
          </Stack>

          <Stack gap={4}>
            <div className="flex items-center gap-1.5 font-bold">
              <CalendarDaysIcon className="w-3.5 h-3.5 text-rose-500" />
              <Text
                size="xs"
                c="zinc.5"
                fw={800}
                className="uppercase tracking-widest"
              >
                Fecha Registro
              </Text>
            </div>
            <Text size="sm" fw={800} className="text-zinc-100 italic">
              {dayjs(prestamo.created_at).format("DD/MM/YYYY")}
            </Text>
          </Stack>

          <Stack gap={4}>
            <div className="flex items-center gap-1.5 font-bold">
              <CalendarDaysIcon className="w-3.5 h-3.5 text-cyan-500" />
              <Text
                size="xs"
                c="zinc.5"
                fw={800}
                className="uppercase tracking-widest"
              >
                Fecha Límite
              </Text>
            </div>
            <Text size="sm" fw={800} className="text-zinc-100 italic">
              {prestamo.fecha_limite_devolucion
                ? dayjs(prestamo.fecha_limite_devolucion).format("DD/MM/YYYY")
                : "No especificada"}
            </Text>
          </Stack>

          <Stack gap={4}>
            <Text
              size="xs"
              c="zinc.5"
              fw={800}
              className="uppercase tracking-widest leading-none mb-1"
            >
              Solicitud Ref.
            </Text>
            <Badge
              variant="light"
              color="blue"
              radius="sm"
              className="font-black"
            >
              {prestamo.correlativo}
            </Badge>
          </Stack>
        </div>
      </Paper>

      {/* Barra de Progreso */}
      <Paper
        p="md"
        radius="xl"
        className="bg-zinc-900/50 border border-zinc-800 mx-2 shadow-inner"
      >
        <Group justify="space-between" mb={8} px={4}>
          <Text
            size="xs"
            fw={800}
            className="text-zinc-500 tracking-tighter uppercase"
          >
            Progreso General de Atención
          </Text>
          <Text size="sm" fw={900} c="indigo.4">
            {isNaN(progresoGeneral) ? 0 : progresoGeneral}%
          </Text>
        </Group>
        <div className="relative h-2 w-full bg-zinc-800/50 rounded-full overflow-hidden border border-zinc-700/10">
          <div
            className="absolute inset-y-0 left-0 bg-linear-to-r from-indigo-500 via-indigo-400 to-indigo-300 transition-all duration-1000 shadow-[0_0_10px_rgba(99,102,241,0.2)]"
            style={{
              width: `${isNaN(progresoGeneral) ? 0 : progresoGeneral}%`,
            }}
          />
        </div>
      </Paper>

      {/* Listado de Productos */}
      <div className="space-y-4">
        <Group justify="space-between" px={4} align="center">
          <Group gap="xs">
            <div className="p-3.5 rounded-2xl bg-linear-to-br from-indigo-500/20 to-indigo-600/5 border border-indigo-500/20 shadow-inner">
              <ClipboardDocumentListIcon className="w-5 h-5 text-indigo-400" />
            </div>
            <Text fw={700} className="text-sm text-zinc-100">
              Items de la Solicitud
            </Text>
          </Group>

          <Group gap="sm">
            <Button
              variant="light"
              color="teal"
              size="xs"
              radius="md"
              leftSection={<ClockIcon className="w-4 h-4" />}
              onClick={() => {
                cargarReposiciones();
                openHistorialRepos();
              }}
              className="font-bold whitespace-nowrap"
            >
              Historial de Reposiciones
            </Button>
            <Button
              variant="light"
              color="indigo"
              size="xs"
              radius="md"
              leftSection={<ClockIcon className="w-4 h-4" />}
              onClick={() => {
                cargarEntregas();
                openHistorial();
              }}
              className="font-bold whitespace-nowrap"
            >
              Historial de Entregas
            </Button>
            <Button
              color="indigo"
              size="xs"
              radius="md"
              leftSection={<TruckIcon className="w-4 h-4" />}
              disabled={selectedItemsIds.length === 0}
              onClick={openNuevaEntrega}
              className="shadow-indigo-500/10 shadow-lg font-bold"
            >
              Nueva Entrega ({selectedItemsIds.length})
            </Button>

            {detalles.some(
              (d) => d.estado === Estado_PrestamoDetalle.EsperandoAprobacion,
            ) && (
              <>
                <Button
                  color="green"
                  variant="filled"
                  size="xs"
                  radius="md"
                  leftSection={<CheckCircleIcon className="w-4 h-4" />}
                  disabled={idsParaAccionMasiva.length === 0}
                  onClick={() => {
                    setSelectedItemId(null);
                    openAprobar();
                  }}
                  className="font-bold shadow-green-500/10 shadow-lg"
                >
                  Aprobar ({idsParaAccionMasiva.length})
                </Button>
                <Button
                  color="red"
                  variant="filled"
                  size="xs"
                  radius="md"
                  leftSection={<XCircleIcon className="w-4 h-4" />}
                  disabled={idsParaAccionMasiva.length === 0}
                  onClick={() => {
                    setSelectedItemId(null);
                    openRechazo();
                  }}
                  className="font-bold shadow-red-500/10 shadow-lg"
                >
                  Rechazar ({idsParaAccionMasiva.length})
                </Button>
              </>
            )}
            <Badge
              variant="light"
              color="indigo"
              radius="md"
              className="font-black px-3 py-3 border border-indigo-500/20"
            >
              {detalles.length}{" "}
              {detalles.length === 1 ? "Producto" : "Productos"}
            </Badge>
          </Group>
        </Group>

        <div className="overflow-x-auto border border-zinc-800/60 rounded-2xl shadow-2xl bg-zinc-950/20 backdrop-blur-md transition-all">
          <Table verticalSpacing="md" horizontalSpacing="xl">
            <thead className="bg-zinc-900/50 text-zinc-400 text-xs font-bold border-b border-zinc-800/80">
              <tr>
                <th className="px-6 py-4 text-center w-12 opacity-50">#</th>
                <th className="px-4 py-4 text-center w-12">
                  {itemsEligibleIds.length > 0 && (
                    <div className="flex justify-center">
                      <Tooltip
                        label="Seleccionar todo lo apto para entrega"
                        position="top"
                        withArrow
                      >
                        <Checkbox
                          checked={isAllEligibleSelected}
                          indeterminate={hasPartialEligibleSelection}
                          onChange={toggleSelectAllEligible}
                          color="indigo"
                          size="xs"
                          className="cursor-pointer translate-y-px"
                        />
                      </Tooltip>
                    </div>
                  )}
                </th>
                <th className="px-6 py-4 text-left">Producto</th>
                <th className="px-6 py-4 text-center">Cantidad solicitada</th>
                <th className="px-6 py-4 text-center w-44">Progreso</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-center">
                  <Group gap={4} justify="center">
                    <span>Acciones</span>
                    {detalles.some(
                      (d) =>
                        d.estado === Estado_PrestamoDetalle.EsperandoAprobacion,
                    ) && (
                      <Tooltip
                        label="Seleccionar todos los pendientes para acción masiva"
                        position="top"
                      >
                        <Checkbox
                          size="xs"
                          color="indigo"
                          checked={isAllPendingSelected}
                          onChange={seleccionarTodoLoPendiente}
                          className="cursor-pointer"
                        />
                      </Tooltip>
                    )}
                  </Group>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/30">
              {detalles.map((d, idx) => {
                const isApprovedToDispatch =
                  d.estado === Estado_PrestamoDetalle.Aprobado ||
                  d.estado === Estado_PrestamoDetalle.EnDespacho;
                const porcentaje =
                  Math.round(
                    (d.cantidad_prestada_base / d.cantidad_solicitada_base) *
                      100,
                  ) || 0;

                return (
                  <tr
                    key={idx}
                    className="hover:bg-zinc-900/40 transition-colors group"
                  >
                    <td className="px-6 py-4 text-center text-[10px] font-mono font-black text-zinc-700">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {porcentaje >= 100 ||
                      !isApprovedToDispatch ||
                      d.estado === Estado_PrestamoDetalle.Rechazado ? (
                        <div className="flex justify-center opacity-40">
                          <NoSymbolIcon className="w-5 h-5 text-zinc-600" />
                        </div>
                      ) : (
                        <Checkbox
                          checked={selectedItemsIds.includes(
                            d.id_prestamo_detalle,
                          )}
                          onChange={() =>
                            toggleItemSelection(d.id_prestamo_detalle)
                          }
                          color="indigo"
                          size="sm"
                          className="cursor-pointer flex justify-center translate-y-px"
                        />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Stack gap={2}>
                        <Text
                          size="sm"
                          fw={800}
                          className="text-zinc-100 group-hover:text-indigo-400 transition-colors tracking-tight"
                        >
                          {d.producto}
                        </Text>
                        <Group gap={4}>
                          <Text
                            size="9px"
                            fw={800}
                            c="zinc.5"
                            className="uppercase tracking-wider"
                          >
                            {d.unidad_medida_base_abv}
                          </Text>
                          {d.comentario && (
                            <Tooltip label={d.comentario}>
                              <ActionIcon
                                size="xs"
                                variant="transparent"
                                color="yellow"
                              >
                                <ClockIcon className="w-3 h-3" />
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                      </Stack>
                    </td>
                    <td className="px-6 py-4 text-center flex flex-row gap-0.5 justify-center items-center">
                      <Badge
                        variant="filled"
                        color="cyan.7"
                        radius="sm"
                        size="sm"
                        className="font-black px-4"
                      >
                        {formatNumber(d.cantidad_solicitada)}{" "}
                        {d.unidad_medida_base_abv}
                      </Badge>
                      {d.unidad_medida_base_abv !==
                        d.unidad_medida_base_abv && (
                        <>
                          <Badge
                            variant="filled"
                            color="zinc"
                            radius="sm"
                            size="sm"
                            className="font-black px-4"
                          >
                            {formatNumber(d.contenido_por_presentacion)}{" "}
                            {d.unidad_medida_base_abv}{" "}
                            <span className="lowercase font-bold">x</span>{" "}
                            {d.unidad_medida_base_abv}
                          </Badge>

                          <Badge
                            variant="filled"
                            color="pink"
                            radius="sm"
                            className="font-bold shadow-xs whitespace-nowrap"
                          >
                            {formatNumber(d.cantidad_solicitada_base)}{" "}
                            {d.unidad_medida_base_abv}
                          </Badge>
                        </>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col gap-1.5 w-full">
                        <div className="flex justify-between items-center px-1">
                          <Text
                            size="10px"
                            fw={800}
                            c="zinc.5"
                            className="tabular-nums"
                          >
                            Atendido:{" "}
                            {d.unidad_medida_base_abv !==
                            d.unidad_medida_base_abv
                              ? `${formatNumber(d.cantidad_prestada_base)} ${d.unidad_medida_base_abv}`
                              : `${formatNumber(d.cantidad_prestada)} ${d.unidad_medida_base_abv}`}
                          </Text>
                          <Text size="10px" fw={900} c="indigo.4">
                            {porcentaje}%
                          </Text>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-700/20">
                          <div
                            className="h-full bg-linear-to-r from-indigo-600 via-indigo-500 to-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.2)] transition-all duration-700"
                            style={{ width: `${porcentaje}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <PrestamoStatusBadge estado={d.estado} />
                    </td>
                    <td className="px-6 py-4">
                      <Group gap={8} justify="center" wrap="nowrap">
                        <Tooltip label="Ver Seguimiento" withArrow>
                          <ActionIcon
                            variant="subtle"
                            color="zinc"
                            size="md"
                            className="hover:bg-zinc-800/50"
                            onClick={() => {
                              setSelectedItemId(d.id_prestamo_detalle);
                              setSelectedItemName(d.producto);
                              obtenerTrazabilidad(d.id_prestamo_detalle);
                              openTrace();
                            }}
                          >
                            <ClockIcon className="w-4 h-4" />
                          </ActionIcon>
                        </Tooltip>

                        {d.estado ===
                          Estado_PrestamoDetalle.EsperandoAprobacion && (
                          <Tooltip
                            label="Acción masiva"
                            position="top"
                            withArrow
                          >
                            <Checkbox
                              size="xs"
                              color="indigo"
                              checked={idsParaAccionMasiva.includes(
                                d.id_prestamo_detalle,
                              )}
                              onChange={() =>
                                toggleSeleccionMasiva(d.id_prestamo_detalle)
                              }
                              className="ml-1 cursor-pointer"
                            />
                          </Tooltip>
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

      {/* MODALES TÉCNICOS */}

      {/* Trazabilidad (Línea de vida) */}
      <ModalEstandar
        opened={openedTrace}
        close={closeTrace}
        title="Seguimiento del Préstamo"
        size="md"
      >
        <TrazabilidadPrestamo
          eventos={trazabilidad}
          loading={loadingTrace}
          productoNombre={selectedItemName}
        />
      </ModalEstandar>

      {/* Aprobación */}
      <ModalEstandar
        opened={openedAprobar}
        close={closeAprobar}
        title="Aprobar Ítem de Préstamo"
        size="sm"
      >
        <Stack gap="xl">
          <Paper
            p="md"
            radius="lg"
            className="bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-3"
          >
            <CheckCircleIcon className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <Text
              size="sm"
              c="emerald.3"
              fw={600}
              className="italic text-left leading-snug"
            >
              {selectedItemId ? (
                <>
                  Estás por aprobar el despacho de{" "}
                  <span className="font-black text-white">
                    {selectedItemName}
                  </span>
                  .
                </>
              ) : (
                <>
                  Estás por aprobar{" "}
                  <span className="font-black text-white">
                    {idsParaAccionMasiva.length} ítems
                  </span>{" "}
                  de forma masiva.
                </>
              )}{" "}
              Se podrá proceder con la salida física del producto.
            </Text>
          </Paper>
          <Textarea
            placeholder="Ej: Autorizado para despacho inmediato..."
            label="Detalle u Observación (Opcional)"
            radius="md"
            value={comentarioAccion}
            onChange={(e) => setComentarioAccion(e.currentTarget.value)}
          />
          <Group justify="end">
            <Button
              variant="subtle"
              color="zinc"
              radius="xl"
              onClick={closeAprobar}
            >
              Cancelar
            </Button>
            <Button
              color="green"
              radius="xl"
              loading={isProcessing}
              onClick={() =>
                handleCambiarEstado(Estado_PrestamoDetalle.Aprobado)
              }
              className="px-8 shadow-green-500/20 shadow-lg font-bold"
            >
              Aprobar
            </Button>
          </Group>
        </Stack>
      </ModalEstandar>

      {/* Rechazo */}
      <ModalEstandar
        opened={openedRechazo}
        close={closeRechazo}
        title="Rechazar ítem de Préstamo"
        size="sm"
      >
        <Stack gap="xl">
          <Paper
            p="md"
            radius="lg"
            className="bg-red-500/5 border border-red-500/20 flex items-start gap-3"
          >
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <Text
              size="sm"
              c="red.3"
              fw={600}
              className="italic text-left leading-snug"
            >
              {selectedItemId ? (
                <>
                  ¿Por qué no se puede atender el préstamo de{" "}
                  <span className="font-black text-white">
                    {selectedItemName}
                  </span>
                  ?
                </>
              ) : (
                <>
                  ¿Por qué no se pueden atender estos{" "}
                  <span className="font-black text-white">
                    {idsParaAccionMasiva.length} ítems
                  </span>
                  ?
                </>
              )}{" "}
              El motivo es obligatorio.
            </Text>
          </Paper>
          <Textarea
            placeholder="Motivo detallado del rechazo..."
            label="Motivo o Comentario"
            radius="md"
            value={comentarioAccion}
            onChange={(e) => setComentarioAccion(e.currentTarget.value)}
            required
          />
          <Group justify="end">
            <Button
              variant="subtle"
              color="zinc"
              radius="xl"
              onClick={closeRechazo}
            >
              Volver
            </Button>
            <Button
              color="red"
              radius="xl"
              disabled={!comentarioAccion.trim()}
              loading={isProcessing}
              onClick={() =>
                handleCambiarEstado(Estado_PrestamoDetalle.Rechazado)
              }
              className="px-8 shadow-red-500/20 shadow-lg font-bold"
            >
              Rechazar
            </Button>
          </Group>
        </Stack>
      </ModalEstandar>

      {/* Registro de Despacho físico */}
      <ModalEstandar
        opened={openedNuevaEntrega}
        close={closeNuevaEntrega}
        title="Nueva Entrega"
        validateClose
        size="80%"
      >
        <RegistrarEntregaModal
          idPrestamo={prestamo.id_prestamo}
          idAlmacenPrestamista={idAlmacenPrestamista}
          selectedItemsIds={selectedItemsIds}
          detallesPrestamo={detalles}
          onSuccess={() => {
            deselectAllItems(); // Limpiar selección tras éxito
            cargarDatos(); // Recargar datos locales del préstamo
            onDespachoRegistrado?.(); // Notificar al padre
            closeNuevaEntrega(); // Cerrar el modal de registro (vuelve al detalle)
          }}
          onCancel={closeNuevaEntrega}
        />
      </ModalEstandar>

      {/* Historial de Movimientos (Entregas) */}
      <ModalEstandar
        opened={openedHistorial}
        close={closeHistorial}
        title="Historial de Entregas"
        size="70%"
      >
        <HistorialEntregasPrestamo
          entregas={entregas}
          loading={loadingEntregas}
        />
      </ModalEstandar>

      {/* Historial de Movimientos (Reposiciones) */}
      <ModalEstandar
        opened={openedHistorialRepos}
        close={closeHistorialRepos}
        title="Historial de Reposiciones"
        size="70%"
      >
        <HistorialReposicionesPrestamo
          reposiciones={reposiciones}
          loading={loadingRepos}
          onSuccess={() => {
            cargarReposiciones();
            cargarDatos(true);
          }}
          idAlmacenLender={prestamo.id_almacen_prestamista}
        />
      </ModalEstandar>
    </Stack>
  );
};
