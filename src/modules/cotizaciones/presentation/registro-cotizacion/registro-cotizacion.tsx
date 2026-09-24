import { forwardRef, useImperativeHandle, useEffect } from "react";
import { Group, Button } from "@mantine/core";
import {
  useRegistroCotizacion,
  type ItemSolicitudParaCotizar,
  type MaestrosState,
} from "../../hooks/registro-cotizacion/useRegistroCotizacion";
import { ComparativoTabla } from "./components/comparativo-tabla";
import { ModalSeleccionProductos } from "../components/modal-seleccion-productos";
import { ModalAsistenteAprobacion } from "./components/modal-asistente-aprobacion";
import { usePrint } from "../../../../hooks/usePrint";
import { CotizacionPDF } from "../cotizacion-pdf";
import type {
  RES_Comparativo,
  RES_CotizacionDetalle,
} from "../../../../service/responses/cotizaciones/cotizacion";
import type { DTO_RegistrarComparativo } from "../../service/cotizaciones.requests";
import { Moneda } from "../../../../shared/enums/_generic/moneda";

interface RegistroCotizacionProps {
  onSuccess: (data: RES_Comparativo[]) => void;
  onCancel: () => void;
  modalProductosOpened: boolean;
  setModalProductosOpened: (opened: boolean) => void;
  esAuditableGlobal: boolean;
  monedaFiltro?: Moneda | null;
  onChangeMoneda?: (newMoneda: Moneda) => void;
  onProductosChange?: (
    prods: { id_producto: number; nombre: string }[],
  ) => void;
  /**
   * Si viene, el modal pre-rellena el comparativo con los items de la solicitud
   * de reabastecimiento y crea una cotizacion inicial. Usado desde
   * Detalle de Solicitud -> "Cotizar".
   */
  preCargarDesdeSolicitud?: {
    idSolicitud: number;
    items: ItemSolicitudParaCotizar[];
    empresasIds: number[];
  };
}

export const RegistroCotizacion = forwardRef<
  {
    agregarCotizacion: () => void;
    limpiarComparativo: () => void;
    hasProductos: () => boolean;
  },
  RegistroCotizacionProps
