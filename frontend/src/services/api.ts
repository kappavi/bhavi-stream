import { ComponentLibrary, ComponentDefinition, Schematic } from '../types/components';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:6969/api';

export class ApiService {
  static async getComponents(): Promise<ComponentLibrary> {
    const response = await fetch(`${API_BASE_URL}/components`);
    if (!response.ok) {
      throw new Error('Failed to fetch components');
    }
    return response.json();
  }

  static async getComponent(componentId: string): Promise<ComponentDefinition> {
    const response = await fetch(`${API_BASE_URL}/components/${componentId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch component ${componentId}`);
    }
    return response.json();
  }

  static async saveSchematic(schematic: Schematic): Promise<{ message: string; id: string }> {
    const response = await fetch(`${API_BASE_URL}/schematic`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(schematic),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save schematic');
    }
    return response.json();
  }

  static async getSchematic(schematicId: string): Promise<Schematic> {
    const response = await fetch(`${API_BASE_URL}/schematic/${schematicId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch schematic ${schematicId}`);
    }
    return response.json();
  }
}
