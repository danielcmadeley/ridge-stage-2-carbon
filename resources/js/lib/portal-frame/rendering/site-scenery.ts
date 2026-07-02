import {
    BoxGeometry,
    ConeGeometry,
    CylinderGeometry,
    Group,
    InstancedMesh,
    Mesh,
    MeshStandardMaterial,
    Object3D,
    PlaneGeometry,
    RingGeometry,
    SphereGeometry,
} from 'three';
import type { MeshStandardMaterialParameters } from 'three';
import { disposeObject3D } from '@/lib/portal-frame/rendering/three-group';

export type SiteSceneryMetrics = {
    /** Cube‑root characteristic length of the building (max of span, length, apex). */
    size: number;
    /** Building footprint extent along the X axis (span). */
    span: number;
    /** Building footprint extent along the Y axis (building length). */
    buildingLength: number;
    /** Apex height; used to keep props clear of the frame above ground. */
    apexHeight: number;
};

const DIRT_COLOR = '#6b5d4a';
const ASPHALT_COLOR = '#3a3a3e';
const CONE_COLOR = '#f97316';
const CONTAINER_COLORS = ['#b45309', '#1e40af', '#9ca3af'];
const FENCE_COLOR = '#9ca3af';
const CRANE_MAST_COLOR = '#facc15';
const PILE_COLOR = '#4b5563';

function std(
    color: string,
    opts: Partial<MeshStandardMaterialParameters> = {},
): MeshStandardMaterial {
    return new MeshStandardMaterial({
        color,
        roughness: 0.9,
        metalness: 0.1,
        ...opts,
    });
}

function createGroundPlane(metrics: SiteSceneryMetrics): Mesh {
    const extent = metrics.size * 5;
    const geometry = new PlaneGeometry(extent, extent);
    const material = std(ASPHALT_COLOR, { roughness: 1, metalness: 0 });
    const mesh = new Mesh(geometry, material);
    mesh.name = 'site-ground';
    mesh.position.set(0, 0, 0);
    mesh.receiveShadow = true;

    return mesh;
}

function createDirtMound(
    metrics: SiteSceneryMetrics,
    x: number,
    y: number,
): Mesh {
    const radius = metrics.size * 0.35;
    const geometry = new SphereGeometry(radius, 24, 16);
    const material = std(DIRT_COLOR, { roughness: 1, metalness: 0 });
    const mesh = new Mesh(geometry, material);
    mesh.name = 'site-dirt-mound';
    mesh.position.set(x, y, -radius * 0.55);
    mesh.scale.set(1.6, 1.2, 0.45);

    return mesh;
}

function createContainer(
    metrics: SiteSceneryMetrics,
    x: number,
    y: number,
    rotationZ: number,
    colorIndex: number,
): Mesh {
    const scale = metrics.size * 0.06;
    const geometry = new BoxGeometry(6.1 * scale, 2.44 * scale, 2.59 * scale);
    const material = std(
        CONTAINER_COLORS[colorIndex % CONTAINER_COLORS.length],
        {
            roughness: 0.85,
            metalness: 0.25,
        },
    );
    const mesh = new Mesh(geometry, material);
    mesh.name = 'site-container';
    mesh.position.set(x, y, (2.59 * scale) / 2);
    mesh.rotation.z = rotationZ;

    return mesh;
}

function createPortacabin(
    metrics: SiteSceneryMetrics,
    x: number,
    y: number,
): Mesh {
    const scale = metrics.size * 0.07;
    const geometry = new BoxGeometry(6 * scale, 3 * scale, 2.7 * scale);
    const material = std('#e5e7eb', { roughness: 0.7, metalness: 0.2 });
    const mesh = new Mesh(geometry, material);
    mesh.name = 'site-portacabin';
    mesh.position.set(x, y, (2.7 * scale) / 2);

    return mesh;
}

function createTrafficCone(
    metrics: SiteSceneryMetrics,
    x: number,
    y: number,
): Group {
    const group = new Group();
    group.name = 'site-cone';
    const scale = metrics.size * 0.012;

    const coneGeo = new ConeGeometry(0.16 * scale, 0.45 * scale, 16);
    const coneMat = std(CONE_COLOR, { roughness: 0.6, metalness: 0 });
    const cone = new Mesh(coneGeo, coneMat);
    cone.position.set(0, 0, (0.45 * scale) / 2);
    group.add(cone);

    const ringGeo = new RingGeometry(0.18 * scale, 0.22 * scale, 20);
    const ringMat = std(CONE_COLOR, { roughness: 0.6, metalness: 0 });
    const ring = new Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0, 0.005 * scale);
    group.add(ring);

    group.position.set(x, y, 0);

    return group;
}

