import React from 'react';
import { ComponentInstance, Parameter } from '../types/components';
import './PropertyPanel.css';

interface PropertyPanelProps {
  selectedComponent: ComponentInstance | null;
  onParameterChange: (componentId: string, parameterName: string, value: any) => void;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({ 
  selectedComponent, 
  onParameterChange 
}) => {
  if (!selectedComponent) {
    return (
      <div className="property-panel">
        <div className="property-panel-empty">
          <p>Select a component to view its properties</p>
        </div>
      </div>
    );
  }

  const renderParameterInput = (paramName: string, parameter: Parameter) => {
    const currentValue = selectedComponent.parameters[paramName] || parameter.value;

    if (parameter.options) {
      return (
        <select
          value={currentValue || ''}
          onChange={(e) => onParameterChange(selectedComponent.id, paramName, e.target.value)}
          className="parameter-input"
        >
          <option value="">Select...</option>
          {parameter.options.map((option) => (
            <option key={option} value={option}>
              {option.replace('_', ' ')}
            </option>
          ))}
        </select>
      );
    }

    const inputType = typeof parameter.value === 'number' ? 'number' : 'text';

    return (
      <input
        type={inputType}
        value={currentValue || ''}
        onChange={(e) => {
          const value = inputType === 'number' ? parseFloat(e.target.value) : e.target.value;
          onParameterChange(selectedComponent.id, paramName, value);
        }}
        className="parameter-input"
        placeholder={parameter.required ? 'Required' : 'Optional'}
      />
    );
  };

  return (
    <div className="property-panel">
      <div className="property-header">
        <h3>{selectedComponent.name}</h3>
        <p className="component-type">{selectedComponent.definition.name}</p>
      </div>

      <div className="property-section">
        <h4>Parameters</h4>
        <div className="parameters-list">
          {Object.entries(selectedComponent.definition.parameters).map(([paramName, parameter]) => (
            <div key={paramName} className="parameter-item">
              <label className="parameter-label">
                {paramName.replace('_', ' ')}
                {parameter.required && <span className="required">*</span>}
                {parameter.unit && <span className="unit">({parameter.unit})</span>}
              </label>
              {renderParameterInput(paramName, parameter)}
            </div>
          ))}
        </div>
      </div>

      <div className="property-section">
        <h4>Connections</h4>
        <div className="connections-list">
          {Object.entries(selectedComponent.definition.connections).map(([portName, connection]) => (
            <div key={portName} className="connection-item">
              <span className="connection-name">{portName}</span>
              <span className={`connection-type ${connection.type}`}>
                {connection.type} ({connection.direction})
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="property-section">
        <h4>Constraints</h4>
        <div className="constraints-list">
          {selectedComponent.definition.constraints.map((constraint, index) => (
            <div key={index} className="constraint-item">
              <code>{constraint}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PropertyPanel;
