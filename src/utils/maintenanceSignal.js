let maintenanceStatus = false;
const listeners = new Set();

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
