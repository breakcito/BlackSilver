import { Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useState } from "react";
import { InboxStackIcon } from "@heroicons/react/24/outline";
import QRCode from "qrcode";
import dayjs from "dayjs";

import { useLotesPage } from "../../hooks/useLotesPage";
import type { RES_Lote } from "../../service/lotes.responses";
import { useTitlePage } from "../../../../hooks/useTitlePage";

import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import { RegistroLote } from "../registro-lote";
import { AjusteStockModal } from "../ajuste-stock";
import { EditarLoteModal } from "../components/editar-lote-modal";
import { HistorialLoteModal } from "../components/historial-lote-modal";
import { LotesFilter } from "./lotes-filter";
import { ProductGroupCard } from "./product-group-card/product-group-card";
import { TicketLotePDF } from "../../../../presentation/utils/ticket-lote-pdf";
import { useGroupedProducts } from "../../hooks/useGroupedProducts";
import { useLotesColumns } from "../../hooks/useLotesColumns";
import { usePrint } from "../../../../hooks/usePrint";

export const LotesPage = () => {
  useTitlePage("Gestión de Inventario y Lotes");
  const {
    almacenes,
    records,
    loading,
    recargar,
    loadingAlmacenes,
    idAlmacen,
    setIdAlmacen,
    busqueda,
    setBusqueda,
    filtroCategoria,
    setFiltroCategoria,
    filtroProducto,
    setFiltroProducto,
    categoriasUnicas,
    productosUnicos,
    addLote,
    updateLote,
    eliminarLote,
    deletingId,
    armarTicket,
    selectedLotes,
    setSelectedLotes,
    toggleSelectAll,
    isAllSelected,
    isIndeterminate,
  } = useLotesPage();

  // Modals Local State (Purely UI)
  const [openedCreate, { open: openCreate, close: closeCreate }] =
    useDisclosure(false);
  const [loteParaAjustar, setLoteParaAjustar] = useState<RES_Lote | null>(null);
  const [openedAjuste, { open: openAjuste, close: closeAjuste }] =
    useDisclosure(false);

  const [loteParaEditar, setLoteParaEditar] = useState<RES_Lote | null>(null);
  const [openedEdicion, { open: openEdicion, close: closeEdicion }] =
    useDisclosure(false);

  const [loteParaHistorial, setLoteParaHistorial] =
    useState<RES_Lote | null>(null);
  const [openedHistorial, { open: openHistorial, close: closeHistorial }] =
    useDisclosure(false);

  const { print } = usePrint();

  const handlePrint = async (lotes: RES_Lote | RES_Lote[]) => {
    const lotesArray = Array.isArray(lotes) ? lotes : [lotes];
    const rawTickets = lotesArray.map(armarTicket);

    // Pre-generar QR como PNG data URL (qrcode no funciona dentro de react-pdf)
    const tickets = await Promise.all(
      rawTickets.map(async (t) => {
        const qrValue = JSON.stringify({
          id: t.id,
          producto: t.producto,
          lote: t.lote,
          almacen: t.almacen,
          fecha_ingreso: dayjs(t.fecha_ingreso).format("DD/MM/YY"),
        });
        const qrDataUrl = await QRCode.toDataURL(qrValue, {
          width: 120,
          margin: 1,
        });
        return { ...t, qrDataUrl };
      }),
    );

    print(<TicketLotePDF tickets={tickets} />, {
      documentTitle: "Tickets",
    });
  };

  const handleOpenEdit = (record: RES_Lote) => {
    setLoteParaEditar(record);
    openEdicion();
  };

  const handleCloseEdit = () => {
    setLoteParaEditar(null);
    closeEdicion();
  };

  const handleOpenHistory = (record: RES_Lote) => {
    setLoteParaHistorial(record);
    openHistorial();
  };

  const handleCloseHistory = () => {
    setLoteParaHistorial(null);
    closeHistorial();
  };

  // Grouping logic concentrada en hook abstracto
  const groupedProducts = useGroupedProducts(records);

  // Definición de las columnas de Mantine DataTable abstraida
  const columns = useLotesColumns({
    onPrint: handlePrint,
    onEditAjuste: (record) => {
      setLoteParaAjustar(record);
      openAjuste();
    },
    onEdit: handleOpenEdit,
    onDelete: (record) => {
      void eliminarLote(record.id_lote);
    },
    onHistory: handleOpenHistory,
    deletingId,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <LotesFilter
        almacenes={almacenes}
        loadingAlmacenes={loadingAlmacenes}
        loading={loading}
        onReload={recargar}
        idAlmacen={idAlmacen}
        setIdAlmacen={setIdAlmacen}
        busqueda={busqueda}
        setBusqueda={setBusqueda}
        categoriasUnicas={categoriasUnicas}
        filtroCategoria={filtroCategoria}
        setFiltroCategoria={setFiltroCategoria}
        productosUnicos={productosUnicos}
        filtroProducto={filtroProducto}
        setFiltroProducto={setFiltroProducto}
        openCreate={openCreate}
        // Masivo
        selectedCount={selectedLotes.length}
        onPrintSelected={() => handlePrint(selectedLotes)}
        onToggleSelectAll={toggleSelectAll}
        isAllSelected={isAllSelected}
        isIndeterminate={isIndeterminate}
      />

      {loading ? (
        <Stack align="center" gap="md" py={100}>
          <div className="relative">
            <div className="size-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <InboxStackIcon className="size-6 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
          </div>
          <Text
            size="xs"
            fw={900}
            className="uppercase tracking-[0.3em] text-zinc-500"
          >
            Consultando Inventario...
          </Text>
        </Stack>
      ) : groupedProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 border border-dashed border-zinc-800 rounded-4xl bg-zinc-900/10 backdrop-blur-sm">
          <InboxStackIcon className="size-12 text-zinc-700 mb-4" />
          <Text
            size="sm"
            fw={700}
            className="text-zinc-400 uppercase tracking-widest"
          >
            Sin resultados
          </Text>
          <Text size="xs" c="dimmed" className="mt-1">
            No se encontraron lotes para los filtros aplicados.
          </Text>
        </div>
      ) : (
        <Stack gap="xl">
          {groupedProducts.map((p) => (
            <ProductGroupCard
              key={p.id_producto}
              product={p}
              columns={columns}
              loading={loading}
              onPrint={handlePrint}
              selection={{
                selectedRecords: selectedLotes,
                setSelectedRecords: setSelectedLotes,
              }}
            />
          ))}
        </Stack>
      )}

      <ModalEstandar
        opened={openedCreate}
        close={closeCreate}
        title="Ingreso de Stock"
        size="lg"
      >
        <RegistroLote
          initialAlmacenId={idAlmacen ? Number(idAlmacen) : null}
          almacenes={almacenes}
          onSuccess={(nuevoLote) => {
            closeCreate();
            addLote(nuevoLote);
            handlePrint(nuevoLote);
          }}
          onCancel={closeCreate}
        />
      </ModalEstandar>

      <ModalEstandar
        opened={openedAjuste}
        close={closeAjuste}
        title="Corrección de Inventario"
        size="lg"
      >
        {loteParaAjustar && (
          <AjusteStockModal
            lote={loteParaAjustar}
            onSuccess={(updatedLote) => {
              updateLote(updatedLote);
              closeAjuste();
            }}
            onCancel={closeAjuste}
          />
        )}
      </ModalEstandar>

      <ModalEstandar
        opened={openedEdicion}
        close={handleCloseEdit}
        title={
          loteParaEditar
            ? `Editar lote: ${loteParaEditar.correlativo}`
            : "Editar lote"
        }
        size="lg"
      >
        {loteParaEditar && (
          <EditarLoteModal
            lote={loteParaEditar}
            onSuccess={(editado) => {
              updateLote(editado);
              handleCloseEdit();
            }}
            onCancel={handleCloseEdit}
          />
        )}
      </ModalEstandar>

      <ModalEstandar
        opened={openedHistorial}
        close={handleCloseHistory}
        title={
          loteParaHistorial
            ? `Historial de cambios: ${loteParaHistorial.correlativo}`
            : "Historial de cambios"
        }
        size="xl"
      >
        {loteParaHistorial && <HistorialLoteModal lote={loteParaHistorial} />}
      </ModalEstandar>
    </div>
  );
};
