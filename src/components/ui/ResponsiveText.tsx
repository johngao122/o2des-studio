"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
    getTypographyScale,
    truncateText,
    estimateTextWidth,
    getTypographyVariant,
    getVariantTypographyConfig,
} from "@/lib/utils/typography";

export interface ResponsiveTextProps {
    children: string;
    maxWidth: number;
    maxHeight?: number;
    nodeWidth: number;
    nodeHeight: number;
    className?: string;
    style?: React.CSSProperties;
    showTooltip?: boolean;
    multiline?: boolean;
    centerAlign?: boolean;
    fontWeight?: "normal" | "medium" | "semibold" | "bold";
}

/**
 * ResponsiveText component that handles text overflow with responsive font sizing
 * Provides tooltips for truncated text and maintains consistent typography
 */
export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
    children,
    maxWidth,
    maxHeight,
    nodeWidth,
    nodeHeight,
    className = "",
    style = {},
    showTooltip = false,
    multiline = false,
    centerAlign = false,
    fontWeight = "normal",
}) => {
    const [isTooltipVisible, setIsTooltipVisible] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

    const variant = getTypographyVariant(nodeWidth);
    const config = getVariantTypographyConfig(variant);
    const typography = getTypographyScale(nodeWidth, nodeHeight, config);

    const processedText = useMemo(() => {
        if (!children) return { text: "", isTruncated: false };

        if (multiline) {
            const lines = children.split("\n");
            const maxLines = maxHeight
                ? Math.floor(maxHeight / typography.lineHeight)
                : lines.length;
            const visibleLines = lines.slice(0, maxLines);

            const processedLines = visibleLines.map((line) => {
                return truncateText(line, maxWidth, typography.fontSize);
            });

            const isTruncated =
                lines.length > maxLines ||
                processedLines.some((line) => line.isTruncated);

            return {
                text: processedLines.map((line) => line.text).join("\n"),
                isTruncated,
                originalLines: lines.length,
                visibleLines: visibleLines.length,
            };
        } else {
            return truncateText(children, maxWidth, typography.fontSize);
        }
    }, [
        children,
        maxWidth,
        maxHeight,
        typography.fontSize,
        typography.lineHeight,
        multiline,
    ]);

    const getFontWeightClass = (weight: string) => {
        switch (weight) {
            case "medium":
                return "font-medium";
            case "semibold":
                return "font-semibold";
            case "bold":
                return "font-bold";
            default:
                return "font-normal";
        }
    };

    const handleMouseEnter = (event: React.MouseEvent) => {
        if (showTooltip && processedText.isTruncated) {
            const rect = event.currentTarget.getBoundingClientRect();
            setTooltipPosition({
                x: rect.left + rect.width / 2,
                y: rect.top - 10,
            });
            setIsTooltipVisible(true);
        }
    };

    const handleMouseLeave = () => {
        setIsTooltipVisible(false);
    };

    const textStyles: React.CSSProperties = {
        fontSize: `${typography.fontSize}px`,
        lineHeight: `${typography.lineHeight}px`,
        letterSpacing: `${typography.letterSpacing}px`,
        ...style,
    };

    const baseClasses = [
        getFontWeightClass(fontWeight),
        centerAlign ? "text-center" : "",
        multiline ? "whitespace-pre-line" : "whitespace-nowrap",
        "overflow-hidden",
        className,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <>
            <div
                className={baseClasses}
                style={textStyles}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {processedText.text}
            </div>

            {/* Custom Tooltip (portal to body to avoid transform clipping) */}
            {showTooltip &&
                isTooltipVisible &&
                processedText.isTruncated &&
                typeof window !== "undefined" &&
                createPortal(
                    <div
                        className="fixed z-50 px-2 py-1 text-sm text-white bg-gray-900 rounded shadow-lg pointer-events-none"
                        style={{
                            left: tooltipPosition.x,
                            top: tooltipPosition.y,
                            transform: "translate(-50%, -100%)",
                            maxWidth: "300px",
                            wordWrap: "break-word",
                            whiteSpace: "pre-wrap",
                        }}
                    >
                        {children}
                    </div>,
                    document.body
                )}
        </>
    );
};

/**
 * Specialized component for KaTeX mathematical expressions
 */
export interface ResponsiveKaTeXProps
    extends Omit<ResponsiveTextProps, "children"> {
    expression: string;
    displayMode?: boolean;
}

export const ResponsiveKaTeX: React.FC<ResponsiveKaTeXProps> = ({
    expression,
    displayMode = false,
    maxWidth,
    nodeWidth,
    nodeHeight,
    className = "",
    style = {},
    showTooltip = false,
    centerAlign = true,
    ...props
}) => {
    const variant = getTypographyVariant(nodeWidth);
    const config = getVariantTypographyConfig(variant);
    const typography = getTypographyScale(nodeWidth, nodeHeight, config);

    const katexStyles: React.CSSProperties = {
        fontSize: `${typography.fontSize}px`,
        ...style,
    };

    return (
        <div
            className={`${centerAlign ? "text-center" : ""} ${className}`}
            style={katexStyles}
        >
            {/* This would be replaced with actual KaTeX rendering */}
            {expression}
        </div>
    );
};

/**
 * Hook for getting responsive text measurements
 */
export function useResponsiveText(
    text: string,
    nodeWidth: number,
    nodeHeight: number,
    maxWidth: number
) {
    const variant = getTypographyVariant(nodeWidth);
    const config = getVariantTypographyConfig(variant);
    const typography = getTypographyScale(nodeWidth, nodeHeight, config);

    return useMemo(() => {
        const estimatedWidth = estimateTextWidth(text, typography.fontSize);
        const truncated = truncateText(text, maxWidth, typography.fontSize);

        return {
            typography,
            estimatedWidth,
            truncated,
            fitsWithoutTruncation: estimatedWidth <= maxWidth,
        };
    }, [text, nodeWidth, nodeHeight, maxWidth, typography.fontSize]);
}
