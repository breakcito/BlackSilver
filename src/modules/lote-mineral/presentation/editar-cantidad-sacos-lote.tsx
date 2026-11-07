import { useState } from "react";
import { Badge, Button, Group, NumberInput, Stack, Text } from "@mantine/core";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import type { LoteMineralResumen } from "../service/lote-mineral.responses";
import { Schema_ActualizarCantidadSacos } from "../service/lote-mineral.requests";
import { useActualizarCantidadSacosLoteMineral } from "../hooks/useLoteMineral";

interface Props {
  opened: boolean;
  close: () => void;
  lote: LoteMineralResumen | null;
  onSuccess: (lote: LoteMineralResumen) => void;
}

/**
 * Edita la cantidad de sacos de un lote de mineral.
 */
export const EditarCantidadSacosLote = ({
  opened,
  close,
  lote,
  onSuccess,
}: Props) => (
  <ModalEstandar
    opened={opened}
    close={close}
    title="Editar cantidad de sacos"
    size="sm"
    validateClose
    closeConfirmationTitle="¿Cerrar sin guardar?"
    closeConfirmationMessage={
      <>
        La cantidad de sacos no se guardará y el lote quedará con el valor
        actual.
      </>
    }
  >
    {/* El formulario vive dentro del modal: se monta cada vez que se abre y
        arranca con el valor vigente del lote. */}
    <FormularioCantidadSacos lote={lote} close={close} onSuccess={onSuccess} />
  </ModalEstandar>
);

const FormularioCantidadSacos = ({ lote, close, onSuccess }: Omit<Props, "opened">) => {
  const [cantidad, setCantidad] = useState<number | string>(
    lote?.cantidad_sacos ?? 0,
  );
  const [error, setError] = useState("");
  const { mutate: guardar, isPending } = useActualizarCantidadSacosLoteMineral();

  const handleGuardar = async () => {
    if (!lote) return;

    const validation = Schema_ActualizarCantidadSacos.safeParse({
      cantidad_sacos:
        typeof cantidad === "number" ? cantidad : Number(cantidad),
    });

    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    setError("");
    const actualizado = await guardar(lote.id_lote_mineral, validation.data);
    if (actualizado) {
      onSuccess(actualizado);
      close();
    }
  };

  const inputClasses = {
    input:
      "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
    label: "text-zinc-300 mb-1 font-medium text-xs",
    error: "text-red-400 text-[11px] mt-1",
  };

  return (
    <Stack gap="lg">
      <div className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800/80 bg-zinc-900/60 px-4 py-3">
        <Text size="xs" c="zinc.500" fw={600} tt="uppercase">
          Lote
        </Text>
        <Badge color="indigo" variant="light" size="sm" radius="sm">
          {lote?.codigo || "S/C"}
        </Badge>
      </div>

      <NumberInput
        label="Cantidad de sacos"
        placeholder="Ej. 480"
        value={cantidad}
        onChange={(value) => {
          setCantidad(value);
          if (error) setError("");
        }}
        onBlur={() => {
          if (cantidad === "" || cantidad === null) {
            setError("Ingresa la cantidad de sacos");
          }
        }}
        hideControls
        allowDecimal={false}
        clampBehavior="strict"
        error={error || undefined}
        disabled={isPending}
        radius="lg"
        size="xs"
        classNames={inputClasses}
      />

      <Group justify="flex-end" className="pt-2 border-t border-zinc-800/40">
        <Button
          variant="subtle"
          onClick={close}
          disabled={isPending}
          radius="lg"
          size="sm"
          className="text-zinc-500 hover:text-white font-bold"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleGuardar}
          loading={isPending}
          radius="lg"
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-900/20 px-8"
        >
          Guardar sacos
        </Button>
      </Group>
    </Stack>
  );
};
