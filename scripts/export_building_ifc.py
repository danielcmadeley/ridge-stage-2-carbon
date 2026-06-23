#!/usr/bin/env python3

"""Export a portal frame building to IFC using IfcOpenShell."""

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


HAUNCH_DEPTH_FACTOR = 1.5
HAUNCH_PROFILE_VERTEX_COUNT = 12


def haunch_depth_factor_at(position_fraction: float) -> float:
    return HAUNCH_DEPTH_FACTOR * (1.0 - position_fraction)


def top_anchored_i_profile_points(
    depth_m: float,
    b_m: float,
    tw_m: float,
    tf_m: float,
) -> list[tuple[float, float]]:
    half_b = b_m / 2.0
    half_tw = tw_m / 2.0

    if depth_m <= 1e-9:
        return [(0.0, 0.0)] * HAUNCH_PROFILE_VERTEX_COUNT

    effective_tf = min(tf_m, depth_m / 2.0)
    web_bottom = effective_tf - depth_m

    return [
        (-half_b, 0.0),
        (half_b, 0.0),
        (half_b, -effective_tf),
        (half_tw, -effective_tf),
        (half_tw, web_bottom),
        (half_b, web_bottom),
        (half_b, -depth_m),
        (-half_b, -depth_m),
        (-half_b, web_bottom),
        (-half_tw, web_bottom),
        (-half_tw, -effective_tf),
        (-half_b, -effective_tf),
    ]


def create_tapered_top_anchored_i_shape_mesh(
    section: dict[str, Any],
    length_m: float,
    start_depth_factor: float,
    end_depth_factor: float,
    segments: int = 16,
) -> tuple[list[tuple[float, float, float]], list[tuple[int, int, int]]]:
    b_m = section["b"] / 1000.0
    tw_m = section["tw"] / 1000.0
    tf_m = section["tf"] / 1000.0
    base_depth_m = section["h"] / 1000.0
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int]] = []

    for ring in range(segments + 1):
        t = ring / segments
        depth_m = base_depth_m * (
            start_depth_factor + (end_depth_factor - start_depth_factor) * t
        )
        z = t * length_m

        for x, y in top_anchored_i_profile_points(depth_m, b_m, tw_m, tf_m):
            vertices.append((x, y, z))

    for ring in range(segments):
        ring_start = ring * HAUNCH_PROFILE_VERTEX_COUNT
        next_ring_start = (ring + 1) * HAUNCH_PROFILE_VERTEX_COUNT

        for vertex in range(HAUNCH_PROFILE_VERTEX_COUNT):
            next_vertex = (vertex + 1) % HAUNCH_PROFILE_VERTEX_COUNT
            a = ring_start + vertex
            b = ring_start + next_vertex
            c = next_ring_start + next_vertex
            d = next_ring_start + vertex

            faces.append((a, b, c))
            faces.append((a, c, d))

    return vertices, faces


def flip_mesh_local_y(
    vertices: list[tuple[float, float, float]],
) -> list[tuple[float, float, float]]:
    """IfcOpenShell applies the placement Y basis with opposite sign for mesh geometry."""
    return [(x, -y, z) for x, y, z in vertices]


def building_placement_matrix(rotation: list[float]) -> numpy.ndarray:
    rx, ry, rz = [math.degrees(value) for value in rotation]

    matrix = numpy.eye(4)
    matrix = ifcopenshell.util.placement.rotation(rz, "Z") @ matrix
    matrix = ifcopenshell.util.placement.rotation(ry, "Y") @ matrix
    matrix = ifcopenshell.util.placement.rotation(rx, "X") @ matrix

    return matrix


def translation_matrix(x: float, y: float, z: float) -> numpy.ndarray:
    matrix = numpy.eye(4)
    matrix[:3, 3] = numpy.array([x, y, z], dtype=float)

    return matrix


