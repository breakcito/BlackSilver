import { useCallback, useEffect, useState } from "react";
import { AuxService } from "../../../service/auxiliar.service";
import { TipoCarbonService } from "../../tipo-carbon/service/tipo-carbon.service";
import { useNotify } from "../../../hooks/useNotify";
import type { RES_Marca } from "../../../service/responses/marca";
import type { RES_VehiculoCarbon } from "../../../service/responses/vehiculo-carbon";
import type { RES_TipoCarbon } from "../../tipo-carbon/service/tipo-carbon.responses";
import type { RES_CalidadCarbon } from "../../tipo-carbon/service/tipo-carbon.responses";

/**
 * Catalogos del DESPACHO de una venta de carbon: tipos de carbon, calidades,
 * vehiculos y marcas.
 *
 * Se cargan una sola vez al montar el formulario; `reloadVehiculos` refresca
 * el catalogo de vehiculos tras registrar uno nuevo desde el boton "+".
 */
export const useCatalogosDespacho = () => {
  const [tipos, setTipos] = useState<RES_TipoCarbon[]>([]);
  const [calidades, setCalidades] = useState<RES_CalidadCarbon[]>([]);
  const [vehiculos, setVehiculos] = useState<RES_VehiculoCarbon[]>([]);
  const [marcas, setMarcas] = useState<RES_Marca[]>([]);
  const [loading, setLoading] = useState(true);
  const { notifyError } = useNotify();

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [tiposRes, calRes, vehRes, marcasRes] = await Promise.all([
        TipoCarbonService.getTipos(),
        TipoCarbonService.getCalidades(),
        AuxService.get_vehiculos_carbon(),
        AuxService.get_marcas(),
      ]);

      if (tiposRes.success && tiposRes.data) setTipos(tiposRes.data);
      if (calRes.success && calRes.data) setCalidades(calRes.data);
      if (vehRes.success && vehRes.data) setVehiculos(vehRes.data);
      if (marcasRes.success && marcasRes.data) setMarcas(marcasRes.data);
    } catch (err) {
      console.error(err);
      notifyError("Ocurrio un error al cargar los catalogos de carbon");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  /** Refresca el catalogo de vehiculos (tras registrar uno nuevo). */
  const reloadVehiculos = useCallback(async () => {
    try {
      const res = await AuxService.get_vehiculos_carbon();
      if (res.success && res.data) setVehiculos(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  /**
   * Refresca el catalogo de marcas (tras registrar una marca de vehiculo).
   *
   * Si se pasa la marca recien creada, se agrega de inmediato: asi el
   * selector la muestra por su nombre sin esperar la respuesta del servidor.
   */
  const reloadMarcas = useCallback(async (marca?: RES_Marca) => {
    if (marca) {
      setMarcas((prev) => [
        marca,
        ...prev.filter((m) => m.id_marca !== marca.id_marca),
      ]);
    }
    try {
      const res = await AuxService.get_marcas();
      if (res.success && res.data) setMarcas(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  return {
    tipos,
    calidades,
    vehiculos,
    marcas,
    loading,
    reloadVehiculos,
    reloadMarcas,
  };
};
