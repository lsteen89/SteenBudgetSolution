export const idFromPath = (path: string) =>
  path.replace(/[.[\]]/g, "-");  