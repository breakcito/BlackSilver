import {
  Grid,
  Select,
  Switch,
  Alert,
  Loader,
  ActionIcon,
  Tooltip,
  Button,
  TextInput,
  Badge,
} from "@mantine/core";
import {
  IconCash,
  IconNotes,
  IconPlus,
  IconExclamationCircle,
} from "@tabler/icons-react";
import { MONEDAS } from "../../../../../shared/variables/monedas";
import { useRegistroCuentaBancaria } from "../../../hooks/useRegistroCuentaBancaria";
import type { CuentaBancariaResponse } from "../../../service/proveedores.responses";
import { useState, forwardRef, useImperativeHandle } from "react";
import { RegistroBanco } from "./registro-banco";
import { ModalEstandar } from "../../../../../presentation/utils/modal-estandar";
import type { RES_Banco } from "../../../../../service/responses/banco";

interface Props {
  idProveedor: number;
  bancos: RES_Banco[];
  loadingBancos: boolean;
  onCuentaAdded: (account: CuentaBancariaResponse) => void;
  onBancoAdded: (banco: RES_Banco) => void;
  /**
   * Si esta definido, el campo Moneda se bloquea y se fuerza al valor dado.
   * Usado para proveedores de carbon (siempre en Soles).
   */
  monedaFija?: string;
}

export interface RegistroCuentaRef {
  autoSelectBanco: (id: number) => void;
}

export const RegistroCuenta = forwardRef<RegistroCuentaRef, Props>(
  (
    {
      idProveedor,
      bancos,
      loadingBancos,
      onCuentaAdded,
      onBancoAdded,
      monedaFija,
    },
    ref,
  ) => {
    const {
      payload,
      handleChangeStr,
      handleSelectBanco,
      handleToggleDetraccion,
      submit,
      isSubmitting,
      error,
      autoSelectBanco,
    } = useRegistroCuentaBancaria(idProveedor, bancos, onCuentaAdded, {
      monedaFija,
    });

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

    const selectedBanco = bancos.find((b) => b.id_banco === payload.id_banco);

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
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
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
                    label: "text-zinc-400 font-medium text-xs",
                  }}
                />
                <Tooltip label="Añadir nuevo banco" withArrow>
                  <ActionIcon
                    size="input-sm"
                    variant="light"
                    color="blue"
                    radius="xl"
                    onClick={() => setOpenBanco(true)}
                    className="mb-0.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30"
                  >
                    <IconPlus size={18} />
                  </ActionIcon>
                </Tooltip>
              </div>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              {monedaFija ? (
                <div className="flex flex-col gap-1">
                  <span className="text-zinc-400 font-medium text-xs">
                    Moneda
                  </span>
                  <Badge
                    color="blue"
                    variant="light"
                    radius="xl"
                    size="lg"
                    leftSection={<IconCash size={14} />}
                    className="self-start mt-2"
                  >
                    {monedaFija}
                  </Badge>
                </div>
              ) : (
                <Select
                  label="Moneda"
                  data={selectMonedas}
                  radius="xl"
                  value={payload.moneda}
                  onChange={(val) => handleChangeStr("moneda", val || "")}
                  classNames={{
                    input:
                      "bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-300 transition-all",
                    label: "text-zinc-400 font-medium text-xs",
                  }}
                />
              )}
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
              <TextInput
                label="Número de Cuenta"
                radius="xl"
                placeholder="Ej. 191-23132-..."
                value={payload.numero_cuenta || ""}
                onChange={(e) =>
                  handleChangeStr("numero_cuenta", e.target.value)
                }
                disabled={isSubmitting}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 14, md: 8 }}>
              <TextInput
                label="Código de Cuenta Interbancario (CCI)"
                radius="xl"
                placeholder="Ej. 002-191-23132-41-098"
                value={payload.cci || ""}
                onChange={(e) => handleChangeStr("cci", e.target.value)}
                disabled={isSubmitting}
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <div className="flex items-center justify-between gap-4 bg-zinc-900/50 border border-zinc-800 p-3 rounded-xl">
                <div className="flex items-center gap-2">
                  <Switch
                    color="yellow"
                    checked={payload.es_para_detraccion === 1}
                    disabled={
                      !selectedBanco?.es_nacional ||
                      payload.moneda !== MONEDAS.PEN.label
                    }
                    onChange={(e) =>
                      handleToggleDetraccion(e.currentTarget.checked)
                    }
                  />
                  <span
                    className={`text-sm font-medium transition-colors ${
                      !selectedBanco?.es_nacional ||
                      payload.moneda !== MONEDAS.PEN.label
                        ? "text-zinc-500 cursor-not-allowed select-none"
                        : "text-zinc-300 cursor-pointer hover:text-white"
                    }`}
                    onClick={() => {
                      const isDisabled =
                        !selectedBanco?.es_nacional ||
                        payload.moneda !== MONEDAS.PEN.label;
                      if (!isDisabled) {
                        handleToggleDetraccion(
                          payload.es_para_detraccion !== 1,
                        );
                      }
                    }}
                  >
                    Es cuenta de detracción
                  </span>
                </div>

                <Button
                  type="submit"
                  loading={isSubmitting}
                  radius="xl"
                  leftSection={<IconPlus size={18} />}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20"
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
          validateClose
          size="sm"
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
