import * as THREE from 'three';

const mat = (color: number, roughness = 0.9) => new THREE.MeshStandardMaterial({ color, roughness });

export class Fuli {
  readonly root = new THREE.Group();
  private rig = new THREE.Group();
  private legs: THREE.Group[] = [];
  private tail!: THREE.Group;
  private eyeMaterials: THREE.MeshStandardMaterial[] = [];
  private phase = 0;
  private readonly gold = mat(0xdba42e);
  private readonly cream = mat(0xf1dfaa);
  private readonly spot = mat(0x422d22);
  private readonly dark = mat(0x31241e);
  private readonly blue = mat(0x73c8dc, 0.4);

  constructor() {
    this.root.add(this.rig);
    this.buildBody();
    this.buildHead();
    this.buildLegs();
    this.buildTail();
    this.root.scale.setScalar(1.35);
  }

  private mesh(geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D, position: THREE.Vector3, scale?: THREE.Vector3): THREE.Mesh {
    const m = new THREE.Mesh(geometry, material);
    m.position.copy(position);
    if (scale) m.scale.copy(scale);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  private buildBody(): void {
    this.mesh(new THREE.SphereGeometry(0.72, 18, 12), this.gold, this.rig, new THREE.Vector3(0, 1.05, 0), new THREE.Vector3(0.62, 0.48, 1.15));
    this.mesh(new THREE.SphereGeometry(0.55, 16, 12), this.cream, this.rig, new THREE.Vector3(0, 0.81, 0.15), new THREE.Vector3(0.47, 0.28, 0.88));
    this.mesh(new THREE.SphereGeometry(0.42, 16, 12), this.gold, this.rig, new THREE.Vector3(0, 1.28, -0.77), new THREE.Vector3(0.48, 0.55, 0.46));
    const spots = [[-.35,1.28,-.25],[.34,1.3,-.22],[-.37,1.13,.1],[.37,1.13,.12],[-.31,1.3,.43],[.3,1.31,.47],[-.25,1.34,.73],[.25,1.34,.73],[-.4,1.1,-.48],[.4,1.1,-.49]];
    for (const [x,y,z] of spots) this.mesh(new THREE.SphereGeometry(0.07, 8, 6), this.spot, this.rig, new THREE.Vector3(x!, y!, z!), new THREE.Vector3(1, 0.65, 0.35));
    const neck = this.mesh(new THREE.CapsuleGeometry(0.22, 0.52, 4, 8), this.gold, this.rig, new THREE.Vector3(0, 1.42, -1.03));
    neck.rotation.x = Math.PI / 2.7;
  }

  private buildHead(): void {
    const head = new THREE.Group();
    head.position.set(0, 1.76, -1.28);
    this.rig.add(head);
    this.mesh(new THREE.SphereGeometry(0.39, 16, 12), this.gold, head, new THREE.Vector3(0, 0, -0.02), new THREE.Vector3(0.82, 0.88, 0.92));
    for (const side of [-1, 1]) {
      const ear = this.mesh(new THREE.ConeGeometry(0.13, 0.3, 8), this.gold, head, new THREE.Vector3(side * 0.25, 0.3, 0.04));
      ear.rotation.z = side * -0.2;
      this.mesh(new THREE.SphereGeometry(0.18, 12, 8), this.cream, head, new THREE.Vector3(side * 0.16, -0.11, -0.32), new THREE.Vector3(0.8, 0.55, 0.7));
      const eye = this.mesh(new THREE.SphereGeometry(0.09, 10, 8), this.blue, head, new THREE.Vector3(side * 0.19, 0.07, -0.345));
      const mask = this.mesh(new THREE.SphereGeometry(0.12, 10, 8), this.dark, head, new THREE.Vector3(side * 0.19, 0.02, -0.29), new THREE.Vector3(1.1, 0.9, 0.35));
      mask.position.z = -0.32;
      eye.position.z = -0.4;
      this.eyeMaterials.push(this.blue);
      this.mesh(new THREE.SphereGeometry(0.035, 8, 6), mat(0x101010), head, new THREE.Vector3(side * 0.19, 0.07, -0.46));
      const tear = this.mesh(new THREE.CapsuleGeometry(0.025, 0.16, 3, 5), this.dark, head, new THREE.Vector3(side * 0.2, -0.11, -0.42));
      tear.rotation.z = side * -0.16;
    }
    this.mesh(new THREE.SphereGeometry(0.15, 12, 8), this.gold, head, new THREE.Vector3(0, -0.22, -0.32), new THREE.Vector3(1.25, 0.66, 0.75));
    this.mesh(new THREE.SphereGeometry(0.07, 10, 8), this.dark, head, new THREE.Vector3(0, -0.15, -0.48), new THREE.Vector3(1.1, 0.75, 0.7));
    this.mesh(new THREE.SphereGeometry(0.045, 8, 6), this.spot, head, new THREE.Vector3(-0.27, 0.23, -0.25));
    this.mesh(new THREE.SphereGeometry(0.045, 8, 6), this.spot, head, new THREE.Vector3(0.28, 0.24, -0.25));
  }

  private buildLegs(): void {
    const positions = [[-0.37, 0.95, -0.75], [0.37, 0.95, -0.75], [-0.35, 0.95, 0.55], [0.35, 0.95, 0.55]];
    positions.forEach(([x,y,z], i) => {
      const pivot = new THREE.Group();
      pivot.position.set(x!, y!, z!);
      this.rig.add(pivot);
      this.mesh(new THREE.CapsuleGeometry(0.105, 0.57, 4, 7), this.gold, pivot, new THREE.Vector3(0, -0.31, 0));
      this.mesh(new THREE.SphereGeometry(0.125, 10, 7), this.dark, pivot, new THREE.Vector3(0, -0.64, -0.03), new THREE.Vector3(1.15, 0.72, 1.5));
      if (i === 0 || i === 1) this.mesh(new THREE.SphereGeometry(0.045, 7, 5), this.spot, pivot, new THREE.Vector3(x! < 0 ? -0.085 : 0.085, -0.15, -0.09));
      this.legs.push(pivot);
    });
  }

  private buildTail(): void {
    this.tail = new THREE.Group();
    this.tail.position.set(0, 1.16, 0.87);
    this.rig.add(this.tail);
    const base = this.mesh(new THREE.CapsuleGeometry(0.105, 0.76, 4, 7), this.gold, this.tail, new THREE.Vector3(0, 0.35, 0.26));
    base.rotation.x = -0.9;
    const tip = this.mesh(new THREE.CapsuleGeometry(0.11, 0.25, 4, 7), this.dark, this.tail, new THREE.Vector3(0, 0.74, 0.54));
    tip.rotation.x = -0.4;
  }

  update(dt: number, speed: number, airborne: boolean, turn: number): void {
    const intensity = THREE.MathUtils.clamp(speed / 22, 0, 1.7);
    this.phase += dt * (2 + intensity * 10);
    this.legs.forEach((leg, i) => {
      const offset = i % 2 ? Math.PI : 0;
      leg.rotation.x = airborne ? Math.sin(this.phase + offset) * 0.5 : Math.sin(this.phase + offset) * intensity * 0.82;
    });
    this.rig.position.y = airborne ? 0.42 : Math.abs(Math.sin(this.phase * 2)) * 0.045 * intensity;
    this.rig.rotation.z = THREE.MathUtils.damp(this.rig.rotation.z, -turn * 0.16, 7, dt);
    this.rig.rotation.x = airborne ? -0.12 : Math.sin(this.phase) * 0.035 * intensity;
    this.tail.rotation.x = Math.sin(this.phase * 0.7) * 0.18;
  }
}
