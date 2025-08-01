/**
 * Typography utilities for responsive font sizing in O2DES Studio nodes
 * Provides consistent text scaling based on node dimensions
 */

export interface TypographyScale {
    fontSize: number;
    lineHeight: number;
    letterSpacing: number;
}

export interface TypographyConfig {
    baseFontSize: number;
    scalingFactor: number;
    minFontSize: number;
    maxFontSize: number;
    lineHeightMultiplier: number;
}

/**
 * Default typography configuration
 */
export const DEFAULT_TYPOGRAPHY_CONFIG: TypographyConfig = {
    baseFontSize: 14,
    scalingFactor: 0.08,
    minFontSize: 10,
    maxFontSize: 20,
    lineHeightMultiplier: 1.4,
};

/**
 * Calculates responsive font size based on node dimensions
 * Uses area-based scaling for smooth responsiveness
 */
export function calculateResponsiveFontSize(
    width: number,
    height: number,
    config: TypographyConfig = DEFAULT_TYPOGRAPHY_CONFIG
): number {
    const area = width * height;
    const scaledSize =
        config.baseFontSize + (area * config.scalingFactor) / 1000;

    return Math.max(
        config.minFontSize,
        Math.min(config.maxFontSize, Math.round(scaledSize))
    );
}

/**
 * Gets complete typography scale based on node dimensions
 */
export function getTypographyScale(
    width: number,
    height: number,
    config: TypographyConfig = DEFAULT_TYPOGRAPHY_CONFIG
): TypographyScale {
    const fontSize = calculateResponsiveFontSize(width, height, config);

    return {
        fontSize,
        lineHeight: fontSize * config.lineHeightMultiplier,
        letterSpacing: fontSize > 16 ? 0.5 : 0,
    };
}

/**
 * Estimates text width in pixels for truncation calculations
 */
export function estimateTextWidth(
    text: string,
    fontSize: number,
    fontFamily: string = "system-ui"
): number {
    const avgCharWidth = fontSize * 0.6;
    return text.length * avgCharWidth;
}

/**
 * Truncates text to fit within specified width
 */
export function truncateText(
    text: string,
    maxWidth: number,
    fontSize: number,
    ellipsis: string = "..."
): { text: string; isTruncated: boolean } {
    const estimatedWidth = estimateTextWidth(text, fontSize);

    if (estimatedWidth <= maxWidth) {
        return { text, isTruncated: false };
    }

    const ellipsisWidth = estimateTextWidth(ellipsis, fontSize);
    const availableWidth = maxWidth - ellipsisWidth;
    const maxChars = Math.floor(availableWidth / (fontSize * 0.6));

    if (maxChars <= 0) {
        return { text: ellipsis, isTruncated: true };
    }

    return {
        text: text.substring(0, maxChars) + ellipsis,
        isTruncated: true,
    };
}

/**
 * Responsive breakpoints for different node sizes
 */
export const TYPOGRAPHY_BREAKPOINTS = {
    small: 180,
    medium: 300,
} as const;

/**
 * Gets typography variant based on node width
 */
export function getTypographyVariant(
    width: number
): "compact" | "standard" | "enhanced" {
    if (width < TYPOGRAPHY_BREAKPOINTS.small) {
        return "compact";
    } else if (width < TYPOGRAPHY_BREAKPOINTS.medium) {
        return "standard";
    } else {
        return "enhanced";
    }
}

/**
 * Gets variant-specific typography configurations
 */
export function getVariantTypographyConfig(
    variant: "compact" | "standard" | "enhanced"
): TypographyConfig {
    switch (variant) {
        case "compact":
            return {
                ...DEFAULT_TYPOGRAPHY_CONFIG,
                baseFontSize: 12,
                scalingFactor: 0.06,
                minFontSize: 9,
                maxFontSize: 16,
            };
        case "enhanced":
            return {
                ...DEFAULT_TYPOGRAPHY_CONFIG,
                baseFontSize: 16,
                scalingFactor: 0.1,
                minFontSize: 12,
                maxFontSize: 24,
            };
        default:
            return DEFAULT_TYPOGRAPHY_CONFIG;
    }
}
