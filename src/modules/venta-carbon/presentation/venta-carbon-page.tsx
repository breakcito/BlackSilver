import { useCallback, useState } from "react";
import { Badge, Stack, Text } from "@mantine/core";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useTitlePage } from "../../../hooks/useTitlePage";
import { useNotify } from "../../../hooks/useNotify";
import { useVentaCarbon } from "../hooks/useVentaCarbon";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { VentaCarbonFilter } from "./components/venta-carbon-filter";
import { VentaCarbonListado } from "./components/venta-carbon-listado";
import { EmptyStateVentaCarbon } from "./components/empty-state-venta-carbon";
import { RegistroVentaCarbon } from "./forms/registro-venta-carbon";
import { ModalDespacharCargas } from "./forms/modal-despachar-cargas";
import { ModalConfirmarLlegada } from "./forms/modal-confirmar-llegada";
import { ModalLiquidacion } from "./forms/modal-liquidacion";
import { ModalComprobante } from "./forms/modal-comprobante";
import { ModalPago } from "./forms/modal-pago";
import { VentaCarbonService } from "../service/venta-carbon.service";
import type {
  CargaVentaCarbonItem,
  ComprobanteVentaCarbonItem,
  LiquidacionVentaCarbonItem,
  VentaCarbonResumen,
} from "../service/venta-carbon.responses";