def member_axis_matrix(
    start: list[float],
    end: list[float],
    role: str,
    *,
    orientation: dict[str, Any] | None = None,
) -> numpy.ndarray:
    start_vector = numpy.array(start, dtype=float)
    end_vector = numpy.array(end, dtype=float)
    direction = end_vector - start_vector
    length = numpy.linalg.norm(direction)

    if length == 0:
        matrix = numpy.eye(4)
        matrix[:3, 3] = start_vector

        return matrix

    member_axis = direction / length
    building_axis = numpy.array([0.0, 1.0, 0.0])

    if role == "column":
        major_axis = numpy.array([-start_vector[0], 0.0, 0.0])

        if numpy.linalg.norm(major_axis) < 1e-9:
            major_axis = numpy.array([1.0, 0.0, 0.0])
        else:
            major_axis = major_axis / numpy.linalg.norm(major_axis)
    elif role == "gable_column":
        major_axis = numpy.array([0.0, 1.0, 0.0]) if start_vector[1] < 1e-6 else numpy.array([0.0, -1.0, 0.0])
    elif role == "purlin" and orientation is not None:
        half_span = float(orientation["halfSpan"])
        rise = half_span * math.tan(math.radians(float(orientation["roofPitchDeg"])))
        side = "left" if start_vector[0] < 0 else "right"

        if side == "left":
            major_axis = numpy.array([-rise, 0.0, half_span])
        else:
            major_axis = numpy.array([rise, 0.0, half_span])

        major_axis = major_axis / numpy.linalg.norm(major_axis)
    elif role == "side_rail":
        delta_x = abs(end_vector[0] - start_vector[0])
        delta_y = abs(end_vector[1] - start_vector[1])

        if delta_x > delta_y:
            major_axis = numpy.array([0.0, 1.0, 0.0]) if start_vector[1] < 1e-6 else numpy.array([0.0, -1.0, 0.0])
        else:
            major_axis = numpy.array([1.0 if start_vector[0] < 0 else -1.0, 0.0, 0.0])
    elif role == "rafter" or role == "haunch" or role == "tie" or role == "brace":
        major_axis = numpy.cross(member_axis, building_axis)

        if numpy.linalg.norm(major_axis) < 1e-9:
            major_axis = numpy.array([0.0, 0.0, 1.0])
        else:
            major_axis = major_axis / numpy.linalg.norm(major_axis)

        if major_axis[2] < 0:
            major_axis = -major_axis
    else:
        major_axis = numpy.array([1.0, 0.0, 0.0])
        minor_axis = numpy.array([0.0, 1.0, 0.0])

        matrix = numpy.eye(4)
        matrix[:3, 0] = minor_axis
        matrix[:3, 1] = major_axis
        matrix[:3, 2] = member_axis
        matrix[:3, 3] = start_vector

        return matrix

    minor_axis = numpy.cross(member_axis, major_axis)
    minor_axis = minor_axis / numpy.linalg.norm(minor_axis)

    matrix = numpy.eye(4)
    matrix[:3, 0] = minor_axis
    matrix[:3, 1] = major_axis
    matrix[:3, 2] = member_axis
    matrix[:3, 3] = start_vector

    return matrix


def z_shape_profile_points(section: dict[str, Any]) -> list[tuple[float, float]]:
    depth = section["depth"] / 1000.0
    top_flange = section["topFlange"] / 1000.0
    bottom_flange = section["bottomFlange"] / 1000.0
    thickness = section["t"] / 1000.0
    half_depth = depth / 2.0

    return [
        (-bottom_flange, -half_depth),
        (0.0, -half_depth),
        (0.0, half_depth - thickness),
        (top_flange - thickness, half_depth - thickness),
        (top_flange - thickness, half_depth),
        (0.0, half_depth),
        (0.0, -half_depth + thickness),
        (-bottom_flange + thickness, -half_depth + thickness),
        (-bottom_flange + thickness, -half_depth),
    ]


def c_shape_profile_points(section: dict[str, Any]) -> list[tuple[float, float]]:
    depth = section["depth"] / 1000.0
    flange = section["flange"] / 1000.0
    thickness = section["t"] / 1000.0
    half_depth = depth / 2.0

    return [
        (0.0, -half_depth),
        (flange, -half_depth),
        (flange, -half_depth + thickness),
        (thickness, -half_depth + thickness),
        (thickness, half_depth - thickness),
        (flange, half_depth - thickness),
        (flange, half_depth),
        (0.0, half_depth),
    ]


def create_i_shape_profile(model, section: dict[str, Any]):
    return model.create_entity(
        "IfcIShapeProfileDef",
        ProfileName=section["name"],
        ProfileType="AREA",
        OverallWidth=section["b"] / 1000.0,
        OverallDepth=section["h"] / 1000.0,
        WebThickness=section["tw"] / 1000.0,
        FlangeThickness=section["tf"] / 1000.0,
    )


def create_z_shape_profile(model, section: dict[str, Any]):
    points = z_shape_profile_points(section)
    polyline = model.create_entity(
        "IfcPolyline",
        Points=[model.create_entity("IfcCartesianPoint", Coordinates=[x, y]) for x, y in points + [points[0]]],
    )

    return model.create_entity(
        "IfcArbitraryClosedProfileDef",
        ProfileType="AREA",
        ProfileName=section["name"],
        OuterCurve=polyline,
    )


