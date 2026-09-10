import {
  Button,
  Group,
  TextInput,
  Textarea,
  Stack,
  Select,
  Switch,
  Checkbox,
  Text,
  ScrollArea,
  Popover,
  Tooltip,
} from "@mantine/core";
import { TipoBien } from "../../../shared/enums/_generic/tipo-bien";
import { TipoProducto } from "../../../shared/enums/_generic/tipo-producto";
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import type { RES_CategoriaResumen } from "../service/categorias.responses";
import type { SearchResult } from "../../../shared/functions/get-coincidencias";
import { useDisclosure } from "@mantine/hooks";
import { useMemo } from "react";
import { TagIcon } from "@heroicons/react/24/solid";
import { useAuditoriaStore } from "../../../stores/auditoria.store";

interface RegistroCategoriaProps {
  nombre: string;
  setNombre: (val: string) => void;
  descripcion: string;
  setDescripcion: (val: string) => void;
  tipoProducto: string | null;
  setTipoProducto: (val: string | null) => void;
  clasificacionBien: string | null;
  setClasificacionBien: (val: string | null) => void;
  esConsumible: boolean;
  setEsConsumible: (val: boolean) => void;
  paraCocina: boolean;
  setParaCocina: (val: boolean) => void;
  paraMina: boolean;
  setParaMina: (val: boolean) => void;
  esAuditable: boolean;
  setEsAuditable: (val: boolean) => void;
  paraTransporte: boolean;
  setParaTransporte: (val: boolean) => void;
  controlPorOdometro: boolean;
  setControlPorOdometro: (val: boolean) => void;
  controlPorHorometro: boolean;
  setControlPorHorometro: (val: boolean) => void;
  controlPorVueltas: boolean;
  setControlPorVueltas: (val: boolean) => void;
  coincidencias: SearchResult<RES_CategoriaResumen>[];
  error: string;
  loading: boolean;
  /** Cambia el label del botón cuando el formulario opera en modo edición. */
  isEdit?: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export const RegistroCategoria = ({
  nombre,
  setNombre,
  descripcion,
  setDescripcion,
  tipoProducto,
  setTipoProducto,
  clasificacionBien,
  setClasificacionBien,
  esConsumible,
  setEsConsumible,
  // paraCocina,
  // setParaCocina,
  // paraMina,
  // setParaMina,
  esAuditable,
  setEsAuditable,
  paraTransporte,
  setParaTransporte,
  controlPorOdometro,
  setControlPorOdometro,
  controlPorHorometro,
  setControlPorHorometro,
  controlPorVueltas,
  setControlPorVueltas,
  coincidencias,
  error,
  loading,
  isEdit = false,
  onSave,
  onCancel,
}: RegistroCategoriaProps) => {
  const { en_modo_auditable } = useAuditoriaStore();
  const inputClasses = {
    input: `bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 
    focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500`,
    label: "text-zinc-300 mb-1 font-medium",
  };

  const [focused, setFocused] = useDisclosure(false);

  // Agrupar coincidencias por clasificación
  const groupedCoincidencias = useMemo(() => {
    const groups: Record<string, typeof coincidencias> = {};
    coincidencias.forEach((res) => {
      const cls = res.item.clasificacion_bien || "Sin Clasificación";
      if (!groups[cls]) groups[cls] = [];
      groups[cls].push(res);
    });
    return groups;
  }, [coincidencias]);

  return (
    <Stack gap="md">
      <Popover
        opened={coincidencias.length > 0 && !!focused}
        position="bottom"
        width="target"
        transitionProps={{ transition: "pop", duration: 200 }}
        shadow="xl"
        radius="lg"
        offset={2}
      >
        <Popover.Target>
          <TextInput
            label="Nombre"
            placeholder="Ej. Herramientas, EPP, Consumibles..."
            required
            withAsterisk
            disabled={loading}
            radius="lg"
            classNames={inputClasses}
            value={nombre}
            onChange={(e) => setNombre(e.currentTarget.value)}
            onFocus={() => setFocused.open()}
            onBlur={() => setFocused.close()}
            rightSection={
              nombre.length >= 3 && (
                <Tooltip
                  label={
                    coincidencias.length > 0
                      ? `${coincidencias.length} coincidencias encontradas`
                      : "Nombre disponible"
                  }
                  color={coincidencias.length > 0 ? "orange" : "teal"}
                  withArrow
                  position="top-end"
                >
                  <div className="flex items-center justify-center">
                    {coincidencias.length > 0 ? (
                      <ExclamationTriangleIcon className="w-5 h-5 text-orange-500 animate-pulse" />
                    ) : (
                      <CheckCircleIcon className="w-5 h-5 text-teal-500" />
                    )}
                  </div>
                </Tooltip>
              )
            }
          />
        </Popover.Target>
        <Popover.Dropdown className="bg-zinc-950 border-zinc-800 p-2 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-2.5 py-2 border-b border-zinc-800/60 mb-2">
            <Text
              size="10px"
              fw={800}
              className="text-zinc-500 uppercase tracking-widest"
            >
              Categorías Similares
            </Text>
          </div>

          <ScrollArea.Autosize mah={250} type="scroll" className="px-1">
            {Object.entries(groupedCoincidencias).map(
              ([clasificacion, items]) => (
                <div key={clasificacion} className="mb-4 last:mb-1">
                  <div className="flex items-center gap-2 px-1.5 mb-1.5">
                    <TagIcon className="w-3 h-3 text-indigo-400" />
                    <Text
                      size="10px"
                      fw={700}
                      className="text-zinc-600 uppercase tracking-tight"
                    >
                      {clasificacion}
                    </Text>
                  </div>

                  <Stack gap={3}>
                    {items.map((res) => (
                      <div
                        key={res.item.id_categoria}
                        className="group flex items-center justify-between p-2.5 bg-zinc-900/30 hover:bg-zinc-800/40 border border-zinc-800/30 hover:border-zinc-700/50 rounded-xl transition-all duration-200 cursor-default"
                      >
                        <Text
                          size="xs"
                          fw={600}
                          className="text-zinc-200 group-hover:text-white transition-colors"
                        >
                          {res.item.nombre}
                        </Text>
                      </div>
                    ))}
                  </Stack>
                </div>
              ),
            )}
          </ScrollArea.Autosize>
        </Popover.Dropdown>
      </Popover>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Tipo"
          disabled
          radius="lg"
          classNames={inputClasses}
          data={Object.values(TipoProducto)}
          value={tipoProducto}
          onChange={setTipoProducto}
        />

        <Select
          label="Clasificación"
          placeholder="Seleccione una clasificación..."
          required
          withAsterisk
          disabled={loading}
          radius="lg"
          classNames={inputClasses}
          data={Object.values(TipoBien)}
          value={clasificacionBien}
          onChange={setClasificacionBien}
          comboboxProps={{
            withinPortal: true,
            zIndex: 99999,
            transitionProps: { transition: "pop", duration: 200 },
          }}
        />
      </div>

      <div>
        {clasificacionBien === TipoBien.ActivoFijo && (
          <div className="flex flex-col gap-1 px-1 justify-center">
            <Text
              size="xs"
              fw={600}
              className="text-zinc-500 uppercase tracking-wider mb-1"
            >
              Opciones de Control
            </Text>
            <Group gap="md">
              <Tooltip
                label="Permite registrar datos propios de un vehículo para consultas y gestión de flota."
                position="top"
                withArrow
                multiline
                w={220}
              >
                <Checkbox
                  label="Transporte"
                  checked={paraTransporte}
                  onChange={(e) => setParaTransporte(e.currentTarget.checked)}
                  disabled={loading}
                  color="indigo"
                  size="xs"
                  classNames={{
                    label: "text-zinc-300",
                    input: "cursor-pointer",
                  }}
                />
              </Tooltip>

              <Tooltip
                label="Lleva un control por kilometraje para el módulo de Uso."
                position="top"
                withArrow
                multiline
                w={220}
              >
                <Checkbox
                  label="Odómetro"
                  checked={controlPorOdometro}
                  onChange={(e) =>
                    setControlPorOdometro(e.currentTarget.checked)
                  }
                  disabled={loading}
                  color="indigo"
                  size="xs"
                  classNames={{
                    label: "text-zinc-300",
                    input: "cursor-pointer",
                  }}
                />
              </Tooltip>

              <Tooltip
                label="Lleva un control por horas de trabajo para el módulo de Uso."
                position="top"
                withArrow
                multiline
                w={220}
              >
                <Checkbox
                  label="Horómetro"
                  checked={controlPorHorometro}
                  onChange={(e) =>
                    setControlPorHorometro(e.currentTarget.checked)
                  }
                  disabled={loading}
                  color="indigo"
                  size="xs"
                  classNames={{
                    label: "text-zinc-300",
                    input: "cursor-pointer",
                  }}
                />
              </Tooltip>

              <Tooltip
                label="Lleva un control por número de vueltas para el módulo de Uso."
                position="top"
                withArrow
                multiline
                w={220}
              >
                <Checkbox
                  label="Vueltas"
                  checked={controlPorVueltas}
                  onChange={(e) =>
                    setControlPorVueltas(e.currentTarget.checked)
                  }
                  disabled={loading}
                  color="indigo"
                  size="xs"
                  classNames={{
                    label: "text-zinc-300",
                    input: "cursor-pointer",
                  }}
                />
              </Tooltip>
            </Group>
          </div>
        )}
      </div>



      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Trazabilidad de consumo */}
        <div
          className={`p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-between transition-all duration-200 ${
            en_modo_auditable ? "md:col-span-2" : ""
          }`}
        >
          <div className="flex flex-col gap-1 pr-4">
            <Text size="sm" fw={600} className="text-indigo-200">
              Consumible
            </Text>
            <Text size="xs" className="text-indigo-100/70 leading-snug">
              ¿Abastece a otras?
            </Text>
          </div>
          <Switch
            checked={esConsumible}
            onChange={(e) => setEsConsumible(e.currentTarget.checked)}
            disabled={loading || clasificacionBien !== TipoBien.Suministro}
            color="indigo"
            size="xs"
            className={
              clasificacionBien !== TipoBien.Suministro
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer"
            }
          />
        </div>

        {/* Categoría Auditable */}
        {!en_modo_auditable && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between transition-all duration-200">
            <div className="flex flex-col gap-1 pr-4">
              <Text size="sm" fw={600} className="text-red-200">
                Auditable
              </Text>
              <Text size="xs" className="text-red-100/70 leading-snug">
                Ocultar en auditoría.
              </Text>
            </div>
            <Switch
              checked={esAuditable}
              onChange={(e) => setEsAuditable(e.currentTarget.checked)}
              disabled={loading}
              color="red"
              size="xs"
              className="cursor-pointer"
            />
          </div>
        )}
      </div>

      <Textarea
        label="Descripción (Opcional)"
        placeholder="Detalles adicionales sobre esta categoría..."
        radius="lg"
        minRows={3}
        disabled={loading}
        classNames={inputClasses}
        value={descripcion}
        onChange={(e) => setDescripcion(e.currentTarget.value)}
      />

      {error && (
        <div className="text-red-500 text-sm font-medium px-1">{error}</div>
      )}

      <Group justify="flex-end" gap="md" mt="xl">
        <Button
          variant="subtle"
          onClick={onCancel}
          disabled={loading}
          radius="lg"
          size="sm"
          className="text-zinc-400 hover:text-white 
          hover:bg-zinc-800/50 transition-colors"
        >
          Cancelar
        </Button>
        <Button
          loading={loading}
          onClick={onSave}
          radius="lg"
          size="sm"
          className="bg-linear-to-r from-zinc-100 to-zinc-300 
          text-zinc-900 font-semibold hover:from-white hover:to-zinc-200 
          shadow-lg border-0"
        >
          {isEdit ? "Guardar cambios" : "Guardar"}
        </Button>
      </Group>
    </Stack>
  );
};
