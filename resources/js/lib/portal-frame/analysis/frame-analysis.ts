import type { BuiltPortalFrame } from '@/lib/portal-frame/model/geometry-builder';
import { isUbSection } from '@/lib/portal-frame/model/member-basis';
import type {
    FrameMember,
    PortalFrameDesign,
    UbSectionDimensions,
} from '@/types/portal-frame';
import {
    factoredRafterLineLoadKnMForFrame,
    rafterLineLoadKnMForFrame,
    representativeInteriorFrameIndex,
} from '@/types/portal-frame';

/** Steel Young's modulus (kN/m²). */
const E_STEEL_KN_M2 = 210e6;

const STATION_COUNT = 20;

export type MemberAnalysisResult = {
    id: string;
    role: 'column' | 'rafter';
    start: [number, number];
    end: [number, number];
    stationsM: number[];
    shearKn: number[];
    momentKnm: number[];
    /** Internal axial force (kN), tension positive, compression negative. */
    axialKn: number[];
};

export type SupportReaction = {
    fxKn: number;
    fzKn: number;
    momentKnm: number;
};

export type FrameAnalysisResult = {
    members: MemberAnalysisResult[];
    reactions: {
        left: SupportReaction;
        right: SupportReaction;
    };
    /** Horizontal displacement at apex (m). */
    apexHorizontalDisplacementM: number;
    /** Vertical displacement at apex (m). */
    apexVerticalDisplacementM: number;
};

export type FrameAnalysisOptions = {
    frameIndex?: number;
    lineLoadKnM?: number;
};

/** Load case for analytical results: characteristic or ULS factored. */
export type AnalyticalLoadCase = 'unfactored' | 'factored';

/** Per-frame rafter line load for the requested load case, kN/m. */
export function analysisLineLoadKnMForFrame(
    design: PortalFrameDesign,
    frameIndex: number,
    loadCase: AnalyticalLoadCase,
): number {
    return loadCase === 'factored'
        ? factoredRafterLineLoadKnMForFrame(design, frameIndex)
        : rafterLineLoadKnMForFrame(design, frameIndex);
}

type Node2D = {
    id: number;
    x: number;
    z: number;
};

type ElementDefinition = {
    memberId: string;
    role: 'column' | 'rafter';
    nodeI: number;
    nodeJ: number;
    section: UbSectionDimensions;
    localTransverseLoadKnM: number;
    localAxialLoadKnM: number;
};

function sectionAreaM2(section: UbSectionDimensions): number {
    return section.areaCm2 * 1e-4;
}

function sectionInertiaM4(section: UbSectionDimensions): number {
    return section.iyCm4 * 1e-8;
}

function multiplyMatrixVector(matrix: number[][], vector: number[]): number[] {
    return matrix.map((row) =>
        row.reduce((sum, value, column) => sum + value * vector[column], 0),
    );
}

function multiplyMatrices(a: number[][], b: number[][]): number[][] {
    const rows = a.length;
    const cols = b[0].length;
    const inner = b.length;
    const result = Array.from({ length: rows }, () =>
        Array<number>(cols).fill(0),
    );

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            let sum = 0;

            for (let index = 0; index < inner; index++) {
                sum += a[row][index] * b[index][col];
            }

            result[row][col] = sum;
        }
    }

    return result;
}

function transposeMatrix(matrix: number[][]): number[][] {
    return matrix[0].map((_, column) => matrix.map((row) => row[column]));
}

