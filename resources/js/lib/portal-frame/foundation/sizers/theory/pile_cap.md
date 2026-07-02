# Two-pile cap — Stage 2 sizing & embodied carbon

_Sizing calculation (loads + pile capacity → cap geometry, tie steel, quantities, carbon)._ _Strut-and-tie design to EN 1992-1-1:2004 §6.5 & UK NA. Pile spacing to BS 8004:2015. Combinations to EN 1990._

> **Tool principle.** A _sizer_, not a checker. You supply the column loads, the pile working capacity, pile diameter and column size. The cap **plan is fixed by the pile geometry** (spacing = 3·dia for friction piles, plus edge overhang); the only free variable is the cap **depth**, which the tool drives down to the **minimum-carbon** section that still satisfies the tie, beam shear, node and pile-load checks. Concrete dominates the carbon, so minimum depth = minimum carbon.

---

## 1 · Variable inputs

| Input                          | Symbol      | Value            |
| ------------------------------ | ----------- | ---------------- |
| Permanent vertical load        | `N_G`       | **600.0 kN**     |
| Variable vertical load         | `N_Q`       | **400.0 kN**     |
| Permanent horizontal shear (x) | `F_vx,G`    | 60.0 kN          |
| Variable horizontal shear (x)  | `F_vx,Q`    | 40.0 kN          |
| Pile working capacity          | `P_cap`     | **600.0 kN**     |
| Pile diameter                  | `Ø`         | 450.0 mm         |
| Column size (span × trans.)    | `c_x × c_y` | 500.0 × 300.0 mm |

Overhang 150.0 mm · pile spacing 3·Ø · concrete **C28/35** · cover bottom 75.0 mm, sides/top 50.0 mm. Carbon: concrete **329 kgCO₂e/m³**, reinforcement rate **110 kg/m³** @ 0.76 kgCO₂e/kg (Stage-2 rate; tie steel computed separately).

## 2 · Result — sized cap

| Output                                | Value                                    |
| ------------------------------------- | ---------------------------------------- |
| Number of piles                       | **2**                                    |
| Pile spacing (c/c)                    | 1350 mm (= 3·Ø, BS 8004 min)             |
| **Plan**                              | **2100 × 750 mm**                        |
| **Depth**                             | **925 mm** (`d` = 838 mm)                |
| Main tie                              | **8B16** (`A_s` = 1608 mm² ≥ 1461 req'd) |
| Governing on depth                    | **Beam shear**                           |
| Concrete volume                       | 1.46 m³                                  |
| Reinforcement (rate)                  | 160 kg                                   |
| **Embodied carbon (A1–A3, cap only)** | **601 kgCO₂e**                           |

### Limit-state utilisation summary

| Limit state                           | Basis                | Utilisation |
| ------------------------------------- | -------------------- | ----------- |
| Pile capacity (service, incl. moment) | `P_max` ≤ `P_cap`    | **0.98**    |
| Beam shear (enhanced)                 | `V_red` ≤ `V_Rd,c`   | **0.97**    |
| Strut crushing                        | `P_ult` ≤ `V_Rd,max` | 0.31        |
| CCC node (column)                     | `σ_Ed` ≤ `σ_Rd`      | 0.67        |
| CCT node (pile)                       | `F` ≤ `F_cap`        | 0.43        |
| Column punching                       | `v_Ed` ≤ `v_Rd,max`  | 0.00        |

---

## 3 · Pile reactions

Cap selfweight ≈ 36.4 kN. Moment about the cap from the horizontal shear over the cap depth (plus any applied column moment / eccentricity): `M = F_vx · D` → service **92.5 kNm**, ultimate **130.4 kNm**. Pile reaction `P = N/2 ± M/s` (2 piles):

- Service max = **586.7 kN** ≤ `P_cap` = 600.0 kN → util 0.98 ✓
- Ultimate max = **826.2 kN** (drives the strut-and-tie design).

## 4 · Strut-and-tie — main tension tie (EC2 §6.5)

The column load splits into two inclined struts to the piles, tied across the bottom. Strut angle to horizontal = **51°** (≥ 45° required for a valid truss). Tie force (Reynolds/CIRIA): `T = F·(3·l² − a²)/(12·l·d)` with `F` = 2·P*ult,max, `l` = spacing, `a` = `c_x`: **`T` = 635.4 kN** → `A_s,req` = `T/(0.87·f_yk)` = **1460.8 mm²** → provide **8B16** (1608.5 mm²). ✓ \_Band the tie bars over the pile width and provide full anchorage beyond the pile centres.*

## 5 · Beam shear — depth driver (EC2 §6.2 with §6.2.2(6) enhancement)

Shear span (column face → pile centre) `a_v` = `s/2 − c_x/2` = **425 mm** (< 2d → short-shear enhancement). Enhancement `β` = `a_v/(2d)` = **0.25**; enhanced shear `V_red` = `β·P_ult,max` = **209.6 kN**. Resistance `V_Rd,c` = **216.4 kN** → **`V_red/V_Rd,c` = 0.97** ✓ (this is what fixes the depth). Strut crushing `V_Rd,max` = 2655.0 kN ≫ pile reaction ✓.

## 6 · Node checks (EC2 §6.5.4)

- **CCC node** under the column: `σ_Ed` = `N_ult/(c_x·c_y)` = 9.4 N/mm² ≤ `σ_Rd` = `ν′·f_cd` = 14.1 N/mm² ✓
- **CCT node** over the pile: `F` = 826.2 kN ≤ `F_cap` = `(π·Ø²/4)·0.85·ν′·f_cd` = 1904.7 kN ✓

## 7 · Embodied carbon (A1–A3, cap only)

| Component                      | Quantity | Factor   | kgCO₂e  |
| ------------------------------ | -------- | -------- | ------- |
| Concrete C28/35                | 1.46 m³  | 329 /m³  | 479     |
| Reinforcement (rate 110 kg/m³) | 160 kg   | 0.76 /kg | 122     |
| **Total (cap)**                |          |          | **601** |

> **Piles are excluded** — they're a separate geotechnical element whose carbon depends on length and ground conditions (often the larger item). Enable `include_pile_carbon` for a crude allowance once pile lengths are known.

## 8 · Notes, assumptions & comparison

**Reproduces your TEDDS cap.** Run at the supplied 2100×750×**950** geometry the engine gives tie 619.5 kN / 1424.1 mm², pile reactions 589.1/829.5 kN, CCC 9.4/14.1, CCT cap 1904.7 kN — matching the document. The optimiser then trims the depth to **925 mm** (shear util 0.97), saving the small amount of concrete between 950 and 925 mm.

**Assumptions:** two piles only (this script); friction piles at min 3·Ø spacing; moment taken purely as `F_vx·D` plus any applied column moment; piles vertical; rebar carbon by Stage-2 rate (replace with computed bar schedule + side/anti-crack steel at detailed design); pile-cap self-weight included in pile reactions but excluded from the tie/node ULS (net load) per convention.

**When this script says "infeasible":** the most likely cause is the service pile reaction (incl. moment) exceeding `P_cap` → a 2-pile cap won't do; move to a 3-/4-pile cap (separate script). Increasing spacing reduces the moment share but increases tie force and cap size, so it rarely rescues a 2-pile solution.

**Reinforcement rate caveat:** 110 kg/m³ is a typical pile-cap figure; the governing tie here is only ≈ 27 kg, with the balance being the orthogonal bottom mat, top mat and deep-beam side/anti-crack steel. Tune the rate to your own benchmarks before reporting.
