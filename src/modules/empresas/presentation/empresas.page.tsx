import { useEffect } from "react";
import { Button, TextInput, Skeleton, Text, Stack, Group } from "@mantine/core";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  Squares2X2Icon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { IconUpload } from "@tabler/icons-react";
import { useTitlePage } from "../../../hooks/useTitlePage";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { ArchivoCard } from "../../../presentation/utils/archivo/archivo-card";
import { MultiFilePicker } from "../../../presentation/utils/archivo/multifile-picker";
import { FormCuentaEmpresa } from "../../../presentation/utils/form-cuenta-empresa";
import { RegistroEmpresa } from "./registro-empresa";
import { RegistroOficina } from "./registro-oficina";
import { EdicionCuenta } from "./edicion-cuenta";
import { useEmpresas } from "../hooks/useEmpresas";
import { useRegistroEmpresa } from "../hooks/useRegistroEmpresa";
import { useRegistroOficina } from "../hooks/useRegistroOficina";
import { useEdicionCuenta } from "../hooks/useEdicionCuenta";
import { EmpresaCard } from "./empresa-card";
import { useState } from "react";

import { BotonRecargar } from "../../../presentation/utils/boton-recargar";

export const EmpresasPage = () => {
  useTitlePage("Empresas");

  const {
    loading,
    busqueda,
    setBusqueda,
    empresasFiltradas,
    recargar,
    openedCreate,
    openCreate,
    closeCreate,
    empresaParaOficina,
    openedOficina,
    onOpenOficinaModal,
    closeOficinaModal,
    onOficinaCreada,
    onEmpresaCreada,
    handleUpdateLogo,
    handleRemoveLogo,
    handleUpdateColorPredominante,
    empresaParaDocumentos,
    openedDocumentos,
    onOpenDocumentosModal,
    closeDocumentosModal,
    handleAgregarDocumentos,
    handleEliminarDocumento,
    handleAgregarCuenta,
    handleEditarCuenta,
    handleToggleEstadoCuenta,
    empresaParaCuenta,
    openedCrearCuenta,
    onOpenCrearCuentaModal,
    closeCrearCuentaModal,
    cuentaParaEditar,
    openedEditarCuenta,
    onOpenEditarCuentaModal,
    closeEditarCuentaModal,
  } = useEmpresas();

  const registro = useRegistroEmpresa({
    onSuccess: onEmpresaCreada,
    onClose: closeCreate,
  });

  const registroOficina = useRegistroOficina({
    onSuccess: onOficinaCreada,
    onClose: closeOficinaModal,
  });

  const edicionCuenta = useEdicionCuenta({
    onSuccess: handleEditarCuenta,
    onClose: closeEditarCuentaModal,
  });

  const { cargarCuenta } = edicionCuenta;

  // Estado local para subir nuevos docs en el modal de documentos
  const [nuevosDocumentos, setNuevosDocumentos] = useState<File[]>([]);
  const [subiendoDocs, setSubiendoDocs] = useState(false);

  const handleSubirDocumentos = async () => {
    if (!empresaParaDocumentos || nuevosDocumentos.length === 0) return;
    setSubiendoDocs(true);
    const ok = await handleAgregarDocumentos(
      empresaParaDocumentos.id_empresa,
      nuevosDocumentos,
    );
    if (ok) setNuevosDocumentos([]);
    setSubiendoDocs(false);
  };

  useEffect(() => {
    if (empresaParaOficina) {
      registroOficina.setIdEmpresa(empresaParaOficina.id_empresa);
    }
  }, [empresaParaOficina, registroOficina]);

  useEffect(() => {
    if (cuentaParaEditar) {
      cargarCuenta(cuentaParaEditar);
    }
  }, [cuentaParaEditar, cargarCuenta]);

  // Limpiar nuevos docs al cerrar el modal
  const handleCloseDocumentos = () => {
    setNuevosDocumentos([]);
    closeDocumentosModal();
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-4 items-end justify-between">
        <div className="flex flex-1 gap-4 w-full">
          <TextInput
            label="Buscar Empresa"
            placeholder="Buscar empresas por nombre o RUC..."
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
                "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500",
              label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
            }}
          />
        </div>
        <div className="flex gap-2 items-center shrink-0">
          <BotonRecargar onReload={recargar} loading={loading} />
          <Button
            leftSection={<PlusIcon className="w-5 h-5" />}
            onClick={openCreate}
            radius="lg"
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-900/20 shrink-0 px-6 font-semibold h-9.5"
          >
            Nueva Empresa
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-center gap-3">
                <Skeleton height={52} width={52} radius={12} />
                <div className="flex-1 space-y-2">
                  <Skeleton height={14} width="80%" radius="md" />
                  <Skeleton height={10} width="40%" radius="md" />
                </div>
              </div>
              <Skeleton height={60} radius="md" />
            </div>
          ))}
        </div>
      ) : empresasFiltradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-zinc-900/10 rounded-[40px] border border-dashed border-zinc-800/50">
          <div className="bg-zinc-900/50 p-6 rounded-full mb-4 border border-zinc-800">
            <Squares2X2Icon className="w-10 h-10 text-zinc-700" />
          </div>
          <Text size="sm" fw={600} className="text-zinc-500">
            No se encontraron empresas registradas
          </Text>
          <Text size="xs" className="text-zinc-600 mt-1">
            Intenta con otro término de búsqueda o registra una nueva
          </Text>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {empresasFiltradas.map((empresa) => (
            <EmpresaCard
              key={empresa.id_empresa}
              empresa={empresa}
              onUpdateLogo={handleUpdateLogo}
              onRemoveLogo={handleRemoveLogo}
              onUpdateColorPredominante={handleUpdateColorPredominante}
              onAddOficina={onOpenOficinaModal}
              onOpenDocumentos={onOpenDocumentosModal}
              onAddCuenta={() =>
                onOpenCrearCuentaModal(empresa.id_empresa, empresa.razon_social)
              }
              onEditCuenta={(cuenta) => onOpenEditarCuentaModal(cuenta)}
              onToggleEstadoCuenta={(id_cuenta_bancaria, estadoActual) =>
                handleToggleEstadoCuenta(
                  empresa.id_empresa,
                  id_cuenta_bancaria,
                  estadoActual,
                )
              }
            />
          ))}
        </div>
      )}

      {/* Modal: Registrar Empresa */}
      <ModalEstandar
        opened={openedCreate}
        close={closeCreate}
        title="Registrar Empresa"
        validateClose
        size="sm"
      >
        <RegistroEmpresa
          ruc={registro.ruc}
          setRuc={registro.setRuc}
          razonSocial={registro.razonSocial}
          setRazonSocial={registro.setRazonSocial}
          domicilioFiscal={registro.domicilioFiscal}
          setDomicilioFiscal={registro.setDomicilioFiscal}
          logoFile={registro.logoFile}
          setLogoFile={registro.setLogoFile}
          colorPredominante={registro.colorPredominante}
          setColorPredominante={registro.setColorPredominante}
          documentosFiles={registro.documentosFiles}
          setDocumentosFiles={registro.setDocumentosFiles}
          error={registro.error}
          loading={registro.loading}
          onSave={registro.handleGuardar}
          onCancel={() => {
            closeCreate();
            registro.reset();
          }}
        />
      </ModalEstandar>

      {/* Modal: Registrar Oficina */}
      <ModalEstandar
        opened={openedOficina}
        close={closeOficinaModal}
        title="Registrar Oficina"
        validateClose
        size="md"
      >
        {empresaParaOficina && (
          <RegistroOficina
            idEmpresa={
              registroOficina.idEmpresa ?? empresaParaOficina.id_empresa
            }
            empresaNombre={empresaParaOficina.razon_social}
            nombre={registroOficina.nombre}
            setNombre={registroOficina.setNombre}
            direccion={registroOficina.direccion}
            setDireccion={registroOficina.setDireccion}
            esPrincipal={registroOficina.esPrincipal}
            setEsPrincipal={registroOficina.setEsPrincipal}
            error={registroOficina.error}
            loading={registroOficina.loading}
            onSave={registroOficina.handleGuardar}
            onCancel={() => {
              closeOficinaModal();
              registroOficina.reset();
            }}
          />
        )}
      </ModalEstandar>

      {/* Modal: Documentos de Empresa */}
      <ModalEstandar
        opened={openedDocumentos}
        close={handleCloseDocumentos}
        title={`Documentos — ${empresaParaDocumentos?.razon_social ?? ""}`}
        size="lg"
      >
        {empresaParaDocumentos && (
          <Stack gap="md">
            {/* Documentos existentes */}
            {(empresaParaDocumentos.documentos?.length ?? 0) > 0 ? (
              <div className="flex flex-col gap-2">
                <Text
                  size="xs"
                  fw={700}
                  className="text-zinc-400 uppercase tracking-wider"
                >
                  Archivos adjuntos ({empresaParaDocumentos.documentos.length})
                </Text>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {empresaParaDocumentos.documentos.map((doc) => (
                    <ArchivoCard
                      key={doc.path_relativo}
                      archivo={doc}
                      onRemove={() =>
                        handleEliminarDocumento(
                          empresaParaDocumentos.id_empresa,
                          doc.path_relativo,
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-6 rounded-xl border border-dashed border-zinc-800/60">
                <DocumentTextIcon className="w-8 h-8 text-zinc-700" />
                <Text size="xs" c="zinc.6">
                  Sin documentos adjuntos
                </Text>
              </div>
            )}

            {/* Subir nuevos documentos */}
            <MultiFilePicker
              files={nuevosDocumentos}
              onFilesChange={setNuevosDocumentos}
              label="Agregar documentos"
              description="PDF, imágenes, Word, Excel — máx. 10 MB por archivo"
              accept="image/png,image/jpeg,image/jpg,application/pdf,.docx,.xlsx"
              multiple
            />

            {nuevosDocumentos.length > 0 && (
              <Group justify="flex-end">
                <Button
                  size="sm"
                  radius="lg"
                  loading={subiendoDocs}
                  leftSection={<IconUpload size={16} />}
                  onClick={handleSubirDocumentos}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white border-0"
                >
                  Subir {nuevosDocumentos.length} archivo
                  {nuevosDocumentos.length > 1 ? "s" : ""}
                </Button>
              </Group>
            )}
          </Stack>
        )}
      </ModalEstandar>

      {/* Modal: Registrar Cuenta Bancaria */}
      <ModalEstandar
        opened={openedCrearCuenta}
        close={closeCrearCuentaModal}
        title={`Nueva Cuenta — ${empresaParaCuenta?.razon_social ?? ""}`}
        size="md"
        validateClose
        closeConfirmationMessage="Vas a descartar el registro de la nueva cuenta bancaria y se perderán los datos ingresados."
      >
        {empresaParaCuenta && (
          <FormCuentaEmpresa
            id_empresa={empresaParaCuenta.id_empresa}
            onSuccess={(cuenta) => {
              handleAgregarCuenta(cuenta);
              closeCrearCuentaModal();
            }}
            onCancel={closeCrearCuentaModal}
          />
        )}
      </ModalEstandar>

      {/* Modal: Editar Cuenta Bancaria */}
      <ModalEstandar
        opened={openedEditarCuenta}
        close={closeEditarCuentaModal}
        title="Editar Cuenta Bancaria"
        size="md"
        validateClose
        closeConfirmationMessage="Vas a descartar los cambios no guardados de esta cuenta bancaria."
      >
        {cuentaParaEditar && (
          <EdicionCuenta
            hook={edicionCuenta}
            onCancel={closeEditarCuentaModal}
          />
        )}
      </ModalEstandar>
    </div>
  );
};

export default EmpresasPage;