function createPileBundle(
    metrics: SiteSceneryMetrics,
    x: number,
    y: number,
): Mesh {
    const count = 7;
    const length = metrics.size * 0.35;
    const radius = metrics.size * 0.012;
    const geo = new CylinderGeometry(radius, radius, length, 12);
    const mat = std(PILE_COLOR, { roughness: 0.7, metalness: 0.4 });
    const mesh = new InstancedMesh(geo, mat, count);
    mesh.name = 'site-pile-bundle';

    const positions: [number, number, number][] = [
        [0, 0, radius],
        [2 * radius, 0, radius],
        [-2 * radius, 0, radius],
        [radius, 0, 3 * radius],
        [-radius, 0, 3 * radius],
        [2 * radius, 0, 3 * radius],
        [-2 * radius, 0, 3 * radius],
    ];
    const dummy = new Object3D();
    positions.forEach((pos, i) => {
        dummy.position.set(pos[0], pos[1], pos[2]);
        dummy.rotation.set(Math.PI / 2, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.position.set(x, y, 0);
    mesh.rotation.z = Math.PI / 6;

    return mesh;
}

function createPerimeterFence(metrics: SiteSceneryMetrics): Group {
    const group = new Group();
    group.name = 'site-fence';
    const halfW = metrics.span * 0.9;
    const halfL = metrics.buildingLength * 0.9;
    const height = metrics.size * 0.025;

    const postGeo = new CylinderGeometry(
        0.04 * metrics.size,
        0.04 * metrics.size,
        height,
        8,
    );
    const postMat = std(FENCE_COLOR, { roughness: 0.5, metalness: 0.6 });
    const postsPerSide = 14;
    const totalPosts = postsPerSide * 4;
    const posts = new InstancedMesh(postGeo, postMat, totalPosts);
    const dummy = new Object3D();
    let i = 0;

    for (let side = 0; side < 4; side++) {
        const alongX = side % 2 === 0;
        const sign = side < 2 ? 1 : -1;

        for (let p = 0; p < postsPerSide; p++) {
            const t = (p / (postsPerSide - 1)) * 2 - 1;
            const x = alongX ? t * halfW : sign * halfW;
            const y = alongX ? sign * halfL : t * halfL;
            dummy.position.set(x, y, height / 2);
            dummy.updateMatrix();
            posts.setMatrixAt(i++, dummy.matrix);
        }
    }

    posts.instanceMatrix.needsUpdate = true;
    group.add(posts);

    const meshGeo = new PlaneGeometry(2 * halfW, height * 0.7);
    const meshMat = std(FENCE_COLOR, {
        roughness: 0.6,
        metalness: 0.5,
        transparent: true,
        opacity: 0.18,
        side: 2,
    });
    const north = new Mesh(meshGeo, meshMat);
    north.position.set(0, halfL, height * 0.35);
    north.rotation.x = Math.PI / 2;
    group.add(north);
    const south = new Mesh(meshGeo, meshMat);
    south.position.set(0, -halfL, height * 0.35);
    south.rotation.x = Math.PI / 2;
    group.add(south);

    const meshGeoY = new PlaneGeometry(2 * halfL, height * 0.7);
    const east = new Mesh(meshGeoY, meshMat);
    east.position.set(halfW, 0, height * 0.35);
    east.rotation.x = Math.PI / 2;
    east.rotation.z = Math.PI / 2;
    group.add(east);
    const west = new Mesh(meshGeoY, meshMat);
    west.position.set(-halfW, 0, height * 0.35);
    west.rotation.x = Math.PI / 2;
    west.rotation.z = Math.PI / 2;
    group.add(west);

    return group;
}

function createTowerCrane(
    metrics: SiteSceneryMetrics,
    x: number,
    y: number,
): Group {
    const group = new Group();
    group.name = 'site-crane';
    const s = metrics.size * 0.06;

    const mastGeo = new BoxGeometry(1.6 * s, 1.6 * s, 18 * s);
    const mastMat = std(CRANE_MAST_COLOR, { roughness: 0.5, metalness: 0.7 });
    const mast = new Mesh(mastGeo, mastMat);
    mast.position.set(0, 0, 9 * s);
    group.add(mast);

    const jibGeo = new BoxGeometry(24 * s, 1.2 * s, 1.4 * s);
    const jib = new Mesh(jibGeo, mastMat);
    jib.position.set(11 * s, 0, 18 * s);
    group.add(jib);

    const counterJib = new Mesh(
        new BoxGeometry(9 * s, 1.2 * s, 1.4 * s),
        mastMat,
    );
    counterJib.position.set(-4 * s, 0, 18 * s);
    group.add(counterJib);

    const counterWeight = new Mesh(
        new BoxGeometry(3 * s, 2 * s, 1.8 * s),
        std('#374151', { roughness: 0.6, metalness: 0.5 }),
    );
    counterWeight.position.set(-7.5 * s, 0, 18 * s);
    group.add(counterWeight);

    const cableGeo = new CylinderGeometry(0.05 * s, 0.05 * s, 10 * s, 6);
    const cableMat = std('#1f2937', { roughness: 0.4, metalness: 0.8 });
    const cable = new Mesh(cableGeo, cableMat);
    cable.position.set(20 * s, 0, 13 * s);
    group.add(cable);

    const hook = new Mesh(new BoxGeometry(0.6 * s, 0.6 * s, 0.6 * s), cableMat);
    hook.position.set(20 * s, 0, 8 * s);
    group.add(hook);

    group.position.set(x, y, 0);
    group.rotation.z = Math.PI / 7;

    return group;
}

function createStealOffcuts(
    metrics: SiteSceneryMetrics,
    x: number,
    y: number,
): Group {
    const group = new Group();
    group.name = 'site-steel-offcuts';
    const s = metrics.size * 0.05;

    for (let stack = 0; stack < 3; stack++) {
        const beam = new Mesh(
            new BoxGeometry(3 * s, 1.2 * s, 0.4 * s),
            std('#b45309', { roughness: 0.7, metalness: 0.4 }),
        );
        beam.position.set(stack * 3.5 * s, 0, 0.2 * s + stack * 0.45 * s);
        beam.rotation.z = Math.PI / 2;
        group.add(beam);
    }

    group.position.set(x, y, 0);
    group.rotation.z = Math.PI / 8;

    return group;
}

function createSceneryRoot(metrics: SiteSceneryMetrics): Group {
    const group = new Group();
    group.position.set(0, -metrics.buildingLength / 2, 0);

    return group;
}

export function createSiteGroundGroup(metrics: SiteSceneryMetrics): Group {
    const group = createSceneryRoot(metrics);
    group.name = 'site-ground-group';
    group.add(createGroundPlane(metrics));

    return group;
}

export function createSitePropsGroup(metrics: SiteSceneryMetrics): Group {
    const group = createSceneryRoot(metrics);
    group.name = 'site-props-group';
    group.add(createPerimeterFence(metrics));

    const offX = metrics.span * 0.85;
    const offY = metrics.buildingLength * 0.35;
    group.add(createDirtMound(metrics, offX * 1.1, offY * 0.6));
    group.add(createContainer(metrics, -offX, offY, Math.PI / 12, 0));
    group.add(
        createContainer(
            metrics,
            -offX,
            offY + metrics.size * 0.18,
            -Math.PI / 12,
            1,
        ),
    );
    group.add(createContainer(metrics, offX, -offY * 1.2, Math.PI / 6, 2));

    group.add(createPortacabin(metrics, -offX, -offY * 0.5));
    group.add(createPileBundle(metrics, offX * 0.7, -offY));
    group.add(createStealOffcuts(metrics, -offX * 0.7, offY * 1.1));
    group.add(createTowerCrane(metrics, 0, offY * 1.4));

    for (let i = 0; i < 6; i++) {
        const t = i / 5;
        const cx = -metrics.span * 0.5 + t * metrics.span;
        group.add(
            createTrafficCone(metrics, cx, metrics.buildingLength * 0.95),
        );
    }

    return group;
}

export function createSiteSceneryGroup(metrics: SiteSceneryMetrics): Group {
    const group = createSceneryRoot(metrics);
    group.name = 'site-scenery';
    group.add(createSiteGroundGroup(metrics));
    group.add(createSitePropsGroup(metrics));

    return group;
}

function replaceGroup(current: Group | null, build: () => Group): Group {
    if (current) {
        disposeObject3D(current);
    }

    return build();
}

export function replaceSiteSceneryGroup(
    current: Group | null,
    metrics: SiteSceneryMetrics,
): Group {
    return replaceGroup(current, () => createSiteSceneryGroup(metrics));
}

export function replaceSiteGroundGroup(
    current: Group | null,
    metrics: SiteSceneryMetrics,
): Group {
    return replaceGroup(current, () => createSiteGroundGroup(metrics));
}

export function replaceSitePropsGroup(
    current: Group | null,
    metrics: SiteSceneryMetrics,
): Group {
    return replaceGroup(current, () => createSitePropsGroup(metrics));
}

export {
    createContainer,
    createDirtMound,
    createGroundPlane,
    createPerimeterFence,
    createPileBundle,
    createPortacabin,
    createStealOffcuts,
    createTowerCrane,
    createTrafficCone,
};
