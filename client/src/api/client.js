import axios from "axios";

let accessToken = null;
export const setAccessToken = (token) => {
  accessToken = token;
};
export const getAccessToken = () => accessToken;

export const api = axios.create({ baseURL: "/api", withCredentials: true });

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    // /auth/* calls (refresh, login, ...) must never trigger a refresh-and-retry: retrying a
    // failed /auth/refresh call by calling /auth/refresh again is a self-referential deadlock
    // (the retry awaits a promise whose own resolution depends on this same handler returning),
    // which hangs the whole app on "Loading..." for any logged-out visitor hitting a protected
    // route. And retrying a failed /auth/login (e.g. wrong password) would mask the real 401
    // with the refresh endpoint's unrelated error.
    const isAuthEndpoint = config?.url?.startsWith("/auth/");
    if (response?.status !== 401 || config._retried || isAuthEndpoint) {
      return Promise.reject(error);
    }
    config._retried = true;

    refreshPromise ??= api
      .post("/auth/refresh")
      .then(({ data }) => {
        setAccessToken(data.accessToken);
        return data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });

    try {
      const token = await refreshPromise;
      config.headers.Authorization = `Bearer ${token}`;
      return api(config);
    } catch (refreshError) {
      setAccessToken(null);
      return Promise.reject(refreshError);
    }
  }
);
