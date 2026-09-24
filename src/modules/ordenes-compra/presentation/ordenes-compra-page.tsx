import { Button } from "@mantine/core";
import { DocumentPlusIcon } from "@heroicons/react/24/outline";
import { useTitlePage } from "../../../hooks/useTitlePage.ts";
import { useOrdenesCompraPage } from "../hooks/useOrdenesCompra.tsx";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar.tsx";
import { DetalleOrdenCompra } from "./detalle-orden-compra/detalle-orden-compra.tsx";
import { HistorialRecepcionesOC } from "./historial-recepciones/historial-recepciones-oc.tsx";
import { RegistroComprobante } from "./registro-comprobante/registro-comprobante.tsx";

// New Components
import { Filtros } from "./orden-compra-page/filtros.tsx";
import { GroupByEmpresa } from "./orden-compra-page/group-by-empresa.tsx";

export const OrdenesCompraPage = () => {
  useTitlePage("Órdenes de Compra");

  const {
    loading,
    filters,
    containerRef,
    selectedOrden,
    detalles,
    loadingDetalle,
    openedDetalle,
    closeDet,
    groupedOrders,
    tableColumns,
    updateLocalStateAfterReception,
    fetchOrdenes,
    selectedOrdenForComprobante,
    selectedRecepcionesIds,
    setSelectedRecepcionesIds,
    openedHistorialComprobante,
    handleCerrarHistorialComprobante,
    openedRegistroComprobante,
    handleCerrarRegistroComprobante,
    handleAbrirRegistroComprobanteModal,
    handleComprobanteRegistrado,
  } = useOrdenesCompraPage();

  return (
    <div ref={containerRef} className="space-y-8 animate-fade-in text-zinc-100">
      <Filtros {...filters} onReload={fetchOrdenes} loading={loading} />

      <GroupByEmpresa
        groupedOrders={groupedOrders}
        tableColumns={tableColumns}
        loading={loading}
      />

      <ModalEstandar
        opened={openedDetalle}
        close={closeDet}
        title="Detalle de Orden de Compra"
        size="95%"
      >
        {selectedOrden && (
          <DetalleOrdenCompra
            orden={selectedOrden}
            detalles={detalles}
            loading={loadingDetalle}
            onUpdateLocalState={updateLocalStateAfterReception}
          />
        )}
      </ModalEstandar>

      <ModalEstandar
        opened={openedHistorialComprobante}
        close={handleCerrarHistorialComprobante}
        title="Seleccionar Recepciones para Comprobante"
        size="80%"
        rightSection={
          <Button
            size="xs"
            color="indigo"
            radius="xl"
            leftSection={<DocumentPlusIcon className="w-4 h-4" />}
            disabled={selectedRecepcionesIds.length === 0}
            onClick={handleAbrirRegistroComprobanteModal}
            className="font-bold"
          >
            Nuevo Comprobante ({selectedRecepcionesIds.length})
          </Button>
        }
      >
        {selectedOrdenForComprobante && (
          <HistorialRecepcionesOC
            idOrdenCompra={selectedOrdenForComprobante.id_orden_compra}
            onSelectionChange={setSelectedRecepcionesIds}
          />
        )}
      </ModalEstandar>

      <ModalEstandar
        opened={openedRegistroComprobante}
        close={handleCerrarRegistroComprobante}
        title="Registrar Nuevo Comprobante"
        size="60%"
      >
        {selectedOrdenForComprobante && (
          <RegistroComprobante
            orden={selectedOrdenForComprobante}
            ids_recepciones={selectedRecepcionesIds}
            onSuccess={handleComprobanteRegistrado}
          />
        )}
      </ModalEstandar>
    </div>
  );
};
