import { useState } from "react";
import {  Badge, Group, Stack, Text } from "@mantine/core";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

import { useTitlePage } from "../../../hooks/useTitlePage";
import { useCompraCarbon } from "../hooks/useCompraCarbon";
import { RegistroCompraCarbon } from "./registro-compra-carbon";
import type { CompraCarbonResumen } from "../service/compra-carbon.responses";
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

  const [openRegistro, setOpenRegistro] = useState(false);
  /**
   * Cuando se registra una compra, el listado imprime automaticamente su PDF.
   * Se guarda el payload completo que devuelve el POST (cabecera + detalles)
   * para que el listado genere el documento sin volver a consultar la compra.
   */
  const [autoPrint, setAutoPrint] = useState<CompraCarbonResumen | null>(
    null,
  );

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
          onAprobada={updateCompraLocal}
          onAnulada={updateCompraLocal}
          onReimprimir={(compra) => setAutoPrint(compra)}
          autoPrint={autoPrint}
          onAutoPrintConsumido={() => setAutoPrint(null)}
          onRefresh={recargar}
        />
      )}

      <ModalEstandar
        opened={openRegistro}
        close={() => setOpenRegistro(false)}
        validateClose
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
          onCreated={(nuevaCompra) => {
            insertCompra(nuevaCompra);
            setOpenRegistro(false);
            setAutoPrint(nuevaCompra);
          }}
        />
      </ModalEstandar>
    </div>
  );
};
