import { useMemo, useState } from "react";
import {
  Badge,
  Group,
  Paper,
  ScrollArea,
  SegmentedControl,
  Text,
} from "@mantine/core";
import { IconCoin } from "@tabler/icons-react";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { usePagosCompraCarbon } from "../hooks/usePagosCompraCarbon";
import { ModalRegistroPago } from "./modal-registro-pago";
import { ComprobanteProveedorForm } from "./components/comprobante-proveedor-form";
import { ComprobanteTransporteCard } from "./components/comprobante-transporte-card";
import { formatPEN, round2 } from "./components/input-classes";
import {
  PagosDelComprobante,
  type PagoCarbon,
} from "./components/pagos-del-comprobante";
import { EstadoComprobanteCarbon } from "../../../shared/enums/compra-carbon/estado-comprobante-carbon";
import type {
  ComprobanteCompraCarbonResponse,
  ComprobanteTransporteCarbonResponse,
  CompraCarbonDetalleItem,
} from "../service/compra-carbon.responses";

interface Props {
  idCompraCarbon: number;
  idEmpresa: number;
  idProveedor: number;
  proveedor: string;
  correlativo: string;
  detalles: CompraCarbonDetalleItem[];
  onCerrar: () => void;
  /**
   * Avisa al listado los saldos que cambiaron para que actualice la fila.
   * No dispara peticiones: el POST ya devolvio el estado completo.
   */
  onPagoRegistrado?: (saldos: {
    total_con_descuento: number;
    monto_pagado_anticipos: number;
    avance_pago_neto: number;
    descuento_flete: number;
    avance_pago_flete: number;
  }) => void;
}

type Vista = "carbon" | "flete" | "todos";

/** Que comprobante esta abierto para pago. */
type Bucket = { tipo: "carbon" } | { tipo: "flete"; idComprobante: number };

const COLOR_ESTADO = (estado: string): "emerald" | "yellow" | "gray" => {
  if (estado === EstadoComprobanteCarbon.Pagado) return "emerald";
  if (estado === EstadoComprobanteCarbon.EnProcesoPago) return "yellow";
  return "gray";
};

/** Metrica del header: label minusculo + monto. */
const Kpi = ({
  label,
  valor,
  color = "white",
  nota,
}: {
  label: string;
  valor: string;
  color?: string;
  nota?: string;
}) => (
  <div className="text-right leading-tight">
    <Text
      size="9px"
      c="gray"
      tt="uppercase"
      fw={700}
      className="tracking-wider"
    >
      {label}
    </Text>
    <Text size="xs" fw={800} c={color} className="font-mono">
      {valor}
    </Text>
    {nota && (
      <Text size="9px" c="dimmed" className="font-mono">
        {nota}
      </Text>
    )}
  </div>
);

/**
 * Pantalla de pagos de una compra de carbon.
 *
 * El selector del header decide que se ve: solo el carbon, solo el flete, o
 * ambos. Cada comprobante se muestra con sus propios pagos dentro del mismo
 * bloque, para que el documento y su conciliacion se lean juntos.
 */
