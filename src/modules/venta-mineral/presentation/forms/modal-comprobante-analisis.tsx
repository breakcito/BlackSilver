import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Group,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { IconDeviceFloppy, IconFlask, IconX } from "@tabler/icons-react";
import dayjs from "dayjs";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import { MultiFilePicker } from "../../../../presentation/utils/archivo/multifile-picker";
import { ANALISIS_ES_FACTURABLE } from "../../../../shared/enums/venta-mineral/asumido-por-analisis";
import type {
  AnalisisLaboratorioItem,
  ComprobanteDespachoItem,
} from "../../service/venta-mineral.responses";
import { ComprobanteFormPanel } from "../components/comprobante-form-panel";
import {
  calcularImportes,
  DETRACCION_ESTANDAR_POR_DEFECTO,
  IGV_POR_DEFECTO,
} from "./calculos-despacho";

interface Props {
  close: () => void;
  /** Analisis del despacho: los propios son los facturables. */
  analisisDisponibles: AnalisisLaboratorioItem[];
  /** Si viene informado, el modal edita ese comprobante. */
  comprobante?: ComprobanteDespachoItem | null;
  onGuardar: (payload: {
    codigo_comprobante: string;
    fecha_emision: string;
    con_detraccion: boolean;
    porcentaje_detraccion: number;
    porcentaje_igv: number;
    id_analisis: number[];
    evidencias?: File[];
  }) => Promise<boolean>;
}

/**
 * Registro y edicion del comprobante de analisis de laboratorio.
 *
 * El subtotal es la suma del costo de servicio de los analisis que factura:
 * no se captura a mano. Los analisis asumidos por el cliente no entran.
 */
