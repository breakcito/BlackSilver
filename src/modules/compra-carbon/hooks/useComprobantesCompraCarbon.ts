import { useCallback, useEffect, useState } from "react";
import { useNotify } from "../../../hooks/useNotify";
import { CompraCarbonService } from "../service/compra-carbon.service";
import type {
  ComprobanteCompraCarbonResponse,
  ComprobanteTransporteCarbonResponse,
  GrupoFleteTransportista,
} from "../service/compra-carbon.responses";
import type {
  RegistrarComprobanteProveedorRequest,
  RegistrarComprobanteTransporteRequest,
} from "../service/compra-carbon.requests";

interface Props {
  idCompraCarbon: number;
  /** Si viene `false` el hook no dispara peticiones: la compra no aplica IGV. */
  activo?: boolean;
}

/**
 * Carga y registra los comprobantes de una compra de carbón: el del proveedor
 * (solo si la compra aplica IGV) y los de flete agrupados por transportista.
 *
 * La compra cambia de estado dentro del flujo de aprobación, por eso expone
 * `recargar` para volver a pedir los grupos tras registrar un comprobante.
 */
export const useComprobantesCompraCarbon = ({
  idCompraCarbon,
  activo = true,
}: Props) => {
  const { notifyError, notifySuccess } = useNotify();

  const [loading, setLoading] = useState(false);
  const [registrando, setRegistrando] = useState(false);

  const [comprobanteProveedor, setComprobanteProveedor] =
    useState<ComprobanteCompraCarbonResponse | null>(null);
  const [gruposFlete, setGruposFlete] = useState<GrupoFleteTransportista[]>(
    [],
  );
  const [comprobantesFlete, setComprobantesFlete] = useState<
    ComprobanteTransporteCarbonResponse[]
  >([]);

  const cargar = useCallback(async () => {
    if (!activo) return;
    setLoading(true);
    try {
      const [respProveedor, respGrupos, respPagos] = await Promise.all([
        CompraCarbonService.getComprobanteProveedor(idCompraCarbon),
        CompraCarbonService.getGruposFlete(idCompraCarbon),
        CompraCarbonService.getPagos(idCompraCarbon),
      ]);

      setComprobanteProveedor(respProveedor.success ? respProveedor.data : null);
      setGruposFlete(respGrupos.success ? (respGrupos.data ?? []) : []);
      setComprobantesFlete(
        respPagos.success
          ? respPagos.data.comprobantes.filter(
              (c): c is ComprobanteTransporteCarbonResponse =>
                "id_comprobante_transporte_carbon" in c,
            )
          : [],
      );

      if (!respGrupos.success) {
        notifyError(respGrupos.message || "No se pudieron cargar los fletes");
      }
    } catch (e) {
      console.error(e);
      notifyError("Error al cargar los comprobantes de la compra");
    } finally {
      setLoading(false);
    }
  }, [activo, idCompraCarbon, notifyError]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const registrarProveedor = async (
    payload: RegistrarComprobanteProveedorRequest,
    evidencias: File[] = [],
  ): Promise<ComprobanteCompraCarbonResponse | null> => {
    setRegistrando(true);
    try {
      const resp = await CompraCarbonService.registrarComprobanteProveedor(
        idCompraCarbon,
        payload,
        evidencias,
      );
      if (!resp.success || !resp.data) {
        notifyError(resp.message || "No se pudo registrar el comprobante");
        return null;
      }

      setComprobanteProveedor(resp.data);
      notifySuccess("Comprobante del proveedor registrado correctamente");
      return resp.data;
    } catch (e) {
      console.error(e);
      notifyError("Error al registrar el comprobante del proveedor");
      return null;
    } finally {
      setRegistrando(false);
    }
  };

  const registrarTransporte = async (
    payload: RegistrarComprobanteTransporteRequest,
    evidencias: File[] = [],
  ): Promise<ComprobanteTransporteCarbonResponse | null> => {
    setRegistrando(true);
    try {
      const resp = await CompraCarbonService.registrarComprobanteTransporte(
        idCompraCarbon,
        payload,
        evidencias,
      );
      if (!resp.success || !resp.data) {
        notifyError(resp.message || "No se pudo registrar el comprobante");
        return null;
      }

      notifySuccess(
        `Comprobante de flete de ${resp.data.transportista_razon_social} registrado correctamente`,
      );
      await cargar();
      return resp.data;
    } catch (e) {
      console.error(e);
      notifyError("Error al registrar el comprobante de flete");
      return null;
    } finally {
      setRegistrando(false);
    }
  };

  return {
    loading,
    registrando,
    comprobanteProveedor,
    gruposFlete,
    comprobantesFlete,
    recargar: cargar,
    registrarProveedor,
    registrarTransporte,
  };
};
