import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { formatNumber } from "../../../shared/functions/formatNumber";
import { numeroALetras } from "../../../shared/functions/numero-a-letras";
import type {
  CompraCarbonCabeceraDetalle,
  CompraCarbonDetalleItem,
} from "../service/compra-carbon.responses";
import type { RES_Empresa } from "../../../service/responses/empresa";
import type { ProveedorResponse } from "../../proveedores/service/proveedores.responses";

interface CompraCarbonPDFProps {
  compra: {
    cabecera: CompraCarbonCabeceraDetalle;
    detalles: CompraCarbonDetalleItem[];
  };
  empresa: RES_Empresa;
  proveedor?: ProveedorResponse | null;
  urlLogoEmpresa?: string | null;
  colorPredominante?: string | null;
}

const formatPEN = (n: number) => `S/ ${formatNumber(n)}`;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const TIPO_DESPACHO_RECOJO = "recojo";

/** Token unico para los datos que aun no tienen valor disponible. */
const SIN_DATO = "—";

/**
 * Bloque OBSERVACIONES de la OC. El punto 1 declara el precio "puesto en"
 * el destino real de la carga (el almacen de la empresa o el del cliente),
 * no en el domicilio fiscal de la empresa.
 */
const ObservacionesBlock = ({
  nombreEmpresa,
  deposito,
}: {
  nombreEmpresa: string;
  deposito: string;
}) => (
  <View style={STYLES.observaciones}>
    <Text style={STYLES.observacionesTitulo}>OBSERVACIONES:</Text>
    <Text style={STYLES.observacionesTexto}>
      {`1. El precio de la orden de compra es puesto en Mina y/o ${deposito}, deposito de ${nombreEmpresa}.\n`}
      {`1.1. La unidad de transporte debe llegar totalmente encarpado con lona, para evitar la contaminación ambiental durante el trayecto del despacho.\n`}
      {`1.2. La fecha de recepción de unidades de transporte es en horario de Lunes a domingo de 7 am a 5 pm. En caso de requerir entregar cargas fuera de horario, debe ser coordinado previamente con el personal de planta.\n`}
      {`1.3. El material transportado debe cumplir con todos los documentos legales de procedencia. La aceptación de esta orden de compra cuenta como una declaración jurada de que el material entregado es de legal procedencia.\n`}
      {`1.4. El material no será de Uso Energético.\n`}
      {`2. ${nombreEmpresa} dejará constancia de la recepción del material a través de sello y VoBo de la gerencia en la guía de Remisión Remitente proporcionada por el proveedor, una vez sea verificado el correcto llenado de todos los datos de conformidad con la exigencia de La factura debe ser electrónica y debe ser enviada vía email junto al archivo XML. En caso aplique la entrega de guías de remisión y transportista, estos documentos son indispensables para poder emitir el pago.\n`}
      {`2.1. La presente orden de compra tiene una tolerancia de +/- 10%.`}
    </Text>
  </View>
);