export const VentaCarbonPage = () => {
  useTitlePage("Venta de Carbon");
  const { notifyError, notifySuccess } = useNotify();

  const {
    ventas,
    loading,
    busqueda,
    setBusqueda,
    mes,
    anio,
    cambiarPeriodo,
    recargar,
    insertVenta,
    updateVentaLocal,
    detalles,
    detalleCargando,
    desplegadas,
    setDesplegadas,
    cargarDetalle,
    cambiarDespliegue,
    refrescarDetalle,
  } = useVentaCarbon();

  const [openRegistro, setOpenRegistro] = useState(false);
  const [ventaDespachar, setVentaDespachar] =
    useState<VentaCarbonResumen | null>(null);
  const [llegada, setLlegada] = useState<{
    venta: VentaCarbonResumen;
    carga: CargaVentaCarbonItem;
  } | null>(null);

  /** Liquidacion a registrar (`null`) o a editar. */
  const [liquidacion, setLiquidacion] = useState<{
    venta: VentaCarbonResumen;
    liquidacion: LiquidacionVentaCarbonItem | null;
    tipoInicial: number | null;
    cargasIniciales: number[];
  } | null>(null);

  /** Comprobante a registrar sobre una liquidacion confirmada. */
  const [comprobante, setComprobante] = useState<{
    venta: VentaCarbonResumen;
    liquidacion: LiquidacionVentaCarbonItem;
  } | null>(null);

  /** Pago a registrar sobre el comprobante de una liquidacion. */
  const [pago, setPago] = useState<{
    venta: VentaCarbonResumen;
    comprobante: ComprobanteVentaCarbonItem;
  } | null>(null);

  const mostrarEmpty = !loading && ventas.length === 0 && !busqueda;

  /**
   * Descarga el detalle de una venta y lo devuelve. Se usa antes de abrir
   * un modal: los modales trabajan con las cargas, que solo llegan en el
   * detalle.
   */
  const ventaConDetalle = useCallback(
    async (idVentaCarbon: number): Promise<VentaCarbonResumen | null> =>
      (await cargarDetalle(idVentaCarbon)) ?? detalles[idVentaCarbon] ?? null,
    [cargarDetalle, detalles],
  );

  const abrirDespacho = useCallback(
    async (idVentaCarbon: number) => {
      const venta = await ventaConDetalle(idVentaCarbon);
      if (venta) setVentaDespachar(venta);
    },
    [ventaConDetalle],
  );

  const abrirLiquidacion = useCallback(
    async (idVentaCarbon: number) => {
      const venta = await ventaConDetalle(idVentaCarbon);
      if (venta) {
        setLiquidacion({
          venta,
          liquidacion: null,
          tipoInicial: null,
          cargasIniciales: [],
        });
      }
    },
    [ventaConDetalle],
  );

  /**
   * Abre la liquidacion de un grupo de cargas del mismo tipo: todas las
   * cargas del grupo quedan preseleccionadas y el usuario puede excluir
   * alguna en el modal.
   */
  const abrirLiquidacionGrupo = useCallback(
    async (
      idVentaCarbon: number,
      idTipoCarbon: number,
      idsCargas: number[],
    ) => {
      const venta = await ventaConDetalle(idVentaCarbon);
      if (venta) {
        setLiquidacion({
          venta,
          liquidacion: null,
          tipoInicial: idTipoCarbon,
          cargasIniciales: idsCargas,
        });
      }
    },
    [ventaConDetalle],
  );

  /** Confirma la liquidacion: habilita el registro de su comprobante. */
  const handleConfirmarLiquidacion = useCallback(
    async (venta: VentaCarbonResumen, liq: LiquidacionVentaCarbonItem) => {
      try {
        const res = await VentaCarbonService.confirmarLiquidacion(
          venta.id_venta_carbon,
          liq.id_liquidacion_venta_carbon,
        );
        if (res.success) {
          notifySuccess("Liquidacion confirmada correctamente");
          await refrescarDetalle(venta.id_venta_carbon);
        } else {
          notifyError(res.message || "No se pudo confirmar la liquidacion");
        }
      } catch (err) {
        notifyError(
          err instanceof Error
            ? err.message
            : "Error al confirmar la liquidacion",
        );
      }
    },
    [notifyError, notifySuccess, refrescarDetalle],
  );

  /**
   * Tras una operacion se recarga SOLO el detalle de la venta afectada:
   * la lista completa no se vuelve a consultar.
   */
  const refrescar = useCallback(
    async (idVentaCarbon: number) => {
      await refrescarDetalle(idVentaCarbon);
    },
    [refrescarDetalle],
  );

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
          desplegadas={desplegadas}
          detalles={detalles}
          detalleCargando={detalleCargando}
          onExpandedChange={(ids) => void cambiarDespliegue(ids)}
          onConfirmarLlegada={(venta, carga) => setLlegada({ venta, carga })}
          onDespacharCargas={(venta) =>
            void abrirDespacho(venta.id_venta_carbon)
          }
          onLiquidar={(venta) => void abrirLiquidacion(venta.id_venta_carbon)}
          onLiquidarGrupo={(venta, idTipoCarbon, idsCargas) =>
            void abrirLiquidacionGrupo(
              venta.id_venta_carbon,
              idTipoCarbon,
              idsCargas,
            )
          }
          onEditarLiquidacion={(venta, liq) =>
            setLiquidacion({
              venta,
              liquidacion: liq,
              tipoInicial: null,
              cargasIniciales: [],
            })
          }
          onConfirmarLiquidacion={handleConfirmarLiquidacion}
          onRegistrarComprobante={(venta, liq) =>
            setComprobante({ venta, liquidacion: liq })
          }
          onRegistrarPago={(venta, _liq, cmp) =>
            setPago({ venta, comprobante: cmp })
          }
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
            setDesplegadas([nuevaVenta.id_venta_carbon]);
            setOpenRegistro(false);
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
              // El modal devuelve la venta ya actualizada: no hace falta
              // volver a consultar ni la lista ni el detalle.
              updateVentaLocal(venta);
              setVentaDespachar(null);
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
        rightSection={
          <Badge variant="light" color="yellow" radius="xl" size="sm">
            En camino
          </Badge>
        }
        size="62rem"
      >
        {llegada && (
          <ModalConfirmarLlegada
            venta={llegada.venta}
            carga={llegada.carga}
            onClose={() => setLlegada(null)}
            onConfirmed={(venta) => {
              // El modal devuelve la venta ya actualizada: no hace falta
              // volver a consultar ni la lista ni el detalle.
              updateVentaLocal(venta);
              setLlegada(null);
            }}
          />
        )}
      </ModalEstandar>

      {/* Liquidacion */}
      <ModalEstandar
        opened={Boolean(liquidacion)}
        close={() => setLiquidacion(null)}
        validateClose
        title={
          liquidacion?.liquidacion
            ? `Editar liquidacion · ${liquidacion.venta.correlativo}`
            : liquidacion
              ? `Nueva liquidacion · ${liquidacion.venta.correlativo}`
              : "Liquidacion"
        }
        size="62rem"
      >
        {liquidacion && (
          <ModalLiquidacion
            venta={liquidacion.venta}
            liquidacion={liquidacion.liquidacion}
            tipoInicial={liquidacion.tipoInicial}
            cargasIniciales={liquidacion.cargasIniciales}
            onClose={() => setLiquidacion(null)}
            onSaved={() => {
              const id = liquidacion.venta.id_venta_carbon;
              setLiquidacion(null);
              void refrescar(id);
            }}
          />
        )}
      </ModalEstandar>

      {/* Comprobante */}
      <ModalEstandar
        opened={Boolean(comprobante)}
        close={() => setComprobante(null)}
        validateClose
        title={
          comprobante
            ? `Registrar comprobante · ${comprobante.venta.correlativo}`
            : "Comprobante"
        }
        size="48rem"
      >
        {comprobante && (
          <ModalComprobante
            venta={comprobante.venta}
            liquidacion={comprobante.liquidacion}
            onClose={() => setComprobante(null)}
            onSaved={() => {
              const id = comprobante.venta.id_venta_carbon;
              setComprobante(null);
              void refrescar(id);
            }}
          />
        )}
      </ModalEstandar>

      {/* Pago */}
      <ModalEstandar
        opened={Boolean(pago)}
        close={() => setPago(null)}
        validateClose
        title={
          pago
            ? `Registrar pago · ${pago.comprobante.codigo_comprobante}`
            : "Pago"
        }
        size="48rem"
      >
        {pago && (
          <ModalPago
            venta={pago.venta}
            comprobante={pago.comprobante}
            onClose={() => setPago(null)}
            onSaved={() => {
              const id = pago.venta.id_venta_carbon;
              setPago(null);
              void refrescar(id);
            }}
          />
        )}
      </ModalEstandar>
    </div>
  );
};
