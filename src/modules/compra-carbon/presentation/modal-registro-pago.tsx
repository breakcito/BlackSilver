import { useEffect, useMemo, useState } from "react";
import { Group, Switch, Text } from "@mantine/core";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { RegistroPagoForm } from "./components/registro-pago-form";
import type { CuentaOparable } from "./components/select-cuenta";
import { round2 } from "./components/input-classes";
import type {
  ComprobanteCompraCarbonResponse,
  ComprobanteTransporteCarbonResponse,
} from "../service/compra-carbon.responses";
import type { MedioPago } from "../../../shared/enums/compra-carbon/medio-pago";

interface Props {
  destino: "proveedor" | "transportista";
  nombreTercero: string;
  /**
   * Comprobante que se esta pagando. Es `null` cuando la compra no aplica
   * IGV: en ese caso el pago es integro y no hay documento que lo respalde,
   * pero el usuario igual debe poder registrarlo.
   */
  comprobante: ComprobanteCompraCarbonResponse | ComprobanteTransporteCarbonResponse | null;
  /** Saldo de cabecera cuando no hay comprobante que lo detalle. */
  saldoSinComprobante: number;
  idEmpresa: number;
  idEntidadDestino: number;
  cuentasEmpresa: CuentaOparable[];
  /** Sin parametro devuelve el listado filtrado segun la bandera activa. */
  cuentasDestino: (paraDetraccion: boolean, idEntidad?: number) => CuentaOparable[];
  registrando: boolean;
  onSubmit: (
    payload: {
      id_cuenta_bancaria_empresa: number;
      cuenta_destino: number;
      medio_pago: MedioPago;
      numero_operacion: string | null;
      fecha_hora_pago: string;
      es_para_detraccion: boolean;
      monto_pagado: number;
      observacion: string | null;
    },
    evidencias: File[],
  ) => void;
  onCerrar: () => void;
}

/**
 * Modal de registro de pago.
 *
 * Vive flotante sobre la pantalla de pagos en vez de desplegarse dentro del
 * comprobante: el form tiene seis campos y meterlo ahi partia el bloque
 * del documento y habia que hacer scroll para llegar al boton.
 *
 * El switch de detraccion va en el header porque es la unica decision que
 * cambia por completo el destino del dinero: la cuenta a la que entra y de
 * donde sale el monto. Ahi se ve siempre, sin scroll.
 */
export const ModalRegistroPago = ({
  destino,
  nombreTercero,
  comprobante,
  saldoSinComprobante,
  idEmpresa,
  idEntidadDestino,
  cuentasEmpresa,
  cuentasDestino,
  registrando,
  onSubmit,
  onCerrar,
}: Props) => {
  const [esDetraccion, setEsDetraccion] = useState(false);

  // El bucket cambia al alternar: el saldo y las cuentas son distintos.
  const saldo = useMemo(() => {
    if (!comprobante) return saldoSinComprobante;
    const neto = round2(comprobante.total_neto - comprobante.avance_pago_neto);
    const det = round2(
      comprobante.monto_detraccion - comprobante.avance_pago_detraccion_total,
    );
    return esDetraccion ? det : neto;
  }, [comprobante, esDetraccion, saldoSinComprobante]);

  const cuentas = useMemo(
    () => cuentasDestino(esDetraccion, idEntidadDestino),
    [cuentasDestino, esDetraccion, idEntidadDestino],
  );

  useEffect(() => {
    setEsDetraccion(false);
  }, [comprobante]);

  // Sin comprobante no hay detraccion que aplicar.
  const permiteDetraccion = comprobante?.con_detraccion ?? false;

  return (
    <ModalEstandar
      opened
      close={onCerrar}
      title={`Pagar a ${nombreTercero}`}
      size="42rem"
      rightSection={
        <Group gap="xs" wrap="nowrap">
          {permiteDetraccion && (
            <Switch
              checked={esDetraccion}
              onChange={(e) => setEsDetraccion(e.currentTarget.checked)}
              label={
                <Text size="xs" fw={600} c={esDetraccion ? "yellow.3" : "dimmed"}>
                  Pagar detracción
                </Text>
              }
              color="yellow"
              size="xs"
              disabled={registrando}
              styles={{ label: { cursor: "pointer" } }}
            />
          )}
          {/* <Text size="xs" c="dimmed" className="font-mono">
            saldo{" "}
            <span
              className={`font-bold ${
                saldo <= 0.01 ? "text-teal.4" : "text-orange.4"
              }`}
            >
              {formatPEN(Math.max(0, saldo))}
            </span>
          </Text> */}
        </Group>
      }
    >
      <RegistroPagoForm
        destino={destino}
        nombreTercero={nombreTercero}
        esParaDetraccion={esDetraccion}
        saldoDisponible={saldo}
        idEmpresa={idEmpresa}
        idEntidadDestino={idEntidadDestino}
        cuentasEmpresa={cuentasEmpresa}
        cuentasDestino={cuentas}
        registrando={registrando}
        onCancelar={onCerrar}
        onSubmit={onSubmit}
      />
    </ModalEstandar>
  );
};
