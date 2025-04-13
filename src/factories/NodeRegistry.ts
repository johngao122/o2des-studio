import { BaseNode } from '../types/base';
import { NODE_TYPES } from '@/components/nodes';

export type NodeCreator = (position: { x: number; y: number }, data?: any) => Omit<BaseNode, 'id' | 'type'>;

export class NodeRegistry {
  private static instance: NodeRegistry;
  private nodeTypes: Map<string, NodeCreator> = new Map();

  private constructor() {
    // CHANGE WHEN NODES IS SET UP TO A FUNCTION
    this.register(NODE_TYPES.INITIALIZATION, (position) => ({
      name: 'Initialization',
      position,
      data: { initializations: [] }
    }));
  }

  static getInstance(): NodeRegistry {
    if (!NodeRegistry.instance) {
      NodeRegistry.instance = new NodeRegistry();
    }
    return NodeRegistry.instance;
  }

  register(type: string, creator: NodeCreator) {
    this.nodeTypes.set(type, creator);
  }

  getCreator(type: string): NodeCreator | undefined {
    return this.nodeTypes.get(type);
  }

  hasType(type: string): boolean {
    return this.nodeTypes.has(type);
  }
} 