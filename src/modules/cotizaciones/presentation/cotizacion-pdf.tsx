import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import dayjs from "dayjs";
import { formatNumber } from "../../../shared/functions/formatNumber";
import { MONEDAS } from "../../../shared/variables/monedas";
import type {
  RES_Cotizacion,
  RES_CotizacionDetalle,
} from "../../../service/responses/cotizaciones/cotizacion";
import { TipoDespachoCompra } from "../../../shared/enums/_generic/tipo-despacho-compra";

interface EmpresaInfo {
  razon_social: string;
  url_logo: string | null;
}

interface CotizacionData {
  cotizacion: RES_Cotizacion;
  detalles: RES_CotizacionDetalle[];
  empresas?: EmpresaInfo[];
}

interface CotizacionPDFProps {
  cotizaciones: CotizacionData[];
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 30,
    fontSize: 9,
    color: "#27272a", // zinc-800
    fontFamily: "Helvetica",
  },
  logoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f4f4f5",
    paddingBottom: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#52525b", // zinc-600 (acento neutro de cotización)
    paddingBottom: 8,
  },
  companyName: {
    fontSize: 12,
    fontWeight: 700,
    color: "#18181b",
  },
  documentType: {
    fontSize: 18,
    fontWeight: 700,
    color: "#52525b",
    textAlign: "right",
  },
  documentNumber: {
    fontSize: 12,
    fontWeight: 700,
    textAlign: "right",
    marginTop: 2,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: "#71717a",
    textTransform: "uppercase",
    letterSpacing: 1,
    borderLeftWidth: 3,
    borderLeftColor: "#52525b",
    paddingLeft: 6,
    marginBottom: 6,
    marginTop: 10,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f4f4f5",
    paddingVertical: 6,
    alignItems: "center",
  },
  tableHeader: {
    backgroundColor: "#1e293b", // slate-800
    color: "#ffffff",
    fontWeight: 700,
    borderRadius: 2,
  },
  col0: { width: "5%", textAlign: "center" },
  col1: { width: "10%", textAlign: "center" },
  col2: { width: "10%", textAlign: "center" },
  col3: { width: "45%", textAlign: "left", paddingLeft: 8 },
  col4: { width: "15%", textAlign: "right", paddingRight: 8 },
  col5: { width: "15%", textAlign: "right", paddingRight: 8 },
  totalsContainer: {
    marginTop: 15,
    alignSelf: "flex-end",
    width: "35%",
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 4,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  totalLabel: {
    fontWeight: 700,
    color: "#64748b",
  },
  grandTotal: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#52525b",
    paddingTop: 6,
    fontSize: 11,
    color: "#27272a",
    fontWeight: 700,
  },
  signatureSection: {
    marginTop: 40,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureBox: {
    width: "30%",
    alignItems: "center",
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: "#94a3b8",
    width: "100%",
    marginBottom: 4,
  },
  signatureName: {
    fontSize: 8,
    fontWeight: 700,
    textAlign: "center",
  },
  signatureRole: {
    fontSize: 7,
    color: "#64748b",
    textAlign: "center",
    textTransform: "uppercase",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 7,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 8,
  },
});