function solveLinearSystem(matrix: number[][], load: number[]): number[] {
    const size = matrix.length;
    const augmented = matrix.map((row, rowIndex) => [...row, load[rowIndex]]);

    for (let pivot = 0; pivot < size; pivot++) {
        let maxRow = pivot;

        for (let row = pivot + 1; row < size; row++) {
            if (
                Math.abs(augmented[row][pivot]) >
                Math.abs(augmented[maxRow][pivot])
            ) {
                maxRow = row;
            }
        }

        [augmented[pivot], augmented[maxRow]] = [
            augmented[maxRow],
            augmented[pivot],
        ];

        const pivotValue = augmented[pivot][pivot];

        if (Math.abs(pivotValue) < 1e-12) {
            throw new Error(
                'Singular stiffness matrix during portal frame analysis.',
            );
        }

        for (let row = pivot + 1; row < size; row++) {
            const factor = augmented[row][pivot] / pivotValue;

            for (let col = pivot; col <= size; col++) {
                augmented[row][col] -= factor * augmented[pivot][col];
            }
        }
    }

    const solution = Array<number>(size).fill(0);

    for (let row = size - 1; row >= 0; row--) {
        let sum = augmented[row][size];

        for (let col = row + 1; col < size; col++) {
            sum -= augmented[row][col] * solution[col];
        }

        solution[row] = sum / augmented[row][row];
    }

    return solution;
}

function planeFrameLocalStiffness(
    elasticModulus: number,
    area: number,
    inertia: number,
    length: number,
): number[][] {
    const axial = (elasticModulus * area) / length;
    const bendingL3 = (elasticModulus * inertia) / length ** 3;
    const bendingL2 = (elasticModulus * inertia) / length ** 2;
    const bendingL = (elasticModulus * inertia) / length;

    return [
        [axial, 0, 0, -axial, 0, 0],
        [0, 12 * bendingL3, 6 * bendingL2, 0, -12 * bendingL3, 6 * bendingL2],
        [0, 6 * bendingL2, 4 * bendingL, 0, -6 * bendingL2, 2 * bendingL],
        [-axial, 0, 0, axial, 0, 0],
        [0, -12 * bendingL3, -6 * bendingL2, 0, 12 * bendingL3, -6 * bendingL2],
        [0, 6 * bendingL2, 2 * bendingL, 0, -6 * bendingL2, 4 * bendingL],
    ];
}

function transformationMatrix(
    directionCosineX: number,
    directionCosineZ: number,
): number[][] {
    const c = directionCosineX;
    const s = directionCosineZ;

    return [
        [c, s, 0, 0, 0, 0],
        [-s, c, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 0],
        [0, 0, 0, c, s, 0],
        [0, 0, 0, -s, c, 0],
        [0, 0, 0, 0, 0, 1],
    ];
}

/**
 * Equivalent nodal load vector for a member under uniform local loads.
 * These point in the same sense as the applied load (downward gravity gives
 * downward nodal forces). The true fixed-end member forces are the negative
 * of this vector.
 */
function equivalentNodalLoadVector(
    length: number,
    localTransverseLoad: number,
    localAxialLoad: number,
): number[] {
    return [
        (localAxialLoad * length) / 2,
        (localTransverseLoad * length) / 2,
        (localTransverseLoad * length ** 2) / 12,
        (localAxialLoad * length) / 2,
        (localTransverseLoad * length) / 2,
        (-localTransverseLoad * length ** 2) / 12,
    ];
}

function elementGeometry(
    nodeI: Node2D,
    nodeJ: Node2D,
): {
    length: number;
    directionCosineX: number;
    directionCosineZ: number;
} {
    const dx = nodeJ.x - nodeI.x;
    const dz = nodeJ.z - nodeI.z;
    const length = Math.hypot(dx, dz);

    if (length < 1e-9) {
        throw new Error('Zero-length member in portal frame analysis.');
    }

    return {
        length,
        directionCosineX: dx / length,
        directionCosineZ: dz / length,
    };
}

function dofIndex(nodeId: number, localDof: number): number {
    return nodeId * 3 + localDof;
}

