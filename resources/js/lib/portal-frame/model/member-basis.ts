import { Vector3 } from 'three';
import type { FrameMember, UbSectionDimensions } from '@/types/portal-frame';

const BUILDING_AXIS = new Vector3(0, 1, 0);

export function isUbSection(
    section: FrameMember['section'],
): section is UbSectionDimensions {
    return section.profile === 'ub';
}

export type MemberBasis = {
    start: Vector3;
    end: Vector3;
    memberAxis: Vector3;
    majorAxis: Vector3;
    minorAxis: Vector3;
    lengthM: number;
};

export function memberBasis(member: FrameMember): MemberBasis {
    const start = new Vector3(...member.start);
    const end = new Vector3(...member.end);
    const memberAxis = end.clone().sub(start);
    const lengthM = memberAxis.length();

    if (lengthM === 0) {
        return {
            start,
            end,
            memberAxis: new Vector3(0, 0, 1),
            majorAxis: new Vector3(1, 0, 0),
            minorAxis: new Vector3(0, 1, 0),
            lengthM: 0,
        };
    }

    memberAxis.normalize();

    let majorAxis: Vector3;

    if (member.role === 'column') {
        majorAxis = new Vector3(-start.x, 0, 0);

        if (majorAxis.lengthSq() < 1e-9) {
            majorAxis.set(1, 0, 0);
        } else {
            majorAxis.normalize();
        }
    } else if (member.role === 'gable_column') {
        majorAxis =
            start.y < 1e-6 ? new Vector3(0, 1, 0) : new Vector3(0, -1, 0);
    } else if (member.role === 'purlin' && member.orientation) {
        const { halfSpan, roofPitchDeg } = member.orientation;
        const pitchRadians = (roofPitchDeg * Math.PI) / 180;
        const rise = halfSpan * Math.tan(pitchRadians);
        const side = start.x < 0 ? 'left' : 'right';

        if (side === 'left') {
            majorAxis = new Vector3(-rise, 0, halfSpan);
        } else {
            majorAxis = new Vector3(rise, 0, halfSpan);
        }

        majorAxis.normalize();
    } else if (member.role === 'side_rail') {
        const deltaX = Math.abs(end.x - start.x);
        const deltaY = Math.abs(end.y - start.y);

        if (deltaX > deltaY) {
            majorAxis =
                start.y < 1e-6 ? new Vector3(0, 1, 0) : new Vector3(0, -1, 0);
        } else {
            majorAxis = new Vector3(start.x < 0 ? 1 : -1, 0, 0);
        }
    } else if (
        member.role === 'rafter' ||
        member.role === 'haunch' ||
        member.role === 'tie' ||
        member.role === 'brace'
    ) {
        majorAxis = new Vector3().crossVectors(memberAxis, BUILDING_AXIS);

        if (majorAxis.lengthSq() < 1e-9) {
            majorAxis.set(0, 0, 1);
        } else {
            majorAxis.normalize();
        }

        if (majorAxis.z < 0) {
            majorAxis.negate();
        }
    } else {
        majorAxis = new Vector3(1, 0, 0);
    }

    const minorAxis = new Vector3()
        .crossVectors(memberAxis, majorAxis)
        .normalize();

    return {
        start,
        end,
        memberAxis,
        majorAxis,
        minorAxis,
        lengthM,
    };
}

export function memberLengthM(member: FrameMember): number {
    return memberBasis(member).lengthM;
}
