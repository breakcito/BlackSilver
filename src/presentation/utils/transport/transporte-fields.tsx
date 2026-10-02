/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import {
  Select,
  NumberInput,
  ActionIcon,
  Loader,
  Divider,
} from "@mantine/core";
import { ModalEstandar } from "../modal-estandar";
import { PlusIcon } from "@heroicons/react/24/outline";
import { MedioEntrega } from "../../../shared/enums/_generic/medio-entrega";
import { AuxService } from "../../../service/auxiliar.service";
import { CompositeInput } from "../composite-input";
import { FormAgencia } from "../form-agencia";
import { FormProveedor } from "../form-proveedor";

export interface TransporteData {
  medio_entrega: MedioEntrega | null;
  id_proveedor_transporte: string | null;
  id_agencia_transporte: string | null;
  id_empleado_recibe: string | null;
  numero_factura: string;
  serie_factura: string;
  serie_guia_transportista: string;
  numero_guia_transportista: string;
  serie_guia_remitente: string;
  numero_guia_remitente: string;
  costo_envio: string;
}

interface Props {
  data: TransporteData;
  onChange: (field: keyof TransporteData, value: any) => void;
  personal: { value: string; label: string }[];
  loadingPersonal?: boolean;
}

const fieldClasses = {
  input:
    "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
  label: "text-zinc-300 font-medium mb-1 text-xs",
};

