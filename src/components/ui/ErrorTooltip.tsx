import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ValidationError } from "@/types/validation";

type TooltipWrapperElement = "div" | "span" | "g";

interface ErrorTooltipProps {
    children: React.ReactNode;
    errors: ValidationError[];
    show?: boolean;
    className?: string;
    /**
     * Controls which element wraps the tooltip trigger. Use "g" when
     * wrapping SVG content so the DOM namespace stays svg-aware.
     */
    wrapperElement?: TooltipWrapperElement;
}

export const ErrorTooltip: React.FC<ErrorTooltipProps> = ({
    children,
    errors,
    show = true,
    className = "",
    wrapperElement = "div",
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const elementRef = useRef<HTMLElement | SVGElement | null>(null);

    // Don't show tooltip if no errors or show is false
    const shouldShowTooltip = show && errors.length > 0;

    const handleMouseEnter = (event: React.MouseEvent) => {
        if (!shouldShowTooltip) return;

        // Clear any existing timeout
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }

        const rect = event.currentTarget.getBoundingClientRect();
        setTooltipPosition({
            x: rect.left + rect.width / 2,
            y: rect.top - 10,
        });
        setIsVisible(true);
    };

    const handleMouseLeave = () => {
        if (!shouldShowTooltip) return;

        // Add delay before hiding tooltip
        hoverTimeoutRef.current = setTimeout(() => {
            setIsVisible(false);
        }, 200);
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        };
    }, []);

    const tooltipContent = (
        <div
            className="fixed z-50 px-3 py-2 text-sm text-white bg-red-800 rounded shadow-lg pointer-events-none max-w-xs"
            style={{
                left: tooltipPosition.x,
                top: tooltipPosition.y,
                transform: "translate(-50%, -100%)",
            }}
        >
            {errors.length === 1 ? (
                <div>{errors[0].message}</div>
            ) : (
                <div>
                    <div className="font-semibold mb-1">
                        {errors.length} validation errors:
                    </div>
                    <ul className="list-disc list-inside space-y-1">
                        {errors.map((error, index) => (
                            <li key={index} className="text-xs">
                                {error.message}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );

    const Wrapper = wrapperElement as keyof JSX.IntrinsicElements;
    const setElementRef = useCallback(
        (node: HTMLElement | SVGElement | null) => {
            elementRef.current = node;
        },
        []
    );

    return (
        <>
            <Wrapper
                ref={setElementRef}
                className={className}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {children}
            </Wrapper>

            {/* Portal the tooltip to body to avoid transform clipping */}
            {shouldShowTooltip &&
                isVisible &&
                typeof window !== "undefined" &&
                createPortal(tooltipContent, document.body)}
        </>
    );
};

export default ErrorTooltip;
