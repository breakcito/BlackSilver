import { useTitlePage } from "../../../hooks/useTitlePage";
import { useListarControlConsumo } from "../hooks/useListarControlConsumo";
import { FiltrosConsumo } from "./components/filtros-consumo";
import { CardRequerimiento } from "./components/card-requerimiento";
import { GastosExtraSection } from "./components/gastos-extra-section";
import { ConsumosDirectosSection } from "./components/consumos-directos-section";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { RegistroConsumo } from "./registro-consumo/registro-consumo";
import { Stack, Text } from "@mantine/core";
import {
  InboxStackIcon,
  ArchiveBoxArrowDownIcon,
} from "@heroicons/react/24/outline";
import { useState, useMemo } from "react";
import type { RES_ResumenEntregasReq } from "../service/control-consumo.responses";
import type { GroupedRequerimiento } from "./components/card-requerimiento";
import { useExcel } from "../../../hooks/useExcel";
import { useNotify } from "../../../hooks/useNotify";
import { useControlConsumoExcel } from "./excel-control-consumo";

export const ControlConsumoPage = () => {
  useTitlePage("Control de Consumo");

  const {
    reporte,
    consumosDirectos,
    gastosExtra,
    loading,
    busqueda,
    setBusqueda,
    mes,
    setMes,
    anio,
    setAnio,
    minas,
    idMina,
    setIdMina,
    loadingMinas,
    almacenes,
    idAlmacen,
    setIdAlmacen,
    loadingAlmacenes,
    activos,
    agregarConsumoLocal,
    actualizarTurnoLocal,
    agregarGastoExtraLocal,
    recargar,
  } = useListarControlConsumo();

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] =
    useState<RES_ResumenEntregasReq | null>(null);

  // Group data by Requerimiento (Level 1) and then by Entrega (Level 2)
  const groupedData = useMemo(() => {
    const reqsMap = new Map<number, GroupedRequerimiento>();

    reporte.forEach((item) => {
      let req = reqsMap.get(item.id_requerimiento_almacen);
      if (!req) {
        req = {
          id_requerimiento_almacen: item.id_requerimiento_almacen,
          correlativo_requerimiento: item.correlativo_requerimiento,
          fecha_requerimiento: item.fecha_requerimiento,
          es_auditable: item.es_auditable,
          solicitante: item.solicitante,
          cargo_solicitante: item.cargo_solicitante,
          mina: item.mina,
          almacen_destino: item.almacen_destino,
          entregas: [],
        };
        reqsMap.set(item.id_requerimiento_almacen, req);
      }

      let entrega = req.entregas.find(
        (e) =>
          e.id_requerimiento_almacen_entrega ===
          item.id_requerimiento_almacen_entrega,
      );
      if (!entrega) {
        entrega = {
          id_requerimiento_almacen_entrega:
            item.id_requerimiento_almacen_entrega,
          fecha_hora_entrega: item.fecha_hora_entrega,
          detalles: [],
        };
        req.entregas.push(entrega);
      }

      entrega.detalles.push(item);
    });

    return Array.from(reqsMap.values());
  }, [reporte]);

  const handleOpenRegistrar = (det: RES_ResumenEntregasReq) => {
    setSelectedDetail(det);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedDetail(null);
  };

  // Excel export
  const { generateExcel, isGeneratingExcel } = useExcel();
  const { notifyError } = useNotify();
  const { generate: generateExcelConfig } = useControlConsumoExcel();

  const handleExportExcel = () => {
    if (reporte.length === 0 && consumosDirectos.length === 0) {
      notifyError("No hay datos para exportar con los filtros actuales.");
      return;
    }
    const cfg = generateExcelConfig({
      reporte,
      consumosDirectos,
      mes,
      anio,
    });
    generateExcel({
      filename: cfg.filename,
      builder: cfg.builder,
    });
  };

  return (
    <Stack gap="lg" className="animate-fade-in text-zinc-100">
      {/* 1. Search and Period Filter Component */}
      <FiltrosConsumo
        idMina={idMina}
        setIdMina={setIdMina}
        minas={minas}
        loadingMinas={loadingMinas}
        idAlmacen={idAlmacen}
        setIdAlmacen={setIdAlmacen}
        almacenes={almacenes}
        loadingAlmacenes={loadingAlmacenes}
        mes={mes}
        setMes={setMes}
        anio={anio}
        setAnio={setAnio}
        busqueda={busqueda}
        setBusqueda={setBusqueda}
        onReload={recargar}
        loading={loading}
        onExportExcel={handleExportExcel}
        exportingExcel={isGeneratingExcel}
        exportDisabled={reporte.length === 0 && consumosDirectos.length === 0}
      />

      {/* 2. Gastos Extra (3 a 4 por fila) */}
      <GastosExtraSection
        gastos={gastosExtra}
        onGastoRegistrado={agregarGastoExtraLocal}
      />

      {/* 3. Consumos Directos */}
      <ConsumosDirectosSection
        consumos={consumosDirectos}
        onActualizarTurno={actualizarTurnoLocal}
        loading={loading}
      />

      {/* 4. Grouped Content Body (Entregas por Requerimiento) */}
      <div className="relative">
        {loading ? (
          <Stack
            align="center"
            gap="md"
            py={100}
            className="bg-zinc-900/65 border border-zinc-800 rounded-[24px]"
          >
            <div className="relative">
              <div className="size-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <ArchiveBoxArrowDownIcon className="size-6 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            <Text
              size="xs"
              fw={900}
              className="uppercase tracking-[0.3em] text-zinc-500"
            >
              Cargando historial de consumos...
            </Text>
          </Stack>
        ) : groupedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 bg-zinc-900/65 border border-zinc-800 rounded-[24px] animate-fade-in">
            <InboxStackIcon className="size-12 text-zinc-700 mb-4 animate-bounce" />
            <Text
              size="sm"
              fw={700}
              className="text-zinc-400 uppercase tracking-widest"
            >
              Sin entregas registradas
            </Text>
            <Text size="xs" c="dimmed" className="mt-1">
              No se encontraron entregas de almacén asociadas en este periodo.
            </Text>
          </div>
        ) : (
          <div className="flex flex-col gap-6 animate-fade-in">
            {groupedData.map((req) => (
              <CardRequerimiento
                key={req.id_requerimiento_almacen}
                req={req}
                loading={loading}
                onConsumir={handleOpenRegistrar}
                onActualizarTurno={actualizarTurnoLocal}
              />
            ))}
          </div>
        )}
      </div>

      {/* Register Consumption Modal Wrapper */}
      <ModalEstandar
        opened={modalOpen}
        close={handleCloseModal}
        title={`Registrar Consumo`}
        size="lg"
      >
        {selectedDetail && (
          <RegistroConsumo
            selectedDetail={selectedDetail}
            onSuccess={agregarConsumoLocal}
            activos={activos}
            close={handleCloseModal}
          />
        )}
      </ModalEstandar>
    </Stack>
  );
};
