import { BaseNode, BaseEdge } from "../types/base";
import { ValidationError, ValidationResult } from "../types/validation";

export class GraphValidationService {
    private static instance: GraphValidationService;

    static getInstance(): GraphValidationService {
        if (!GraphValidationService.instance) {
            GraphValidationService.instance = new GraphValidationService();
        }
        return GraphValidationService.instance;
    }

    /**
     * Parse LaTeX expressions and extract variable names
     */
    parseLatexExpression(latex: string): string[] {
        if (!latex || typeof latex !== 'string') return [];

        // Remove LaTeX commands and math delimiters
        let cleaned = latex
            .replace(/\$+/g, '') // Remove $ delimiters
            .replace(/\\[a-zA-Z]+\{[^}]*\}/g, '') // Remove LaTeX commands with braces
            .replace(/\\[a-zA-Z]+/g, '') // Remove LaTeX commands
            .replace(/[{}]/g, '') // Remove remaining braces
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();

        // Extract variable names (letters followed by optional numbers/subscripts)
        const variablePattern = /\b[a-zA-Z][a-zA-Z0-9_]*\b/g;
        const matches = cleaned.match(variablePattern) || [];

        // Filter out common mathematical constants and functions
        const mathConstants = new Set([
            'sin', 'cos', 'tan', 'log', 'ln', 'exp', 'sqrt', 'abs',
            'min', 'max', 'sum', 'prod', 'int', 'pi', 'e', 'inf',
            'True', 'False', 'true', 'false', 'and', 'or', 'not'
        ]);

