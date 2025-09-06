export interface Parameter {
  value: any;
  unit?: string;
  required: boolean;
  options?: string[];
}

export interface Connection {
  type: 'pipe' | 'signal' | 'electrical';
  direction: 'in' | 'out' | 'bidirectional';
}

export interface ComponentDefinition {
  id: string;
  name: string;
  category: string;
  icon: string;
  parameters: Record<string, Parameter>;
  connections: Record<string, Connection>;
  constraints: string[];
}

export interface ComponentInstance {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  parameters: Record<string, any>;
  definition: ComponentDefinition;
  groupId?: string;
  isSelected?: boolean;
}

export interface ComponentGroup {
  id: string;
  name: string;
  componentIds: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  isCollapsed?: boolean;
}

export interface SchematicConnection {
  id: string;
  fromComponent: string;
  fromPort: string;
  toComponent: string;
  toPort: string;
  points: number[];
  type: 'pipe' | 'signal' | 'electrical';
}

export interface ConnectionDraft {
  fromComponent: string;
  fromPort: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  type: 'pipe' | 'signal' | 'electrical';
}

export interface Schematic {
  id: string;
  name: string;
  components: ComponentInstance[];
  connections: SchematicConnection[];
  groups: ComponentGroup[];
}

export interface ComponentLibrary {
  [key: string]: ComponentDefinition;
}
