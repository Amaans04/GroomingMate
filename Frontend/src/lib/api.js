import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL;

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export function getApiErrorMessage(err) {
  if (axios.isAxiosError(err)) {
    return (
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      "Request failed"
    );
  }
  return err instanceof Error ? err.message : "Something went wrong";
}

