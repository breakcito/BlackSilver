import {
  Checkbox,
  NumberInput,
  Paper,
  SimpleGrid,
  Text,
  TextInput,
} from "@mantine/core";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import type { ImportesComprobante } from "../forms/calculos-despacho";
import { inputClasses } from "./input-classes";

interface Props {
  codigo: string;
  setCodigo: (valor: string) => void;
  fecha: string;
  setFecha: (valor: string) => void;
  conDetraccion: boolean;
  setConDetraccion: (valor: boolean) => void;
  porcentajeDetraccion: number | string;
  /** Si no se pasa, el porcentaje no se edita (lo define la liquidacion). */
  setPorcentajeDetraccion?: (valor: number | string) => void;
  porcentajeIgv: number | string;
  setPorcentajeIgv?: (valor: number | string) => void;
  importes: ImportesComprobante;
  disabled?: boolean;
  /**
   * Campo que ocupa el tercer lugar de la primera fila. El flete lo usa
   * para el precio por tonelada, y deja el IGV para la segunda fila.
   */
  campoFila1?: React.ReactNode;
  /** Cuando es true, el IGV pasa a la segunda fila. */
  igvEnFila2?: boolean;
  /** Simbolo de la moneda del comprobante. */
  simbolo?: string;
  /**
   * Cuando es true se muestran las dos detracciones: la del comprobante y su
   * equivalente en soles (comprobante en dolares).
   */
  mostrarDetraccionEnSoles?: boolean;
}

/**
 * Datos comunes de un comprobante de despacho: codigo, fecha de emision,
 * detraccion e IGV, con la cascada de importes en vivo.
 */
export const ComprobanteFormPanel = ({
  codigo,
  setCodigo,
  fecha,
  setFecha,
  conDetraccion,
  setConDetraccion,
  porcentajeDetraccion,
  setPorcentajeDetraccion,
  porcentajeIgv,
  setPorcentajeIgv,
  importes,
  disabled,
  campoFila1,
  igvEnFila2,
  simbolo = "S/",
  mostrarDetraccionEnSoles,
}: Props) => {
  const inputIgv = (
    <NumberInput
      label="IGV (%)"
      value={porcentajeIgv}
      onChange={setPorcentajeIgv}
      max={100}
      fixedDecimalScale
      hideControls
      readOnly={!setPorcentajeIgv}
      classNames={inputClasses}
      size="xs"
      radius="lg"
    />
  );

  return (
    <>
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
        <TextInput
          label="Numero de comprobante"
          placeholder="Ej. F001-000123"
          value={codigo}
          onChange={(e) => setCodigo(e.currentTarget.value.toUpperCase())}
          disabled={disabled}
          classNames={inputClasses}
          size="xs"
          radius="lg"
          required
        />
        <TextInput
          label="Fecha de emision"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.currentTarget.value)}
          disabled={disabled}
          classNames={inputClasses}
          size="xs"
          radius="lg"
          required
        />
        {campoFila1 ?? inputIgv}
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, sm: 3 }} className="items-center">
        <Checkbox
          label="Aplicar detraccion"
          checked={conDetraccion}
          onChange={(e) => setConDetraccion(e.currentTarget.checked)}
          color="orange"
          size="xs"
          disabled={disabled}
        />

        {conDetraccion && (
          <NumberInput
            label="Porcentaje de detraccion"
            value={porcentajeDetraccion}
            onChange={setPorcentajeDetraccion}
            max={100}
            fixedDecimalScale
            hideControls
            readOnly={!setPorcentajeDetraccion}
            classNames={inputClasses}
            size="xs"
            radius="lg"
          />
        )}

        {igvEnFila2 && inputIgv}
      </SimpleGrid>

      <Paper p="md" radius="lg" className="bg-zinc-900/60 border border-zinc-800">
        <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs">
          Importes del comprobante
        </Text>
        <SimpleGrid
          cols={{ base: 2, md: mostrarDetraccionEnSoles ? 6 : 5 }}
          spacing="sm"
        >
          <Text size="xs" c="gray">
            Subtotal
            <Text size="sm" fw={600} c="zinc.200">
              {simbolo} {formatNumber(importes.subtotal)}
            </Text>
          </Text>
          <Text size="xs" c="gray">
            IGV
            <Text size="sm" fw={600} c="zinc.200">
              {simbolo} {formatNumber(importes.igv)}
            </Text>
          </Text>
          <Text size="xs" c="gray">
            Total
            <Text size="sm" fw={700} c="indigo.3">
              {simbolo} {formatNumber(importes.total)}
            </Text>
          </Text>
          {mostrarDetraccionEnSoles ? (
            <>
              <Text size="xs" c="gray">
                Detraccion
                <Text size="sm" fw={600} c="orange.3">
                  {simbolo} {formatNumber(importes.monto_detraccion)}
                </Text>
              </Text>
              <Text size="xs" c="gray">
                Detraccion en soles
                <Text size="sm" fw={600} c="orange.3">
                  S/ {formatNumber(importes.monto_detraccion_soles)}
                </Text>
              </Text>
            </>
          ) : (
            <Text size="xs" c="gray">
              Detraccion
              <Text size="sm" fw={600} c="orange.3">
                S/ {formatNumber(importes.monto_detraccion_soles)}
              </Text>
            </Text>
          )}
          <Text size="xs" c="gray">
            Neto a pagar
            <Text size="sm" fw={800} c="lime.3">
              {simbolo} {formatNumber(importes.neto_a_pagar)}
            </Text>
          </Text>
        </SimpleGrid>
      </Paper>
    </>
  );
};
