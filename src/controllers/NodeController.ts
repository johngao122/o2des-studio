import { useStore } from '../store';
import { BaseNode } from '../types/base';

export class NodeController {
  addNode(node: BaseNode) {
    useStore.setState((state) => ({
      nodes: [...state.nodes, node]
    }));
  }

  removeNode(nodeId: string) {
    useStore.setState((state) => ({
      nodes: state.nodes.filter(node => node.id !== nodeId)
    }));
  }

  updateNode(nodeId: string, updates: Partial<BaseNode>) {
    useStore.setState((state) => ({
      nodes: state.nodes.map(node => 
        node.id === nodeId ? { ...node, ...updates } : node
      )
    }));
  }

  getNode(nodeId: string): BaseNode | undefined {
    return useStore.getState().nodes.find(node => node.id === nodeId);
  }
} 