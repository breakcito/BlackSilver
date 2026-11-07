import { useCallback, useEffect, useState } from "react";
import { useNotify } from "../../../hooks/useNotify";
import type { IRespuesta } from "../../../shared/interfaces/_response";
import { VentaMineralService } from "../service/venta-mineral.service";
import type { CatalogoMineral } from "../service/venta-mineral.responses";

/**
 * Catalogos del modulo de venta de mineral: molinos (destino de la
 * molienda), transportistas de mineral y laboratorios.
 *
 * Los tres se pueden registrar sin salir del flujo, asi que cada uno expone
 * su metodo de alta para que los formularios rapidos los agreguen al
 * instante.
 */
export const useCatalogosDespacho = () => {
  const { notifySuccess, notifyError } = useNotify();

  const [molinos, setMolinos] = useState<CatalogoMineral[]>([]);
  const [transportistas, setTransportistas] = useState<CatalogoMineral[]>([]);
  const [laboratorios, setLaboratorios] = useState<CatalogoMineral[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const cargar = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resMolinos, resTransportistas, resLaboratorios] = await Promise.all([
        VentaMineralService.getMolinos(),
        VentaMineralService.getTransportistas(),
        VentaMineralService.getLaboratorios(),
      ]);

      setMolinos(resMolinos.success ? (resMolinos.data ?? []) : []);
      setTransportistas(
        resTransportistas.success ? (resTransportistas.data ?? []) : [],
      );
      setLaboratorios(
        resLaboratorios.success ? (resLaboratorios.data ?? []) : [],
      );
    } catch (error) {
      console.error(error);
      setMolinos([]);
      setTransportistas([]);
      setLaboratorios([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /** Agrega un molino recien registrado al catalogo en memoria. */
  const agregarMolino = useCallback((nuevo: CatalogoMineral) => {
    setMolinos((prev) =>
      [...prev, nuevo].sort((a, b) => a.razon_social.localeCompare(b.razon_social)),
    );
  }, []);

  /** Agrega un transportista recien registrado al catalogo en memoria. */
  const agregarTransportista = useCallback((nuevo: CatalogoMineral) => {
    setTransportistas((prev) =>
      [...prev, nuevo].sort((a, b) => a.razon_social.localeCompare(b.razon_social)),
    );
  }, []);

  /** Agrega un laboratorio recien registrado al catalogo en memoria. */
  const agregarLaboratorio = useCallback((nuevo: CatalogoMineral) => {
    setLaboratorios((prev) =>
      [...prev, nuevo].sort((a, b) => a.razon_social.localeCompare(b.razon_social)),
    );
  }, []);

  /** Registra un molino y lo agrega al catalogo en memoria. */
  const crearMolino = useCallback(
    async (payload: { razon_social: string; ruc?: string | null }) => {
      try {
        const res: IRespuesta<CatalogoMineral> =
          await VentaMineralService.crearMolino(payload);

        if (res.success && res.data) {
          agregarMolino(res.data);
          notifySuccess(res.message || "Molino registrado correctamente");
          return res.data;
        }

        notifyError(res.message || "No se pudo registrar el molino");
        return null;
      } catch (error) {
        console.error(error);
        notifyError("Error de conexión al registrar el molino");
        return null;
      }
    },
    [agregarMolino, notifyError, notifySuccess],
  );

  /** Registra un transportista de mineral. */
  const crearTransportista = useCallback(
    async (payload: { razon_social: string; ruc?: string | null }) => {
      try {
        const res: IRespuesta<CatalogoMineral> =
          await VentaMineralService.crearTransportista(payload);

        if (res.success && res.data) {
          agregarTransportista(res.data);
          notifySuccess(
            res.message || "Transportista registrado correctamente",
          );
          return res.data;
        }

        notifyError(res.message || "No se pudo registrar el transportista");
        return null;
      } catch (error) {
        console.error(error);
        notifyError("Error de conexión al registrar el transportista");
        return null;
      }
    },
    [agregarTransportista, notifyError, notifySuccess],
  );

  /** Registra un laboratorio. */
  const crearLaboratorio = useCallback(
    async (payload: { razon_social: string; ruc?: string | null }) => {
      try {
        const res: IRespuesta<CatalogoMineral> =
          await VentaMineralService.crearLaboratorio(payload);

        if (res.success && res.data) {
          agregarLaboratorio(res.data);
          notifySuccess(res.message || "Laboratorio registrado correctamente");
          return res.data;
        }

        notifyError(res.message || "No se pudo registrar el laboratorio");
        return null;
      } catch (error) {
        console.error(error);
        notifyError("Error de conexión al registrar el laboratorio");
        return null;
      }
    },
    [agregarLaboratorio, notifyError, notifySuccess],
  );

  return {
    molinos,
    transportistas,
    laboratorios,
    isLoading,
    refetch: cargar,
    crearMolino,
    crearTransportista,
    crearLaboratorio,
    agregarMolino,
    agregarTransportista,
    agregarLaboratorio,
  };
};
