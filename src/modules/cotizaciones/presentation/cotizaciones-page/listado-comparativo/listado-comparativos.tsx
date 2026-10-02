import { useState } from "react";
import { Stack } from "@mantine/core";
import { TablaDetalleResumen } from "../detalle/tabla-detalle-resumen";
import { ModalEstandar } from "../../../../../presentation/utils/modal-estandar";
import { Estado_Cotizacion } from "../../../../../shared/enums/cotizacion/cotizacion";
import { usePrint } from "../../../../../hooks/usePrint";
import { CotizacionPDF } from "../../cotizacion-pdf";
import { ModalAprobarCotizacion } from "../detalle/modal-aprobar-cotizacion";
import { CotizacionesService } from "../../../service/cotizaciones.service";
import { OrdenCompraPDF } from "../../../../../presentation/utils/orden-compra-pdf";
import { useNotify } from "../../../../../hooks/useNotify";
import { ModalEditarCotizacion } from "../../edicion-cotizacion/modal-editar-cotizacion";
import type {
  RES_Comparativo,
  RES_Cotizacion,
  RES_CotizacionDetalle,
} from "../../../../../service/responses/cotizaciones/cotizacion";

// Components
import { EmptyState } from "./components/EmptyState";
import { ComparativoCard } from "./components/ComparativoCard";
import { ActionIcon, Group, Tooltip } from "@mantine/core";
import { ListBulletIcon, TableCellsIcon } from "@heroicons/react/24/outline";

interface ListadoComparativosProps {
  comparativos: RES_Comparativo[];
  busqueda: string;
  onUpdateLocal?: (
    id: number,
    nuevoEstado: Estado_Cotizacion,
    idsDetallesAprobados?: number[],
    id_orden_compra?: number,
  ) => void;
  onReplaceLocal?: (actualizados: RES_Comparativo[]) => void;
}

// ─── Colores y labels por estado ──────────────────────────────────────────────
const COLOR_BY_STATE: Record<
  string,
  { color: string; label: string; variant: string }
> = {
  [Estado_Cotizacion.Generada]: {
    color: "indigo",
    label: "Generada",
    variant: "light",
  },
  [Estado_Cotizacion.Aprobada]: {
    color: "teal",
    label: "Aprobada",
    variant: "filled",
  },
};

