import { useCallback, useEffect, useState } from "react";
import { AuxService } from "../../../service/auxiliar.service";
import { ClientesService } from "../../clientes/service/clientes.service";
import { useNotify } from "../../../hooks/useNotify";
import type { RES_Empresa } from "../../../service/responses/empresa";
import type { RES_Almacen } from "../../../service/responses/almacen";
import type {
  AlmacenCarbonClienteResponse,
  ClienteResponse,
} from "../../clientes/service/clientes.responses";

/**
 * Catalogos de la CABECERA de una venta de carbon: empresa vendedora,
 * clientes de carbon (facturado y destino) y almacenes de carbon.
 *
 * - Los clientes se filtran por `para_carbon = 1`.
 * - Los almacenes de la empresa se filtran por `para_carbon = 1`.
 * - Los almacenes de llegada son los del cliente destino (o del facturado):
 *   viven en `almacen_carbon_cliente`.
 *
 * Se cargan una sola vez al montar el formulario.
 */
export const useCatalogosCabeceraVenta = () => {
  const [empresas, setEmpresas] = useState<RES_Empresa[]>([]);
  const [clientes, setClientes] = useState<ClienteResponse[]>([]);
  const [almacenesEmpresa, setAlmacenesEmpresa] = useState<RES_Almacen[]>([]);
  const [almacenesCliente, setAlmacenesCliente] = useState<
    AlmacenCarbonClienteResponse[]
  >([]);
  const [loading, setLoading] = useState(true);
  const { notifyError } = useNotify();

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, cliRes, almRes, almCliRes] = await Promise.all([
        AuxService.get_empresas(),
        ClientesService.getClientes({ para_carbon: true }),
        AuxService.get_almacenes({ para_carbon: true }),
        ClientesService.getAlmacenesCarbonTodos(),
      ]);

      if (empRes.success && empRes.data) setEmpresas(empRes.data);
      if (Array.isArray(cliRes)) setClientes(cliRes);
      if (almRes.success && almRes.data) setAlmacenesEmpresa(almRes.data);
      if (almCliRes.success && almCliRes.data)
        setAlmacenesCliente(almCliRes.data);
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

  return {
    empresas,
    clientes,
    almacenesEmpresa,
    almacenesCliente,
    loading,
  };
};
