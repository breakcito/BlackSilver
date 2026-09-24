import { useEffect, useState } from "react";
import {  Badge, Group, Stack, Text } from "@mantine/core";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

import { useTitlePage } from "../../../hooks/useTitlePage";
import { useCompraCarbon } from "../hooks/useCompraCarbon";
import { AuxService } from "../../../service/auxiliar.service";
import type { RES_Empresa } from "../../../service/responses/empresa";
import type { ProveedorResponse } from "../../proveedores/service/proveedores.responses";
import { ProveedoresService } from "../../proveedores/service/proveedores.service";
import { RegistroCompraCarbon } from "./registro-compra-carbon";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { CompraCarbonFilter } from "./components/compra-carbon-filter";
import { CompraCarbonListado } from "./components/compra-carbon-listado";
import { EmptyStateCompraCarbon } from "./components/empty-state-compra-carbon";
import { Megaphone } from "lucide-react";

export const CompraCarbonPage = () => {
  useTitlePage("Compra de Carbon");

  const {
    compras,
    loading,
    busqueda,
    setBusqueda,
    mes,
    anio,
    cambiarPeriodo,
    recargar,
    insertCompra,
    updateCompraLocal,
  } = useCompraCarbon();

  const [empresasById, setEmpresasById] = useState<Record<number, RES_Empresa>>(
    {},
  );
  const [proveedoresById, setProveedoresById] = useState<
    Record<number, ProveedorResponse>
  >([]);
  const [openRegistro, setOpenRegistro] = useState(false);
  /**
   * Cuando se registra una compra, el listado imprime automaticamente su PDF.
   * La pagina solo dispara el id; el listado maneja la descarga con todo
   * el contexto (empresa + proveedor) que ya tiene cargado.
   */
  const [autoPrintId, setAutoPrintId] = useState<number | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const [empresasRes, proveedoresArr] = await Promise.all([
        AuxService.get_empresas(),
        ProveedoresService.getProveedores({ para_carbon: true }),
      ]);
      if (cancel) return;
      if (empresasRes.success) {
        const map: Record<number, RES_Empresa> = {};
        for (const e of empresasRes.data) {
          map[e.id_empresa] = e;
        }
        setEmpresasById(map);
      }
      const provMap: Record<number, ProveedorResponse> = {};
      for (const p of proveedoresArr ?? []) {
        provMap[p.id_proveedor] = p;
      }
      setProveedoresById(provMap);
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const mostrarEmpty = !loading && compras.length === 0 && !busqueda;

  return (
    <div className="space-y-6 animate-fade-in p-1">
      <CompraCarbonFilter
        busqueda={busqueda}
        setBusqueda={setBusqueda}
        openCreate={() => setOpenRegistro(true)}
        mes={mes}
        anio={anio}
        cambiarPeriodo={cambiarPeriodo}
        recargar={recargar}
        loading={loading}
      />

      {loading ? (
        <Stack align="center" gap="md" py={100}>
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <ArrowPathIcon className="w-6 h-6 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
          </div>
          <Text
            size="xs"
            fw={900}
            className="uppercase tracking-[0.3em] text-zinc-500"
          >
            Consultando Compras de Carbon...
          </Text>
        </Stack>
      ) : mostrarEmpty ? (
        <EmptyStateCompraCarbon busqueda={busqueda} />
      ) : (
        <CompraCarbonListado
          compras={compras}
          busqueda={busqueda}
          empresasById={empresasById}
          proveedoresById={proveedoresById}
          onAprobada={updateCompraLocal}
          onEvidenciasActualizadas={updateCompraLocal}
          onAnulada={updateCompraLocal}
          autoPrintId={autoPrintId}
          onAutoPrintConsumido={() => setAutoPrintId(null)}
        />
      )}

      <ModalEstandar
        opened={openRegistro}
        close={() => setOpenRegistro(false)}
        title="Nueva Compra de Carbon"
        size="55rem"
        rightSection={
          <Badge c="indigo" radius="lg" variant="light">
            <Group gap={4}>
              <Megaphone className="w-3.5 h-3.5" />
              Registro Preliminar
            </Group>
          </Badge>
        }
      >
        <RegistroCompraCarbon
          onCancel={() => setOpenRegistro(false)}
          onCreated={(cabecera) => {
            insertCompra(cabecera);
            setOpenRegistro(false);
            // Dispara auto-impresion del PDF en el siguiente render del listado.
            setAutoPrintId(cabecera.id_compra_carbon);
          }}
        />
      </ModalEstandar>
    </div>
  );
};
