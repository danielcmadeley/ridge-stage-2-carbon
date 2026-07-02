# Pad foundation — Stage 2 sizing (MASS / plain concrete option)

_Sizing calculation. Geotechnical design to EN 1997-1:2004+A1:2013 & UK NA. Plain-concrete structural design to EN 1992-1-1:2004+A1:2014 §12 & UK NA. Combinations to EN 1990._

> **What changes vs the reinforced option.** The geotechnical sizing (bearing, sliding, EQU) is identical. The structural design is **unreinforced** — there is no flexural/shear/punching reinforcement. Instead the depth is fixed by the EC2 §12.9.3 plain-footing rule: the column-face projection `a` must not exceed `a_max = 0.85·h·√(f_ctd,pl/(3·f_dz))`. The carbon objective therefore drops the rebar term but pays for a thicker section.

---

## 1 · Variable inputs

| Input                                           | Symbol      | Value        |
| ----------------------------------------------- | ----------- | ------------ |
| Permanent vertical load (characteristic)        | `F_Gz,k`    | **250.0 kN** |
| Variable horizontal load, wind (characteristic) | `F_Wx,k`    | **150.0 kN** |
| Soil bulk unit weight                           | `γ_soil`    | 18.0 kN/m³   |
| Effective shear resistance angle                | `φ′_k`      | 30.0°        |
| Interface friction angle                        | `δ_k`       | 20.0°        |
| Presumed (allowable) bearing pressure           | `P_bearing` | 150.0 kN/m²  |

Column 300 × 300 mm · soil cover 600 mm · concrete **C28/35** · plain-concrete coeff. `α_ct,pl` = 0.80. Carbon factor (A1–A3): concrete **329 kgCO₂e/m³** (editable; a leaner mass-fill mix would lower this).

## 2 · Result — sized mass-concrete pad

| Output                      | Value                                       |
| --------------------------- | ------------------------------------------- |
| **Plan (square)**           | **2.20 m × 2.20 m**                         |
| **Depth**                   | **750 mm**                                  |
| Reinforcement               | **none** (plain concrete)                   |
| Governing on plan           | Bearing (peak pressure)                     |
| Governing on depth          | **Plain-footing projection rule (§12.9.3)** |
| Concrete volume             | 3.63 m³                                     |
| **Embodied carbon (A1–A3)** | **1194 kgCO₂e**                             |

### Limit-state utilisation summary

| Limit state                        | Basis                   | Utilisation |
| ---------------------------------- | ----------------------- | ----------- |
| Bearing (SLS, presumed)            | `q_max` ≤ `P_bearing`   | 0.96        |
| Sliding — DA1-C1                   | `H/R_H` (passive incl.) | 0.73        |
| Sliding — DA1-C2                   | `H/R_H` (passive incl.) | 0.87        |
| Sliding — C2, passive _discounted_ | robustness              | ⚠ 1.70      |
| Overturning (EQU)                  | `M_dst/M_stb`           | 0.43        |
| **Plain footing**                  | `a` ≤ `a_max` (§12.9.3) | **1.00**    |

---

## 3 · Bearing — plan sizing (EC7 §6.5.2, SLS)

`F_dz` = 393.0 kN; net eccentricity `e_x` = `F_Wx·h/F_dz` = **286 mm** (`B/6` = 367 mm). Peak edge pressure `q_max` = **144.6 kN/m²** ≤ `P_bearing` = 150.0 → utilisation 0.96 ✓

## 4 · Sliding (EC7 §6.5.3, ULS)

DA1-C2: `H` = 195.0 kN; `δ_d` = 16.2°; `K_p` = 3.98. `R_H` = `F_dz·tan δ_d + F_p` = 114.4 + 110.6 = **225.0 kN** → **0.87** ✓

> ⚠ Passive-discounted C2 utilisation = **1.70** — same robustness caveat as the reinforced option.

## 5 · Overturning — EQU

`M_dst` = 168.8 kNm ≤ `M_stb` = 389.1 kNm → 0.43 ✓

## 6 · Plain-concrete footing — depth driver (EC2 §12.9.3)

The pad spans the cantilever projection in **plain concrete**, relying on its design tensile strength. Design tensile strength: `f_ctd,pl` = `α_ct,pl·f_ctk,0.05/γ_C` = 0.80·1.94/1.50 = **1.03 N/mm²**. Worst ULS effective-area design pressure (DA1-C1 governs): `f_dz` = **154.2 kN/m²**. Projection from column face: `a` = (B−c)/2 = **950 mm**. Maximum projection (exp. 12.13): `a_max` = `0.85·h·√(f_ctd,pl/(3·f_dz))` = **952 mm**. **`a / a_max` = 1.00** ✓ — this is what fixes the 750 mm depth (a shallower pad would fail; a deeper one is wasted concrete).

_No reinforcement is provided. Check the column–foundation interface bearing (partially-loaded area, EC2 §6.7) at detailed design, and provide a kicker / starter detail for the column only._

## 7 · Embodied carbon (A1–A3)

| Component       | Quantity | Factor  | kgCO₂e   |
| --------------- | -------- | ------- | -------- |
| Concrete C28/35 | 3.63 m³  | 329 /m³ | 1194     |
| Reinforcement   | none     | —       | 0        |
| **Total**       |          |         | **1194** |

---

## 8 · Reinforced vs mass-concrete — head to head

|                   | Reinforced      | Mass concrete      |
| ----------------- | --------------- | ------------------ |
| Plan              | 2.10 × 2.10 m   | 2.20 × 2.20 m      |
| Depth             | 675 mm          | 750 mm             |
| Concrete          | 2.98 m³         | 3.63 m³            |
| Reinforcement     | 133 kg          | 0                  |
| Depth governed by | sliding         | plain-footing rule |
| Concrete carbon   | 979             | 1194               |
| Rebar carbon      | 101             | 0                  |
| **Total A1–A3**   | **1080 kgCO₂e** | **1194 kgCO₂e**    |

**For these loads/soil the reinforced pad is lower carbon by ≈ 114 kgCO₂e (11 %).** Mass fill saves the 133 kg of rebar (≈ 101 kgCO₂e) but the §12.9.3 depth rule forces an extra 0.65 m³ of concrete (≈ 215 kgCO₂e), which outweighs the saving.

**When mass fill wins instead:** smaller projection (larger column, or a plinth that reduces `a`), higher-strength concrete (raises `f_ctd,pl`, allowing a shallower plain section), a leaner low-carbon mass-fill mix (lower `ecf_conc`), or where rebar supply/buildability/programme rather than carbon is the driver. The cross-over is sensitive to the projection-to-depth relationship, so the tool should report both and let the user see the gap rather than hard-coding a choice.

_Carbon scope A1–A3 only; excludes excavation/disposal (mass fill digs ≈ 0.91 m³ more). Replace carbon factors with project EPDs before reporting._
