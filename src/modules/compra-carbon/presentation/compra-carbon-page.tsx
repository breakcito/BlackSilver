import { useState } from "react";
import {  Badge, Group, Stack, Text } from "@mantine/core";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { Pencil } from "lucide-react";

import { useTitlePage } from "../../../hooks/useTitlePage";
import { useCompraCarbon } from "../hooks/useCompraCarbon";
import { useControlComprasExcel } from "../hooks/useControlComprasExcel";
import { RegistroCompraCarbon } from "./registro-compra-carbon";
import { ModalRegistroCargas } from "./modal-registro-cargas";
import type {
  CompraCarbonResumen,
  CompraCarbonDetalleResponse,
  CargaCompraCarbonItem,
} from "../service/compra-carbon.responses";
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
    recargarSilencioso,
    insertCompra,
    updateCompraLocal,
  } = useCompraCarbon();

  const [openRegistro, setOpenRegistro] = useState(false);

  const { exportar: exportarControlCompras, exportando } =
    useControlComprasExcel();
  /**
   * Compra que se esta editando desde la pagina. Cuando != null, el modal de
   * edicion esta abierto con el formulario precargado.
   */
  const [compraEnEdicion, setCompraEnEdicion] =
    useState<CompraCarbonResumen | null>(null);
  /**
   * Carga que se esta editando individualmente. Guardamos la carga y la
   * compra cabecera asociada para que el modal tenga acceso a todo el
   * contexto (correlativo, toneladas prometidas, etc).
   */
  const [cargaEnEdicion, setCargaEnEdicion] = useState<{
    carga: CargaCompraCarbonItem;
    compra: CompraCarbonResumen;
  } | null>(null);
  /**
   * Detalle de la compra devuelto por la API al editar una carga. Se pasa al
   * listado para que "Cargas Recibidas" refleje el cambio al instante, sin
   * recargar la pagina.
   */
  const [detalleActualizado, setDetalleActualizado] =
    useState<CompraCarbonDetalleResponse | null>(null);
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
        onExportarControlCompras={() => void exportarControlCompras(anio)}
        exportandoControlCompras={exportando}
      />

      {loading && compras.length === 0 ? (
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
          onEditarCabecera={(compra) => setCompraEnEdicion(compra)}
          onEditarCarga={(c) => {
            // Buscamos la CompraCarbonResumen asociada para pasarla al modal.
            const compraCabecera = compras.find(
              (cc) => cc.id_compra_carbon === c.id_compra_carbon,
            );
            if (!compraCabecera) {
              // Si no esta en el listado actual, no podemos editar (faltan datos).
              return;
            }
            setCargaEnEdicion({ carga: c, compra: compraCabecera });
          }}
          detalleActualizado={detalleActualizado}
          onRefresh={recargarSilencioso}
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

      {/* Modal: Editar cabecera de una compra existente */}
      <ModalEstandar
        opened={compraEnEdicion !== null}
        close={() => setCompraEnEdicion(null)}
        validateClose
        title={
          compraEnEdicion
            ? `Editar Compra — ${compraEnEdicion.correlativo}`
            : "Editar Compra de Carbon"
        }
        size="55rem"
        rightSection={
          compraEnEdicion ? (
            <Badge c="indigo" radius="lg" variant="light">
              <Group gap={4}>
                <Pencil className="w-3.5 h-3.5" />
                Edicion
              </Group>
            </Badge>
          ) : undefined
        }
      >
        <RegistroCompraCarbon
          compraInicial={compraEnEdicion}
          onCancel={() => setCompraEnEdicion(null)}
          onCreated={() => {
            // Tras edicion, refrescamos la lista (el listado ya hace merge
            // local por id_compra_carbon para evitar saltos visuales).
            recargar();
            setCompraEnEdicion(null);
          }}
          onUpdated={(actualizada) => updateCompraLocal(actualizada)}
        />
      </ModalEstandar>

      {/* Modal: Editar una carga individual. Reutiliza ModalRegistroCargas
          en modo edicion (cargaInicial setea, el submit va a actualizarCarga).
          NOTA: ModalRegistroCargas solo renderiza el contenido; aqui lo
          envolvemos en ModalEstandar. (En el listado de compras ya viene
          envuelto externamente, por eso no se duplica alli.) */}
      {cargaEnEdicion && (
        <ModalEstandar
          opened
          close={() => setCargaEnEdicion(null)}
          title={`Editar Carga — ${cargaEnEdicion.compra.correlativo}`}
          size="75rem"
          validateClose
        >
          <ModalRegistroCargas
            compra={cargaEnEdicion.compra}
            cargaInicial={cargaEnEdicion.carga}
            onCancel={() => setCargaEnEdicion(null)}
            onSuccess={(detalle) => {
              setCargaEnEdicion(null);
              if (detalle) {
                // La cabecera del detalle ya trae los agregados recalculados
                // (toneladas reales, neto real, etc.): se actualiza la fila
                // del listado y el modal de "Cargas Recibidas" sin recargar.
                updateCompraLocal(detalle.cabecera);
                setDetalleActualizado(detalle);
              }
            }}
          />
        </ModalEstandar>
      )}
    </div>
  );
};
