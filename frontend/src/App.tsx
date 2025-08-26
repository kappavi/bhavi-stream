import React, { useState, useEffect } from 'react';
import ComponentLibrary from './components/ComponentLibrary';
import SchematicCanvas from './components/SchematicCanvas';
import PropertyPanel from './components/PropertyPanel';
import { ApiService } from './services/api';
import { 
  ComponentLibrary as ComponentLibraryType, 
  ComponentInstance, 
  ComponentDefinition,
  SchematicConnection 
} from './types/components';
import './App.css';

function App() {
  const [componentLibrary, setComponentLibrary] = useState<ComponentLibraryType>({});
  const [schematicComponents, setSchematicComponents] = useState<ComponentInstance[]>([]);
  const [schematicConnections, setSchematicConnections] = useState<SchematicConnection[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<ComponentInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadComponents();
  }, []);

  const loadComponents = async () => {
    try {
      setLoading(true);
      const components = await ApiService.getComponents();
      setComponentLibrary(components);
    } catch (err) {
      setError('Failed to load component library');
      console.error('Error loading components:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleComponentAdd = (definition: ComponentDefinition, x: number, y: number) => {
    const newComponent: ComponentInstance = {
      id: `${definition.id}_${Date.now()}`,
      type: definition.id,
      name: `${definition.name} ${schematicComponents.length + 1}`,
      x,
      y,
      parameters: {},
      definition
    };

    setSchematicComponents(prev => [...prev, newComponent]);
    setSelectedComponent(newComponent);
  };

  const handleComponentUpdate = (componentId: string, updates: Partial<ComponentInstance>) => {
    setSchematicComponents(prev => 
      prev.map(comp => 
        comp.id === componentId ? { ...comp, ...updates } : comp
      )
    );

    // Update selected component if it's the one being updated
    if (selectedComponent?.id === componentId) {
      setSelectedComponent(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleParameterChange = (componentId: string, parameterName: string, value: any) => {
    setSchematicComponents(prev => 
      prev.map(comp => 
        comp.id === componentId 
          ? { 
              ...comp, 
              parameters: { 
                ...comp.parameters, 
                [parameterName]: value 
              } 
            } 
          : comp
      )
    );

    // Update selected component if it's the one being updated
    if (selectedComponent?.id === componentId) {
      setSelectedComponent(prev => 
        prev ? { 
          ...prev, 
          parameters: { 
            ...prev.parameters, 
            [parameterName]: value 
          } 
        } : null
      );
    }
  };

  const handleConnectionAdd = (connection: SchematicConnection) => {
    setSchematicConnections(prev => [...prev, connection]);
  };

  const handleSaveSchematic = async () => {
    try {
      const schematic = {
        id: 'temp',
        name: 'Untitled Schematic',
        components: schematicComponents,
        connections: schematicConnections
      };
      
      await ApiService.saveSchematic(schematic);
      alert('Schematic saved successfully!');
    } catch (err) {
      alert('Failed to save schematic');
      console.error('Error saving schematic:', err);
    }
  };

  const handleExportJSON = () => {
    const exportData = {
      schematic: {
        components: schematicComponents,
        connections: schematicConnections
      },
      timestamp: new Date().toISOString()
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pid-schematic.json';
    link.click();
    
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="app-loading">
        <p>Loading component library...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-error">
        <p>Error: {error}</p>
        <button onClick={loadComponents}>Retry</button>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>P&ID Schematic Editor</h1>
        <div className="header-actions">
          <button onClick={handleSaveSchematic} className="btn btn-primary">
            Save Schematic
          </button>
          <button onClick={handleExportJSON} className="btn btn-secondary">
            Export JSON
          </button>
          <span className="component-count">
            Components: {schematicComponents.length} | Connections: {schematicConnections.length}
          </span>
        </div>
      </header>

      <main className="app-main">
        <ComponentLibrary
          components={componentLibrary}
          onComponentSelect={(component) => console.log('Selected from library:', component)}
        />
        
        <div className="canvas-container">
          {schematicComponents.length === 0 && (
            <div className="canvas-help">
              <h3>🎯 How to create your P&ID:</h3>
              <ol>
                <li><strong>Add Components:</strong> Drag components from the left panel to the canvas</li>
                <li><strong>Connect Components:</strong> Click and drag from an output port (right side) to an input port (left side)</li>
                <li><strong>Edit Properties:</strong> Click on a component to edit its parameters in the right panel</li>
                <li><strong>Color Coding:</strong> 🔵 Pipe | 🟠 Signal | 🟢 Electrical</li>
              </ol>
            </div>
          )}
          <SchematicCanvas
            components={schematicComponents}
            connections={schematicConnections}
            onComponentAdd={handleComponentAdd}
            onComponentSelect={setSelectedComponent}
            selectedComponent={selectedComponent}
            onComponentUpdate={handleComponentUpdate}
            onConnectionAdd={handleConnectionAdd}
          />
        </div>

        <PropertyPanel
          selectedComponent={selectedComponent}
          onParameterChange={handleParameterChange}
        />
      </main>
    </div>
  );
}

export default App;
