import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const client = axios.create({ baseURL: API_URL, timeout: 30000 });

export async function sendChatMessage({ sessionId, message, formData }) {
  const { data } = await client.post("/api/chat", {
    session_id: sessionId,
    message,
    form_data: formData,
  });
  return data;
}

export async function saveInteraction(payload) {
  const { data } = await client.post("/api/interactions", payload);
  return data;
}

export async function searchHCPs(q) {
  const { data } = await client.get("/api/hcps", { params: { search: q } });
  return data;
}

export async function searchMaterials(q) {
  const { data } = await client.get("/api/materials", { params: { search: q } });
  return data;
}

export default client;
