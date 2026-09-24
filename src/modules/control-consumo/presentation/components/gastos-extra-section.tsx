import { useState, useEffect, useMemo } from "react";
import {
  Card,
  Group,
  Stack,
  Text,
  Badge,
  Button,
  SimpleGrid,
  Select,
  Textarea,
  NumberInput,
} from "@mantine/core";
import {
  BanknotesIcon,
  PlusIcon,
  MapPinIcon,
  CalendarDaysIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import { AuxService } from "../../../../service/auxiliar.service";
import { ControlConsumoService } from "../../service/control-consumo.service";
import { useNotify } from "../../../../hooks/useNotify";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import type { RES_Labor } from "../../../../service/responses/labor";
import type { RES_GastoExtra } from "../../service/control-consumo.responses";

interface GastosExtraSectionProps {
  gastos: RES_GastoExtra[];
  onGastoRegistrado: (gasto: RES_GastoExtra) => void;
  loading?: boolean;
}

export const GastosExtraSection = ({
  gastos,
  onGastoRegistrado,
}: GastosExtraSectionProps) => {
  const { notifySuccess, notifyError } = useNotify();

  // Modal registration state
  const [modalOpen, setModalOpen] = useState(false);
  const [labores, setLabores] = useState<RES_Labor[]>([]);
  const [loadingLabores, setLoadingLabores] = useState(false);

  const [idLabor, setIdLabor] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState<number | string>("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch labors when opening modal
  useEffect(() => {
    if (modalOpen && labores.length === 0) {
      const fetchLabores = async () => {
        setLoadingLabores(true);
        try {
          const resp = await AuxService.get_labores();
          if (resp.success && resp.data) {
            setLabores(resp.data);
          }
        } catch (err) {
          console.error("Error al cargar labores:", err);
        } finally {
          setLoadingLabores(false);
        }
      };
      fetchLabores();
    }
  }, [modalOpen, labores.length]);

  const laborsData = useMemo(() => {
    const groupsMap = new Map<
      string,
      Array<{ value: string; label: string }>
    >();
    labores.forEach((l) => {
      let groupItems = groupsMap.get(l.mina);
      if (!groupItems) {
        groupItems = [];
        groupsMap.set(l.mina, groupItems);
      }
      groupItems.push({
        value: String(l.id_labor),
        label: l.nombre || "S/N",
      });
    });

    const dataList: Array<{
      group: string;
      items: Array<{ value: string; label: string }>;
    }> = [];
    groupsMap.forEach((items, mina) => {
      dataList.push({ group: mina, items });
    });
    return dataList;
  }, [labores]);

  const totalGastos = useMemo(() => {
    return gastos.reduce((acc, g) => acc + Number(g.monto || 0), 0);
  }, [gastos]);

  const handleOpenModal = () => {
    setIdLabor(null);
    setDescripcion("");
    setMonto("");
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setIdLabor(null);
    setDescripcion("");
    setMonto("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idLabor) {
      notifyError("Debe seleccionar una labor.");
      return;
    }
    const desc = descripcion.trim();
    if (!desc) {
      notifyError("La descripción es obligatoria.");
      return;
    }
    const montoNum = Number(monto);
    if (!monto || isNaN(montoNum) || montoNum <= 0) {
      notifyError("Debe ingresar un monto válido mayor a 0.");
      return;
    }

    setSubmitting(true);
    try {
      const resp = await ControlConsumoService.registrarGastoExtra({
        id_labor: Number(idLabor),
        descripcion: desc,
        monto: montoNum,
      });

      if (resp.success && resp.data) {
        notifySuccess("Gasto extra registrado exitosamente.");
        onGastoRegistrado(resp.data);
        handleCloseModal();
      } else {
        notifyError(resp.message || "Error al registrar el gasto extra.");
      }
    } catch (err) {
      console.error(err);
      notifyError("Error de conexión al registrar el gasto.");
    } finally {
      setSubmitting(false);
    }
  };

  const modalFieldClasses = {
    input:
      "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
    label: "text-zinc-300 mb-1 font-semibold text-xs ml-0.5",
    dropdown:
      "bg-zinc-950 border-zinc-800 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl",
    option:
      "text-zinc-300 hover:bg-zinc-800 hover:text-white data-[selected]:bg-indigo-600 data-[selected]:text-white font-medium transition-colors",
  };

  return (
    <Card
      withBorder
      p="md"
      radius="xl"
      className="bg-zinc-900/40 border-zinc-800/80 shadow-md backdrop-blur-md"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <Group gap="xs" wrap="wrap">
          <div className="p-1.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <BanknotesIcon className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <Text
              size="xs"
              fw={800}
              className="text-zinc-100 uppercase tracking-wider"
            >
              Gastos Extra
            </Text>
          </div>
          <Badge
            color="emerald"
            variant="light"
            size="sm"
            className="font-extrabold uppercase border border-emerald-500/20"
          >
            Total: S/. {formatNumber(totalGastos, 2)}
          </Badge>
          <Badge
            color="zinc"
            variant="light"
            size="sm"
            className="font-semibold"
          >
            {gastos.length} {gastos.length === 1 ? "registro" : "registros"}
          </Badge>
        </Group>

        <Button
          size="xs"
          radius="lg"
          color="indigo"
          leftSection={<PlusIcon className="w-3.5 h-3.5" />}
          onClick={handleOpenModal}
          className="shadow-sm font-semibold hover:shadow-indigo-500/20 transition-all"
        >
          Registrar Gasto Extra
        </Button>
      </div>

      {gastos.length === 0 ? (
        <div className="py-5 px-4 text-center border border-dashed border-zinc-800/80 rounded-xl bg-zinc-950/20">
          <Text size="xs" c="dimmed" fs="italic">
            Sin gastos extra registrados en este período. Puedes registrar uno
            con el botón superior.
          </Text>
        </div>
      ) : (
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing="sm">
          {gastos.map((g) => (
            <div
              key={g.id_gasto_extra}
              className="bg-zinc-950/50 border border-zinc-800/60 hover:border-zinc-700/60 rounded-xl p-3 flex flex-col justify-between transition-all shadow-inner"
            >
              <Stack gap={4}>
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    size="xs"
                    color="indigo"
                    variant="light"
                    className="font-bold border border-indigo-500/20 truncate"
                  >
                    <MapPinIcon className="w-3 h-3 inline mr-0.5" />
                    {g.labor}
                  </Badge>
                  {g.mina && (
                    <Text
                      size="9px"
                      c="zinc.5"
                      fw={600}
                      className="uppercase tracking-wider truncate"
                    >
                      {g.mina}
                    </Text>
                  )}
                </div>

                <Text
                  size="xs"
                  className="text-zinc-200 font-medium line-clamp-2 mt-1 leading-snug"
                  title={g.descripcion}
                >
                  {g.descripcion}
                </Text>
              </Stack>

              <div className="pt-2 border-t border-zinc-800/50 flex items-center justify-between gap-2">
                <Text size="xs" fw={900} className="text-emerald-400">
                  S/. {formatNumber(g.monto, 2)}
                </Text>

                <div className="text-right">
                  <Text
                    size="10px"
                    c="gray.4"
                    fw={600}
                    className="flex items-center gap-1 justify-end"
                  >
                    <CalendarDaysIcon className="w-3 h-3 text-zinc-500" />
                    {dayjs(g.created_at).format("DD/MM/YYYY")}
                  </Text>
                  {g.empleado_registro && (
                    <Text
                      size="10px"
                      c="gray.4"
                      fw={600}
                      className="truncate max-w-30"
                      title={g.empleado_registro}
                    >
                      <UserIcon className="w-2.5 h-2.5 inline mr-0.5 text-zinc-500" />
                      {g.empleado_registro}
                    </Text>
                  )}
                </div>
              </div>
            </div>
          ))}
        </SimpleGrid>
      )}

      {/* Modal Registrar Gasto Extra */}
      <ModalEstandar
        opened={modalOpen}
        close={handleCloseModal}
        title="Registrar Gasto Extra"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Group>
            <Select
              label="Labor"
              placeholder={
                loadingLabores ? "Cargando labores..." : "Selecciona una labor"
              }
              data={laborsData}
              value={idLabor}
              onChange={setIdLabor}
              searchable
              clearable
              required
              size="xs"
              radius="lg"
              classNames={modalFieldClasses}
              disabled={loadingLabores}
              comboboxProps={{ withinPortal: true }}
              nothingFoundMessage="No se encontraron labores"
            />

            <NumberInput
              label="Monto (S/.)"
              placeholder="0.00"
              value={monto}
              onChange={setMonto}
              step={0.01}
              fixedDecimalScale
              hideControls
              required
              size="xs"
              radius="lg"
              classNames={modalFieldClasses}
              prefix="S/. "
            />
          </Group>

          <Textarea
            label="Descripción"
            placeholder="Ej: Servicio de mantenimiento correctivo, avería de manguera, etc."
            value={descripcion}
            onChange={(e) => setDescripcion(e.currentTarget.value)}
            required
            minRows={2}
            maxRows={4}
            size="xs"
            radius="lg"
            classNames={modalFieldClasses}
          />

          <Group justify="flex-end" gap="xs" mt="lg">
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              radius="lg"
              onClick={handleCloseModal}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              color="indigo"
              size="xs"
              radius="lg"
              loading={submitting}
              className="shadow-sm font-semibold"
            >
              Guardar Gasto
            </Button>
          </Group>
        </form>
      </ModalEstandar>
    </Card>
  );
};