        const variables = matches.filter(match => !mathConstants.has(match));
        return [...new Set(variables)]; // Remove duplicates
    }

    /**
     * Parse initialization declarations (e.g., "q = 0; s = 0")
     */
    parseInitializations(initializations: string | string[]): string[] {
        if (!initializations) return [];

        let initString = '';
        if (Array.isArray(initializations)) {
            initString = initializations.join('; ');
        } else {
            initString = initializations;
        }

        // Remove LaTeX delimiters if present
        initString = initString.replace(/\$+/g, '');

        // Extract variable names from assignments (variable = value)
        const assignmentPattern = /([a-zA-Z][a-zA-Z0-9_]*)\s*=\s*[^;]*/g;
        const variables: string[] = [];
        let match;

        while ((match = assignmentPattern.exec(initString)) !== null) {
            variables.push(match[1]);
        }

        return [...new Set(variables)];
    }

    /**
     * Parse state update expressions (e.g., "{q++; s--}")
     */
    parseStateUpdate(stateUpdate: string): string[] {
        if (!stateUpdate || typeof stateUpdate !== 'string') return [];

        // Remove braces and LaTeX delimiters
        let cleaned = stateUpdate
            .replace(/[{}$]/g, '')
            .trim();

        // Extract variables from operations like q++, s--, q = q + 1, etc.
        const variables: string[] = [];

        // Match increment/decrement operations
        const incDecPattern = /([a-zA-Z][a-zA-Z0-9_]*)\s*(\+\+|--)/g;
        let match;
        while ((match = incDecPattern.exec(cleaned)) !== null) {
            variables.push(match[1]);
        }

        // Match assignment operations
        const assignmentPattern = /([a-zA-Z][a-zA-Z0-9_]*)\s*=/g;
        while ((match = assignmentPattern.exec(cleaned)) !== null) {
            variables.push(match[1]);
        }

        // Extract any remaining variable references
        const additionalVars = this.parseLatexExpression(cleaned);
        variables.push(...additionalVars);

        return [...new Set(variables)];
    }

    /**
     * Find the initialization node in the model
     */
    findInitializationNode(nodes: BaseNode[]): BaseNode | null {
        return nodes.find(node => node.type === 'initialization') || null;
    }

    /**
     * Get all declared variables from initialization nodes
     */
    getDeclaredVariables(nodes: BaseNode[]): string[] {
        const initNode = this.findInitializationNode(nodes);
        if (!initNode || !initNode.data?.initializations) {
            return [];
        }

        return this.parseInitializations(initNode.data.initializations);
    }

    /**
     * Validate a single initialization node
     */
    validateInitializationNode(node: BaseNode, allNodes: BaseNode[]): ValidationError[] {
        const errors: ValidationError[] = [];

        if (node.type !== 'initialization') return errors;

        // When the initialization node has no declarations yet, skip validation.
        if (!node.data?.initializations ||
            (Array.isArray(node.data.initializations) && node.data.initializations.length === 0) ||
            (typeof node.data.initializations === 'string' && node.data.initializations.trim() === '')) {
            return errors;
        }

        // Placeholder for future initialization-specific validations.

        return errors;
    }

    /**
     * Validate an event node
     */
    validateEventNode(node: BaseNode, declaredVariables: string[]): ValidationError[] {
        const errors: ValidationError[] = [];

        if (node.type !== 'event') return errors;

        if (declaredVariables.length === 0) {
            return errors;
        }

        // Validate state updates
        if (node.data?.stateUpdate) {
            const usedVariables = this.parseStateUpdate(node.data.stateUpdate);
            const undeclaredVars = usedVariables.filter(v => !declaredVariables.includes(v));

            if (undeclaredVars.length > 0) {
                errors.push({
                    elementId: node.id,
                    elementType: 'node',
                    errorType: 'undeclared_variable',
                    message: `State update references undeclared variables: ${undeclaredVars.join(', ')}`,
                    field: 'stateUpdate',
                    undeclaredVariables: undeclaredVars
                });
            }
        }

        return errors;
    }

    /**
     * Validate an initialization edge
     */
    validateInitializationEdge(edge: BaseEdge, declaredVariables: string[]): ValidationError[] {
        const errors: ValidationError[] = [];

        if (edge.type !== 'initialization') return errors;

        if (declaredVariables.length === 0) {
            return errors;
        }

        // Validate initial delay
        if (edge.data?.initialDelay) {
            const usedVariables = this.parseLatexExpression(edge.data.initialDelay);
            const undeclaredVars = usedVariables.filter(v => !declaredVariables.includes(v));

            if (undeclaredVars.length > 0) {
                errors.push({
                    elementId: edge.id,
                    elementType: 'edge',
                    errorType: 'undeclared_variable',
                    message: `Initial delay references undeclared variables: ${undeclaredVars.join(', ')}`,
                    field: 'initialDelay',
                    undeclaredVariables: undeclaredVars
                });
            }
        }

        return errors;
    }

    /**
     * Validate an event graph edge
     */
    validateEventGraphEdge(edge: BaseEdge, declaredVariables: string[]): ValidationError[] {
        const errors: ValidationError[] = [];

        if (edge.type !== 'eventGraph') return errors;

        if (declaredVariables.length === 0) {
            return errors;
        }

        // Validate condition
        if (edge.data?.condition && edge.data.condition !== 'True') {
            const usedVariables = this.parseLatexExpression(edge.data.condition);
            const undeclaredVars = usedVariables.filter(v => !declaredVariables.includes(v));

            if (undeclaredVars.length > 0) {
                errors.push({
                    elementId: edge.id,
                    elementType: 'edge',
                    errorType: 'invalid_condition',
                    message: `Condition references undeclared variables: ${undeclaredVars.join(', ')}`,
                    field: 'condition',
                    undeclaredVariables: undeclaredVars
                });
            }
        }

        // Validate delay
        if (edge.data?.delay) {
            const usedVariables = this.parseLatexExpression(edge.data.delay);
            const undeclaredVars = usedVariables.filter(v => !declaredVariables.includes(v));

            if (undeclaredVars.length > 0) {
                errors.push({
                    elementId: edge.id,
                    elementType: 'edge',
                    errorType: 'undeclared_variable',
                    message: `Delay references undeclared variables: ${undeclaredVars.join(', ')}`,
                    field: 'delay',
                    undeclaredVariables: undeclaredVars
                });
            }
        }

        // Validate parameter
        if (edge.data?.parameter) {
            const usedVariables = this.parseLatexExpression(edge.data.parameter);
            const undeclaredVars = usedVariables.filter(v => !declaredVariables.includes(v));

            if (undeclaredVars.length > 0) {
                errors.push({
                    elementId: edge.id,
                    elementType: 'edge',
                    errorType: 'undeclared_variable',
                    message: `Parameter references undeclared variables: ${undeclaredVars.join(', ')}`,
                    field: 'parameter',
                    undeclaredVariables: undeclaredVars
                });
            }
        }

        return errors;
    }

    /**
     * Validate the entire model
     */
    validateModel(nodes: BaseNode[], edges: BaseEdge[]): ValidationResult {
        const errors: ValidationError[] = [];

        // Check for initialization node presence
        const initNode = this.findInitializationNode(nodes);
        if (!initNode) {
            errors.push({
                elementId: 'model',
                elementType: 'node',
                errorType: 'missing_initialization',
                message: 'Model must begin with an initialization node that declares all variables'
            });
            return { isValid: false, errors };
        }

        // Get declared variables
        const declaredVariables = this.getDeclaredVariables(nodes);

        // Validate initialization node
        errors.push(...this.validateInitializationNode(initNode, nodes));

        // Validate all nodes
        for (const node of nodes) {
            if (node.type === 'event') {
                errors.push(...this.validateEventNode(node, declaredVariables));
            }
        }

        // Validate all edges
        for (const edge of edges) {
            if (edge.type === 'initialization') {
                errors.push(...this.validateInitializationEdge(edge, declaredVariables));
            } else if (edge.type === 'eventGraph') {
                errors.push(...this.validateEventGraphEdge(edge, declaredVariables));
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate a specific element by ID
     */
    validateElement(elementId: string, nodes: BaseNode[], edges: BaseEdge[]): ValidationError[] {
        const declaredVariables = this.getDeclaredVariables(nodes);
        const errors: ValidationError[] = [];

        // Check if it's a node
        const node = nodes.find(n => n.id === elementId);
        if (node) {
            if (node.type === 'initialization') {
                errors.push(...this.validateInitializationNode(node, nodes));
            } else if (node.type === 'event') {
                errors.push(...this.validateEventNode(node, declaredVariables));
            }
            return errors;
        }

        // Check if it's an edge
        const edge = edges.find(e => e.id === elementId);
        if (edge) {
            if (edge.type === 'initialization') {
                errors.push(...this.validateInitializationEdge(edge, declaredVariables));
            } else if (edge.type === 'eventGraph') {
                errors.push(...this.validateEventGraphEdge(edge, declaredVariables));
            }
            return errors;
        }

        return errors;
    }
}
