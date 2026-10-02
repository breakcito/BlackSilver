import { Card, Group, Text } from "@mantine/core";
import { UserCircleIcon } from "@heroicons/react/24/outline";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { FormularioContratoEmpleado } from "./formulario-contrato";
import type {
  RES_EmpleadoConContrato,
  RES_ContratoEmpleado,
} from "../../../service/responses/contrato-empleado";

interface ModalContratoEmpleadoProps {
  idEmpleado: number;
  opened: boolean;
  close: () => void;
  /**
   * Callback al guardar el contrato. El argumento es el payload del backend
   * `{ contrato, empleado }`. Útil para que el padre actualice la lista sin refresh.
   */
  onSuccess?: (payload?: any) => void;
  /**
   * Contrato anterior del mismo empleado. Si se pasa, el form pre-rellena
   * los campos con los valores del anterior.
   */
  contratoAnterior?: RES_ContratoEmpleado;
  /**
   * Fecha mínima sugerida (YYYY-MM-DD) para el datepicker de fecha_inicio.
   * Solo se aplica a nivel de UI; el backend no la valida.
   * Si no se pasa, no se restringe el calendario.
   */
  fechaInicioSugerida?: string;
  /**
   * Nombre del empleado al que se le está registrando el contrato.
   * Se muestra en un Card destacado arriba del formulario.
   */
  nombreEmpleado?: string;
  esContratista?: boolean;
}

export const ModalContratoEmpleado = ({
  idEmpleado,
  opened,
  close,
  onSuccess,
  contratoAnterior,
  fechaInicioSugerida,
  nombreEmpleado,
  esContratista = false,
}: ModalContratoEmpleadoProps) => {
  return (
    <ModalEstandar
      opened={opened}
      close={close}
      validateClose
      title="Registrar Contrato de Trabajo"
      size="lg"
    >
      {nombreEmpleado && (
        <Card
          withBorder
          radius="lg"
          p="sm"
          mb="md"
          className="bg-indigo-500/5 border-indigo-500/30"
        >
          <Group gap="xs" wrap="nowrap">
            <UserCircleIcon className="w-4 h-4 text-indigo-400 shrink-0" />
            <Text size="xs" fw={700} c="indigo.3" tt="uppercase">
              Contrato para:
            </Text>
            <Text size="sm" fw={700} className="text-zinc-100 uppercase tracking-wider">
              {nombreEmpleado}
            </Text>
          </Group>
        </Card>
      )}
      <FormularioContratoEmpleado
        idEmpleado={idEmpleado}
        contratoAnterior={contratoAnterior}
        fechaInicioSugerida={fechaInicioSugerida}
        esContratista={esContratista}
        onSuccess={(payload) => {
          // El formulario del contrato, al confirmar, hace su submit interno
          // (POST /api/contratos-empleado). Aquí cerramos el modal y delegamos
          // al padre la actualización de la lista.
          onSuccess?.(payload as RES_EmpleadoConContrato);
          close();
        }}
        onCancel={close}
      />
    </ModalEstandar>
  );
};