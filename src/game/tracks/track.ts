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
    const points = this.curve.getPoints(360);
    const road = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 720, 11, 6, true),
      new THREE.MeshStandardMaterial({ color: 0x8d6541, roughness: 1 }),
    );
    road.position.y = 0.12;
    road.receiveShadow = true;
    group.add(road);
    const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0xd8b46b, roughness: 0.9 });
    for (let i = 0; i < 90; i++) {
      const p = i / 90;
      for (const side of [-1, 1]) {
        const marker = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 0.8), edgeMaterial);
        marker.position.copy(this.sample(p, side * 12.4));
        marker.position.y = 0.9;
        marker.rotation.y = -this.tangent(p).x * 0.4;
        group.add(marker);
      }
    }
    return group;
  }
}
