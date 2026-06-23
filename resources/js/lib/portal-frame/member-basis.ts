import { Vector3 } from 'three';
import type { FrameMember } from '@/types/portal-frame';

const BUILDING_AXIS = new Vector3(0, 1, 0);

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
    } else if (member.role === 'rafter' || member.role === 'haunch') {
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
