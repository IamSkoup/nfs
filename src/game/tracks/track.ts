import * as THREE from 'three';

export type RaceMode = 'circuit' | 'sprint' | 'drag';
export interface TrackObstacle { progress: number; lateral: number; radius: number; kind: 'rock' | 'log'; }

const routes: Record<RaceMode, { points: THREE.Vector3[]; closed: boolean; obstacles: TrackObstacle[] }> = {
  circuit: {
    closed: true,
    points: [
      new THREE.Vector3(-105, 0, 5), new THREE.Vector3(-88, 1, -42),
      new THREE.Vector3(-42, 0, -92), new THREE.Vector3(8, 0, -103),
      new THREE.Vector3(72, 0, -83), new THREE.Vector3(108, 0, -34),
      new THREE.Vector3(101, 0, 28), new THREE.Vector3(62, 1, 84),
      new THREE.Vector3(5, 0, 102), new THREE.Vector3(-58, 0, 91),
      new THREE.Vector3(-105, 0, 49), new THREE.Vector3(-116, 0, -3),
    ],
    obstacles: [
      { progress: .10, lateral: -3.7, radius: 2.4, kind: 'rock' },
      { progress: .23, lateral: 3.2, radius: 2.7, kind: 'log' },
      { progress: .37, lateral: -2.8, radius: 2.2, kind: 'rock' },
      { progress: .51, lateral: 4.0, radius: 2.6, kind: 'log' },
      { progress: .67, lateral: -3.4, radius: 2.5, kind: 'rock' },
      { progress: .82, lateral: 3.5, radius: 2.3, kind: 'log' },
    ],
  },
  sprint: {
    closed: false,
    points: [
      new THREE.Vector3(-330, 0, 190), new THREE.Vector3(-275, 0, 128), new THREE.Vector3(-225, 0, 108),
      new THREE.Vector3(-190, 0, 45), new THREE.Vector3(-126, 1, 18), new THREE.Vector3(-103, 0, -40),
      new THREE.Vector3(-52, 0, -82), new THREE.Vector3(8, 0, -63), new THREE.Vector3(38, 0, -8),
      new THREE.Vector3(108, 0, 22), new THREE.Vector3(159, 0, 0), new THREE.Vector3(199, 0, -60),
      new THREE.Vector3(243, 1, -101), new THREE.Vector3(312, 0, -115), new THREE.Vector3(365, 0, -74),
    ],
    obstacles: [
      { progress: .12, lateral: 3.6, radius: 2.5, kind: 'rock' },
      { progress: .25, lateral: -3.1, radius: 2.4, kind: 'log' },
      { progress: .39, lateral: 4.2, radius: 2.6, kind: 'rock' },
      { progress: .53, lateral: -3.6, radius: 2.5, kind: 'log' },
      { progress: .68, lateral: 3.3, radius: 2.7, kind: 'rock' },
      { progress: .82, lateral: -4.1, radius: 2.2, kind: 'log' },
    ],
  },
  drag: {
    closed: false,
    points: [
      new THREE.Vector3(-330, 0, -210), new THREE.Vector3(-245, 0, -211),
      new THREE.Vector3(-160, 0, -209), new THREE.Vector3(-75, 0, -211),
      new THREE.Vector3(10, 0, -209), new THREE.Vector3(95, 0, -211),
      new THREE.Vector3(180, 0, -209), new THREE.Vector3(265, 0, -211),
      new THREE.Vector3(350, 0, -210),
    ],
    obstacles: [],
  },
};

function gravelTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#92774f';
  ctx.fillRect(0, 0, 256, 256);
  let seed = 7331;
  const random = (): number => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 3200; i++) {
    const r = .35 + random() * 2.2;
    ctx.fillStyle = ['#c4a36a', '#654f37', '#e0c28b', '#806846'][i % 4]!;
    ctx.globalAlpha = .12 + random() * .42;
    ctx.beginPath();
    ctx.ellipse(random() * 256, random() * 256, r * 1.8, r, random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 30);
  texture.anisotropy = 8;
  return texture;
}

const gravel = gravelTexture();

export class Track {
  mode: RaceMode = 'circuit';
  curve: THREE.CatmullRomCurve3;
  length: number;
  private closed = true;
  private obstacles: TrackObstacle[] = [];

  constructor(mode: RaceMode = 'circuit') {
    this.curve = new THREE.CatmullRomCurve3(routes.circuit.points, true, 'catmullrom', .22);
    this.length = this.curve.getLength();
    this.setMode(mode);
  }

  setMode(mode: RaceMode): void {
    const route = routes[mode];
    this.mode = mode;
    this.closed = route.closed;
    this.obstacles = route.obstacles;
    this.curve = new THREE.CatmullRomCurve3(route.points, route.closed, 'catmullrom', .28);
    this.length = this.curve.getLength();
  }

