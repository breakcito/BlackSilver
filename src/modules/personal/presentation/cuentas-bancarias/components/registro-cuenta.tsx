import {
  Grid,
  Select,
  Alert,
  Loader,
  ActionIcon,
  Tooltip,
  Button,
  TextInput,
} from "@mantine/core";
import {
  IconNotes,
  IconPlus,
  IconExclamationCircle,
} from "@tabler/icons-react";
import { MONEDAS } from "../../../../../shared/variables/monedas";
import { useRegistroCuentaBancaria } from "../../../hooks/useRegistroCuentaBancaria";
import type { RES_CuentaBancariaEmpleado } from "../../../service/empleados.responses";
import { useState, forwardRef, useImperativeHandle } from "react";
import { RegistroBanco } from "./registro-banco";
import { ModalEstandar } from "../../../../../presentation/utils/modal-estandar";
import type { RES_Banco } from "../../../../../service/responses/banco";
import { TipoCuentaBank } from "../../../../../shared/enums/tipo-cuenta-bank";

interface Props {
  idEmpleado: number;
  bancos: RES_Banco[];
  loadingBancos: boolean;
  onCuentaAdded: (account: RES_CuentaBancariaEmpleado) => void;
  onBancoAdded: (banco: RES_Banco) => void;
}

export interface RegistroCuentaRef {
  autoSelectBanco: (id: number) => void;
}

export const RegistroCuenta = forwardRef<RegistroCuentaRef, Props>(
  (
    { idEmpleado, bancos, loadingBancos, onCuentaAdded, onBancoAdded },
    ref,
  ) => {
    const {
      payload,
      handleChangeStr,
      handleSelectBanco,
      submit,
      isSubmitting,
      error,
      autoSelectBanco,
    } = useRegistroCuentaBancaria(idEmpleado, bancos, onCuentaAdded);

    const [openBanco, setOpenBanco] = useState(false);

    useImperativeHandle(ref, () => ({
      autoSelectBanco,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const selectMonedas = Object.values(MONEDAS).map((m: any) => ({
      value: m.label,
      label: `${m.label} (${m.symbol})`,
    }));

    const selectBancos = bancos.map((b) => ({
      value: b.id_banco.toString(),
      label: `${b.nombre} ${b.abreviatura ? `(${b.abreviatura})` : ""}`,
    }));

    return (
      <div className="bg-zinc-900/50 p-5 rounded-xl border border-zinc-800 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-linear-to-b from-indigo-500 to-indigo-700" />
        <h3 className="text-zinc-200 font-semibold text-sm mb-4 flex items-center gap-2 uppercase tracking-wider">
          <IconNotes size={18} className="text-indigo-400" />
          Nueva Cuenta
        </h3>

        {error && (
          <Alert
            icon={<IconExclamationCircle size={16} />}
            color="red"
            variant="filled"
            className="mb-4"
          >
            {error}
          </Alert>
        )}

        <form onSubmit={submit} className="flex flex-col gap-4">
          <Grid align="flex-end">
            {/* Fila 1: Banco (span 8) + Moneda (span 4) */}
            <Grid.Col span={{ base: 12, md: 8 }}>
              <div className="flex items-end gap-2">
                <Select
                  label="Banco"
                  placeholder="Seleccione un banco"
                  data={selectBancos}
                  disabled={loadingBancos}
                  searchable
                  radius="xl"
                  className="flex-1"
                  rightSection={
                    loadingBancos ? <Loader size={16} /> : undefined
                  }
                  value={payload.id_banco ? payload.id_banco.toString() : null}
                  onChange={handleSelectBanco}
                  classNames={{
                    input:
                      "bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-300 transition-all",
                    label: "text-zinc-400 font-medium text-xs mb-1",
                  }}
                />
                <Tooltip label="Añadir nuevo banco" withArrow>
                  <ActionIcon
                    size="input-sm"
                    variant="light"
                    color="blue"
                    radius="xl"
                    onClick={() => setOpenBanco(true)}
                    className="mb-[2px] bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30"
                  >
                    <IconPlus size={18} />
                  </ActionIcon>
                </Tooltip>
              </div>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
              <Select
                label="Moneda"
                data={selectMonedas}
                radius="xl"
                value={payload.moneda}
                onChange={(val) => handleChangeStr("moneda", val || "")}
                classNames={{
                  input:
                    "bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-300 transition-all",
                  label: "text-zinc-400 font-medium text-xs mb-1",
                }}
              />
            </Grid.Col>

            {/* Fila 2: Número de Cuenta (span 5) + CCI (span 7) */}
            <Grid.Col span={{ base: 12, md: 5 }}>
              <TextInput
                label="Número de Cuenta"
                radius="xl"
                placeholder="Ej. 191-23132-..."
                value={payload.numero_cuenta || ""}
                onChange={(e) =>
                  handleChangeStr("numero_cuenta", e.target.value)
                }
                disabled={isSubmitting}
                classNames={{
                  input:
                    "bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-300 transition-all",
                  label: "text-zinc-400 font-medium text-xs mb-1",
                }}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 7 }}>
              <TextInput
                label="Código de Cuenta Interbancario (CCI)"
                radius="xl"
                placeholder="Ej. 002-191-23132-41-098"
                value={payload.cci || ""}
                onChange={(e) => handleChangeStr("cci", e.target.value)}
                disabled={isSubmitting}
                classNames={{
                  input:
                    "bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-300 transition-all",
                  label: "text-zinc-400 font-medium text-xs mb-1",
                }}
              />
            </Grid.Col>

            {/* Fila 3: Tipo de Cuenta (span 6) + Botón Agregar Cuenta (span 6) */}
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Tipo de Cuenta"
                data={[
                  { value: TipoCuentaBank.CuentaSueldo, label: "Cuenta Sueldo" },
                  { value: TipoCuentaBank.CuentaCorriente, label: "Cuenta Corriente" },
                ]}
                radius="xl"
                value={payload.tipo_cuenta_bancaria || TipoCuentaBank.CuentaSueldo}
                onChange={(val) => handleChangeStr("tipo_cuenta_bancaria", val || TipoCuentaBank.CuentaSueldo)}
                classNames={{
                  input:
                    "bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-300 transition-all",
                  label: "text-zinc-400 font-medium text-xs mb-1",
                }}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <div className="flex justify-end items-end h-full">
                <Button
                  type="submit"
                  loading={isSubmitting}
                  radius="xl"
                  leftSection={<IconPlus size={18} />}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20 h-[36px] px-6"
                >
                  Agregar Cuenta
                </Button>
              </div>
            </Grid.Col>
          </Grid>
        </form>

        {/* Modal: Registro de Banco */}
        <ModalEstandar
          opened={openBanco}
          close={() => setOpenBanco(false)}
          title="Registrar Nuevo Banco"
          size="sm"
          validateClose
        >
          <RegistroBanco
            onCancel={() => setOpenBanco(false)}
            onSuccess={(b) => {
              onBancoAdded(b);
              setOpenBanco(false);
            }}
          />
        </ModalEstandar>
      </div>
    );
  },
);

RegistroCuenta.displayName = "RegistroCuenta";
