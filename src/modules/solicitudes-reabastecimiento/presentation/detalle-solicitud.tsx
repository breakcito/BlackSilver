import { useMemo, useState } from "react";
import {
  Badge,
  Group,
  Stack,
  Table,
  Text,
  Paper,
  Tooltip,
  Loader,
  ActionIcon,
  Button,
} from "@mantine/core";
import {
  BuildingStorefrontIcon,
  CalendarDaysIcon,
  UserIcon,
  CheckBadgeIcon,
  ClockIcon,
  ListBulletIcon,
  CubeIcon,
  PencilSquareIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import { HistorialEntregas } from "./historial-entregas";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { RegistroSolicitud } from "./registro-solicitud";
import type {
  RES_Solicitud,
  RES_SolicitudDetalle,
} from "../../../service/responses/solicitudes-reabastecimiento/solicitud";
import { formatNumber } from "../../../shared/functions/formatNumber";
import { Estado_SolicitudDetalleLog } from "../../../shared/enums/solicitud-reabastecimiento/solicitud";
import { Estado_Solicitud } from "../../../shared/enums/solicitud-reabastecimiento/solicitud";

interface DetalleSolicitudProps {
  headerData: RES_Solicitud;
  detalles: RES_SolicitudDetalle[];
  loading: boolean;
  progresoGeneral: number;
  onOpenTrazabilidad: (detalle: RES_SolicitudDetalle) => void;
  /**
   * Notifica al page que la cabecera de la solicitud fue actualizada
   * (p. ej. al editar la observacion) para que sincronice el listar y
   * el `selectedReq` sin recargar la pantalla.
   */
  onRequerimientoActualizado?: (updated: RES_Solicitud) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case Estado_SolicitudDetalleLog.EsperandoAprobacion:
      return "blue";
    case Estado_SolicitudDetalleLog.Aprobado:
      return "violet";
    case Estado_SolicitudDetalleLog.EnDespacho:
      return "orange";
    case Estado_SolicitudDetalleLog.NuevaEntrega:
      return "green";
    case Estado_SolicitudDetalleLog.Completado:
      return "emerald";
    case Estado_SolicitudDetalleLog.Cerrado:
      return "zinc";
    case Estado_SolicitudDetalleLog.Rechazado:
      return "red";
    default:
      return "gray";
  }
};

