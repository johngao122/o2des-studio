# Design Document

## Overview

The orthogonal edge routing system will transform the current diagonal edge connections into professional-looking orthogonal (horizontal and vertical only) paths. The system will intelligently select optimal handle positions and routing strategies while providing clear visual feedback to users about routing decisions.

Based on analysis of the current codebase, the system uses React Flow with custom edge components (`BaseEdgeComponent`) and control points for path generation. Nodes have multiple handles positioned at top, right, bottom, and left sides with grid-aligned positioning. The current system supports straight, bezier, and rounded edge types with manual control point manipulation.

## Architecture

### Core Components

#### 1. Orthogonal Routing Engine (`OrthogonalRoutingEngine`)

-   **Purpose**: Central algorithm for calculating orthogonal paths between node handles
-   **Location**: `src/lib/routing/OrthogonalRoutingEngine.ts`
-   **Responsibilities**:
    -   Calculate horizontal-first and vertical-first routing options
    -   Evaluate path efficiency and select optimal routes
    -   Handle obstacle avoidance using orthogonal segments
    -   Provide routing metrics and decision rationale

#### 2. Handle Selection Service (`HandleSelectionService`)

-   **Purpose**: Intelligent selection of optimal source and target handles using Manhattan distance
-   **Location**: `src/lib/routing/HandleSelectionService.ts`
-   **Responsibilities**:
    -   Evaluate all possible handle combinations between source and target nodes
    -   Calculate Manhattan distance between all handle pairs
    -   Select handle combination with minimum Manhattan distance
    -   Support dynamic handle switching during edge creation
    -   Provide tie-breaking logic when multiple combinations have equal distances

#### 3. Routing Feedback System (`RoutingFeedbackSystem`)

-   **Purpose**: Visual and logging feedback for routing decisions
-   **Location**: `src/lib/routing/RoutingFeedbackSystem.ts`
-   **Responsibilities**:
    -   Display routing decision indicators in UI
    -   Log routing metrics and efficiency data
    -   Highlight selected handles during edge creation
    -   Show path comparison information

#### 4. Enhanced Edge Preview (`OrthogonalEdgePreview`)

-   **Purpose**: Real-time orthogonal preview during edge creation
-   **Location**: `src/components/edges/OrthogonalEdgePreview.tsx`
-   **Responsibilities**:
    -   Render orthogonal preview paths during drag operations
    -   Update handle selection dynamically
    -   Display routing feedback in real-time
    -   Integrate with existing React Flow connection system

## Components and Interfaces

### Routing Engine Interface

```typescript
interface OrthogonalRoutingEngine {
    calculateOrthogonalPath(
        sourceHandle: HandleInfo,
        targetHandle: HandleInfo,
        obstacles?: NodeBounds[]
    ): OrthogonalPath;

    compareRoutingOptions(
        horizontalFirst: OrthogonalPath,
        verticalFirst: OrthogonalPath
    ): RoutingComparison;

    generateControlPoints(path: OrthogonalPath): ControlPoint[];
}

interface OrthogonalPath {
    segments: PathSegment[];
    totalLength: number;
    routingType: "horizontal-first" | "vertical-first";
    efficiency: number;
    controlPoints: ControlPoint[];
}

interface PathSegment {
    start: Point;
    end: Point;
    direction: "horizontal" | "vertical";
    length: number;
}
```

### Handle Selection Interface

```typescript
interface HandleSelectionService {
    findOptimalHandles(
        sourceNode: NodeInfo,
        targetNode: NodeInfo,
        targetPosition?: Point
    ): HandleCombination;

    calculateManhattanDistance(
        sourceHandle: HandleInfo,
        targetHandle: HandleInfo
    ): number;

    evaluateHandleCombination(
        sourceHandle: HandleInfo,
        targetHandle: HandleInfo
    ): HandleEvaluation;

    getAllHandleCombinations(
        sourceNode: NodeInfo,
        targetNode: NodeInfo
    ): HandleCombination[];
}

interface HandleCombination {
    sourceHandle: HandleInfo;
    targetHandle: HandleInfo;
    manhattanDistance: number;
    pathLength: number;
    efficiency: number;
    routingType: "horizontal-first" | "vertical-first";
}
```

