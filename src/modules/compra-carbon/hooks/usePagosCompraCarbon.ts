import { useCallback, useEffect, useMemo, useState } from "react";
import { useNotify } from "../../../hooks/useNotify";
import { CompraCarbonService } from "../service/compra-carbon.service";
import type {
  ComprobanteCompraCarbonResponse,
  ComprobanteTransporteCarbonResponse,
  PagosCompraCarbonResponse,
} from "../service/compra-carbon.responses";
import type {
  RegistrarComprobanteProveedorRequest,
  RegistrarComprobanteTransporteRequest,
  RegistrarPagoProveedorRequest,
  RegistrarPagoTransporteRequest,
} from "../service/compra-carbon.requests";
import { AuxService } from "../../../service/auxiliar.service";
import { ProveedoresService } from "../../proveedores/service/proveedores.service";
import type { RES_CuentaEmpresa } from "../../../service/responses/cuenta-empresa";
import type { RES_CuentaTransportista } from "../../../service/responses/cuenta-transportista";
import type { CuentaBancariaResponse } from "../../proveedores/service/proveedores.responses";
import { Moneda } from "../../../shared/enums/_generic/moneda";

interface Props {
  idCompraCarbon: number;
  idEmpresa: number;
  idProveedor: number;
  /** Las cuentas de transportista solo se piden si el usuario mira el flete. */
  necesitaFlete: boolean;
}

/** Quita las cuentas que el backend no aceptaría para el bucket pedido. */
const filtrarCuentas = <
  T extends {
    moneda?: Moneda | string;
    es_para_detraccion?: boolean | number;
  },
>(
  cuentas: T[],
  paraDetraccion: boolean,
): T[] =>
  cuentas.filter((c) => {
    if (c.moneda !== undefined && c.moneda !== Moneda.Soles) return false;
    const esDetraccion = Number(c.es_para_detraccion) === 1;
    return paraDetraccion ? esDetraccion : !esDetraccion;
  });

/**
 * Estado completo de la pantalla de pagos: saldos, comprobantes, historial y
 * los catalogos de cuentas.
 *
 * `GET /pagos` ya devuelve saldos, grupos de flete y comprobantes, asi que un
 * solo request alimenta toda la pantalla. Registrar un comprobante o un pago
 * actualiza el estado en memoria con la respuesta del POST: no se vuelve a
 * pedir nada porque el backend ya devuelve el objeto completo.
 */
