import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Group,
  NumberInput,
  Stack,
  Text,
} from "@mantine/core";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import { ActivosService } from "../../service/activos.service";
import { useNotify } from "../../../../hooks/useNotify";
import type { RES_ActivoFijoResumen } from "../../service/activos.responses";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import type { REQ_AjustarTotalesActivo } from "../../service/activos.requests";

export type TipoAjuste = "horometro" | "odometro" | "vueltas";

interface Props {
  opened: boolean;
  close: () => void;
  activo: RES_ActivoFijoResumen;
  tipo: TipoAjuste;
  onSuccess: (actualizado: RES_ActivoFijoResumen) => void;
}

const TITULO_POR_TIPO: Record<TipoAjuste, string> = {
  horometro: "Ajustar Total de Horas",
  odometro: "Ajustar Total de Kilómetros",
  vueltas: "Ajustar Total de Vueltas",
};

const LABEL_POR_TIPO: Record<TipoAjuste, string> = {
  horometro: "Total Horas",
  odometro: "Total Kilómetros",
  vueltas: "Total Vueltas",
};

const UNIT_POR_TIPO: Record<TipoAjuste, string> = {
  horometro: "h.",
  odometro: "km",
  vueltas: "vueltas",
};

const FIELD_KEY_POR_TIPO: Record<
  TipoAjuste,
  "total_horas" | "total_kilometros" | "total_vueltas"
> = {
  horometro: "total_horas",
  odometro: "total_kilometros",
  vueltas: "total_vueltas",
};

export const AjustarTotalesModal = ({
  opened,
  close,
  activo,
  tipo,
  onSuccess,
}: Props) => {
  const { notifySuccess, notifyError } = useNotify();

  const fieldKey = FIELD_KEY_POR_TIPO[tipo];
  const initialValue = Number(activo[fieldKey] ?? 0);

  // Si el valor actual es 0, arrancamos con input VACÍO para evitar
  // el "0 grande" centrado que el usuario reportó (Mantine v8 con
  // decimalScale + hideControls mostraba ese dígito en una posición
  // visual rara). Para los demás casos, pre-cargamos el valor actual.
  const [nuevoValor, setNuevoValor] = useState<number | "">(
    initialValue === 0 ? "" : initialValue,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (opened) {
      const v = Number(activo[fieldKey] ?? 0);
      setNuevoValor(v === 0 ? "" : v);
    }
  }, [opened, activo, fieldKey]);

  const fieldClasses = {
    input:
      "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500",
    label: "text-zinc-300 mb-1 font-medium",
  };

  const numericNuevoValor = typeof nuevoValor === "number" ? nuevoValor : 0;
  const hayCambios = numericNuevoValor !== initialValue;

  const unit = UNIT_POR_TIPO[tipo];
  const descripcionActual =
    initialValue === 0
      ? "Actual: sin lecturas registradas"
      : `Actual: ${formatNumber(initialValue)} ${unit}`;

  const placeholderValor = `Ingresa el nuevo valor (${unit})`;

  const handleSubmit = async () => {
    if (!hayCambios) {
      notifyError("El nuevo valor debe ser distinto al actual.");
      return;
    }

    setSaving(true);
    try {
      const payload: REQ_AjustarTotalesActivo = {
        [fieldKey]: numericNuevoValor,
      };

      const res = await ActivosService.ajustarTotalesActivo(
        activo.id_activo,
        payload,
      );
      if (res.success && res.data) {
        notifySuccess(res.message ?? "Contador ajustado correctamente");
        onSuccess(res.data);
        close();
      } else {
        notifyError(res.message ?? "Error al ajustar el contador");
      }
    } catch (err) {
      console.error(err);
      notifyError("Error de conexión al ajustar el contador");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalEstandar
      opened={opened}
      close={close}
      title={TITULO_POR_TIPO[tipo]}
      size="md"
      validateClose
    >
      <Stack gap="md">
        {/* Contexto del activo */}
        <Group
          wrap="nowrap"
          align="center"
          className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-3"
        >
          <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
            <AdjustmentsHorizontalIcon className="w-4 h-4 text-indigo-400" />
          </div>
          <Stack gap={0} className="flex-1">
            <Text size="xs" c="zinc.4" fw={500}>
              Activo:
            </Text>
            <Text size="sm" fw={700} c="white">
              {activo.correlativo} — {activo.producto}
            </Text>
          </Stack>
          {activo.estado === "Dado de Baja" && (
            <Badge color="red" variant="light" radius="sm">
              Dado de Baja
            </Badge>
          )}
        </Group>

        {/* Un único campo, según el tipo que disparó el lápiz */}
        <NumberInput
          label={LABEL_POR_TIPO[tipo]}
          description={descripcionActual}
          value={nuevoValor}
          onChange={(val) =>
            setNuevoValor(val === "" || val === null ? "" : Number(val))
          }
          min={0}
          decimalScale={2}
          hideControls
          size="xs"
          radius="lg"
          classNames={fieldClasses}
          placeholder={placeholderValor}
        />

        <Group justify="flex-end" mt="md">
          <Button
            variant="subtle"
            color="zinc.5"
            onClick={close}
            disabled={saving}
            size="xs"
            radius="lg"
          >
            Cancelar
          </Button>
          <Button
            color="indigo.6"
            onClick={handleSubmit}
            loading={saving}
            disabled={!hayCambios}
            size="xs"
            radius="lg"
          >
            Guardar Ajuste
          </Button>
        </Group>
      </Stack>
    </ModalEstandar>
  );
};
