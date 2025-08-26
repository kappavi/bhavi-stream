# P&ID Schematic Editor

A semantic P&ID (Piping and Instrumentation Diagram) editor that creates intelligent schematics with component relationships and properties for engineering design.

## Features

- **Semantic Components**: Each component stores engineering parameters and constraints
- **Drag & Drop Interface**: Intuitive component placement on canvas
- **Property Editor**: Edit component parameters with validation
- **Component Library**: Pre-defined engineering components (tanks, valves, pumps, controllers)
- **Export Functionality**: Export schematic data as JSON for further processing

## Architecture

- **Backend**: Python Flask API serving component definitions and schematic storage
- **Frontend**: React TypeScript with Konva.js for canvas rendering
- **Data Storage**: JSON-based component definitions (expandable to database)

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 14+
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run Flask server:
```bash
python app.py
```

The backend will run on http://localhost:6969

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm start
```

The frontend will run on http://localhost:3000

## Usage

1. **Component Library**: Browse available components in the left panel
2. **Canvas**: Drag components from library to canvas to build your P&ID
3. **Connect Components**: Click and drag from output ports (right side, circles) to input ports (left side) to create connections
4. **Properties**: Select components to edit their parameters in the right panel
5. **Export**: Save your schematic as JSON for Stage 2 processing

### Connection System
- **🔵 Blue**: Pipe connections (process flow)
- **🟠 Orange**: Signal connections (control signals) 
- **🟢 Green**: Electrical connections (power)
- **Drag-to-Connect**: Click on an output port and drag to an input port
- **Type Matching**: Only compatible connection types can be linked

## Component Types

- **Storage Tank**: Volume, pressure rating, material properties
- **Control Valve**: Cv rating, actuator type, fail action
- **Pump**: Flow rate, head, power requirements
- **Level Controller**: Measurement range, control mode, signal types
- **Pipe**: Diameter, material, pressure rating

## Next Steps (Stage 2)

The exported JSON contains all component parameters and constraints needed for:
- Automated component sizing and selection
- Compatibility checking between connected components
- Basic process simulation and validation

## Development

### Adding New Components

1. Add component definition to `backend/app.py` in the `COMPONENTS` dictionary
2. Include parameters, connections, and constraints
3. Frontend will automatically render new components

### Component Structure

```json
{
  "id": "component_id",
  "name": "Display Name",
  "category": "component_category",
  "icon": "🔧",
  "parameters": {
    "param_name": {
      "value": null,
      "unit": "unit",
      "required": true,
      "options": ["option1", "option2"]
    }
  },
  "connections": {
    "port_name": {
      "type": "pipe|signal|electrical",
      "direction": "in|out|bidirectional"
    }
  },
  "constraints": [
    "parameter > 0",
    "rating >= operating_condition"
  ]
}
```

## License

MIT License - Feel free to modify and extend for your engineering needs.
