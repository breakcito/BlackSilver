import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Group, Skeleton, Stack, Text } from "@mantine/core";
import { TruckIcon, TrashIcon } from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { FormCatalogoMineral } from "../../../presentation/utils/form-catalogo-mineral";
import type { TipoCatalogoMineral } from "../../../presentation/utils/form-catalogo-mineral";
import { useTitlePage } from "../../../hooks/useTitlePage";
import { useNotify } from "../../../hooks/useNotify";
import { useVentaMineral } from "../hooks/useVentaMineral";
import { useDetalleDespacho } from "../hooks/useDetalleDespacho";
import { useCatalogosDespacho } from "../hooks/useCatalogosDespacho";
import { useClientesDespacho } from "../hooks/useClientesDespacho";
import { VentaMineralService } from "../service/venta-mineral.service";
import type { TipoComprobanteDespacho } from "../service/venta-mineral.requests";
import type {
  AnalisisLaboratorioItem,
  ComprobanteDespachoItem,
  DespachoMineralResumen,
  FleteDespachoItem,
  GastoDespachoItem,
  LiquidacionMineralItem,
} from "../service/venta-mineral.responses";
import { DespachoListado } from "./components/despacho-listado";
import { VentaMineralFiltro } from "./components/venta-mineral-filtro";
import { ModalAnalisis } from "./forms/modal-analisis";
import { ModalBalanza } from "./forms/modal-balanza";
import { ModalComprobanteAnalisis } from "./forms/modal-comprobante-analisis";
import { ModalComprobanteFlete } from "./forms/modal-comprobante-flete";
import { ModalComprobanteLiquidacion } from "./forms/modal-comprobante-liquidacion";
import { ModalComprobanteMolienda } from "./forms/modal-comprobante-molienda";
import { ModalDespacho } from "./forms/modal-despacho";
import { ModalFlete } from "./forms/modal-flete";
import { ModalGasto } from "./forms/modal-gasto";
import { ModalLiquidacion } from "./forms/modal-liquidacion";
import { ModalPago } from "./forms/modal-pago";