export const usePagosCompraCarbon = ({
  idCompraCarbon,
  idEmpresa,
  idProveedor,
  necesitaFlete,
}: Props) => {
  const { notifyError, notifySuccess } = useNotify();

  const [loading, setLoading] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [data, setData] = useState<PagosCompraCarbonResponse | null>(null);

  const [cuentasEmpresa, setCuentasEmpresa] = useState<RES_CuentaEmpresa[]>([]);
  const [cuentasProveedor, setCuentasProveedor] = useState<
    CuentaBancariaResponse[]
  >([]);
  const [cuentasTransportista, setCuentasTransportista] = useState<
    RES_CuentaTransportista[]
  >([]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await CompraCarbonService.getPagos(idCompraCarbon);
      if (!resp.success || !resp.data) {
        notifyError(resp.message || "No se pudieron cargar los pagos");
        return;
      }
      setData(resp.data);
    } catch (e) {
      console.error(e);
      notifyError("Error al cargar los pagos de la compra");
    } finally {
      setLoading(false);
    }
  }, [idCompraCarbon, notifyError]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Cuentas de salida: empresa y proveedor. El destino nunca cambia, asi que
  // se piden una sola vez al montar la pantalla.
  useEffect(() => {
    let cancel = false;

    const cargarCuentas = async () => {
      try {
        const [empresa, proveedor] = await Promise.all([
          AuxService.get_cuentas_empresa({ id_empresa: idEmpresa }),
          ProveedoresService.getCuentasBancarias(idProveedor),
        ]);
        if (cancel) return;

        if (empresa.success && empresa.data) setCuentasEmpresa(empresa.data);
        setCuentasProveedor(Array.isArray(proveedor) ? proveedor : []);
      } catch (e) {
        console.error(e);
        if (!cancel) notifyError("Error al cargar las cuentas bancarias");
      }
    };

    void cargarCuentas();

    return () => {
      cancel = true;
    };
  }, [idEmpresa, idProveedor, notifyError]);

  // Cuentas de los transportistas: solo si hay flete y el usuario lo mira.
  const idsTransportistas = useMemo(
    () =>
      Array.from(
        new Set((data?.grupos_flete ?? []).map((g) => g.id_transportista)),
      ),
    [data?.grupos_flete],
  );

  useEffect(() => {
    if (!necesitaFlete || idsTransportistas.length === 0) {
      setCuentasTransportista([]);
      return;
    }

    let cancel = false;

    AuxService.get_cuentas_transportista({
      id_transportista: idsTransportistas,
    })
      .then((resp) => {
        if (cancel) return;
        if (resp.success && resp.data) setCuentasTransportista(resp.data);
      })
      .catch((e) => {
        console.error(e);
        if (!cancel) notifyError("Error al cargar las cuentas de transportista");
      });

    return () => {
      cancel = true;
    };
  }, [idsTransportistas, necesitaFlete, notifyError]);

  /**
   * Cuentas ofrecidas según a quién se le paga y si el pago es de detracción.
   * Para el flete solo se ofrecen las del transportista en cuestión.
   */
  const cuentasDisponibles = useCallback(
    (
      destino: "proveedor" | "transportista",
      paraDetraccion: boolean,
      idTransportista?: number,
    ) => {
      if (destino === "proveedor") {
        return filtrarCuentas(cuentasProveedor, paraDetraccion);
      }
      return filtrarCuentas(
        idTransportista
          ? cuentasTransportista.filter((c) => c.id_transportista === idTransportista)
          : cuentasTransportista,
        paraDetraccion,
      );
    },
    [cuentasProveedor, cuentasTransportista],
  );

  // -------------------------------------------------------------------
  // Comprobantes: el POST ya devuelve el objeto completo, se inserta en el
  // estado sin volver a pedir la pantalla entera.
  // -------------------------------------------------------------------

  const registrarComprobanteProveedor = async (
    payload: RegistrarComprobanteProveedorRequest,
    evidencias: File[] = [],
  ) => {
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

      const nuevo: ComprobanteCompraCarbonResponse = resp.data;
      setData((prev) =>
        prev
          ? {
              ...prev,
              comprobantes: [
                nuevo,
                ...prev.comprobantes.filter(
                  (c) => !("id_comprobante_compra_carbon" in c),
                ),
              ],
            }
          : prev,
      );
      notifySuccess("Comprobante del proveedor registrado");
      return nuevo;
    } catch (e) {
      console.error(e);
      notifyError("Error al registrar el comprobante del proveedor");
      return null;
    } finally {
      setRegistrando(false);
    }
  };

  const registrarComprobanteTransporte = async (
    payload: RegistrarComprobanteTransporteRequest,
    evidencias: File[] = [],
  ) => {
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

      const nuevo: ComprobanteTransporteCarbonResponse = resp.data;
      setData((prev) =>
        prev
          ? {
              ...prev,
              comprobantes: [
                ...prev.comprobantes.filter(
                  (c) =>
                    !("id_comprobante_transporte_carbon" in c) ||
                    c.id_transportista !== nuevo.id_transportista,
                ),
                nuevo,
              ],
              grupos_flete: prev.grupos_flete.map((g) =>
                g.id_transportista === nuevo.id_transportista
                  ? {
                      ...g,
                      id_comprobante_transporte_carbon:
                        nuevo.id_comprobante_transporte_carbon,
                      estado: nuevo.estado,
                    }
                  : g,
              ),
            }
          : prev,
      );
      notifySuccess(
        `Comprobante de flete de ${nuevo.transportista_razon_social} registrado`,
      );
      return nuevo;
    } catch (e) {
      console.error(e);
      notifyError("Error al registrar el comprobante de flete");
      return null;
    } finally {
      setRegistrando(false);
    }
  };

  // -------------------------------------------------------------------
  // Pagos: el POST devuelve la pantalla completa (`get_pagos`), asi que se
  // reemplaza el estado y tampoco hace falta un request extra.
  // -------------------------------------------------------------------

  const registrarProveedor = async (
    payload: RegistrarPagoProveedorRequest,
    evidencias: File[] = [],
  ) => {
    setRegistrando(true);
    try {
      const resp = await CompraCarbonService.registrarPagoProveedor(
        idCompraCarbon,
        payload,
        evidencias,
      );
      if (!resp.success || !resp.data) {
        notifyError(resp.message || "No se pudo registrar el pago");
        return null;
      }

      setData(resp.data);
      notifySuccess("Pago registrado");
      return resp.data;
    } catch (e) {
      console.error(e);
      notifyError("Error al registrar el pago al proveedor");
      return null;
    } finally {
      setRegistrando(false);
    }
  };

  const registrarTransporte = async (
    payload: RegistrarPagoTransporteRequest,
    evidencias: File[] = [],
  ) => {
    setRegistrando(true);
    try {
      const resp = await CompraCarbonService.registrarPagoTransporte(
        idCompraCarbon,
        payload,
        evidencias,
      );
      if (!resp.success || !resp.data) {
        notifyError(resp.message || "No se pudo registrar el pago");
        return null;
      }

      setData(resp.data);
      notifySuccess("Pago registrado");
      return resp.data;
    } catch (e) {
      console.error(e);
      notifyError("Error al registrar el pago al transportista");
      return null;
    } finally {
      setRegistrando(false);
    }
  };

  return {
    loading,
    registrando,
    data,
    cuentasEmpresa,
    cuentasDisponibles,
    registrarComprobanteProveedor,
    registrarComprobanteTransporte,
    registrarProveedor,
    registrarTransporte,
  };
};
