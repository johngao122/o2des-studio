/**
 * Node styling utilities for dynamic margins, padding, and layout calculations
 * Provides consistent spacing based on node dimensions
 */

export interface NodePadding {
    paddingX: number;
    paddingY: number;
    paddingTop?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    paddingRight?: number;
}

export interface NodeSpacing {
    padding: NodePadding;
    contentArea: {
        width: number;
        height: number;
    };
}

/**
 * Configuration for dynamic padding calculations
 */
export interface PaddingConfig {
    basePercentage: number;
    minPadding: number;
    maxPadding: number;
    aspectRatioAdjustment?: boolean;
}

/**
 * Default padding configuration
 */
export const DEFAULT_PADDING_CONFIG: PaddingConfig = {
    basePercentage: 0.04,
    minPadding: 8,
    maxPadding: 24,
    aspectRatioAdjustment: true,
};

/**
 * Calculates dynamic padding based on node dimensions
 */
export function calculateDynamicPadding(
    width: number,
    height: number,
    config: PaddingConfig = DEFAULT_PADDING_CONFIG
): NodePadding {
    const basePaddingX = width * config.basePercentage;
    const basePaddingY = height * config.basePercentage;

    let paddingX = Math.max(
        config.minPadding,
        Math.min(config.maxPadding, basePaddingX)
    );
    let paddingY = Math.max(
        config.minPadding,
        Math.min(config.maxPadding, basePaddingY)
    );

    if (config.aspectRatioAdjustment) {
        const aspectRatio = width / height;

        if (aspectRatio > 2) {
            paddingX *= 0.8;
        } else if (aspectRatio < 0.5) {
            paddingY *= 0.8;
        }
    }

    return {
        paddingX: Math.round(paddingX),
        paddingY: Math.round(paddingY),
    };
}

/**
 * Gets complete node spacing information
 */
export function getNodeSpacing(
    width: number,
    height: number,
    config: PaddingConfig = DEFAULT_PADDING_CONFIG
): NodeSpacing {
    const padding = calculateDynamicPadding(width, height, config);

    return {
        padding,
        contentArea: {
            width: width - padding.paddingX * 2,
            height: height - padding.paddingY * 2,
        },
    };
}

/**
 * Generates CSS class string with dynamic padding
 */
export function getDynamicPaddingClass(
    width: number,
    height: number,
    config: PaddingConfig = DEFAULT_PADDING_CONFIG
): string {
    const padding = calculateDynamicPadding(width, height, config);
    return `px-[${padding.paddingX}px] py-[${padding.paddingY}px]`;
}

/**
 * Generates inline styles for dynamic padding
 */
export function getDynamicPaddingStyles(
    width: number,
    height: number,
    config: PaddingConfig = DEFAULT_PADDING_CONFIG
): React.CSSProperties {
    const padding = calculateDynamicPadding(width, height, config);

    return {
        paddingLeft: `${padding.paddingX}px`,
        paddingRight: `${padding.paddingX}px`,
        paddingTop: `${padding.paddingY}px`,
        paddingBottom: `${padding.paddingY}px`,
    };
}

/**
 * Special padding configurations for different node types
 */
export const NODE_TYPE_PADDING_CONFIGS: Record<string, PaddingConfig> = {
    event: {
        basePercentage: 0.045,
        minPadding: 12,
        maxPadding: 28,
        aspectRatioAdjustment: true,
    },
    activity: {
        basePercentage: 0.035,
        minPadding: 8,
        maxPadding: 20,
        aspectRatioAdjustment: true,
    },
    initialization: {
        basePercentage: 0.04,
        minPadding: 10,
        maxPadding: 24,
        aspectRatioAdjustment: false,
    },
    generator: {
        basePercentage: 0.03,
        minPadding: 6,
        maxPadding: 18,
        aspectRatioAdjustment: false,
    },
    terminator: {
        basePercentage: 0.03,
        minPadding: 6,
        maxPadding: 18,
        aspectRatioAdjustment: false,
    },
    module: {
        basePercentage: 0.02,
        minPadding: 4,
        maxPadding: 12,
        aspectRatioAdjustment: false,
    },
};

/**
 * Gets node-type-specific padding configuration
 */
export function getNodeTypePaddingConfig(nodeType: string): PaddingConfig {
    return NODE_TYPE_PADDING_CONFIGS[nodeType] || DEFAULT_PADDING_CONFIG;
}

/**
 * Calculates content area dimensions after accounting for padding and borders
 */
export function getContentAreaDimensions(
    nodeWidth: number,
    nodeHeight: number,
    borderWidth: number = 2,
    nodeType?: string
): { width: number; height: number } {
    const config = nodeType
        ? getNodeTypePaddingConfig(nodeType)
        : DEFAULT_PADDING_CONFIG;
    const spacing = getNodeSpacing(nodeWidth, nodeHeight, config);

    return {
        width: spacing.contentArea.width - borderWidth * 2,
        height: spacing.contentArea.height - borderWidth * 2,
    };
}

/**
 * Utility for calculating margin adjustments based on node size
 */
export function calculateMarginAdjustment(
    width: number,
    height: number,
    baseMargin: number = 16
): number {
    const area = width * height;
    const scale = Math.sqrt(area) / 200;

    return Math.max(4, Math.min(32, baseMargin * scale));
}