export const VentaMineralPage = () => {
  useTitlePage("Venta de Mineral");

  const [busqueda, setBusqueda] = useState("");
  const [mes, setMes] = useState(dayjs().month() + 1);
  const [anio, setAnio] = useState(dayjs().year());
  const [modalCatalogo, setModalCatalogo] = useState<TipoCatalogoMineral | null>(
    null,
  );
  const { notifySuccess, notifyError } = useNotify();

  const {
    data,
    lotesDespachables,
    isLoading,
    desplegados,
    detalles,
    detalleCargando,
    refetch,
    cargarLotes,
    refetchLotes,
    insertDespacho,
    refrescarDetalle,
    cambiarDespliegue,
    eliminarDespacho,
  } = useVentaMineral(mes, anio);

  const acciones = useDetalleDespacho(refrescarDetalle);
  const catalogos = useCatalogosDespacho();
  const { clientes, cargar: cargarClientes } = useClientesDespacho();

  /* ---------------- Estado de los modales ---------------- */
  const [modalDespacho, setModalDespacho] = useState<
    { despacho: DespachoMineralResumen | null } | null
  >(null);
  /** Despacho pendiente de confirmacion de eliminacion. */
  const [despachoPorEliminar, setDespachoPorEliminar] =
    useState<DespachoMineralResumen | null>(null);
  const [modalGasto, setModalGasto] = useState<{
    despacho: DespachoMineralResumen;
    gasto: GastoDespachoItem | null;
  } | null>(null);
  const [modalFlete, setModalFlete] = useState<{
    despacho: DespachoMineralResumen;
    flete: FleteDespachoItem | null;
  } | null>(null);
  const [modalBalanza, setModalBalanza] = useState<{
    despacho: DespachoMineralResumen;
    flete: FleteDespachoItem;
  } | null>(null);
  const [modalAnalisis, setModalAnalisis] = useState<{
    despacho: DespachoMineralResumen;
    analisis: AnalisisLaboratorioItem | null;
  } | null>(null);
  const [modalLiquidacion, setModalLiquidacion] = useState<{
    despacho: DespachoMineralResumen;
    liquidacion: LiquidacionMineralItem | null;
  } | null>(null);
  const [modalComprobante, setModalComprobante] = useState<{
    despacho: DespachoMineralResumen;
    tipo: TipoComprobanteDespacho;
    comprobante: ComprobanteDespachoItem | null;
  } | null>(null);
  const [modalPago, setModalPago] = useState<{
    despacho: DespachoMineralResumen;
    tipo: TipoComprobanteDespacho;
    comprobante: ComprobanteDespachoItem;
  } | null>(null);

  const despachos = useMemo(() => {
    const lista = data?.data ?? [];
    const term = busqueda.trim().toLowerCase();
    if (!term) return lista;

    return lista.filter(
      (d) =>
        (d.lote_codigo ?? "").toLowerCase().includes(term) ||
        (d.molino ?? "").toLowerCase().includes(term) ||
        (d.mina ?? "").toLowerCase().includes(term) ||
        (d.labor ?? "").toLowerCase().includes(term) ||
        (d.contratista ?? "").toLowerCase().includes(term),
    );
  }, [data, busqueda]);

  const clientesCatalogo = useMemo(
    () =>
      clientes.map((c) => ({
        id_cliente: c.id_cliente,
        razon_social: c.razon_social,
      })),
    [clientes],
  );

  /** Detalle cargado de un despacho (para alimentar los modales). */
  const detalleDe = (idDespacho: number) => detalles[idDespacho] ?? null;

  /* ---------------- Apertura de modales ----------------
   *
   * Los catalogos no se cargan al entrar al modulo: se piden en el momento
   * en que se abre el modal que los usa. Asi el catalogo sale fresco del
   * backend (sin recargar la pagina) y el listado abre de inmediato.
   */

  const abrirDespacho = (despacho: DespachoMineralResumen | null) => {
    void catalogos.cargar();
    // Los lotes despachables solo hacen falta al registrar: en la edicion
    // el lote ya esta definido.
    if (!despacho) void cargarLotes();
    setModalDespacho({ despacho });
  };

  const abrirFlete = (
    despacho: DespachoMineralResumen,
    flete: FleteDespachoItem | null,
  ) => {
    void catalogos.cargar();
    setModalFlete({ despacho, flete });
  };

  const abrirAnalisis = (
    despacho: DespachoMineralResumen,
    analisis: AnalisisLaboratorioItem | null,
  ) => {
    void catalogos.cargar();
    void cargarClientes();
    setModalAnalisis({ despacho, analisis });
  };

  const abrirLiquidacion = (
    despacho: DespachoMineralResumen,
    liquidacion: LiquidacionMineralItem | null,
  ) => {
    void cargarClientes();
    setModalLiquidacion({ despacho, liquidacion });
  };

  /**
   * Por defecto se despliega el despacho mas reciente: el primero de la
   * lista (el backend los ordena por fecha de despacho descendente).
   *
   * Solo se aplica cuando llega una lista distinta: si el usuario repliega
   * la fila, esta se queda replegada hasta que cambie el listado.
   */
  const firmaListaRef = useRef<string>("");

  useEffect(() => {
    if (despachos.length === 0) return;

    const firma = despachos.map((d) => d.id_despacho_mineral).join(",");
    if (firma === firmaListaRef.current) return;
    firmaListaRef.current = firma;

    cambiarDespliegue([despachos[0].id_despacho_mineral]);
  }, [despachos, cambiarDespliegue]);

  const mostrarEmpty =
    !isLoading && despachos.length === 0 && !busqueda;

  return (
    <div className="space-y-6 animate-fade-in p-1">
      <VentaMineralFiltro
        busqueda={busqueda}
        setBusqueda={setBusqueda}
        openCreate={() => abrirDespacho(null)}
        mes={mes}
        anio={anio}
        cambiarPeriodo={(nuevoMes, nuevoAnio) => {
          setMes(nuevoMes);
          setAnio(nuevoAnio);
        }}
        recargar={refetch}
        loading={isLoading}
      />

      {isLoading && despachos.length === 0 ? (
        <Stack gap="sm">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton
              key={`skeleton-despacho-${i}`}
              height={54}
              radius="md"
              className="bg-zinc-900/40"
            />
          ))}
        </Stack>
      ) : mostrarEmpty ? (
        <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/20 rounded-2xl border border-dashed border-zinc-800">
          <TruckIcon className="size-10 text-zinc-700 mb-3" />
          <Text size="sm" fw={600} c="dimmed">
            Todavia no hay despachos de mineral
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            Registra un despacho desde un lote de mineral ya finalizado
          </Text>
        </div>
      ) : (
        <DespachoListado
          despachos={despachos}
          loading={isLoading}
          desplegados={desplegados}
          detalles={detalles}
          detalleCargando={detalleCargando}
          onExpandedChange={(ids) => cambiarDespliegue(ids)}
          onEditarDespacho={(despacho) => abrirDespacho(despacho)}
          onEliminarDespacho={(despacho) => setDespachoPorEliminar(despacho)}
          onRegistrarGasto={(despacho) =>
            setModalGasto({ despacho, gasto: null })
          }
          onEditarGasto={(despacho, gasto) =>
            setModalGasto({ despacho, gasto })
          }
          onEliminarGasto={(despacho, gasto) =>
            void acciones.eliminarGasto(
              despacho.id_despacho_mineral,
              gasto.id_gasto_despacho,
            )
          }
          onRegistrarFlete={(despacho) => abrirFlete(despacho, null)}
          onEditarFlete={(despacho, flete) => abrirFlete(despacho, flete)}
          onRegistrarBalanza={(despacho, flete) =>
            setModalBalanza({ despacho, flete })
          }
          onEliminarFlete={(despacho, flete) =>
            void acciones.eliminarFlete(
              despacho.id_despacho_mineral,
              flete.id_flete_despacho,
            )
          }
          onRegistrarComprobante={(despacho, tipo) =>
            setModalComprobante({ despacho, tipo, comprobante: null })
          }
          onEditarComprobante={(despacho, tipo, comprobante) =>
            setModalComprobante({ despacho, tipo, comprobante })
          }
          onEliminarComprobante={(despacho, tipo, comprobante) =>
            void acciones.eliminarComprobante(
              despacho.id_despacho_mineral,
              tipo,
              comprobante.id_comprobante,
            )
          }
          onRegistrarPago={(despacho, tipo, comprobante) =>
            setModalPago({ despacho, tipo, comprobante })
          }
          onRegistrarAnalisis={(despacho) => abrirAnalisis(despacho, null)}
          onEditarAnalisis={(despacho, analisis) =>
            abrirAnalisis(despacho, analisis)
          }
          onEliminarAnalisis={(despacho, analisis) =>
            void acciones.eliminarAnalisis(
              despacho.id_despacho_mineral,
              analisis.id_analisis_laboratorio,
            )
          }
          onRegistrarLiquidacion={(despacho) => abrirLiquidacion(despacho, null)}
          onEditarLiquidacion={(despacho, liquidacion) =>
            abrirLiquidacion(despacho, liquidacion)
          }
          onEliminarLiquidacion={(despacho, liquidacion) =>
            void acciones.eliminarLiquidacion(
              despacho.id_despacho_mineral,
              liquidacion.id_liquidacion_mineral,
            )
          }
        />
      )}

      {/* ---------------- Despacho ---------------- */}
      <ModalEstandar
        opened={modalDespacho !== null}
        close={() => setModalDespacho(null)}
        validateClose
        title={
          modalDespacho?.despacho
            ? `Editar despacho · ${modalDespacho.despacho.lote_codigo ?? ""}`
            : "Nuevo Despacho de Mineral"
        }
        size="xl"
      >
        {modalDespacho && (
          <ModalDespacho
            close={() => setModalDespacho(null)}
            lotesDespachables={lotesDespachables}
            molinos={catalogos.molinos}
            transportistas={catalogos.transportistas}
            despacho={modalDespacho.despacho}
            onGuardar={async (payload, evidencias) => {
              if (modalDespacho.despacho) {
                const ok = await acciones.actualizarDespacho(
                  modalDespacho.despacho.id_despacho_mineral,
                  {
                    id_lote_mineral: payload.id_lote_mineral,
                    id_molino: payload.id_molino,
                    fecha_despacho: payload.fecha_despacho,
                    cantidad_sacos: payload.cantidad_sacos,
                    observaciones: payload.observaciones,
                  },
                );
                return ok !== null;
              }

              const res = await VentaMineralService.registrarDespacho(
                payload,
                evidencias,
              );
              if (res.success && res.data) {
                notifySuccess(
                  res.message || "Despacho registrado correctamente",
                );
                // La API ya devolvio el despacho creado: se inserta en el
                // listado en vez de volver a pedir la lista completa.
                insertDespacho(res.data);
                await refetchLotes();
                cambiarDespliegue([res.data.id_despacho_mineral]);
                return true;
              }
              notifyError(res.message || "No se pudo registrar el despacho");
              return false;
            }}
            onRegistrarMolino={() => setModalCatalogo("molino")}
            onRegistrarTransportista={() => setModalCatalogo("transportista")}
          />
        )}
      </ModalEstandar>

      {/* ---------------- Gasto ---------------- */}
      <ModalEstandar
        opened={modalGasto !== null}
        close={() => setModalGasto(null)}
        title={modalGasto?.gasto ? "Editar gasto" : "Registrar gasto"}
        size="md"
      >
        {modalGasto && (
          <ModalGasto
            close={() => setModalGasto(null)}
            gasto={modalGasto.gasto}
            onGuardar={async (payload) => {
              const idDespacho = modalGasto.despacho.id_despacho_mineral;
              const ok = modalGasto.gasto
                ? await acciones.actualizarGasto(
                    idDespacho,
                    modalGasto.gasto.id_gasto_despacho,
                    payload,
                  )
                : await acciones.registrarGasto(idDespacho, payload);
              return ok !== null;
            }}
          />
        )}
      </ModalEstandar>

      {/* ---------------- Flete ---------------- */}
      <ModalEstandar
        opened={modalFlete !== null}
        close={() => setModalFlete(null)}
        title={modalFlete?.flete ? "Editar flete" : "Registrar flete"}
        size="lg"
      >
        {modalFlete && (
          <ModalFlete
            close={() => setModalFlete(null)}
            transportistas={catalogos.transportistas}
            flete={modalFlete.flete}
            cantidadSacosDespacho={modalFlete.despacho.cantidad_sacos}
            onGuardar={async (payload) => {
              const idDespacho = modalFlete.despacho.id_despacho_mineral;
              const ok = modalFlete.flete
                ? await acciones.actualizarFlete(
                    idDespacho,
                    modalFlete.flete.id_flete_despacho,
                    payload,
                  )
                : await acciones.registrarFlete(idDespacho, payload);
              return ok !== null;
            }}
            onRegistrarTransportista={() => setModalCatalogo("transportista")}
          />
        )}
      </ModalEstandar>

      {/* ---------------- Balanza ---------------- */}
      <ModalEstandar
        opened={modalBalanza !== null}
        close={() => setModalBalanza(null)}
        title="Ticket de balanza"
        size="md"
      >
        {modalBalanza && (
          <ModalBalanza
            close={() => setModalBalanza(null)}
            flete={modalBalanza.flete}
            onGuardar={async (payload) => {
              const ok = await acciones.registrarBalanza(
                modalBalanza.despacho.id_despacho_mineral,
                modalBalanza.flete.id_flete_despacho,
                payload,
              );
              return ok !== null;
            }}
          />
        )}
      </ModalEstandar>

      {/* ---------------- Analisis ---------------- */}
      <ModalEstandar
        opened={modalAnalisis !== null}
        close={() => setModalAnalisis(null)}
        title={modalAnalisis?.analisis ? "Editar analisis" : "Registrar analisis"}
        size="lg"
      >
        {modalAnalisis && (
          <ModalAnalisis
            close={() => setModalAnalisis(null)}
            laboratorios={catalogos.laboratorios}
            clientes={clientesCatalogo}
            analisis={modalAnalisis.analisis}
            nombreLabor={detalleDe(modalAnalisis.despacho.id_despacho_mineral)?.labor ?? null}
            cantidadSacos={modalAnalisis.despacho.cantidad_sacos}
            onGuardar={async (payload) => {
              const idDespacho = modalAnalisis.despacho.id_despacho_mineral;
              const ok = modalAnalisis.analisis
                ? await acciones.actualizarAnalisis(
                    idDespacho,
                    modalAnalisis.analisis.id_analisis_laboratorio,
                    payload,
                  )
                : await acciones.registrarAnalisis(idDespacho, payload);
              return ok !== null;
            }}
            onRegistrarLaboratorio={() => setModalCatalogo("laboratorio")}
          />
        )}
      </ModalEstandar>

      {/* ---------------- Liquidacion ---------------- */}
      <ModalEstandar
        opened={modalLiquidacion !== null}
        close={() => setModalLiquidacion(null)}
        title={
          modalLiquidacion?.liquidacion
            ? "Editar liquidacion"
            : "Registrar liquidacion"
        }
        size="lg"
      >
        {modalLiquidacion && (
          <ModalLiquidacion
            close={() => setModalLiquidacion(null)}
            clientes={clientesCatalogo}
            liquidacion={modalLiquidacion.liquidacion}
            onGuardar={async (payload) => {
              const idDespacho = modalLiquidacion.despacho.id_despacho_mineral;
              const ok = modalLiquidacion.liquidacion
                ? await acciones.actualizarLiquidacion(
                    idDespacho,
                    modalLiquidacion.liquidacion.id_liquidacion_mineral,
                    payload,
                  )
                : await acciones.registrarLiquidacion(idDespacho, payload);
              return ok !== null;
            }}
          />
        )}
      </ModalEstandar>

      {/* ---------------- Comprobantes ---------------- */}
      {modalComprobante?.tipo === "flete" && (
        <ModalEstandar
          opened
          close={() => setModalComprobante(null)}
          title={
            modalComprobante.comprobante
              ? "Editar comprobante de flete"
              : "Registrar comprobante de flete"
          }
          size="lg"
        >
          <ModalComprobanteFlete
            close={() => setModalComprobante(null)}
            fletesDisponibles={
              detalleDe(modalComprobante.despacho.id_despacho_mineral)?.fletes ??
              []
            }
            comprobante={modalComprobante.comprobante}
            onGuardar={async (payload) => {
              const idDespacho = modalComprobante.despacho.id_despacho_mineral;
              const ok = modalComprobante.comprobante
                ? await acciones.actualizarComprobante(
                    idDespacho,
                    "flete",
                    modalComprobante.comprobante.id_comprobante,
                    payload,
                  )
                : await acciones.registrarComprobante(idDespacho, "flete", payload);
              return ok !== null;
            }}
          />
        </ModalEstandar>
      )}

      {modalComprobante?.tipo === "molienda" && (
        <ModalEstandar
          opened
          close={() => setModalComprobante(null)}
          title={
            modalComprobante.comprobante
              ? "Editar comprobante de molienda"
              : "Registrar comprobante de molienda"
          }
          size="lg"
        >
          <ModalComprobanteMolienda
            close={() => setModalComprobante(null)}
            comprobante={modalComprobante.comprobante}
            onGuardar={async (payload) => {
              const idDespacho = modalComprobante.despacho.id_despacho_mineral;
              const ok = modalComprobante.comprobante
                ? await acciones.actualizarComprobante(
                    idDespacho,
                    "molienda",
                    modalComprobante.comprobante.id_comprobante,
                    payload,
                  )
                : await acciones.registrarComprobante(
                    idDespacho,
                    "molienda",
                    payload,
                  );
              return ok !== null;
            }}
          />
        </ModalEstandar>
      )}

      {modalComprobante?.tipo === "analisis" && (
        <ModalEstandar
          opened
          close={() => setModalComprobante(null)}
          title={
            modalComprobante.comprobante
              ? "Editar comprobante de analisis"
              : "Registrar comprobante de analisis"
          }
          size="lg"
        >
          <ModalComprobanteAnalisis
            close={() => setModalComprobante(null)}
            analisisDisponibles={
              detalleDe(modalComprobante.despacho.id_despacho_mineral)?.analisis ??
              []
            }
            comprobante={modalComprobante.comprobante}
            onGuardar={async (payload) => {
              const idDespacho = modalComprobante.despacho.id_despacho_mineral;
              const ok = modalComprobante.comprobante
                ? await acciones.actualizarComprobante(
                    idDespacho,
                    "analisis",
                    modalComprobante.comprobante.id_comprobante,
                    payload,
                  )
                : await acciones.registrarComprobante(
                    idDespacho,
                    "analisis",
                    payload,
                  );
              return ok !== null;
            }}
          />
        </ModalEstandar>
      )}

      {modalComprobante?.tipo === "liquidacion" && (
        <ModalEstandar
          opened
          close={() => setModalComprobante(null)}
          title={
            modalComprobante.comprobante
              ? "Editar comprobante de liquidacion"
              : "Registrar comprobante de liquidacion"
          }
          size="lg"
        >
          <ModalComprobanteLiquidacion
            close={() => setModalComprobante(null)}
            liquidacionesDisponibles={
              detalleDe(modalComprobante.despacho.id_despacho_mineral)
                ?.liquidaciones ?? []
            }
            comprobante={modalComprobante.comprobante}
            onGuardar={async (payload) => {
              const idDespacho = modalComprobante.despacho.id_despacho_mineral;
              const ok = modalComprobante.comprobante
                ? await acciones.actualizarComprobante(
                    idDespacho,
                    "liquidacion",
                    modalComprobante.comprobante.id_comprobante,
                    payload,
                  )
                : await acciones.registrarComprobante(
                    idDespacho,
                    "liquidacion",
                    payload,
                  );
              return ok !== null;
            }}
          />
        </ModalEstandar>
      )}

      {/* ---------------- Pago ---------------- */}
      {modalPago && (
        <ModalEstandar
          opened
          close={() => setModalPago(null)}
          title={`Registrar pago · ${modalPago.comprobante.codigo_comprobante ?? ""}`}
          size="md"
        >
          <ModalPago
            close={() => setModalPago(null)}
            comprobante={modalPago.comprobante}
            onGuardar={async (payload) => {
              const ok = await acciones.registrarPago(
                modalPago.despacho.id_despacho_mineral,
                modalPago.tipo,
                modalPago.comprobante.id_comprobante,
                payload,
              );
              return ok !== null;
            }}
          />
        </ModalEstandar>
      )}

      {/* ---------------- Eliminar despacho ---------------- */}
      <ModalEstandar
        opened={despachoPorEliminar !== null}
        close={() => setDespachoPorEliminar(null)}
        title="Eliminar despacho"
        size="md"
      >
        <Stack gap="md">
          <Alert
            color="red"
            variant="light"
            title="Atencion"
            radius="md"
            icon={<TrashIcon className="w-5 h-5" />}
          >
            Se eliminara el despacho, sus gastos, fletes, comprobantes, analisis
            y liquidaciones. Esta accion no se puede deshacer.
            {despachoPorEliminar && (
              <Text size="xs" c="dimmed" mt={6}>
                {despachoPorEliminar.lote_codigo ?? "Sin codigo"} ·{" "}
                {despachoPorEliminar.molino ?? "sin molino"}
              </Text>
            )}
          </Alert>

          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              radius="lg"
              size="xs"
              onClick={() => setDespachoPorEliminar(null)}
            >
              Cancelar
            </Button>
            <Button
              color="red"
              radius="lg"
              size="xs"
              leftSection={<TrashIcon className="w-4 h-4" />}
              onClick={() => {
                if (!despachoPorEliminar) return;
                void eliminarDespacho(despachoPorEliminar.id_despacho_mineral);
                setDespachoPorEliminar(null);
              }}
            >
              Si, eliminar
            </Button>
          </Group>
        </Stack>
      </ModalEstandar>

      {/* ---------------- Catalogos ---------------- */}
      <ModalEstandar
        opened={modalCatalogo !== null}
        close={() => setModalCatalogo(null)}
        title={
          modalCatalogo === "molino"
            ? "Registrar molino"
            : modalCatalogo === "transportista"
              ? "Registrar transportista de mineral"
              : "Registrar laboratorio"
        }
        size="md"
      >
        {modalCatalogo && (
          <FormCatalogoMineral
            tipo={modalCatalogo}
            onSuccess={(nuevo) => {
              // El registro nuevo aparece de inmediato en el selector que
              // lo pidio: no hace falta recargar la pagina.
              if (modalCatalogo === "molino") {
                catalogos.agregarMolino(nuevo);
              } else if (modalCatalogo === "transportista") {
                catalogos.agregarTransportista(nuevo);
              } else {
                catalogos.agregarLaboratorio(nuevo);
              }
              setModalCatalogo(null);
            }}
            onCancel={() => setModalCatalogo(null)}
          />
        )}
      </ModalEstandar>
    </div>
  );
};
