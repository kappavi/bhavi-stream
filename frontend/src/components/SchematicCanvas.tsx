import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Text, Circle, Group, Line } from 'react-konva';
import { ComponentInstance, ComponentDefinition, SchematicConnection, ConnectionDraft, ComponentGroup } from '../types/components';
import Konva from 'konva';

interface SchematicCanvasProps {
  components: ComponentInstance[];
  connections: SchematicConnection[];
  groups: ComponentGroup[];
  selectedComponents: ComponentInstance[];
  onComponentAdd: (component: ComponentDefinition, x: number, y: number) => void;
  onComponentSelect: (component: ComponentInstance | null, multiSelect?: boolean) => void;
  onComponentUpdate: (componentId: string, updates: Partial<ComponentInstance>) => void;
  onConnectionAdd: (connection: SchematicConnection) => void;
  onConnectionUpdate: (connectionId: string, updates: Partial<SchematicConnection>) => void;
  onGroupCreate: (componentIds: string[]) => void;
  onGroupUpdate: (groupId: string, updates: Partial<ComponentGroup>) => void;
  onExportPNG?: () => void;
}

const SchematicCanvas: React.FC<SchematicCanvasProps> = ({
  components,
  connections,
  groups,
  selectedComponents,
  onComponentAdd,
  onComponentSelect,
  onComponentUpdate,
  onConnectionAdd,
  onConnectionUpdate,
  onGroupCreate,
  onGroupUpdate,
  onExportPNG
}) => {
  const stageRef = useRef<Konva.Stage>(null);
  const [stageDimensions, setStageDimensions] = useState({ width: 800, height: 600 });
  const [connectionDraft, setConnectionDraft] = useState<ConnectionDraft | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState<{x: number, y: number} | null>(null);
  const [groupDragState, setGroupDragState] = useState<{componentId: string, startX: number, startY: number, originalPositions: {[key: string]: {x: number, y: number}}} | null>(null);
  const [draggedComponents, setDraggedComponents] = useState<{[key: string]: {x: number, y: number}}>({});

  // Export canvas as PNG
  const exportAsPNG = () => {
    try {
      const stage = stageRef.current;
      if (!stage) {
        alert('Canvas not ready for export');
        return;
      }

      // Calculate bounds of all components to crop the image properly
      if (components.length === 0) {
        alert('No components to export. Add some components to your schematic first.');
        return;
      }

    const bounds = components.reduce((acc, comp) => ({
      minX: Math.min(acc.minX, comp.x),
      minY: Math.min(acc.minY, comp.y),
      maxX: Math.max(acc.maxX, comp.x + 80),
      maxY: Math.max(acc.maxY, comp.y + 60)
    }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

    // Add padding around the content
    const padding = 50;
    const exportWidth = bounds.maxX - bounds.minX + padding * 2;
    const exportHeight = bounds.maxY - bounds.minY + padding * 2;

    // Create a temporary stage for export with white background
    const exportStage = new Konva.Stage({
      container: document.createElement('div'),
      width: exportWidth,
      height: exportHeight
    });

    const exportLayer = new Konva.Layer();
    exportStage.add(exportLayer);

    // Add white background
    const background = new Konva.Rect({
      x: 0,
      y: 0,
      width: exportWidth,
      height: exportHeight,
      fill: 'white'
    });
    exportLayer.add(background);

    // Clone all visible elements from the main stage
    const mainLayer = stage.findOne('Layer') as Konva.Layer;
    if (mainLayer) {
      // Clone individual children instead of the entire layer
      const children = mainLayer.getChildren();
      
      children.forEach((child: any) => {
        // Skip grid dots (small circles with radius 1 and gray fill)
        if (child.className === 'Circle' && child.radius() === 1 && child.fill() === '#e0e0e0') {
          return;
        }
        
        // Clone the child element
        const clonedChild = child.clone();
        
        // Adjust position to center the content
        clonedChild.x(clonedChild.x() + padding - bounds.minX);
        clonedChild.y(clonedChild.y() + padding - bounds.minY);
        
        exportLayer.add(clonedChild);
      });
    }

    exportLayer.draw();

    // Export as PNG
    const dataURL = exportStage.toDataURL({
      mimeType: 'image/png',
      quality: 1,
      pixelRatio: 2 // Higher resolution
    });

    // Download the image
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `pid-schematic-${timestamp}.png`;
    
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataURL;
    link.click();

    // Show success message
    setTimeout(() => {
      alert(`PNG exported successfully as "${filename}"`);
    }, 100);

    // Cleanup
    exportStage.destroy();
    } catch (error) {
      console.error('Error exporting PNG:', error);
      alert('Failed to export PNG. Please try again.');
    }
  };

  // Expose export function to parent
  useEffect(() => {
    if (onExportPNG) {
      // This is a bit of a hack, but it allows the parent to trigger export
      (window as any).exportSchematicPNG = exportAsPNG;
    }
  }, [onExportPNG, components, connections, groups]);

  useEffect(() => {
    const updateDimensions = () => {
      const container = stageRef.current?.container().parentElement;
      if (container) {
        setStageDimensions({
          width: container.clientWidth,
          height: container.clientHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Global keyboard event listener for grouping
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        e.stopPropagation();
        if (selectedComponents.length > 1) {
          onGroupCreate(selectedComponents.map(c => c.id));
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedComponents, onGroupCreate]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    const stage = stageRef.current;
    if (!stage) return;

    const componentData = e.dataTransfer.getData('component');
    if (!componentData) return;

    try {
      const component: ComponentDefinition = JSON.parse(componentData);
      
      // Get the canvas container to calculate proper offset
      const container = stage.container();
      const containerRect = container.getBoundingClientRect();
      
      // Calculate position relative to canvas
      const x = e.clientX - containerRect.left;
      const y = e.clientY - containerRect.top;
      
      // Offset by half component size to center on cursor
      const adjustedX = x - 40; // Half of component width (80px)
      const adjustedY = y - 30; // Half of component height (60px)
      
      onComponentAdd(component, Math.max(0, adjustedX), Math.max(0, adjustedY));
    } catch (error) {
      console.error('Error parsing dropped component:', error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const getPortPosition = (component: ComponentInstance, portName: string) => {
    const portIndex = Object.keys(component.definition.connections).indexOf(portName);
    const connection = component.definition.connections[portName];
    const isInput = connection.direction === 'in';
    const x = component.x + (isInput ? 0 : 80);
    const y = component.y + 15 + (portIndex * 15);
    return { x, y };
  };

  const updateConnectionsForComponent = (componentId: string, newX: number, newY: number, isRealTime: boolean = false) => {
    const component = components.find(c => c.id === componentId);
    if (!component) return;

    // Find all connections involving this component
    connections.forEach(connection => {
      let needsUpdate = false;
      let newPoints = [...connection.points];

      if (connection.fromComponent === componentId) {
        // Update start point
        const fromPos = getPortPosition({ ...component, x: newX, y: newY }, connection.fromPort);
        newPoints[0] = fromPos.x;
        newPoints[1] = fromPos.y;
        needsUpdate = true;
      }

      if (connection.toComponent === componentId) {
        // Update end point
        const toPos = getPortPosition({ ...component, x: newX, y: newY }, connection.toPort);
        newPoints[2] = toPos.x;
        newPoints[3] = toPos.y;
        needsUpdate = true;
      }

      if (needsUpdate) {
        onConnectionUpdate(connection.id, { points: newPoints });
      }
    });
  };

  // Version that works with explicit positions (for drag end)
  const updateConnectionsForComponentWithPosition = (componentId: string, newX: number, newY: number) => {
    const component = components.find(c => c.id === componentId);
    if (!component) return;

    // Find all connections involving this component
    connections.forEach(connection => {
      let needsUpdate = false;
      let newPoints = [...connection.points];

      if (connection.fromComponent === componentId) {
        // Update start point using explicit position
        const fromPos = getPortPosition({ ...component, x: newX, y: newY }, connection.fromPort);
        newPoints[0] = fromPos.x;
        newPoints[1] = fromPos.y;
        needsUpdate = true;
      }

      if (connection.toComponent === componentId) {
        // Update end point using explicit position
        const toPos = getPortPosition({ ...component, x: newX, y: newY }, connection.toPort);
        newPoints[2] = toPos.x;
        newPoints[3] = toPos.y;
        needsUpdate = true;
      }

      if (needsUpdate) {
        onConnectionUpdate(connection.id, { points: newPoints });
      }
    });
  };

  // Batch update function for multiple components
  const batchUpdateConnectionsForComponents = (componentUpdates: {[componentId: string]: {x: number, y: number}}) => {
    // Collect all connection updates
    const connectionUpdates: {[connectionId: string]: {points: number[]}} = {};
    
    Object.entries(componentUpdates).forEach(([componentId, position]) => {
      const component = components.find(c => c.id === componentId);
      if (!component) return;

      connections.forEach(connection => {
        let points = connectionUpdates[connection.id]?.points || [...connection.points];
        let needsUpdate = false;

        if (connection.fromComponent === componentId) {
          const fromPos = getPortPosition({ ...component, x: position.x, y: position.y }, connection.fromPort);
          points[0] = fromPos.x;
          points[1] = fromPos.y;
          needsUpdate = true;
        }

        if (connection.toComponent === componentId) {
          const toPos = getPortPosition({ ...component, x: position.x, y: position.y }, connection.toPort);
          points[2] = toPos.x;
          points[3] = toPos.y;
          needsUpdate = true;
        }

        if (needsUpdate) {
          connectionUpdates[connection.id] = { points };
        }
      });
    });

    // Apply all connection updates
    Object.entries(connectionUpdates).forEach(([connectionId, update]) => {
      onConnectionUpdate(connectionId, update);
    });
  };

  // Get the effective position of a component (considering drag state)
  const getEffectiveComponentPosition = (component: ComponentInstance) => {
    const draggedPos = draggedComponents[component.id];
    return draggedPos ? draggedPos : { x: component.x, y: component.y };
  };

  const handlePortMouseDown = (component: ComponentInstance, portName: string, connection: any) => {
    if (connection.direction === 'out') { // Only start connections from output ports
      const portPos = getPortPosition(component, portName);
      setConnectionDraft({
        fromComponent: component.id,
        fromPort: portName,
        startX: portPos.x,
        startY: portPos.y,
        currentX: portPos.x,
        currentY: portPos.y,
        type: connection.type
      });
      setIsConnecting(true);
    }
  };

  const handlePortMouseUp = (component: ComponentInstance, portName: string, connection: any) => {
    if (isConnecting && connectionDraft && connection.direction === 'in') {
      // Check if connection types match
      if (connectionDraft.type === connection.type) {
        const newConnection: SchematicConnection = {
          id: `conn_${Date.now()}`,
          fromComponent: connectionDraft.fromComponent,
          fromPort: connectionDraft.fromPort,
          toComponent: component.id,
          toPort: portName,
          points: [
            connectionDraft.startX,
            connectionDraft.startY,
            getPortPosition(component, portName).x,
            getPortPosition(component, portName).y
          ],
          type: connectionDraft.type
        };
        onConnectionAdd(newConnection);
      }
      setConnectionDraft(null);
      setIsConnecting(false);
    }
  };

  const handleStageMouseMove = () => {
    if (isConnecting && connectionDraft) {
      const stage = stageRef.current;
      if (stage) {
        const pos = stage.getPointerPosition();
        if (pos) {
          setConnectionDraft({
            ...connectionDraft,
            currentX: pos.x,
            currentY: pos.y
          });
        }
      }
    }
  };

  const handleStageMouseUp = () => {
    if (isConnecting) {
      setConnectionDraft(null);
      setIsConnecting(false);
    }
  };

  const renderComponent = (component: ComponentInstance) => {
    const isSelected = selectedComponents.some(c => c.id === component.id);
    const effectivePos = getEffectiveComponentPosition(component);
    const isBeingDragged = groupDragState?.componentId === component.id;
    
    return (
      <Group
        key={component.id}
        x={effectivePos.x}
        y={effectivePos.y}
        draggable
        onClick={(e) => {
          const multiSelect = e.evt.ctrlKey || e.evt.metaKey;
          
          // If component is in a group and not multi-selecting, select entire group
          if (!multiSelect && component.groupId) {
            const groupComponents = components.filter(c => c.groupId === component.groupId);
            // Clear current selection and select all components in the group
            onComponentSelect(null, false); // Clear selection first
            groupComponents.forEach(groupComp => {
              onComponentSelect(groupComp, true);
            });
          } else {
            onComponentSelect(component, multiSelect);
          }
        }}
        onContextMenu={(e) => {
          e.evt.preventDefault();
          if (selectedComponents.length > 1 || component.groupId) {
            setShowContextMenu({
              x: e.evt.clientX,
              y: e.evt.clientY
            });
          }
        }}
        onDragStart={(e) => {
          const startX = e.target.x();
          const startY = e.target.y();
          
          // Store original positions for all components in the group
          let originalPositions: {[key: string]: {x: number, y: number}} = {};
          
          if (component.groupId) {
            const groupComponents = components.filter(c => c.groupId === component.groupId);
            groupComponents.forEach(groupComp => {
              originalPositions[groupComp.id] = { x: groupComp.x, y: groupComp.y };
            });
          } else {
            originalPositions[component.id] = { x: component.x, y: component.y };
          }
          
          setGroupDragState({
            componentId: component.id,
            startX,
            startY,
            originalPositions
          });
          
          // Initialize drag state for this component
          setDraggedComponents(prev => ({
            ...prev,
            [component.id]: { x: startX, y: startY }
          }));
        }}
        onDragMove={(e) => {
          const currentX = e.target.x();
          const currentY = e.target.y();
          
          if (groupDragState && groupDragState.componentId === component.id) {
            // Calculate delta from original start position
            const deltaX = currentX - groupDragState.startX;
            const deltaY = currentY - groupDragState.startY;
            
            // Update positions for all components in the group (including the dragged one)
            const newDraggedComponents: {[key: string]: {x: number, y: number}} = {};
            
            Object.entries(groupDragState.originalPositions).forEach(([compId, originalPos]) => {
              newDraggedComponents[compId] = {
                x: originalPos.x + deltaX,
                y: originalPos.y + deltaY
              };
            });
            
            // All group components move together
            
            setDraggedComponents(newDraggedComponents);
          } else {
            // Single component drag (not in a group)
            setDraggedComponents(prev => ({
              ...prev,
              [component.id]: { x: currentX, y: currentY }
            }));
          }
          
          // Note: Connections are now updated via renderConnection using effective positions
          // This eliminates the need for frequent state updates during dragging
        }}
        onDragEnd={(e) => {
          const newX = e.target.x();
          const newY = e.target.y();
          
          if (groupDragState && groupDragState.componentId === component.id) {
            // Calculate final delta from original start position
            const deltaX = newX - groupDragState.startX;
            const deltaY = newY - groupDragState.startY;
            
            // Create a map of final positions for all group components
            const finalPositions: {[key: string]: {x: number, y: number}} = {};
            
            Object.entries(groupDragState.originalPositions).forEach(([compId, originalPos]) => {
              const finalX = originalPos.x + deltaX;
              const finalY = originalPos.y + deltaY;
              finalPositions[compId] = { x: finalX, y: finalY };
              onComponentUpdate(compId, { x: finalX, y: finalY });
            });
            
            // Update all connections for all moved components using final positions
            // Use setTimeout to ensure component state updates are processed first
            setTimeout(() => {
              batchUpdateConnectionsForComponents(finalPositions);
            }, 0);
          } else {
            // Single component update
            onComponentUpdate(component.id, { x: newX, y: newY });
            setTimeout(() => {
              updateConnectionsForComponentWithPosition(component.id, newX, newY);
            }, 0);
          }
          
          // Clear drag states
          setGroupDragState(null);
          setDraggedComponents({});
        }}
      >
        {/* Component background */}
        <Rect
          width={80}
          height={60}
          fill={isSelected ? '#e3f2fd' : '#ffffff'}
          stroke={isBeingDragged ? '#ff5722' : isSelected ? '#1976d2' : component.groupId ? '#2196f3' : '#cccccc'}
          strokeWidth={isBeingDragged ? 3 : isSelected ? 2 : component.groupId ? 2 : 1}
          strokeDashArray={component.groupId && !isSelected && !isBeingDragged ? [3, 3] : undefined}
          cornerRadius={4}
        />
        
        {/* Group indicator */}
        {component.groupId && (
          <Circle
            x={75}
            y={5}
            radius={3}
            fill="#2196f3"
            stroke="#ffffff"
            strokeWidth={1}
          />
        )}
        
        {/* Component icon */}
        <Text
          text={component.definition.icon}
          fontSize={24}
          x={40}
          y={15}
          offsetX={12}
          offsetY={12}
          fill="#333333"
        />
        
        {/* Component name */}
        <Text
          text={component.name}
          fontSize={10}
          x={40}
          y={45}
          offsetX={component.name.length * 2.5}
          fill="#666666"
        />
        
        {/* Connection points */}
        {Object.entries(component.definition.connections).map(([portName, connection], index) => {
          const isInput = connection.direction === 'in';
          const x = isInput ? 0 : 80;
          const y = 15 + (index * 15);
          
          return (
            <Circle
              key={portName}
              x={x}
              y={y}
              radius={5}
              fill={connection.type === 'pipe' ? '#2196f3' : 
                    connection.type === 'signal' ? '#ff9800' : '#4caf50'}
              stroke="#333"
              strokeWidth={2}
              onMouseDown={(e) => {
                e.cancelBubble = true;
                handlePortMouseDown(component, portName, connection);
              }}
              onMouseUp={(e) => {
                e.cancelBubble = true;
                handlePortMouseUp(component, portName, connection);
              }}
              scaleX={isConnecting && connectionDraft?.type === connection.type && 
                      connection.direction === 'in' ? 1.3 : 1}
              scaleY={isConnecting && connectionDraft?.type === connection.type && 
                      connection.direction === 'in' ? 1.3 : 1}
            />
          );
        })}
      </Group>
    );
  };

  const renderGroup = (group: ComponentGroup) => {
    const groupComponents = components.filter(c => c.groupId === group.id);
    if (groupComponents.length === 0) return null;

    // Calculate group bounds using effective positions
    const bounds = groupComponents.reduce((acc, comp) => {
      const effectivePos = getEffectiveComponentPosition(comp);
      return {
        minX: Math.min(acc.minX, effectivePos.x),
        minY: Math.min(acc.minY, effectivePos.y),
        maxX: Math.max(acc.maxX, effectivePos.x + 80),
        maxY: Math.max(acc.maxY, effectivePos.y + 60)
      };
    }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

    const padding = 10;
    const width = bounds.maxX - bounds.minX + padding * 2;
    const height = bounds.maxY - bounds.minY + padding * 2;

    return (
      <Group key={group.id}>
        {/* Group background */}
        <Rect
          x={bounds.minX - padding}
          y={bounds.minY - padding}
          width={width}
          height={height}
          fill="rgba(33, 150, 243, 0.1)"
          stroke="#2196f3"
          strokeWidth={2}
          dash={[5, 5]}
          cornerRadius={8}
        />
        {/* Group label */}
        <Text
          text={group.name}
          x={bounds.minX - padding + 5}
          y={bounds.minY - padding + 5}
          fontSize={12}
          fill="#2196f3"
          fontStyle="bold"
        />
      </Group>
    );
  };

  const renderConnection = (connection: SchematicConnection) => {
    const color = connection.type === 'pipe' ? '#2196f3' : 
                  connection.type === 'signal' ? '#ff9800' : '#4caf50';
    const strokeWidth = connection.type === 'pipe' ? 3 : 2;
    
    // Calculate real-time connection points considering dragged components
    let points = [...connection.points];
    
    // Update start point if from component is being dragged
    const fromComponent = components.find(c => c.id === connection.fromComponent);
    if (fromComponent) {
      const fromEffectivePos = getEffectiveComponentPosition(fromComponent);
      if (fromEffectivePos.x !== fromComponent.x || fromEffectivePos.y !== fromComponent.y) {
        const fromPos = getPortPosition({ ...fromComponent, x: fromEffectivePos.x, y: fromEffectivePos.y }, connection.fromPort);
        points[0] = fromPos.x;
        points[1] = fromPos.y;
      }
    }
    
    // Update end point if to component is being dragged
    const toComponent = components.find(c => c.id === connection.toComponent);
    if (toComponent) {
      const toEffectivePos = getEffectiveComponentPosition(toComponent);
      if (toEffectivePos.x !== toComponent.x || toEffectivePos.y !== toComponent.y) {
        const toPos = getPortPosition({ ...toComponent, x: toEffectivePos.x, y: toEffectivePos.y }, connection.toPort);
        points[2] = toPos.x;
        points[3] = toPos.y;
      }
    }
    
    return (
      <Line
        key={connection.id}
        points={points}
        stroke={color}
        strokeWidth={strokeWidth}
        lineCap="round"
        lineJoin="round"
      />
    );
  };

  return (
    <div 
      style={{ width: '100%', height: '100%', background: '#fafafa' }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <Stage
        ref={stageRef}
        width={stageDimensions.width}
        height={stageDimensions.height}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onClick={(e) => {
          // Deselect if clicking on empty canvas
          if (e.target === e.target.getStage()) {
            onComponentSelect(null, false);
            if (isConnecting) {
              setConnectionDraft(null);
              setIsConnecting(false);
            }
          }
          // Close context menu
          setShowContextMenu(null);
        }}
        onKeyDown={(e: any) => {
          // Keyboard shortcuts
          if ((e.evt.ctrlKey || e.evt.metaKey) && e.evt.key.toLowerCase() === 'g') {
            e.evt.preventDefault();
            e.evt.stopPropagation();
            if (selectedComponents.length > 1) {
              onGroupCreate(selectedComponents.map(c => c.id));
            }
          }
        }}
        tabIndex={0}
      >
        <Layer>
          {/* Grid pattern */}
          {Array.from({ length: Math.ceil(stageDimensions.width / 20) }, (_, i) => (
            <React.Fragment key={`v-${i}`}>
              {Array.from({ length: Math.ceil(stageDimensions.height / 20) }, (_, j) => (
                <Circle
                  key={`grid-${i}-${j}`}
                  x={i * 20}
                  y={j * 20}
                  radius={1}
                  fill="#e0e0e0"
                />
              ))}
            </React.Fragment>
          ))}
          
          {/* Render groups (behind components) */}
          {groups.map(renderGroup)}
          
          {/* Render connections */}
          {connections.map(renderConnection)}
          
          {/* Render draft connection */}
          {connectionDraft && (
            <Line
              points={[
                connectionDraft.startX,
                connectionDraft.startY,
                connectionDraft.currentX,
                connectionDraft.currentY
              ]}
              stroke={connectionDraft.type === 'pipe' ? '#2196f3' : 
                      connectionDraft.type === 'signal' ? '#ff9800' : '#4caf50'}
              strokeWidth={2}
              dash={[5, 5]}
              opacity={0.7}
            />
          )}
          
          {/* Render components */}
          {components.map(renderComponent)}
        </Layer>
      </Stage>
      
      {/* Context Menu */}
      {showContextMenu && (
        <div
          style={{
            position: 'fixed',
            top: showContextMenu.y,
            left: showContextMenu.x,
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1000,
            padding: '8px 0'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {selectedComponents.length > 1 && (
            <div
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              onClick={() => {
                onGroupCreate(selectedComponents.map(c => c.id));
                setShowContextMenu(null);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f0f0f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
              }}
            >
              🔗 Group Components ({selectedComponents.length})
            </div>
          )}
          
          {selectedComponents.some(c => c.groupId) && (
            <div
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              onClick={() => {
                // Ungroup selected components
                selectedComponents.forEach(comp => {
                  if (comp.groupId) {
                    onComponentUpdate(comp.id, { groupId: undefined });
                  }
                });
                setShowContextMenu(null);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f0f0f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
              }}
            >
              🔓 Ungroup Components
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SchematicCanvas;