function assembleGlobalStiffness(
    nodeCount: number,
    elements: ElementDefinition[],
    nodes: Node2D[],
): number[][] {
    const dofCount = nodeCount * 3;
    const stiffness = Array.from({ length: dofCount }, () =>
        Array<number>(dofCount).fill(0),
    );

    for (const element of elements) {
        const nodeI = nodes[element.nodeI];
        const nodeJ = nodes[element.nodeJ];
        const geometry = elementGeometry(nodeI, nodeJ);
        const area = sectionAreaM2(element.section);
        const inertia = sectionInertiaM4(element.section);
        const localStiffness = planeFrameLocalStiffness(
            E_STEEL_KN_M2,
            area,
            inertia,
            geometry.length,
        );
        const transform = transformationMatrix(
            geometry.directionCosineX,
            geometry.directionCosineZ,
        );
        const transformTranspose = transposeMatrix(transform);
        const globalElementStiffness = multiplyMatrices(
            multiplyMatrices(transformTranspose, localStiffness),
            transform,
        );

        const dofMap = [
            dofIndex(element.nodeI, 0),
            dofIndex(element.nodeI, 1),
            dofIndex(element.nodeI, 2),
            dofIndex(element.nodeJ, 0),
            dofIndex(element.nodeJ, 1),
            dofIndex(element.nodeJ, 2),
        ];

        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 6; col++) {
                stiffness[dofMap[row]][dofMap[col]] +=
                    globalElementStiffness[row][col];
            }
        }
    }

    return stiffness;
}

function assembleLoadVector(
    nodeCount: number,
    elements: ElementDefinition[],
    nodes: Node2D[],
    verticalLoadKnM: number,
): number[] {
    const dofCount = nodeCount * 3;
    const load = Array<number>(dofCount).fill(0);

    for (const element of elements) {
        const nodeI = nodes[element.nodeI];
        const nodeJ = nodes[element.nodeJ];
        const geometry = elementGeometry(nodeI, nodeJ);
        const c = geometry.directionCosineX;
        const s = geometry.directionCosineZ;

        if (element.role === 'rafter') {
            const localTransverseLoad = -verticalLoadKnM * c;
            const localAxialLoad = -verticalLoadKnM * s;
            const equivalentNodalLoad = equivalentNodalLoadVector(
                geometry.length,
                localTransverseLoad,
                localAxialLoad,
            );
            const transform = transformationMatrix(c, s);
            const transformTranspose = transposeMatrix(transform);
            const globalEquivalentNodalLoad = multiplyMatrixVector(
                transformTranspose,
                equivalentNodalLoad,
            );

            const dofMap = [
                dofIndex(element.nodeI, 0),
                dofIndex(element.nodeI, 1),
                dofIndex(element.nodeI, 2),
                dofIndex(element.nodeJ, 0),
                dofIndex(element.nodeJ, 1),
                dofIndex(element.nodeJ, 2),
            ];

            for (let index = 0; index < 6; index++) {
                load[dofMap[index]] += globalEquivalentNodalLoad[index];
            }

            element.localTransverseLoadKnM = localTransverseLoad;
            element.localAxialLoadKnM = localAxialLoad;
        }
    }

    return load;
}

function applyBoundaryConditions(
    stiffness: number[][],
    load: number[],
    fixedDofs: number[],
): { reducedStiffness: number[][]; reducedLoad: number[]; freeDofs: number[] } {
    const dofCount = stiffness.length;
    const fixedSet = new Set(fixedDofs);
    const freeDofs = Array.from(
        { length: dofCount },
        (_, index) => index,
    ).filter((index) => !fixedSet.has(index));
    const reducedStiffness = freeDofs.map((rowDof) =>
        freeDofs.map((columnDof) => stiffness[rowDof][columnDof]),
    );
    const reducedLoad = freeDofs.map((dof) => load[dof]);

    return { reducedStiffness, reducedLoad, freeDofs };
}

function expandDisplacements(
    freeDofs: number[],
    solution: number[],
    dofCount: number,
): number[] {
    const displacements = Array<number>(dofCount).fill(0);

    freeDofs.forEach((dof, index) => {
        displacements[dof] = solution[index];
    });

    return displacements;
}

