import { useState } from "react";
import { Stack } from "@mantine/core";
import type { RES_OCTransferencia } from "../../../../service/responses/ordenes-compra/orden-compra-transferencia";
import { TransferenciaTablaDetalle } from "./components/TransferenciaTablaDetalle";
import { TransferenciaHeader } from "./components/transferencia-header";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import { HistorialRecepcionesTransferencia } from "../historial-recepciones/historial-recepciones";
import { RegistrarRecepcionTransferencia } from "../registrar-recepcion/registrar-recepcion";

interface Props {
  transferencia: RES_OCTransferencia;
  loading?: boolean;
  idAlmacenRecepcionista: number;
  onRecepcionSuccess: () => void;
}

export const DetalleTransferencia = ({
  transferencia,
  loading = false,
  idAlmacenRecepcionista,
  onRecepcionSuccess,
}: Props) => {
  const [modalHistorialAbierto, setModalHistorialAbierto] = useState(false);
  const [modalRecepcionAbierto, setModalRecepcionAbierto] = useState(false);

  const detalles = transferencia.detalles || [];

  return (
    <Stack gap="md">
      {/* Cabecera Premium */}
      <TransferenciaHeader transferencia={transferencia} />

      {/* Listado de Productos */}
      <TransferenciaTablaDetalle
        detalles={detalles}
        loading={loading}
        onOpenHistorial={() => setModalHistorialAbierto(true)}
        onOpenNuevaRecepcion={() => setModalRecepcionAbierto(true)}
        estado={transferencia.estado}
      />

      {/* MODAL HISTORIAL (Nivel 2) */}
      <ModalEstandar
        opened={modalHistorialAbierto}
        close={() => setModalHistorialAbierto(false)}
        title="Historial de Recepciones"
        size="xl"
      >
        <HistorialRecepcionesTransferencia
          idTransferencia={transferencia.id_transferencia}
        />
      </ModalEstandar>

      {/* MODAL NUEVA RECEPCIÓN (Nivel 2) */}
      <ModalEstandar
        opened={modalRecepcionAbierto}
        close={() => setModalRecepcionAbierto(false)}
        title="Registrar Recepción"
        validateClose
        size="70%"
      >
        <RegistrarRecepcionTransferencia
          idTransferencia={transferencia.id_transferencia}
          idAlmacenRecepcionista={idAlmacenRecepcionista}
          detalles={detalles}
          onSuccess={() => {
            setModalRecepcionAbierto(false);
            onRecepcionSuccess();
          }}
        />
      </ModalEstandar>
    </Stack>
  );
};
