import { useState } from "react";
import { TextInput, Button, Select, Switch, Grid, Alert } from "@mantine/core";
import { IconDeviceFloppy, IconExclamationCircle } from "@tabler/icons-react";
import { TipoEntidad } from "../../shared/enums/_generic/tipo-entidad";
import { AuxService } from "../../service/auxiliar.service";
import type { RES_Proveedor } from "../../service/responses/proveedor";
import { useNotify } from "../../hooks/useNotify";

export interface FormProveedorProps {
  onSuccess: (proveedor: RES_Proveedor) => void;
  onCancel?: () => void;
  paraTransporteDefault?: boolean;
}

export const FormProveedor = ({
  onSuccess,
  onCancel,
  paraTransporteDefault = false,
}: FormProveedorProps) => {
  const { notifySuccess, notifyError } = useNotify();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tipoEntidad, setTipoEntidad] = useState<TipoEntidad>(TipoEntidad.Juridica);
  const [dni, setDni] = useState("");
  const [ruc, setRuc] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [paraMantenimiento, setParaMantenimiento] = useState(false);
  const [paraTransporte, setParaTransporte] = useState(paraTransporteDefault);

  const handleTipoEntidadChange = (val: string | null) => {
    if (val) {
      setTipoEntidad(val as TipoEntidad);
      setDni("");
      setRuc("");
      setError(null);
    }
  };

  const validate = () => {
    if (!razonSocial.trim()) {
      return "La razón social o nombre es requerido";
    }
    if (razonSocial.trim().length < 3) {
      return "La razón social o nombre es muy corto";
    }
    if (tipoEntidad === TipoEntidad.Natural) {
      if (!dni || !/^\d{8}$/.test(dni)) {
        return "El DNI debe tener exactamente 8 dígitos";
      }
    } else {
      if (!ruc || !/^(10|20)\d{9}$/.test(ruc)) {
        return "El RUC debe tener 11 dígitos y comenzar con 10 o 20";
      }
    }
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      return "Correo no válido";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const res = await AuxService.crear_proveedor({
        tipo_entidad: tipoEntidad,
        razon_social: razonSocial.trim(),
        para_mantenimiento: paraMantenimiento,
        para_transporte: paraTransporte,
        dni: tipoEntidad === TipoEntidad.Natural ? dni : undefined,
        ruc: tipoEntidad === TipoEntidad.Juridica ? ruc : undefined,
        direccion: direccion.trim() || undefined,
        telefono: telefono.trim() || undefined,
        correo: correo.trim() || undefined,
      });

      if (res.success && res.data) {
        notifySuccess("Proveedor registrado correctamente");
        onSuccess(res.data);
      } else {
        setError(res.message || "Error al registrar proveedor");
        notifyError(res.message || "Error al registrar proveedor");
      }
    } catch (err) {
      console.error(err);
      setError("Error al registrar proveedor");
      notifyError("Error al registrar proveedor");
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = {
    input: "bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-300 transition-all",
    label: "text-zinc-400 font-medium text-xs mb-1",
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
            searchable
            withAsterisk
            radius="xl"
            data={Object.values(TipoEntidad)}
            value={tipoEntidad}
            onChange={handleTipoEntidadChange}
            classNames={inputClasses}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            withAsterisk
            label={tipoEntidad === TipoEntidad.Natural ? "DNI" : "RUC"}
            placeholder={
              tipoEntidad === TipoEntidad.Natural ? "12345678" : "20345678901"
            }
            radius="xl"
            maxLength={tipoEntidad === TipoEntidad.Natural ? 8 : 11}
            value={tipoEntidad === TipoEntidad.Natural ? dni : ruc}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              if (tipoEntidad === TipoEntidad.Natural) {
                setDni(val);
              } else {
                setRuc(val);
              }
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
                : "Razón Social"
            }
            placeholder={
              tipoEntidad === TipoEntidad.Natural
                ? "Ej. Juan Perez"
                : "Ej. Comercializadora XYZ S.A.C."
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
            label="Dirección Principal (opc)"
            placeholder="Ej. Av. Principal 123, Ciudad"
            radius="xl"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            classNames={inputClasses}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            label="Teléfono (opc)"
            placeholder="Ej. 987654321"
            radius="xl"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ""))}
            classNames={inputClasses}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            label="Correo Electrónico (opc)"
            placeholder="Ej. contacto@empresa.com"
            radius="xl"
            value={correo}
            onChange={(e) => {
              setCorreo(e.target.value);
              if (error) setError(null);
            }}
            classNames={inputClasses}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12 }}>
          <div className="p-3 bg-zinc-900/30 border border-zinc-800 rounded-xl flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-zinc-300 font-medium text-sm">
                ¿Es para mantenimiento?
              </span>
              <span className="text-zinc-400 text-xs">
                Si se confirma, este proveedor se listará en el módulo de
                mantenimiento.
              </span>
            </div>
            <Switch
              checked={paraMantenimiento}
              onChange={(e) => setParaMantenimiento(e.currentTarget.checked)}
              color="indigo"
              size="md"
              className="cursor-pointer"
            />
          </div>
        </Grid.Col>
        <Grid.Col span={{ base: 12 }}>
          <div className="p-3 bg-zinc-900/30 border border-zinc-800 rounded-xl flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-zinc-300 font-medium text-sm">
                ¿Es para transporte?
              </span>
              <span className="text-zinc-400 text-xs">
                Si se confirma, este proveedor se listará en el módulo de
                transporte.
              </span>
            </div>
            <Switch
              checked={paraTransporte}
              onChange={(e) => setParaTransporte(e.currentTarget.checked)}
              color="indigo"
              size="md"
              className="cursor-pointer"
            />
          </div>
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
          Guardar Proveedor
        </Button>
      </div>
    </form>
  );
};