function sampleMemberForces(
    element: ElementDefinition,
    nodes: Node2D[],
    displacements: number[],
): MemberAnalysisResult {
    const nodeI = nodes[element.nodeI];
    const nodeJ = nodes[element.nodeJ];
    const geometry = elementGeometry(nodeI, nodeJ);
    const area = sectionAreaM2(element.section);
    const inertia = sectionInertiaM4(element.section);
    const localStiffness = planeFrameLocalStiffness(
        E_STEEL_KN_M2,
        area,
        inertia,
        geometry.length,
    );
    const transform = transformationMatrix(
        geometry.directionCosineX,
        geometry.directionCosineZ,
    );
    const dofMap = [
        dofIndex(element.nodeI, 0),
        dofIndex(element.nodeI, 1),
        dofIndex(element.nodeI, 2),
        dofIndex(element.nodeJ, 0),
        dofIndex(element.nodeJ, 1),
        dofIndex(element.nodeJ, 2),
    ];
    const globalDisplacements = dofMap.map((dof) => displacements[dof]);
    const localDisplacements = multiplyMatrixVector(
        transform,
        globalDisplacements,
    );
    // True fixed-end member forces are the negative of the equivalent nodal load.
    const fixedEndForces = equivalentNodalLoadVector(
        geometry.length,
        element.localTransverseLoadKnM,
        element.localAxialLoadKnM,
    ).map((value) => -value);
    const localEndForces = localStiffness.map(
        (row, rowIndex) =>
            row.reduce(
                (sum, value, column) =>
                    sum + value * localDisplacements[column],
                0,
            ) + fixedEndForces[rowIndex],
    );

    const axialAtI = localEndForces[0];
    const shearAtI = localEndForces[1];
    // The internal bending moment at the i-end is the negative of the element's
    // nodal end moment. Integrating shear and distributed load from this baseline
    // then recovers the moment diagram (e.g. small sagging moment at the apex,
    // peak hogging at the eaves), rather than diverging at the far end.
    const momentAtI = -localEndForces[2];
    const transverseLoad = element.localTransverseLoadKnM;
    const axialLoad = element.localAxialLoadKnM;
    const stationsM: number[] = [];
    const shearKn: number[] = [];
    const momentKnm: number[] = [];
    const axialKn: number[] = [];

    for (let station = 0; station <= STATION_COUNT; station++) {
        const x = (geometry.length * station) / STATION_COUNT;
        stationsM.push(x);
        shearKn.push(shearAtI + transverseLoad * x);
        momentKnm.push(
            momentAtI + shearAtI * x + (transverseLoad * x ** 2) / 2,
        );
        axialKn.push(-(axialAtI + axialLoad * x));
    }

    return {
        id: element.memberId,
        role: element.role,
        start: [nodeI.x, nodeI.z],
        end: [nodeJ.x, nodeJ.z],
        stationsM,
        shearKn,
        momentKnm,
        axialKn,
    };
}

function buildFrameModel(members: FrameMember[]): {
    nodes: Node2D[];
    elements: ElementDefinition[];
} {
    const nodes: Node2D[] = [];
    const nodeKey = (x: number, z: number): string =>
        `${x.toFixed(4)}:${z.toFixed(4)}`;

    const addNode = (x: number, z: number): number => {
        const key = nodeKey(x, z);
        const existing = nodes.find((node) => nodeKey(node.x, node.z) === key);

        if (existing) {
            return existing.id;
        }

        const id = nodes.length;
        nodes.push({ id, x, z });

        return id;
    };

    const elements: ElementDefinition[] = [];

    for (const member of members) {
        if (member.role !== 'column' && member.role !== 'rafter') {
            continue;
        }

        if (!isUbSection(member.section)) {
            throw new Error(
                `Frame analysis requires UB sections; ${member.id} has a ${member.section.profile} section.`,
            );
        }

        const nodeI = addNode(member.start[0], member.start[2]);
        const nodeJ = addNode(member.end[0], member.end[2]);

        elements.push({
            memberId: member.id,
            role: member.role,
            nodeI,
            nodeJ,
            section: member.section,
            localTransverseLoadKnM: 0,
            localAxialLoadKnM: 0,
        });
    }

    return { nodes, elements };
}