### Feedback System Interface

```typescript
interface RoutingFeedbackSystem {
    displayRoutingDecision(decision: RoutingDecision): void;
    highlightSelectedHandles(handles: HandleInfo[]): void;
    logRoutingMetrics(metrics: RoutingMetrics): void;
    showPathComparison(comparison: RoutingComparison): void;
}

interface RoutingDecision {
    selectedPath: OrthogonalPath;
    alternativePath: OrthogonalPath;
    reason: string;
    efficiency: number;
}
```

## Data Models

### Core Data Structures

```typescript
interface Point {
    x: number;
    y: number;
}

interface HandleInfo {
    id: string;
    nodeId: string;
    position: Point;
    side: "top" | "right" | "bottom" | "left";
    type: "source" | "target";
}

interface NodeInfo {
    id: string;
    bounds: NodeBounds;
    handles: HandleInfo[];
}

interface NodeBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface ControlPoint {
    x: number;
    y: number;
    type: "corner" | "intermediate";
}

interface RoutingMetrics {
    pathLength: number;
    segmentCount: number;
    routingType: "horizontal-first" | "vertical-first";
    efficiency: number;
    handleCombination: string;
}
```

### Enhanced Edge Data Model

```typescript
interface OrthogonalEdgeData extends BaseEdgeData {
    routingType: "horizontal-first" | "vertical-first";
    routingMetrics: RoutingMetrics;
    selectedHandles: {
        source: HandleInfo;
        target: HandleInfo;
    };
    alternativeRoutes?: OrthogonalPath[];
}
```

## Error Handling

### Routing Fallbacks

-   **Invalid Handle Positions**: Fall back to center-to-center routing
-   **Impossible Orthogonal Paths**: Use simplified L-shaped routing
-   **Performance Issues**: Implement path caching and optimization limits
-   **Node Overlap Scenarios**: Apply minimum separation distances

### Edge Cases

-   **Self-connecting Edges**: Special orthogonal loop handling
-   **Zero-distance Connections**: Minimum path length enforcement
-   **Dynamic Node Resizing**: Real-time path recalculation
-   **Handle Availability**: Graceful degradation when handles are unavailable

## Testing Strategy

### Unit Testing

-   **Routing Algorithm Tests**: Verify orthogonal path calculations
-   **Handle Selection Tests**: Validate optimal handle identification
-   **Path Optimization Tests**: Ensure efficiency calculations are correct
-   **Edge Case Tests**: Cover all fallback scenarios

### Integration Testing

-   **React Flow Integration**: Test with existing edge system
-   **Node Interaction Tests**: Verify handle selection with different node types
-   **Performance Tests**: Measure routing calculation performance
-   **Visual Regression Tests**: Ensure UI feedback works correctly

### User Acceptance Testing

-   **Routing Quality**: Verify paths look professional and logical
-   **Performance**: Ensure real-time responsiveness during edge creation
-   **Feedback Clarity**: Validate user understanding of routing decisions
-   **Compatibility**: Test with existing diagrams and edge types

## Performance Considerations

### Optimization Strategies

-   **Path Caching**: Cache calculated paths for repeated handle combinations
-   **Lazy Evaluation**: Calculate alternative routes only when needed
-   **Spatial Indexing**: Use spatial data structures for obstacle detection
-   **Throttled Updates**: Limit recalculation frequency during drag operations

### Memory Management

-   **Route Cleanup**: Remove cached routes when nodes are deleted
-   **Feedback Cleanup**: Clear visual indicators when not needed
-   **Event Listener Management**: Proper cleanup of routing event handlers

## Migration Strategy

### Backward Compatibility

-   **Existing Edges**: Automatically convert existing edges to orthogonal routing
-   **Control Points**: Preserve user-customized control points where possible
-   **Edge Properties**: Maintain all existing edge styling and properties
-   **API Compatibility**: Ensure existing edge manipulation APIs continue working

### Gradual Rollout

-   **Feature Flag**: Allow toggling between old and new routing systems
-   **Progressive Enhancement**: Start with new edges, then migrate existing ones
-   **User Preference**: Option to disable orthogonal routing if needed
-   **Fallback Mode**: Automatic fallback to original system if issues occur
