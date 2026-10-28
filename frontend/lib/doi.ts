export function doiHref(doi: string): string {
  const value = doi.trim().replace(/^doi:\s*/i, "");
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return `https://doi.org/${value.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")}`;
}
