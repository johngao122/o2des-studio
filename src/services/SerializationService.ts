import { BaseNode, BaseEdge } from '../types/base';

interface SerializedModel {
  nodes: BaseNode[];
  edges: BaseEdge[];
  metadata: {
    version: string;
    created: string;
    modified: string;
  };
}

export class SerializationService {
  serializeModel(nodes: BaseNode[], edges: BaseEdge[]): SerializedModel {
    return {
      nodes,
      edges,
      metadata: {
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      }
    };
  }

  deserializeModel(serialized: SerializedModel): { nodes: BaseNode[]; edges: BaseEdge[] } {
    // Here we could add version checking and migration logic if needed
    return {
      nodes: serialized.nodes,
      edges: serialized.edges
    };
  }

  exportToJSON(model: SerializedModel): string {
    return JSON.stringify(model, null, 2);
  }

  importFromJSON(json: string): SerializedModel {
    try {
      return JSON.parse(json);
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  }
} 