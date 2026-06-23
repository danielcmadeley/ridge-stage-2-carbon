#!/usr/bin/env python3

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))

from export_building_ifc import (  # noqa: E402
    HAUNCH_DEPTH_FACTOR,
    create_tapered_top_anchored_i_shape_mesh,
    export_portal_frame,
    haunch_depth_factor_at,
)


class ExportBuildingIfcTest(unittest.TestCase):
    def test_haunch_depth_factor_tapers_to_zero(self) -> None:
        self.assertEqual(haunch_depth_factor_at(0.0), HAUNCH_DEPTH_FACTOR)
        self.assertEqual(haunch_depth_factor_at(1.0), 0.0)

    def test_tapered_haunch_mesh_collapses_at_far_end(self) -> None:
        section = {
            "name": "UB 356x171x45",
            "h": 352.4,
            "b": 171.1,
            "tw": 7.4,
            "tf": 11.5,
        }
        vertices, _faces = create_tapered_top_anchored_i_shape_mesh(
            section,
            1.2,
            HAUNCH_DEPTH_FACTOR,
            0.0,
            4,
        )
        last_ring_start = 4 * 12

        for index in range(12):
            self.assertAlmostEqual(vertices[last_ring_start + index][1], 0.0, places=6)

    def test_export_writes_polygonal_haunch_geometry(self) -> None:
        section = {
            "name": "UB 356x171x45",
            "h": 352.4,
            "b": 171.1,
            "tw": 7.4,
            "tf": 11.5,
        }
        payload = {
            "name": "test",
            "rotation": [0.0, 0.0, 0.0],
            "members": [
                {
                    "id": "frame-0-rafter-left",
                    "role": "rafter",
                    "start": [-12.0, 0.0, 6.0],
                    "end": [0.0, 0.0, 7.26],
                    "section": section,
                },
            ],
            "haunches": [
                {
                    "id": "frame-0-haunch-left",
                    "role": "haunch",
                    "start": [-11.8, 0.0, 5.82],
                    "end": [-10.6, 0.0, 5.94],
                    "section": section,
                },
            ],
        }

        with tempfile.NamedTemporaryFile(suffix=".ifc") as handle:
            model = export_portal_frame(payload)
            model.write(handle.name)
            contents = Path(handle.name).read_text().upper()

        self.assertIn("IFCPOLYGONALFACESET", contents)
        self.assertIn("FRAME-0-HAUNCH-LEFT", contents)

    def test_export_orients_haunch_below_the_rafter(self) -> None:
        import ifcopenshell
        import ifcopenshell.geom

        section = {
            "name": "UB 356x171x45",
            "h": 352.4,
            "b": 171.1,
            "tw": 7.4,
            "tf": 11.5,
        }
        payload = {
            "name": "test",
            "rotation": [0.0, 0.0, 0.0],
            "members": [
                {
                    "id": "frame-0-rafter-left",
                    "role": "rafter",
                    "start": [-12.0, 0.0, 6.0],
                    "end": [0.0, 0.0, 7.26],
                    "section": section,
                },
            ],
            "haunches": [
                {
                    "id": "frame-0-haunch-left",
                    "role": "haunch",
                    "start": [-11.8, 0.0, 5.82],
                    "end": [-10.6, 0.0, 5.94],
                    "section": section,
                },
            ],
        }

        with tempfile.NamedTemporaryFile(suffix=".ifc") as handle:
            model = export_portal_frame(payload)
            model.write(handle.name)
            ifc = ifcopenshell.open(handle.name)

        haunch = next(
            beam
            for beam in ifc.by_type("IfcBeam")
            if beam.Name and "haunch-left" in beam.Name.lower()
        )
        settings = ifcopenshell.geom.settings()
        settings.set("use-world-coords", True)
        shape = ifcopenshell.geom.create_shape(settings, haunch)
        vertices = shape.geometry.verts
        z_values = [vertices[index + 2] for index in range(0, len(vertices), 3)]
        anchor_z = 5.82

        self.assertLess(min(z_values), anchor_z - 0.4)
        self.assertAlmostEqual(max(z_values), 5.94, delta=0.02)


if __name__ == "__main__":
    unittest.main()
