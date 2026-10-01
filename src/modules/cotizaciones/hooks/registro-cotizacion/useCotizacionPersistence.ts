import { useState, useMemo } from "react";
import type { DTO_CotizacionRequest, DTO_ProductoComparativo, DTO_RegistrarComparativo } from "../../service/cotizaciones.requests";
import type { RES_Comparativo } from "../../../../service/responses/cotizaciones/cotizacion";
import { CotizacionesService } from "../../service/cotizaciones.service";
import { useNotify } from "../../../../hooks/useNotify";
import { usePrint } from "../../../../hooks/usePrint";
import { MetodoPago } from "../../../../shared/enums/_generic/metodo-pago";
import { TipoDespachoCompra } from "../../../../shared/enums/_generic/tipo-despacho-compra";
import { Estado_Cotizacion } from "../../../../shared/enums/cotizacion/cotizacion";
import type { MaestrosState } from "../shared/utils";

export const useCotizacionPersistence = (
  productos: DTO_ProductoComparativo[],
  cotizaciones: DTO_CotizacionRequest[],
  maestros: MaestrosState,
  onSuccess: (
    data: RES_Comparativo[],
    payload: DTO_RegistrarComparativo,
    currentMaestros: MaestrosState,
    printTarget?: string,
  ) => void,
) => {
  const { notify } = useNotify();
  const { prepare } = usePrint();
  const [loading, setLoading] = useState(false);

  const [wizardAprobacionOpened, setWizardAprobacionOpened] = useState(false);
  const [wizardPayload, setWizardPayload] = useState<DTO_RegistrarComparativo | null>(null);

  const handleSave = async () => {
    if (cotizaciones.length === 0) {
      notify({ type: "info", content: "Debe añadir al menos una cotización." });
      return;
    }
    if (cotizaciones.some((c) => c.id_proveedor === 0)) {
      notify({ type: "info", content: "Todas las cotizaciones deben tener un proveedor asignado." });
      return;
    }
    if (cotizaciones.some((c) => c.empresas_ids.length === 0)) {
      notify({ type: "info", content: "Todas las cotizaciones deben tener al menos una empresa compradora seleccionada." });
      return;
    }
    if (cotizaciones.some((c) => c.metodo_pago === MetodoPago.Credito && !c.fecha_vencimiento_pago)) {
      notify({ type: "info", content: "Si el método es crédito, debe asignar una fecha de vencimiento." });
      return;
    }
    if (cotizaciones.some((c) => c.detalles.filter((d) => !d.no_cotiza).length === 0)) {
      notify({ type: "info", content: "Cada proveedor debe cotizar al menos un producto." });
      return;
    }
    // Cantidad y precio deben ser > 0 en TODOS los productos cotizados (no
    // aplica a los que estan marcados como "no_cotiza", que ni siquiera se
    // envian al backend). Bloquea 0, vacio, null y negativos.
    if (cotizaciones.some((c) => c.detalles.some((d) => {
      if (d.no_cotiza) return false;
      return (
        d.cantidad === undefined ||
        d.cantidad === null ||
        Number(d.cantidad) <= 0
      );
    }))) {
      notify({
        type: "error",
        content: "Todos los productos cotizados deben tener una cantidad mayor a 0. Si no va a cotizar un producto, use el interruptor 'No cotizar'.",
      });
      return;
    }
    if (cotizaciones.some((c) => c.detalles.some((d) => !d.no_cotiza && (d.precio_unitario === undefined || d.precio_unitario === null || Number(d.precio_unitario) <= 0)))) {
      notify({
        type: "error",
        content: "Todos los productos cotizados deben tener un precio mayor a 0. Si no va a cotizar un producto, use el interruptor 'No cotizar'.",
      });
      return;
    }
    if (cotizaciones.some((c) => c.detalles.some((d) => {
      if (d.no_cotiza) return false;
      const tieneAlmacen = d.id_almacen_recepcionista && d.id_almacen_recepcionista !== 0;
      const tieneMina = d.id_mina_destino && d.id_mina_destino !== 0;
      return !tieneAlmacen && !tieneMina;
    }))) {
      notify({ type: "info", content: "Debe seleccionar un destino (almacén o mina) para todos los productos cotizados." });
      return;
    }
    if (cotizaciones.some((c) => c.detalles.some((d) => !d.no_cotiza && d.tipo_despacho === TipoDespachoCompra.Recojo && !d.lugar_recojo?.trim()))) {
      notify({ type: "info", content: "Debe ingresar el lugar de recojo para los productos con tipo de despacho 'Recojo'." });
      return;
    }

    const tieneAprobadas = cotizaciones.some((c) => c.estado === Estado_Cotizacion.Aprobada);

    const payload: DTO_RegistrarComparativo = {
      productos,
      cotizaciones: cotizaciones.map((c) => {
        let fechaStr = null;
        if (c.metodo_pago === MetodoPago.Credito && c.fecha_vencimiento_pago) {
          const d = new Date(c.fecha_vencimiento_pago as unknown as string);
          if (!isNaN(d.getTime())) {
            fechaStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          }
        }
        return {
          ...c,
          fecha_vencimiento_pago: fechaStr,
          costo_flete: Number(Number(c.costo_flete || 0).toFixed(2)),
          otros_gastos: Number(Number(c.otros_gastos || 0).toFixed(2)),
          total_antes_igv: Number(Number(c.total_antes_igv || 0).toFixed(2)),
          monto_igv: Number(Number(c.monto_igv || 0).toFixed(2)),
          total_despues_igv: Number(Number(c.total_despues_igv || 0).toFixed(2)),
          detalles: c.detalles
            .filter((d) => !d.no_cotiza)
            .map((d) => ({
              ...d,
              precio_unitario: Number(d.precio_unitario ?? 0),
              precio_unitario_base: Number(Number(d.precio_unitario_base ?? 0).toFixed(2)),
              cantidad_base: Number(Number(d.cantidad_base ?? 0).toFixed(2)),
            })),
        };
      }),
    };

    if (tieneAprobadas) {
      setWizardPayload(payload);
      setWizardAprobacionOpened(true);
      return;
    }

    let printTarget = "";
    let printerWindow: Window | null = null;

    if (!tieneAprobadas) {
      printTarget = `PrinterCot_${Date.now()}`;
      printerWindow = prepare(printTarget);
    }

    setLoading(true);
    try {
      const resp = await CotizacionesService.registrar_comparativo(payload);
      if (resp.success) {
        notify({ type: "success", content: "Comparativo y cotizaciones registrados correctamente." });
        onSuccess(resp.data, payload, maestros, printTarget);
      } else {
        notify({ type: "error", content: resp.message || "Error al registrar el comparativo" });
        printerWindow?.close();
      }
    } catch {
      notify({ type: "error", content: "Ocurrió un error al guardar el comparativo." });
      printerWindow?.close();
    } finally {
      setLoading(false);
    }
  };

  const productosEnUsoIds = useMemo(
    () =>
      productos
        .filter((p) =>
          cotizaciones.some((cot) => {
            return cot.detalles.some(
              (d) =>
                d.id_producto === p.id_producto &&
                !d.no_cotiza &&
                ((d.precio_unitario ?? 0) > 0 || (d.comentario && d.comentario.trim() !== "")),
            );
          }),
        )
        .map((p) => p.id_producto),
    [productos, cotizaciones],
  );

  return {
    handleSave,
    loading,
    wizardAprobacionOpened,
    setWizardAprobacionOpened,
    wizardPayload,
    productosEnUsoIds,
  };
};