export const ListadoComparativos = ({
  comparativos,
  busqueda,
  onUpdateLocal,
  onReplaceLocal,
}: ListadoComparativosProps) => {
  const { print, prepare } = usePrint();
  const { notify } = useNotify();
  const [printingOCId, setPrintingOCId] = useState<number | null>(null);
  const [expandedComps, setExpandedComps] = useState<Record<number, boolean>>(
    {},
  );
  const [expandedCots, setExpandedCots] = useState<Record<number, boolean>>({});

  const [modalComparativoOpened, setModalComparativoOpened] = useState(false);
  const [selectedCompId, setSelectedCompId] = useState<number | null>(null);
  const [resumenDetalleIsCollapsed, setResumenDetalleIsCollapsed] =
    useState(false);

  const [modalAprobarOpened, setModalAprobarOpened] = useState(false);
  const [selectedCotIdParaAprobar, setSelectedCotIdParaAprobar] = useState<
    number | null
  >(null);

  const [modalEditarOpened, setModalEditarOpened] = useState(false);
  const [selectedCotParaEditar, setSelectedCotParaEditar] =
    useState<RES_Cotizacion | null>(null);

  const toggleComp = (id: number) =>
    setExpandedComps((prev) => {
      const current = prev[id] ?? true;
      return { ...prev, [id]: !current };
    });

  const toggleCot = (id: number) =>
    setExpandedCots((prev) => {
      const current = prev[id] ?? true;
      return { ...prev, [id]: !current };
    });

  const handleVerComparativo = (id: number) => {
    setSelectedCompId(id);
    setModalComparativoOpened(true);
  };

  const handlePrintCotizacion = async (cot: RES_Cotizacion) => {
    const target = `Cotizacion_${cot.id_cotizacion}_${Date.now()}`;
    prepare(target);

    // url_logo ya viene como base64 data URL desde el backend
    const empresasInfo = cot.empresas.map((e) => ({
      razon_social: e.razon_social,
      url_logo: e.url_logo ?? null,
    }));

    print(
      <CotizacionPDF
        cotizaciones={[
          {
            cotizacion: cot,
            detalles: cot.detalles,
            empresas: empresasInfo,
          },
        ]}
      />,
      {
        documentTitle: `Cotización - ${cot.correlativo}`,
        target,
      },
    );
  };

  const handleApprove = (id: number) => {
    setSelectedCotIdParaAprobar(id);
    setModalAprobarOpened(true);
  };

  const handleSuccessAprobacion = (
    id: number,
    _cotizacionModificada: RES_Cotizacion,
    detallesAprobados: RES_CotizacionDetalle[],
    id_orden_compra?: number,
  ) => {
    onUpdateLocal?.(
      id,
      Estado_Cotizacion.Aprobada,
      detallesAprobados.map((d) => d.id_cotizacion_detalle),
      id_orden_compra,
    );
  };

  const handleEdit = (cot: RES_Cotizacion) => {
    setSelectedCotParaEditar(cot);
    setModalEditarOpened(true);
  };

  const handleSuccessEdicion = (data: RES_Comparativo[]) => {
    notify({
      type: "success",
      content: "Cotización actualizada correctamente.",
    });
    setModalEditarOpened(false);

    if (onReplaceLocal) {
      onReplaceLocal(data);
    }
  };

  const handlePrintOC = async (id_orden_compra: number) => {
    const target = `OC_${id_orden_compra}_${Date.now()}`;
    prepare(target);
    setPrintingOCId(id_orden_compra);

    try {
      const response =
        await CotizacionesService.get_orden_compra(id_orden_compra);
      if (response.success && response.data) {
        const ordenData = response.data;
        // empresa_logo ya viene como base64 data URL desde el backend
        print(
          <OrdenCompraPDF
            orden={ordenData}
            detalles={ordenData.detalles || []}
          />,
          {
            documentTitle: `OC - ${ordenData.correlativo}`,
            target,
          },
        );
      } else {
        notify({
          type: "error",
          content: "No se pudo cargar la Orden de Compra.",
        });
      }
    } catch {
      notify({ type: "error", content: "Error al generar el PDF de la OC." });
    } finally {
      setPrintingOCId(null);
    }
  };

  // Filtrado por búsqueda sobre la estructura anidada
  const comparativosFiltrados = comparativos
    .slice()
    .sort((a, b) => b.id_comparativo - a.id_comparativo)
    .filter((comp) => {
      if (!busqueda) return true;
      const term = busqueda.toLowerCase();
      return (
        comp.id_comparativo.toString().includes(term) ||
        comp.cotizaciones.some(
          (c) =>
            c.correlativo.toLowerCase().includes(term) ||
            c.proveedor.toLowerCase().includes(term),
        )
      );
    });

  if (comparativosFiltrados.length === 0) {
    return <EmptyState busqueda={busqueda} />;
  }

  return (
    <Stack gap="lg">
      {comparativosFiltrados.map((comp) => (
        <ComparativoCard
          key={comp.id_comparativo}
          comp={comp}
          isExpanded={expandedComps[comp.id_comparativo] ?? true}
          onToggle={() => toggleComp(comp.id_comparativo)}
          onVerComparativo={handleVerComparativo}
          expandedCots={expandedCots}
          onToggleCot={toggleCot}
          onPrintCotizacion={handlePrintCotizacion}
          onPrintOC={handlePrintOC}
          onApprove={handleApprove}
          onEdit={handleEdit}
          printingOCId={printingOCId}
          stateConfigs={COLOR_BY_STATE}
        />
      ))}

      {/* MODAL DE COMPARATIVO MATRICIAL */}
      <ModalEstandar
        opened={modalComparativoOpened}
        onClose={() => setModalComparativoOpened(false)}
        close={() => setModalComparativoOpened(false)}
        title="Comparativo de Cotizaciones"
        validateClose
        size="95%"
        rightSection={
          <Group gap="xs" mr="xl">
            <Tooltip
              label={
                resumenDetalleIsCollapsed
                  ? "Ver Detalle Extendido"
                  : "Ver Vista Resumida"
              }
              withArrow
            >
              <ActionIcon
                variant="light"
                color={resumenDetalleIsCollapsed ? "cyan" : "indigo"}
                size="lg"
                radius="xl"
                onClick={() =>
                  setResumenDetalleIsCollapsed(!resumenDetalleIsCollapsed)
                }
                className="shadow-lg active:scale-95 transition-all border border-white/10"
              >
                {resumenDetalleIsCollapsed ? (
                  <ListBulletIcon className="w-5 h-5" />
                ) : (
                  <TableCellsIcon className="w-5 h-5" />
                )}
              </ActionIcon>
            </Tooltip>
          </Group>
        }
      >
        <div style={{ height: "70vh" }}>
          {selectedCompId &&
            (() => {
              const compSeleccionado = comparativos.find(
                (c) => c.id_comparativo === selectedCompId,
              );
              if (!compSeleccionado) return null;
              const allDetalles = compSeleccionado.cotizaciones.flatMap(
                (c) => c.detalles,
              );
              const allEmpresas = compSeleccionado.cotizaciones.flatMap(
                (c) => c.empresas,
              );
              return (
                <TablaDetalleResumen
                  isCollapsed={resumenDetalleIsCollapsed}
                  cotizaciones={compSeleccionado.cotizaciones}
                  empresas={allEmpresas}
                  detalles={allDetalles}
                  onApprove={handleApprove}
                  loadingApprove={null}
                />
              );
            })()}
        </div>
      </ModalEstandar>

      {/* Modal Aprobación Parcial y Orden de Compra */}
      <ModalAprobarCotizacion
        opened={modalAprobarOpened}
        onClose={() => setModalAprobarOpened(false)}
        cotizacion={
          selectedCotIdParaAprobar
            ? comparativos
                .flatMap((comp) => comp.cotizaciones)
                .find((c) => c.id_cotizacion === selectedCotIdParaAprobar) ||
              null
            : null
        }
        detalles={
          selectedCotIdParaAprobar
            ? (comparativos
                .flatMap((comp) => comp.cotizaciones)
                .find((c) => c.id_cotizacion === selectedCotIdParaAprobar)
                ?.detalles ?? [])
            : []
        }
        empresas={
          selectedCotIdParaAprobar
            ? (comparativos
                .flatMap((comp) => comp.cotizaciones)
                .find((c) => c.id_cotizacion === selectedCotIdParaAprobar)
                ?.empresas ?? [])
            : []
        }
        onSuccess={handleSuccessAprobacion}
      />

      <ModalEstandar
        opened={modalEditarOpened}
        onClose={() => setModalEditarOpened(false)}
        close={() => setModalEditarOpened(false)}
        title="Editar Cotización"
        validateClose
        size="64%"
      >
        {selectedCotParaEditar && (
          <ModalEditarCotizacion
            cotizacion={selectedCotParaEditar}
            onSuccess={handleSuccessEdicion}
            onCancel={() => setModalEditarOpened(false)}
          />
        )}
      </ModalEstandar>
    </Stack>
  );
};