function extractFrameMembers(
    built: BuiltPortalFrame,
    frameIndex: number,
): FrameMember[] {
    const prefix = `frame-${frameIndex}-`;

    return built.members.filter(
        (member) =>
            member.id.startsWith(prefix) &&
            (member.role === 'column' || member.role === 'rafter'),
    );
}

function findBaseNodeIndices(nodes: Node2D[]): { left: number; right: number } {
    const baseNodes = nodes.filter((node) => Math.abs(node.z) < 1e-4);

    if (baseNodes.length < 2) {
        throw new Error('Portal frame base nodes not found for analysis.');
    }

    const sorted = [...baseNodes].sort((a, b) => a.x - b.x);

    return {
        left: sorted[0].id,
        right: sorted[sorted.length - 1].id,
    };
}

export function analyzePortalFrame(
    built: BuiltPortalFrame,
    options: FrameAnalysisOptions = {},
): FrameAnalysisResult {
    const frameIndex = options.frameIndex ?? 0;
    const lineLoadKnM = options.lineLoadKnM ?? built.rafterLineLoadKnM;
    const members = extractFrameMembers(built, frameIndex);
    const { nodes, elements } = buildFrameModel(members);
    const stiffness = assembleGlobalStiffness(nodes.length, elements, nodes);
    const load = assembleLoadVector(nodes.length, elements, nodes, lineLoadKnM);

    const { left: leftBaseIndex, right: rightBaseIndex } =
        findBaseNodeIndices(nodes);

    const fixedDofs = [
        dofIndex(leftBaseIndex, 0),
        dofIndex(leftBaseIndex, 1),
        dofIndex(rightBaseIndex, 0),
        dofIndex(rightBaseIndex, 1),
    ];

    const { reducedStiffness, reducedLoad, freeDofs } = applyBoundaryConditions(
        stiffness,
        load,
        fixedDofs,
    );
    const freeDisplacements = solveLinearSystem(reducedStiffness, reducedLoad);
    const displacements = expandDisplacements(
        freeDofs,
        freeDisplacements,
        nodes.length * 3,
    );
    const reactionVector = multiplyMatrixVector(stiffness, displacements).map(
        (value, index) => value - load[index],
    );

    const memberResults = elements.map((element) =>
        sampleMemberForces(element, nodes, displacements),
    );

    const leftReaction: SupportReaction = {
        fxKn: reactionVector[dofIndex(leftBaseIndex, 0)],
        fzKn: reactionVector[dofIndex(leftBaseIndex, 1)],
        momentKnm: reactionVector[dofIndex(leftBaseIndex, 2)],
    };
    const rightReaction: SupportReaction = {
        fxKn: reactionVector[dofIndex(rightBaseIndex, 0)],
        fzKn: reactionVector[dofIndex(rightBaseIndex, 1)],
        momentKnm: reactionVector[dofIndex(rightBaseIndex, 2)],
    };

    const apexNodeIndex = nodes.find(
        (node) => Math.abs(node.x) < 1e-4 && node.z > 1,
    )?.id;
    const apexHorizontalDisplacementM =
        apexNodeIndex === undefined
            ? 0
            : displacements[dofIndex(apexNodeIndex, 0)];
    const apexVerticalDisplacementM =
        apexNodeIndex === undefined
            ? 0
            : displacements[dofIndex(apexNodeIndex, 1)];

    return {
        members: memberResults,
        reactions: {
            left: leftReaction,
            right: rightReaction,
        },
        apexHorizontalDisplacementM,
        apexVerticalDisplacementM,
    };
}

/** Analyse the governing interior frame for reactions and foundation sizing. */
export function analyzeGoverningPortalFrame(
    built: BuiltPortalFrame,
    design: PortalFrameDesign,
    loadCase: AnalyticalLoadCase = 'unfactored',
): FrameAnalysisResult {
    const frameIndex = representativeInteriorFrameIndex(design);

    return analyzePortalFrame(built, {
        frameIndex,
        lineLoadKnM: analysisLineLoadKnMForFrame(design, frameIndex, loadCase),
    });
}
