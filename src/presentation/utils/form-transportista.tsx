import { useState } from "react";
import {
  Alert,
  Button,
  Grid,
  Select,
  Text,
  TextInput,
} from "@mantine/core";
import { IconDeviceFloppy, IconExclamationCircle } from "@tabler/icons-react";
import { TipoEntidad } from "../../shared/enums/_generic/tipo-entidad";
import { AuxService } from "../../service/auxiliar.service";
import type { RES_Transportista } from "../../service/responses/transportista";
import { useNotify } from "../../hooks/useNotify";

export interface FormTransportistaProps {
  onSuccess: (nuevo: RES_Transportista) => void;
  onCancel?: () => void;
}

const inputClasses = {
  input:
    "bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 transition-all",
  label: "text-zinc-300 mb-1 font-medium text-xs",
};

export const FormTransportista = ({
  onSuccess,
  onCancel,
}: FormTransportistaProps) => {
  const { notifySuccess, notifyError } = useNotify();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tipoEntidad, setTipoEntidad] = useState<TipoEntidad>(
    TipoEntidad.Juridica,
  );
  const [razonSocial, setRazonSocial] = useState("");
  const [ruc, setRuc] = useState("");
  const [dni, setDni] = useState("");
  const [telefono, setTelefono] = useState("");

  const handleTipoEntidadChange = (val: string | null) => {
    if (val) {
      setTipoEntidad(val as TipoEntidad);
      setError(null);
    }
  };

  const validate = (): string | null => {
    if (!razonSocial.trim() || razonSocial.trim().length < 3) {
      return "Razon social o nombre es requerido (min 3 caracteres)";
    }
    if (!ruc || !/^\d{11}$/.test(ruc)) {
      return "El RUC debe tener exactamente 11 digitos";
    }
    if (tipoEntidad === TipoEntidad.Juridica && !ruc.startsWith("20")) {
      return "El RUC de una persona jurídica debe comenzar con 20";
    }
    if (tipoEntidad === TipoEntidad.Natural && !ruc.startsWith("10")) {
      return "El RUC de una persona natural debe comenzar con 10";
    }
    if (dni && !/^\d{8}$/.test(dni)) {
      return "El DNI debe tener exactamente 8 digitos";
    }
    if (telefono && !/^\d{6,15}$/.test(telefono)) {
      return "Telefono invalido (solo digitos, 6-15 caracteres)";
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
      const res = await AuxService.crear_transportista({
        tipo_entidad: tipoEntidad,
        razon_social: razonSocial.trim(),
        ruc: ruc.trim() || null,
        dni: dni.trim() || null,
        telefono: telefono.trim() || null,
      });

      if (res.success && res.data) {
        notifySuccess("Transportista registrado correctamente");
        onSuccess(res.data);
      } else {
        const msg = res.message || "No se pudo registrar el transportista";
        setError(msg);
        notifyError(msg);
      }
    } catch (err) {
      console.error(err);
      const msg = "Error al registrar el transportista";
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
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Select
            label="Tipo de Entidad"
            placeholder="Seleccione"
            withAsterisk
            radius="xl"
            data={Object.values(TipoEntidad)}
            value={tipoEntidad}
            onChange={handleTipoEntidadChange}
            classNames={inputClasses}
            allowDeselect={false}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            withAsterisk
            label="RUC"
            placeholder={
              tipoEntidad === TipoEntidad.Natural
                ? "10xxxxxxxxx (persona natural)"
                : "20xxxxxxxxx (persona jurídica)"
            }
            radius="xl"
            maxLength={11}
            value={ruc}
            onChange={(e) => {
              setRuc(e.target.value.replace(/\D/g, ""));
              if (error) setError(null);
            }}
            classNames={inputClasses}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            label="DNI (opcional)"
            placeholder="12345678"
            radius="xl"
            maxLength={8}
            value={dni}
            onChange={(e) => {
              setDni(e.target.value.replace(/\D/g, ""));
              if (error) setError(null);
            }}
            classNames={inputClasses}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12 }}>
          <TextInput
            label={
              tipoEntidad === TipoEntidad.Natural
                ? "Nombre Completo"
                : "Razon Social"
            }
            placeholder={
              tipoEntidad === TipoEntidad.Natural
                ? "Ej. Juan Perez"
                : "Ej. Transportes XYZ S.A.C."
            }
            radius="xl"
            withAsterisk
            value={razonSocial}
            onChange={(e) => {
              setRazonSocial(e.target.value);
              if (error) setError(null);
            }}
            classNames={inputClasses}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12 }}>
          <TextInput
            label="Telefono (opcional)"
            placeholder="Ej. 987654321"
            radius="xl"
            value={telefono}
            onChange={(e) => {
              setTelefono(e.target.value.replace(/\D/g, ""));
              if (error) setError(null);
            }}
            classNames={inputClasses}
          />
        </Grid.Col>
      </Grid>

      <Text size="xs" c="dimmed">
        El transportista quedara disponible inmediatamente para asociarlo a un
        item de la compra.
      </Text>

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
          Guardar Transportista
        </Button>
      </div>
    </form>
  );
};
