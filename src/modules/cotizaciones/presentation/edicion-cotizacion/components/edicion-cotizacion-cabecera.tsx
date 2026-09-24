import { useState } from "react";
import {
  Grid,
  Group,
  Stack,
  Text,
  NumberInput,
  Select,
  MultiSelect,
  TextInput,
  Tooltip,
  ActionIcon,
  SegmentedControl,
} from "@mantine/core";
import {
  IdentificationIcon,
  PlusIcon,
  BuildingLibraryIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";

import type { DTO_CotizacionRequest } from "../../../service/cotizaciones.requests";
import type { RES_Proveedor } from "../../../../../service/responses/proveedor";
import type { RES_Empresa } from "../../../../../service/responses/empresa";
import { MetodoPago } from "../../../../../shared/enums/_generic/metodo-pago";
import { MONEDAS } from "../../../../../shared/variables/monedas";
import { formatNumber } from "../../../../../shared/functions/formatNumber";
import { CustomDatePicker } from "../../../../../presentation/utils/date-picker-input";
import { ModalEstandar } from "../../../../../presentation/utils/modal-estandar";
import { FormProveedor } from "../../../../../presentation/utils/form-proveedor";
import type { LoadingMaestrosState } from "../../../hooks/shared/utils";

interface EdicionCotizacionCabeceraProps {
  cotizacion: DTO_CotizacionRequest;
  proveedores: RES_Proveedor[];
  empresas: RES_Empresa[];
  loadingMaestros?: LoadingMaestrosState;
  onUpdateHeader: <K extends keyof DTO_CotizacionRequest>(
    index: number,
    field: K,
    value: DTO_CotizacionRequest[K],
  ) => void;
  onAgregarProveedorLocal?: (nuevo: RES_Proveedor) => void;
}

const inputStyles = {
  input:
    "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-600 !font-normal transition-all",
  label: "text-zinc-300 mb-1.5 font-medium text-xs",
  description: "text-zinc-500 text-[10px] italic mt-1 leading-tight",
};

export const EdicionCotizacionCabecera = ({
  cotizacion,
  proveedores,
  empresas,
  loadingMaestros,
  onUpdateHeader,
  onAgregarProveedorLocal,
}: EdicionCotizacionCabeceraProps) => {
  const [openedAddProveedor, setOpenedAddProveedor] = useState(false);

  const handleNuevoProveedorExitoso = (nuevo: RES_Proveedor) => {
    if (onAgregarProveedorLocal) {
      onAgregarProveedorLocal(nuevo);
    }
    onUpdateHeader(0, "id_proveedor", nuevo.id_proveedor);
    setOpenedAddProveedor(false);
  };

  return (
    <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 backdrop-blur-md shadow-lg flex-none">
      <Grid gutter="xl" align="flex-start">
        {/* Panel de Datos Comerciales */}
        <Grid.Col span={{ base: 12, md: 8.5 }}>
          <Stack gap="md">
            <Grid gutter="md">
              {/* Proveedor */}
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Group align="flex-end" gap="xs">
                  <Select
                    label="Proveedor"
                    placeholder={
                      loadingMaestros?.proveedores
                        ? "Buscando proveedores..."
                        : "Seleccione proveedor..."
                    }
                    data={proveedores.map((p) => ({
                      value: String(p.id_proveedor),
                      label: p.razon_social,
                    }))}
                    withAsterisk
                    disabled={loadingMaestros?.proveedores}
                    leftSection={
                      <IdentificationIcon className="w-4 h-4 text-zinc-500" />
                    }
                    value={
                      cotizacion.id_proveedor === 0
                        ? null
                        : String(cotizacion.id_proveedor)
                    }
                    onChange={(val) =>
                      onUpdateHeader(0, "id_proveedor", Number(val))
                    }
                    searchable
                    size="xs"
                    radius="lg"
                    classNames={inputStyles}
                    className="flex-1"
                    comboboxProps={{ withinPortal: true, zIndex: 9999 }}
                  />
                  <Tooltip label="Añadir proveedor" withArrow zIndex={10000}>
                    <ActionIcon
                      variant="light"
                      color="indigo"
                      radius="lg"
                      size="32px"
                      className="border border-indigo-500/20 hover:border-indigo-500/40 animate-duration-300"
                      onClick={() => setOpenedAddProveedor(true)}
                    >
                      <PlusIcon className="w-4 h-4" />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Grid.Col>

              {/* Empresas asociadas */}
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <MultiSelect
                  label="Empresas Compradoras Asociadas"
                  placeholder={
                    loadingMaestros?.empresas
                      ? "Cargando empresas..."
                      : "Seleccione empresas..."
                  }
                  data={empresas.map((e) => ({
                    value: String(e.id_empresa),
                    label: e.razon_social,
                  }))}
                  withAsterisk
                  disabled={loadingMaestros?.empresas}
                  value={cotizacion.empresas_ids.map(String)}
                  onChange={(vals) =>
                    onUpdateHeader(0, "empresas_ids", vals.map(Number))
                  }
                  size="xs"
                  radius="lg"
                  classNames={inputStyles}
                  hidePickedOptions
                />
              </Grid.Col>

              {/* Moneda */}
              <Grid.Col span={{ base: 6, sm: 3 }}>
                <Select
                  label="Moneda"
                  data={Object.values(MONEDAS).map((m) => m.label)}
                  value={cotizacion.moneda}
                  onChange={(val) => {
                    onUpdateHeader(0, "moneda", val ?? MONEDAS.PEN.label);
                    if (val === MONEDAS.PEN.label) {
                      onUpdateHeader(0, "tipo_cambio_venta_referencial", 1);
                    } else {
                      onUpdateHeader(
                        0,
                        "tipo_cambio_venta_referencial",
                        undefined,
                      );
                    }
                  }}
                  classNames={inputStyles}
                  size="xs"
                  radius="lg"
                  comboboxProps={{ withinPortal: true, zIndex: 9999 }}
                />
              </Grid.Col>

              {/* Método de pago */}
              <Grid.Col span={{ base: 6, sm: 3 }}>
                <Select
                  label="Método de Pago"
                  data={[
                    { value: MetodoPago.Contado, label: "Contado" },
                    { value: MetodoPago.Credito, label: "Crédito" },
                  ]}
                  value={cotizacion.metodo_pago}
                  onChange={(val) =>
                    onUpdateHeader(
                      0,
                      "metodo_pago",
                      (val as MetodoPago) ?? MetodoPago.Contado,
                    )
                  }
                  classNames={inputStyles}
                  size="xs"
                  radius="lg"
                  comboboxProps={{ withinPortal: true, zIndex: 9999 }}
                />
              </Grid.Col>

              {/* Fecha de Vencimiento de Pago */}
              <Grid.Col span={{ base: 12, sm: 3 }}>
                {cotizacion.metodo_pago === MetodoPago.Credito ? (
                  <CustomDatePicker
                    label="Vencimiento de Pago"
                    withAsterisk
                    placeholder="Seleccione fecha..."
                    value={
                      cotizacion.fecha_vencimiento_pago
                        ? new Date(cotizacion.fecha_vencimiento_pago)
                        : null
                    }
                    onChange={(val) =>
                      onUpdateHeader(
                        0,
                        "fecha_vencimiento_pago",
                        val ? val.toISOString().split("T")[0] : null,
                      )
                    }
                    size="xs"
                    radius="lg"
                  />
                ) : (
                  <TextInput
                    label="Vencimiento de Pago"
                    value="Pago al Contado"
                    disabled
                    size="xs"
                    radius="lg"
                    classNames={inputStyles}
                  />
                )}
              </Grid.Col>

              {/* TC Venta (Ref.) */}
              <Grid.Col span={{ base: 6, sm: 3 }}>
                <NumberInput
                  label="TC Venta (Ref.)"
                  placeholder="Ej. 3.85"
                  value={
                    cotizacion.moneda === MONEDAS.PEN.label
                      ? 1
                      : (cotizacion.tipo_cambio_venta_referencial ?? "")
                  }
                  onChange={(val) =>
                    onUpdateHeader(
                      0,
                      "tipo_cambio_venta_referencial",
                      val === "" ? undefined : Number(val),
                    )
                  }
                  disabled={cotizacion.moneda === MONEDAS.PEN.label}
                  min={0}
                  decimalScale={4}
                  size="xs"
                  radius="lg"
                  classNames={inputStyles}
                />
              </Grid.Col>

              {/* Incluye IGV */}
              <Grid.Col span={{ base: 6, sm: 3 }}>
                <Stack gap={2} pt={8.5}>
                  <Text size="xs" fw={500} className="text-zinc-300">
                    Incluye IGV
                  </Text>
                  <SegmentedControl
                    size="xs"
                    radius="lg"
                    data={[
                      { label: "SÍ", value: "true" },
                      { label: "NO", value: "false" },
                    ]}
                    value={String(cotizacion.incluye_igv)}
                    onChange={(val) =>
                      onUpdateHeader(0, "incluye_igv", val === "true")
                    }
                    color="teal"
                    classNames={{
                      root: "bg-zinc-900 border border-zinc-800 h-[32px] align-middle",
                    }}
                  />
                </Stack>
              </Grid.Col>

              {/* Flete */}
              <Grid.Col span={{ base: 6, sm: 3 }}>
                <NumberInput
                  label="Flete"
                  value={cotizacion.costo_flete ?? 0}
                  onChange={(val) =>
                    onUpdateHeader(0, "costo_flete", Number(val))
                  }
                  size="xs"
                  radius="lg"
                  classNames={inputStyles}
                  min={0}
                  decimalScale={2}
                />
              </Grid.Col>

              {/* Otros Gastos */}
              <Grid.Col span={{ base: 6, sm: 3 }}>
                <NumberInput
                  label="Otros Gastos"
                  value={cotizacion.otros_gastos ?? 0}
                  onChange={(val) =>
                    onUpdateHeader(0, "otros_gastos", Number(val))
                  }
                  size="xs"
                  radius="lg"
                  classNames={inputStyles}
                  min={0}
                  decimalScale={2}
                />
              </Grid.Col>

              {/* Observación */}
              <Grid.Col span={{ base: 12, sm: 3 }}>
                <TextInput
                  label="Observación"
                  placeholder="Nota comercial interna..."
                  value={cotizacion.observacion || ""}
                  onChange={(e) =>
                    onUpdateHeader(0, "observacion", e.currentTarget.value)
                  }
                  size="xs"
                  radius="lg"
                  classNames={inputStyles}
                />
              </Grid.Col>
            </Grid>
          </Stack>
        </Grid.Col>

        {/* Panel de Resumen Financiero Lateral */}
        <Grid.Col span={{ base: 12, md: 3.5 }}>
          <Stack gap="xs" className="h-full justify-center">
            <Text
              size="xs"
              fw={700}
              className="text-zinc-500 uppercase tracking-widest text-center mb-1"
            >
              Resumen Financiero
            </Text>

            {/* Subtotal */}
            <div className="bg-pink-700/20 border border-pink-500/30 rounded-2xl px-4 py-2.5 shadow-inner flex items-center justify-between">
              <Stack gap={0}>
                <Text
                  size="9px"
                  fw={800}
                  className="text-pink-400 uppercase tracking-wider"
                >
                  Subtotal (antes de IGV)
                </Text>
                <Text size="md" fw={900} className="text-pink-100">
                  {cotizacion.moneda === MONEDAS.PEN.label ? "S/. " : "$ "}
                  {formatNumber(cotizacion.total_antes_igv)}
                </Text>
              </Stack>
              <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center">
                <span className="text-xs font-black text-pink-400">%</span>
              </div>
            </div>

            {/* IGV */}
            <div className="bg-purple-700/20 border border-purple-500/30 rounded-2xl px-4 py-3 shadow-inner flex items-center justify-between">
              <Stack gap={0}>
                <Text
                  size="9px"
                  fw={800}
                  className="text-purple-400 uppercase tracking-wider"
                >
                  IGV ({cotizacion.porcentaje_igv}%)
                </Text>
                <Text size="md" fw={900} className="text-purple-100">
                  {cotizacion.moneda === MONEDAS.PEN.label ? "S/. " : "$ "}
                  {formatNumber(cotizacion.monto_igv)}
                </Text>
              </Stack>
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                <BuildingLibraryIcon className="size-4 text-purple-400" />
              </div>
            </div>

            {/* Total */}
            <div className="bg-cyan-600/20 border border-cyan-400/30 rounded-2xl px-4 py-3 shadow-inner flex items-center justify-between">
              <Stack gap={0}>
                <Text
                  size="9px"
                  fw={800}
                  className="text-cyan-400 uppercase tracking-wider"
                >
                  Total Neto
                </Text>
                <Text size="lg" fw={900} className="text-cyan-100">
                  {cotizacion.moneda === MONEDAS.PEN.label ? "S/. " : "$ "}
                  {formatNumber(cotizacion.total_despues_igv)}
                </Text>
              </Stack>
              <div className="w-9 h-9 rounded-full bg-cyan-500/30 flex items-center justify-center">
                <BanknotesIcon className="size-4 text-cyan-400" />
              </div>
            </div>
          </Stack>
        </Grid.Col>
      </Grid>

      {/* MODAL DE PROVEEDOR */}
      <ModalEstandar
        opened={openedAddProveedor}
        close={() => setOpenedAddProveedor(false)}
        title="Agregar Nuevo Proveedor"
        size="md"
      >
        <FormProveedor onSuccess={handleNuevoProveedorExitoso} />
      </ModalEstandar>
    </div>
  );
};
