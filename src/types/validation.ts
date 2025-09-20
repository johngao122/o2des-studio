export interface ValidationError {
    elementId: string;
    elementType: 'node' | 'edge';
    errorType: 'missing_initialization' | 'undeclared_variable' | 'invalid_state_update' | 'invalid_condition';
    message: string;
    field?: string;
    undeclaredVariables?: string[];
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}

export interface ModelValidationState {
    errors: ValidationError[];
    errorMap: Record<string, ValidationError[]>;
    lastValidated: string | null;
    isValidating: boolean;
}
