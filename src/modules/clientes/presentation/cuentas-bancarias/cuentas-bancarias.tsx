import { useCuentasBancarias } from "../../hooks/useCuentasBancarias";
import { useEdicionCuentaBancaria } from "../../hooks/useEdicionCuentaBancaria";
import type {
  ClienteResponse,
  CuentaBancariaResponse,
} from "../../service/clientes.responses";
import {
  RegistroCuenta,
  type RegistroCuentaRef,
} from "./components/registro-cuenta";
import { CuentaBancaria } from "./components/cuenta-bancaria";
import { EdicionCuentaBancaria } from "./components/edicion-cuenta";
import { useEffect, useRef, useState } from "react";
import { Text } from "@mantine/core";
import { IconCreditCard } from "@tabler/icons-react";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";

interface Props {
  cliente: ClienteResponse;
  onCuentaActualizada?: (cuenta: CuentaBancariaResponse) => void;
  onCuentaAgregada?: (cuenta: CuentaBancariaResponse) => void;
}

export const CuentasBancarias = ({
  cliente,
  onCuentaActualizada,
  onCuentaAgregada,
}: Props) => {
  const { bancos, setBancos, loadingBancos } = useCuentasBancarias(
    cliente.id_cliente,
  );

  const regCuentaRef = useRef<RegistroCuentaRef>(null);

  const [openEdit, setOpenEdit] = useState(false);
  const [cuentaAEditar, setCuentaAEditar] =
    useState<CuentaBancariaResponse | null>(null);

  const cuentas = cliente.cuentas_bancarias ?? [];

  const edicionCuenta = useEdicionCuentaBancaria({
    onSuccess: (cuenta) => {
      onCuentaActualizada?.(cuenta);
    },
    onClose: () => {
      setOpenEdit(false);
      setCuentaAEditar(null);
    },
  });

  const { cargarCuenta } = edicionCuenta;

  useEffect(() => {
    if (cuentaAEditar) {
      cargarCuenta(cuentaAEditar);
    }
  }, [cuentaAEditar, cargarCuenta]);

  const handleOpenEdit = (cuenta: CuentaBancariaResponse) => {
    setCuentaAEditar(cuenta);
    setOpenEdit(true);
  };

  const handleCloseEdit = () => {
    setOpenEdit(false);
    setCuentaAEditar(null);
  };

  return (
    <div className="group/modal flex flex-col gap-8">
      {/* Formulario arriba según lo solicitado */}
      <RegistroCuenta
        ref={regCuentaRef}
        idCliente={cliente.id_cliente}
        bancos={bancos}
        loadingBancos={loadingBancos}
        onCuentaAdded={(cuenta) => onCuentaAgregada?.(cuenta)}
        onBancoAdded={(b) => {
          setBancos((prev) => [...prev, b]);
          regCuentaRef.current?.autoSelectBanco(b.id_banco);
        }}
      />

      {/* Lista de Cuentas usando items individuales en vez de tabla */}
      <div className="flex flex-col gap-3">
        <h3 className="text-zinc-300 font-medium text-sm uppercase tracking-widest px-1">
          Cuentas Registradas
        </h3>

        {cuentas.length > 0 ? (
          <div className="flex flex-col gap-3">
            {cuentas.map((cuenta) => (
              <CuentaBancaria
                key={cuenta.id_cuenta_bancaria}
                cuenta={cuenta}
                onEdit={handleOpenEdit}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-xl">
            <IconCreditCard
              size={40}
              className="text-zinc-700 mb-3"
              stroke={1}
            />
            <Text size="sm" className="text-zinc-500 font-medium">
              Este cliente no tiene cuentas bancarias registradas.
            </Text>
          </div>
        )}
      </div>

      {/* Modal: Edición de Cuenta Bancaria */}
      <ModalEstandar
        opened={openEdit}
        close={handleCloseEdit}
        title="Editar Cuenta Bancaria"
        variant=""
        size="md"
        validateClose
        closeConfirmationMessage="Vas a descartar los cambios no guardados de esta cuenta bancaria."
      >
        {cuentaAEditar && (
          <EdicionCuentaBancaria hook={edicionCuenta} onCancel={handleCloseEdit} />
        )}
      </ModalEstandar>
    </div>
  );
};
