import { useCallback, useEffect, useState } from "react";
import { TipoCarbonService } from "../service/tipo-carbon.service";
import { useNotify } from "../../../hooks/useNotify";
import type { RES_CalidadCarbon } from "../service/tipo-carbon.responses";

export interface CalidadEditable extends RES_CalidadCarbon {
  porcentaje_inicio_ceniza: number;
  porcentaje_fin_ceniza: number;
  /** Marca que la fila tiene cambios sin guardar. */
  editado?: boolean;
}

/**
 * Carga y actualiza los rangos de % de ceniza de cada calidad de carbón.
 * Solo hay 3 registros fijos (Baja / Intermedia / Alta); lo editable son sus rangos.
 */
export const useCalidadesCarbon = () => {
  const [calidades, setCalidades] = useState<CalidadEditable[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardandoId, setGuardandoId] = useState<number | null>(null);
  const { notifyError, notifySuccess } = useNotify();

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await TipoCarbonService.getCalidades();
      if (res.success && res.data) {
        setCalidades(res.data);
      } else {
        setCalidades([]);
      }
    } catch (e) {
      console.error(e);
      notifyError("No se pudieron cargar las calidades de carbón");
    } finally {
      setLoading(false);
    }
  }, [notifyError]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiarRango = (
    idCalidadCarbon: number,
    campo: "porcentaje_inicio_ceniza" | "porcentaje_fin_ceniza",
    valor: number | string,
  ) => {
    setCalidades((prev) =>
      prev.map((c) =>
        c.id_calidad_carbon === idCalidadCarbon
          ? { ...c, [campo]: Number(valor) || 0, editado: true }
          : c,
      ),
    );
  };

  const guardar = async (idCalidadCarbon: number): Promise<boolean> => {
    const calidad = calidades.find(
      (c) => c.id_calidad_carbon === idCalidadCarbon,
    );
    if (!calidad) return false;

    const inicio = Number(calidad.porcentaje_inicio_ceniza) || 0;
    const fin = Number(calidad.porcentaje_fin_ceniza) || 0;

    if (fin <= inicio) {
      notifyError(
        `El rango de «${calidad.nombre}» debe tener un % final mayor al inicial`,
      );
      return false;
    }
    if (fin > 100) {
      notifyError("El % de ceniza no puede superar el 100%");
      return false;
    }

    setGuardandoId(idCalidadCarbon);
    try {
      const res = await TipoCarbonService.actualizarCalidad(idCalidadCarbon, {
        porcentaje_inicio_ceniza: inicio,
        porcentaje_fin_ceniza: fin,
      });
      if (res.success && res.data) {
        notifySuccess(`Rango de «${calidad.nombre}» actualizado`);
        setCalidades((prev) =>
          prev.map((c) =>
            c.id_calidad_carbon === idCalidadCarbon
              ? { ...c, ...res.data, editado: false }
              : c,
          ),
        );
        return true;
      }
      notifyError(res.message || "No se pudo actualizar el rango");
      return false;
    } catch (e) {
      console.error(e);
      notifyError("Error al actualizar el rango de la calidad");
      return false;
    } finally {
      setGuardandoId(null);
    }
  };

  return {
    calidades,
    loading,
    guardandoId,
    cargar,
    cambiarRango,
    guardar,
  };
};
