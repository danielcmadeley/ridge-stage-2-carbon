import {
    BufferGeometry,
    CanvasTexture,
    ConeGeometry,
    Float32BufferAttribute,
    Group,
    LineBasicMaterial,
    LineSegments,
    Mesh,
    MeshBasicMaterial,
    Sprite,
    SpriteMaterial,
} from 'three';
import { frameIndexFromMemberId } from '@/lib/portal-frame/analysis/force-diagram-3d';
import {
    analysisLineLoadKnMForFrame,
    analyzePortalFrame,
} from '@/lib/portal-frame/analysis/frame-analysis';
import type {
    AnalyticalLoadCase,
    SupportReaction,
} from '@/lib/portal-frame/analysis/frame-analysis';
import type { BuiltPortalFrame } from '@/lib/portal-frame/model/geometry-builder';
import type { FrameMember, PortalFrameDesign } from '@/types/portal-frame';
import {
    isGableEndFrame,
    representativeInteriorFrameIndex,
} from '@/types/portal-frame';

const SUPPORT_SYMBOL_COLOR = '#374151';
const PIN_CONE_RADIUS_M = 0.4;
const PIN_CONE_HEIGHT_M = 0.7;
const GROUND_HALF_WIDTH_M = 0.8;
const GROUND_HATCH_COUNT = 5;
const GROUND_HATCH_LENGTH_M = 0.3;
const REACTION_LABEL_CENTER_Z_M = -1.8;
const REACTION_LABEL_HEIGHT_M = 1.1;

type FrameSupportReactions = {
    left: SupportReaction;
    right: SupportReaction;
};

type SupportReactionsByFrameKind = {
    gable: FrameSupportReactions;
    interior: FrameSupportReactions;
};

function memberBaseAtGround(
    member: FrameMember,
): [number, number, number] | null {
    if (Math.abs(member.start[2]) < 1e-4) {
        return member.start;
    }

    if (Math.abs(member.end[2]) < 1e-4) {
        return member.end;
    }

    return null;
}

/** Cone with its apex touching the column base node, pointing up. */
function createPinConeMesh(base: [number, number, number]): Mesh {
    const geometry = new ConeGeometry(PIN_CONE_RADIUS_M, PIN_CONE_HEIGHT_M, 24);
    const material = new MeshBasicMaterial({ color: SUPPORT_SYMBOL_COLOR });
    const mesh = new Mesh(geometry, material);

    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(base[0], base[1], base[2] - PIN_CONE_HEIGHT_M / 2);

    return mesh;
}

/** Ground line with 45° hatching below it, drawn in the frame (x-z) plane. */
function createGroundHatchLines(base: [number, number, number]): LineSegments {
    const groundZ = -PIN_CONE_HEIGHT_M;
    const positions: number[] = [
        -GROUND_HALF_WIDTH_M,
        0,
        groundZ,
        GROUND_HALF_WIDTH_M,
        0,
        groundZ,
    ];

    for (let index = 0; index < GROUND_HATCH_COUNT; index++) {
        const x =
            -GROUND_HALF_WIDTH_M +
            ((index + 1) * (2 * GROUND_HALF_WIDTH_M)) /
                (GROUND_HATCH_COUNT + 1);
        const tick = GROUND_HATCH_LENGTH_M * Math.SQRT1_2;
        positions.push(x, 0, groundZ, x - tick, 0, groundZ - tick);
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));

    const lines = new LineSegments(
        geometry,
        new LineBasicMaterial({ color: SUPPORT_SYMBOL_COLOR }),
    );
    lines.position.set(base[0], base[1], base[2]);

    return lines;
}

export function createPinnedSupportSymbol(
    base: [number, number, number],
): Group {
    const group = new Group();
    group.add(createPinConeMesh(base));
    group.add(createGroundHatchLines(base));

    return group;
}

export function reactionLabelLines(
    reaction: SupportReaction,
): [string, string] {
    return [
        `H ${reaction.fxKn.toFixed(1)} kN`,
        `V ${reaction.fzKn.toFixed(1)} kN`,
    ];
}