export const ModalComprobanteAnalisis = ({
  close,
  analisisDisponibles,
  comprobante,
  onGuardar,
}: Props) => {
  const esEdicion = Boolean(comprobante);

  const [codigo, setCodigo] = useState(
    () => comprobante?.codigo_comprobante ?? "",
  );
  const [fecha, setFecha] = useState(() =>
    comprobante?.fecha_emision
      ? dayjs(comprobante.fecha_emision).format("YYYY-MM-DD")
      : dayjs().format("YYYY-MM-DD"),
  );
  const [conDetraccion, setConDetraccion] = useState(
    () => comprobante?.con_detraccion ?? true,
  );
  const [porcentajeDetraccion, setPorcentajeDetraccion] = useState<number | string>(
    () => comprobante?.porcentaje_detraccion ?? DETRACCION_ESTANDAR_POR_DEFECTO,
  );
  const [porcentajeIgv, setPorcentajeIgv] = useState<number | string>(
    () => comprobante?.porcentaje_igv ?? IGV_POR_DEFECTO,
  );
  const [idsAnalisis, setIdsAnalisis] = useState<number[]>(() =>
    (comprobante?.analisis ?? []).map((a) => a.id_analisis_laboratorio),
  );
  const [archivos, setArchivos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Solo los analisis propios se facturan, y solo los que no estan en otro
  // comprobante.
  const analisisFacturables = useMemo(
    () =>
      analisisDisponibles.filter(
        (a) =>
          ANALISIS_ES_FACTURABLE(a.asumido_por) &&
          (!a.id_comprobante_analisis_despacho ||
            idsAnalisis.includes(a.id_analisis_laboratorio)),
      ),
    [analisisDisponibles, idsAnalisis],
  );

  const subtotal = useMemo(
    () =>
      Math.round(
        analisisFacturables
          .filter((a) => idsAnalisis.includes(a.id_analisis_laboratorio))
          .reduce((acc, a) => acc + (Number(a.costo_servicio) || 0), 0) *
          100,
      ) / 100,
    [analisisFacturables, idsAnalisis],
  );

  const importes = useMemo(
    () =>
      calcularImportes(
        subtotal,
        Number(porcentajeIgv) || 0,
        conDetraccion ? Number(porcentajeDetraccion) || 0 : 0,
      ),
    [subtotal, porcentajeIgv, porcentajeDetraccion, conDetraccion],
  );

  const handleToggle = (idAnalisis: number, marcado: boolean) => {
    setIdsAnalisis((prev) => {
      if (marcado) return prev.includes(idAnalisis) ? prev : [...prev, idAnalisis];
      return prev.filter((id) => id !== idAnalisis);
    });
  };

  const handleSubmit = async () => {
    setError(null);

    if (!codigo.trim()) {
      setError("Ingresa el numero del comprobante");
      return;
    }
    if (!fecha) {
      setError("Ingresa la fecha de emision");
      return;
    }
    if (idsAnalisis.length === 0) {
      setError("Selecciona al menos un analisis para facturar");
      return;
    }

    setSaving(true);
    const ok = await onGuardar({
      codigo_comprobante: codigo.trim().toUpperCase(),
      fecha_emision: fecha,
      con_detraccion: conDetraccion,
      porcentaje_detraccion: Number(porcentajeDetraccion) || 0,
      porcentaje_igv: Number(porcentajeIgv) || 0,
      id_analisis: idsAnalisis,
      evidencias: archivos.length > 0 ? archivos : undefined,
    });
    setSaving(false);

    if (ok) close();
  };

  return (
    <Stack gap="md">
      {error && (
        <Alert color="red" variant="light" title="Revisa los datos" radius="md">
          {error}
        </Alert>
      )}

      <Paper
        p="sm"
        radius="lg"
        className="bg-zinc-950/60 border border-zinc-800"
      >
        <Group gap="xs" mb="xs">
          <IconFlask size={16} className="text-indigo-400" />
          <Text size="xs" fw={700} c="white">
            Analisis a facturar
          </Text>
        </Group>

        {analisisFacturables.length === 0 ? (
          <Text size="xs" c="dimmed" ta="center" py="sm">
            No hay analisis propios para facturar. Los analisis que asume el
            cliente no se facturan.
          </Text>
        ) : (
          <Stack gap="xs">
            {analisisFacturables.map((analisis) => {
              const marcado = idsAnalisis.includes(analisis.id_analisis_laboratorio);

              return (
                <Group
                  key={analisis.id_analisis_laboratorio}
                  justify="space-between"
                  wrap="nowrap"
                  className={`p-2 rounded-lg border transition-colors ${
                    marcado
                      ? "bg-zinc-900/80 border-indigo-500/50"
                      : "bg-zinc-900/40 border-zinc-800/80"
                  }`}
                >
                  <Group gap="xs" align="flex-start" wrap="nowrap" className="flex-1">
                    <Checkbox
                      size="xs"
                      color="indigo"
                      checked={marcado}
                      onChange={(e) =>
                        handleToggle(
                          analisis.id_analisis_laboratorio,
                          e.currentTarget.checked,
                        )
                      }
                      className="mt-0.5"
                    />
                    <div>
                      <Text size="xs" c="gray">
                        {analisis.codigo_cliente ?? "Sin codigo"} ·{" "}
                        {analisis.laboratorio ?? "Sin laboratorio"}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Costo del servicio: S/{" "}
                        {formatNumber(analisis.costo_servicio)}
                      </Text>
                    </div>
                  </Group>
                </Group>
              );
            })}
          </Stack>
        )}
      </Paper>

      <ComprobanteFormPanel
        codigo={codigo}
        setCodigo={setCodigo}
        fecha={fecha}
        setFecha={setFecha}
        conDetraccion={conDetraccion}
        setConDetraccion={setConDetraccion}
        porcentajeDetraccion={porcentajeDetraccion}
        setPorcentajeDetraccion={setPorcentajeDetraccion}
        porcentajeIgv={porcentajeIgv}
        setPorcentajeIgv={setPorcentajeIgv}
        importes={importes}
        disabled={saving}
      />

      <MultiFilePicker
        label="Evidencias del comprobante"
        files={archivos}
        onFilesChange={setArchivos}
      />

      <Group justify="flex-end" gap="sm">
        <Button
          variant="default"
          onClick={close}
          disabled={saving}
          size="xs"
          radius="lg"
          leftSection={<IconX size={16} />}
        >
          Cancelar
        </Button>
        <Button
          color="indigo"
          onClick={handleSubmit}
          loading={saving}
          size="xs"
          radius="lg"
          leftSection={<IconDeviceFloppy size={16} />}
        >
          {esEdicion ? "Guardar cambios" : "Registrar comprobante"}
        </Button>
      </Group>
    </Stack>
  );
};
