import { HEADER_PRESETS, type HeaderVariant } from "./header.config";

export function useHeaderPreset(variant: HeaderVariant) {
    return HEADER_PRESETS[variant];
}