>(
  (
    {
      onSuccess,
      onCancel,
      modalProductosOpened,
      setModalProductosOpened,
      esAuditableGlobal,
      monedaFiltro = null,
      onChangeMoneda,
      onProductosChange,
      preCargarDesdeSolicitud,
    },
    ref,
  ) => {
    const { print } = usePrint();

    const handleInternalSuccess = async (
      data: RES_Comparativo[],
      _payload: DTO_RegistrarComparativo,
      _maestros: MaestrosState,
      printTarget?: string,
    ) => {
      // El response ya viene con el formato completo del listado.
      // Generar PDF de cotizaciones directamente desde los datos del response.
      if (data && data.length > 0) {
        const comp = data[0];
        // url_logo ya viene como base64 data URL desde el backend
        const cotizacionesPDFData = comp.cotizaciones.map((cot) => ({
          cotizacion: cot,
          detalles: cot.detalles as RES_CotizacionDetalle[],
          empresas: cot.empresas.map((e) => ({
            razon_social: e.razon_social,
            url_logo: e.url_logo ?? null,
          })),
        }));

        if (cotizacionesPDFData.length > 0) {
          print(<CotizacionPDF cotizaciones={cotizacionesPDFData} />, {
            documentTitle: "Cotizaciones Generadas",
            target: printTarget,
          });
        }
      }
      onSuccess(data);
    };

    const {
      productos,
      cotizaciones,
      loading,
      loadingMaestros,
      toggleProductoEnComparador,
      agregarCotizacion,
      eliminarCotizacion,
      eliminarFilaProducto,
      limpiarComparativo,
      updateCotizacionHeader,
      updateCotizacionDetail,
      toggleCotizacionNoCotiza,
      handleSave,
      maestros,
      agregarProveedorLocal,
      agregarProductoLocal,
      wizardAprobacionOpened,
      setWizardAprobacionOpened,
      wizardPayload,
      duplicarFilaProducto,
      updateGlobalLogistica,
      copySource,
      iniciarCopia,
      cancelarCopia,
      pegarCopia,
      copiedCotizacion,
      iniciarCopiaCotizacion,
      pegarCotizacion,
      cancelarCopiaCotizacion,
      seedFromSolicitud,
    } = useRegistroCotizacion(handleInternalSuccess, monedaFiltro);

    // Exponemos la función al componente padre (CotizacionesPage)
    useImperativeHandle(ref, () => ({
      agregarCotizacion,
      limpiarComparativo,
      hasProductos: () => productos.length > 0,
    }));

    // Auto-pre-cargar si el padre paso `preCargarDesdeSolicitud`. Solo
    // dispara una vez (cuando productos esta vacio); si el usuario limpia
    // manualmente el comparativo despues, no se vuelve a auto-rellenar.
    useEffect(() => {
      if (
        preCargarDesdeSolicitud &&
        preCargarDesdeSolicitud.items.length > 0 &&
        productos.length === 0
      ) {
        seedFromSolicitud(
          preCargarDesdeSolicitud.idSolicitud,
          preCargarDesdeSolicitud.items,
          preCargarDesdeSolicitud.empresasIds,
        );
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const productosParaMostrar = productos.map((p) => {
      const maestro = maestros.catalogo.find(
        (m) => m.id_producto === p.id_producto,
      );
      // Cuando el producto del comparativo no se encuentra en el catalogo
      // cacheado de cotizaciones (porque su maestro no se termino de cargar
      // o porque la solicitud trae un id_producto que el cache no tiene),
      // marcamos `requiereCargaProducto: true` para que la UI muestre un
      // placeholder claro y permita al usuario cargarlo via el modal
      // ModalSeleccionProductos (boton "+ Nuevo Producto").
      const requiereCargaProducto = maestro === undefined;
      return {
        ...p,
        nombre: maestro?.nombre || `Producto #${p.id_producto}`,
        codigo: "",
        id_unidad_medida_base: maestro?.id_unidad_medida_base || 0,
        unidad_medida_base: maestro?.unidad_medida_base || "unidades",
        unidad_medida_abreviatura: maestro?.unidad_medida_base_abv || "UND",
        tipo_bien: maestro?.tipo_bien,
        requiereCargaProducto,
      };
    });

    useEffect(() => {
      const uniqueProds: { id_producto: number; nombre: string }[] = [];
      const seen = new Set<number>();
      for (const p of productosParaMostrar) {
        if (!seen.has(p.id_producto)) {
          seen.add(p.id_producto);
          uniqueProds.push({
            id_producto: p.id_producto,
            nombre: p.nombre,
          });
        }
      }
      onProductosChange?.(uniqueProds);
    }, [productosParaMostrar, onProductosChange]);

    return (
      <div className="flex flex-col h-[calc(100vh-180px)] overflow-hidden">
        {/* Área de la Tabla (La tabla maneja su propio scroll interno) */}
        <div className="flex-1 min-h-0 pr-1">
          <ComparativoTabla
            productos={productosParaMostrar}
            cotizaciones={cotizaciones}
            unidadesMedida={maestros.unidades.map((u) => ({
              value: String(u.id_unidad_medida),
              label: u.nombre,
              abreviatura: u.abreviatura,
            }))}
            almacenes={maestros.almacenes}
            minas={maestros.minas}
            proveedores={maestros.proveedores}
            onAgregarProveedorLocal={agregarProveedorLocal}
            empresas={maestros.empresas}
            loadingMaestros={loadingMaestros}
            onUpdateHeader={updateCotizacionHeader}
            onUpdateDetail={updateCotizacionDetail}
            onToggleNoCotiza={toggleCotizacionNoCotiza}
            onRemoveCotizacion={eliminarCotizacion}
            onDuplicarFila={duplicarFilaProducto}
            onEliminarFila={eliminarFilaProducto}
            onUpdateGlobalLogistica={updateGlobalLogistica}
            copySource={copySource}
            onIniciarCopia={iniciarCopia}
            onCancelarCopia={cancelarCopia}
            onPegarCopia={pegarCopia}
            copiedCotizacion={copiedCotizacion}
            onIniciarCopiaCotizacion={iniciarCopiaCotizacion}
            onPegarCotizacion={pegarCotizacion}
            onCancelarCopiaCotizacion={cancelarCopiaCotizacion}
            monedaFiltro={monedaFiltro}
          />
        </div>

        {/* Footer Fijo con Acciones */}
        <div className="py-3 pr-5 flex-none bg-zinc-950">
          <Group justify="flex-end" gap="md">
            <Button
              variant="subtle"
              onClick={onCancel}
              disabled={loading}
              radius="xl"
              size="sm"
              className="text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
            >
              Cancelar
            </Button>
            <Button
              loading={loading}
              onClick={handleSave}
              radius="xl"
              size="sm"
              color="teal"
              variant="filled"
              className=" font-bold shadow-lg border-0 px-8"
              disabled={productos.length === 0 || cotizaciones.length === 0}
            >
              Registrar Cotización
            </Button>
          </Group>
        </div>

        <ModalSeleccionProductos
          opened={modalProductosOpened}
          onClose={() => setModalProductosOpened(false)}
          onToggle={(id) => toggleProductoEnComparador(id)}
          seleccionadosActuales={productos.map((p) => p.id_producto)}
          catalogoProductos={maestros.catalogo}
          loading={loadingMaestros.catalogo}
          soloAuditables={esAuditableGlobal}
          monedaFiltrar={monedaFiltro}
          onClearSeleccion={() => limpiarComparativo()}
          onChangeMoneda={onChangeMoneda}
          onProductoCreado={(nuevoProd) => {
            agregarProductoLocal(nuevoProd);
          }}
        />

        <ModalAsistenteAprobacion
          opened={wizardAprobacionOpened}
          onClose={() => setWizardAprobacionOpened(false)}
          payloadOriginal={wizardPayload}
          todasLasCotizaciones={wizardPayload?.cotizaciones || []}
          maestros={maestros}
          onSuccessCompleto={onSuccess}
        />
      </div>
    );
  },
);
