export function getApiBaseUrl() {
  if (typeof window === "undefined") {
    return "http://localhost:8000";
  }

  return `http://${window.location.hostname}:8000`;
}