export const PagosCompraCarbonModal = ({
  idCompraCarbon,
  idEmpresa,
  idProveedor,
  proveedor,
  correlativo,
  detalles,
  onCerrar,
  onPagoRegistrado,
}: Props) => {
  const [vista, setVista] = useState<Vista>("carbon");
  const [bucketAbierto, setBucketAbierto] = useState<Bucket | null>(null);

  const {
    loading,
    registrando,
    data,
    cuentasEmpresa,
    cuentasDisponibles,
    registrarComprobanteProveedor: crearComprobanteProveedor,
    registrarComprobanteTransporte: crearComprobanteTransporte,
    registrarProveedor,
    registrarTransporte,
  } = usePagosCompraCarbon({
    idCompraCarbon,
    idEmpresa,
    idProveedor,
    necesitaFlete: vista === "flete" || vista === "todos",
  });

  const alternarBucket = (destino: Bucket) => {
    setBucketAbierto((a) =>
      JSON.stringify(a) === JSON.stringify(destino) ? null : destino,
    );
  };

  const esBucket = (destino: Bucket) =>
    JSON.stringify(bucketAbierto) === JSON.stringify(destino);

  const comprobanteProveedor = useMemo(
    () =>
      (data?.comprobantes ?? []).find(
        (c) => "id_comprobante_compra_carbon" in c,
      ) as ComprobanteCompraCarbonResponse | undefined,
    [data?.comprobantes],
  );

  const comprobantesTransporte = useMemo(
    () =>
      (data?.comprobantes ?? []).filter(
        (c) => "id_comprobante_transporte_carbon" in c,
      ) as ComprobanteTransporteCarbonResponse[],
    [data?.comprobantes],
  );

  /** Cargas con flete agrupadas por transportista: cada grupo es un comprobante. */
  const cargasPorTransportista = useMemo(() => {
    const mapa = new Map<number, CompraCarbonDetalleItem[]>();
    detalles
      .filter((d) => d.pagar_flete && d.id_transportista !== null)
      .forEach((d) => {
        const id = d.id_transportista as number;
        const lista = mapa.get(id);
        if (lista) lista.push(d);
        else mapa.set(id, [d]);
      });
    return Array.from(mapa.entries()).map(([id, cargas]) => ({
      id,
      nombre: cargas[0].transportista_razon_social ?? `Transportista ${id}`,
      cargas,
    }));
  }, [detalles]);

  /** Pagos que respaldan el comprobante del proveedor. */
  const pagosDelCarbono = useMemo(
    () =>
      (data?.pagos_proveedor ?? []).filter(
        (p) =>
          p.id_comprobante ===
          comprobanteProveedor?.id_comprobante_compra_carbon,
      ),
    [data?.pagos_proveedor, comprobanteProveedor],
  );

  const pagosDelFlete = data?.pagos_transporte ?? [];

  const saldos = useMemo(() => {
    if (!data) return null;
    const c = data.compras;
    return {
      saldoCarbon: round2(
        c.total_con_descuento - c.monto_pagado_anticipos - c.avance_pago_neto,
      ),
      saldoFlete: round2(c.descuento_flete - c.avance_pago_flete),
    };
  }, [data]);

  if (loading || !data || !saldos) {
    return (
      <ModalEstandar
        opened
        close={onCerrar}
        title={`Pagos — ${correlativo}`}
        size="58rem"
      >
        <Text size="xs" c="dimmed" ta="center" py="xl">
          Cargando...
        </Text>
      </ModalEstandar>
    );
  }

  const { compras } = data;
  const saldoNetoProveedor = comprobanteProveedor
    ? round2(
        comprobanteProveedor.total_neto - comprobanteProveedor.avance_pago_neto,
      )
    : saldos.saldoCarbon;

  /** Propaga al listado los saldos, sin volver a pedir la lista de compras. */
  const refrescar = () => {
    onPagoRegistrado?.({
      total_con_descuento: compras.total_con_descuento,
      monto_pagado_anticipos: compras.monto_pagado_anticipos,
      avance_pago_neto: compras.avance_pago_neto,
      descuento_flete: compras.descuento_flete,
      avance_pago_flete: compras.avance_pago_flete,
    });
  };

  const mostrarCarbon = vista === "carbon" || vista === "todos";
  const mostrarFlete = vista === "flete" || vista === "todos";

  /** Comprobante sobre el que esta abierto el modal de pago. */
  const comprobanteDelBucket = useMemo(() => {
    if (!bucketAbierto) return null;
    if (bucketAbierto.tipo === "carbon") return comprobanteProveedor ?? null;
    return (
      comprobantesTransporte.find(
        (c) =>
          c.id_comprobante_transporte_carbon === bucketAbierto.idComprobante,
      ) ?? null
    );
  }, [bucketAbierto, comprobanteProveedor, comprobantesTransporte]);

  return (
    <ModalEstandar
      opened
      close={onCerrar}
      title={`Pagos — ${correlativo}`}
      size="58rem"
      rightSection={
        <Group gap="sm" wrap="nowrap">
          {/* <Kpi label="Total" valor={formatPEN(compras.total_con_descuento)} /> */}
          <Kpi
            label="Saldo carbón"
            valor={formatPEN(Math.max(0, saldos.saldoCarbon))}
            color={saldos.saldoCarbon <= 0.01 ? "teal.4" : "orange.4"}
            // nota={
            //   compras.monto_pagado_anticipos > 0
            //     ? `anticipos −${formatPEN(compras.monto_pagado_anticipos)}`
            //     : undefined
            // }
          />
          <Kpi
            label="Saldo flete"
            valor={formatPEN(Math.max(0, saldos.saldoFlete))}
            color={saldos.saldoFlete <= 0.01 ? "teal.4" : "orange.4"}
          />
          <SegmentedControl
            size="xs"
            radius="lg"
            value={vista}
            onChange={(v) => {
              setVista(v as Vista);
              setBucketAbierto(null);
            }}
            data={[
              { value: "carbon", label: "Carbón" },
              { value: "flete", label: "Flete" },
              { value: "todos", label: "Todos" },
            ]}
          />
        </Group>
      }
    >
      <ScrollArea.Autosize mah={560} offsetScrollbars>
        <div className="pr-2 space-y-3">
          {/* ==================== CARBÓN ==================== */}
          {mostrarCarbon && (
            <Paper
              p="sm"
              radius="lg"
              className="bg-zinc-900/40 border border-zinc-800 space-y-2"
            >
              <Group justify="space-between">
                <Group gap="xs">
                  <IconCoin className="w-4 h-4 text-indigo-400" />
                  <Text size="xs" fw={700} c="white" tt="uppercase">
                    Carbón
                  </Text>
                  <Text size="11px" c="dimmed">
                    {proveedor}
                  </Text>
                </Group>
                {comprobanteProveedor && (
                  <Badge
                    color={COLOR_ESTADO(comprobanteProveedor.estado)}
                    variant="light"
                    size="xs"
                  >
                    {comprobanteProveedor.estado}
                  </Badge>
                )}
              </Group>

              {compras.aplica_igv ? (
                <ComprobanteProveedorForm
                  total={compras.total_con_descuento}
                  comprobante={comprobanteProveedor ?? null}
                  pagos={pagosDelCarbono}
                  registrando={registrando}
                  onPagar={() => alternarBucket({ tipo: "carbon" })}
                  saldoPagar={
                    esBucket({ tipo: "carbon" })
                      ? undefined
                      : saldoNetoProveedor
                  }
                  onRegistrar={(payload, evidencias) => {
                    void crearComprobanteProveedor(payload, evidencias).then(
                      (r) => {
                        if (r) refrescar();
                      },
                    );
                  }}
                />
              ) : (
                <>
                  <Text size="11px" c="dimmed">
                    Esta compra no aplica IGV, por lo que no tiene comprobante.
                  </Text>
                  {saldos.saldoCarbon > 0.01 && (
                    <button
                      type="button"
                      onClick={() => alternarBucket({ tipo: "carbon" })}
                      className="text-indigo-300 hover:text-indigo-200 text-xs font-semibold"
                    >
                      {esBucket({ tipo: "carbon" })
                        ? "Cerrar"
                        : `Registrar pago · ${formatPEN(saldos.saldoCarbon)}`}
                    </button>
                  )}

                  <PagosDelComprobante
                    pagos={data.pagos_proveedor as PagoCarbon[]}
                    vacio="Sin pagos al proveedor."
                  />
                </>
              )}
            </Paper>
          )}

          {/* ==================== FLETE ==================== */}
          {mostrarFlete && (
            <div>
              {cargasPorTransportista.length === 0 ? (
                <Text size="11px" c="dimmed" fs="italic">
                  Ninguna carga tiene flete a cargo de la empresa.
                </Text>
              ) : (
                <div className="space-y-2">
                  {cargasPorTransportista.map((grupo) => {
                    const ct = comprobantesTransporte.find(
                      (c) => c.id_transportista === grupo.id,
                    );
                    const saldoNeto = ct
                      ? round2(ct.total_neto - ct.avance_pago_neto)
                      : 0;
                    const bucket: Bucket = {
                      tipo: "flete",
                      idComprobante: ct?.id_comprobante_transporte_carbon ?? 0,
                    };

                    return (
                      <ComprobanteTransporteCard
                        key={grupo.id}
                        idTransportista={grupo.id}
                        nombreTransportista={grupo.nombre}
                        cargas={grupo.cargas}
                        comprobante={ct ?? null}
                        pagos={
                          ct
                            ? pagosDelFlete.filter(
                                (p) =>
                                  p.id_comprobante ===
                                  ct.id_comprobante_transporte_carbon,
                              )
                            : []
                        }
                        registrando={registrando}
                        onPagar={() => alternarBucket(bucket)}
                        saldoPagar={esBucket(bucket) ? undefined : saldoNeto}
                        onRegistrar={(payload, evidencias) => {
                          void crearComprobanteTransporte(
                            payload,
                            evidencias,
                          ).then((r) => {
                            if (r) refrescar();
                          });
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea.Autosize>

      {/* El form de pago vive en un modal propio: el comprobante queda intacto. */}
      {comprobanteDelBucket && (
        <ModalRegistroPago
          destino={
            bucketAbierto?.tipo === "flete" ? "transportista" : "proveedor"
          }
          nombreTercero={
            bucketAbierto?.tipo === "flete"
              ? (comprobanteDelBucket as ComprobanteTransporteCarbonResponse)
                  .transportista_razon_social
              : proveedor
          }
          comprobante={comprobanteDelBucket}
          permiteDetraccion={comprobanteDelBucket.con_detraccion}
          idEmpresa={idEmpresa}
          idEntidadDestino={
            bucketAbierto?.tipo === "flete"
              ? (comprobanteDelBucket as ComprobanteTransporteCarbonResponse)
                  .id_transportista
              : idProveedor
          }
          cuentasEmpresa={cuentasEmpresa}
          cuentasDestino={(paraDetraccion, idEntidad) =>
            cuentasDisponibles(
              bucketAbierto?.tipo === "flete" ? "transportista" : "proveedor",
              paraDetraccion,
              idEntidad,
            )
          }
          registrando={registrando}
          onCerrar={() => setBucketAbierto(null)}
          onSubmit={(pl, evidencias) => {
            if (bucketAbierto?.tipo === "flete" && comprobanteDelBucket) {
              const ct =
                comprobanteDelBucket as ComprobanteTransporteCarbonResponse;
              void registrarTransporte(
                {
                  id_comprobante_transporte_carbon:
                    ct.id_comprobante_transporte_carbon,
                  id_cuenta_bancaria_empresa: pl.id_cuenta_bancaria_empresa,
                  id_cuenta_bancaria_transportista: pl.cuenta_destino,
                  medio_pago: pl.medio_pago,
                  numero_operacion: pl.numero_operacion,
                  fecha_hora_pago: pl.fecha_hora_pago,
                  es_para_detraccion: pl.es_para_detraccion,
                  monto_pagado: pl.monto_pagado,
                  observacion: pl.observacion,
                },
                evidencias,
              ).then((r) => {
                if (r) {
                  setBucketAbierto(null);
                  refrescar();
                }
              });
              return;
            }

            void registrarProveedor(
              {
                id_cuenta_bancaria_empresa: pl.id_cuenta_bancaria_empresa,
                id_cuenta_bancaria_proveedor: pl.cuenta_destino,
                medio_pago: pl.medio_pago,
                numero_operacion: pl.numero_operacion,
                fecha_hora_pago: pl.fecha_hora_pago,
                es_para_detraccion: pl.es_para_detraccion,
                monto_pagado: pl.monto_pagado,
                observacion: pl.observacion,
              },
              evidencias,
            ).then((r) => {
              if (r) {
                setBucketAbierto(null);
                refrescar();
              }
            });
          }}
        />
      )}
    </ModalEstandar>
  );
};
