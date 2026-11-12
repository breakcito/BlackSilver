import { useState } from "react";
import {
  Alert,
  Button,
  Grid,
  TextInput,
} from "@mantine/core";
import { IconDeviceFloppy, IconExclamationCircle } from "@tabler/icons-react";
import { useNotify } from "../../hooks/useNotify";
import { VentaMineralService } from "../../modules/venta-mineral/service/venta-mineral.service";
import type { CatalogoMineral } from "../../modules/venta-mineral/service/venta-mineral.responses";

/**
 * Tipo de catalogo que se registra.
 */
export type TipoCatalogoMineral = "molino" | "transportista" | "laboratorio";

export interface FormCatalogoMineralProps {
  tipo: TipoCatalogoMineral;
  onSuccess: (nuevo: CatalogoMineral) => void;
  onCancel?: () => void;
}

const inputClasses = {
  input:
    "bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 transition-all",
  label: "text-zinc-300 mb-1 font-medium text-xs",
};

const ETIQUETAS: Record<TipoCatalogoMineral, { boton: string }> = {
  molino: { boton: "Guardar molino" },
  transportista: { boton: "Guardar transportista" },
  laboratorio: { boton: "Guardar laboratorio" },
};

/**
 * Registro rapido de un catalogo del modulo de venta de mineral.
 *
 * Los tres catalogos (molino, transportista y laboratorio) tienen la misma
 * forma: razon social y RUC. Se registran sin salir del formulario que los
 * usa, y el nuevo registro queda disponible de inmediato en el selector que
 * lo_pidio.
 */
export const FormCatalogoMineral = ({
  tipo,
  onSuccess,
  onCancel,
}: FormCatalogoMineralProps) => {
  const { notifySuccess, notifyError } = useNotify();

  const [razonSocial, setRazonSocial] = useState("");
  const [ruc, setRuc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = (): string | null => {
    if (razonSocial.trim().length < 3) {
      return "La razon social es obligatoria (min 3 caracteres)";
    }

    if (ruc.trim() !== "" && !/^\d{11}$/.test(ruc.trim())) {
      return "El RUC debe tener exactamente 11 digitos";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const ve = validate();
    if (ve) {
      setError(ve);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        razon_social: razonSocial.trim(),
        ruc: ruc.trim() || null,
      };

      const res =
        tipo === "molino"
          ? await VentaMineralService.crearMolino(payload)
          : tipo === "transportista"
            ? await VentaMineralService.crearTransportista(payload)
            : await VentaMineralService.crearLaboratorio(payload);

      if (res.success && res.data) {
        notifySuccess(res.message || "Registro creado correctamente");
        onSuccess(res.data);
      } else {
        const msg = res.message || "No se pudo registrar";
        setError(msg);
        notifyError(msg);
      }
    } catch (err) {
      console.error(err);
      const msg = "Error de conexion al registrar";
      setError(msg);
      notifyError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && (
        <Alert
          icon={<IconExclamationCircle size={16} />}
          color="red"
          variant="filled"
        >
          {error}
        </Alert>
      )}

      <Grid>
        <Grid.Col span={{ base: 12 }}>
          <TextInput
            withAsterisk
            label="Razon social"
            placeholder="Ej. Molino El Inca S.A.C."
            radius="xl"
            value={razonSocial}
            onChange={(e) => {
              setRazonSocial(e.currentTarget.value.toUpperCase());
              if (error) setError(null);
            }}
            classNames={inputClasses}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12 }}>
          <TextInput
            label="RUC (opcional)"
            placeholder="20345678901"
            radius="xl"
            maxLength={11}
            value={ruc}
            onChange={(e) => {
              setRuc(e.currentTarget.value.replace(/\D/g, ""));
              if (error) setError(null);
            }}
            classNames={inputClasses}
          />
        </Grid.Col>
      </Grid>

      <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-zinc-800">
        {onCancel && (
          <Button
            variant="subtle"
            color="gray"
            radius="xl"
            onClick={onCancel}
            classNames={{ root: "text-zinc-400 hover:bg-zinc-800" }}
          >
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          loading={loading}
          radius="xl"
          leftSection={<IconDeviceFloppy size={18} />}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20"
        >
          {ETIQUETAS[tipo].boton}
        </Button>
      </div>
    </form>
  );
};
