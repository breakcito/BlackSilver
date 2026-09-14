import { Loader, Stack } from "@mantine/core";
import { useMemo, useState } from "react";
import { useGestionAtencion } from "../../hooks/useGestionAtencion";
import type { RES_RequerimientoAlmacen } from "../../../../service/responses/requerimientos-almacen/requerimiento-almacen";
import { Estado_Requerimiento } from "../../../../shared/enums/requerimiento-almacen/requerimiento";
import { InfoHeader } from "./components/InfoHeader";
import { InfoStats } from "./components/InfoStats";
import { InfoProgress } from "./components/InfoProgress";
import { InfoItemsTable } from "./components/InfoItemsTable";
import { InfoActionModals } from "./components/InfoActionModals";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import { RegistroRequerimiento } from "../registrar-requerimiento/registro-requerimiento";
import { RegistrarEntrega } from "../entregas/registrar-entrega/registrar-entrega";

interface InfoRequerimientoProps {
  requerimiento: RES_RequerimientoAlmacen;
  idAlmacen?: number;
  onSuccess: (ids?: number[]) => void;
}

export const InfoRequerimiento = ({
  requerimiento,
  idAlmacen,
  onSuccess,
}: InfoRequerimientoProps) => {
  const {
    loading,
    detalles,
    eventos,
    loadingTrazabilidad,
    openedTrace,
    openTrace,
    closeTrace,
    openedRechazo,
    openRechazo,
    closeRechazo,
    openedEntregaBatch,
    openEntregaBatch,
    closeEntregaBatch,
    openedHistorialGlobal,
    openHistorialGlobal,
    closeHistorialGlobal,
    selectedItemId,
    setSelectedItemId,
    selectedItemName,
    setSelectedItemName,
    selectedItemsIds,
    toggleItemSelection,
    deselectAllItems,
    isAllEligibleSelected,
    hasPartialEligibleSelection,
    toggleSelectAllEligible,
    comentarioAccion,
    setComentarioAccion,
    openedAprobar,
    openAprobar,
    closeAprobar,
    isProcessing,
    progresoGeneral,
    handleAprobar,
    handleRechazar,
    handleDecisionMasiva,
    idsParaAccionMasiva,
    toggleSeleccionMasiva,
    isAllPendingSelected,
    seleccionarTodoLoPendiente,
    getStatusColor,
    logistica,
    loadData,
    patchDetallesLocales,
    requerimientoAnulado,
  } = useGestionAtencion({
    idRequerimiento: requerimiento.id_requerimiento,
    onSuccess,
    requerimientoAnulado:
      requerimiento.estado === Estado_Requerimiento.Anulado,
  });

  const puedeEditar = useMemo(
    () =>
      !requerimientoAnulado &&
      detalles.some((d) => Number(d.cantidad_entregada_base ?? 0) === 0),
    [detalles, requerimientoAnulado],
  );

  const [openedEditar, setOpenedEditar] = useState(false);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader color="indigo" size="lg" />
      </div>
    );
  }

  if (!detalles) return null;

  return (
    <Stack gap="xl" className="pb-10">
      <InfoHeader
        requerimiento={requerimiento}
        puedeEditar={puedeEditar}
        onEditar={() => setOpenedEditar(true)}
      />

      <InfoStats requerimiento={requerimiento} />

      <InfoProgress progresoGeneral={progresoGeneral} />

      <InfoItemsTable
        detalles={detalles}
        selectedItemsIds={selectedItemsIds}
        toggleItemSelection={toggleItemSelection}
        isAllEligibleSelected={isAllEligibleSelected}
        hasPartialEligibleSelection={hasPartialEligibleSelection}
        toggleSelectAllEligible={toggleSelectAllEligible}
        openHistorialGlobal={openHistorialGlobal}
        openEntregaBatch={openEntregaBatch}
        idsParaAccionMasiva={idsParaAccionMasiva}
        setSelectedItemId={setSelectedItemId}
        openAprobar={openAprobar}
        openRechazo={openRechazo}
        logistica={logistica}
        isAllPendingSelected={isAllPendingSelected}
        seleccionarTodoLoPendiente={seleccionarTodoLoPendiente}
        getStatusColor={getStatusColor}
        toggleSeleccionMasiva={toggleSeleccionMasiva}
        setSelectedItemName={setSelectedItemName}
        openTrace={openTrace}
        isProcessing={isProcessing}
        deshabilitadoPorAnulacion={requerimientoAnulado}
      />

      <InfoActionModals
        openedTrace={openedTrace}
        closeTrace={closeTrace}
        selectedItemId={selectedItemId}
        eventos={eventos}
        selectedItemName={selectedItemName}
        loadingTrazabilidad={loadingTrazabilidad}
        openedRechazo={openedRechazo}
        closeRechazo={closeRechazo}
        comentarioAccion={comentarioAccion}
        setComentarioAccion={setComentarioAccion}
        idsParaAccionMasiva={idsParaAccionMasiva}
        isProcessing={isProcessing}
        handleRechazar={handleRechazar}
        handleDecisionMasiva={
          handleDecisionMasiva as unknown as (
            e: import("../../../../shared/enums/requerimiento-almacen/requerimiento").Estado_RequerimientoDetalle,
          ) => Promise<void>
        }
        openedAprobar={openedAprobar}
        closeAprobar={closeAprobar}
        handleAprobar={handleAprobar}
        requerimiento={requerimiento}
        detalles={detalles}
        openedHistorialGlobal={openedHistorialGlobal}
        closeHistorialGlobal={closeHistorialGlobal}
        logistica={{
          opened: logistica.isOpen,
          close: logistica.close,
          onSuccess: logistica.onSuccess,
        }}
      />

      <ModalEstandar
        opened={openedEditar}
        close={() => setOpenedEditar(false)}
        title={`Editar Requerimiento ${requerimiento.correlativo}`}
        size="65%"
        validateClose
      >
        <RegistroRequerimiento
          modo="editar"
          requerimientoInicial={requerimiento}
          detallesIniciales={detalles}
          onSuccess={(updated) => {
            setOpenedEditar(false);
            loadData(true);
            onSuccess([updated.id_requerimiento]);
          }}
          onCancel={() => setOpenedEditar(false)}
        />
      </ModalEstandar>

      <ModalEstandar
        opened={openedEntregaBatch}
        close={closeEntregaBatch}
        title={`Registrar Entrega · ${requerimiento.correlativo}`}
        size="75rem"
        validateClose
      >
        {idAlmacen !== undefined && (
          <RegistrarEntrega
            requerimiento={requerimiento}
            idRequerimiento={requerimiento.id_requerimiento}
            idAlmacen={idAlmacen}
            selectedItemsIds={selectedItemsIds}
            detallesRequerimiento={detalles}
            idContratistaSolicitante={requerimiento.id_contratista_solicitante}
            idEmpleadoSolicitante={requerimiento.id_empleado_solicitante}
            onSuccess={(entregados) => {
              patchDetallesLocales(entregados);
              deselectAllItems();
              closeEntregaBatch();
              onSuccess(Object.keys(entregados).map(Number));
            }}
            onCancel={() => {
              deselectAllItems();
              closeEntregaBatch();
            }}
          />
        )}
      </ModalEstandar>
    </Stack>
  );
};
