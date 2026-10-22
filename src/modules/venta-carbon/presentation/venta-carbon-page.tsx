import { useState } from "react";
import { Stack, Text } from "@mantine/core";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useTitlePage } from "../../../hooks/useTitlePage";
import { useVentaCarbon } from "../hooks/useVentaCarbon";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { VentaCarbonFilter } from "./components/venta-carbon-filter";
import { VentaCarbonListado } from "./components/venta-carbon-listado";
import { EmptyStateVentaCarbon } from "./components/empty-state-venta-carbon";
import { RegistroVentaCarbon } from "./forms/registro-venta-carbon";
import { ModalDespacharCargas } from "./forms/modal-despachar-cargas";
import { ModalConfirmarLlegada } from "./forms/modal-confirmar-llegada";
import type {
  CargaVentaCarbonItem,
  VentaCarbonResumen,
} from "../service/venta-carbon.responses";

export const VentaCarbonPage = () => {
  useTitlePage("Venta de Carbon");

  const {
    ventas,
    loading,
    busqueda,
    setBusqueda,
    mes,
    anio,
    cambiarPeriodo,
    recargar,
    recargarSilencioso,
    insertVenta,
    updateVentaLocal,
  } = useVentaCarbon();

  const [openRegistro, setOpenRegistro] = useState(false);
  const [ventaDespachar, setVentaDespachar] =
    useState<VentaCarbonResumen | null>(null);
  const [llegada, setLlegada] = useState<{
    venta: VentaCarbonResumen;
    carga: CargaVentaCarbonItem;
  } | null>(null);

  const mostrarEmpty = !loading && ventas.length === 0 && !busqueda;

  return (
    <div className="space-y-6 animate-fade-in p-1">
      <VentaCarbonFilter
        busqueda={busqueda}
        setBusqueda={setBusqueda}
        openCreate={() => setOpenRegistro(true)}
        mes={mes}
        anio={anio}
        cambiarPeriodo={cambiarPeriodo}
        recargar={recargar}
        loading={loading}
      />

      {loading && ventas.length === 0 ? (
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
            Consultando Ventas de Carbon...
          </Text>
        </Stack>
      ) : mostrarEmpty ? (
        <EmptyStateVentaCarbon busqueda={busqueda} />
      ) : (
        <VentaCarbonListado
          ventas={ventas}
          loading={loading}
          onConfirmarLlegada={(venta, carga) => setLlegada({ venta, carga })}
          onDespacharCargas={(venta) => setVentaDespachar(venta)}
        />
      )}

      {/* Registro de venta */}
      <ModalEstandar
        opened={openRegistro}
        close={() => setOpenRegistro(false)}
        validateClose
        title="Nueva Venta de Carbon"
        size="62rem"
      >
        <RegistroVentaCarbon
          onCancel={() => setOpenRegistro(false)}
          onCreated={(nuevaVenta) => {
            insertVenta(nuevaVenta);
            setOpenRegistro(false);
            recargarSilencioso();
          }}
        />
      </ModalEstandar>

      {/* Despachar cargas adicionales */}
      <ModalEstandar
        opened={Boolean(ventaDespachar)}
        close={() => setVentaDespachar(null)}
        validateClose
        title={
          ventaDespachar
            ? `Despachar cargas · ${ventaDespachar.correlativo}`
            : "Despachar cargas"
        }
        size="62rem"
      >
        {ventaDespachar && (
          <ModalDespacharCargas
            venta={ventaDespachar}
            onClose={() => setVentaDespachar(null)}
            onDispatched={(venta) => {
              updateVentaLocal(venta);
              setVentaDespachar(null);
              recargarSilencioso();
            }}
          />
        )}
      </ModalEstandar>

      {/* Confirmar llegada */}
      <ModalEstandar
        opened={Boolean(llegada)}
        close={() => setLlegada(null)}
        validateClose
        title={
          llegada
            ? `Confirmar llegada · ${llegada.venta.correlativo}`
            : "Confirmar llegada"
        }
        size="62rem"
      >
        {llegada && (
          <ModalConfirmarLlegada
            venta={llegada.venta}
            carga={llegada.carga}
            onClose={() => setLlegada(null)}
            onConfirmed={(venta) => {
              updateVentaLocal(venta);
              setLlegada(null);
              recargarSilencioso();
            }}
          />
        )}
      </ModalEstandar>
    </div>
  );
};
