import { apiRequest } from "@/src/services/apiClient";

const mapRemoteCalculation = (item) => {
  const estimatedPanels =
    item?.paneles_necesarios ??
    item?.estimatedPanels ??
    item?.panels ??
    null;

  const consumption =
    item?.consumo_mensual ??
    item?.consumption ??
    item?.demanda_kwh ??
    null;

  const dateValue = item?.date || item?.created_at;

  return {
    id: String(item?.id ?? Date.now()),
    date: dateValue
      ? new Date(dateValue).toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "Sin fecha",
    consumption,
    estimatedPanels,
    coverage: item?.coverage ?? null,
    estimatedSavings: item?.estimatedSavings ?? null,
    recommendation: item?.recommendation || "Datos obtenidos desde backend",
    requestedBy: item?.email || "backend@greensaver",
    clientName: item?.nombre || "Cliente backend",
  };
};

export const registerRemoteUser = async ({ name, city = "N/A", monthlyConsumption = 0 }) => {
  return apiRequest("/usuarios", {
    method: "POST",
    query: {
      nombre: name,
      ciudad: city,
      consumo_mensual: monthlyConsumption,
    },
  });
};

export const registerRemoteAuthUser = async ({ name, phone, email, password, role = "user" }) => {
  return apiRequest("/auth/register", {
    method: "POST",
    body: {
      name,
      phone,
      email,
      password,
      role,
    },
  });
};

export const loginRemoteUser = async ({ email, password }) => {
  return apiRequest("/auth/login", {
    method: "POST",
    body: { email, password },
  });
};

export const resetRemotePassword = async ({ email, newPassword }) => {
  return apiRequest("/auth/recover-password", {
    method: "POST",
    body: { email, newPassword },
  });
};

export const getRemoteCalculations = async () => {
  const response = await apiRequest("/calculos");

  if (!Array.isArray(response)) {
    return [];
  }

  return response.map(mapRemoteCalculation);
};

export const createRemoteCalculation = async ({
  email,
  consumption,
  estimatedPanels,
  coverage,
  estimatedSavings,
  recommendation,
}) => {
  return apiRequest("/calculos", {
    method: "POST",
    body: {
      email,
      consumption,
      estimatedPanels,
      coverage,
      estimatedSavings,
      recommendation,
    },
  });
};

const extractDataArray = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object" && Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
};

const extractDataObject = (payload) => {
  if (payload && typeof payload === "object" && payload.data && typeof payload.data === "object") {
    return payload.data;
  }

  if (payload && typeof payload === "object") {
    return payload;
  }

  return {};
};

const mapQuoteCalculation = (item) => ({
  id: String(item?.id ?? ""),
  email: item?.email || "cliente@correo.com",
  clientName: item?.client_name || item?.nombre || item?.email || "Cliente",
  consumption: item?.consumption ?? null,
  estimatedPanels: item?.estimatedpanels ?? item?.estimatedPanels ?? null,
  coverage: item?.coverage ?? null,
  estimatedSavings: item?.estimatedsavings ?? item?.estimatedSavings ?? null,
  recommendation: item?.recommendation || "Sin recomendacion",
  createdAt: item?.created_at || "",
});

const mapSentQuote = (item) => ({
  id: String(item?.id ?? ""),
  calculationId: String(item?.calculation_id ?? item?.calculationId ?? ""),
  clientEmail: item?.client_email ?? item?.clientEmail ?? "",
  clientName: item?.client_name ?? item?.clientName ?? "Cliente",
  totalPrice: Number(item?.total_price ?? item?.totalPrice ?? 0),
  status: item?.status || "sent",
  sentAt: item?.sent_at ?? item?.sentAt ?? "",
  acceptedAt: item?.accepted_at ?? item?.acceptedAt ?? "",
  installationDate: item?.installation_date ?? item?.installationDate ?? "",
});

export const getRemoteQuoteCalculations = async () => {
  const response = await apiRequest("/quotes/calculations");
  return extractDataArray(response).map(mapQuoteCalculation);
};

export const getRemoteQuoteOptions = async () => {
  const response = await apiRequest("/quotes/options");
  const data = extractDataObject(response);

  return {
    panelTypes: Array.isArray(data.panelTypes) ? data.panelTypes : [],
    inverterTypes: Array.isArray(data.inverterTypes) ? data.inverterTypes : [],
    batteryTypes: Array.isArray(data.batteryTypes) ? data.batteryTypes : [],
    structureTypes: Array.isArray(data.structureTypes) ? data.structureTypes : [],
  };
};

export const getRemoteSentQuotes = async () => {
  const response = await apiRequest("/quotes");
  return extractDataArray(response).map(mapSentQuote);
};

export const sendRemoteQuote = async ({
  calculationId,
  clientEmail,
  clientName,
  totalPrice,
  notes,
  materials,
}) => {
  return apiRequest("/quotes/send", {
    method: "POST",
    body: {
      calculationId: Number(calculationId),
      clientEmail,
      clientName,
      totalPrice: Number(totalPrice),
      notes,
      materials,
    },
  });
};

export const acceptRemoteQuote = async ({ quoteId, installDate }) => {
  return apiRequest(`/quotes/${Number(quoteId)}/accept`, {
    method: "POST",
    body: { installDate },
  });
};

const mapRemoteUser = (item) => ({
  id: Number(item?.id ?? 0),
  name: item?.nombre ?? item?.name ?? item?.email ?? "Usuario",
  email: item?.email ?? "",
  role: item?.rol ?? item?.role ?? "user",
  city: item?.ciudad ?? item?.city ?? "",
  consumption: item?.consumo_mensual ?? item?.consumption ?? 0,
});

export const getRemoteUsers = async () => {
  const response = await apiRequest("/usuarios");
  return extractDataArray(response).map(mapRemoteUser);
};

export const deleteRemoteUser = async (userId) => {
  return apiRequest(`/usuarios/${Number(userId)}`, {
    method: "DELETE",
  });
};

export const assignRemoteSystemToUser = async ({ email, system }) => {
  return apiRequest("/systems/assign", {
    method: "POST",
    body: { email, system },
  });
};

export const getRemoteInstalledSystems = async (email) => {
  const response = await apiRequest("/systems", { query: { email } });
  return extractDataArray(response);
};
