import { Stack, Paper, Text, Textarea, Group, Button } from "@mantine/core";
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { ModalEstandar } from "../../../../../presentation/utils/modal-estandar";
import { ReqDetalleTrazabilidad } from "./../detalle/detalle-log";
import { HistorialEntregasRequerimiento } from "../../entregas/historial-entregas";
import { RegistrarSolicitudLogistica } from "../../solicitud-reabastecimiento/registrar-solicitud-logistica";
import { Estado_RequerimientoDetalle } from "../../../../../shared/enums/requerimiento-almacen/requerimiento";
import type { RES_RequerimientoAlmacen } from "../../../../../service/responses/requerimientos-almacen/requerimiento-almacen";
import type { DetalleRequerimientoExtendido } from "../../../service/atencion.responses";
import type { RES_Trazabilidad } from "../../../../../service/responses/_generic/trazabilidad";

interface InfoActionModalsProps {
  openedTrace: boolean;
  closeTrace: () => void;
  selectedItemId: number | null;
  eventos: RES_Trazabilidad[];
  selectedItemName: string;
  loadingTrazabilidad: boolean;
  openedRechazo: boolean;
  closeRechazo: () => void;
  comentarioAccion: string;
  setComentarioAccion: (val: string) => void;
  idsParaAccionMasiva: number[];
  isProcessing: number | null;
  handleRechazar: () => void;
  handleDecisionMasiva: (estado: Estado_RequerimientoDetalle) => void;
  openedAprobar: boolean;
  closeAprobar: () => void;
  handleAprobar: () => void;
  requerimiento: RES_RequerimientoAlmacen;
  detalles: DetalleRequerimientoExtendido[];
  openedHistorialGlobal: boolean;
  closeHistorialGlobal: () => void;
  logistica: { opened: boolean; close: () => void; onSuccess: () => void };
}

export const InfoActionModals = ({
  openedTrace,
  closeTrace,
  selectedItemId,
  eventos,
  selectedItemName,
  loadingTrazabilidad,
  openedRechazo,
  closeRechazo,
  comentarioAccion,
  setComentarioAccion,
  idsParaAccionMasiva,
  isProcessing,
  handleRechazar,
  handleDecisionMasiva,
  openedAprobar,
  closeAprobar,
  handleAprobar,
  requerimiento,
  detalles,
  openedHistorialGlobal,
  closeHistorialGlobal,
  logistica,
}: InfoActionModalsProps) => {
  return (
    <>
      <ModalEstandar
        opened={openedTrace}
        close={closeTrace}
        title="Seguimiento del requerimiento"
        size="md"
      >
        {selectedItemId && (
          <ReqDetalleTrazabilidad
            eventos={eventos}
            productoNombre={selectedItemName}
            loading={loadingTrazabilidad}
          />
        )}
      </ModalEstandar>

      <ModalEstandar
        opened={openedRechazo}
        close={closeRechazo}
        title="Rechazar ítem"
        size="md"
      >
        <Stack gap="md">
          <Paper
            p="md"
            className="bg-red-500/10 border border-red-900/50 rounded-xl flex items-start gap-4"
          >
            <ExclamationTriangleIcon className="size-8 text-red-400 mt-1" />
            <Text size="sm" className="text-red-100 italic">
              {selectedItemId
                ? "Esta acción marcará el producto como rechazado."
                : `Esta acción marcará ${idsParaAccionMasiva.length} productos como rechazados.`}
            </Text>
          </Paper>
          <Textarea
            label="Motivo del rechazo"
            placeholder="Escriba aquí…"
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
              onClick={
                selectedItemId
                  ? handleRechazar
                  : () =>
                      handleDecisionMasiva(
                        Estado_RequerimientoDetalle.Rechazado,
                      )
              }
            >
              Rechazar
            </Button>
          </Group>
        </Stack>
      </ModalEstandar>

      <ModalEstandar
        opened={openedAprobar}
        close={closeAprobar}
        title="Aprobar ítem"
        size="md"
      >
        <Stack gap="md">
          <Paper
            p="md"
            className="bg-green-500/10 border border-green-900/50 rounded-xl flex items-start gap-4"
          >
            <CheckCircleIcon className="size-8 text-green-400 mt-1" />
            <Text size="sm" className="text-green-100 italic">
              {selectedItemId
                ? "¿Desea aprobar este producto? Puede entrar un comentario opcional."
                : `¿Desea aprobar ${idsParaAccionMasiva.length} productos? Puede entrar un comentario opcional.`}
            </Text>
          </Paper>
          <Textarea
            label="Comentario (Opcional)"
            placeholder="Escriba aquí…"
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
              onClick={
                selectedItemId
                  ? handleAprobar
                  : () =>
                      handleDecisionMasiva(Estado_RequerimientoDetalle.Aprobado)
              }
            >
              Aprobar
            </Button>
          </Group>
        </Stack>
      </ModalEstandar>

      <ModalEstandar
        opened={openedHistorialGlobal}
        close={closeHistorialGlobal}
        title={`Historial de Entregas - ${requerimiento.correlativo}`}
        size="70rem"
      >
        <HistorialEntregasRequerimiento
          idRequerimiento={requerimiento.id_requerimiento}
        />
      </ModalEstandar>

      <ModalEstandar
        opened={logistica.opened}
        close={logistica.close}
        title="Consultar con Logística"
        validateClose
        size="90%"
      >
        <RegistrarSolicitudLogistica
          requerimiento={requerimiento}
          detalles={detalles}
          onCancel={logistica.close}
          onSuccess={logistica.onSuccess}
        />
      </ModalEstandar>
    </>
  );
};
