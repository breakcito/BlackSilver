import { Button, TextInput, Skeleton, Badge } from "@mantine/core";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  Squares2X2Icon,
  UserIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { RegistroLoteMineral } from "./registro-lote-mineral";
import { useLotesMineral } from "../hooks/useLoteMineral";
import { useDisclosure } from "@mantine/hooks";
import { useState, useMemo } from "react";
import dayjs from "dayjs";
import { EstadoLoteMineral } from "../../../shared/enums/lote-mineral";
import type { LoteMineralResumen } from "../service/lote-mineral.responses";
import { useTitlePage } from "../../../hooks/useTitlePage";
import { BotonRecargar } from "../../../presentation/utils/boton-recargar";

export const LoteMineralPage = () => {
  useTitlePage("Lotes de Mineral");
  const [openedCreate, { open: openCreate, close: closeCreate }] =
    useDisclosure(false);
  const [busqueda, setBusqueda] = useState("");

  const { data: response, isLoading, refetch, addLote } = useLotesMineral();

  const lotesFiltrados = useMemo(() => {
    const lotesData = response?.data || [];
    if (!busqueda) return lotesData;
    const term = busqueda.toLowerCase();
    return lotesData.filter(
      (l: LoteMineralResumen) =>
        l.codigo?.toLowerCase().includes(term) ||
        l.contratista.toLowerCase().includes(term) ||
        l.mina.toLowerCase().includes(term),
    );
  }, [response?.data, busqueda]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header — Buscador y Nuevo Lote */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end justify-between">
        <TextInput
          label="Buscar Lote"
          placeholder="Buscar por correlativo, código, contratista..."
          leftSection={<MagnifyingGlassIcon className="size-4 text-zinc-400" />}
          value={busqueda}
          onChange={(e) => setBusqueda(e.currentTarget.value)}
          className="flex-1 min-w-64"
          radius="lg"
          size="sm"
          classNames={{
            label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
            input:
              "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
          }}
        />
        <div className="flex items-end gap-2 shrink-0">
          <BotonRecargar onReload={refetch} loading={isLoading} />
          <Button
            leftSection={<PlusIcon className="size-5" />}
            onClick={openCreate}
            radius="lg"
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20 shrink-0 px-6 font-bold h-[38px] transition-all"
          >
            Nuevo Lote
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={`skeleton-lote-${i}`}
              className="flex flex-col bg-zinc-900/30 border border-zinc-800/40 rounded-2xl p-4"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2.5">
                  <Skeleton height={32} width={32} circle />
                  <div className="flex flex-col gap-1.5">
                    <Skeleton height={16} width={80} radius="sm" />
                    <Skeleton height={10} width={120} radius="sm" />
                  </div>
                </div>
                <Skeleton height={20} width={60} radius="sm" />
              </div>

              <div className="space-y-3 mt-2 flex-1 px-1">
                <div className="flex justify-between items-center">
                  <Skeleton height={12} width={60} radius="sm" />
                  <Skeleton height={12} width={110} radius="sm" />
                </div>
                <div className="flex justify-between items-center">
                  <Skeleton height={12} width={40} radius="sm" />
                  <Skeleton height={12} width={80} radius="sm" />
                </div>
                <div className="flex justify-between items-center">
                  <Skeleton height={12} width={40} radius="sm" />
                  <Skeleton height={12} width={90} radius="sm" />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800/40 flex flex-col gap-3 px-1">
                <div className="flex items-center gap-1.5">
                  <Skeleton height={14} width={14} radius="sm" />
                  <Skeleton height={10} width={130} radius="sm" />
                </div>
                <Skeleton height={24} width={160} radius="sm" />
              </div>
            </div>
          ))}
        </div>
      ) : lotesFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/20 rounded-2xl border border-dashed border-zinc-800">
          <Squares2X2Icon className="size-10 text-zinc-700 mb-3" />
          <p className="text-zinc-500 text-sm font-medium">
            No se encontraron lotes de mineral
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {lotesFiltrados.map((lote: LoteMineralResumen) => (
            <div
              key={lote.id_lote_mineral}
              className="relative bg-linear-to-br from-zinc-900/40 to-zinc-900/10 border border-zinc-800/40 rounded-2xl p-4 flex flex-col hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-900/10 hover:bg-linear-to-br hover:from-indigo-950/20 hover:to-zinc-900/40 transition-all duration-300 group overflow-hidden backdrop-blur-sm"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center size-8 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner group-hover:bg-indigo-500/20 transition-colors">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-4"
                    >
                      <path d="M6 3h12l4 7-10 11L2 10l4-7z" />
                      <path d="M2 10h20" />
                      <path d="M12 21V10" />
                      <path d="M6 3l6 7 6-7" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-zinc-100 font-bold text-sm tracking-tight group-hover:text-indigo-300 transition-colors font-mono">
                      {lote.codigo}
                    </span>
                  </div>
                </div>
                <Badge
                  color={
                    lote.estado === EstadoLoteMineral.Pendiente
                      ? "violet"
                      : "teal"
                  }
                  variant="light"
                  size="xs"
                  radius="sm"
                  className="font-bold uppercase tracking-wider"
                >
                  {lote.estado}
                </Badge>
              </div>

              <div className="space-y-2 mt-2 flex-1 px-1">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 text-xs font-medium">
                    Contratista
                  </span>
                  <span className="text-zinc-300 text-xs font-medium">
                    {lote.contratista}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 text-xs font-medium">
                    Mina
                  </span>
                  <span className="text-zinc-300 text-xs font-medium">
                    {lote.mina}
                  </span>
                </div>
                {lote.labor && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 text-xs font-medium">
                      Labor
                    </span>
                    <span className="text-zinc-300 text-xs font-medium">
                      {lote.labor}
                    </span>
                  </div>
                )}
                {lote.fecha_inicio_produccion && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 text-xs font-medium">
                      Inicio Producción
                    </span>
                    <span className="text-emerald-400 text-xs font-bold">
                      {dayjs(lote.fecha_inicio_produccion).format("DD/MM/YYYY")}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800/40 flex flex-col gap-2 px-1">
                <div className="flex items-center justify-between text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <CalendarDaysIcon
                      className="size-3.5 group-hover:text-indigo-400 transition-colors"
                      strokeWidth={1.5}
                    />
                    <span className="text-[11px] font-medium group-hover:text-zinc-400 transition-colors">
                      Creado:{" "}
                      {dayjs(lote.created_at).format("DD MMM YYYY, HH:mm")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-indigo-500/5 border border-indigo-500/10 w-fit group-hover:bg-indigo-500/10 transition-colors">
                  <UserIcon
                    className="size-3 text-indigo-400"
                    strokeWidth={2}
                  />
                  <span className="text-[10px] font-semibold text-zinc-400">
                    Registrado por:{" "}
                    <span className="text-indigo-200 ml-0.5">
                      {lote.empleado_registro}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CREAR LOTE */}
      <ModalEstandar
        opened={openedCreate}
        close={closeCreate}
        title="Nuevo Lote de Mineral"
        validateClose
        size="lg"
      >
        <RegistroLoteMineral
          onSuccess={(newLote) => {
            closeCreate();
            if (newLote) {
              addLote(newLote);
            } else {
              refetch();
            }
          }}
          onCancel={closeCreate}
        />
      </ModalEstandar>
    </div>
  );
};