function createReactionLabelSprite(reaction: SupportReaction): Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
        throw new Error('Unable to create support reaction label canvas.');
    }

    const lines = reactionLabelLines(reaction);
    const fontSize = 52;
    const lineSpacing = 14;
    const paddingX = 32;
    const paddingY = 20;
    context.font = `600 ${fontSize}px system-ui, sans-serif`;
    const textWidth = Math.max(
        ...lines.map((line) => context.measureText(line).width),
    );
    canvas.width = Math.ceil(textWidth + paddingX * 2);
    canvas.height = fontSize * lines.length + lineSpacing + paddingY * 2;

    context.font = `600 ${fontSize}px system-ui, sans-serif`;
    context.fillStyle = '#1f2937';
    context.beginPath();
    context.roundRect(0, 0, canvas.width, canvas.height, 16);
    context.fill();
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    lines.forEach((line, index) => {
        const lineCenterY =
            paddingY + fontSize / 2 + index * (fontSize + lineSpacing);
        context.fillText(line, canvas.width / 2, lineCenterY + 1);
    });

    const texture = new CanvasTexture(canvas);
    texture.needsUpdate = true;

    const sprite = new Sprite(
        new SpriteMaterial({
            map: texture,
            depthTest: false,
            depthWrite: false,
        }),
    );
    const aspect = canvas.width / canvas.height;
    sprite.scale.set(
        REACTION_LABEL_HEIGHT_M * aspect,
        REACTION_LABEL_HEIGHT_M,
        1,
    );

    return sprite;
}

function computeSupportReactions(
    built: BuiltPortalFrame,
    design: PortalFrameDesign,
    loadCase: AnalyticalLoadCase,
): SupportReactionsByFrameKind | null {
    const reactionsForFrame = (frameIndex: number): FrameSupportReactions =>
        analyzePortalFrame(built, {
            frameIndex,
            lineLoadKnM: analysisLineLoadKnMForFrame(
                design,
                frameIndex,
                loadCase,
            ),
        }).reactions;

    try {
        return {
            gable: reactionsForFrame(0),
            interior: reactionsForFrame(
                representativeInteriorFrameIndex(design),
            ),
        };
    } catch {
        return null;
    }
}

function reactionForColumnBase(
    member: FrameMember,
    base: [number, number, number],
    design: PortalFrameDesign,
    reactions: SupportReactionsByFrameKind,
): SupportReaction | null {
    const frameIndex = frameIndexFromMemberId(member.id);

    if (frameIndex === null) {
        return null;
    }

    const frameReactions = isGableEndFrame(frameIndex, design)
        ? reactions.gable
        : reactions.interior;

    return base[0] < 0 ? frameReactions.left : frameReactions.right;
}

/**
 * Pinned support symbols at every column base plus per-frame base reaction
 * labels at the main column supports. Gable end frames carry half the load of
 * interior frames, so their labels use the gable-frame analysis.
 */
export function createSupportAnnotationsGroup(
    members: FrameMember[],
    built: BuiltPortalFrame,
    design: PortalFrameDesign,
    loadCase: AnalyticalLoadCase = 'unfactored',
): Group {
    const group = new Group();
    const supportedColumns = members
        .map((member) => ({ member, base: memberBaseAtGround(member) }))
        .filter(
            (
                entry,
            ): entry is {
                member: FrameMember;
                base: [number, number, number];
            } =>
                entry.base !== null &&
                (entry.member.role === 'column' ||
                    entry.member.role === 'gable_column'),
        );

    for (const { base } of supportedColumns) {
        group.add(createPinnedSupportSymbol(base));
    }

    const reactions = computeSupportReactions(built, design, loadCase);

    if (!reactions) {
        return group;
    }

    for (const { member, base } of supportedColumns) {
        if (member.role !== 'column') {
            continue;
        }

        const reaction = reactionForColumnBase(member, base, design, reactions);

        if (!reaction) {
            continue;
        }

        try {
            const sprite = createReactionLabelSprite(reaction);
            sprite.position.set(base[0], base[1], REACTION_LABEL_CENTER_Z_M);
            group.add(sprite);
        } catch {
            // Labels need a browser canvas; never fail the analytical preview.
        }
    }

    return group;
}
