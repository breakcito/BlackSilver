import { useCallback } from "react";
import type {
  DTO_CotizacionRequest,
  DTO_ProductoComparativo,
  DTO_RegistrarComparativo,
} from "../../service/cotizaciones.requests";
import type { RES_Comparativo } from "../../../../service/responses/cotizaciones/cotizacion";
import { useCotizacionMaestros } from "../shared/useCotizacionMaestros";
import { useCotizacionGrid } from "../shared/useCotizacionGrid";
import { useCotizacionHandlers } from "../shared/useCotizacionHandlers";
import { useCotizacionPersistence } from "./useCotizacionPersistence";
import { Moneda } from "../../../../shared/enums/_generic/moneda";
import type { MaestrosState } from "../shared/utils";
import { TipoEntidad } from "../../../../shared/enums/_generic/tipo-entidad";
import { MetodoPago } from "../../../../shared/enums/_generic/metodo-pago";
import { Estado_Cotizacion } from "../../../../shared/enums/cotizacion/cotizacion";
import { TipoDespachoCompra } from "../../../../shared/enums/_generic/tipo-despacho-compra";
import { Periodo } from "../../../../shared/enums/_generic/periodo";

/**
 * Item que viene de una solicitud de reabastecimiento seleccionada. El padre
 * (Detalle de Solicitud de Reabastecimiento) lo construye y lo pasa al modal
 * de Nueva Cotizacion para pre-rellenar productos + cantidades.
 */
export interface ItemSolicitudParaCotizar {
  id_solicitud_reabastecimiento_detalle: number;
  id_producto: number;
  id_unidad_medida_base: number;
  cantidad_solicitada_base: number;
}

export { type MaestrosState };

