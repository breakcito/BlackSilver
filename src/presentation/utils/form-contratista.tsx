import { ModalEstandar } from "./modal-estandar";
import { RegistroContratista } from "../../modules/personal/presentation/registro-contratista";
import type { RES_ContratistaResumen } from "../../modules/personal/service/empleados.responses";

export interface FormContratistaProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: (nuevo: RES_ContratistaResumen) => void;
  idMinaDefault?: number | null;
}

export const FormContratista = ({
  opened,
  onClose,
  onSuccess,
  idMinaDefault,
}: FormContratistaProps) => {
  return (
    <ModalEstandar
      opened={opened}
      close={onClose}
      title="Registrar Contratista"
      validateClose
      size="lg"
      zIndex={10001}
    >
      <RegistroContratista
        idMinaDefault={idMinaDefault}
        onSuccess={(nuevo) => {
          onSuccess(nuevo);
          onClose();
        }}
        onCancel={onClose}
      />
    </ModalEstandar>
  );
};