export const TransporteFields = ({
  data,
  onChange,
  personal,
  loadingPersonal = false,
}: Props) => {
  const [proveedores, setProveedores] = useState<
    { value: string; label: string }[]
  >([]);
  const [loadingProvs, setLoadingProvs] = useState(false);
  const [agencias, setAgencias] = useState<{ value: string; label: string }[]>(
    [],
  );
  const [loadingAgencias, setLoadingAgencias] = useState(false);

  // Modales para registrar nueva agencia y proveedor
  const [newAgenciaModal, setNewAgenciaModal] = useState(false);
  const [newProveedorModal, setNewProveedorModal] = useState(false);

  // Seleccionar por defecto MedioEntrega.Propio si no hay ninguno seleccionado
  useEffect(() => {
    if (!data.medio_entrega) {
      onChange("medio_entrega", MedioEntrega.Propio);
    }
  }, [data.medio_entrega, onChange]);

  // Cargar proveedores de transporte
  const cargarProveedores = () => {
    setLoadingProvs(true);
    AuxService.get_proveedores({ para_transporte: true })
      .then((res) => {
        if (res.success && res.data) {
          setProveedores(
            res.data.map((p) => ({
              value: String(p.id_proveedor),
              label: p.razon_social,
            })),
          );
        }
      })
      .catch((e) => console.error("Error al cargar transportistas", e))
      .finally(() => setLoadingProvs(false));
  };

  useEffect(() => {
    if (data.medio_entrega === MedioEntrega.Terceros) {
      Promise.resolve().then(() => cargarProveedores());
    }
  }, [data.medio_entrega]);

  // Cargar agencias de transporte
  const cargarAgencias = () => {
    setLoadingAgencias(true);
    AuxService.get_agencias_transporte()
      .then((res) => {
        if (res.success && res.data) {
          setAgencias(
            res.data.map((a) => ({
              value: String(a.id_agencia),
              label: a.razon_social,
            })),
          );
        }
      })
      .catch((e) => console.error("Error al cargar agencias", e))
      .finally(() => setLoadingAgencias(false));
  };

  useEffect(() => {
    if (data.medio_entrega === MedioEntrega.Agencia) {
      Promise.resolve().then(() => cargarAgencias());
    }
  }, [data.medio_entrega]);

  return (
    <div className="w-full">
      <Divider
        my="md"
        label="Detalles de Transporte y Envío"
        labelPosition="center"
        color="zinc.8"
      />
      <div className="flex flex-col gap-4 w-full">
        {/* FILA 1 */}
        <div className="flex flex-row flex-wrap gap-4 items-end w-full">
          {/* Medio de Entrega */}
          <div className="w-[200px] flex-none">
            <Select
              label="Medio de Entrega"
              placeholder="Seleccione medio"
              data={Object.values(MedioEntrega)}
              value={data.medio_entrega}
              onChange={(val) => {
                onChange("medio_entrega", val as MedioEntrega);
                // Resetear campos dependientes
                onChange("id_proveedor_transporte", null);
                onChange("id_agencia_transporte", null);
                onChange("id_empleado_recibe", null);
                onChange("numero_factura", "");
                onChange("serie_factura", "");
                onChange("serie_guia_transportista", "");
                onChange("numero_guia_transportista", "");
                onChange("serie_guia_remitente", "");
                onChange("numero_guia_remitente", "");
                onChange("costo_envio", "");
              }}
              required
              withAsterisk
              size="xs"
              radius="lg"
              classNames={fieldClasses}
            />
          </div>

          {/* Terceros: Proveedor de Transporte */}
          {data.medio_entrega === MedioEntrega.Terceros && (
            <div className="flex-1 min-w-[250px] flex gap-2 items-end">
              <div className="flex-1">
                <Select
                  label="Proveedor de Transporte"
                  placeholder="Seleccione transportista"
                  data={proveedores}
                  value={data.id_proveedor_transporte}
                  onChange={(val) => onChange("id_proveedor_transporte", val)}
                  required
                  withAsterisk
                  size="xs"
                  radius="lg"
                  disabled={loadingProvs}
                  rightSection={
                    loadingProvs ? (
                      <Loader size="xs" color="indigo" />
                    ) : undefined
                  }
                  classNames={fieldClasses}
                />
              </div>
              <ActionIcon
                color="indigo"
                variant="filled"
                radius="lg"
                size="lg"
                onClick={() => setNewProveedorModal(true)}
                className="mb-px"
              >
                <PlusIcon className="w-5 h-5" />
              </ActionIcon>
            </div>
          )}

          {/* Agencia: Agencia de Transporte */}
          {data.medio_entrega === MedioEntrega.Agencia && (
            <div className="flex-1 min-w-[250px] flex gap-2 items-end">
              <div className="flex-1">
                <Select
                  label="Agencia de Transporte"
                  placeholder="Seleccione agencia"
                  data={agencias}
                  value={data.id_agencia_transporte}
                  onChange={(val) => onChange("id_agencia_transporte", val)}
                  required
                  withAsterisk
                  size="xs"
                  radius="lg"
                  disabled={loadingAgencias}
                  rightSection={
                    loadingAgencias ? (
                      <Loader size="xs" color="indigo" />
                    ) : undefined
                  }
                  classNames={fieldClasses}
                />
              </div>
              <ActionIcon
                color="indigo"
                variant="filled"
                radius="lg"
                size="lg"
                onClick={() => setNewAgenciaModal(true)}
                className="mb-px"
              >
                <PlusIcon className="w-5 h-5" />
              </ActionIcon>
            </div>
          )}

          {/* Agencia: Costo de Envío */}
          {data.medio_entrega === MedioEntrega.Agencia && (
            <div className="w-[200px] flex-none">
              <NumberInput
                label="Costo de Envío (S/.) opc."
                placeholder="0.00"
                min={0}
                decimalScale={2}
                value={data.costo_envio}
                onChange={(val) => onChange("costo_envio", String(val))}
                size="xs"
                radius="lg"
                classNames={fieldClasses}
              />
            </div>
          )}

          {/* Propio: Chofer / Encargado */}
          {data.medio_entrega === MedioEntrega.Propio && (
            <div className="flex-1 min-w-[250px]">
              <Select
                label="Chofer / Encargado"
                placeholder="Seleccione conductor"
                data={personal}
                value={data.id_empleado_recibe}
                onChange={(val) => onChange("id_empleado_recibe", val)}
                required
                withAsterisk
                size="xs"
                radius="lg"
                disabled={loadingPersonal}
                rightSection={
                  loadingPersonal ? (
                    <Loader size="xs" color="indigo" />
                  ) : undefined
                }
                classNames={fieldClasses}
              />
            </div>
          )}

          {/* Propio: Guía Remitente */}
          {data.medio_entrega === MedioEntrega.Propio && (
            <div className="w-[200px] flex-none">
              <CompositeInput
                label="Guía Remitente"
                required
                serieValue={data.serie_guia_remitente}
                numeroValue={data.numero_guia_remitente}
                onChangeSerie={(val) => onChange("serie_guia_remitente", val)}
                onChangeNumero={(val) => onChange("numero_guia_remitente", val)}
                seriePlaceholder="T001"
                numeroPlaceholder="000456"
              />
            </div>
          )}
        </div>

        {/* FILA 2 (Solo Terceros y Agencia) */}
        {data.medio_entrega === MedioEntrega.Terceros && (
          <div className="flex flex-row flex-wrap gap-4 items-end w-full">
            <div className="w-[200px] flex-none">
              <CompositeInput
                label="Factura"
                required
                serieValue={data.serie_factura}
                numeroValue={data.numero_factura}
                onChangeSerie={(val) => onChange("serie_factura", val)}
                onChangeNumero={(val) => onChange("numero_factura", val)}
                seriePlaceholder="F001"
                numeroPlaceholder="000123"
              />
            </div>
            <div className="w-[200px] flex-none">
              <CompositeInput
                label="Guía Remitente"
                required
                serieValue={data.serie_guia_remitente}
                numeroValue={data.numero_guia_remitente}
                onChangeSerie={(val) => onChange("serie_guia_remitente", val)}
                onChangeNumero={(val) => onChange("numero_guia_remitente", val)}
                seriePlaceholder="T001"
                numeroPlaceholder="000456"
              />
            </div>
            <div className="w-[200px] flex-none">
              <CompositeInput
                label="Guía Transportista"
                required
                serieValue={data.serie_guia_transportista}
                numeroValue={data.numero_guia_transportista}
                onChangeSerie={(val) =>
                  onChange("serie_guia_transportista", val)
                }
                onChangeNumero={(val) =>
                  onChange("numero_guia_transportista", val)
                }
                seriePlaceholder="EG01"
                numeroPlaceholder="000789"
              />
            </div>
            <div className="w-[200px] flex-none">
              <NumberInput
                label="Costo de Envío (S/.)"
                placeholder="0.00"
                min={0}
                decimalScale={2}
                value={data.costo_envio}
                onChange={(val) => onChange("costo_envio", String(val))}
                required
                withAsterisk
                size="xs"
                radius="lg"
                classNames={fieldClasses}
              />
            </div>
          </div>
        )}

        {data.medio_entrega === MedioEntrega.Agencia && (
          <div className="flex flex-row flex-wrap gap-4 items-end w-full">
            <div className="w-[200px] flex-none">
              <CompositeInput
                label="Comprobante"
                required
                serieValue={data.serie_factura}
                numeroValue={data.numero_factura}
                onChangeSerie={(val) => onChange("serie_factura", val)}
                onChangeNumero={(val) => onChange("numero_factura", val)}
                seriePlaceholder="F001"
                numeroPlaceholder="000123"
              />
            </div>
            <div className="w-[200px] flex-none">
              <CompositeInput
                label="Guía Transportista"
                required
                serieValue={data.serie_guia_transportista}
                numeroValue={data.numero_guia_transportista}
                onChangeSerie={(val) =>
                  onChange("serie_guia_transportista", val)
                }
                onChangeNumero={(val) =>
                  onChange("numero_guia_transportista", val)
                }
                seriePlaceholder="EG01"
                numeroPlaceholder="000789"
              />
            </div>
          </div>
        )}
      </div>

      {/* MODAL NUEVA AGENCIA */}
      <ModalEstandar
        opened={newAgenciaModal}
        close={() => setNewAgenciaModal(false)}
        title="Nueva Agencia"
        size="sm"
        validateClose
      >
        <FormAgencia
          onSuccess={(agencia) => {
            setNewAgenciaModal(false);
            cargarAgencias();
            onChange("id_agencia_transporte", String(agencia.id_agencia));
          }}
          onCancel={() => setNewAgenciaModal(false)}
        />
      </ModalEstandar>

      {/* MODAL NUEVO PROVEEDOR */}
      <ModalEstandar
        opened={newProveedorModal}
        close={() => setNewProveedorModal(false)}
        title="Nuevo Proveedor de Transporte"
        validateClose
        size="md"
      >
        <FormProveedor
          paraTransporteDefault={true}
          onSuccess={(prov) => {
            setNewProveedorModal(false);
            cargarProveedores();
            onChange("id_proveedor_transporte", String(prov.id_proveedor));
          }}
          onCancel={() => setNewProveedorModal(false)}
        />
      </ModalEstandar>
    </div>
  );
};
