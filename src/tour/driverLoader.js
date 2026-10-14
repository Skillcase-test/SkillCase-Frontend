// driver.js and the tour styles only matter while a tour runs, so they stay out
// of the startup bundle. Providers preload this as soon as a tour is possible.
let driverFn = null;
let loading = null;

export function loadDriver() {
  loading ??= Promise.all([
    import("driver.js"),
    import("driver.js/dist/driver.css"),
    import("./tourStyles.css"),
  ]).then(([mod]) => {
    driverFn = mod.driver;
    return driverFn;
  });
  return loading;
}

export function getDriver() {
  return driverFn;
}
