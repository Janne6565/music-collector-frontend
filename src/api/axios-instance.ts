import Axios, { type AxiosRequestConfig } from "axios";

/**
 * Injected into every Orval-generated call. The base URL stays relative: in production
 * Traefik path-routes /api to the backend on the same host, and Vite proxies it in dev,
 * so the client never needs to know an origin.
 */
export const axiosInstance = Axios.create({ baseURL: "/" });

export function customInstance<T>(config: AxiosRequestConfig): Promise<T> {
  return axiosInstance({ ...config }).then(({ data }) => data);
}
