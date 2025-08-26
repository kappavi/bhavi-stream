import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Text, Circle, Group, Line } from 'react-konva';
import { ComponentInstance, ComponentDefinition, SchematicConnection, ConnectionDraft } from '../types/components';
import Konva from 'konva';

interface SchematicCanvasProps {
  components: ComponentInstance[];
  connections: SchematicConnection[];
  onComponentAdd: (component: ComponentDefinition, x: number, y: number) => void;
  onComponentSelect: (component: ComponentInstance | null) => void;
  selectedComponent: ComponentInstance | null;
  onComponentUpdate: (componentId: string, updates: Partial<ComponentInstance>) => void;
  onConnectionAdd: (connection: SchematicConnection) => void;
}

const SchematicCanvas: React.FC<SchematicCanvasProps> = ({
  components,
  connections,
  onComponentAdd,
  onComponentSelect,
  selectedComponent,
  onComponentUpdate,
  onConnectionAdd
}) => {
  const stageRef = useRef<Konva.Stage>(null);
  const [stageDimensions, setStageDimensions] = useState({ width: 800, height: 600 });
  const [connectionDraft, setConnectionDraft] = useState<ConnectionDraft | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    const stage = stageRef.current;
    if (!stage) return;

    const componentData = e.dataTransfer.getData('component');
    if (!componentData) return;

    try {
      const component: ComponentDefinition = JSON.parse(componentData);
      const pos = stage.getPointerPosition();
      if (pos) {
        onComponentAdd(component, pos.x, pos.y);
      }
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
    const isSelected = selectedComponent?.id === component.id;
    
    return (
      <Group
        key={component.id}
        x={component.x}
        y={component.y}
        draggable
        onClick={() => onComponentSelect(component)}
        onDragEnd={(e) => {
          onComponentUpdate(component.id, {
            x: e.target.x(),
            y: e.target.y()
          });
        }}
      >
        {/* Component background */}
        <Rect
          width={80}
          height={60}
          fill={isSelected ? '#e3f2fd' : '#ffffff'}
          stroke={isSelected ? '#1976d2' : '#cccccc'}
          strokeWidth={isSelected ? 2 : 1}
          cornerRadius={4}
        />
        
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

  const renderConnection = (connection: SchematicConnection) => {
    const color = connection.type === 'pipe' ? '#2196f3' : 
                  connection.type === 'signal' ? '#ff9800' : '#4caf50';
    const strokeWidth = connection.type === 'pipe' ? 3 : 2;
    
    return (
      <Line
        key={connection.id}
        points={connection.points}
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
            onComponentSelect(null);
            if (isConnecting) {
              setConnectionDraft(null);
              setIsConnecting(false);
            }
          }
        }}
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
    </div>
  );
};

export default SchematicCanvas;