const STYLES = StyleSheet.create({
  page: {
    paddingTop: 22,
    paddingBottom: 26,
    paddingHorizontal: 28,
    fontSize: 9,
    color: "#18181b",
    fontFamily: "Helvetica",
  },

  // ── Cabecera ─────────────────────────────────────────────────────────────
  cabecera: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: 14,
  },
  logoCol: { width: 148, justifyContent: "center", paddingRight: 10 },
  logo: { width: 148, height: 66, objectFit: "contain" },
  fiscalCol: { flex: 1, justifyContent: "center", paddingRight: 10 },
  fiscalLinea: { fontSize: 7.5, lineHeight: 1.45, color: "#27272a" },
  fiscalLabel: { fontSize: 7.5, fontWeight: 700, color: "#18181b" },
  emisorBox: {
    width: 186,
    borderWidth: 1,
    borderColor: "#18181b",
    paddingVertical: 6,
    paddingHorizontal: 8,
    justifyContent: "center",
  },
  emisorRazon: { fontSize: 10, fontWeight: 700, lineHeight: 1.2 },
  emisorLinea: { fontSize: 8, textAlign: "center", lineHeight: 1.35 },
  emisorDoc: { fontSize: 9, fontWeight: 700, textAlign: "center" },
  emisorCorrelativo: { fontSize: 9, fontWeight: 700, textAlign: "center" },

  // ── Proveedor ────────────────────────────────────────────────────────────
  etiqueta: { fontSize: 8, fontWeight: 700, color: "#18181b" },
  dato: { fontSize: 8, color: "#27272a" },
  filaDato: {
    flexDirection: "row",
    marginBottom: 4,
    alignItems: "flex-start",
  },

  // ── Tabla de items ───────────────────────────────────────────────────────
  tabla: { borderWidth: 1, borderColor: "#18181b" },
  tablaHeader: {
    flexDirection: "row",
    backgroundColor: "#e4e4e7",
    borderBottomWidth: 1,
    borderBottomColor: "#18181b",
    paddingVertical: 4,
    paddingHorizontal: 5,
  },
  th: { fontSize: 7.5, fontWeight: 700, textAlign: "center" },
  tablaFila: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 5,
    alignItems: "center",
  },
  celdaCant: {
    width: "13%",
    textAlign: "center",
    paddingRight: 6,
    fontSize: 8,
  },
  celdaUm: { width: "7%", textAlign: "center", fontSize: 8 },
  celdaCodigo: { width: "16%", textAlign: "center", paddingHorizontal: 4 },
  celdaFicha: {
    width: "34%",
    textAlign: "center",
    paddingHorizontal: 4,
    fontSize: 6.5,
    lineHeight: 1.35,
    color: "#3f3f46",
  },
  celdaPrecio: {
    width: "15%",
    textAlign: "center",
    paddingHorizontal: 6,
    fontSize: 8,
  },
  celdaImporte: { width: "15%", textAlign: "center", fontSize: 8 },
  celdaCodigoValor: { fontSize: 8, fontWeight: 700, textAlign: "center" },
  celdaCodigoNombre: {
    fontSize: 6,
    textAlign: "center",
    color: "#52525b",
    marginTop: 1,
  },
  celdaVacia: { width: "100%" },
  tablaEspacio: { flexGrow: 1, minHeight: 74 },

  // ── Importe en letras + resumen ──────────────────────────────────────────
  cierreRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 10 },
  letrasCol: { flex: 1, paddingRight: 12 },
  letrasLabel: { fontSize: 8, fontWeight: 700 },
  letrasValor: {
    fontSize: 7.5,
    color: "#27272a",
    marginTop: 2,
    lineHeight: 1.35,
  },
  resumenCol: { width: 196 },
  resumenFila: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 1.5,
  },
  resumenLabel: { fontSize: 8, color: "#27272a" },
  resumenValor: { fontSize: 8 },
  resumenTotalLabel: { fontSize: 8.5, fontWeight: 700 },
  resumenTotalValor: { fontSize: 8.5, fontWeight: 700 },
  dobleLinea: {
    marginTop: 3,
    borderTopWidth: 1,
    borderTopColor: "#18181b",
    paddingTop: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#18181b",
    height: 4,
  },

  // ── Observaciones ────────────────────────────────────────────────────────
  observaciones: { marginTop: 14 },
  observacionesTitulo: {
    fontSize: 8,
    fontWeight: 700,
    marginBottom: 3,
  },
  observacionesTexto: { fontSize: 7, lineHeight: 1.5, color: "#27272a" },

  // ── Firmas ───────────────────────────────────────────────────────────────
  firmasMeta: { flexDirection: "row", marginTop: 14 },
  firmasMetaCol: { flex: 1 },
  firmasMetaColDer: { flex: 1, paddingLeft: 28 },
  firmasMetaLinea: { fontSize: 8, marginBottom: 8 },
  firmasCajas: { flexDirection: "row", gap: 14, marginTop: 6 },
  firmaCaja: {
    flex: 1,
    height: 92,
    borderWidth: 1,
    borderColor: "#18181b",
  },
  firmaPie: {
    flexDirection: "row",
    gap: 14,
    marginTop: 3,
  },
  firmaPieCol: { flex: 1, textAlign: "center" },
  firmaPieTexto: { fontSize: 8, color: "#27272a" },
  firmaPieEstado: {
    fontSize: 8,
    fontWeight: 700,
    textAlign: "center",
    marginTop: 3,
  },
});