export const CotizacionPDF = ({ cotizaciones }: CotizacionPDFProps) => {
  return (
    <Document
      title={
        cotizaciones.length === 1
          ? `Cotización - ${cotizaciones[0].cotizacion.correlativo}`
          : "Cotizaciones por Comparativo"
      }
    >
      {cotizaciones.map(({ cotizacion, detalles, empresas }, pageIdx) => {
        const symbol =
          Object.values(MONEDAS).find((m) => m.label === cotizacion.moneda)
            ?.symbol ?? "S/";

        return (
          <Page
            key={cotizacion.id_cotizacion ?? pageIdx}
            size="A4"
            style={styles.page}
          >
            {/* ── Banda de logos superior ── */}
            {empresas &&
              empresas.some((e) => e.url_logo) &&
              (() => {
                const logosConImg = empresas.filter((e) => e.url_logo);
                return (
                  <View style={styles.logoContainer}>
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 20,
                        alignItems: "center",
                      }}
                    >
                      {logosConImg.map((emp, i) => {
                        const isCupper =
                          emp.razon_social.toUpperCase().includes("CUPPER") ||
                          emp.razon_social.toUpperCase().includes("HANNIA");
                        return (
                          <Image
                            key={i}
                            src={emp.url_logo as string}
                            style={
                              isCupper
                                ? {
                                  width: 70,
                                  height: 70,
                                  objectFit: "contain",
                                }
                                : {
                                  width: 110,
                                  height: 40,
                                  objectFit: "contain",
                                }
                            }
                          />
                        );
                      })}
                    </View>
                    <Text style={{ fontSize: 7, color: "#94a3b8" }}>
                      Documento de Cotización Interna
                    </Text>
                  </View>
                );
              })()}

            {/* Header */}
            <View style={styles.header}>
              <View style={{ flex: 1.5 }}>
                <Text style={styles.companyName}>
                  {(empresas && empresas.length > 0
                    ? empresas.map((e) => e.razon_social).join(" - ")
                    : "Cupper & Hannia S.A.C."
                  ).toUpperCase()}
                </Text>
                <Text style={{ fontSize: 7, color: "#64748b", marginTop: 2 }}>
                  Generado para Proceso de Selección
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <Text style={styles.documentType}>COTIZACIÓN</Text>
                <Text style={styles.documentNumber}>
                  N° {cotizacion.correlativo}
                </Text>
                <Text style={{ fontSize: 8, color: "#64748b", marginTop: 4 }}>
                  Fecha de Emisión:{" "}
                  {dayjs(cotizacion.fecha_hora_cotizacion).format("DD/MM/YYYY")}
                </Text>
              </View>
            </View>

            {/* Info Proveedor y Pago */}
            <View style={{ flexDirection: "row", marginBottom: 15, gap: 20 }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: "#f8fafc",
                  padding: 8,
                  borderRadius: 4,
                }}
              >
                <Text style={styles.sectionTitle}>PROVEEDOR</Text>
                <Text style={{ fontWeight: 700, fontSize: 10 }}>
                  {cotizacion.proveedor}
                </Text>
                <Text style={{ fontSize: 8, color: "#64748b", marginTop: 2 }}>
                  Doc: {cotizacion.documento_proveedor}
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  backgroundColor: "#f8fafc",
                  padding: 8,
                  borderRadius: 4,
                }}
              >
                <Text style={styles.sectionTitle}>CONDICIONES DE PAGO</Text>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginTop: 2,
                  }}
                >
                  <Text style={{ fontSize: 8 }}>Método:</Text>
                  <Text style={{ fontSize: 8, fontWeight: 700 }}>
                    {cotizacion.metodo_pago}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ fontSize: 8 }}>Moneda:</Text>
                  <Text style={{ fontSize: 8, fontWeight: 700 }}>
                    {cotizacion.moneda}
                  </Text>
                </View>
                {cotizacion.metodo_pago === "Crédito" &&
                  cotizacion.fecha_vencimiento_pago && (
                    <Text
                      style={{
                        fontWeight: 700,
                        color: "#ef4444",
                        fontSize: 8,
                        marginTop: 4,
                        textAlign: "right",
                      }}
                    >
                      Vence:{" "}
                      {dayjs(cotizacion.fecha_vencimiento_pago).format(
                        "DD/MM/YYYY",
                      )}
                    </Text>
                  )}
              </View>
            </View>

            {/* Tablas de Productos Agrupadas */}
            <View style={styles.section}>
              {(() => {
                const agrupados = detalles.reduce(
                  (acc, det) => {
                    const lugar =
                      det.tipo_despacho === TipoDespachoCompra.Recojo &&
                        det.lugar_recojo
                        ? ` [Lugar: ${det.lugar_recojo}]`
                        : "";
                    const txtDias =
                      det.tiempo_entrega_dias === 1
                        ? "1 día"
                        : `${det.tiempo_entrega_dias} días`;
                    const destinoLabel = det.mina_destino
                      ? `Mina: ${det.mina_destino}`
                      : `Almacén: ${det.almacen_recepcionista}`;
                    const key = `DESTINO: ${destinoLabel} | DESPACHO: ${det.tipo_despacho} (Entrega: ${txtDias})${lugar}`;
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(det);
                    return acc;
                  },
                  {} as Record<string, typeof detalles>,
                );

                return Object.entries(agrupados).map(([grupoName, items]) => (
                  <View key={grupoName} style={{ marginBottom: 15 }}>
                    <Text style={styles.sectionTitle}>
                      {grupoName.toUpperCase()}
                    </Text>

                    {/* Header Tabla */}
                    <View style={[styles.row, styles.tableHeader]}>
                      <Text style={styles.col0}>#</Text>
                      <Text style={styles.col3}>Descripción</Text>
                      <Text style={styles.col2}>U.M.</Text>
                      <Text style={styles.col1}>Cant.</Text>
                      <Text style={styles.col4}>P. Unit.</Text>
                      <Text style={styles.col5}>Total</Text>
                    </View>

                    {/* Filas */}
                    {items.map((det, idx) => {
                      const hasEquivalence =
                        det.id_unidad_medida_base !== det.id_unidad_medida_ctz;

                      return (
                        <View
                          key={det.id_cotizacion_detalle}
                          style={styles.row}
                        >
                          <Text style={styles.col0}>{idx + 1}</Text>
                          <View style={styles.col3}>
                            <Text style={{ fontWeight: 600 }}>
                              {det.producto}
                            </Text>
                            {hasEquivalence && (
                              <Text
                                style={{
                                  fontSize: 8,
                                  color: "#71717a",
                                  marginTop: 2,
                                }}
                              >
                                Eq:{" "}
                                {formatNumber(det.contenido_por_presentacion)}{" "}
                                {det.unidad_medida_base_abv} x{" "}
                                {det.unidad_medida_ctz_abv}
                              </Text>
                            )}
                            {det.comentario && (
                              <Text
                                style={{
                                  fontSize: 8,
                                  color: "#71717a",
                                  marginTop: hasEquivalence ? 1 : 2,
                                }}
                              >
                                Obs: {det.comentario}
                              </Text>
                            )}
                          </View>
                          <Text style={styles.col2}>
                            {det.unidad_medida_ctz_abv}
                          </Text>
                          <Text style={styles.col1}>
                            {formatNumber(det.cantidad)}
                          </Text>
                          <Text style={styles.col4}>
                            {symbol} {formatNumber(det.precio_unitario)}
                          </Text>
                          <Text style={styles.col5}>
                            {symbol}{" "}
                            {formatNumber(det.cantidad * det.precio_unitario)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ));
              })()}
            </View>

            {/* Totales */}
            <View style={styles.totalsContainer}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal:</Text>
                <Text style={{ fontWeight: 700 }}>
                  {symbol}{" "}
                  {formatNumber(
                    cotizacion.total_antes_igv -
                    Number(cotizacion.costo_flete) -
                    Number(cotizacion.otros_gastos),
                  )}
                </Text>
              </View>
              {Number(cotizacion.costo_flete) > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Flete:</Text>
                  <Text style={{ fontWeight: 700 }}>
                    {symbol} {formatNumber(cotizacion.costo_flete)}
                  </Text>
                </View>
              )}
              {Number(cotizacion.otros_gastos) > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Otros:</Text>
                  <Text style={{ fontWeight: 700 }}>
                    {symbol} {formatNumber(cotizacion.otros_gastos)}
                  </Text>
                </View>
              )}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  IGV ({cotizacion.porcentaje_igv}%):
                </Text>
                <Text style={{ fontWeight: 700 }}>
                  {symbol} {formatNumber(cotizacion.monto_igv)}
                </Text>
              </View>
              <View style={[styles.totalRow, styles.grandTotal]}>
                <Text>TOTAL GENERAL:</Text>
                <Text>
                  {symbol} {formatNumber(cotizacion.total_despues_igv)}
                </Text>
              </View>
            </View>

            {/* Observaciones Finales */}
            {cotizacion.observacion && (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.sectionTitle}>OBSERVACIONES</Text>
                <Text
                  style={{
                    fontSize: 8,
                    fontStyle: "italic",
                    color: "#475569",
                    paddingLeft: 6,
                  }}
                >
                  {cotizacion.observacion}
                </Text>
              </View>
            )}

            {/* Firmas */}
            <View style={{ marginTop: 20 }}>
              <Text style={styles.sectionTitle}>AUTORIZADO POR:</Text>
              <View style={styles.signatureSection}>
                <View style={styles.signatureBox}>
                  <View style={styles.signatureLine} />
                  <Text style={styles.signatureName}>
                    Rosa Maria Henriquez Acosta
                  </Text>
                  <Text style={styles.signatureRole}>Gerencia General</Text>
                </View>
                <View style={styles.signatureBox}>
                  <View style={styles.signatureLine} />
                  <Text style={styles.signatureName}>
                    Jhoselyn Henriquez Acosta
                  </Text>
                  <Text style={styles.signatureRole}>Jefe de Logística</Text>
                </View>
              </View>
            </View>

            <View style={{ marginTop: 15 }}>
              <Text style={styles.sectionTitle}>ELABORADO POR:</Text>
              <View
                style={[styles.signatureSection, { justifyContent: "center" }]}
              >
                <View style={styles.signatureBox}>
                  <View style={styles.signatureLine} />
                  <Text style={styles.signatureName}>
                    Ana Cecilia Haro Culquitante
                  </Text>
                  <Text style={styles.signatureRole}>Contabilidad</Text>
                </View>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text>
                Este documento es un reporte de Cotización oficial de Black
                Silver S.A.C.
              </Text>
              <Text>
                Generado automáticamente el{" "}
                {dayjs().format("DD/MM/YYYY HH:mm:ss")}
              </Text>
            </View>
          </Page>
        );
      })}
    </Document>
  );
};
