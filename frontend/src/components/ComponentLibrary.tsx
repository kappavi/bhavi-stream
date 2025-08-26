import React from 'react';
import { ComponentDefinition } from '../types/components';
import './ComponentLibrary.css';

interface ComponentLibraryProps {
  components: Record<string, ComponentDefinition>;
  onComponentSelect: (component: ComponentDefinition) => void;
}

const ComponentLibrary: React.FC<ComponentLibraryProps> = ({ 
  components, 
  onComponentSelect 
}) => {
  const categories = Object.values(components).reduce((acc, component) => {
    if (!acc[component.category]) {
      acc[component.category] = [];
    }
    acc[component.category].push(component);
    return acc;
  }, {} as Record<string, ComponentDefinition[]>);

  return (
    <div className="component-library">
      <h3>Component Library</h3>
      {Object.entries(categories).map(([category, categoryComponents]) => (
        <div key={category} className="category">
          <h4 className="category-title">{category.replace('_', ' ').toUpperCase()}</h4>
          <div className="components-grid">
            {categoryComponents.map((component) => (
              <div
                key={component.id}
                className="component-item"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('component', JSON.stringify(component));
                }}
                onClick={() => onComponentSelect(component)}
                title={component.name}
              >
                <div className="component-icon">{component.icon}</div>
                <div className="component-name">{component.name}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ComponentLibrary;
