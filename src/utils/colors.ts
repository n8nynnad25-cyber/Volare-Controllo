import { BRAND_COLORS } from '../../constants';

/**
 * Returns a consistent color for a brand name.
 * 1. Tries to find a match in BRAND_COLORS (case-insensitive).
 * 2. If not found, generates a consistent color based on the brand name's hash.
 */
export const getBrandColor = (brandName: string): string => {
    if (!brandName) return '#94a3b8';

    const brandLower = brandName.toLowerCase().trim();

    // 1. Exact case-insensitive lookup (trimmed)
    const matchedKey = Object.keys(BRAND_COLORS).find(
        key => key.toLowerCase().trim() === brandLower
    );

    if (matchedKey) {
        return BRAND_COLORS[matchedKey];
    }

    // 2. Special partial match for Stella/Stela
    if (brandLower.includes('stela') || brandLower.includes('stella')) {
        const stellaKey = Object.keys(BRAND_COLORS).find(k => k.toLowerCase().includes('stella'));
        if (stellaKey) return BRAND_COLORS[stellaKey];
    }

    // 2. Fallback: Aesthetic Palette based on string hash
    const AESTHETIC_PALETTE = [
        '#3b82f6', // blue-500
        '#f59e0b', // amber-500
        '#10b981', // emerald-500
        '#ef4444', // red-500
        '#8b5cf6', // violet-500
        '#ec4899', // pink-500
        '#06b6d4', // cyan-500
        '#f97316', // orange-500
        '#6366f1', // indigo-500
        '#84cc16', // lime-500
    ];

    let hash = 0;
    for (let i = 0; i < brandName.length; i++) {
        hash = brandName.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash) % AESTHETIC_PALETTE.length;
    return AESTHETIC_PALETTE[index];
};
