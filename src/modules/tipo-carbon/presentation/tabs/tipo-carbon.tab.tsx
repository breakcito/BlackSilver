import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Group,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { PlusIcon } from "@heroicons/react/24/outline";
import {
  IconExclamationCircle,
  IconSettings,
  IconTrash,
  IconX,
} from "@tabler/icons-react";

import { useTipoCarbon } from "../../hooks/useTipoCarbon";
import { useRegistroTipoCarbon } from "../../hooks/useRegistroTipoCarbon";
import { useVariantesTipo } from "../../hooks/useVariantesTipo";
import { TipoCarbonService } from "../../service/tipo-carbon.service";
import { DataTableEstandar } from "../../../../presentation/utils/datatable-estandar";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import type {
  ActualizarTipoCarbonRequest,
  CrearTipoCarbonRequest,
} from "../../service/tipo-carbon.requests";
import type {
  RES_TipoCarbon,
  RES_VarianteCarbon,
} from "../../service/tipo-carbon.responses";

type ModalMode = "create" | "edit" | null;

const fieldClasses = {
  input:
    "bg-zinc-900/50 border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-white placeholder:text-zinc-500",
  label: "text-zinc-300 mb-1 font-medium text-xs",
};

export const TipoCarbonTab = () => {
  const ctrl = useTipoCarbon();
  const { payload, handleChange, submit, loading, actualizar, eliminar } =
    useRegistroTipoCarbon((t) => {
      ctrl.upsertTipo(t);
      setModal(null);
      setEditTipo(null);
    });

  const [modal, setModal] = useState<ModalMode>(null);
  const [editTipo, setEditTipo] = useState<RES_TipoCarbon | null>(null);
  const [editPayload, setEditPayload] = useState<CrearTipoCarbonRequest>({
    nombre: "",
    codigo: null,
    para_compra: false,
  });

  const [confirmDelete, setConfirmDelete] = useState<RES_TipoCarbon | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [variantesTarget, setVariantesTarget] = useState<RES_TipoCarbon | null>(
    null,
  );
  const variantesCtrl = useVariantesTipo(
    variantesTarget?.id_tipo_carbon ?? null,
  );
  const [variantesSeleccionadas, setVariantesSeleccionadas] = useState<
    RES_VarianteCarbon[]
  >([]);
  const [catalogoTipos, setCatalogoTipos] = useState<RES_TipoCarbon[]>([]);
  const [pendienteVariante, setPendienteVariante] = useState<string | null>(
    null,
  );
  const lastHydratedFor = useRef<number | null>(null);

  // Carga unica del catalogo de tipos al montar (para alimentar el Select).
  useEffect(() => {
    let cancel = false;
    (async () => {
      const res = await TipoCarbonService.getTipos();
      if (cancel) return;
      if (res.success) setCatalogoTipos(res.data);
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const openCreate = () => {
    setEditTipo(null);
    setEditPayload({ nombre: "", codigo: null, para_compra: false });
    setModal("create");
  };

  const openEdit = (t: RES_TipoCarbon) => {
    setEditTipo(t);
    setEditPayload({
      nombre: t.nombre,
      codigo: t.codigo ?? null,
      para_compra: t.para_compra ?? false,
    });
    setModal("edit");
  };

  const closeEdit = () => {
    setModal(null);
    setEditTipo(null);
  };

  const handleEditSubmit = async () => {
    if (!editTipo) return;
    await actualizar(
      editTipo.id_tipo_carbon,
      editPayload as ActualizarTipoCarbonRequest,
    );
  };

  const openVariantes = (t: RES_TipoCarbon) => {
    setVariantesTarget(t);
    setVariantesSeleccionadas([]);
    lastHydratedFor.current = null;
  };

  const handleGuardarVariantes = async () => {
    if (!variantesTarget) return;
    const ids = variantesSeleccionadas.map((v) => v.id_tipo_variante);
    const ok = await variantesCtrl.guardar(ids);
    if (ok) {
      ctrl.refreshCantidadVariantes(variantesTarget.id_tipo_carbon, ids.length);
      closeVariantes();
    }
  };

  const closeVariantes = () => {
    setVariantesTarget(null);
    setVariantesSeleccionadas([]);
    lastHydratedFor.current = null;
  };

  // Hidratar variantesSeleccionadas una vez por target cuando los datos
  // frescos ya terminaron de cargar (esperamos a !loading para no leer stale).
  useEffect(() => {
    const targetId = variantesTarget?.id_tipo_carbon ?? null;
    if (targetId === null) return;
    if (variantesCtrl.loading) return;
    if (lastHydratedFor.current === targetId) return;
    lastHydratedFor.current = targetId;
    setVariantesSeleccionadas(variantesCtrl.variantesActuales);
  }, [
    variantesTarget?.id_tipo_carbon,
    variantesCtrl.loading,
    variantesCtrl.variantesActuales,
  ]);

  // Opciones para el Select: tipos que NO son el actual y NO estan ya
  // seleccionados. El backend actualmente permite que un tipo sea variante
  // de si mismo; aqui lo excluimos por UX (el usuario no deberia poder
  // marcarse a si mismo).
  const opcionesSelect = useMemo(() => {
    if (!variantesTarget) return [];
    const seleccionadasIds = new Set(
      variantesSeleccionadas.map((v) => v.id_tipo_variante),
    );
    return catalogoTipos
      .filter(
        (t) =>
          t.id_tipo_carbon !== variantesTarget.id_tipo_carbon &&
          !seleccionadasIds.has(t.id_tipo_carbon),
      )
      .map((t) => ({
        value: String(t.id_tipo_carbon),
        label: t.codigo ? `${t.nombre} (${t.codigo})` : t.nombre,
      }));
  }, [catalogoTipos, variantesTarget, variantesSeleccionadas]);

  const handleAgregarVariante = (value: string | null) => {
    if (!value || !variantesTarget) return;
    const id = Number(value);
    if (id === variantesTarget.id_tipo_carbon) return;
    if (variantesSeleccionadas.some((v) => v.id_tipo_variante === id)) return;
    const tipo = catalogoTipos.find((t) => t.id_tipo_carbon === id);
    if (!tipo) return;
    setVariantesSeleccionadas((prev) => [
      ...prev,
      {
        id_tipo_variante: tipo.id_tipo_carbon,
        nombre: tipo.nombre,
        codigo: tipo.codigo,
      },
    ]);
    setPendienteVariante(null);
  };

  const handleQuitarVariante = (id: number) => {
    setVariantesSeleccionadas((prev) =>
      prev.filter((v) => v.id_tipo_variante !== id),
    );
  };

  const handleEliminar = async () => {
    if (!confirmDelete) return;
    setDeleteError(null);
    const ok = await eliminar(confirmDelete.id_tipo_carbon);
    if (ok) {
      ctrl.removeTipo(confirmDelete.id_tipo_carbon);
      setConfirmDelete(null);
    } else {
      setDeleteError(
        "No se puede eliminar: probablemente es variante de otro tipo. Quite las referencias primero.",
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header igual a los otros tabs */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-white">Tipos de Carbon</h2>
          <p className="text-xs text-zinc-500">
            Catalogo de tipos de carbon y sus variantes. Una variante es otro
            tipo ya registrado que forma parte de este.
          </p>
        </div>
        <Button
          leftSection={<PlusIcon className="w-4 h-4" />}
          onClick={openCreate}
          radius="lg"
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          Nuevo Tipo
        </Button>
      </div>

      <DataTableEstandar
        records={ctrl.tipos}
        loading={ctrl.loading}
        columns={[
          {
            accessor: "index",
            title: "#",
            textAlign: "center",
            width: 50,
            render: (_: RES_TipoCarbon, index: number) => index + 1,
          },
          {
            accessor: "nombre",
            title: "Nombre",
            sortable: true,
            render: (r: RES_TipoCarbon) => (
              <Text size="sm" fw={500} className="text-zinc-100">
                {r.nombre}
              </Text>
            ),
          },
          {
            accessor: "codigo",
            title: "Codigo",
            sortable: true,
            render: (r: RES_TipoCarbon) => (
              <Badge variant="light" color="gray" radius="xl" size="sm">
                {r.codigo || "—"}
              </Badge>
            ),
          },
          {
            accessor: "para_compra",
            title: "Para compra",
            width: 130,
            textAlign: "center",
            render: (r: RES_TipoCarbon) =>
              r.para_compra ? (
                <Badge color="green" variant="light" radius="xl" size="sm">
                  Si
                </Badge>
              ) : (
                <Badge color="gray" variant="light" radius="xl" size="sm">
                  No
                </Badge>
              ),
          },
          {
            accessor: "cantidad_variantes",
            title: "Variantes",
            width: 110,
            textAlign: "center",
            render: (r: RES_TipoCarbon) => (
              <div className="flex justify-center items-center">
                <Badge
                  color={(r.cantidad_variantes ?? 0) > 0 ? "indigo" : "gray"}
                  variant="light"
                  size="sm"
                  radius="xl"
                >
                  {r.cantidad_variantes ?? 0}
                </Badge>
                <Button
                  size="xs"
                  variant="subtle"
                  color="indigo"
                  leftSection={<IconSettings size={14} />}
                  onClick={() => openVariantes(r)}
                ></Button>
              </div>
            ),
          },
          {
            accessor: "actions",
            title: "Acciones",
            width: 320,
            textAlign: "center",
            render: (r: RES_TipoCarbon) => (
              <div className="flex gap-2 justify-center">
                <Button
                  size="xs"
                  variant="subtle"
                  color="gray"
                  onClick={() => openEdit(r)}
                >
                  Editar
                </Button>
                <Button
                  size="xs"
                  variant="subtle"
                  color="red"
                  leftSection={<IconTrash size={14} />}
                  onClick={() => {
                    setConfirmDelete(r);
                    setDeleteError(null);
                  }}
                >
                  Eliminar
                </Button>
              </div>
            ),
          },
        ]}
      />

      {/* Modal alta y edicion (compartido) */}
      <ModalEstandar
        opened={modal !== null}
        close={closeEdit}
        validateClose
        title={
          modal === "edit" && editTipo
            ? `Editar: ${editTipo.nombre}`
            : "Nuevo Tipo de Carbon"
        }
        size="sm"
      >
        <div className="space-y-3">
          <TextInput
            label="Nombre"
            placeholder="Ej: Cisco, Mixto, Tipo A..."
            value={modal === "edit" ? editPayload.nombre : payload.nombre}
            onChange={(e) => {
              if (modal === "edit") {
                setEditPayload((p) => ({
                  ...p,
                  nombre: e.currentTarget.value,
                }));
              } else {
                handleChange("nombre", e.currentTarget.value);
              }
            }}
            required
            classNames={fieldClasses}
            radius="lg"
          />
          <TextInput
            label="Codigo (opcional)"
            placeholder="Ej: CARB-CIS"
            value={
              modal === "edit"
                ? (editPayload.codigo ?? "")
                : (payload.codigo ?? "")
            }
            onChange={(e) => {
              if (modal === "edit") {
                setEditPayload((p) => ({
                  ...p,
                  codigo: e.currentTarget.value || null,
                }));
              } else {
                handleChange("codigo", e.currentTarget.value || null);
              }
            }}
            classNames={fieldClasses}
            radius="lg"
          />
          <Switch
            label="Para compra"
            description="Habilita este tipo para registrar compras de carbon y asociarlo a proveedores de carbon."
            color="indigo"
            checked={
              modal === "edit" ? editPayload.para_compra : payload.para_compra
            }
            onChange={(e) => {
              const val = e.currentTarget.checked;
              if (modal === "edit") {
                setEditPayload((p) => ({ ...p, para_compra: val }));
              } else {
                handleChange("para_compra", val);
              }
            }}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="subtle" onClick={closeEdit} disabled={loading}>
              Cancelar
            </Button>
            {modal === "edit" ? (
              <Button
                onClick={handleEditSubmit}
                loading={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Guardar cambios
              </Button>
            ) : (
              <Button
                onClick={(e) => {
                  // Disparar el submit del hook manualmente
                  submit(e as unknown as React.FormEvent<HTMLFormElement>);
                }}
                loading={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Guardar
              </Button>
            )}
          </div>
        </div>
      </ModalEstandar>

      {/* Modal confirmar borrado */}
      <ModalEstandar
        opened={!!confirmDelete}
        close={() => setConfirmDelete(null)}
        title="Eliminar tipo de carbon"
        size="sm"
      >
        <Stack gap="md">
          {deleteError && (
            <Alert
              icon={<IconExclamationCircle size={16} />}
              color="red"
              variant="filled"
            >
              {deleteError}
            </Alert>
          )}
          <Text size="sm" className="text-zinc-300">
            Vas a eliminar el tipo{" "}
            <span className="font-bold text-zinc-100">
              {confirmDelete?.nombre}
            </span>
            . Esta accion no se puede deshacer.
          </Text>
          <Text size="xs" className="text-zinc-500">
            Si el tipo es variante de otro, deberas quitar la asociacion
            primero. Las variantes propias del tipo se borran con el.
          </Text>
          <div className="flex justify-end gap-2">
            <Button variant="subtle" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button
              loading={loading}
              color="red"
              leftSection={<IconTrash size={14} />}
              onClick={handleEliminar}
            >
              Eliminar
            </Button>
          </div>
        </Stack>
      </ModalEstandar>

      {/* Modal administrar variantes */}
      <ModalEstandar
        opened={!!variantesTarget}
        close={closeVariantes}
        title="Variantes"
        size="sm"
      >
        <Stack gap="md">
          {variantesTarget && (
            <div>
              <Text size="sm" fw={600} className="text-zinc-200">
                {variantesTarget.nombre}
              </Text>
              <Text size="xs" className="text-zinc-500">
                Selecciona los tipos (ya existentes) que son variante de este
                tipo.
              </Text>
            </div>
          )}

          <Select
            label="Agregar variante"
            placeholder={
              opcionesSelect.length === 0
                ? "Todos los tipos disponibles ya estan agregados"
                : "Selecciona un tipo para agregarlo"
            }
            radius="xl"
            searchable
            clearable
            disabled={opcionesSelect.length === 0}
            data={opcionesSelect}
            value={pendienteVariante}
            onChange={handleAgregarVariante}
            nothingFoundMessage="Sin tipos disponibles"
            classNames={{
              input:
                "bg-zinc-900/50 border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-white placeholder:text-zinc-500",
              label: "text-zinc-300 mb-1 font-medium text-xs",
            }}
          />

          {variantesSeleccionadas.length === 0 ? (
            <div className="text-zinc-500 text-xs italic px-3 py-2 border border-dashed border-zinc-800 rounded-lg">
              Sin variantes seleccionadas.
            </div>
          ) : (
            <Stack gap="xs">
              {variantesSeleccionadas.map((v) => (
                <div
                  key={v.id_tipo_variante}
                  className="flex items-center justify-between gap-3 p-3 bg-gradient-to-r from-zinc-900/60 to-zinc-900/30 border border-zinc-800 rounded-xl hover:border-indigo-700/60 transition-colors"
                >
                  <Group gap="sm" wrap="nowrap">
                    <Badge
                      variant="filled"
                      color="indigo"
                      radius="xl"
                      size="lg"
                      className="shrink-0"
                    >
                      <IconSettings size={14} stroke={1.8} />
                    </Badge>
                    <div className="flex flex-col min-w-0">
                      <Text
                        size="sm"
                        fw={500}
                        className="text-zinc-100 truncate"
                      >
                        {v.nombre}
                      </Text>
                      {v.codigo && (
                        <Text size="xs" className="text-zinc-500">
                          Codigo: {v.codigo}
                        </Text>
                      )}
                    </div>
                  </Group>
                  <Button
                    variant="subtle"
                    color="red"
                    size="xs"
                    radius="xl"
                    leftSection={<IconX size={14} />}
                    onClick={() => handleQuitarVariante(v.id_tipo_variante)}
                  >
                    Quitar
                  </Button>
                </div>
              ))}
            </Stack>
          )}

          <Text size="xs" className="text-zinc-500">
            Actualmente {variantesSeleccionadas.length} variante(s)
            seleccionada(s).
          </Text>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="subtle" onClick={closeVariantes}>
              Cancelar
            </Button>
            <Button
              loading={variantesCtrl.saving}
              onClick={handleGuardarVariantes}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Guardar variantes
            </Button>
          </div>
        </Stack>
      </ModalEstandar>
    </div>
  );
};
