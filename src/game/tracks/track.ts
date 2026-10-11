import * as THREE from 'three';

export class Track {
  readonly curve: THREE.CatmullRomCurve3;
  readonly length: number;

  constructor() {
    this.curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-105, 0, 5), new THREE.Vector3(-80, 1, -72),
      new THREE.Vector3(-8, 0, -100), new THREE.Vector3(76, 0, -73),
      new THREE.Vector3(108, 0, -5), new THREE.Vector3(73, 1, 70),
      new THREE.Vector3(0, 0, 104), new THREE.Vector3(-82, 0, 73),
    ], true, 'catmullrom', 0.35);
    this.length = this.curve.getLength();
  }

  sample(progress: number, lateral = 0, yOffset = 0): THREE.Vector3 {
    const t = ((progress % 1) + 1) % 1;
    const point = this.curve.getPointAt(t);
    const tangent = this.curve.getTangentAt(t).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
    return point.addScaledVector(normal, lateral).add(new THREE.Vector3(0, yOffset, 0));
  }

  tangent(progress: number): THREE.Vector3 {
    return this.curve.getTangentAt(((progress % 1) + 1) % 1).normalize();
  }

  buildMesh(): THREE.Group {
    const group = new THREE.Group();
    const ribbon = (width: number, y: number, material: THREE.Material, segments = 720): THREE.Mesh => {
      const positions: number[] = [];
      const indices: number[] = [];
      const uvs: number[] = [];
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const center = this.sample(t, 0, y);
        const tangent = this.tangent(t);
        const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
        const left = center.clone().addScaledVector(normal, width / 2);
        const right = center.clone().addScaledVector(normal, -width / 2);
        positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
        uvs.push(0, t * 70, 1, t * 70);
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
    group.add(ribbon(30, .015, new THREE.MeshStandardMaterial({ color: 0xa28c55, roughness: 1 })));
    group.add(ribbon(22, .045, new THREE.MeshStandardMaterial({ color: 0x795338, roughness: 1 })));
    group.add(ribbon(1.2, .07, new THREE.MeshStandardMaterial({ color: 0xc2a268, roughness: 1 }), 320));

    const dummy = new THREE.Object3D();
    const marker = new THREE.InstancedMesh(new THREE.BoxGeometry(.52, 1.15, .52), new THREE.MeshStandardMaterial({ color: 0xe0c080, roughness: .9 }), 160);
    let index = 0;
    for (let i = 0; i < 80; i++) {
      const p = i / 80;
      const tangent = this.tangent(p);
      for (const side of [-1, 1]) {
        dummy.position.copy(this.sample(p, side * 12.3));
        dummy.position.y = .57;
        dummy.rotation.y = Math.atan2(tangent.x, -tangent.z);
        dummy.updateMatrix();
        marker.setMatrixAt(index++, dummy.matrix);
      }
    }
    marker.castShadow = true;
    marker.receiveShadow = true;
    group.add(marker);
    return group;
  }
}
