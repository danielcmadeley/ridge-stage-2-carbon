#!/usr/bin/env python3

"""Export a rectangular building mass to IFC using IfcOpenShell."""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path
from typing import Any

import ifcopenshell.api.aggregate
import ifcopenshell.api.context
import ifcopenshell.api.geometry
import ifcopenshell.api.project
import ifcopenshell.api.root
import ifcopenshell.api.spatial
import ifcopenshell.api.unit
import numpy
import ifcopenshell.util.placement


def building_placement_matrix(rotation: list[float], height: float) -> numpy.ndarray:
    rx, ry, rz = [math.degrees(value) for value in rotation]

    matrix = numpy.eye(4)
    matrix = ifcopenshell.util.placement.rotation(rz, "Z") @ matrix
    matrix = ifcopenshell.util.placement.rotation(ry, "Y") @ matrix
    matrix = ifcopenshell.util.placement.rotation(rx, "X") @ matrix

    basis_change = numpy.array(
        [
            [1.0, 0.0, 0.0, 0.0],
            [0.0, 0.0, 1.0, 0.0],
            [0.0, 1.0, 0.0, 0.0],
            [0.0, 0.0, 0.0, 1.0],
        ]
    )
    inverse_basis_change = numpy.linalg.inv(basis_change)
    ifc_rotation = basis_change @ matrix @ inverse_basis_change

    center = numpy.array([0.0, 0.0, height / 2.0])
    translate_up = numpy.eye(4)
    translate_up[:3, 3] = center
    translate_down = numpy.eye(4)
    translate_down[:3, 3] = -center

    return translate_up @ ifc_rotation @ translate_down


def export_building(payload: dict[str, Any]):
    width = float(payload["width"])
    depth = float(payload["depth"])
    height = float(payload["height"])
    name = payload.get("name") or f"{width:g}x{depth:g}x{height:g}m building"
    rotation = payload.get("rotation", [0.0, 0.0, 0.0])

    model = ifcopenshell.api.project.create_file(version="IFC4")
    project = ifcopenshell.api.root.create_entity(model, ifc_class="IfcProject", name=name)

    length_unit = ifcopenshell.api.unit.add_si_unit(model, unit_type="LENGTHUNIT")
    ifcopenshell.api.unit.assign_unit(model, units=[length_unit])

    model3d = ifcopenshell.api.context.add_context(model, context_type="Model")
    body = ifcopenshell.api.context.add_context(
        model,
        context_type="Model",
        context_identifier="Body",
        target_view="MODEL_VIEW",
        parent=model3d,
    )

    site = ifcopenshell.api.root.create_entity(model, ifc_class="IfcSite", name="Site")
    building = ifcopenshell.api.root.create_entity(model, ifc_class="IfcBuilding", name="Building")
    storey = ifcopenshell.api.root.create_entity(
        model,
        ifc_class="IfcBuildingStorey",
        name="Ground floor",
    )
    storey.Elevation = 0.0

    ifcopenshell.api.aggregate.assign_object(model, relating_object=project, products=[site])
    ifcopenshell.api.aggregate.assign_object(model, relating_object=site, products=[building])
    ifcopenshell.api.aggregate.assign_object(model, relating_object=building, products=[storey])

    element = ifcopenshell.api.root.create_entity(
        model,
        ifc_class="IfcBuildingElementProxy",
        name=name,
        predefined_type="NOTDEFINED",
    )

    profile = model.create_entity(
        "IfcRectangleProfileDef",
        ProfileName="footprint",
        ProfileType="AREA",
        XDim=width,
        YDim=depth,
    )
    representation = ifcopenshell.api.geometry.add_profile_representation(
        model,
        context=body,
        profile=profile,
        depth=height,
    )
    ifcopenshell.api.geometry.assign_representation(
        model,
        product=element,
        representation=representation,
    )

    matrix = building_placement_matrix(rotation, height)
    ifcopenshell.api.geometry.edit_object_placement(
        model,
        product=element,
        matrix=matrix,
        is_si=True,
    )
    ifcopenshell.api.spatial.assign_container(
        model,
        relating_structure=storey,
        products=[element],
    )

    return model


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: export_building_ifc.py <output.ifc>", file=sys.stderr)
        return 1

    payload = json.loads(sys.stdin.read())
    output_path = Path(sys.argv[1])
    model = export_building(payload)
    model.write(str(output_path))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
