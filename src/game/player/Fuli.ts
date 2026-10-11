import * as THREE from 'three';

function coatTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#e5ad3b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Irregular rosettes and freckles give every body part a continuous cheetah coat.
  for (let i = 0; i < 330; i++) {
    const seed = i * 73.17;
    const x = ((Math.sin(seed) * .5 + .5) * canvas.width);
    const y = ((Math.sin(seed * 2.43) * .5 + .5) * canvas.height);
    const w = 2.5 + (Math.sin(seed * 1.7) * .5 + .5) * 5.5;
    const h = w * (.65 + (Math.sin(seed * .71) * .5 + .5) * .7);
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, Math.sin(seed) * .6, 0, Math.PI * 2);
    ctx.fillStyle = i % 7 === 0 ? '#77401e' : '#3c2921';
    ctx.fill();
    if (i % 4 === 0) {
      ctx.beginPath();
      ctx.ellipse(x + 1, y - 1, w * .28, h * .27, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#e5ad3b';
      ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const spotTexture = coatTexture();
const material = (color: number, roughness = .82) => new THREE.MeshStandardMaterial({ color, roughness });

interface LegRig {
  upper: THREE.Group;
  knee: THREE.Group;
  paw: THREE.Group;
  phase: number;
  hind: boolean;
}

export class Fuli {
  readonly root = new THREE.Group();
  private body = new THREE.Group();
  private head!: THREE.Group;
  private tailJoints: THREE.Group[] = [];
  private legs: LegRig[] = [];
  private breath = 0;
  private coat = new THREE.MeshStandardMaterial({ map: spotTexture, color: 0xffffff, roughness: .9 });
  private gold = material(0xe5ad3b);
  private cream = material(0xf0dfb1);
  private dark = material(0x32251f, .72);
  private innerEar = material(0x6c3928, .88);
  private eyeWhite = material(0xf5eddb, .5);
  private iris = material(0x53c4d9, .35);
  private pupil = material(0x101315, .2);
  private fleckMaterial = material(0x38271f);
  private foreheadMaterial = material(0x452d22);
  private runBlend = 0;

  constructor() {
    this.root.add(this.body);
    this.buildTorso();
    this.buildHead();
    this.buildLegs();
    this.buildTail();
    this.root.scale.setScalar(1.25);
  }

  private mesh(
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    mat: THREE.Material,
    position: THREE.Vector3,
    scale?: THREE.Vector3,
  ): THREE.Mesh {
    const object = new THREE.Mesh(geometry, mat);
    object.position.copy(position);
    if (scale) object.scale.copy(scale);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }

  private ellipsoid(parent: THREE.Object3D, mat: THREE.Material, position: [number, number, number], scale: [number, number, number]): THREE.Mesh {
    return this.mesh(parent, new THREE.SphereGeometry(1, 24, 16), mat, new THREE.Vector3(...position), new THREE.Vector3(...scale));
  }

  private buildTorso(): void {
    // Long, lean ribcage, rounded haunches, high shoulder and a low cream belly.
    this.ellipsoid(this.body, this.coat, [0, 1.16, .05], [.64, .48, 1.08]);
    this.ellipsoid(this.body, this.coat, [0, 1.2, .72], [.52, .48, .57]);
    this.ellipsoid(this.body, this.coat, [0, 1.34, -.62], [.56, .56, .53]);
    this.ellipsoid(this.body, this.cream, [0, .92, .08], [.43, .25, .82]);
    this.ellipsoid(this.body, this.cream, [0, 1.24, -.91], [.39, .43, .28]);

    // Freckles sit on the coat surface instead of floating as a sparse row of dots.
    for (const side of [-1, 1]) {
      for (let row = 0; row < 5; row++) {
        for (let column = 0; column < 5; column++) {
          const z = -.64 + column * .29 + (row % 2) * .09;
          const y = .99 + row * .105;
          const nz = (z - .05) / 1.08;
          const ny = (y - 1.16) / .48;
          const radial = Math.sqrt(Math.max(.12, 1 - nz * nz - ny * ny));
          const x = side * (.64 * radial + .012);
          const fleck = this.mesh(this.body, new THREE.SphereGeometry(1, 7, 5), row % 3 ? this.fleckMaterial : this.innerEar,
            new THREE.Vector3(x, y, z), new THREE.Vector3(.018, .035 + (column % 2) * .012, .045));
          fleck.rotation.y = side * -.16;
        }
      }
    }

    // A narrow neck bridges the shoulders and the forward, alert head.
    const neck = this.ellipsoid(this.body, this.coat, [0, 1.5, -.94], [.34, .43, .55]);
    neck.rotation.x = -.43;
  }

  private buildHead(): void {
    this.head = new THREE.Group();
    this.head.position.set(0, 1.78, -1.22);
    this.body.add(this.head);

    this.ellipsoid(this.head, this.coat, [0, 0, 0], [.38, .41, .4]);
    this.ellipsoid(this.head, this.gold, [0, -.16, -.19], [.31, .24, .31]);

    for (const side of [-1, 1]) {
      const ear = this.mesh(this.head, new THREE.ConeGeometry(.16, .36, 9), this.coat,
        new THREE.Vector3(side * .25, .33, .05));
      ear.rotation.z = side * -.17;
      const inner = this.mesh(this.head, new THREE.ConeGeometry(.085, .23, 8), this.innerEar,
        new THREE.Vector3(side * .25, .34, -.065));
      inner.rotation.z = side * -.17;

      // Large turquoise eyes, dark lids and the cheetah's unmistakable tear stripes.
      this.ellipsoid(this.head, this.dark, [side * .195, .09, -.316], [.145, .155, .064]);
      this.ellipsoid(this.head, this.eyeWhite, [side * .195, .095, -.363], [.112, .118, .045]);
      this.ellipsoid(this.head, this.iris, [side * .184, .085, -.399], [.072, .083, .026]);
      this.ellipsoid(this.head, this.pupil, [side * .181, .083, -.419], [.035, .053, .018]);
      this.ellipsoid(this.head, this.eyeWhite, [side * .162, .12, -.437], [.019, .023, .012]);

      const tear = this.mesh(this.head, new THREE.CapsuleGeometry(.035, .19, 4, 7), this.dark,
        new THREE.Vector3(side * .19, -.105, -.365));
      tear.rotation.z = side * -.11;

      // Pale muzzle pads and tiny whisker freckles.
      this.ellipsoid(this.head, this.cream, [side * .12, -.2, -.37], [.18, .125, .14]);
      for (let dot = 0; dot < 3; dot++) {
        this.ellipsoid(this.head, this.dark, [side * (.16 + (dot % 2) * .045), -.19 - dot * .035, -.486], [.014, .014, .009]);
      }
      for (let dot = 0; dot < 4; dot++) {
        this.ellipsoid(this.head, this.dark, [side * (.28 + (dot % 2) * .035), .20 + Math.floor(dot / 2) * .055, -.19], [.022, .026, .018]);
      }
    }

    const nose = this.mesh(this.head, new THREE.ConeGeometry(.095, .12, 3), this.dark,
      new THREE.Vector3(0, -.145, -.49));
    nose.rotation.x = -Math.PI / 2;
    this.ellipsoid(this.head, this.cream, [0, -.275, -.39], [.18, .085, .12]);

    const mouthCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -.2, -.496), new THREE.Vector3(0, -.29, -.505),
      new THREE.Vector3(.085, -.31, -.48), new THREE.Vector3(.14, -.29, -.46),
    ]);
    const mouth = new THREE.Mesh(new THREE.TubeGeometry(mouthCurve, 12, .012, 5, false), this.dark);
    this.head.add(mouth);
    const oppositeMouth = mouth.clone();
    oppositeMouth.scale.x = -1;
    this.head.add(oppositeMouth);

    // Small forehead spots and expressive brows complete the recognizable mask.
    for (const [x, y] of [[-.09, .29], [.07, .31], [.24, .26], [-.25, .26]] as const) {
      this.ellipsoid(this.head, this.foreheadMaterial, [x, y, -.25], [.035, .04, .02]);
    }
    for (const side of [-1, 1]) {
      const brow = this.mesh(this.head, new THREE.CapsuleGeometry(.035, .12, 3, 6), this.gold,
        new THREE.Vector3(side * .19, .235, -.345));
      brow.rotation.z = side * .34;
    }
  }

  private buildLegs(): void {
    const definitions = [
      { x: -.39, y: 1.12, z: -.64, hind: false, phase: 0 },
      { x: .39, y: 1.12, z: -.64, hind: false, phase: .22 },
      { x: -.38, y: 1.08, z: .72, hind: true, phase: Math.PI },
      { x: .38, y: 1.08, z: .72, hind: true, phase: Math.PI + .22 },
    ];
    for (const def of definitions) {
      const upper = new THREE.Group();
      upper.position.set(def.x, def.y, def.z);
      this.body.add(upper);
      const upperLength = def.hind ? .48 : .45;
      this.mesh(upper, new THREE.CapsuleGeometry(def.hind ? .145 : .115, upperLength, 5, 9), this.coat,
        new THREE.Vector3(0, -upperLength * .52, 0));
      const knee = new THREE.Group();
      knee.position.y = -upperLength;
      upper.add(knee);
      this.ellipsoid(knee, this.gold, [0, 0, 0], [.105, .115, .11]);
      this.mesh(knee, new THREE.CapsuleGeometry(.075, .39, 4, 8), this.gold, new THREE.Vector3(0, -.24, .015));
      const paw = new THREE.Group();
      paw.position.set(0, -.47, -.025);
      knee.add(paw);
      this.ellipsoid(paw, this.gold, [0, -.01, -.055], [.12, .09, .17]);
      for (let toe = -1; toe <= 1; toe++) {
        const claw = this.mesh(paw, new THREE.ConeGeometry(.022, .065, 5), this.dark,
          new THREE.Vector3(toe * .055, -.045, -.17));
        claw.rotation.x = -Math.PI / 2;
      }
      this.legs.push({ upper, knee, paw, phase: def.phase, hind: def.hind });
    }
  }

  private buildTail(): void {
    let joint = new THREE.Group();
    joint.position.set(0, 1.34, 1.06);
    this.body.add(joint);
    for (let i = 0; i < 7; i++) {
      const next = new THREE.Group();
      const radius = .115 - i * .008;
      const banded = i >= 4;
      const piece = this.mesh(joint, new THREE.CapsuleGeometry(radius, .24, 4, 8), banded && i % 2 === 0 ? this.dark : this.gold,
        new THREE.Vector3(0, -.025, .14));
      piece.rotation.x = Math.PI / 2;
      next.position.set(0, 0, .27);
      joint.add(next);
      this.tailJoints.push(joint);
      joint = next;
    }
    this.mesh(joint, new THREE.SphereGeometry(.1, 10, 7), this.dark, new THREE.Vector3(0, 0, .08), new THREE.Vector3(.9, .9, 1.45));
  }

  update(dt: number, speed: number, airborne: boolean, turn: number): void {
    const pace = THREE.MathUtils.clamp(speed / 18.2, 0, 1.25);
    this.runBlend = THREE.MathUtils.damp(this.runBlend, pace, 4, dt);
    this.breath += dt * (1.7 + pace * 11);
    const stride = this.breath;
    this.legs.forEach((leg) => {
      const cycle = stride + leg.phase;
      leg.upper.rotation.x = Math.sin(cycle) * (.08 + pace * (leg.hind ? .95 : .78));
      const tuck = Math.max(0, Math.sin(cycle + .8));
      leg.knee.rotation.x = (leg.hind ? -.12 : .08) - tuck * pace * (leg.hind ? .9 : .72);
      leg.paw.rotation.x = -.2 + Math.max(0, Math.sin(cycle + 2.1)) * pace * .7;
    });

    // Quiet breathing at rest, then an elastic spine and a gathered cheetah gallop.
    this.body.scale.y = 1 + Math.sin(this.breath * 1.2) * .012 + pace * .035 * Math.sin(stride * 2);
    this.body.position.y = (airborne ? .32 : Math.abs(Math.sin(stride * 2)) * (.018 + pace * .12));
    this.body.rotation.x = airborne ? -.09 : Math.sin(stride) * pace * .075;
    this.body.rotation.z = THREE.MathUtils.damp(this.body.rotation.z, -turn * .14, 8, dt);
    this.head.rotation.x = Math.sin(stride * .5) * pace * .055 - (airborne ? .12 : 0);
    this.head.rotation.z = THREE.MathUtils.damp(this.head.rotation.z, -turn * .07, 6, dt);
    this.tailJoints.forEach((joint, i) => {
      joint.rotation.x = .14 + Math.sin(stride * .45 - i * .35) * (.11 + pace * .15);
      joint.rotation.y = Math.sin(stride * .3 - i * .24) * (.08 + pace * .08);
    });
    // Keep the speed blend referenced so acceleration into a sprint feels gradual.
    this.root.userData.runBlend = this.runBlend;
  }
}
