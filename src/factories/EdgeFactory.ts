import { BaseEdge, EdgeConditions } from '../types/base';
import { nanoid } from 'nanoid';

type EdgeCreator = (source: string, target: string, data?: any) => Omit<BaseEdge, 'id'>;

export class EdgeFactory {
  private edgeTypes: Map<string, EdgeCreator> = new Map();

  registerEdgeType(type: string, creator: EdgeCreator) {
    this.edgeTypes.set(type, creator);
  }

  createEdge(type: string, source: string, target: string, data?: any): BaseEdge {
    const creator = this.edgeTypes.get(type);
    if (!creator) {
      throw new Error(`Edge type ${type} is not registered`);
    }

    const edge = creator(source, target, data);
    return {
      ...edge,
      id: nanoid()
    };
  }
} 