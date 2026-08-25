import Axios, { type AxiosRequestConfig } from "axios";

/**
 * The one HTTP client every generated call goes through.
 *
 * The base URL stays relative: in production Traefik path-routes /api to the backend on
 * the same host, and Vite proxies it in development, so the client never needs an origin.
 */
export const axiosInstance = Axios.create({
  baseURL: "/",
  withCredentials: true,
  // Repeated keys rather than axios' default `albumId[]=`: Spring binds a list from
  // `?albumId=a&albumId=b`, and the bracketed form arrives as a parameter it has never
  // heard of — an empty list rather than an error, which is the worst of both.
  paramsSerializer: { indexes: null },
});

/**
 * The access token lives in a module variable rather than localStorage.
 *
 * It is short-lived and replaceable, and keeping it out of storage means an XSS bug has to
 * exfiltrate it within the session rather than reading a durable credential off disk. The
 * durable half is the refresh token, which is an httpOnly cookie the page cannot read.
 */
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/** Set by the auth layer so a 401 can attempt one silent refresh before giving up. */
let refreshHandler: (() => Promise<string | null>) | null = null;

export function setRefreshHandler(handler: (() => Promise<string | null>) | null): void {
  refreshHandler = handler;
}

const AUTH_PATHS = ["/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/refresh"];

export async function customInstance<T>(config: AxiosRequestConfig): Promise<T> {
  const send = (token: string | null) =>
    axiosInstance({
      ...config,
      headers: {
        ...config.headers,
        ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
      },
    });

  try {
    const { data } = await send(accessToken);
    return data as T;
  } catch (error) {
    const status = Axios.isAxiosError(error) ? error.response?.status : undefined;
    const url = config.url ?? "";
    // Refresh once, and never for the auth endpoints themselves — a failing refresh must
    // not trigger another refresh.
    if (
      status !== 401 ||
      refreshHandler === null ||
      AUTH_PATHS.some((path) => url.includes(path))
    ) {
      throw error;
    }
    const refreshed = await refreshHandler();
    if (refreshed === null) {
      throw error;
    }
    const { data } = await send(refreshed);
    return data as T;
  }
}
