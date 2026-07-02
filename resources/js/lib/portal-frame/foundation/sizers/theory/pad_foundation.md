# Pad foundation — Stage 2 sizing & embodied carbon

_Sizing calculation (loads + soil → geometry, reinforcement, quantities, carbon)._ _Geotechnical design to EN 1997-1:2004+A1:2013 & UK NA. Structural design to EN 1992-1-1:2004+A1:2014 & UK NA. Combinations to EN 1990._

> **Tool principle.** This is a _sizer_, not a checker. The user supplies the **vertical load, horizontal load and soil properties**; the tool searches feasible square pads `(B, h)` and returns the geometry of **minimum A1–A3 embodied carbon** for which every limit state is satisfied. Reinforcement, quantities and carbon fall out of the chosen geometry.

---

## 1 · Variable inputs

| Input                                                  | Symbol      | Value        |
| ------------------------------------------------------ | ----------- | ------------ |
| Permanent vertical load (characteristic)               | `F_Gz,k`    | **250.0 kN** |
| Variable horizontal load, wind, x-dir (characteristic) | `F_Wx,k`    | **150.0 kN** |
| Soil bulk unit weight                                  | `γ_soil`    | 18.0 kN/m³   |
| Effective cohesion                                     | `c′_k`      | 0.0 kN/m²    |
| Effective shear resistance angle                       | `φ′_k`      | 30.0°        |
| Soil–concrete interface friction angle                 | `δ_k`       | 20.0°        |
| Presumed (allowable) bearing pressure                  | `P_bearing` | 150.0 kN/m²  |
| Soil drained modulus _(settlement only)_               | `E′`        | 25000 kN/m²  |

## 2 · Fixed / default inputs _(editable)_

Column 300 × 300 mm · soil cover `h_soil` = 600 mm · concrete **C28/35**, `f_yk` = 500 N/mm² · cover 50 mm all faces · γ*conc = 25.0 kN/m³. DA1 factors A1 (1.35/1.50), A2 (1.00/1.30), M2 `γ*φ` = 1.25; EQU 0.90/1.10/1.50. Carbon factors (A1–A3): concrete **329 kgCO₂e/m³** (C28/35, CEM I) · reinforcement **0.76 kgCO₂e/kg** (UK EAF rebar). Both user-editable.

---

## 3 · Result — sized foundation

| Output                                       | Value                                           |
| -------------------------------------------- | ----------------------------------------------- |
| **Plan (square)**                            | **2.10 m × 2.10 m**                             |
| **Depth**                                    | **675 mm** _(round to 700 mm for construction)_ |
| Bottom reinforcement (each way)              | **12 mm @ 125 c/c** (`A_s,prov` = 1923 mm²)     |
| Top reinforcement (each way)                 | **12 mm @ 125 c/c** (min steel / crack control) |
| Governing on plan                            | **Bearing** (peak pressure)                     |
| Governing on depth                           | **Sliding (DA1-C2)** + rigidity                 |
| Concrete volume                              | 2.98 m³                                         |
| Reinforcement mass (incl. 10% laps/starters) | 133 kg                                          |
| **Embodied carbon (A1–A3)**                  | **1080 kgCO₂e**                                 |

_For reference the original 2.2 × 0.65 m pad carries the same loads at ≈ 1141 kgCO₂e, so the carbon-optimal section saves ≈ 5 %._

### Limit-state utilisation summary

| Limit state                        | Basis                     | Utilisation |
| ---------------------------------- | ------------------------- | ----------- |
| Bearing (SLS, presumed)            | `q_max` ≤ `P_bearing`     | **1.00**    |
| Sliding — DA1-C1                   | `H / R_H` (passive incl.) | 0.83        |
| Sliding — DA1-C2                   | `H / R_H` (passive incl.) | **0.98**    |
| Sliding — C2, passive _discounted_ | robustness                | ⚠ 1.80      |
| Overturning (EQU)                  | `M_dst / M_stb`           | 0.43        |
| Flexure (ULS)                      | min steel governs         | pass        |
| One-way shear (ULS)                | `V_Ed / V_Rd,c`           | 0.11        |
| Punching — face crushing           | `v_Ed,0 / v_Rd,max`       | 0.14        |

---

## 4 · Bearing — plan sizing (EC7 §6.5.2, SLS)

Vertical reaction at underside (characteristic): `F_dz = B²·(h·γ_conc + h_soil·γ_soil) + F_Gz,k` = **372.0 kN**

Net eccentricity = overturning moment / vertical reaction (vertical load is concentric, so only the horizontal thrust over the pad depth contributes): `e_x = F_Wx,k·h / F_dz` = **272 mm** ( `B/6` = 350 mm → full contact )

Peak edge pressure (presumed values are settlement-limiting, so compare the **peak**, not an effective-area average): `q_max` = **150.0 kN/m²** ≤ `P_bearing` = 150.0 kN/m² → **utilisation 1.00** ✓

## 5 · Sliding (EC7 §6.5.3, ULS — depth driver)

DA1-C2 governs. Favourable vertical (`γ_Gf`=1.0): `F_dz` = 372.0 kN; horizontal `H` = `γ_Q·F_Wx` = **195.0 kN**. Design interface friction `δ_d` = atan(tanδ*k/γ*φ) = 16.2° → `K_p` = 3.98. Resistance `R_H` = `F_dz·tan δ_d + F_p` = 108.3 + 91.3 = **199.7 kN** **`H / R_H` = 0.98** ✓ (C1 = 0.83)

