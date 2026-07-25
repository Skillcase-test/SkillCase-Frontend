let maintenanceStatus = false;
const listeners = new Set();

export const MAINTENANCE_CODE = "maintenance_mode";
const LEGACY_MAINTENANCE_MESSAGE = "System under maintenance";

export function isMaintenanceResponse(response) {
  const status = response?.response?.status ?? response?.status;
  const data = response?.response?.data ?? response?.data;
  const isExplicitMaintenance = data?.code === MAINTENANCE_CODE;
  const isLegacyMaintenance =
    typeof data?.message === "string" &&
    data.message.trim() === LEGACY_MAINTENANCE_MESSAGE;
  return status === 503 && (isExplicitMaintenance || isLegacyMaintenance);
}

export function setMaintenanceStatus(nextStatus) {
  maintenanceStatus = Boolean(nextStatus);
  listeners.forEach((listener) => listener(maintenanceStatus));
}

export function getMaintenanceStatus() {
  return maintenanceStatus;
}

export function subscribeMaintenanceStatus(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