export const CompraCarbonPDF = ({
  compra,
  empresa,
  proveedor,
  urlLogoEmpresa,
}: CompraCarbonPDFProps) => {
  const { cabecera, detalles } = compra;

  // ── Montos ───────────────────────────────────────────────────────────────
  // `total_con_descuento` ya viene con el IGV contenido: la linea de IGV es
  // solo disclosure, nunca se suma. El total a pagar descuenta los anticipos.
  const descuentoFlete = Number(cabecera.descuento_flete);
  const gravada = Number(cabecera.total_con_descuento);
  const aplicaIgv = Boolean(cabecera.aplica_igv);
  const igvPct = Number(cabecera.porcentaje_igv);
  const igvMonto = aplicaIgv ? Number(cabecera.monto_igv) : 0;
  const anticipos = Number(cabecera.monto_pagado_anticipos ?? 0);
  /** Lo que efectivamente se le paga al proveedor con esta OC. */
  const totalPagar = gravada - anticipos;

  // ── Destino de la carga (deposito) ───────────────────────────────────────
  const esDestinoCliente = Boolean(cabecera.id_almacen_cliente);
  const depositoNombre = esDestinoCliente
    ? cabecera.cliente_destino?.trim() || null
    : cabecera.almacen?.trim() || null;
  const depositoDireccion = esDestinoCliente
    ? cabecera.almacen_cliente_direccion?.trim() || null
    : cabecera.almacen_direccion?.trim() || null;
  const deposito =
    [depositoNombre, depositoDireccion].filter(Boolean).join(" - ") || SIN_DATO;

  // ── Proveedor ────────────────────────────────────────────────────────────
  const esProveedorNatural =
    (proveedor?.tipo_entidad ?? cabecera.proveedor_tipo_entidad) === "Natural";
  const proveedorNombre =
    proveedor?.razon_social?.trim() || cabecera.proveedor || SIN_DATO;
  const proveedorDocumento = esProveedorNatural
    ? (proveedor?.dni ?? cabecera.proveedor_dni)
    : (proveedor?.ruc ?? cabecera.proveedor_ruc);

  // Direccion de la carga: si es recojo, el almacen del proveedor; si es
  // envio, la direccion fiscal del proveedor.
  const direccionProveedor =
    (cabecera.tipo_despacho === TIPO_DESPACHO_RECOJO
      ? cabecera.almacen_proveedor_direccion?.trim() ||
        proveedor?.direccion?.trim()
      : proveedor?.direccion?.trim()) || SIN_DATO;

  const esPreliminar = (cabecera.estado ?? "") === "Preliminar";

  const fIngreso = dayjs(cabecera.fecha_hora_ingreso).locale("es");
  const fechaIngreso = `${cap(fIngreso.format("dddd"))}, ${fIngreso.date()} de ${cap(
    fIngreso.format("MMMM"),
  )} de ${fIngreso.year()}`;

  return (
    <Document title={`Orden de Compra - ${cabecera.correlativo}`}>
      <Page size="A4" style={STYLES.page}>
        {/* ── Cabecera: logo | domicilio fiscal + deposito | emisor ── */}
        <View style={STYLES.cabecera}>
          <View style={STYLES.logoCol}>
            {urlLogoEmpresa ? (
              <Image src={urlLogoEmpresa} style={STYLES.logo} />
            ) : null}
          </View>

          <View style={STYLES.fiscalCol}>
            {empresa.domicilio_fiscal?.trim() ? (
              <Text style={STYLES.fiscalLinea}>
                <Text style={STYLES.fiscalLabel}>DOMICILIO FISCAL: </Text>
                {empresa.domicilio_fiscal}
              </Text>
            ) : null}
            <Text style={STYLES.fiscalLinea}>
              <Text style={STYLES.fiscalLabel}>DEPOSITO: </Text>
              {deposito}
            </Text>
          </View>

          <View style={STYLES.emisorBox}>
            <Text style={STYLES.emisorRazon}>
              {empresa.razon_social.toUpperCase()}
            </Text>
            <Text style={STYLES.emisorLinea}>{`RUC: ${empresa.ruc}`}</Text>
            <Text style={STYLES.emisorDoc}>
              {esPreliminar
                ? "ORDEN DE COMPRA (PRELIMINAR)"
                : "ORDEN DE COMPRA"}
            </Text>
            <Text style={STYLES.emisorCorrelativo}>
              {`N° ${cabecera.correlativo}`}
            </Text>
          </View>
        </View>

        {/* ── Proveedor ── */}
        <View style={{ marginBottom: 12 }}>
          <View style={STYLES.filaDato}>
            <Text style={[STYLES.etiqueta, { width: 82 }]}>PROVEEDOR:</Text>
            <Text style={[STYLES.dato, { flex: 1 }]}>{proveedorNombre}</Text>
          </View>
          <View style={STYLES.filaDato}>
            <Text style={[STYLES.etiqueta, { width: 82 }]}>RUC:</Text>
            <Text style={[STYLES.dato, { flex: 1 }]}>
              {proveedorDocumento || SIN_DATO}
            </Text>
          </View>
          <View style={STYLES.filaDato}>
            <Text style={[STYLES.etiqueta, { width: 82 }]}>DIRECCIÓN:</Text>
            <Text style={[STYLES.dato, { flex: 1 }]}>{direccionProveedor}</Text>
          </View>
          {/* Slot "ATENCIÓN" reservado: se completa con el contacto del
              proveedor cuando exista ese dato en el catalogo. */}
          <View style={STYLES.filaDato}>
            <Text style={[STYLES.etiqueta, { width: 82 }]}>ATENCIÓN:</Text>
            <Text style={[STYLES.dato, { flex: 1 }]}> </Text>
          </View>
        </View>

        {/* ── Detalle de la carga ── */}
        <View style={STYLES.tabla}>
          <View style={STYLES.tablaHeader}>
            <Text style={[STYLES.th, { width: "13%" }]}>CANTIDAD</Text>
            <Text style={[STYLES.th, { width: "7%" }]}>UM</Text>
            <Text style={[STYLES.th, { width: "16%" }]}>CÓDIGO</Text>
            <Text style={[STYLES.th, { width: "34%" }]}>FICHA TÉCNICA</Text>
            <Text style={[STYLES.th, { width: "15%" }]}>P/U</Text>
            <Text style={[STYLES.th, { width: "15%" }]}>IMPORTE</Text>
          </View>

          {detalles.length === 0 ? (
            <View style={STYLES.tablaFila}>
              <Text style={STYLES.celdaVacia}> </Text>
            </View>
          ) : (
            detalles.map((d) => (
              <View key={d.id_detalle_compra_carbon} style={STYLES.tablaFila}>
                <Text style={STYLES.celdaCant}>
                  {formatNumber(Number(d.cantidad), 3)}
                </Text>
                <Text style={STYLES.celdaUm}>TMS</Text>
                <View style={STYLES.celdaCodigo}>
                  <Text style={STYLES.celdaCodigoValor}>
                    {d.tipo_carbon_codigo?.trim() || SIN_DATO}
                  </Text>
                  <Text style={STYLES.celdaCodigoNombre}>
                    {d.tipo_carbon_nombre}
                  </Text>
                </View>
                <Text style={STYLES.celdaFicha}>
                  {Array.isArray(d.tipo_carbon_ficha_tecnica) &&
                  d.tipo_carbon_ficha_tecnica.length > 0
                    ? d.tipo_carbon_ficha_tecnica
                        .map((ficha) => String(ficha).trim())
                        .filter(Boolean)
                        .join(" · ")
                    : SIN_DATO}
                </Text>
                <Text style={STYLES.celdaPrecio}>
                  {formatPEN(Number(d.precio_unitario))}
                </Text>
                <Text style={STYLES.celdaImporte}>
                  {formatPEN(Number(d.subtotal_con_descuento))}
                </Text>
              </View>
            ))
          )}

          {/* Espacio en blanco para el llenado manual de cargas adicionales. */}
          <View style={STYLES.tablaEspacio} />
        </View>

        {/* ── Importe en letras + resumen ── */}
        <View style={STYLES.cierreRow}>
          <View style={STYLES.letrasCol}>
            <Text style={STYLES.letrasLabel}>IMPORTE EN LETRAS:</Text>
            <Text style={STYLES.letrasValor}>
              {`${numeroALetras(totalPagar)} ${totalPagar === 1 ? "SOL" : "SOLES"}`}
            </Text>
          </View>

          <View style={STYLES.resumenCol}>
            <View style={STYLES.resumenFila}>
              <Text style={STYLES.resumenLabel}>INAFECTA</Text>
              <Text style={STYLES.resumenValor} />
            </View>
            {descuentoFlete > 0 && (
              <View style={STYLES.resumenFila}>
                <Text style={STYLES.resumenLabel}>{`(-) DESCUENTO FLETE`}</Text>
                <Text style={STYLES.resumenValor}>
                  {`-${formatPEN(descuentoFlete)}`}
                </Text>
              </View>
            )}
            <View style={STYLES.resumenFila}>
              <Text style={STYLES.resumenLabel}>GRAVADA</Text>
              <Text style={STYLES.resumenValor}>{formatPEN(gravada)}</Text>
            </View>
            <View style={STYLES.resumenFila}>
              <Text style={STYLES.resumenLabel}>
                {aplicaIgv ? `IGV ${formatNumber(igvPct)}%` : "IGV"}
              </Text>
              <Text style={STYLES.resumenValor}>
                {aplicaIgv ? formatPEN(igvMonto) : "No aplica"}
              </Text>
            </View>
            {anticipos > 0 && (
              <View style={STYLES.resumenFila}>
                <Text style={STYLES.resumenLabel}>{`(-) ANTICIPOS`}</Text>
                <Text style={STYLES.resumenValor}>
                  {`-${formatPEN(anticipos)}`}
                </Text>
              </View>
            )}
            <View style={STYLES.resumenFila}>
              <Text style={STYLES.resumenTotalLabel}>TOTAL</Text>
              <Text style={STYLES.resumenTotalValor}>
                {formatPEN(totalPagar)}
              </Text>
            </View>
            <View style={STYLES.dobleLinea} />
          </View>
        </View>

        {/* ── Observaciones ── */}
        <ObservacionesBlock
          nombreEmpresa={empresa.razon_social}
          deposito={deposito}
        />

        {/* ── Firmas: datos de emision (izq) + slots del proveedor (der) ── */}
        <View style={STYLES.firmasMeta}>
          <View style={STYLES.firmasMetaCol}>
            <Text style={STYLES.firmasMetaLinea}>
              {`Por: ${empresa.razon_social}`}
            </Text>
            <Text style={STYLES.firmasMetaLinea}>
              {`Creado por: ${cabecera.empleado_registro || SIN_DATO}`}
            </Text>
            <Text style={STYLES.firmasMetaLinea}>
              {`Aprobado por: ${
                cabecera.empleado_aprueba_liquidacion?.trim() ||
                cabecera.empleado_aprueba?.trim() ||
                SIN_DATO
              }`}
            </Text>
            <Text style={STYLES.firmasMetaLinea}>
              {`Fecha: ${fechaIngreso}`}
            </Text>
          </View>

          {/* Slots sin valor: los completa a mano el proveedor al aceptar. */}
          <View style={STYLES.firmasMetaColDer}>
            <Text style={STYLES.firmasMetaLinea}>Proveedor:</Text>
            <Text style={STYLES.firmasMetaLinea}>Nombre y Apellido:</Text>
            <Text style={STYLES.firmasMetaLinea}>D.N.I:</Text>
            <Text style={STYLES.firmasMetaLinea}>Fecha:</Text>
          </View>
        </View>

        <View style={STYLES.firmasCajas}>
          <View style={STYLES.firmaCaja} />
          <View style={STYLES.firmaCaja} />
        </View>
        <View style={STYLES.firmaPie}>
          <View style={STYLES.firmaPieCol}>
            <Text style={STYLES.firmaPieTexto}>Firma y Sello</Text>
            <Text style={STYLES.firmaPieEstado}>APROBADO</Text>
          </View>
          <View style={STYLES.firmaPieCol}>
            <Text style={STYLES.firmaPieTexto}>Firma y Sello</Text>
            <Text style={STYLES.firmaPieEstado}>ACEPTADA</Text>
          </View>
        </View>
        {/* 
        <Text style={[STYLES.pie, { color: pieColor }]}>
          {`Documento generado automáticamente por el sistema ${empresa.razon_social} · ${cabecera.correlativo}`}
        </Text> */}
      </Page>
    </Document>
  );
};
