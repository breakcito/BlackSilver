import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconDeviceFloppy,
  IconFlask,
  IconLock,
  IconX,
} from "@tabler/icons-react";
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

/** Analisis de un mismo laboratorio (proveedor del servicio de analisis). */
interface GrupoProveedor {
  /** Id del laboratorio; 0 cuando el analisis no tiene laboratorio. */
  id: number;
  nombre: string;
  ruc: string | null;
  analisis: AnalisisLaboratorioItem[];
}

/** Id del laboratorio cuando el analisis no tiene proveedor registrado. */
const SIN_LABORATORIO = 0;

/** Laboratorio (proveedor) al que pertenece un analisis. */
const idProveedor = (analisis: AnalisisLaboratorioItem): number =>
  analisis.id_laboratorio ?? SIN_LABORATORIO;

/**
 * Registro y edicion del comprobante de analisis de laboratorio.
 *
 * El subtotal es la suma del costo de servicio de los analisis que factura:
 * no se captura a mano. Los analisis asumidos por el cliente no entran.
 *
 * Un comprobante factura a un solo proveedor (laboratorio): el primer
 * analisis que se marca define de quien es el comprobante y los analisis de
 * los demas laboratorios quedan bloqueados.
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
    () => comprobante?.porcentaje_detraccion ?? 10,
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

  /**
   * Laboratorio del comprobante: lo define el primer analisis marcado.
   * Es null cuando todavia no se ha marcado ninguno (nada esta bloqueado).
   */
  const proveedorActivo = useMemo(() => {
    const marcado = analisisFacturables.find((a) =>
      idsAnalisis.includes(a.id_analisis_laboratorio),
    );
    return marcado ? idProveedor(marcado) : null;
  }, [analisisFacturables, idsAnalisis]);

  /** Analisis agrupados por laboratorio: cada comprobante factura a uno. */
  const gruposProveedor = useMemo(() => {
    const porId = new Map<number, GrupoProveedor>();

    analisisFacturables.forEach((analisis) => {
      const id = idProveedor(analisis);
      const grupo = porId.get(id);

      if (grupo) {
        grupo.analisis.push(analisis);
        return;
      }

      porId.set(id, {
        id,
        nombre: analisis.laboratorio?.trim() || "Sin laboratorio",
        ruc: analisis.laboratorio_ruc,
        analisis: [analisis],
      });
    });

    return Array.from(porId.values()).sort((a, b) =>
      a.nombre.localeCompare(b.nombre),
    );
  }, [analisisFacturables]);

  /** Laboratorio que factura el comprobante (null si no hay nada marcado). */
  const grupoActivo = useMemo(
    () => gruposProveedor.find((g) => g.id === proveedorActivo) ?? null,
    [gruposProveedor, proveedorActivo],
  );

  /** Analisis ya marcados: son los que suman al subtotal. */
  const analisisMarcados = useMemo(
    () =>
      analisisFacturables.filter((a) =>
        idsAnalisis.includes(a.id_analisis_laboratorio),
      ),
    [analisisFacturables, idsAnalisis],
  );

  const subtotal = useMemo(
    () =>
      Math.round(
        analisisMarcados.reduce((acc, a) => acc + (Number(a.costo_servicio) || 0), 0) *
          100,
      ) / 100,
    [analisisMarcados],
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
    if (marcado) {
      const analisis = analisisDisponibles.find(
        (a) => a.id_analisis_laboratorio === idAnalisis,
      );
      const yaMarcado = analisisFacturables.find((a) =>
        idsAnalisis.includes(a.id_analisis_laboratorio),
      );

      // Un comprobante factura a un solo proveedor: no se mezclan laboratorios.
      if (
        !analisis ||
        (yaMarcado && idProveedor(yaMarcado) !== idProveedor(analisis))
      ) {
        return;
      }

      setIdsAnalisis((prev) =>
        prev.includes(idAnalisis) ? prev : [...prev, idAnalisis],
      );
      return;
    }

    setIdsAnalisis((prev) => prev.filter((id) => id !== idAnalisis));
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

    // Guarda contra el paso de providers: el comprobante es de un solo
    // laboratorio. Solo se alcanza cuando el comprobante ya traia analisis de
    // dos laboratorios y el usuario todavia no los depuro.
    const proveedores = new Set(analisisMarcados.map(idProveedor));
    if (proveedores.size > 1) {
      setError(
        "Los analisis de un comprobante deben ser del mismo laboratorio",
      );
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
            Análisis a facturar
          </Text>
          <Badge color="indigo" variant="light" size="xs" radius="sm">
            {analisisMarcados.length} de {analisisFacturables.length}
          </Badge>
        </Group>

        {gruposProveedor.length === 0 ? (
          <Text size="xs" c="dimmed" ta="center" py="sm">
            No hay analisis propios para facturar. Los analisis que asume el
            cliente no se facturan.
          </Text>
        ) : (
          <Stack gap="sm">
            {gruposProveedor.map((grupo) => {
              // Con un laboratorio ya marcado, los demas quedan bloqueados.
              const bloqueadoGrupo =
                proveedorActivo !== null && grupo.id !== proveedorActivo;
              const marcados = grupo.analisis.filter((a) =>
                idsAnalisis.includes(a.id_analisis_laboratorio),
              ).length;

              return (
                <div key={grupo.id}>
                  <Group gap="xs" mb={4} wrap="nowrap">
                    <Text
                      size="xs"
                      fw={700}
                      c={bloqueadoGrupo ? "dimmed" : "indigo.3"}
                      truncate
                    >
                      {grupo.nombre}
                    </Text>
                    {grupo.ruc && (
                      <Text size="xs" c="gray.5" className="font-mono">
                        {grupo.ruc}
                      </Text>
                    )}
                    <Badge
                      color={bloqueadoGrupo ? "gray" : "indigo"}
                      variant="light"
                      size="xs"
                      radius="sm"
                    >
                      {marcados}/{grupo.analisis.length}
                    </Badge>
                    {bloqueadoGrupo && (
                      <IconLock size={12} className="text-zinc-600" />
                    )}
                  </Group>

                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xs">
                    {grupo.analisis.map((analisis) => {
                      const marcado = idsAnalisis.includes(
                        analisis.id_analisis_laboratorio,
                      );
                      // Un analisis ya marcado de otro laboratorio se deja
                      // editable para que el usuario pueda quitarlo; los
                      // demas no se pueden marcar.
                      const bloqueado = bloqueadoGrupo && !marcado;

                      return (
                        <Group
                          key={analisis.id_analisis_laboratorio}
                          justify="space-between"
                          wrap="nowrap"
                          className={`p-2 rounded-lg border transition-colors ${
                            bloqueado
                              ? "bg-zinc-950/40 border-zinc-800/50 opacity-50"
                              : marcado
                                ? "bg-zinc-900/80 border-indigo-500/50"
                                : "bg-zinc-900/40 border-zinc-800/80"
                          }`}
                        >
                          <Group
                            gap="xs"
                            align="flex-start"
                            wrap="nowrap"
                            className="flex-1"
                          >
                            <Tooltip
                              label={`Solo puedes facturar analisis de ${grupoActivo?.nombre}`}
                              withArrow
                              disabled={!bloqueado}
                            >
                              <Checkbox
                                size="xs"
                                color="indigo"
                                checked={marcado}
                                disabled={bloqueado}
                                onChange={(e) =>
                                  handleToggle(
                                    analisis.id_analisis_laboratorio,
                                    e.currentTarget.checked,
                                  )
                                }
                                className="mt-0.5"
                              />
                            </Tooltip>
                            <div className="min-w-0">
                              <Text
                                size="xs"
                                c="gray"
                                className="uppercase"
                                fw={600}
                                truncate
                              >
                                {analisis.codigo_cliente ?? "Sin codigo"}
                              </Text>
                              <Text size="xs" c="gray.5">
                                Costo del servicio: S/{" "}
                                {formatNumber(analisis.costo_servicio)}
                              </Text>
                            </div>
                          </Group>
                        </Group>
                      );
                    })}
                  </SimpleGrid>
                </div>
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
