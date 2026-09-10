import { useState, useEffect } from "react";
import { ProveedoresService } from "../service/proveedores.service";
import type {
  CuentaBancariaResponse,
  ProveedorResponse,
} from "../service/proveedores.responses";
import { useNotify } from "../../../hooks/useNotify";

export const useProveedores = (paraCarbon?: boolean) => {
  const [proveedores, setProveedores] = useState<ProveedorResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);
  const { notifyError, notifySuccess } = useNotify();

  const fetchProveedores = async () => {
    setLoading(true);
    try {
      const data = await ProveedoresService.getProveedores({
        para_carbon: paraCarbon,
      });
      setProveedores(data);
    } catch (e) {
      console.error(e);
      notifyError("Ocurrió un error al cargar los proveedores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProveedores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paraCarbon]);

  const insertProveedor = (p: ProveedorResponse) => {
    setProveedores((prev) => [p, ...prev]);
  };

  const updateProveedor = (id: number, cambios: Partial<ProveedorResponse>) => {
    setProveedores((prev) =>
      prev.map((p) => (p.id_proveedor === id ? { ...p, ...cambios } : p)),
    );
  };

  const updateCuentaEnProveedor = (cuenta: CuentaBancariaResponse) => {
    setProveedores((prev) =>
      prev.map((p) => {
        const cuentas = p.cuentas_bancarias ?? [];
        const existe = cuentas.some(
          (c) => c.id_cuenta_bancaria === cuenta.id_cuenta_bancaria,
        );
        const nuevasCuentas = existe
          ? cuentas.map((c) =>
              c.id_cuenta_bancaria === cuenta.id_cuenta_bancaria ? cuenta : c,
            )
          : [cuenta, ...cuentas];
        return {
          ...p,
          cuentas_bancarias: nuevasCuentas,
          cantidad_cuentas_bancarias: nuevasCuentas.length,
        };
      }),
    );
  };

  /**
   * Reemplaza la fila completa con la version devuelta por la API, para que
   * refleje exactamente el shape del backend (incluye cambios_log y los
   * contadores/colecciones anidadas).
   */
  const replaceProveedor = (editado: ProveedorResponse) => {
    setProveedores((prev) =>
      prev.map((p) =>
        p.id_proveedor === editado.id_proveedor ? editado : p,
      ),
    );
  };

  /**
   * Eliminacion logica. El backend devuelve el proveedor ya Inactivo, pero el
   * listado filtra los inactivos, asi que el efecto visible es que desaparece.
   */
  const eliminarProveedor = async (idProveedor: number): Promise<boolean> => {
    if (
      !window.confirm(
        "¿Está seguro de eliminar este proveedor? Esta acción lo desactivará del listado.",
      )
    ) {
      return false;
    }

    setEliminandoId(idProveedor);
    try {
      const resp = await ProveedoresService.eliminarProveedor(idProveedor);
      if (resp.success) {
        notifySuccess(resp.message);
        setProveedores((prev) =>
          prev.filter((p) => p.id_proveedor !== idProveedor),
        );
        return true;
      }
      notifyError(resp.message);
      return false;
    } catch (e) {
      console.error(e);
      notifyError("Ocurrió un error al eliminar el proveedor");
      return false;
    } finally {
      setEliminandoId(null);
    }
  };

  return {
    proveedores,
    loading,
    fetchProveedores,
    insertProveedor,
    updateProveedor,
    replaceProveedor,
    eliminarProveedor,
    eliminandoId,
    updateCuentaEnProveedor,
    recargar: fetchProveedores,
  };
};
