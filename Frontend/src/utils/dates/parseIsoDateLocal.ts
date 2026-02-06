export function parseIsoDateLocal(iso: string) {
    const [datePart] = iso.split("T");
    const [y, m, d] = datePart.split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function formatShortDate(iso: string, locale?: string): string | undefined {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return undefined;

    return new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(d);
}