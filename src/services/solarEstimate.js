// Estimación del sistema solar usando el modelo de Machine Learning del backend.
//
// - getMlCities():        GET  /ml/ciudades  -> catálogo de ciudades
// - estimateSolarSystem(): POST /ml/estimar  -> dimensionamiento con HSP predichas
// - buildCalculationResult(): convierte la respuesta al formato que ya usan
//   el historial, la pantalla de resultados y POST /calculos.
// - fallbackEstimate():   cálculo aproximado SIN conexión (fórmula anterior de
//   75 kWh por panel), para que la app no se bloquee si el servidor no responde.
import { apiRequest } from "@/src/services/apiClient";

export const DEFAULT_CITY = { id: "girardot", nombre: "Girardot", departamento: "Cundinamarca" };

// Lista mínima por si el servidor no responde al cargar la pantalla.
const OFFLINE_CITIES = [
  DEFAULT_CITY,
  { id: "bogota", nombre: "Bogotá D.C.", departamento: "Bogotá D.C." },
  { id: "fusagasuga", nombre: "Fusagasugá", departamento: "Cundinamarca" },
  { id: "ibague", nombre: "Ibagué", departamento: "Tolima" },
];

export const getMlCities = async () => {
  try {
    const cities = await apiRequest("/ml/ciudades");
    return Array.isArray(cities) && cities.length > 0 ? cities : OFFLINE_CITIES;
  } catch {
    return OFFLINE_CITIES;
  }
};

export const estimateSolarSystem = async ({ consumption, cityId }) =>
  apiRequest("/ml/estimar", {
    method: "POST",
    body: { consumo_mensual_kwh: consumption, ciudad_id: cityId },
  });

const formatDate = () =>
  new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });

// Respuesta de /ml/estimar -> objeto de cálculo de la app
export const buildCalculationResult = (estimate, { consumption, user }) => {
  const savedKwhPerMonth = Math.round(Math.min(estimate.generacion_mensual_promedio_kwh, consumption));
  return {
    id: String(Date.now()),
    date: formatDate(),
    consumption,
    estimatedPanels: estimate.paneles,
    coverage: Math.round(estimate.cobertura_anual_pct),
    estimatedSavings: savedKwhPerMonth,
    recommendation: estimate.recomendacion,
    requestedBy: user?.email || "cliente@correo.com",
    clientName: user?.name || "Cliente",
    // Datos nuevos del modelo de ML
    city: estimate.ciudad?.nombre ?? "",
    hspAverage: estimate.hsp_promedio,
    powerKwp: estimate.potencia_kwp,
    areaM2: estimate.area_aprox_m2,
    annualSavingsCop: estimate.ahorro_anual_cop,
    co2KgYear: estimate.co2_evitado_kg_anual,
    source: estimate.fuente_hsp,
    monthly: JSON.stringify(
      (estimate.detalle_mensual || []).map((m) => ({ mes: m.mes, gen: m.generacion_kwh, cob: m.cobertura_pct }))
    ),
  };
};

// Cálculo sin conexión (fórmula original de la app)
export const fallbackEstimate = ({ consumption, user, cityName = "" }) => {
  const panelOutput = 75;
  const estimatedPanels = Math.max(1, Math.ceil(consumption / panelOutput));
  const coverage = Math.min(100, Math.round(((estimatedPanels * panelOutput) / consumption) * 100));
  return {
    id: String(Date.now()),
    date: formatDate(),
    consumption,
    estimatedPanels,
    coverage,
    estimatedSavings: Math.round(consumption * 0.65),
    recommendation: "Estimación aproximada sin conexión: vuelve a calcular cuando tengas internet para usar el modelo.",
    requestedBy: user?.email || "cliente@correo.com",
    clientName: user?.name || "Cliente",
    city: cityName,
    source: "sin_conexion",
    monthly: "[]",
  };
};

export const formatCop = (value) =>
  `$${Math.round(Number(value) || 0).toLocaleString("es-CO")}`;