  sample(progress: number, lateral = 0, yOffset = 0): THREE.Vector3 {
    const t = this.closed ? ((progress % 1) + 1) % 1 : THREE.MathUtils.clamp(progress, 0, 1);
    const point = this.curve.getPointAt(t);
    const tangent = this.curve.getTangentAt(t).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
    return point.addScaledVector(normal, lateral).add(new THREE.Vector3(0, yOffset, 0));
  }

  tangent(progress: number): THREE.Vector3 {
    const t = this.closed ? ((progress % 1) + 1) % 1 : THREE.MathUtils.clamp(progress, 0, 1);
    return this.curve.getTangentAt(t).normalize();
  }

  obstacleAt(progress: number, lateral: number): TrackObstacle | undefined {
    if (this.mode === 'drag') return undefined;
    const current = this.closed ? ((progress % 1) + 1) % 1 : progress;
    return this.obstacles.find((obstacle) => {
      const raw = Math.abs(obstacle.progress - current);
      const distance = (this.closed ? Math.min(raw, 1 - raw) : raw) * this.length;
      return distance < obstacle.radius + 1.4 && Math.abs(obstacle.lateral - lateral) < obstacle.radius + 1.1;
    });
  }

  buildMesh(): THREE.Group {
    const group = new THREE.Group();
    group.userData.track = true;
    const ribbon = (width: number, y: number, material: THREE.Material, segments = 720): THREE.Mesh => {
      const positions: number[] = [], indices: number[] = [], uvs: number[] = [];
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const center = this.sample(t, 0, y);
        const tangent = this.tangent(t);
        const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
        const left = center.clone().addScaledVector(normal, width / 2);
        const right = center.clone().addScaledVector(normal, -width / 2);
        positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
        uvs.push(0, t * 30, 1, t * 30);
        if (i < segments) {
          const a = i * 2;
          indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.receiveShadow = true;
      return mesh;
    };
    const shoulderMat = new THREE.MeshStandardMaterial({ color: 0xa38a59, roughness: 1 });
    const roadMat = new THREE.MeshStandardMaterial({ map: gravel, color: 0xe3d0a7, roughness: 1 });
    group.add(ribbon(this.mode === 'drag' ? 44 : 31, 0, shoulderMat));
    group.add(ribbon(this.mode === 'drag' ? 38 : 22, .035, roadMat));

    // Wayfinding posts make each curve readable at speed.
    const marker = new THREE.InstancedMesh(new THREE.BoxGeometry(.42, 1.05, .42), new THREE.MeshStandardMaterial({ color: 0xe5cf9b, roughness: .95 }), 180);
    const dummy = new THREE.Object3D();
    let index = 0;
    const count = this.mode === 'drag' ? 90 : 90;
    for (let i = 0; i < count; i++) {
      const t = i / (count - (this.closed ? 0 : 1));
      const tangent = this.tangent(t);
      const sides = this.mode === 'drag' ? [-1, 1] : [-1, 1];
      for (const side of sides) {
        dummy.position.copy(this.sample(t, side * (this.mode === 'drag' ? 23 : 13.1)));
        dummy.position.y = .52;
        dummy.rotation.y = Math.atan2(tangent.x, -tangent.z);
        dummy.updateMatrix();
        marker.setMatrixAt(index++, dummy.matrix);
      }
    }
    marker.castShadow = true;
    marker.receiveShadow = true;
    group.add(marker);

    for (const obstacle of this.obstacles) {
      const p = this.sample(obstacle.progress, obstacle.lateral);
      const object = obstacle.kind === 'rock'
        ? new THREE.Mesh(new THREE.IcosahedronGeometry(obstacle.radius, 1), new THREE.MeshStandardMaterial({ color: 0x76654d, roughness: 1 }))
        : new THREE.Mesh(new THREE.CylinderGeometry(.48, .64, obstacle.radius * 2.6, 18, 3), new THREE.MeshStandardMaterial({ color: 0x63452b, roughness: 1 }));
      object.position.copy(p);
      object.position.y = obstacle.kind === 'rock' ? obstacle.radius * .6 : .55;
      if (obstacle.kind === 'log') {
        const tangent = this.tangent(obstacle.progress);
        object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-tangent.z, 0, tangent.x).normalize());
      } else object.rotation.set(.15, obstacle.progress * 18, .08);
      object.castShadow = true;
      object.receiveShadow = true;
      group.add(object);
    }
    if (this.mode === 'drag') {
      for (const t of [.11, .24, .37, .5, .63, .76, .89]) {
        const line = new THREE.Mesh(new THREE.BoxGeometry(.38, .03, 38), new THREE.MeshStandardMaterial({ color: 0xe7d4a0, roughness: 1 }));
        const p = this.sample(t);
        line.position.set(p.x, .06, p.z);
        line.rotation.y = -Math.atan2(this.tangent(t).x, -this.tangent(t).z);
        group.add(line);
      }
    }
    return group;
  }
}
