import { BaseNode, BaseEdge } from '../types/base';

interface Template {
  id: string;
  name: string;
  description: string;
  nodes: BaseNode[];
  edges: BaseEdge[];
  metadata: {
    type: 'event' | 'state' | 'activity';
    tags: string[];
    created: string;
    modified: string;
  };
}

export class TemplateService {
  private templates: Map<string, Template> = new Map();

  registerTemplate(template: Template) {
    this.templates.set(template.id, template);
  }

  getTemplate(id: string): Template | undefined {
    return this.templates.get(id);
  }

  listTemplates(): Template[] {
    return Array.from(this.templates.values());
  }

  getTemplatesByType(type: 'event' | 'state' | 'activity'): Template[] {
    return this.listTemplates().filter(template => template.metadata.type === type);
  }

  searchTemplates(query: string): Template[] {
    const lowercaseQuery = query.toLowerCase();
    return this.listTemplates().filter(template => 
      template.name.toLowerCase().includes(lowercaseQuery) ||
      template.description.toLowerCase().includes(lowercaseQuery) ||
      template.metadata.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }
} 