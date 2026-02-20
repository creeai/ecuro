// ============================================================
// Ecuro Light MCP Server - API Client Service
// ============================================================

import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import { ECURO_API_BASE_URL, ECURO_ACCESS_TOKEN } from "../constants.js";

class EcuroApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: ECURO_API_BASE_URL,
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        "app-access-token": ECURO_ACCESS_TOKEN,
      },
      timeout: 30_000,
    });
  }

  async get<T = unknown>(
    path: string,
    params?: Record<string, unknown>
  ): Promise<T> {
    try {
      const response = await this.client.get<T>(path, { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async post<T = unknown>(
    path: string,
    data?: Record<string, unknown>
  ): Promise<T> {
    try {
      const response = await this.client.post<T>(path, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;
      const message =
        typeof data === "object" && data !== null && "message" in data
          ? String((data as Record<string, unknown>).message)
          : error.message;

      return new Error(
        `Ecuro API Error (${status ?? "unknown"}): ${message}`
      );
    }
    if (error instanceof Error) return error;
    return new Error("Erro desconhecido na chamada à API Ecuro");
  }
}

/** Singleton do client da API Ecuro */
export const ecuroApi = new EcuroApiClient();
