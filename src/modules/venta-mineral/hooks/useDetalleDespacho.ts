import { useCallback, useState } from "react";
import { useNotify } from "../../../hooks/useNotify";
import type { IRespuesta } from "../../../shared/interfaces/_response";
import { VentaMineralService } from "../service/venta-mineral.service";
import type {
  ActualizarDespachoRequest,
  RegistrarAnalisisRequest,
  RegistrarBalanzaRequest,
  RegistrarComprobanteRequest,
  RegistrarFleteRequest,
  RegistrarGastoRequest,
  RegistrarLiquidacionRequest,
  RegistrarPagoRequest,
  TipoComprobanteDespacho,
} from "../service/venta-mineral.requests";

/**
 * Mutaciones del arbol de un despacho de mineral.
 *
 * Cada operacion deja que el backend recalcule (importes, saldos, estados)
 * y despues recarga SOLO el detalle afectado: el listado completo no se
 * vuelve a consultar.
 */
export const useDetalleDespacho = (
  refrescar: (idDespacho: number) => Promise<void>,
) => {
  const { notifySuccess, notifyError } = useNotify();
  const [submitting, setSubmitting] = useState(false);

  /**
   * Ejecuta una mutacion: avisa el resultado y recarga el detalle.
   */
  const ejecutar = useCallback(
    async <T,>(
      idDespacho: number,
      fn: () => Promise<IRespuesta<T>>,
      mensajeOk: string,
    ): Promise<T | null> => {
      setSubmitting(true);
      try {
        const res = await fn();

        if (res.success) {
          notifySuccess(res.message || mensajeOk);
          // El refresco NO bloquea: el modal se cierra al instante y el
          // detalle se actualiza en segundo plano.
          void refrescar(idDespacho);
          return res.data;
        }

        notifyError(res.message || "No se pudo completar la operacion");
        return null;
      } catch (error) {
        console.error(error);
        const err = error as {
          response?: { data?: { message?: string } };
        };
        notifyError(
          err?.response?.data?.message || "Error de conexión al guardar",
        );
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [notifyError, notifySuccess, refrescar],
  );

  /* ---------------- Despacho ---------------- */

  const actualizarDespacho = useCallback(
    (idDespacho: number, payload: ActualizarDespachoRequest) =>
      ejecutar(
        idDespacho,
        () => VentaMineralService.actualizarDespacho(idDespacho, payload),
        "Despacho actualizado correctamente",
      ),
    [ejecutar],
  );

  /* ---------------- Gastos ---------------- */

  const registrarGasto = useCallback(
    (idDespacho: number, payload: RegistrarGastoRequest) =>
      ejecutar(
        idDespacho,
        () => VentaMineralService.registrarGasto(idDespacho, payload),
        "Gasto registrado correctamente",
      ),
    [ejecutar],
  );

  const actualizarGasto = useCallback(
    (idDespacho: number, idGasto: number, payload: RegistrarGastoRequest) =>
      ejecutar(
        idDespacho,
        () => VentaMineralService.actualizarGasto(idGasto, payload),
        "Gasto actualizado correctamente",
      ),
    [ejecutar],
  );

  const eliminarGasto = useCallback(
    (idDespacho: number, idGasto: number) =>
      ejecutar(
        idDespacho,
        () => VentaMineralService.eliminarGasto(idGasto),
        "Gasto eliminado correctamente",
      ),
    [ejecutar],
  );

  /* ---------------- Fletes ---------------- */

  const registrarFlete = useCallback(
    (idDespacho: number, payload: RegistrarFleteRequest) =>
      ejecutar(
        idDespacho,
        () => VentaMineralService.registrarFlete(idDespacho, payload),
        "Flete registrado correctamente",
      ),
    [ejecutar],
  );

  const actualizarFlete = useCallback(
    (idDespacho: number, idFlete: number, payload: RegistrarFleteRequest) =>
      ejecutar(
        idDespacho,
        () => VentaMineralService.actualizarFlete(idFlete, payload),
        "Flete actualizado correctamente",
      ),
    [ejecutar],
  );

  const registrarBalanza = useCallback(
    (idDespacho: number, idFlete: number, payload: RegistrarBalanzaRequest) =>
      ejecutar(
        idDespacho,
        () => VentaMineralService.registrarBalanza(idFlete, payload),
        "Peso de balanza registrado correctamente",
      ),
    [ejecutar],
  );

  const eliminarFlete = useCallback(
    (idDespacho: number, idFlete: number) =>
      ejecutar(
        idDespacho,
        () => VentaMineralService.eliminarFlete(idFlete),
        "Flete eliminado correctamente",
      ),
    [ejecutar],
  );

  /* ---------------- Analisis ---------------- */

  const registrarAnalisis = useCallback(
    (idDespacho: number, payload: RegistrarAnalisisRequest) =>
      ejecutar(
        idDespacho,
        () => VentaMineralService.registrarAnalisis(idDespacho, payload),
        "Analisis registrado correctamente",
      ),
    [ejecutar],
  );

  const actualizarAnalisis = useCallback(
    (
      idDespacho: number,
      idAnalisis: number,
      payload: RegistrarAnalisisRequest,
    ) =>
      ejecutar(
        idDespacho,
        () => VentaMineralService.actualizarAnalisis(idAnalisis, payload),
        "Analisis actualizado correctamente",
      ),
    [ejecutar],
  );

  const eliminarAnalisis = useCallback(
    (idDespacho: number, idAnalisis: number) =>
      ejecutar(
        idDespacho,
        () => VentaMineralService.eliminarAnalisis(idAnalisis),
        "Analisis eliminado correctamente",
      ),
    [ejecutar],
  );

  /* ---------------- Liquidaciones ---------------- */

  const registrarLiquidacion = useCallback(
    (idDespacho: number, payload: RegistrarLiquidacionRequest) =>
      ejecutar(
        idDespacho,
        () => VentaMineralService.registrarLiquidacion(idDespacho, payload),
        "Liquidacion registrada correctamente",
      ),
    [ejecutar],
  );

  const actualizarLiquidacion = useCallback(
    (
      idDespacho: number,
      idLiquidacion: number,
      payload: RegistrarLiquidacionRequest,
    ) =>
      ejecutar(
        idDespacho,
        () => VentaMineralService.actualizarLiquidacion(idLiquidacion, payload),
        "Liquidacion actualizada correctamente",
      ),
    [ejecutar],
  );

  const eliminarLiquidacion = useCallback(
    (idDespacho: number, idLiquidacion: number) =>
      ejecutar(
        idDespacho,
        () => VentaMineralService.eliminarLiquidacion(idLiquidacion),
        "Liquidacion eliminada correctamente",
      ),
    [ejecutar],
  );

  /* ---------------- Comprobantes ---------------- */

  const registrarComprobante = useCallback(
    (
      idDespacho: number,
      tipo: TipoComprobanteDespacho,
      payload: RegistrarComprobanteRequest,
    ) =>
      ejecutar(
        idDespacho,
        () => VentaMineralService.registrarComprobante(tipo, idDespacho, payload),
        "Comprobante registrado correctamente",
      ),
    [ejecutar],
  );

  const actualizarComprobante = useCallback(
    (
      idDespacho: number,
      tipo: TipoComprobanteDespacho,
      idComprobante: number,
      payload: RegistrarComprobanteRequest,
    ) =>
      ejecutar(
        idDespacho,
        () =>
          VentaMineralService.actualizarComprobante(
            tipo,
            idComprobante,
            payload,
          ),
        "Comprobante actualizado correctamente",
      ),
    [ejecutar],
  );

  const eliminarComprobante = useCallback(
    (
      idDespacho: number,
      tipo: TipoComprobanteDespacho,
      idComprobante: number,
    ) =>
      ejecutar(
        idDespacho,
        () => VentaMineralService.eliminarComprobante(tipo, idComprobante),
        "Comprobante eliminado correctamente",
      ),
    [ejecutar],
  );

  /* ---------------- Pagos ---------------- */

  const registrarPago = useCallback(
    (
      idDespacho: number,
      tipo: TipoComprobanteDespacho,
      idComprobante: number,
      payload: RegistrarPagoRequest,
    ) =>
      ejecutar(
        idDespacho,
        () =>
          VentaMineralService.registrarPago(tipo, idComprobante, payload),
        "Pago registrado correctamente",
      ),
    [ejecutar],
  );

  return {
    submitting,
    actualizarDespacho,
    registrarGasto,
    actualizarGasto,
    eliminarGasto,
    registrarFlete,
    actualizarFlete,
    registrarBalanza,
    eliminarFlete,
    registrarAnalisis,
    actualizarAnalisis,
    eliminarAnalisis,
    registrarLiquidacion,
    actualizarLiquidacion,
    eliminarLiquidacion,
    registrarComprobante,
    actualizarComprobante,
    eliminarComprobante,
    registrarPago,
  };
};

export type DetalleDespachoAcciones = ReturnType<typeof useDetalleDespacho>;