export const DetalleSolicitud = ({
  headerData,
  detalles,
  loading,
  progresoGeneral,
  onOpenTrazabilidad,
  onRequerimientoActualizado,
}: DetalleSolicitudProps) => {
  const [openedHistorial, setOpenedHistorial] = useState(false);
  const [openedEditar, setOpenedEditar] = useState(false);

  const handleOpenHistorial = () => setOpenedHistorial(true);
  const handleCloseHistorial = () => setOpenedHistorial(false);

  // Se puede editar si NO esta anulada Y NINGUN detalle tiene entregas
  // iniciadas (regla todo-o-nada: si logistica ya comenzo a despachar
  // cualquier item, la solicitud completa queda bloqueada). El backend
  // replica esta validacion.
  const puedeEditar = useMemo(
    () =>
      headerData.estado !== Estado_Solicitud.Anulada &&
      detalles.every(
        (d) => Number(d.cantidad_entregada_base ?? 0) === 0,
      ),
    [detalles, headerData.estado],
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader color="indigo" size="lg" />
      </div>
    );
  }

  return (
    <Stack gap="xl" className="animate-fade-in p-2">
      {/* Header: Datos Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Paper
          p="md"
          radius="lg"
          className="bg-indigo-500/6 border border-indigo-500/20 relative overflow-hidden group hover:bg-indigo-500/10 transition-all"
        >
          <CheckBadgeIcon className="absolute -right-2 -bottom-2 w-16 h-16 text-indigo-400/10 rotate-12 group-hover:scale-110 transition-transform" />
          <Stack gap={2} className="relative z-10">
            <Group gap={6}>
              <CheckBadgeIcon className="w-4 h-4 text-indigo-400" />
              <Text
                size="xs"
                c="indigo.3"
                fw={800}
                className="uppercase tracking-widest"
              >
                Correlativo
              </Text>
            </Group>
            <Text
              size="md"
              fw={900}
              className="text-zinc-100 tracking-tight leading-tight"
            >
              {headerData.correlativo}
            </Text>
          </Stack>
        </Paper>

        <Paper
          p="md"
          radius="lg"
          className="bg-violet-500/6 border border-violet-500/20 relative overflow-hidden group hover:bg-violet-500/10 transition-all"
        >
          <UserIcon className="absolute -right-2 -bottom-2 w-16 h-16 text-violet-400/10 rotate-12 group-hover:scale-110 transition-transform" />
          <Stack gap={2} className="relative z-10">
            <Group gap={6}>
              <UserIcon className="w-4 h-4 text-violet-400" />
              <Text
                size="xs"
                c="violet.5"
                fw={800}
                className="uppercase tracking-widest"
              >
                Solicitante
              </Text>
            </Group>
            <Text
              size="md"
              fw={800}
              className="text-zinc-100 tracking-tight leading-tight"
            >
              {headerData.solicitado_por}
            </Text>
          </Stack>
        </Paper>

        <Paper
          p="md"
          radius="lg"
          className="bg-emerald-500/6 border border-emerald-500/20 relative overflow-hidden group hover:bg-emerald-500/10 transition-all"
        >
          <BuildingStorefrontIcon className="absolute -right-2 -bottom-2 w-16 h-16 text-emerald-400/10 rotate-12 group-hover:scale-110 transition-transform" />
          <Stack gap={2} className="relative z-10">
            <Group gap={6}>
              <BuildingStorefrontIcon className="w-4 h-4 text-emerald-500" />
              <Text
                size="xs"
                c="emerald.5"
                fw={800}
                className="uppercase tracking-widest"
              >
                Almacén Origen
              </Text>
            </Group>
            <Text
              size="md"
              fw={800}
              className="text-zinc-100 tracking-tight leading-tight italic"
            >
              {headerData.almacen_solicitante}
            </Text>
          </Stack>
        </Paper>
      </div>

      {/* Sub-header: Tiempos y Prioridad */}
      <Paper
        p="md"
        radius="lg"
        bg="transparent"
        className="border border-zinc-800/50"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Stack gap={4}>
            <Text
              size="xs"
              c="zinc.5"
              fw={800}
              className="uppercase tracking-widest"
            >
              {" "}
              Prioridad{" "}
            </Text>
            <Badge
              color="orange"
              variant="light"
              size="sm"
              radius="sm"
              className="border border-orange-900/30 font-bold"
            >
              {headerData.premura}
            </Badge>
          </Stack>

          <Stack gap={4}>
            <Text
              size="xs"
              c="zinc.5"
              fw={800}
              className="uppercase tracking-widest"
            >
              {" "}
              Estado{" "}
            </Text>
            <Badge
              color="green"
              variant="light"
              size="sm"
              radius="sm"
              className="border border-green-900/30 font-bold"
            >
              {headerData.estado}
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
                {" "}
                Registro{" "}
              </Text>
            </div>
            <Text size="sm" fw={800} className="text-zinc-100 italic">
              {dayjs(headerData.created_at).format("DD/MM/YYYY")}
            </Text>
          </Stack>

          <Stack gap={4}>
            <div className="flex items-center gap-1.5 font-bold">
              <ClockIcon className="w-3.5 h-3.5 text-cyan-500" />
              <Text
                size="xs"
                c="zinc.5"
                fw={800}
                className="uppercase tracking-widest"
              >
                {" "}
                Fecha Requerida{" "}
              </Text>
            </div>
            <Text size="sm" fw={800} className="text-zinc-100 font-mono">
              {headerData.fecha_entrega_requerida || (
                <span className="text-zinc-500 italic font-normal">
                  Sin fecha
                </span>
              )}
            </Text>
          </Stack>
        </div>

        {headerData.observacion &&
          headerData.observacion.trim().length > 0 && (
            <div className="mt-5 pt-5 border-t border-zinc-800/60">
              <div className="flex items-center gap-1.5 font-bold mb-2">
                <ChatBubbleLeftRightIcon className="w-3.5 h-3.5 text-cyan-400" />
                <Text
                  size="xs"
                  c="zinc.5"
                  fw={800}
                  className="uppercase tracking-widest"
                >
                  Observaciones Generales
                </Text>
              </div>
              <div className="flex items-start gap-2 px-3 py-2.5 bg-zinc-900/40 border border-zinc-800/60 rounded-lg">
                <div className="shrink-0 p-1.5 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                  <ChatBubbleLeftRightIcon className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <Text
                  size="sm"
                  c="zinc.2"
                  className="leading-snug break-words whitespace-pre-wrap"
                >
                  {headerData.observacion}
                </Text>
              </div>
            </div>
          )}
      </Paper>

      {/* Barra de Progreso General */}
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

      {/* Tabla de Items */}
      <div className="space-y-4">
        <Group justify="space-between" align="center" px={4}>
          <Group gap="xs">
            <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/10">
              <ListBulletIcon className="w-5 h-5 text-indigo-400" />
            </div>
            <Text
              fw={800}
              className="text-zinc-100 italic tracking-tight text-lg"
            >
              Items Solicitados
            </Text>
          </Group>
          <Group gap="sm">
            {puedeEditar && (
              <Button
                variant="filled"
                color="indigo"
                size="xs"
                leftSection={<PencilSquareIcon className="w-4 h-4" />}
                onClick={() => setOpenedEditar(true)}
              >
                Editar Solicitud
              </Button>
            )}
            <Button
              variant="light"
              color="indigo"
              size="xs"
              leftSection={<ClockIcon className="w-4 h-4" />}
              onClick={handleOpenHistorial}
            >
              Historial de Entregas
            </Button>
            <Badge
              variant="light"
              color="indigo"
              radius="md"
              size="sm"
              className="font-bold py-3 px-4 uppercase tracking-widest"
            >
              {detalles.length} Productos
            </Badge>
          </Group>
        </Group>

        <div className="overflow-hidden border border-zinc-800 rounded-2xl bg-zinc-950/20 shadow-2xl">
          <Table verticalSpacing="md" horizontalSpacing="xl">
            <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 text-xs font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4 text-center w-12">#</th>
                <th className="px-6 py-4 text-left">Producto</th>
                <th className="px-6 py-4 text-center">Cant. Solicitada</th>
                <th className="px-6 py-4 text-center w-44">Progreso</th>
                <th className="px-6 py-4 text-left">Comentario</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-center w-20">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {detalles.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-20 text-center text-zinc-600 italic"
                  >
                    No se encontraron productos en esta solicitud
                  </td>
                </tr>
              ) : (
                detalles.map((det, index) => {
                  const progresoItem = det.porcentaje_progreso;

                  return (
                    <tr
                      key={det.id_solicitud_detalle}
                      className="hover:bg-zinc-900/40 transition-colors group"
                    >
                      <td className="px-6 py-4 text-center text-zinc-500 text-xs font-mono">
                        {String(index + 1).padStart(2, "0")}
                      </td>
                      <td className="px-6 py-4">
                        <Group gap="sm">
                          <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:border-indigo-500/50 transition-all">
                            <CubeIcon className="w-4.5 h-4.5 text-zinc-400 group-hover:text-indigo-400" />
                          </div>
                          <div>
                            <Text
                              size="sm"
                              fw={800}
                              className="text-zinc-100 group-hover:text-white transition-colors"
                            >
                              {det.producto}
                            </Text>
                          </div>
                        </Group>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Group justify="center" gap={4}>
                          <Badge
                            variant="filled"
                            color="indigo"
                            radius="sm"
                            className="font-bold shadow-xs whitespace-nowrap"
                          >
                            {formatNumber(det.cantidad_solicitada)}{" "}
                            {det.unidad_medida_sol_abv}
                          </Badge>
                          {det.id_unidad_medida_base !==
                            det.id_unidad_medida_sol && (
                            <>
                              <Badge
                                variant="filled"
                                color="zinc"
                                radius="sm"
                                size="sm"
                                className="font-black px-4"
                              >
                                {formatNumber(det.contenido_por_presentacion)}{" "}
                                {det.unidad_medida_base_abv}{" "}
                                <span className="lowercase">x</span>{" "}
                                {det.unidad_medida_sol_abv}
                              </Badge>

                              <Badge
                                variant="filled"
                                color="pink"
                                radius="sm"
                                className="font-bold shadow-xs whitespace-nowrap"
                              >
                                {formatNumber(det.cantidad_solicitada_base)}{" "}
                                {det.unidad_medida_base_abv}
                              </Badge>
                            </>
                          )}
                        </Group>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col gap-1.5 w-full">
                          <div className="flex justify-between items-center px-1">
                            <Text size="10px" fw={800} c="zinc.5">
                              Entregado: {formatNumber(det.cantidad_entregada)}{" "}
                              {det.unidad_medida_sol_abv}
                            </Text>
                            <Text size="10px" fw={900} c="indigo.4">
                              {progresoItem}%
                            </Text>
                          </div>
                          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/30">
                            <div
                              className="h-full bg-linear-to-r from-indigo-600 to-indigo-400 transition-all duration-700 shadow-[0_0_10px_rgba(99,102,241,0.3)]"
                              style={{ width: `${progresoItem}%` }}
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
                          {det.comentario || (
                            <span className="text-zinc-500">Sin comentarios</span>
                          )}
                        </Text>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Stack gap={4} align="center">
                          <Badge
                            color={getStatusColor(det.estado)}
                            variant="light"
                            size="sm"
                            radius="md"
                            className="font-bold px-3 py-2.5"
                          >
                            {det.estado}
                          </Badge>
                          {det.comentario_decision && (
                            <Tooltip label={det.comentario_decision} withArrow>
                              <Text
                                size="10px"
                                fw={700}
                                c="orange.4"
                                className="max-w-32 truncate"
                              >
                                {det.comentario_decision}
                              </Text>
                            </Tooltip>
                          )}
                        </Stack>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Group gap={8} justify="center" wrap="nowrap">
                          <Tooltip
                            label="Ver Seguimiento"
                            position="top"
                            withArrow
                          >
                            <ActionIcon
                              variant="subtle"
                              color="zinc"
                              onClick={() => {
                                onOpenTrazabilidad(det);
                              }}
                            >
                              <ClockIcon className="w-4 h-4" />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>
      </div>

      <ModalEstandar
        opened={openedHistorial}
        close={handleCloseHistorial}
        title="Historial de Entregas"
        size="70%"
      >
        <HistorialEntregas
          idSolicitud={headerData.id_solicitud}
          idAlmacenSolicitante={headerData.id_almacen_solicitante}
          almacenSolicitante={headerData.almacen_solicitante}
        />
      </ModalEstandar>

      <ModalEstandar
        opened={openedEditar}
        close={() => setOpenedEditar(false)}
        title={`Editar Solicitud ${headerData.correlativo}`}
        size="90%"
        validateClose
      >
        <RegistroSolicitud
          modo="editar"
          solicitudInicial={headerData}
          detallesIniciales={detalles}
          onSuccess={(updated) => {
            setOpenedEditar(false);
            onRequerimientoActualizado?.(updated);
          }}
          onCancel={() => setOpenedEditar(false)}
        />
      </ModalEstandar>
    </Stack>
  );
};
