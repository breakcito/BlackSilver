import {
  Stack,
  Group,
  Select,
  TextInput,
  NumberInput,
  Checkbox,
  Textarea,
  Button,
  Text,
  Paper,
  Badge,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import {
  DocumentTextIcon,
  BanknotesIcon,
  CalendarIcon,
  ChatBubbleLeftEllipsisIcon,
} from "@heroicons/react/24/outline";
import type { RES_OrdenCompra } from "../../../../service/responses/ordenes-compra/orden-compra";
import { MultiFilePicker } from "../../../../presentation/utils/archivo/multifile-picker";
import { TipoComprobante } from "../../../../shared/enums/_generic/tipo-comprobante";
import { MONEDAS } from "../../../../shared/variables/monedas";
import type { Moneda } from "../../../../shared/enums/_generic/moneda";
import { useRegistroComprobante } from "../../hooks/useRegistroComprobante";
import { formatNumber } from "../../../../shared/functions/formatNumber";

interface Props {
  orden: RES_OrdenCompra;
  ids_recepciones: number[];
  onSuccess: () => void;
}

export const RegistroComprobante = ({
  orden,
  ids_recepciones,
  onSuccess,
}: Props) => {
  const {
    form,
    setForm,
    loading,
    evidencias,
    setEvidencias,
    handleUpdateTotalDespues,
    handleRegistrar,
  } = useRegistroComprobante({ orden, ids_recepciones, onSuccess });

  const inputClasses = {
    input:
      "bg-zinc-900/50 border-zinc-800 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 text-white placeholder:text-zinc-600 transition-all duration-200",
    dropdown:
      "bg-zinc-950 border-zinc-800 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl",
    option:
      "text-zinc-300 hover:bg-zinc-800 hover:text-white data-[selected]:bg-indigo-600 data-[selected]:text-white font-medium transition-colors mx-1 rounded-md mb-1",
    label:
      "text-zinc-500 mb-1 font-black text-[10px] uppercase tracking-widest",
  };

  return (
    <Stack gap="sm" className="font-sans">
      <Paper
        p={0}
        radius="20px"
        className="bg-zinc-900/40 border border-zinc-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden relative"
      >
        <div className="absolute top-0 left-0 w-full h-[2px] bg-linear-to-r from-transparent via-indigo-500/50 to-transparent" />

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sección Izquierda: Identificación */}
            <Stack gap="xl">
              <Group gap="md">
                <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                  <DocumentTextIcon className="size-5 text-indigo-400" />
                </div>
                <div>
                  <Text
                    fw={900}
                    size="xs"
                    className="text-white uppercase tracking-[0.2em]"
                  >
                    Identificación
                  </Text>
                  <Text
                    size="10px"
                    fw={700}
                    c="zinc.5"
                    className="uppercase tracking-widest mt-0.5"
                  >
                    Datos del documento
                  </Text>
                </div>
              </Group>

              <div className="grid grid-cols-2 gap-5">
                <Select
                  label="Tipo de Comprobante"
                  data={Object.values(TipoComprobante)}
                  value={form.tipo_comprobante}
                  onChange={(val) =>
                    setForm((prev) => ({
                      ...prev,
                      tipo_comprobante: val || "",
                    }))
                  }
                  size="xs"
                  radius="md"
                  classNames={inputClasses}
                />
                <DateTimePicker
                  label="Fecha de Emisión"
                  value={form.fecha_emision}
                  onChange={(val) => {
                    const dateValue = val
                      ? new Date(val as string | Date)
                      : new Date();
                    setForm((prev) => ({ ...prev, fecha_emision: dateValue }));
                  }}
                  radius="md"
                  size="xs"
                  leftSection={
                    <CalendarIcon className="size-4 text-indigo-500/70" />
                  }
                  classNames={inputClasses}
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <TextInput
                  label="Serie del Documento"
                  placeholder="Ej: F001"
                  value={form.serie}
                  size="xs"
                  onChange={(e) => {
                    const value = e.currentTarget.value.toUpperCase();
                    setForm((prev) => ({
                      ...prev,
                      serie: value,
                    }));
                  }}
                  radius="md"
                  classNames={inputClasses}
                />
                <TextInput
                  label="Número Correlativo"
                  placeholder="Ej: 000123"
                  value={form.numero}
                  size="xs"
                  onChange={(e) => {
                    const value = e.currentTarget.value;
                    setForm((prev) => ({
                      ...prev,
                      numero: value,
                    }));
                  }}
                  radius="md"
                  classNames={inputClasses}
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <Select
                  label="Moneda"
                  data={Object.values(MONEDAS).map((m) => ({
                    value: m.label,
                    label: m.label,
                  }))}
                  value={form.moneda}
                  onChange={(val) =>
                    setForm((prev) => ({
                      ...prev,
                      moneda: val as Moneda,
                    }))
                  }
                  radius="md"
                  size="xs"
                  disabled
                  classNames={inputClasses}
                />
                {form.moneda !== MONEDAS.PEN.label && (
                  <NumberInput
                    label="T.C. Aplicado"
                    value={form.tipo_cambio_venta_aplicado}
                    radius="md"
                    fixedDecimalScale
                    disabled
                    size="xs"
                    classNames={inputClasses}
                  />
                )}
              </div>

              {/* Observaciones */}
              <Stack gap="md">
                <Group gap="xs">
                  <ChatBubbleLeftEllipsisIcon className="size-5 text-zinc-500" />
                  <Text
                    fw={900}
                    size="xs"
                    className="text-zinc-400 uppercase tracking-widest"
                  >
                    Observaciones
                  </Text>
                </Group>
                <Textarea
                  placeholder="Indique cualquier detalle relevante sobre este documento..."
                  value={form.observacion}
                  onChange={(e) => {
                    const value = e.currentTarget.value;
                    setForm((prev) => ({
                      ...prev,
                      observacion: value,
                    }));
                  }}
                  radius="lg"
                  minRows={4}
                  classNames={inputClasses}
                />
              </Stack>
            </Stack>

            {/* Sección Derecha: Importes Financieros */}
            <Stack gap="xl">
              <Group gap="md">
                <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <BanknotesIcon className="size-5 text-emerald-400" />
                </div>
                <div>
                  <Text
                    fw={900}
                    size="xs"
                    className="text-white uppercase tracking-[0.2em]"
                  >
                    Importes
                  </Text>
                  <Text
                    size="10px"
                    fw={700}
                    c="zinc.5"
                    className="uppercase tracking-widest mt-0.5"
                  >
                    Desglose financiero
                  </Text>
                </div>
              </Group>

              <div className="bg-zinc-950/60 border border-zinc-800/80 p-5 rounded-[30px] flex flex-col gap-4 shadow-inner relative overflow-hidden group/importes">
                <Group
                  wrap="nowrap"
                  justify="space-between"
                  align="center"
                  className="bg-zinc-900/30 p-3 rounded-xl border border-zinc-800/50"
                >
                  <Checkbox
                    label={"Es Auditable"}
                    checked={form.es_auditable}
                    disabled
                    color="indigo"
                    size="xs"
                  />
                  <Checkbox
                    checked={form.incluye_igv}
                    disabled
                    size="xs"
                    color="indigo"
                    label="Incluye IGV"
                  />
                  <Badge
                    variant="dot"
                    color="indigo"
                    size="sm"
                    radius="sm"
                    className="font-black shrink-0"
                  >
                    IGV {form.porcentaje_igv}%
                  </Badge>
                </Group>

                <div className="flex flex-row items-center gap-6 border-t border-zinc-800/80 pt-6 mt-2">
                  <div className="flex-1 self-start">
                    <NumberInput
                      label={`Total a Pagar (${form.incluye_igv ? "IGV Incluido" : "Más IGV"})`}
                      value={form.total_despues_igv}
                      onChange={(val) =>
                        handleUpdateTotalDespues(Number(val) || 0)
                      }
                      radius="xl"
                      size="xs"
                      fixedDecimalScale
                      leftSection={
                        <Text
                          size="sm"
                          fw={950}
                          c="indigo.4"
                          className="font-mono"
                        >
                          {form.moneda === MONEDAS.PEN.label ? "S/." : "$"}
                        </Text>
                      }
                      classNames={{
                        input:
                          "bg-zinc-900/90 border-indigo-500/40 text-white h-11 shadow-lg focus:border-indigo-500 focus:ring-indigo-500/20",
                        label:
                          "text-indigo-400 font-black mb-2 uppercase text-[11px]! tracking-[0.15em] ml-2",
                      }}
                    />
                  </div>

                  <Stack gap="md" className="shrink-0 min-w-[140px]">
                    <Stack gap={2}>
                      <Text
                        size="9px"
                        fw={800}
                        c="zinc.5"
                        className="uppercase tracking-widest"
                      >
                        Subtotal Neto
                      </Text>
                      <Text fw={900} size="sm" c={"blue"} className="font-mono">
                        {form.moneda === MONEDAS.PEN.label ? "S/." : "$"}{" "}
                        {formatNumber(form.total_antes_igv)}
                      </Text>
                    </Stack>
                    <Stack gap={2}>
                      <Text
                        size="9px"
                        fw={800}
                        c="zinc.5"
                        className="uppercase tracking-widest"
                      >
                        Impuesto ({form.porcentaje_igv}%)
                      </Text>
                      <Text fw={900} size="sm" c={"teal"} className="font-mono">
                        + {form.moneda === MONEDAS.PEN.label ? "S/." : "$"}{" "}
                        {formatNumber(form.monto_igv)}
                      </Text>
                    </Stack>
                  </Stack>
                </div>
              </div>

              {/* Evidencias */}
              <div className="bg-zinc-950/40 p-4 rounded-3xl border border-dashed border-zinc-800 transition-all hover:bg-zinc-950/60 hover:border-indigo-500/30">
                <MultiFilePicker
                  label="Evidencias"
                  multiple
                  files={evidencias}
                  onFilesChange={setEvidencias}
                />
              </div>
            </Stack>
          </div>
        </div>
      </Paper>

      <Group justify="flex-end" gap="lg">
        <Button
          variant="subtle"
          color="zinc"
          size="xs"
          onClick={() => onSuccess()}
          className="font-black text-zinc-500 hover:text-white uppercase tracking-widest transition-all"
        >
          Descartar Cambios
        </Button>
        <Button
          size="xs"
          variant="gradient"
          gradient={{ from: "indigo.6", to: "cyan.6" }}
          radius="xl"
          loading={loading}
          onClick={handleRegistrar}
          className="font-black shadow-[0_10px_30px_rgba(99,102,241,0.2)] px-12 uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
        >
          Confirmar Registro
        </Button>
      </Group>
    </Stack>
  );
};
