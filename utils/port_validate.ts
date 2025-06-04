export const MAX_PORT = 65535;
export const MIN_PORT = 0;

export const isPortValid = (port: number) => {
  if (port >= MIN_PORT && port <= MAX_PORT) {
    return true;
  }
  return false;
};
