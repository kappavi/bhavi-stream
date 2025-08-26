from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)

# Sample component definitions
COMPONENTS = {
    "tank": {
        "id": "tank",
        "name": "Storage Tank",
        "category": "vessel",
        "icon": "⬜",
        "parameters": {
            "volume": {"value": None, "unit": "m³", "required": True},
            "pressure_rating": {"value": None, "unit": "bar", "required": True},
            "temperature_rating": {"value": None, "unit": "°C", "required": True},
            "material": {"value": "carbon_steel", "options": ["carbon_steel", "stainless_steel", "plastic"], "required": True}
        },
        "connections": {
            "inlet": {"type": "pipe", "direction": "in"},
            "outlet": {"type": "pipe", "direction": "out"},
            "vent": {"type": "pipe", "direction": "out"}
        },
        "constraints": [
            "volume > 0",
            "pressure_rating > operating_pressure",
            "temperature_rating > operating_temperature"
        ]
    },
    "control_valve": {
        "id": "control_valve",
        "name": "Control Valve",
        "category": "valve",
        "icon": "◊",
        "parameters": {
            "cv": {"value": None, "unit": "m³/h", "required": True},
            "pressure_rating": {"value": None, "unit": "bar", "required": True},
            "fail_action": {"value": "fail_closed", "options": ["fail_closed", "fail_open"], "required": True},
            "actuator_type": {"value": "pneumatic", "options": ["pneumatic", "electric", "hydraulic"], "required": True},
            "signal_range": {"value": "4-20mA", "options": ["4-20mA", "0-10V", "3-15psi"], "required": True}
        },
        "connections": {
            "inlet": {"type": "pipe", "direction": "in"},
            "outlet": {"type": "pipe", "direction": "out"},
            "control_signal": {"type": "signal", "direction": "in"}
        },
        "constraints": [
            "cv > 0",
            "pressure_rating >= upstream_pressure",
            "actuator_type matches signal_type"
        ]
    },
    "pump": {
        "id": "pump",
        "name": "Centrifugal Pump",
        "category": "rotating_equipment",
        "icon": "⊕",
        "parameters": {
            "flow_rate": {"value": None, "unit": "m³/h", "required": True},
            "head": {"value": None, "unit": "m", "required": True},
            "power": {"value": None, "unit": "kW", "required": True},
            "efficiency": {"value": 75, "unit": "%", "required": False},
            "npsh_required": {"value": None, "unit": "m", "required": True}
        },
        "connections": {
            "suction": {"type": "pipe", "direction": "in"},
            "discharge": {"type": "pipe", "direction": "out"},
            "power": {"type": "electrical", "direction": "in"}
        },
        "constraints": [
            "flow_rate > 0",
            "head > 0",
            "npsh_available > npsh_required"
        ]
    },
    "level_controller": {
        "id": "level_controller",
        "name": "Level Controller",
        "category": "instrument",
        "icon": "LC",
        "parameters": {
            "measurement_range": {"value": None, "unit": "m", "required": True},
            "control_mode": {"value": "PI", "options": ["P", "PI", "PID"], "required": True},
            "output_signal": {"value": "4-20mA", "options": ["4-20mA", "0-10V", "3-15psi"], "required": True},
            "setpoint": {"value": None, "unit": "m", "required": True}
        },
        "connections": {
            "measurement": {"type": "signal", "direction": "in"},
            "output": {"type": "signal", "direction": "out"}
        },
        "constraints": [
            "setpoint within measurement_range",
            "output_signal compatible with actuator"
        ]
    },
    "pipe": {
        "id": "pipe",
        "name": "Pipe",
        "category": "piping",
        "icon": "─",
        "parameters": {
            "diameter": {"value": None, "unit": "mm", "required": True},
            "material": {"value": "carbon_steel", "options": ["carbon_steel", "stainless_steel", "pvc"], "required": True},
            "pressure_rating": {"value": None, "unit": "bar", "required": True},
            "length": {"value": None, "unit": "m", "required": False}
        },
        "connections": {
            "inlet": {"type": "pipe", "direction": "in"},
            "outlet": {"type": "pipe", "direction": "out"}
        },
        "constraints": [
            "diameter > 0",
            "pressure_rating >= system_pressure"
        ]
    }
}

@app.route('/api/components', methods=['GET'])
def get_components():
    """Get all available component types"""
    return jsonify(COMPONENTS)

@app.route('/api/components/<component_id>', methods=['GET'])
def get_component(component_id):
    """Get specific component definition"""
    if component_id in COMPONENTS:
        return jsonify(COMPONENTS[component_id])
    return jsonify({"error": "Component not found"}), 404

@app.route('/api/schematic', methods=['POST'])
def save_schematic():
    """Save a schematic (for now just return success)"""
    schematic_data = request.get_json()
    # For now, just validate and return success
    # Later this would save to database
    return jsonify({"message": "Schematic saved successfully", "id": "temp_id"})

@app.route('/api/schematic/<schematic_id>', methods=['GET'])
def get_schematic(schematic_id):
    """Get a saved schematic (placeholder)"""
    # For now return a sample schematic
    sample_schematic = {
        "id": schematic_id,
        "name": "Sample P&ID",
        "components": [],
        "connections": []
    }
    return jsonify(sample_schematic)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=6969)
