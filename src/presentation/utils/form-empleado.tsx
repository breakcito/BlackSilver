import { ModalEstandar } from "./modal-estandar";
import { RegistroEmpleado } from "../../modules/personal/presentation/registro-empleado";
import type { RES_EmpleadoResumen } from "../../modules/personal/service/empleados.responses";

export interface FormEmpleadoProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: (nuevo: RES_EmpleadoResumen) => void;
}

export const FormEmpleado = ({
  opened,
  onClose,
  onSuccess,
}: FormEmpleadoProps) => {
  return (
    <ModalEstandar
      opened={opened}
      close={onClose}
      validateClose
      title="Registrar Empleado"
      size="xl"
      zIndex={10001}
    >
      <RegistroEmpleado
        onSuccess={(nuevo) => {
          onSuccess(nuevo);
          onClose();
        }}
        onCancel={onClose}
      />
    </ModalEstandar>
  );
};