export const useRegistroCotizacion = (
  onSuccess: (
    data: RES_Comparativo[],
    payload: DTO_RegistrarComparativo,
    currentMaestros: MaestrosState,
    printTarget?: string,
  ) => void,
  monedaFiltro: Moneda | null = null,
) => {
  const defaultMonedaCotizacion: Moneda = monedaFiltro ?? Moneda.Soles;
  const { maestros, loadingMaestros, agregarProveedorLocal, agregarProductoLocal } = useCotizacionMaestros();
  
  const {
    productos,
    setProductos,
    cotizaciones,
    setCotizaciones,
    toggleProductoEnComparador,
    agregarCotizacion,
    eliminarCotizacion,
    eliminarFilaProducto,
    limpiarComparativo,
  } = useCotizacionGrid(maestros, defaultMonedaCotizacion);

  const {
    updateCotizacionHeader,
    updateCotizacionDetail,
    toggleCotizacionNoCotiza,
    updateGlobalLogistica,
    duplicarFilaProducto,
    copySource,
    iniciarCopia: _iniciarCopia,
    cancelarCopia,
    pegarCopia,
    copiedCotizacion,
    iniciarCopiaCotizacion,
    pegarCotizacion,
    cancelarCopiaCotizacion,
  } = useCotizacionHandlers(setProductos, setCotizaciones, maestros);

  const {
    handleSave,
    loading,
    wizardAprobacionOpened,
    setWizardAprobacionOpened,
    wizardPayload,
    productosEnUsoIds,
  } = useCotizacionPersistence(productos, cotizaciones, maestros, onSuccess);

  // Wrapper para pasar cotizaciones actualizadas al iniciar copia
  const iniciarCopia = useCallback(
    (cotIndex: number, rowIndex: number, id_producto: number) => {
      _iniciarCopia(cotIndex, rowIndex, id_producto, cotizaciones);
    },
    [_iniciarCopia, cotizaciones],
  );

  // Wrapper para pasar cotizaciones al iniciar copia de cotización completa
  const _iniciarCopiaCotizacion = useCallback(
    (sourceIndex: number, type: "all" | "general" | "delivery") => {
      iniciarCopiaCotizacion(sourceIndex, type, cotizaciones);
    },
    [iniciarCopiaCotizacion, cotizaciones],
  );

  /**
   * Pre-rellena el comparativo a partir de items seleccionados en una solicitud
   * de reabastecimiento. Crea los productos en el comparativo y genera una
   * cotizacion inicial con un detalle por producto en la unidad base, con
   * cantidad y precio pre-rellenados. Pensado para el flujo "Cotizar" desde
   * Detalle de Solicitud de Reabastecimiento.
   */
  const seedFromSolicitud = useCallback(
    (
      idSolicitud: number,
      items: ItemSolicitudParaCotizar[],
      empresasIds: number[],
    ) => {
      if (items.length === 0) return;

      // 1. Cargar productos en el comparativo (con id_solicitud_detalle poblado)
      const productosComparativo: DTO_ProductoComparativo[] = items.map((it) => ({
        id_producto: it.id_producto,
        id_solicitud_detalle: it.id_solicitud_reabastecimiento_detalle,
      }));
      setProductos(productosComparativo);

      // 2. Crear una cotizacion inicial con un detalle por producto.
      // La unidad de cada detalle es la unidad BASE del producto y la cantidad
      // es la cantidad solicitada en la solicitud (en unidad base), para
      // que el proveedor cotice sobre lo que realmente se necesita.
      const nuevaCot: DTO_CotizacionRequest = {
        id_proveedor: 0,
        tipo_entidad_proveedor: TipoEntidad.Juridica,
        empresas_ids: empresasIds,
        moneda: defaultMonedaCotizacion,
        tipo_cambio_venta_referencial:
          defaultMonedaCotizacion === Moneda.Soles ? 1 : undefined,
        metodo_pago: MetodoPago.Contado,
        fecha_vencimiento_pago: null,
        costo_flete: 0,
        otros_gastos: 0,
        total_antes_igv: 0,
        incluye_igv: true,
        porcentaje_igv: 18,
        monto_igv: 0,
        total_despues_igv: 0,
        observacion: null,
        estado: Estado_Cotizacion.Generada,
        id_solicitud_reabastecimiento: idSolicitud,
        detalles: items.map((it) => {
          const maestro = maestros.catalogo.find(
            (m) => m.id_producto === it.id_producto,
          );
          const idUnidadBase =
            it.id_unidad_medida_base ||
            maestro?.id_unidad_medida_base ||
            1;
          const cantidadBase = it.cantidad_solicitada_base || 0;
          const costoBase = maestro?.costo_promedio_base || 0;
          // Estructura minima valida para que el backend acepte el detalle
          // y permita al usuario completar tiempos / despacho despues.
          return {
            id_producto: it.id_producto,
            id_unidad_medida: idUnidadBase,
            id_almacen_recepcionista: null,
            id_mina_destino: null,
            tipo_despacho: TipoDespachoCompra.Envio,
            lugar_recojo: null,
            tiempo_entrega: 1,
            tiempo_entrega_periodo: Periodo.Diario,
            tiempo_entrega_dias: 1,
            cantidad: cantidadBase,
            contenido_por_presentacion: 1,
            cantidad_base: cantidadBase,
            // Auto-rellenar precio solo si la moneda coincide con la del producto.
            precio_unitario:
              defaultMonedaCotizacion === maestro?.moneda ? costoBase : 0,
            precio_unitario_base:
              defaultMonedaCotizacion === maestro?.moneda ? costoBase : 0,
            comentario: null,
            no_cotiza: false,
            id_solicitud_reabastecimiento_detalle:
              it.id_solicitud_reabastecimiento_detalle,
          };
        }),
      };

      setCotizaciones([nuevaCot]);
    },
    [maestros.catalogo, defaultMonedaCotizacion, setProductos, setCotizaciones],
  );

  return {
    productos,
    cotizaciones,
    maestros,
    agregarProveedorLocal,
    agregarProductoLocal,
    loading,
    loadingMaestros,
    toggleProductoEnComparador,
    productosEnUsoIds,
    agregarCotizacion,
    eliminarCotizacion,
    eliminarFilaProducto,
    limpiarComparativo,
    updateCotizacionHeader,
    updateCotizacionDetail,
    toggleCotizacionNoCotiza,
    handleSave,
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
    iniciarCopiaCotizacion: _iniciarCopiaCotizacion,
    pegarCotizacion,
    cancelarCopiaCotizacion,
    seedFromSolicitud,
  };
};
