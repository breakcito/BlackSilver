import {
  Alert,
  Badge,
  Button,
  Group,
  NumberInput,
  Paper,
  Skeleton,
  Stack,
  Text,
} from "@mantine/core";
import { IconAlertTriangle, IconCheck, IconFlame } from "@tabler/icons-react";

import { useCalidadesCarbon } from "../../hooks/useCalidadesCarbon";
import { TipoCalidadCarbon } from "../../../../shared/enums/carbon/tipo-calidad-carbon";

/**
 * Color semántico por calidad. El % de ceniza bajo es mejor carbón, así que
 * Baja = verde (bien), Intermedia = amarillo (vigilancia), Alta = rojo (alerta).
 */
const COLOR_POR_CALIDAD: Record<string, string> = {
  [TipoCalidadCarbon.Baja]: "teal",
  [TipoCalidadCarbon.Intermedia]: "yellow",
  [TipoCalidadCarbon.Alta]: "orange",
  [TipoCalidadCarbon.Calidad]: "red",
};

const estilos = {
  input:
    "bg-zinc-900/50 border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-white",
  label: "text-zinc-400 text-xs font-semibold mb-1",
};

export const CalidadCarbonTab = () => {
  const { calidades, loading, guardandoId, cambiarRango, guardar } =
    useCalidadesCarbon();

  const vacio = !loading && calidades.length === 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-white">Calidad de Carbón</h2>
        <p className="text-xs text-zinc-500">
          Rangos de % de ceniza que definen la calidad del carbón. Estos
          valores clasifican cada carga de compra y separan el stock por
          calidad.
        </p>
      </div>

      {vacio && (
        <Alert
          color="yellow"
          variant="light"
          radius="md"
          icon={<IconAlertTriangle size={16} />}
          title="Sin catálogo de calidades"
        >
          No hay registros en la tabla <code>calidad_carbon</code>. Ejecuta el
          script de inicialización para cargar las tres calidades (Baja,
          Intermedia, Alta).
        </Alert>
      )}

      <Stack gap="sm">
        {loading &&
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height={92} radius="lg" />
          ))}

        {!loading &&
          calidades.map((c) => {
            const color = COLOR_POR_CALIDAD[c.nombre] ?? "indigo";
            const inicio = Math.min(
              100,
              Math.max(0, Number(c.porcentaje_inicio_ceniza) || 0),
            );
            const fin = Math.min(
              100,
              Math.max(0, Number(c.porcentaje_fin_ceniza) || 0),
            );
            const ancho = Math.max(0, fin - inicio);

            return (
              <Paper
                key={c.id_calidad_carbon}
                p="md"
                radius="lg"
                className="bg-zinc-900/60 border border-zinc-800"
              >
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Stack gap={6} className="flex-1 min-w-0">
                    <Group gap="xs">
                      <Badge
                        color={color}
                        variant="light"
                        radius="xl"
                        size="lg"
                        leftSection={<IconFlame size={12} />}
                      >
                        {c.nombre}
                      </Badge>
                      <Text size="xs" c="dimmed">
                        {inicio}% – {fin}% de ceniza
                      </Text>
                      {c.editado && (
                        <Badge color="indigo" variant="outline" radius="xl">
                          Sin guardar
                        </Badge>
                      )}
                    </Group>

                    {/* Barra de rango proporcional sobre la escala 0-100 */}
                    <div className="relative h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="absolute h-full rounded-full transition-all"
                        style={{
                          left: `${inicio}%`,
                          width: `${ancho}%`,
                          background:
                            color === "teal"
                              ? "#2dd4bf"
                              : color === "yellow"
                                ? "#facc15"
                                : color === "red"
                                  ? "#f87171"
                                  : "#818cf8",
                        }}
                      />
                    </div>
                  </Stack>

                  <Group gap="xs" align="flex-end" wrap="nowrap">
                    <NumberInput
                      label="Ceniza desde (%)"
                      value={c.porcentaje_inicio_ceniza}
                      onChange={(val) =>
                        cambiarRango(
                          c.id_calidad_carbon,
                          "porcentaje_inicio_ceniza",
                          val,
                        )
                      }
                      min={0}
                      max={100}
                      decimalScale={2}
                      hideControls
                      w={130}
                      classNames={estilos}
                      radius="lg"
                      size="xs"
                    />
                    <NumberInput
                      label="Ceniza hasta (%)"
                      value={c.porcentaje_fin_ceniza}
                      onChange={(val) =>
                        cambiarRango(
                          c.id_calidad_carbon,
                          "porcentaje_fin_ceniza",
                          val,
                        )
                      }
                      min={0}
                      max={100}
                      decimalScale={2}
                      hideControls
                      w={130}
                      classNames={estilos}
                      radius="lg"
                      size="xs"
                    />
                    <Button
                      size="xs"
                      radius="lg"
                      color="indigo"
                      leftSection={<IconCheck size={14} />}
                      loading={guardandoId === c.id_calidad_carbon}
                      disabled={!c.editado}
                      onClick={() => guardar(c.id_calidad_carbon)}
                    >
                      Guardar
                    </Button>
                  </Group>
                </Group>
              </Paper>
            );
          })}
      </Stack>

      <Text size="xs" c="dimmed">
        En los valores límite (p. ej. 15% de ceniza) se aplica la calidad con
        el rango de inicio más alto. Ej.: 15% se clasifica como Intermedia y
        18% como Alta.
      </Text>
    </div>
  );
};
