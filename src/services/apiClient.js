const DEFAULT_API_BASE_URL = "http://localhost:8000";

const sanitizeBaseUrl = (value) => {
  if (!value || typeof value !== "string") {
    return DEFAULT_API_BASE_URL;
  }

  return value.endsWith("/") ? value.slice(0, -1) : value;
};

export const API_BASE_URL = sanitizeBaseUrl(process.env.EXPO_PUBLIC_API_URL);

const withQueryParams = (path, query = {}) => {
  const url = new URL(`${API_BASE_URL}${path}`);

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.append(key, String(value));
    }
  });

  return url.toString();
};

const parseResponse = async (response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const normalizeErrorMessage = (data, status) => {
  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (data && typeof data === "object") {
    const detail = data.detail;

    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }

    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }
          if (item && typeof item === "object") {
            return item.msg || item.message || JSON.stringify(item);
          }
          return String(item);
        })
        .join(" | ");
    }

    if (detail && typeof detail === "object") {
      return detail.message || detail.msg || JSON.stringify(detail);
    }

    if (typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }
  }

  return `HTTP ${status}`;
};

export const apiRequest = async (path, { method = "GET", query, body, headers = {} } = {}) => {
  const url = withQueryParams(path, query);

  const response = await fetch(url, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    const message = normalizeErrorMessage(data, response.status);
    throw new Error(message);
  }

  return data;
};
