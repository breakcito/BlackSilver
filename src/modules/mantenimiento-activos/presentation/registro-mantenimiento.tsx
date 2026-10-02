import { useState, useMemo } from "react";
import {
  Button,
  Group,
  Select,
  Text,
  TextInput,
  Textarea,
  Table,
  ActionIcon,
  Tooltip,
  Tabs,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import type { DateValue } from "@mantine/dates";
import {
  WrenchScrewdriverIcon,
  PlusIcon,
  TrashIcon,
  UserPlusIcon,
  ListBulletIcon,
} from "@heroicons/react/24/outline";
import { useRegistrarMantenimiento } from "../hooks/useRegistrarMantenimiento";
import { MultiFilePicker } from "../../../presentation/utils/archivo/multifile-picker";
import { formatNumber } from "../../../shared/functions/formatNumber";
import { FormProveedor } from "../../../presentation/utils/form-proveedor";
import { FormPersonalExterno } from "../../../presentation/utils/form-personal-externo";
import { usePersonalExterno } from "../../../hooks/usePersonalExterno";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import type { RES_ActivoFijoDisponible } from "../../../service/responses/activo-fijo";
import dayjs from "dayjs";

interface RegistroMantenimientoProps {
  initialActivoId?: number | null;
  activos: RES_ActivoFijoDisponible[];
  onSuccess: () => void;
  onCancel: () => void;
}

export const RegistroMantenimiento = ({
  initialActivoId,
  activos,
  onSuccess,
  onCancel,
}: RegistroMantenimientoProps) => {
  const {
    state: {
      minas,
      almacenes,
      empleados,
      consumosPendientes,
      consumosConfirmados,
      verTodosProveedores,
      verTodoPersonal,
      idActivoFijo,
      setIdActivoFijo,
      tipoLugar,
      setTipoLugar,
      idMina,
      setIdMina,
      idAlmacen,
      setIdAlmacen,
      lugarOtro,
      setLugarOtro,
      tipoEjecutor,
      setTipoEjecutor,
      idEmpleadoEjecutor,
      setIdEmpleadoEjecutor,
      idProveedor,
      setIdProveedor,
      idPersonalExterno,
      setIdPersonalExterno,
      idEmpleadoSupervisor,
      setIdEmpleadoSupervisor,
      fechaHoraMantenimiento,
      setFechaHoraMantenimiento,
      observacion,
      setObservacion,
      serieFactura,
      setSerieFactura,
      numeroFactura,
      setNumeroFactura,
      costoManoObra,
      setCostoManoObra,
      otrosGastos,
      productosConsumidos,
      evidencias,
      setEvidencias,
    },
    status: {
      loadingCatalogs,
      loadingPersonal,
      loadingTodoPersonal,
      loadingDespachados,
      submitting,
    },
    actions: {
      agregarGasto,
      eliminarGasto,
      actualizarGasto,
      actualizarCantidadProducto,
      actualizarComentarioProducto,
      handleConfirmarPersonalExterno,
      handleConfirmarProveedor,
      handleSubmit,
      handleVerTodosProveedores,
      handleVerTodoPersonal,
      toggleConsumoConfirmado,
    },
    selectsData: { proveedoresSelectData, personalExternoSelectData },
  } = useRegistrarMantenimiento({ initialActivoId, onSuccess, activos });

  const [proveedorModalOpen, setProveedorModalOpen] = useState(false);
  const [personalExternoModalOpen, setPersonalExternoModalOpen] =
    useState(false);

  const {
    nombre: extNombre,
    setNombre: setExtNombre,
    apellido: extApellido,
    setApellido: setExtApellido,
    dni: extDni,
    setDni: setExtDni,
    isSubmitting: extSubmitting,
    handleCrearPersonal,
  } = usePersonalExterno({
    idProveedor: idProveedor || undefined,
    autoFetch: false,
    onRegisterSuccess: (nuevo) => {
      handleConfirmarPersonalExterno(nuevo);
      setPersonalExternoModalOpen(false);
    },
  });

  const inputClasses = {
    input:
      "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
    dropdown: "bg-zinc-900 border-zinc-800 shadow-2xl ",
    option:
      "hover:bg-zinc-800 text-zinc-300 data-[selected]:bg-zinc-100 data-[selected]:text-zinc-900 rounded-md my-1",
    label: "text-zinc-300 mb-1 font-semibold text-xs ml-0.5",
  };

  const lugarSelectData = useMemo(() => {
    const data: { group: string; items: { value: string; label: string }[] }[] =
      [];
    if (almacenes.length > 0) {
      data.push({
        group: "Almacenes",
        items: almacenes.map((a) => ({
          value: `almacen-${a.id_almacen}`,
          label: a.nombre,
        })),
      });
    }
    if (minas.length > 0) {
      data.push({
        group: "Minas",
        items: minas.map((m) => ({
          value: `mina-${m.id_mina}`,
          label: m.nombre,
        })),
      });
    }
    data.push({
      group: "Otros",
      items: [{ value: "otro", label: "Otro (Especificar)..." }],
    });
    return data;
  }, [almacenes, minas]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-zinc-200">
      {/* 3-Column Top Row: Activo Fijo, Supervisor, Fecha */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-zinc-800/60 pb-5">
        <Select
          label="Activo Fijo"
          placeholder="Seleccione..."
          data={activos.map((a) => ({
            value: String(a.id_activo),
            label: `${a.correlativo} - ${a.producto}`,
          }))}
          value={idActivoFijo ? String(idActivoFijo) : null}
          onChange={(val) => setIdActivoFijo(val ? Number(val) : null)}
          searchable
          required
          classNames={inputClasses}
          radius="md"
        />

        <Select
          label="Supervisor"
          placeholder="Seleccione..."
          data={empleados.map((e) => ({
            value: String(e.id_empleado),
            label: e.nombre_completo,
          }))}
          value={idEmpleadoSupervisor ? String(idEmpleadoSupervisor) : null}
          onChange={(val) => setIdEmpleadoSupervisor(val ? Number(val) : null)}
          searchable
          classNames={inputClasses}
          radius="md"
        />

        <DateTimePicker
          label="Fecha / Hora"
          placeholder="Seleccione..."
          value={fechaHoraMantenimiento}
          onChange={(val: DateValue) =>
            setFechaHoraMantenimiento(val ? new Date(val) : null)
          }
          required
          maxDate={new Date()}
          classNames={inputClasses}
          radius="md"
        />
      </div>

      {/* Row: Lugar de Trabajo & Ejecución Tipo/Interno */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b border-zinc-800/60 pb-5">
        <Select
          label="Lugar de Trabajo"
          placeholder="Seleccione..."
          data={lugarSelectData}
          value={
            tipoLugar === "almacen" && idAlmacen
              ? `almacen-${idAlmacen}`
              : tipoLugar === "mina" && idMina
                ? `mina-${idMina}`
                : tipoLugar === "otro"
                  ? "otro"
                  : null
          }
          onChange={(val) => {
            if (!val) {
              setTipoLugar("");
              setIdAlmacen(null);
              setIdMina(null);
              setLugarOtro("");
              return;
            }
            if (val.startsWith("almacen-")) {
              setTipoLugar("almacen");
              setIdAlmacen(Number(val.replace("almacen-", "")));
              setIdMina(null);
              setLugarOtro("");
            } else if (val.startsWith("mina-")) {
              setTipoLugar("mina");
              setIdMina(Number(val.replace("mina-", "")));
              setIdAlmacen(null);
              setLugarOtro("");
            } else if (val === "otro") {
              setTipoLugar("otro");
              setIdAlmacen(null);
              setIdMina(null);
            }
          }}
          searchable
          required
          classNames={inputClasses}
          radius="md"
        />

        {tipoLugar === "otro" ? (
          <TextInput
            label="Especificar Lugar"
            placeholder="Ej. Taller, campo..."
            value={lugarOtro}
            onChange={(e) => setLugarOtro(e.currentTarget.value)}
            required
            classNames={inputClasses}
            radius="md"
          />
        ) : (
          <div className="hidden md:block" />
        )}

        <div className="flex flex-col justify-end">
          <label className="text-zinc-300 mb-1.5 font-semibold text-xs ml-0.5">
            Tipo Ejecutor
          </label>
          <Tabs
            value={tipoEjecutor}
            onChange={(val) => {
              if (val) setTipoEjecutor(val as "interno" | "externo");
            }}
            variant="pills"
            color="teal"
            radius="md"
          >
            <Tabs.List>
              <Tabs.Tab value="interno" h={24}>Interno</Tabs.Tab>
              <Tabs.Tab value="externo" h={24}>Externo</Tabs.Tab>
            </Tabs.List>
          </Tabs>
        </div>

        {tipoEjecutor === "interno" ? (
          <Select
            label="Ejecutor Interno"
            placeholder="Seleccione..."
            data={empleados.map((e) => ({
              value: String(e.id_empleado),
              label: e.nombre_completo,
            }))}
            value={idEmpleadoEjecutor ? String(idEmpleadoEjecutor) : null}
            onChange={(val) => setIdEmpleadoEjecutor(val ? Number(val) : null)}
            required
            searchable
            classNames={inputClasses}
            radius="md"
          />
        ) : (
          <div className="hidden md:block" />
        )}
      </div>

      {/* Row: Ejecutor Proveedor Externo */}
      {tipoEjecutor === "externo" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-zinc-800/60 pb-5 animate-fade-in">
          <div>
            <Group gap={6} align="flex-end" wrap="nowrap" className="w-full">
              <Select
                label="Proveedor"
                placeholder="Seleccione..."
                data={proveedoresSelectData}
                value={idProveedor ? String(idProveedor) : null}
                onChange={(val) => setIdProveedor(val ? Number(val) : null)}
                required
                searchable
                classNames={inputClasses}
                radius="md"
                className="flex-1"
              />
              <div className="flex gap-1 shrink-0 pb-0.5">
                <Tooltip
                  label={
                    verTodosProveedores ? "Solo Mantenimiento" : "Ver Todos"
                  }
                  withArrow
                  radius="md"
                >
                  <ActionIcon
                    color={verTodosProveedores ? "teal" : "indigo"}
                    variant={verTodosProveedores ? "filled" : "light"}
                    size="34px"
                    radius="md"
                    onClick={handleVerTodosProveedores}
                    disabled={loadingCatalogs}
                    className="border border-zinc-800 text-zinc-400"
                  >
                    <ListBulletIcon className="w-4 h-4" />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Nuevo Proveedor" withArrow radius="md">
                  <ActionIcon
                    color="indigo"
                    variant="filled"
                    size="34px"
                    radius="md"
                    onClick={() => setProveedorModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <PlusIcon className="w-4 h-4 text-white" />
                  </ActionIcon>
                </Tooltip>
              </div>
            </Group>
          </div>

          <div>
            <Group gap={6} align="flex-end" wrap="nowrap" className="w-full">
              <Select
                label="Personal de Proveedor"
                placeholder={
                  !idProveedor
                    ? "Seleccione proveedor primero"
                    : "Seleccione..."
                }
                data={personalExternoSelectData}
                value={idPersonalExterno ? String(idPersonalExterno) : null}
                onChange={(val) =>
                  setIdPersonalExterno(val ? Number(val) : null)
                }
                disabled={!idProveedor || loadingPersonal}
                required
                searchable
                classNames={inputClasses}
                radius="md"
                className="flex-1"
              />
              <div className="flex gap-1 shrink-0 pb-0.5">
                <Tooltip
                  label={verTodoPersonal ? "Solo del Proveedor" : "Ver Todo"}
                  withArrow
                  radius="md"
                >
                  <ActionIcon
                    color={verTodoPersonal ? "teal" : "indigo"}
                    variant={verTodoPersonal ? "filled" : "light"}
                    size="34px"
                    radius="md"
                    onClick={handleVerTodoPersonal}
                    disabled={
                      !idProveedor || loadingPersonal || loadingTodoPersonal
                    }
                    className="border border-zinc-800 text-zinc-400"
                  >
                    <ListBulletIcon className="w-4 h-4" />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Nuevo Personal" withArrow radius="md">
                  <ActionIcon
                    color="indigo"
                    variant="filled"
                    size="34px"
                    radius="md"
                    disabled={!idProveedor}
                    onClick={() => setPersonalExternoModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <UserPlusIcon className="w-4 h-4 text-white" />
                  </ActionIcon>
                </Tooltip>
              </div>
            </Group>
          </div>
        </div>
      )}

      {/* Grid: Factura, Costos y Gastos Adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 border-b border-zinc-800/60 pb-5">
        <TextInput
          label="Serie Factura"
          placeholder="F001"
          value={serieFactura}
          onChange={(e) => setSerieFactura(e.currentTarget.value.toUpperCase())}
          classNames={inputClasses}
          radius="md"
        />
        <TextInput
          label="Número Factura"
          placeholder="000123"
          value={numeroFactura}
          onChange={(e) =>
            setNumeroFactura(e.currentTarget.value.toUpperCase())
          }
          classNames={inputClasses}
          radius="md"
        />
        <TextInput
          label="Costo Mano Obra"
          placeholder="0.00"
          value={costoManoObra}
          onChange={(e) => {
            const val = e.currentTarget.value.replace(/[^0-9.]/g, "");
            setCostoManoObra(val);
          }}
          classNames={inputClasses}
          radius="md"
        />

        {/* Otros Gastos Section */}
        <div className="md:col-span-3 bg-zinc-950/20 border border-zinc-800/80 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <Text
              size="xs"
              fw={850}
              className="text-zinc-400 uppercase tracking-widest"
            >
              Gastos Adicionales ({otrosGastos.length})
            </Text>
            <Button
              size="xs"
              variant="light"
              color="indigo"
              onClick={agregarGasto}
              leftSection={<PlusIcon className="w-3.5 h-3.5" />}
              className="h-7 text-xs font-bold"
            >
              Agregar Gasto
            </Button>
          </div>

          <div className="max-h-28 overflow-y-auto space-y-2 pr-1">
            {otrosGastos.length === 0 ? (
              <Text
                size="xs"
                c="dimmed"
                className="italic text-center py-4 text-zinc-500"
              >
                Sin otros gastos adicionales registrados.
              </Text>
            ) : (
              otrosGastos.map((g, idx) => (
                <Group
                  key={idx}
                  gap="xs"
                  wrap="nowrap"
                  className="animate-fade-in"
                >
                  <TextInput
                    placeholder="Concepto (ej. Repuestos, herramientas)..."
                    value={g.concepto}
                    onChange={(e) =>
                      actualizarGasto(idx, "concepto", e.currentTarget.value)
                    }
                    required
                    classNames={inputClasses}
                    radius="md"
                    className="flex-1"
                  />
                  <TextInput
                    placeholder="Costo"
                    value={g.costo === 0 ? "" : String(g.costo)}
                    onChange={(e) => {
                      const val = e.currentTarget.value.replace(/[^0-9.]/g, "");
                      actualizarGasto(
                        idx,
                        "costo",
                        val === "" ? 0 : Number(val),
                      );
                    }}
                    required
                    classNames={inputClasses}
                    radius="md"
                    className="w-28"
                  />
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    onClick={() => eliminarGasto(idx)}
                    radius="md"
                    size="md"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </ActionIcon>
                </Group>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Insumos / Materiales Section */}
      <div className="space-y-4">
        <Text
          size="xs"
          fw={850}
          className="text-zinc-400 uppercase tracking-widest block border-b border-zinc-800/60 pb-2"
        >
          Insumos / Materiales
        </Text>

        {loadingDespachados ? (
          <Text size="xs" c="dimmed" className="italic text-center py-6 block">
            Cargando insumos disponibles...
          </Text>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Entregas por Consumir */}
            <div className="space-y-2">
              <Text
                size="xs"
                fw={850}
                className="text-zinc-400 uppercase tracking-widest"
              >
                Entregas por Consumir
              </Text>
              {productosConsumidos.length === 0 ? (
                <div className="py-6 text-center text-zinc-500 text-xs font-semibold">
                  No hay entregas pendientes de consumir.
                </div>
              ) : (
                <div className="border border-zinc-800/50 rounded-lg overflow-hidden bg-zinc-950/25">
                  <Table
                    variant="unstyled"
                    className="w-full text-xs text-zinc-300"
                  >
                    <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800/50 text-[10px] uppercase tracking-wider font-bold">
                      <tr>
                        <th className="p-2 px-3 text-left">Insumo</th>
                        <th className="p-2 text-center w-24">Pendiente</th>
                        <th className="p-2 text-center w-24">A Consumir</th>
                        <th className="p-2 px-3 text-left">Comentario</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 bg-zinc-900/10">
                      {productosConsumidos.map((p, idx) => (
                        <tr
                          key={p.id_entrega_detalle}
                          className="hover:bg-white/5 transition-colors"
                        >
                          <td className="p-2 px-3 font-medium truncate max-w-[150px]">
                            {p.producto}
                          </td>
                          <td className="p-2 text-center">
                            <span className="text-[11px] font-bold text-teal-400 font-mono">
                              {formatNumber(p.maxCantidad)} {p.unidad}
                            </span>
                          </td>
                          <td className="p-2">
                            <TextInput
                              placeholder="0"
                              value={p.cantidad === 0 ? "" : String(p.cantidad)}
                              onChange={(e) => {
                                const val = Number(
                                  e.currentTarget.value.replace(/[^0-9.]/g, ""),
                                );
                                actualizarCantidadProducto(idx, val);
                              }}
                              classNames={{
                                input:
                                  "bg-zinc-950/80 border-zinc-800/80 focus:border-zinc-500 text-white text-[11px] h-7 text-center w-20 px-1 font-mono font-bold transition-all",
                              }}
                              radius="sm"
                            />
                          </td>
                          <td className="p-2 px-3">
                            <TextInput
                              placeholder="Nota..."
                              value={p.comentario}
                              onChange={(e) =>
                                actualizarComentarioProducto(
                                  idx,
                                  e.currentTarget.value,
                                )
                              }
                              classNames={{
                                input:
                                  "bg-zinc-950/80 border-zinc-800/80 focus:border-zinc-500 text-white text-[11px] h-7 px-2 transition-all",
                              }}
                              radius="sm"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </div>

            {/* Consumos por Confirmar */}
            <div className="space-y-2">
              <Text
                size="xs"
                fw={850}
                className="text-zinc-400 uppercase tracking-widest"
              >
                Consumos por Confirmar
              </Text>
              {consumosPendientes.length === 0 ? (
                <div className="py-6 text-center text-zinc-500 text-xs font-semibold">
                  No hay consumos previos por confirmar.
                </div>
              ) : (
                <div className="border border-zinc-800/50 rounded-lg overflow-hidden bg-zinc-950/25">
                  <Table
                    variant="unstyled"
                    className="w-full text-xs text-zinc-300"
                  >
                    <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800/50 text-[10px] uppercase tracking-wider font-bold">
                      <tr>
                        <th className="p-2 text-center w-12">Asoc.</th>
                        <th className="p-2 px-3 text-left">Insumo</th>
                        <th className="p-2 text-center w-20">Cantidad</th>
                        <th className="p-2 px-3 text-center w-24">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 bg-zinc-900/10">
                      {consumosPendientes.map((c) => {
                        const isSelected = consumosConfirmados.includes(
                          c.id_consumo,
                        );
                        return (
                          <tr
                            key={c.id_consumo}
                            onClick={() =>
                              toggleConsumoConfirmado(c.id_consumo)
                            }
                            className={`cursor-pointer hover:bg-white/5 transition-colors ${isSelected ? "bg-indigo-500/5!" : ""}`}
                          >
                            <td
                              className="p-2 text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() =>
                                  toggleConsumoConfirmado(c.id_consumo)
                                }
                                className="rounded border-zinc-800 bg-zinc-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer size-3.5"
                              />
                            </td>
                            <td className="p-2 px-3 font-medium truncate max-w-[150px]">
                              {c.producto}
                            </td>
                            <td className="p-2 text-center font-bold text-indigo-400 font-mono">
                              {formatNumber(c.cantidad_base_consumida)}{" "}
                              {c.unidad_base_abv}
                            </td>
                            <td className="p-2 px-3 text-center text-zinc-500 font-mono text-[10px]">
                              {dayjs(c.fecha_hora_consumo).format(
                                "DD/MM/YY HH:mm",
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Observaciones y Evidencias */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-800/60">
        <Textarea
          label="Observaciones"
          placeholder="Describa el estado o diagnostico del mantenimiento..."
          value={observacion}
          onChange={(e) => setObservacion(e.currentTarget.value)}
          minRows={3}
          classNames={inputClasses}
          radius="md"
        />

        <MultiFilePicker
          label="Evidencias (Facturas, Informes, etc.)"
          files={evidencias}
          onFilesChange={setEvidencias}
        />
      </div>

      {/* Action Buttons */}
      <Group justify="flex-end" className="pt-4 border-t border-zinc-800 gap-3">
        <Button
          variant="subtle"
          color="gray"
          onClick={onCancel}
          disabled={submitting}
          radius="md"
          className="text-zinc-400 hover:text-white px-5 font-semibold"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          loading={submitting}
          disabled={!idActivoFijo}
          radius="md"
          className="bg-linear-to-r from-zinc-100 to-zinc-300 text-zinc-900 font-semibold hover:from-white hover:to-zinc-200 shadow-md border-0 px-6"
          leftSection={
            <WrenchScrewdriverIcon className="w-4 h-4 text-zinc-900" />
          }
        >
          Guardar Mantenimiento
        </Button>
      </Group>

      {/* Modal: FormProveedor */}
      <ModalEstandar
        opened={proveedorModalOpen}
        close={() => setProveedorModalOpen(false)}
        title="Nuevo Proveedor"
        size="md"
      >
        <FormProveedor
          onSuccess={(nuevo) => {
            handleConfirmarProveedor(nuevo);
            setProveedorModalOpen(false);
          }}
          onCancel={() => setProveedorModalOpen(false)}
        />
      </ModalEstandar>

      {/* Modal: FormPersonalExterno */}
      <ModalEstandar
        opened={personalExternoModalOpen}
        close={() => setPersonalExternoModalOpen(false)}
        title="Nuevo Personal Externo"
        size="md"
      >
        <FormPersonalExterno
          nombre={extNombre}
          apellido={extApellido}
          dni={extDni}
          setNombre={setExtNombre}
          setApellido={setExtApellido}
          setDni={setExtDni}
          onSubmit={handleCrearPersonal}
          isSubmitting={extSubmitting}
        />
      </ModalEstandar>
    </form>
  );
};