> ⚠ **Robustness flag.** Sliding relies heavily on mobilised passive resistance. With passive **discounted**, C2 utilisation = **1.80** (fails). Confirm the soil in front cannot be removed (service trenches, future excavation, made ground) before relying on `F_p`. This is exposed as a tool toggle — see §13.

---

## 6 · Flexure (EC2 §6.1, ULS)

Cantilever moment at the column face from the net soil pressure (governing DA1 combination): `M_Ed` = **124.9 kNm**. Required steel `A_s,flex` = 488 mm²; minimum `A_s,min` = 0.26·f_ctm/f_yk·b·d = 1870 mm² → **minimum steel governs**. Provide **12 mm @ 125 c/c** (`A_s,prov` = 1923 mm² ≥ 1870 mm²) ✓ Lever arm `z` = 588 mm; `d` = 619 mm.

## 7 · One-way shear (EC2 §6.2)

`V_Ed` = 52.9 kN ≤ `V_Rd,c` = 472.9 kN → utilisation 0.11 ✓ (no shear reinforcement).

---

## 8 · SLS — settlement & serviceability _(added)_

At Stage 2 the presumed bearing value is itself settlement-limiting, so satisfying `q_max ≤ P_bearing` (§4) is the primary SLS check. As an order-of-magnitude estimate, immediate elastic settlement of a rigid square pad: `s ≈ q·B·(1−ν²)·I_s / E′`, with `I_s` ≈ 0.82 → `s ≈` **5.3 mm**.

Because the load is eccentric (`e_x` = 272 mm) the pressure is trapezoidal, so expect **differential settlement / tilt** across the pad; check rotation tolerance of the supported structure if the frame is sensitive. Replace this estimate with a project-specific settlement analysis (and a quasi-permanent SLS combination) once `E′` and consolidation parameters are confirmed.

## 9 · Overturning — EQU _(added)_

Distinct limit state from GEO bearing, own factor set (EN1990 A1.2(A): destabilising 1.10/1.50, stabilising 0.90). Destabilising `M_dst` = `γ_Q·F_Wx·h` = **151.9 kNm**. Stabilising `M_stb` = `γ_G,stb·V·(B/2)` = **351.6 kNm**. **`M_dst / M_stb` = 0.43** ✓ (comfortable, as expected once bearing/sliding pass).

## 10 · Punching shear — proper β _(added)_

Replaces the figure-picked `β = 1.5`. Moment-transfer factor for an internal rectangular column (EC2 §6.4.3, `k` = 0.6 for `c₁/c₂` = 1): `β = 1 + k·(M_Ed/V_Ed)·(u₁/W₁)` = **1.30**. Face crushing: `v_Ed,0` = `β·V_Ed/(u₀·d)` = **0.60 N/mm²** ≤ `v_Rd,max` = 4.23 N/mm² ✓ Basic control perimeter (2d): with soil-pressure relief inside the perimeter the net force is ≈ 0, so the perimeter check is non-critical for this compact pad; face crushing governs and passes with large margin.

## 11 · Detailing _(added)_

Concept-level detailing to carry into Stage 3/4:

- **Anchorage** of bottom bars: `f_bd` = 2.90 N/mm²; `l_b,rqd` = (φ/4)(f_yd/f_bd) = 449 mm → provide `l_bd` ≈ **314 mm** (bobbed) / 449 mm straight. Pad half-width (900 mm) comfortably accommodates this.
- **Laps** (if used): `l₀` ≈ 674 mm (α₆ = 1.5).
- **Bar spacing**: 125 mm ≤ s_max,slab; ≥ max(bar Ø, 20 mm, d_g+5). OK.
- **Column interface**: check partially-loaded-area bearing (EC2 §6.7) and provide column **starter bars** anchored into the pad ≥ `l_bd` + kicker; include in the rebar take-off at detailed design.
- **Edge cover / end distance**: 50 mm side cover; trim bars to maintain cover at edges.

---

## 12 · Embodied carbon (A1–A3)

| Component       | Quantity | Factor   | kgCO₂e   |
| --------------- | -------- | -------- | -------- |
| Concrete C28/35 | 2.98 m³  | 329 /m³  | 979      |
| Reinforcement   | 133 kg   | 0.76 /kg | 101      |
| **Total**       |          |          | **1080** |

_Excludes excavation, disposal and concrete placement (A4/A5) and any blinding — add at detailed design. Excavation ≈ 5.6 m³ is **not** in the optimisation objective, which is why a deeper/narrower section can win on A1–A3; enable an A5 penalty (§13) if site carbon is in scope._

## 13 · Assumptions, toggles & limitations

**Assumptions:** pinned column base (base moment = `F_Wx·h` only — add `M_col` if moment-resisting); dry soil (`h_water` = 0, no buoyancy); vertical load fully permanent and concentric; single variable action (wind); square pad.

**Recommended tool toggles** (each materially changes the carbon answer):

1. **Passive in sliding** — on/off. Off ≈ doubles footprint (see §5 robustness flag).
2. **Bearing basis** — presumed-allowable vs peak pressure vs full EC7 Annex-D resistance _with inclination factors_ (`H/V` = 0.40 here is steep — Annex D would reduce the `N_γ` term).
3. **Excavation/A5 carbon** in the objective (penalises depth).
4. **Rectangular pad** (longer in the wind direction) — likely more carbon-efficient than square under uniaxial `H`; a v2 refinement.

**Limitations:** concept stage only; settlement is an estimate; no seismic/EC8; no ground-water or made-ground cases; carbon factors must be replaced with project EPDs before reporting.
