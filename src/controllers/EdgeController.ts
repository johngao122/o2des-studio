import { useStore } from '../store';
import { BaseEdge } from '../types/base';

export class EdgeController {
  addEdge(edge: BaseEdge) {
    useStore.setState((state) => ({
      edges: [...state.edges, edge]
    }));
  }

  removeEdge(edgeId: string) {
    useStore.setState((state) => ({
      edges: state.edges.filter(edge => edge.id !== edgeId)
    }));
  }

  updateEdge(edgeId: string, updates: Partial<BaseEdge>) {
    useStore.setState((state) => ({
      edges: state.edges.map(edge => 
        edge.id === edgeId ? { ...edge, ...updates } : edge
      )
    }));
  }

  getEdge(edgeId: string): BaseEdge | undefined {
    return useStore.getState().edges.find(edge => edge.id === edgeId);
  }

  getConnectedEdges(nodeId: string): BaseEdge[] {
    return useStore.getState().edges.filter(
      edge => edge.source === nodeId || edge.target === nodeId
    );
  }
} 