def create_c_shape_profile(model, section: dict[str, Any]):
    return model.create_entity(
        "IfcCShapeProfileDef",
        ProfileName=section["name"],
        ProfileType="AREA",
        Depth=section["depth"] / 1000.0,
        Width=section["flange"] / 1000.0,
        WallThickness=section["t"] / 1000.0,
        Girth=section["flange"] / 1000.0,
    )


def create_chs_profile(model, section: dict[str, Any]):
    return model.create_entity(
        "IfcCircleHollowProfileDef",
        ProfileName=section["name"],
        ProfileType="AREA",
        Radius=section["d"] / 2000.0,
        WallThickness=section["t"] / 1000.0,
    )


def create_member_profile(model, section: dict[str, Any]):
    profile = section.get("profile", "ub")

    if profile == "z":
        return create_z_shape_profile(model, section)

    if profile == "c":
        return create_c_shape_profile(model, section)

    if profile == "chs":
        return create_chs_profile(model, section)

    return create_i_shape_profile(model, section)


def member_placement_matrix(member: dict[str, Any], building_matrix: numpy.ndarray) -> numpy.ndarray:
    return building_matrix @ member_axis_matrix(
        member["start"],
        member["end"],
        member["role"],
        orientation=member.get("orientation"),
    )


def create_steel_member(
    model,
    body,
    member: dict[str, Any],
    ifc_class: str,
    building_matrix: numpy.ndarray,
    *,
    name: str | None = None,
    object_type: str | None = None,
    predefined_type: str | None = None,
):
    start = member["start"]
    end = member["end"]
    section = member["section"]
    length = float(
        numpy.linalg.norm(numpy.array(end, dtype=float) - numpy.array(start, dtype=float))
    )

    element_kwargs: dict[str, Any] = {
        "ifc_class": ifc_class,
        "name": name or f"{member['id']} ({section['name']})",
    }

    if predefined_type is not None:
        element_kwargs["predefined_type"] = predefined_type

    element = ifcopenshell.api.root.create_entity(model, **element_kwargs)

    if object_type is not None:
        element.ObjectType = object_type

    profile = create_member_profile(model, section)
    representation = ifcopenshell.api.geometry.add_profile_representation(
        model,
        context=body,
        profile=profile,
        depth=length,
    )
    ifcopenshell.api.geometry.assign_representation(
        model,
        product=element,
        representation=representation,
    )

    matrix = member_placement_matrix(member, building_matrix)
    ifcopenshell.api.geometry.edit_object_placement(
        model,
        product=element,
        matrix=matrix,
        is_si=True,
    )

    return element


def create_haunch(
    model,
    body,
    member: dict[str, Any],
    building_matrix: numpy.ndarray,
):
    section = member["section"]
    start = member["start"]
    end = member["end"]
    length = float(
        numpy.linalg.norm(numpy.array(end, dtype=float) - numpy.array(start, dtype=float))
    )

    element = ifcopenshell.api.root.create_entity(
        model,
        ifc_class="IfcBeam",
        name=f"{member['id']} ({section['name']} haunch)",
        predefined_type="USERDEFINED",
    )
    element.ObjectType = "Eaves haunch"

    vertices, faces = create_tapered_top_anchored_i_shape_mesh(
        section,
        length,
        HAUNCH_DEPTH_FACTOR,
        0.0,
    )
    vertices = flip_mesh_local_y(vertices)
    representation = ifcopenshell.api.geometry.add_mesh_representation(
        model,
        context=body,
        vertices=[vertices],
        faces=[faces],
    )
    ifcopenshell.api.geometry.assign_representation(
        model,
        product=element,
        representation=representation,
    )

    matrix = member_placement_matrix(member, building_matrix)
    ifcopenshell.api.geometry.edit_object_placement(
        model,
        product=element,
        matrix=matrix,
        is_si=True,
    )

    return element


def create_ground_floor_slab(
    model,
    body,
    slab: dict[str, Any],
    building_matrix: numpy.ndarray,
):
    width = float(slab.get("width", 1.0))
    length = float(slab.get("length", 1.0))
    depth = float(slab.get("depth", 0.25))
    slab_id = str(slab.get("id", "ground-floor-slab"))

    element = ifcopenshell.api.root.create_entity(
        model,
        ifc_class="IfcSlab",
        name=slab_id,
        predefined_type="FLOOR",
    )
    element.ObjectType = "Ground floor slab"

    profile = model.create_entity(
        "IfcRectangleProfileDef",
        ProfileName="Ground floor slab",
        ProfileType="AREA",
        XDim=width,
        YDim=length,
    )
    representation = ifcopenshell.api.geometry.add_profile_representation(
        model,
        context=body,
        profile=profile,
        depth=depth,
    )
    ifcopenshell.api.geometry.assign_representation(
        model,
        product=element,
        representation=representation,
    )

    matrix = building_matrix @ translation_matrix(0.0, length / 2.0, -depth)
    ifcopenshell.api.geometry.edit_object_placement(
        model,
        product=element,
        matrix=matrix,
        is_si=True,
    )

    return element


