import {
    SegmentDragHandler,
    EdgeSegment,
    SegmentDragConstraints,
} from "../SegmentDragHandler";
import { Point } from "../../lib/routing/types";

describe("SegmentDragHandler", () => {
    let segmentDragHandler: SegmentDragHandler;
    let mockSegments: EdgeSegment[];
    let sourcePoint: Point;
    let targetPoint: Point;

    beforeEach(() => {
        segmentDragHandler = SegmentDragHandler.getInstance();

        sourcePoint = { x: 100, y: 100 };
        targetPoint = { x: 300, y: 200 };

        mockSegments = [
            {
                id: "segment-0",
                start: sourcePoint,
                end: { x: 200, y: 100 },
                direction: "horizontal",
                length: 100,
                midpoint: { x: 150, y: 100 },
            },
            {
                id: "segment-1",
                start: { x: 200, y: 100 },
                end: { x: 200, y: 150 },
                direction: "vertical",
                length: 50,
                midpoint: { x: 200, y: 125 },
            },
            {
                id: "segment-2",
                start: { x: 200, y: 150 },
                end: targetPoint,
                direction: "horizontal",
                length: 100,
                midpoint: { x: 250, y: 150 },
            },
        ];
    });

    describe("calculateSegments", () => {
        it("should calculate segments from control points correctly", () => {
            const controlPoints: Point[] = [
                { x: 200, y: 100 },
                { x: 200, y: 150 },
            ];

            const segments = segmentDragHandler.calculateSegments(
                controlPoints,
                sourcePoint,
                targetPoint
            );

            expect(segments).toHaveLength(3);
            expect(segments[0].direction).toBe("horizontal");
            expect(segments[1].direction).toBe("vertical");
            expect(segments[2].direction).toBe("horizontal");

            // Check midpoints
            expect(segments[0].midpoint).toEqual({ x: 150, y: 100 });
            expect(segments[1].midpoint).toEqual({ x: 200, y: 125 });
            expect(segments[2].midpoint).toEqual({ x: 250, y: 175 });
        });

        it("should handle empty control points", () => {
            const segments = segmentDragHandler.calculateSegments(
                [],
                sourcePoint,
                targetPoint
            );

            expect(segments).toHaveLength(1);
            expect(segments[0].start).toEqual(sourcePoint);
            expect(segments[0].end).toEqual(targetPoint);
        });

        it("should not merge opposing horizontal segments during consolidation", () => {
            const customSource: Point = { x: 0, y: 0 };
            const customTarget: Point = { x: -100, y: -100 };
            const controlPoints: Point[] = [
                { x: 100, y: 0 },
                { x: -150, y: 0 },
                { x: -150, y: -100 }
            ];

            const segments = segmentDragHandler.calculateSegments(
                controlPoints,
                customSource,
                customTarget
            );

            expect(segments).toHaveLength(4);
            expect(segments[0].direction).toBe("horizontal");
            expect(segments[1].direction).toBe("horizontal");
            expect(segments[2].direction).toBe("vertical");
            expect(segments[3].direction).toBe("horizontal");

            // Ensure opposing horizontal segments remain distinct
            expect(segments[0].end.x).toBeGreaterThan(segments[0].start.x);
            expect(segments[1].end.x).toBeLessThan(segments[1].start.x);
        });
    });

    describe("isNearSegmentMidpoint", () => {
        it("should detect when point is near segment midpoint", () => {
            const segment = mockSegments[0];
            const nearPoint = { x: 155, y: 105 }; // 5 pixels away
            const farPoint = { x: 170, y: 120 }; // ~22 pixels away

            expect(
                segmentDragHandler.isNearSegmentMidpoint(nearPoint, segment, 15)
            ).toBe(true);
            expect(
                segmentDragHandler.isNearSegmentMidpoint(farPoint, segment, 15)
            ).toBe(false);
        });
    });

    describe("findTargetSegment", () => {
        it("should find correct segment for mouse position", () => {
            const mousePoint = { x: 152, y: 102 }; // Near first segment midpoint
            const targetSegment = segmentDragHandler.findTargetSegment(
                mousePoint,
                mockSegments
            );

            expect(targetSegment).toBe(mockSegments[0]);
        });

        it("should return null if no segment is near", () => {
            const mousePoint = { x: 50, y: 50 }; // Far from all segments
            const targetSegment = segmentDragHandler.findTargetSegment(
                mousePoint,
                mockSegments
            );

            expect(targetSegment).toBeNull();
        });
    });

    describe("startSegmentDrag", () => {
        it("should initialize drag state correctly", () => {
            const segment = mockSegments[0];
            const mousePosition = { x: 160, y: 110 };

            const dragState = segmentDragHandler.startSegmentDrag(
                segment,
                mousePosition
            );

            expect(dragState.segmentId).toBe("segment-0");
            expect(dragState.startPosition).toEqual(segment.midpoint);
            expect(dragState.currentPosition).toEqual(mousePosition);
            expect(dragState.dragOffset).toEqual({ x: 10, y: 10 });
        });
    });

    describe("updateSegmentDrag", () => {
        it("should apply horizontal movement constraints for vertical segments", () => {
            const segment = mockSegments[1]; // vertical segment (midpoint at x:200, y:125)
            const startMousePosition = { x: 205, y: 130 }; // Start with offset
            const mousePosition = { x: 220, y: 135 };
            const constraints: SegmentDragConstraints = {
                axis: "x",
                snapToGrid: true,
                minDistance: 10,
                maxDistance: 100,
            };

            // Start drag - this creates drag offset
            const dragState = segmentDragHandler.startSegmentDrag(
                segment,
                startMousePosition
            );

            // Update drag
            const updatedState = segmentDragHandler.updateSegmentDrag(
                mousePosition,
                segment,
                constraints
            );

            expect(updatedState).not.toBeNull();
            // X position = mousePosition.x - dragOffset.x = 220 - 5 = 215, then snapped to grid = 220
            expect(updatedState!.constrainedPosition.x).toBe(220); // Can move horizontally
            // Y remains locked at original midpoint due to free-axis snapping only
            expect(updatedState!.constrainedPosition.y).toBe(125);
        });

        it("should apply vertical movement constraints for horizontal segments", () => {
            const segment = mockSegments[0]; // horizontal segment (midpoint at x:150, y:100)
            const startMousePosition = { x: 155, y: 105 }; // Start with offset
            const mousePosition = { x: 160, y: 120 };
            const constraints: SegmentDragConstraints = {
                axis: "y",
                snapToGrid: true,
                minDistance: 10,
                maxDistance: 100,
            };

            // Start drag - this creates drag offset
            const dragState = segmentDragHandler.startSegmentDrag(
                segment,
                startMousePosition
            );

            // Update drag
            const updatedState = segmentDragHandler.updateSegmentDrag(
                mousePosition,
                segment,
                constraints
            );

            expect(updatedState).not.toBeNull();
            // X remains locked at original midpoint due to free-axis snapping only
            expect(updatedState!.constrainedPosition.x).toBe(150);
            // Y position = mousePosition.y - dragOffset.y = 120 - 5 = 115, then snapped to grid = 120
            expect(updatedState!.constrainedPosition.y).toBe(120); // Can move vertically
        });

        it("should apply grid snapping when enabled", () => {
            const segment = mockSegments[1]; // vertical segment
            const mousePosition = { x: 217, y: 132 }; // Off-grid position
            const constraints: SegmentDragConstraints = {
                axis: "x",
                snapToGrid: true,
                minDistance: 10,
                maxDistance: 100,
            };

            // Start drag
            segmentDragHandler.startSegmentDrag(segment, { x: 200, y: 125 });

            // Update drag
            const updatedState = segmentDragHandler.updateSegmentDrag(
                mousePosition,
                segment,
                constraints
            );

            expect(updatedState).not.toBeNull();
            // Should snap to nearest grid point (grid size = 20)
            expect(updatedState!.constrainedPosition.x).toBe(220);
        });
    });

    describe("calculateUpdatedControlPoints", () => {
        it("should move vertical segment as a unit while preserving shape", () => {
            const originalControlPoints: Point[] = [
                { x: 200, y: 100 },
                { x: 200, y: 150 },
            ];

            const draggedSegment = mockSegments[1]; // vertical segment
            const newMidpoint = { x: 220, y: 125 }; // Moved right by 20px

            const updatedControlPoints =
                segmentDragHandler.calculateUpdatedControlPoints(
                    originalControlPoints,
                    draggedSegment,
                    newMidpoint,
                    sourcePoint,
                    targetPoint
                );

            expect(updatedControlPoints).toHaveLength(2);
            // Both control points should move by the same translation vector
            expect(updatedControlPoints[0].x).toBe(220); // Original x:200 + translation x:20 = 220
            expect(updatedControlPoints[0].y).toBe(100); // Y unchanged
            expect(updatedControlPoints[1].x).toBe(220); // Original x:200 + translation x:20 = 220
            expect(updatedControlPoints[1].y).toBe(150); // Y unchanged
        });

        it("should move horizontal segment vertically only while preserving shape", () => {
            const originalControlPoints: Point[] = [
                { x: 200, y: 100 },
                { x: 200, y: 150 },
            ];

            const draggedSegment = mockSegments[0]; // horizontal segment (source → controlPoints[0])
            const newMidpoint = { x: 150, y: 120 }; // Moved down by 20px

            const updatedControlPoints =
                segmentDragHandler.calculateUpdatedControlPoints(
                    originalControlPoints,
                    draggedSegment,
                    newMidpoint,
                    sourcePoint,
                    targetPoint
                );

            expect(updatedControlPoints).toHaveLength(2);
            // First control point should move only vertically (horizontal segments can only move up/down)
            expect(updatedControlPoints[0].x).toBe(200); // X unchanged (horizontal segments only move vertically)
            expect(updatedControlPoints[0].y).toBe(120); // Original y:100 + translation y:20 = 120
            // Second control point should not be affected (segment 0 only affects control point 0)
            expect(updatedControlPoints[1].x).toBe(200);
            expect(updatedControlPoints[1].y).toBe(150);
        });
    });

    describe("endSegmentDrag", () => {
        it("should clear drag state and return final state", () => {
            const segment = mockSegments[0];
            const mousePosition = { x: 160, y: 110 };

            // Start drag
            const initialState = segmentDragHandler.startSegmentDrag(
                segment,
                mousePosition
            );
            expect(segmentDragHandler.isDragging()).toBe(true);

            // End drag
            const finalState = segmentDragHandler.endSegmentDrag();

            expect(finalState).toEqual(initialState);
            expect(segmentDragHandler.isDragging()).toBe(false);
            expect(segmentDragHandler.getCurrentDragState()).toBeNull();
        });
    });

    describe("isDragging and getCurrentDragState", () => {
        it("should track drag state correctly", () => {
            expect(segmentDragHandler.isDragging()).toBe(false);
            expect(segmentDragHandler.getCurrentDragState()).toBeNull();

            // Start dragging
            const segment = mockSegments[0];
            const dragState = segmentDragHandler.startSegmentDrag(segment, {
                x: 150,
                y: 100,
            });

            expect(segmentDragHandler.isDragging()).toBe(true);
            expect(segmentDragHandler.getCurrentDragState()).toEqual(dragState);

            // End dragging
            segmentDragHandler.endSegmentDrag();

            expect(segmentDragHandler.isDragging()).toBe(false);
            expect(segmentDragHandler.getCurrentDragState()).toBeNull();
        });
    });
});
