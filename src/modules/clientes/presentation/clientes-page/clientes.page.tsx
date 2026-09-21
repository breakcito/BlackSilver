import { Button, Tabs, TextInput } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBuilding,
  IconFlame,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react";
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
import { BotonRecargar } from "../../../../presentation/utils/boton-recargar";
import { Cliente } from "./components/cliente";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";

type ModoCliente = "logistica" | "carbon";

const iconStyle = { width: 16, height: 16 };

export const ClientesPage = () => {
  useTitlePage("Clientes");

  // `modo` controla el listado (Logística vs Carbón). La pestaña activa
  // define automáticamente `para_carbon` al registrar: en logística
  // para_carbon=false, en carbón para_carbon=true — patrón idéntico al
  // de proveedores/almacenes.
  const [modo, setModo] = useState<ModoCliente>("logistica");
  const modoCarbon = modo === "carbon";
  const [busqueda, setBusqueda] = useState("");

  const {
    clientes,
    loading,
    recargar,
    insertCliente,
    updateCliente,
    eliminarCliente,
    deletingId,
  } = useClientes(modoCarbon);

  // Filtro client-side por razon_social / RUC / DNI (mismo patron que
  // useClientes/providers). El backend ya devuelve solo los del modo
  // activo; aqui aplicamos el texto libre del input.
  const clientesFiltrados = clientes.filter((c) => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return true;
    return (
      c.razon_social.toLowerCase().includes(q) ||
      (c.ruc ?? "").toLowerCase().includes(q) ||
      (c.dni ?? "").toLowerCase().includes(q)
    );
  });

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
    <div className="animate-fade-in space-y-6">
      <Tabs
        value={modo}
        onChange={(v) => setModo((v as ModoCliente) ?? "logistica")}
        variant="pills"
        color="indigo"
        classNames={{
          root: "space-y-6",
          list: "bg-zinc-950/80 p-0 rounded-[20px] border border-zinc-800 w-fit shrink-0 overflow-hidden gap-0",
          tab: "rounded-none px-8 py-3 transition-all duration-300 data-[active]:bg-indigo-600! data-[active]:text-white text-zinc-400 hover:text-zinc-200 font-bold",
        }}
      >
        <div className="flex flex-col lg:flex-row gap-4 items-end justify-between">
          <div className="flex flex-col md:flex-row items-end gap-4 flex-1 w-full">
            <Tabs.List>
              <Tabs.Tab
                value="logistica"
                leftSection={<IconBuilding style={iconStyle} />}
              >
                Logística
              </Tabs.Tab>
              <Tabs.Tab
                value="carbon"
                leftSection={<IconFlame style={iconStyle} />}
              >
                Carbón
              </Tabs.Tab>
            </Tabs.List>

            <TextInput
              label="Buscar Cliente"
              placeholder={
                modoCarbon
                  ? "Buscar cliente de carbón por razón social o RUC..."
                  : "Buscar cliente por razón social, RUC o DNI..."
              }
              leftSection={<IconSearch size={16} className="text-zinc-400" />}
              radius="lg"
              size="sm"
              className="flex-1 min-w-50"
              value={busqueda}
              onChange={(e) => setBusqueda(e.currentTarget.value)}
              classNames={{
                label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
                input:
                  "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
              }}
            />
          </div>

          <div className="flex gap-2 items-center shrink-0 mb-px">
            <BotonRecargar onReload={recargar} loading={loading} />
            <Button
              leftSection={<IconPlus size={18} />}
              radius="lg"
              size="sm"
              onClick={() => setOpenRegistro(true)}
              className={
                modoCarbon
                  ? "bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-900/20 shrink-0 px-8 font-bold"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20 shrink-0 px-8 font-bold"
              }
            >
              {modoCarbon ? "Nuevo Cliente de Carbón" : "Nuevo Cliente"}
            </Button>
          </div>
        </div>

        <Tabs.Panel value="logistica">
          <Cliente
            clientes={clientesFiltrados}
            loading={loading}
            onOpenCuentas={(c) => setSelectedCliente(c)}
            onEdit={handleOpenEdit}
            onHistory={handleOpenHistory}
            onDelete={(c) => void eliminarCliente(c.id_cliente)}
            deletingId={deletingId}
          />
        </Tabs.Panel>

        <Tabs.Panel value="carbon">
          <Cliente
            clientes={clientesFiltrados}
            loading={loading}
            onOpenCuentas={(c) => setSelectedCliente(c)}
            onEdit={handleOpenEdit}
            onHistory={handleOpenHistory}
            onDelete={(c) => void eliminarCliente(c.id_cliente)}
            deletingId={deletingId}
          />
        </Tabs.Panel>
      </Tabs>

      {/* Modal: Registro de Cliente */}
      <ModalEstandar
        opened={openRegistro}
        close={() => setOpenRegistro(false)}
        title={modoCarbon ? "Nuevo Cliente de Carbón" : "Nuevo Cliente"}
        size="lg"
      >
        <RegistroCliente
          modoCarbon={modoCarbon}
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
