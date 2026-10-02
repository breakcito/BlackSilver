import { Button, TextInput, Text } from "@mantine/core";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  Square3Stack3DIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";

import { useTitlePage } from "../../../hooks/useTitlePage";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";

import { useConcesiones } from "../hooks/useConcesiones";
import { useNuevoContrato } from "../hooks/useNuevoContrato";
import { RegistroConcesion } from "./registro-concesion";
import { ConcesionCard, ConcesionCardSkeleton } from "./concesion-card";
import { NuevoContrato } from "./nuevo-contrato";
import { EvidenciasModal } from "./evidencias-modal";

import { BotonRecargar } from "../../../presentation/utils/boton-recargar";

export const ConcesionesPage = () => {
  useTitlePage("Concesiones");

  const {
    concesiones,
    loading,
    busqueda,
    setBusqueda,
    recargar,
    pushNuevaConcesion,

    openedRegistro,
    openRegistro,
    closeRegistro,

    concesionParaContrato,
    openedNuevoContrato,
    openNuevoContratoModal,
    closeNuevoContratoModal,
    pushNuevoContrato,

    contratoParaEvidencias,
    openedEvidencias,
    openEvidenciasModal,
    closeEvidenciasModal,
    handleSubirEvidencias,
    handleEliminarEvidencia,

    loadingIdContrato,
    handleTerminarContrato,
  } = useConcesiones();

  const { handleCrearContrato } = useNuevoContrato(
    concesionParaContrato?.id_concesion ?? 0,
    (nuevo) =>
      pushNuevoContrato(concesionParaContrato?.id_concesion ?? 0, nuevo),
  );

  // Empresas con contrato activo dentro de la concesión seleccionada
  const [empresasConContratoActivo, setEmpresasConContratoActivo] = useState<
    number[]
  >([]);

  const onOpenNuevoContrato = (id_concesion: number) => {
    const c = concesiones.find((x) => x.id_concesion === id_concesion);
    if (!c) return;
    setEmpresasConContratoActivo(
      (c.contratos ?? [])
        .filter((ct) => ct.estado === "Activo")
        .map((ct) => ct.id_empresa),
    );
    openNuevoContratoModal(c);
  };

  const onSubmitContrato = async (
    id_empresa: number,
    fecha_inicio: string,
    fecha_fin: string | null,
    evidencias: File[],
  ) => {
    await handleCrearContrato(id_empresa, fecha_inicio, fecha_fin, evidencias);
    closeNuevoContratoModal();
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-end justify-between">
        <div className="flex flex-1 gap-4 w-full">
          <TextInput
            label="Buscar Concesión"
            placeholder="Buscar por nombre o código..."
            leftSection={
              <MagnifyingGlassIcon className="w-4 h-4 text-zinc-400" />
            }
            value={busqueda}
            onChange={(e) => setBusqueda(e.currentTarget.value)}
            className="flex-1 min-w-64"
            radius="lg"
            size="sm"
            classNames={{
              input:
                "bg-zinc-900/50 border-zinc-800 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 text-white placeholder:text-zinc-500",
              label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
            }}
          />
        </div>
        <div className="flex gap-2 items-center shrink-0">
          <BotonRecargar onReload={recargar} loading={loading} />
          <Button
            leftSection={<PlusIcon className="w-5 h-5" />}
            onClick={openRegistro}
            radius="lg"
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20 shrink-0 h-9.5 px-6 font-semibold"
          >
            Nueva Concesión
          </Button>
        </div>
      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <ConcesionCardSkeleton key={i} />
          ))}
        </div>
      ) : concesiones.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/20 rounded-4xl border border-dashed border-zinc-800">
          <Square3Stack3DIcon className="w-12 h-12 text-zinc-700 mb-4" />
          <Text size="lg" fw={600} className="text-zinc-500">
            No se encontraron concesiones
          </Text>
          <Text size="sm" className="text-zinc-600 mt-1">
            Intenta con otro término de búsqueda o registra una nueva.
          </Text>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {concesiones.map((concesion) => (
            <ConcesionCard
              key={concesion.id_concesion}
              concesion={concesion}
              loadingIdContrato={loadingIdContrato}
              onAddContrato={(c) => onOpenNuevoContrato(c.id_concesion)}
              onOpenEvidencias={openEvidenciasModal}
              onTerminarContrato={handleTerminarContrato}
            />
          ))}
        </div>
      )}

      {/* Modal: Registrar Concesión */}
      <ModalEstandar
        opened={openedRegistro}
        close={closeRegistro}
        validateClose
        title="Registrar Concesión"
        size="md"
      >
        <RegistroConcesion
          onSuccess={(nueva) => {
            pushNuevaConcesion({ ...nueva, contratos: [] });
            closeRegistro();
          }}
          onCancel={closeRegistro}
        />
      </ModalEstandar>

      {/* Modal: Registrar Contrato (solo registro, sin listado) */}
      <ModalEstandar
        opened={openedNuevoContrato}
        close={closeNuevoContratoModal}
        title={`Contrato — ${concesionParaContrato?.nombre ?? ""}`}
        size="md"
      >
        {concesionParaContrato && (
          <NuevoContrato
            idConcesion={concesionParaContrato.id_concesion}
            nombreConcesion={concesionParaContrato.nombre}
            empresasConContratoActivo={empresasConContratoActivo}
            onSubmit={onSubmitContrato}
          />
        )}
      </ModalEstandar>

      {/* Modal: Evidencias del Contrato */}
      <EvidenciasModal
        opened={openedEvidencias}
        onClose={closeEvidenciasModal}
        titulo={`Evidencias — ${contratoParaEvidencias?.razon_social ?? ""}`}
        archivos={contratoParaEvidencias?.evidencias ?? []}
        onSubir={(files) =>
          contratoParaEvidencias
            ? handleSubirEvidencias(contratoParaEvidencias.id_contrato, files)
            : Promise.resolve(false)
        }
        onEliminar={(path) =>
          contratoParaEvidencias
            ? handleEliminarEvidencia(contratoParaEvidencias.id_contrato, path)
            : Promise.resolve(false)
        }
      />
    </div>
  );
};

export default ConcesionesPage;
