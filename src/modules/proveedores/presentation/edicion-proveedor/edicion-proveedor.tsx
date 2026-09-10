import { IconDeviceFloppy, IconExclamationCircle } from "@tabler/icons-react";
import { Alert, Button, Grid, Select, Switch, TextInput } from "@mantine/core";
import { useEdicionProveedor } from "../../hooks/useEdicionProveedor";
import { TipoEntidad } from "../../../../shared/enums/_generic/tipo-entidad";
import type { ProveedorResponse } from "../../service/proveedores.responses";

interface Props {
  proveedor: ProveedorResponse;
  /**
   * En modo carbon NO se muestran los switches de mantenimiento/transporte:
   * los tipos de carbon y lugares de extraccion tienen su propio boton en el
   * listado. Los valores actuales igual viajan en el payload (ver el hook).
   */
  modoCarbon: boolean;
  onCancel: () => void;
  onSuccess: (p: ProveedorResponse) => void;
}

const fieldClasses = {
  input:
    "bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-300 transition-all",
  label: "text-zinc-400 font-medium text-xs",
};

export const EdicionProveedor = ({
  proveedor,
  modoCarbon,
  onCancel,
  onSuccess,
}: Props) => {
  const { payload, handleChange, handleSelectChange, submit, loading, error } =
    useEdicionProveedor(proveedor, onSuccess);

  const esNatural = payload.tipo_entidad === TipoEntidad.Natural;

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {error && (
        <Alert
          icon={<IconExclamationCircle size={16} />}
          color="red"
          variant="filled"
          className="mb-2"
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
            value={payload.tipo_entidad}
            onChange={handleSelectChange}
            disabled={loading}
            classNames={fieldClasses}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            withAsterisk
            label="RUC"
            placeholder={
              esNatural
                ? "10xxxxxxxxx (persona natural)"
                : "20xxxxxxxxx (persona jurídica)"
            }
            radius="xl"
            maxLength={11}
            value={payload.ruc || ""}
            onChange={(e) =>
              handleChange("ruc", e.currentTarget.value.replace(/\D/g, ""))
            }
            disabled={loading}
            classNames={fieldClasses}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            label="DNI (opc)"
            placeholder="12345678"
            radius="xl"
            maxLength={8}
            value={payload.dni || ""}
            onChange={(e) =>
              handleChange("dni", e.currentTarget.value.replace(/\D/g, ""))
            }
            disabled={loading}
            classNames={fieldClasses}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            label={esNatural ? "Nombre Completo" : "Razón Social"}
            placeholder={
              esNatural ? "Ej. Juan Perez" : "Ej. Comercializadora XYZ S.A.C."
            }
            radius="xl"
            withAsterisk
            value={payload.razon_social || ""}
            onChange={(e) =>
              handleChange("razon_social", e.currentTarget.value)
            }
            disabled={loading}
            classNames={fieldClasses}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12 }}>
          <TextInput
            label="Dirección Principal (opc)"
            placeholder="Ej. Av. Principal 123, Ciudad"
            radius="xl"
            value={payload.direccion || ""}
            onChange={(e) => handleChange("direccion", e.currentTarget.value)}
            disabled={loading}
            classNames={fieldClasses}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            label="Teléfono (opc)"
            placeholder="Ej. 987654321"
            radius="xl"
            value={payload.telefono || ""}
            onChange={(e) =>
              handleChange("telefono", e.currentTarget.value.replace(/\D/g, ""))
            }
            disabled={loading}
            classNames={fieldClasses}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            label="Correo Electrónico (opc)"
            placeholder="Ej. contacto@empresa.com"
            radius="xl"
            value={payload.correo || ""}
            onChange={(e) => handleChange("correo", e.currentTarget.value)}
            disabled={loading}
            classNames={fieldClasses}
          />
        </Grid.Col>

        {!modoCarbon && (
          <>
            <Grid.Col span={{ base: 12 }}>
              <div className="p-3 bg-zinc-900/30 border border-zinc-800 rounded-xl flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-zinc-300 font-medium text-sm">
                    ¿Es para mantenimiento?
                  </span>
                  <span className="text-zinc-500 text-xs">
                    Si se confirma, este proveedor se listará en el módulo de
                    mantenimiento.
                  </span>
                </div>
                <Switch
                  checked={payload.para_mantenimiento}
                  onChange={(e) =>
                    handleChange("para_mantenimiento", e.currentTarget.checked)
                  }
                  disabled={loading}
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
                  <span className="text-zinc-500 text-xs">
                    Si se confirma, este proveedor se listará en las opciones de
                    despacho/entrega.
                  </span>
                </div>
                <Switch
                  checked={payload.para_transporte}
                  onChange={(e) =>
                    handleChange("para_transporte", e.currentTarget.checked)
                  }
                  disabled={loading}
                  color="indigo"
                  size="md"
                  className="cursor-pointer"
                />
              </div>
            </Grid.Col>
          </>
        )}
      </Grid>

      <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-zinc-800">
        <Button
          variant="subtle"
          color="gray"
          radius="xl"
          onClick={onCancel}
          disabled={loading}
          classNames={{ root: "text-zinc-400 hover:bg-zinc-800" }}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          loading={loading}
          radius="xl"
          leftSection={<IconDeviceFloppy size={18} />}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20"
        >
          Guardar cambios
        </Button>
      </div>
    </form>
  );
};
