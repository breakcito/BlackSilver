import { Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import { useTitlePage } from "../../../../hooks/useTitlePage";
import { useClientes } from "../../hooks/useClientes";
import { RegistroCliente } from "../registro-cliente/registro-cliente";
import { CuentasBancarias } from "../cuentas-bancarias/cuentas-bancarias";
import { EditarClienteModal } from "../components/editar-cliente-modal";
import { HistorialClienteModal } from "../components/historial-cliente-modal";
import { useState } from "react";
import type {
  ClienteResponse,
  CuentaBancariaResponse,
} from "../../service/clientes.responses";
import { Filtros } from "./components/filtros";
import { Cliente } from "./components/cliente";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";

export const ClientesPage = () => {
  useTitlePage("Clientes");
  const {
    clientes,
    loading,
    recargar,
    insertCliente,
    updateCliente,
    eliminarCliente,
    deletingId,
  } = useClientes();

  const [openRegistro, setOpenRegistro] = useState(false);
  const [selectedCliente, setSelectedCliente] =
    useState<ClienteResponse | null>(null);

  // Modales Edit / Historial
  const [openedEdicion, { open: openEdicion, close: closeEdicion }] =
    useDisclosure(false);
  const [clienteParaEditar, setClienteParaEditar] =
    useState<ClienteResponse | null>(null);

  const [openedHistorial, { open: openHistorial, close: closeHistorial }] =
    useDisclosure(false);
  const [clienteParaHistorial, setClienteParaHistorial] =
    useState<ClienteResponse | null>(null);

  const handleOpenEdit = (c: ClienteResponse) => {
    setClienteParaEditar(c);
    openEdicion();
  };
  const handleCloseEdit = () => {
    setClienteParaEditar(null);
    closeEdicion();
  };

  const handleOpenHistory = (c: ClienteResponse) => {
    setClienteParaHistorial(c);
    openHistorial();
  };
  const handleCloseHistory = () => {
    setClienteParaHistorial(null);
    closeHistorial();
  };

  const actualizarCuentas = (
    cliente: ClienteResponse,
    cuentas: CuentaBancariaResponse[],
  ): ClienteResponse => ({
    ...cliente,
    cuentas_bancarias: cuentas,
    cantidad_cuentas_bancarias: cuentas.length,
  });

  const handleCuentaActualizada = (cuenta: CuentaBancariaResponse) => {
    if (!selectedCliente) return;

    const cuentasActualizadas = (
      selectedCliente.cuentas_bancarias ?? []
    ).map((c) =>
      c.id_cuenta_bancaria === cuenta.id_cuenta_bancaria ? cuenta : c,
    );

    const clienteActualizado = actualizarCuentas(
      selectedCliente,
      cuentasActualizadas,
    );

    updateCliente(clienteActualizado);
    setSelectedCliente(clienteActualizado);
  };

  const handleCuentaAgregada = (cuenta: CuentaBancariaResponse) => {
    if (!selectedCliente) return;

    const cuentasActualizadas = [
      cuenta,
      ...(selectedCliente.cuentas_bancarias ?? []),
    ];

    const clienteActualizado = actualizarCuentas(
      selectedCliente,
      cuentasActualizadas,
    );

    updateCliente(clienteActualizado);
    setSelectedCliente(clienteActualizado);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Stack gap="md">
        <Filtros
          onOpenRegistro={() => setOpenRegistro(true)}
          onReload={recargar}
          loading={loading}
        />

        <Cliente
          clientes={clientes}
          loading={loading}
          onOpenCuentas={(c) => setSelectedCliente(c)}
          onEdit={handleOpenEdit}
          onHistory={handleOpenHistory}
          onDelete={(c) => void eliminarCliente(c.id_cliente)}
          deletingId={deletingId}
        />
      </Stack>

      {/* Modal: Registro de Cliente */}
      <ModalEstandar
        opened={openRegistro}
        close={() => setOpenRegistro(false)}
        title="Nuevo Cliente"
        size="lg"
      >
        <RegistroCliente
          onCancel={() => setOpenRegistro(false)}
          onSuccess={(c) => {
            insertCliente(c);
            setOpenRegistro(false);
          }}
        />
      </ModalEstandar>

      {/* Modal: Editar Cliente */}
      <ModalEstandar
        opened={openedEdicion}
        close={handleCloseEdit}
        title={
          clienteParaEditar
            ? `Editar Cliente: ${clienteParaEditar.razon_social}`
            : "Editar Cliente"
        }
        size="lg"
      >
        {clienteParaEditar && (
          <EditarClienteModal
            cliente={clienteParaEditar}
            onSuccess={(editado) => {
              updateCliente(editado);
              handleCloseEdit();
            }}
            onCancel={handleCloseEdit}
          />
        )}
      </ModalEstandar>

      {/* Modal: Historial de Cambios */}
      <ModalEstandar
        opened={openedHistorial}
        close={handleCloseHistory}
        title={
          clienteParaHistorial
            ? `Historial: ${clienteParaHistorial.razon_social}`
            : "Historial de Cambios"
        }
        size="xl"
      >
        {clienteParaHistorial && (
          <HistorialClienteModal cliente={clienteParaHistorial} />
        )}
      </ModalEstandar>

      {/* Modal: Gestión de Cuentas Bancarias */}
      <ModalEstandar
        opened={!!selectedCliente}
        close={() => setSelectedCliente(null)}
        title={
          selectedCliente
            ? `Cuentas Bancarias: ${selectedCliente.razon_social}`
            : ""
        }
        size="xl"
      >
        {selectedCliente && (
          <CuentasBancarias
            cliente={selectedCliente}
            onCuentaActualizada={handleCuentaActualizada}
            onCuentaAgregada={handleCuentaAgregada}
          />
        )}
      </ModalEstandar>
    </div>
  );
};