def create_footing(
    model,
    body,
    member: dict[str, Any],
    building_matrix: numpy.ndarray,
):
    footing = member.get("footing") or {}
    width = float(footing.get("width", 1.5))
    depth = float(footing.get("depth", 1.5))
    height = float(footing.get("height", 0.5))
    footing_type = footing.get("type", "reinforced_pad")
    predefined_type = "PAD_FOOTING"
    object_type = None

    if footing_type == "pile_cap":
        predefined_type = "PILE_CAP"
        object_type = "Two-pile pile cap"
    elif footing_type == "mass_filled":
        predefined_type = "USERDEFINED"
        object_type = "Mass-filled foundation"
    elif footing_type == "reinforced_pad":
        object_type = "Reinforced pad foundation"

    element = ifcopenshell.api.root.create_entity(
        model,
        ifc_class="IfcFooting",
        name=member["id"],
        predefined_type=predefined_type,
    )

    if object_type is not None:
        element.ObjectType = object_type

    profile = model.create_entity(
        "IfcRectangleProfileDef",
        ProfileName=object_type or "Footing",
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

    matrix = member_placement_matrix(member, building_matrix)
    ifcopenshell.api.geometry.edit_object_placement(
        model,
        product=element,
        matrix=matrix,
        is_si=True,
    )

    return element


def create_pile(
    model,
    body,
    member: dict[str, Any],
    building_matrix: numpy.ndarray,
):
    pile = member.get("pile") or {}
    diameter = float(pile.get("diameter", 0.45))
    depth = float(pile.get("depth", 6.0))

    element = ifcopenshell.api.root.create_entity(
        model,
        ifc_class="IfcPile",
        name=member["id"],
        predefined_type="BORED",
    )
    element.ObjectType = "Bored concrete pile"

    profile = model.create_entity(
        "IfcCircleProfileDef",
        ProfileName="Pile",
        ProfileType="AREA",
        Radius=diameter / 2.0,
    )
    representation = ifcopenshell.api.geometry.add_profile_representation(
        model,
        context=body,
        profile=profile,
        depth=depth,
    )
    ifcopenshell.api.geometry.assign_representation(
        model,
        product=element,
        representation=representation,
    )

    matrix = member_placement_matrix(member, building_matrix)
    ifcopenshell.api.geometry.edit_object_placement(
        model,
        product=element,
        matrix=matrix,
        is_si=True,
    )

    return element


def export_portal_frame(payload: dict[str, Any]):
    name = payload.get("name") or "Portal frame building"
    rotation = payload.get("rotation", [0.0, 0.0, 0.0])
    members = payload.get("members", [])
    haunches = payload.get("haunches", [])
    slab = payload.get("slab")

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

    building_matrix = building_placement_matrix(rotation)
    products = []

    if slab is not None:
        products.append(create_ground_floor_slab(model, body, slab, building_matrix))

    for member in members:
        role = member["role"]

        if role in {"column", "gable_column"}:
            products.append(create_steel_member(model, body, member, "IfcColumn", building_matrix))
        elif role in {"rafter", "tie", "brace", "purlin", "side_rail"}:
            object_type = None

            if role == "purlin":
                object_type = "Roof purlin"
            elif role == "side_rail":
                object_type = "Side rail"

            products.append(
                create_steel_member(
                    model,
                    body,
                    member,
                    "IfcBeam",
                    building_matrix,
                    object_type=object_type,
                )
            )
        elif role == "foundation":
            if member.get("pile") is not None:
                products.append(create_pile(model, body, member, building_matrix))
            else:
                products.append(create_footing(model, body, member, building_matrix))

    for haunch in haunches:
        products.append(create_haunch(model, body, haunch, building_matrix))

    ifcopenshell.api.spatial.assign_container(
        model,
        relating_structure=storey,
        products=products,
    )

    return model


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: export_building_ifc.py <output.ifc>", file=sys.stderr)
        return 1

    payload = json.loads(sys.stdin.read())
    output_path = Path(sys.argv[1])
    model = export_portal_frame(payload)
    model.write(str(output_path))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
