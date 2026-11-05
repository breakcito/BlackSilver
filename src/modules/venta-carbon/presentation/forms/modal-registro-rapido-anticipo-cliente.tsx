import { Text } from "@mantine/core";

import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import { RegistroAnticipoCliente } from "../../../clientes/presentation/anticipos-cliente/components/registro-anticipo-cliente";
import type { AnticipoClienteResponse } from "../../../clientes/service/clientes.responses";

interface Props {
  opened: boolean;
  onClose: () => void;
  idCliente: number;
  nombreCliente?: string;
  onRegistrado: (anticipo: AnticipoClienteResponse) => void;
}

/**
 * Registro rapido de un anticipo RECIBIDO del cliente, desde el modal del
 * comprobante de la venta de carbon.
 *
 * Reutiliza el form del modulo de Clientes (`RegistroAnticipoCliente`): es
 * el MISMO registro, con las mismas validaciones (Zod) y el mismo endpoint.
 * Aqui solo se envuelve en un modal para que el operador no tenga que
 * salir del comprobante que esta armando.
 */
export const ModalRegistroRapidoAnticipoCliente = ({
  opened,
  onClose,
  idCliente,
  nombreCliente,
  onRegistrado,
}: Props) => (
  <ModalEstandar
    opened={opened}
    close={onClose}
    title="Registrar anticipo del cliente"
    size="xl"
    validateClose
    rightSection={
      nombreCliente ? (
        <Text size="sm" fw={700} c="white">
          {nombreCliente}
        </Text>
      ) : undefined
    }
  >
    <RegistroAnticipoCliente
      // La `key` cambia al abrir/cerrar: React desmonta y vuelve a montar
      // el form, lo que reinicia todo su estado local (monto, fecha,
      // numero de operacion, evidencias...).
      key={opened ? "open" : "closed"}
      idCliente={idCliente}
      onRegistrado={onRegistrado}
      onCancel={onClose}
    />
  </ModalEstandar>
);
