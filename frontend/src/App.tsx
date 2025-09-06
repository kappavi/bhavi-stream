import React, { useState, useEffect } from 'react';
import ComponentLibrary from './components/ComponentLibrary';
import SchematicCanvas from './components/SchematicCanvas';
import PropertyPanel from './components/PropertyPanel';
import { ApiService } from './services/api';
import { 
  ComponentLibrary as ComponentLibraryType, 
  ComponentInstance, 
  ComponentDefinition,
  SchematicConnection,
  ComponentGroup 
} from './types/components';
import './App.css';

function App() {
  const [componentLibrary, setComponentLibrary] = useState<ComponentLibraryType>({});
  const [schematicComponents, setSchematicComponents] = useState<ComponentInstance[]>([]);
  const [schematicConnections, setSchematicConnections] = useState<SchematicConnection[]>([]);
  const [schematicGroups, setSchematicGroups] = useState<ComponentGroup[]>([]);
  const [selectedComponents, setSelectedComponents] = useState<ComponentInstance[]>([]);
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
    setSelectedComponents([newComponent]);
  };

  const handleComponentUpdate = (componentId: string, updates: Partial<ComponentInstance>) => {
    setSchematicComponents(prev => 
      prev.map(comp => 
        comp.id === componentId ? { ...comp, ...updates } : comp
      )
    );

    // Update selected components if any match the updated component
    setSelectedComponents(prev => 
      prev.map(comp => 
        comp.id === componentId ? { ...comp, ...updates } : comp
      )
    );

    // Clean up empty groups if component was ungrouped
    if (updates.groupId === undefined) {
      setTimeout(() => {
        setSchematicGroups(prevGroups => 
          prevGroups.filter(group => 
            schematicComponents.some(comp => comp.groupId === group.id)
          )
        );
      }, 0);
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

    // Update selected components if any match the updated component
    setSelectedComponents(prev => 
      prev.map(comp => 
        comp.id === componentId ? { 
          ...comp, 
          parameters: { 
            ...comp.parameters, 
            [parameterName]: value 
          } 
        } : comp
      )
    );
  };

  const handleConnectionAdd = (connection: SchematicConnection) => {
    setSchematicConnections(prev => [...prev, connection]);
  };

  const handleConnectionUpdate = (connectionId: string, updates: Partial<SchematicConnection>) => {
    setSchematicConnections(prev => 
      prev.map(conn => 
        conn.id === connectionId ? { ...conn, ...updates } : conn
      )
    );
  };

  const handleComponentSelect = (component: ComponentInstance | null, multiSelect: boolean = false) => {
    if (!component) {
      setSelectedComponents([]);
      return;
    }

    if (multiSelect) {
      setSelectedComponents(prev => {
        const isAlreadySelected = prev.some(c => c.id === component.id);
        if (isAlreadySelected) {
          return prev.filter(c => c.id !== component.id);
        } else {
          return [...prev, component];
        }
      });
    } else {
      setSelectedComponents([component]);
    }
  };

  const handleGroupCreate = (componentIds: string[]) => {
    const newGroup: ComponentGroup = {
      id: `group_${Date.now()}`,
      name: `Group ${schematicGroups.length + 1}`,
      componentIds,
      x: 0,
      y: 0,
      width: 0,
      height: 0
    };

    // Update components to belong to this group
    setSchematicComponents(prev => 
      prev.map(comp => 
        componentIds.includes(comp.id) 
          ? { ...comp, groupId: newGroup.id }
          : comp
      )
    );

    setSchematicGroups(prev => [...prev, newGroup]);
    setSelectedComponents([]);
  };

  const handleGroupUpdate = (groupId: string, updates: Partial<ComponentGroup>) => {
    setSchematicGroups(prev => 
      prev.map(group => 
        group.id === groupId ? { ...group, ...updates } : group
      )
    );
  };

  const handleSaveSchematic = async () => {
    try {
      const schematic = {
        id: 'temp',
        name: 'Untitled Schematic',
        components: schematicComponents,
        connections: schematicConnections,
        groups: schematicGroups
      };
      
      await ApiService.saveSchematic(schematic);
      alert('Schematic saved successfully!');
    } catch (err) {
      alert('Failed to save schematic');
      console.error('Error saving schematic:', err);
    }
  };

  const handleExportPNG = () => {
    // Trigger PNG export from canvas
    if ((window as any).exportSchematicPNG) {
      (window as any).exportSchematicPNG();
    } else {
      alert('PNG export not available');
    }
  };

  const handleClearAll = () => {
    if (schematicComponents.length === 0 && schematicConnections.length === 0) {
      alert('Canvas is already empty');
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to clear all components, connections, and groups? This action cannot be undone.'
    );
    
    if (confirmed) {
      setSchematicComponents([]);
      setSchematicConnections([]);
      setSchematicGroups([]);
      setSelectedComponents([]);
      alert('Canvas cleared successfully');
    }
  };

  const handleLoadDemo = () => {
    if (schematicComponents.length > 0) {
      const confirmed = window.confirm(
        'This will replace your current schematic with a demo. Continue?'
      );
      if (!confirmed) return;
    }

    // Create demo components
    const demoComponents: ComponentInstance[] = [
      {
        id: 'demo_tank_1',
        type: 'tank',
        name: 'Feed Tank T-101',
        x: 100,
        y: 150,
        parameters: {
          volume: 50,
          pressure_rating: 10,
          temperature_rating: 80,
          material: 'stainless_steel'
        },
        definition: componentLibrary.tank
      },
      {
        id: 'demo_pump_1',
        type: 'pump',
        name: 'Feed Pump P-101',
        x: 300,
        y: 200,
        parameters: {
          flow_rate: 25,
          head: 50,
          power: 5.5,
          efficiency: 75,
          npsh_required: 3
        },
        definition: componentLibrary.pump
      },
      {
        id: 'demo_valve_1',
        type: 'control_valve',
        name: 'Flow Control FCV-101',
        x: 500,
        y: 150,
        parameters: {
          cv: 12,
          pressure_rating: 16,
          fail_action: 'fail_closed',
          actuator_type: 'pneumatic',
          signal_range: '4-20mA'
        },
        definition: componentLibrary.control_valve
      },
      {
        id: 'demo_tank_2',
        type: 'tank',
        name: 'Product Tank T-102',
        x: 700,
        y: 150,
        parameters: {
          volume: 100,
          pressure_rating: 10,
          temperature_rating: 80,
          material: 'carbon_steel'
        },
        definition: componentLibrary.tank
      },
      {
        id: 'demo_controller_1',
        type: 'level_controller',
        name: 'Level Controller LC-101',
        x: 300,
        y: 50,
        parameters: {
          measurement_range: 5,
          control_mode: 'PI',
          output_signal: '4-20mA',
          setpoint: 3.5
        },
        definition: componentLibrary.level_controller
      }
    ];

    // Create demo connections
    const demoConnections: SchematicConnection[] = [
      {
        id: 'demo_conn_1',
        fromComponent: 'demo_tank_1',
        fromPort: 'outlet',
        toComponent: 'demo_pump_1',
        toPort: 'suction',
        points: [180, 165, 300, 215],
        type: 'pipe'
      },
      {
        id: 'demo_conn_2',
        fromComponent: 'demo_pump_1',
        fromPort: 'discharge',
        toComponent: 'demo_valve_1',
        toPort: 'inlet',
        points: [380, 215, 500, 165],
        type: 'pipe'
      },
      {
        id: 'demo_conn_3',
        fromComponent: 'demo_valve_1',
        fromPort: 'outlet',
        toComponent: 'demo_tank_2',
        toPort: 'inlet',
        points: [580, 165, 700, 165],
        type: 'pipe'
      },
      {
        id: 'demo_conn_4',
        fromComponent: 'demo_controller_1',
        fromPort: 'output',
        toComponent: 'demo_valve_1',
        toPort: 'control_signal',
        points: [380, 65, 520, 135],
        type: 'signal'
      }
    ];

    // Create a demo group
    const demoGroup: ComponentGroup = {
      id: 'demo_group_1',
      name: 'Pump & Control System',
      componentIds: ['demo_pump_1', 'demo_controller_1'],
      x: 0,
      y: 0,
      width: 0,
      height: 0
    };

    // Update components to belong to group
    demoComponents[1].groupId = 'demo_group_1'; // Pump
    demoComponents[4].groupId = 'demo_group_1'; // Controller

    // Set the demo data
    setSchematicComponents(demoComponents);
    setSchematicConnections(demoConnections);
    setSchematicGroups([demoGroup]);
    setSelectedComponents([]);

    alert('Demo schematic loaded! This shows a typical process flow with tank → pump → control valve → tank, including a level controller and grouped components.');
  };

  const handleExportJSON = () => {
    const exportData = {
      schematic: {
        components: schematicComponents,
        connections: schematicConnections,
        groups: schematicGroups
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
          <button onClick={handleLoadDemo} className="btn btn-success">
            🎯 Load Demo
          </button>
          <button onClick={handleClearAll} className="btn btn-warning">
            🗑️ Clear All
          </button>
          <button onClick={handleSaveSchematic} className="btn btn-primary">
            💾 Save Schematic
          </button>
          <button onClick={handleExportPNG} className="btn btn-secondary">
            🖼️ Export PNG
          </button>
          <button onClick={handleExportJSON} className="btn btn-secondary">
            📄 Export JSON
          </button>
          <button 
            onClick={() => {
              if (selectedComponents.length > 1) {
                handleGroupCreate(selectedComponents.map(c => c.id));
              }
            }}
            disabled={selectedComponents.length < 2}
            className="btn btn-secondary"
            title="Group selected components"
          >
            🔗 Group ({selectedComponents.length})
          </button>
          <button 
            onClick={() => {
              selectedComponents.forEach(comp => {
                if (comp.groupId) {
                  handleComponentUpdate(comp.id, { groupId: undefined });
                }
              });
            }}
            disabled={!selectedComponents.some(c => c.groupId)}
            className="btn btn-secondary"
            title="Ungroup selected components"
          >
            🔓 Ungroup
          </button>
          <span className="component-count">
            Components: {schematicComponents.length} | Connections: {schematicConnections.length} | Groups: {schematicGroups.length}
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
              <div className="help-section">
                <h4>🚀 Quick Start:</h4>
                <p><strong>New to P&ID?</strong> Click the <strong>"🎯 Load Demo"</strong> button to see a complete example schematic with tanks, pumps, valves, and controls!</p>
              </div>
              <ol>
                <li><strong>Add Components:</strong> Drag components from the left panel to the canvas</li>
                <li><strong>Connect Components:</strong> Click and drag from an output port (right side) to an input port (left side)</li>
                <li><strong>Multi-Select:</strong> Hold Ctrl/Cmd and click to select multiple components</li>
                <li><strong>Create Groups:</strong> Select multiple components, then:
                  <ul>
                    <li>Press Ctrl/Cmd+G, OR</li>
                    <li>Right-click and select "Group", OR</li>
                    <li>Click the Group button in the header</li>
                  </ul>
                </li>
                <li><strong>Edit Properties:</strong> Click on a component to edit its parameters in the right panel</li>
                <li><strong>Export:</strong> Save as PNG image or JSON data using the header buttons</li>
                <li><strong>Color Coding:</strong> 🔵 Pipe | 🟠 Signal | 🟢 Electrical</li>
              </ol>
            </div>
          )}
          <SchematicCanvas
            components={schematicComponents}
            connections={schematicConnections}
            groups={schematicGroups}
            selectedComponents={selectedComponents}
            onComponentAdd={handleComponentAdd}
            onComponentSelect={handleComponentSelect}
            onComponentUpdate={handleComponentUpdate}
            onConnectionAdd={handleConnectionAdd}
            onConnectionUpdate={handleConnectionUpdate}
            onGroupCreate={handleGroupCreate}
            onGroupUpdate={handleGroupUpdate}
            onExportPNG={handleExportPNG}
          />
        </div>

        <PropertyPanel
          selectedComponent={selectedComponents.length === 1 ? selectedComponents[0] : null}
          onParameterChange={handleParameterChange}
        />
      </main>
    </div>
  );
}

export default App;
