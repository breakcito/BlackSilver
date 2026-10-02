import { useState, type ReactNode } from "react";
import {
  Button,
  Group,
  Select,
  Text,
  TextInput,
  Textarea,
  NumberInput,
  Table,
  ActionIcon,
  Tooltip,
  Tabs,
  Card,
  Checkbox,
  Stack,
  Badge,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import type { DateValue } from "@mantine/dates";
import {
  WrenchScrewdriverIcon,
  PlusIcon,
  TrashIcon,
  UserPlusIcon,
  ListBulletIcon,
  IdentificationIcon,
  MapPinIcon,
  BanknotesIcon,
  CubeIcon,
  DocumentTextIcon,
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

const inputClasses = {
  input:
    "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
  label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
  dropdown:
    "bg-zinc-950 border-zinc-800 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl",
  option:
    "text-zinc-300 hover:bg-zinc-800 hover:text-white data-[selected]:bg-indigo-600 data-[selected]:text-white font-medium transition-colors",
  error: "text-red-400 text-xs font-medium mt-1",
};

/**
 * Marca explicita de campo no obligatorio. Sostiene la regla: si un campo no
 * es requerido, el usuario tiene que poder leer que no lo es sin adivinar.
 */
const Opcional = () => (
  <Badge
    size="xs"
    variant="light"
    color="zinc"
    className="font-semibold uppercase tracking-wide align-middle ml-1"
  >
    Opcional
  </Badge>
);

/** Envoltura de seccion del formulario. Un unico scroll, cuatro bloques. */
const SeccionCard = ({
  icon,
  titulo,
  children,
  accion,
}: {
  icon: ReactNode;
  titulo: string;
  children: ReactNode;
  accion?: ReactNode;
}) => (
  <Card
    withBorder
    p="md"
    radius="xl"
    className="bg-zinc-900/40 border-zinc-800/80 shadow-md backdrop-blur-md"
  >
    <div className="flex items-center justify-between gap-3 mb-4">
      <Group gap="xs" wrap="nowrap">
        <div className="p-1.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shrink-0">
          {icon}
        </div>
        <Text
          size="xs"
          fw={800}
          className="text-zinc-100 uppercase tracking-wider"
        >
          {titulo}
        </Text>
      </Group>
      {accion}
    </div>
    {children}
  </Card>
);

/** Marca de requerido en el label de los campos que si lo son. */
const Requerido = () => (
  <span className="text-red-400 align-middle ml-0.5" title="Campo obligatorio">
    *
  </span>
);

export const RegistroMantenimiento = ({
  initialActivoId,
  activos,
  onSuccess,
  onCancel,
}: RegistroMantenimientoProps) => {
  const {
    state: {
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
      fieldErrors,
    },
    status: { loadingPersonal, loadingTodoPersonal, loadingDespachados, submitting },
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
      clearFieldError,
    },
    selectsData: {
      activosSelectData,
      supervisorSelectData,
      ejecutorSelectData,
      proveedoresSelectData,
      personalExternoSelectData,
      lugarSelectData,
    },
    searchData: {
      qActivo,
      setQActivo,
      qSupervisor,
      setQSupervisor,
      qEjecutor,
      setQEjecutor,
      qProveedor,
      setQProveedor,
      qPersonal,
      setQPersonal,
      qLugar,
      setQLugar,
    },
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

  // Al cambiar de modo de ejecutor se limpian los campos del otro modo para no
  // mandar ids que ya no aplican.
  const handleCambioTipoEjecutor = (valor: string | null) => {
    if (!valor) return;
    const nuevo = valor as "interno" | "externo";
    if (nuevo === tipoEjecutor) return;
    clearFieldError("id_empleado_ejecutor");
    clearFieldError("id_proveedor");
    clearFieldError("id_personal_externo");
    if (nuevo === "externo") {
      setIdEmpleadoEjecutor(null);
    } else {
      setIdProveedor(null);
      setIdPersonalExterno(null);
    }
    setTipoEjecutor(nuevo);
  };

  const totalOtrosGastos = otrosGastos.reduce(
    (sum, g) => sum + Number(g.costo || 0),
    0,
  );
  const totalGeneral =
    (costoManoObra === "" ? 0 : Number(costoManoObra) || 0) + totalOtrosGastos;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-zinc-200">
      {/* 1. Identificación */}
      <SeccionCard
        icon={<IdentificationIcon className="w-4 h-4 text-indigo-400" />}
        titulo="Identificación"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label={
              <>
                Activo Fijo
                <Requerido />
              </>
            }
            placeholder="Seleccione..."
            data={activosSelectData}
            value={idActivoFijo ? String(idActivoFijo) : null}
            onChange={(val) => {
              setIdActivoFijo(val ? Number(val) : null);
              setQActivo("");
              clearFieldError("id_activo_fijo");
            }}
            searchable
            searchValue={qActivo}
            onSearchChange={setQActivo}
            nothingFoundMessage="Sin coincidencias"
            comboboxProps={{ withinPortal: true }}
            error={fieldErrors.id_activo_fijo}
            classNames={inputClasses}
            size="xs"
            radius="lg"
          />

          <Select
            label={
              <>
                Supervisor
                <Opcional />
              </>
            }
            placeholder="Seleccione..."
            data={supervisorSelectData}
            value={idEmpleadoSupervisor ? String(idEmpleadoSupervisor) : null}
            onChange={(val) => setIdEmpleadoSupervisor(val ? Number(val) : null)}
            searchable
            searchValue={qSupervisor}
            onSearchChange={setQSupervisor}
            nothingFoundMessage="Sin coincidencias"
            comboboxProps={{ withinPortal: true }}
            clearable
            classNames={inputClasses}
            size="xs"
            radius="lg"
          />

          <DateTimePicker
            label={
              <>
                Fecha / Hora
                <Requerido />
              </>
            }
            placeholder="Seleccione..."
            value={fechaHoraMantenimiento}
            onChange={(val: DateValue) => {
              setFechaHoraMantenimiento(val ? new Date(val) : null);
              clearFieldError("fecha_hora_mantenimiento");
            }}
            maxDate={new Date()}
            error={fieldErrors.fecha_hora_mantenimiento}
            classNames={inputClasses}
            size="xs"
            radius="lg"
          />
        </div>
      </SeccionCard>

      {/* 2. Ejecución */}
      <SeccionCard
        icon={<MapPinIcon className="w-4 h-4 text-indigo-400" />}
        titulo="Ejecución"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label={
                <>
                  Lugar de Trabajo
                  <Requerido />
                </>
              }
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
                clearFieldError("lugar_trabajo");
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
                setQLugar("");
              }}
              searchable
              searchValue={qLugar}
              onSearchChange={setQLugar}
              nothingFoundMessage="Sin coincidencias"
              comboboxProps={{ withinPortal: true }}
              error={fieldErrors.lugar_trabajo}
              classNames={inputClasses}
              size="xs"
              radius="lg"
            />

            {tipoLugar === "otro" && (
              <TextInput
                label={
                  <>
                    Especificar Lugar
                    <Requerido />
                  </>
                }
                placeholder="Ej. Taller, campo..."
                value={lugarOtro}
                onChange={(e) => {
                  setLugarOtro(e.currentTarget.value);
                  clearFieldError("lugar_trabajo");
                }}
                maxLength={150}
                classNames={inputClasses}
                size="xs"
                radius="lg"
              />
            )}
          </div>

          <div className="flex flex-col justify-end">
            <Text size="xs" fw={600} className="text-zinc-400 mb-1 ml-1">
              Tipo Ejecutor
            </Text>
            <Tabs
              value={tipoEjecutor}
              onChange={handleCambioTipoEjecutor}
              variant="pills"
              color="teal"
              radius="lg"
            >
              <Tabs.List>
                <Tabs.Tab value="interno" h={26}>
                  Interno
                </Tabs.Tab>
                <Tabs.Tab value="externo" h={26}>
                  Externo
                </Tabs.Tab>
              </Tabs.List>
            </Tabs>
          </div>
        </div>

        {tipoEjecutor === "interno" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Select
              label={
                <>
                  Ejecutor Interno
                  <Requerido />
                </>
              }
              placeholder="Seleccione..."
              data={ejecutorSelectData}
              value={idEmpleadoEjecutor ? String(idEmpleadoEjecutor) : null}
              onChange={(val) => {
                setIdEmpleadoEjecutor(val ? Number(val) : null);
                clearFieldError("id_empleado_ejecutor");
                setQEjecutor("");
              }}
              searchable
              searchValue={qEjecutor}
              onSearchChange={setQEjecutor}
              nothingFoundMessage="Sin coincidencias"
              comboboxProps={{ withinPortal: true }}
              error={fieldErrors.id_empleado_ejecutor}
              classNames={inputClasses}
              size="xs"
              radius="lg"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 animate-fade-in">
            <div>
              <Group gap={6} align="flex-end" wrap="nowrap" className="w-full">
                <Select
                  label={
                    <>
                      Proveedor
                      <Requerido />
                    </>
                  }
                  placeholder="Seleccione..."
                  data={proveedoresSelectData}
                  value={idProveedor ? String(idProveedor) : null}
                  onChange={(val) => {
                    setIdProveedor(val ? Number(val) : null);
                    clearFieldError("id_proveedor");
                    setQProveedor("");
                  }}
                  searchable
                  searchValue={qProveedor}
                  onSearchChange={setQProveedor}
                  nothingFoundMessage="Sin coincidencias"
                  comboboxProps={{ withinPortal: true }}
                  error={fieldErrors.id_proveedor}
                  classNames={inputClasses}
                  size="xs"
                  radius="lg"
                  className="flex-1"
                />
                <div className="flex gap-1 shrink-0">
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
                      size={30}
                      radius="lg"
                      onClick={handleVerTodosProveedores}
                      className="border border-zinc-800 text-zinc-400"
                    >
                      <ListBulletIcon className="w-4 h-4" />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Nuevo Proveedor" withArrow radius="md">
                    <ActionIcon
                      color="indigo"
                      variant="filled"
                      size={30}
                      radius="lg"
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
                  label={
                    <>
                      Personal de Proveedor
                      <Requerido />
                    </>
                  }
                  placeholder={
                    !idProveedor
                      ? "Seleccione proveedor primero"
                      : "Seleccione..."
                  }
                  data={personalExternoSelectData}
                  value={idPersonalExterno ? String(idPersonalExterno) : null}
                  onChange={(val) => {
                    setIdPersonalExterno(val ? Number(val) : null);
                    clearFieldError("id_personal_externo");
                  }}
                  disabled={!idProveedor || loadingPersonal}
                  searchable
                  searchValue={qPersonal}
                  onSearchChange={setQPersonal}
                  nothingFoundMessage="Sin coincidencias"
                  comboboxProps={{ withinPortal: true }}
                  error={fieldErrors.id_personal_externo}
                  classNames={inputClasses}
                  size="xs"
                  radius="lg"
                  className="flex-1"
                />
                <div className="flex gap-1 shrink-0">
                  <Tooltip
                    label={verTodoPersonal ? "Solo del Proveedor" : "Ver Todo"}
                    withArrow
                    radius="md"
                  >
                    <ActionIcon
                      color={verTodoPersonal ? "teal" : "indigo"}
                      variant={verTodoPersonal ? "filled" : "light"}
                      size={30}
                      radius="lg"
                      onClick={handleVerTodoPersonal}
                      disabled={!idProveedor || loadingPersonal || loadingTodoPersonal}
                      className="border border-zinc-800 text-zinc-400"
                    >
                      <ListBulletIcon className="w-4 h-4" />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Nuevo Personal" withArrow radius="md">
                    <ActionIcon
                      color="indigo"
                      variant="filled"
                      size={30}
                      radius="lg"
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
      </SeccionCard>

      {/* 3. Costos */}
      <SeccionCard
        icon={<BanknotesIcon className="w-4 h-4 text-emerald-400" />}
        titulo="Costos"
        accion={
          <Group gap="xs">
            {totalOtrosGastos > 0 && (
              <Badge
                color="emerald"
                variant="light"
                size="sm"
                className="font-extrabold uppercase border border-emerald-500/20"
              >
                Gastos: S/. {formatNumber(totalOtrosGastos, 2)}
              </Badge>
            )}
            <Badge
              color="indigo"
              variant="light"
              size="sm"
              className="font-extrabold uppercase border border-indigo-500/20"
            >
              Total: S/. {formatNumber(totalGeneral, 2)}
            </Badge>
          </Group>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextInput
            label={
              <>
                Serie Factura
                <Opcional />
              </>
            }
            placeholder="F001"
            value={serieFactura}
            onChange={(e) => setSerieFactura(e.currentTarget.value.toUpperCase())}
            maxLength={20}
            classNames={inputClasses}
            size="xs"
            radius="lg"
          />
          <TextInput
            label={
              <>
                Número Factura
                <Opcional />
              </>
            }
            placeholder="000123"
            value={numeroFactura}
            onChange={(e) =>
              setNumeroFactura(e.currentTarget.value.toUpperCase())
            }
            maxLength={20}
            classNames={inputClasses}
            size="xs"
            radius="lg"
          />
          <NumberInput
            label={
              <>
                Costo Mano Obra
                <Opcional />
              </>
            }
            placeholder="0.00"
            value={costoManoObra}
            onChange={(val) =>
              setCostoManoObra(
                typeof val === "number" ? val : (val as string) ?? "",
              )
            }
            prefix="S/. "
            decimalSeparator="."
            fixedDecimalScale
            allowNegative={false}
            clampBehavior="blur"
            hideControls
            min={0}
            error={fieldErrors.costo_mano_obra}
            classNames={inputClasses}
            size="xs"
            radius="lg"
          />
        </div>

        {/* Otros Gastos */}
        <div className="mt-4 bg-zinc-950/20 border border-zinc-800/80 rounded-xl p-3 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <Text
              size="xs"
              fw={800}
              className="text-zinc-400 uppercase tracking-wider"
            >
              Gastos Adicionales ({otrosGastos.length})
            </Text>
            <Button
              size="xs"
              radius="lg"
              variant="light"
              color="indigo"
              onClick={agregarGasto}
              leftSection={<PlusIcon className="w-3.5 h-3.5" />}
              className="font-bold"
            >
              Agregar Gasto
            </Button>
          </div>

          <div className="max-h-32 overflow-y-auto space-y-2 pr-1">
            {otrosGastos.length === 0 ? (
              <Text
                size="xs"
                c="dimmed"
                className="italic text-center py-3 text-zinc-500"
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
                    aria-label={`Concepto del gasto ${idx + 1}`}
                    value={g.concepto}
                    onChange={(e) =>
                      actualizarGasto(idx, "concepto", e.currentTarget.value)
                    }
                    classNames={inputClasses}
                    size="xs"
                    radius="lg"
                    className="flex-1"
                  />
                  <NumberInput
                    placeholder="Costo"
                    aria-label={`Costo del gasto ${idx + 1}`}
                    value={g.costo === 0 ? "" : g.costo}
                    onChange={(val) =>
                      actualizarGasto(
                        idx,
                        "costo",
                        typeof val === "number" ? val : 0,
                      )
                    }
                    prefix="S/. "
                    decimalSeparator="."
                    fixedDecimalScale
                    allowNegative={false}
                    clampBehavior="blur"
                    hideControls
                    min={0}
                    classNames={inputClasses}
                    size="xs"
                    radius="lg"
                    className="w-32"
                  />
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    onClick={() => eliminarGasto(idx)}
                    aria-label={`Eliminar gasto ${idx + 1}`}
                    radius="lg"
                    size={30}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </ActionIcon>
                </Group>
              ))
            )}
          </div>
        </div>
      </SeccionCard>

      {/* 4. Insumos y Evidencias */}
      <SeccionCard
        icon={<CubeIcon className="w-4 h-4 text-teal-400" />}
        titulo="Insumos y Evidencias"
      >
        {loadingDespachados ? (
          <Text size="xs" c="dimmed" className="italic text-center py-6 block">
            Cargando insumos disponibles...
          </Text>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Entregas por Consumir */}
            <div className="space-y-2">
              <Text
                size="xs"
                fw={800}
                className="text-zinc-400 uppercase tracking-wider"
              >
                Entregas por Consumir
              </Text>
              {productosConsumidos.length === 0 ? (
                <div className="py-5 text-center text-zinc-500 text-xs font-semibold border border-dashed border-zinc-800/80 rounded-xl bg-zinc-950/20">
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
                        <th className="p-2 text-center w-28">A Consumir</th>
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
                            <NumberInput
                              placeholder="0"
                              aria-label={`Cantidad a consumir de ${p.producto}`}
                              value={p.cantidad === 0 ? "" : p.cantidad}
                              onChange={(val) =>
                                actualizarCantidadProducto(
                                  idx,
                                  typeof val === "number" ? val : 0,
                                )
                              }
                              max={p.maxCantidad}
                              min={0}
                              decimalSeparator="."
                              allowDecimal
                              clampBehavior="blur"
                              hideControls
                              classNames={{
                                input:
                                  "bg-zinc-950/80 border-zinc-800/80 focus:border-zinc-500 text-white text-[11px] h-7 text-center w-24 px-1 font-mono font-bold transition-all",
                              }}
                              size="xs"
                              radius="sm"
                            />
                          </td>
                          <td className="p-2 px-3">
                            <TextInput
                              placeholder="Nota..."
                              aria-label={`Comentario de ${p.producto}`}
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
                              size="xs"
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
                fw={800}
                className="text-zinc-400 uppercase tracking-wider"
              >
                Consumos por Confirmar
              </Text>
              {consumosPendientes.length === 0 ? (
                <div className="py-5 text-center text-zinc-500 text-xs font-semibold border border-dashed border-zinc-800/80 rounded-xl bg-zinc-950/20">
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
                            className={`hover:bg-white/5 transition-colors ${
                              isSelected ? "bg-indigo-500/5!" : ""
                            }`}
                          >
                            <td className="p-2 text-center">
                              <Checkbox
                                checked={isSelected}
                                onChange={() =>
                                  toggleConsumoConfirmado(c.id_consumo)
                                }
                                aria-label={`Asociar consumo de ${c.producto}`}
                                size="xs"
                                color="indigo"
                                className="justify-self-center"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 pt-4 border-t border-zinc-800/60">
          <Textarea
            label={
              <>
                Observaciones
                <Opcional />
              </>
            }
            placeholder="Describa el estado o diagnostico del mantenimiento..."
            value={observacion}
            onChange={(e) => setObservacion(e.currentTarget.value)}
            maxLength={1000}
            minRows={3}
            maxRows={6}
            error={fieldErrors.observacion}
            classNames={inputClasses}
            size="xs"
            radius="lg"
          />

          <Stack gap={6} align="stretch">
            <MultiFilePicker
              label="Evidencias (Facturas, Informes, etc.)"
              files={evidencias}
              onFilesChange={setEvidencias}
            />
            <Text size="10px" c="dimmed" className="px-1">
              <DocumentTextIcon className="w-3 h-3 inline mr-1 align-text-bottom" />
              Adjunte la factura escaneada u otros soportes. Si no hay factura,
              deje la serie y el numero vacios.
            </Text>
          </Stack>
        </div>
      </SeccionCard>

      {/* Acciones */}
      <Group justify="flex-end" className="pt-2 gap-3">
        <Button
          variant="subtle"
          color="gray"
          onClick={onCancel}
          disabled={submitting}
          radius="lg"
          size="xs"
          className="text-zinc-400 hover:text-white px-5 font-semibold"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          loading={submitting}
          radius="lg"
          size="xs"
          className="bg-linear-to-r from-zinc-100 to-zinc-300 text-zinc-900 font-semibold hover:from-white hover:to-zinc-200 shadow-md border-0 px-6"
          leftSection={<WrenchScrewdriverIcon className="w-4 h-4 text-zinc-900" />}
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
