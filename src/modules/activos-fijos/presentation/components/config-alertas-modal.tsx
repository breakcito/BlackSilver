import { useState, useEffect } from "react";
import {
  Stack,
  NumberInput,
  Button,
  Group,
  Text,
  Switch,
} from "@mantine/core";
import { 
  BellIcon, 
  ClockIcon, 
  ArrowTrendingUpIcon, 
  ArrowPathIcon 
} from "@heroicons/react/24/outline";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import { ActivosService } from "../../service/activos.service";
import { useNotify } from "../../../../hooks/useNotify";
import type { RES_ActivoFijoResumen } from "../../service/activos.responses";

interface Props {
  opened: boolean;
  close: () => void;
  activo: RES_ActivoFijoResumen;
  onSuccess: () => void;
}

export const ActivoConfigAlertasModal = ({ opened, close, activo, onSuccess }: Props) => {
  const { notifySuccess, notifyError } = useNotify();
  const [saving, setSaving] = useState(false);

  const [horasEnabled, setHorasEnabled] = useState(false);
  const [kmsEnabled, setKmsEnabled] = useState(false);
  const [vueltasEnabled, setVueltasEnabled] = useState(false);

  const [horas, setHoras] = useState<number | "">("");
  const [kms, setKms] = useState<number | "">("");
  const [vueltas, setVueltas] = useState<number | "">("");

  useEffect(() => {
    if (opened) {
      setHorasEnabled(activo.intervalo_mantenimiento_horas !== null);
      setKmsEnabled(activo.intervalo_mantenimiento_kilometros !== null);
      setVueltasEnabled(activo.intervalo_mantenimiento_vueltas !== null);

      setHoras(activo.intervalo_mantenimiento_horas ?? "");
      setKms(activo.intervalo_mantenimiento_kilometros ?? "");
      setVueltas(activo.intervalo_mantenimiento_vueltas ?? "");
    }
  }, [opened, activo]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const res = await ActivosService.configurarAlertas({
        id_activo: activo.id_activo,
        intervalo_horas: (horasEnabled && horas !== "") ? Number(horas) : null,
        intervalo_kilometros: (kmsEnabled && kms !== "") ? Number(kms) : null,
        intervalo_vueltas: (vueltasEnabled && vueltas !== "") ? Number(vueltas) : null,
      });
      if (res.success) {
        notifySuccess("Alertas configuradas correctamente");
        onSuccess();
        close();
      } else {
        notifyError(res.message);
      }
    } catch (error) {
      console.error(error);
      notifyError("Error al configurar alertas");
    } finally {
      setSaving(false);
    }
  };

  const fieldClasses = {
    input: "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500",
    label: "text-zinc-300 mb-1 font-medium",
  };

  const hasAnyControl = !!activo.control_por_horometro || !!activo.control_por_odometro || !!activo.control_por_vueltas;

  return (
    <ModalEstandar
      opened={opened}
      close={close}
      title="Configurar Alertas de Mantenimiento"
      size="md"
      validateClose
    >
      <Stack gap="md">
        <Text size="sm" c="zinc.4">
          Personaliza los límites de mantenimiento preventivo para este activo. Las alertas se generarán cuando se alcancen los umbrales configurados.
        </Text>

        {hasAnyControl ? (
          <Stack gap="sm">
            {!!activo.control_por_horometro && (
              <div className={`p-4 rounded-2xl border transition-all duration-300 ${
                horasEnabled 
                  ? 'bg-zinc-900/60 border-indigo-500/20 shadow-md shadow-indigo-950/5' 
                  : 'bg-zinc-950/20 border-zinc-800/60 opacity-80'
              }`}>
                <Group justify="space-between" align="center" wrap="nowrap">
                  <Group gap="md" wrap="nowrap">
                    <div className={`p-2.5 rounded-xl border transition-colors ${
                      horasEnabled 
                        ? 'bg-amber-500/10 border-amber-500/25 text-amber-400' 
                        : 'bg-zinc-900/50 border-zinc-800 text-zinc-400'
                    }`}>
                      <ClockIcon className="w-5 h-5" />
                    </div>
                    <Stack gap={2}>
                      <Text size="sm" fw={700} c="white">
                        Horómetro
                      </Text>
                      <Text size="11px" c="zinc.5">
                        Alerta basada en horas de motor acumuladas.
                      </Text>
                    </Stack>
                  </Group>
                  <Switch 
                    checked={horasEnabled} 
                    onChange={(e) => setHorasEnabled(e.currentTarget.checked)}
                    color="indigo"
                    size="sm"
                    styles={{ track: { cursor: 'pointer' } }}
                  />
                </Group>

                {horasEnabled && (
                  <Group mt="md" gap="xs" align="center" className="pt-3 border-t border-zinc-800/50 animate-fade-in">
                    <Text size="xs" c="zinc.4" className="flex-1">
                      Frecuencia de alerta cada:
                    </Text>
                    <NumberInput
                      placeholder="Ej. 100"
                      value={horas}
                      onChange={(val) => setHoras(val === "" ? "" : Number(val))}
                      suffix=" h."
                      hideControls
                      size="xs"
                      radius="md"
                      classNames={fieldClasses}
                      className="w-32 font-bold"
                    />
                  </Group>
                )}
              </div>
            )}

            {!!activo.control_por_odometro && (
              <div className={`p-4 rounded-2xl border transition-all duration-300 ${
                kmsEnabled 
                  ? 'bg-zinc-900/60 border-indigo-500/20 shadow-md shadow-indigo-950/5' 
                  : 'bg-zinc-950/20 border-zinc-800/60 opacity-80'
              }`}>
                <Group justify="space-between" align="center" wrap="nowrap">
                  <Group gap="md" wrap="nowrap">
                    <div className={`p-2.5 rounded-xl border transition-colors ${
                      kmsEnabled 
                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' 
                        : 'bg-zinc-900/50 border-zinc-800 text-zinc-400'
                    }`}>
                      <ArrowTrendingUpIcon className="w-5 h-5" />
                    </div>
                    <Stack gap={2}>
                      <Text size="sm" fw={700} c="white">
                        Odómetro
                      </Text>
                      <Text size="11px" c="zinc.5">
                        Alerta basada en kilometraje acumulado.
                      </Text>
                    </Stack>
                  </Group>
                  <Switch 
                    checked={kmsEnabled} 
                    onChange={(e) => setKmsEnabled(e.currentTarget.checked)}
                    color="indigo"
                    size="sm"
                    styles={{ track: { cursor: 'pointer' } }}
                  />
                </Group>

                {kmsEnabled && (
                  <Group mt="md" gap="xs" align="center" className="pt-3 border-t border-zinc-800/50 animate-fade-in">
                    <Text size="xs" c="zinc.4" className="flex-1">
                      Frecuencia de alerta cada:
                    </Text>
                    <NumberInput
                      placeholder="Ej. 5000"
                      value={kms}
                      onChange={(val) => setKms(val === "" ? "" : Number(val))}
                      suffix=" km"
                      hideControls
                      size="xs"
                      radius="md"
                      classNames={fieldClasses}
                      className="w-32 font-bold"
                    />
                  </Group>
                )}
              </div>
            )}

            {!!activo.control_por_vueltas && (
              <div className={`p-4 rounded-2xl border transition-all duration-300 ${
                vueltasEnabled 
                  ? 'bg-zinc-900/60 border-indigo-500/20 shadow-md shadow-indigo-950/5' 
                  : 'bg-zinc-950/20 border-zinc-800/60 opacity-80'
              }`}>
                <Group justify="space-between" align="center" wrap="nowrap">
                  <Group gap="md" wrap="nowrap">
                    <div className={`p-2.5 rounded-xl border transition-colors ${
                      vueltasEnabled 
                        ? 'bg-violet-500/10 border-violet-500/25 text-violet-400' 
                        : 'bg-zinc-900/50 border-zinc-800 text-zinc-400'
                    }`}>
                      <ArrowPathIcon className="w-5 h-5" />
                    </div>
                    <Stack gap={2}>
                      <Text size="sm" fw={700} c="white">
                        Vueltas
                      </Text>
                      <Text size="11px" c="zinc.5">
                        Alerta basada en cantidad de ciclos o vueltas.
                      </Text>
                    </Stack>
                  </Group>
                  <Switch 
                    checked={vueltasEnabled} 
                    onChange={(e) => setVueltasEnabled(e.currentTarget.checked)}
                    color="indigo"
                    size="sm"
                    styles={{ track: { cursor: 'pointer' } }}
                  />
                </Group>

                {vueltasEnabled && (
                  <Group mt="md" gap="xs" align="center" className="pt-3 border-t border-zinc-800/50 animate-fade-in">
                    <Text size="xs" c="zinc.4" className="flex-1">
                      Frecuencia de alerta cada:
                    </Text>
                    <NumberInput
                      placeholder="Ej. 50"
                      value={vueltas}
                      onChange={(val) => setVueltas(val === "" ? "" : Number(val))}
                      suffix=" vueltas"
                      hideControls
                      size="xs"
                      radius="md"
                      classNames={fieldClasses}
                      className="w-32 font-bold"
                    />
                  </Group>
                )}
              </div>
            )}
          </Stack>
        ) : (
          <Text size="sm" c="zinc.5" fs="italic" ta="center" className="py-4">
            Este activo no tiene controles de uso habilitados en su categoría.
          </Text>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" color="zinc.5" onClick={close} disabled={saving} size="xs" radius="lg">
            Cancelar
          </Button>
          <Button
            color="indigo.6"
            onClick={handleSubmit}
            loading={saving}
            size="xs"
            radius="lg"
            leftSection={<BellIcon className="w-4 h-4" />}
          >
            Guardar Configuración
          </Button>
        </Group>
      </Stack>
    </ModalEstandar>
  );
};
