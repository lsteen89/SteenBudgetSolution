export function parseIsoDateLocal(iso: string) {
    const [datePart] = iso.split("T");
    const [y, m, d] = datePart.split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1);
}