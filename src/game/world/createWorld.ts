import * as THREE from 'three';
import { Track } from '../tracks/track';

const hash = (n: number): number => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};

function instanced(geometry: THREE.BufferGeometry, material: THREE.Material, items: Array<{ p: THREE.Vector3; s: THREE.Vector3; r: number }>, castsShadow = true): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  const dummy = new THREE.Object3D();
  items.forEach(({ p, s, r }, i) => {
    dummy.position.copy(p);
    dummy.scale.copy(s);
    dummy.rotation.set(0, r, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = castsShadow;
  mesh.receiveShadow = true;
  return mesh;
}

function farFromTrack(track: Track, x: number, z: number, margin: number): boolean {
  for (let i = 0; i < 160; i++) {
    const p = track.sample(i / 160);
    if (Math.hypot(p.x - x, p.z - z) < margin) return false;
  }
  return true;
}

function terrainTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#8a783f';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 13500; i++) {
    const x = hash(i + 2) * 512;
    const y = hash(i + 149) * 512;
    const radius = .4 + hash(i + 229) * 2.8;
    ctx.fillStyle = ['#6f7138', '#b08b49', '#9a8446', '#778044', '#c29b55'][i % 5]!;
    ctx.globalAlpha = .12 + hash(i + 330) * .28;
    ctx.beginPath();
    ctx.ellipse(x, y, radius * 1.8, radius, hash(i + 51), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(18, 18);
  texture.anisotropy = 8;
  return texture;
}

export function createWorld(scene: THREE.Scene, track: Track): void {
  scene.background = new THREE.Color(0xc3a06d);
  scene.fog = new THREE.FogExp2(0xc3a06d, .0017);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), new THREE.MeshStandardMaterial({ map: terrainTexture(), roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const sun = new THREE.DirectionalLight(0xffddb0, 3.25);
  sun.position.set(-115, 175, -95);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -190;
  sun.shadow.camera.right = 190;
  sun.shadow.camera.top = 190;
  sun.shadow.camera.bottom = -190;
  sun.shadow.bias = -.00015;
  scene.add(sun, new THREE.HemisphereLight(0xffe8c2, 0x53552a, 1.5));

  const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(17, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffd793 }));
  sunDisc.position.set(-215, 112, -340);
  scene.add(sunDisc);
  scene.add(track.buildMesh());

  const treePoints: Array<{ p: THREE.Vector3; s: THREE.Vector3; r: number }> = [];
  const shrubPoints: Array<{ p: THREE.Vector3; s: THREE.Vector3; r: number }> = [];
  const rockPoints: Array<{ p: THREE.Vector3; s: THREE.Vector3; r: number }> = [];
  const grassPoints: Array<{ p: THREE.Vector3; s: THREE.Vector3; r: number }> = [];
  let accepted = 0;
  for (let i = 0; i < 2300 && accepted < 1500; i++) {
    const angle = hash(i * 3 + 7) * Math.PI * 2;
    const radius = 30 + hash(i * 7 + 13) * 360;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (!farFromTrack(track, x, z, 16)) continue;
    accepted++;
    const scale = .68 + hash(i + 71) * 1.35;
    if (hash(i + 103) < .12 && radius > 100) {
      treePoints.push({ p: new THREE.Vector3(x, 2.7 * scale, z), s: new THREE.Vector3(scale, scale, scale), r: angle });
    } else {
      shrubPoints.push({ p: new THREE.Vector3(x, .75 * scale, z), s: new THREE.Vector3(scale * 1.3, scale, scale), r: angle });
    }
    if (hash(i + 211) < .28) rockPoints.push({ p: new THREE.Vector3(x + (hash(i + 313) - .5) * 9, .8, z + (hash(i + 414) - .5) * 9), s: new THREE.Vector3(.7 + hash(i + 512) * 2.4, .55 + hash(i + 612) * 1.8, .65 + hash(i + 712) * 2.5), r: angle });
  }
  for (let i = 0; i < 7800; i++) {
    const x = (hash(i + 902) - .5) * 650;
    const z = (hash(i + 1204) - .5) * 650;
    if (!farFromTrack(track, x, z, 12)) continue;
    const s = .42 + hash(i + 1402) * .9;
    grassPoints.push({ p: new THREE.Vector3(x, .35 * s, z), s: new THREE.Vector3(.5 * s, .55 * s, .5 * s), r: hash(i + 1601) * Math.PI * 2 });
  }

  const trunkGeo = new THREE.CylinderGeometry(.18, .36, 5.4, 7);
  const canopyGeo = new THREE.SphereGeometry(1, 9, 7);
  const trunk = instanced(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x59412a, roughness: 1 }), treePoints.map((v) => ({ ...v, p: new THREE.Vector3(v.p.x, v.p.y - 1.1 * v.s.y, v.p.z), s: new THREE.Vector3(v.s.x, v.s.y * .8, v.s.z) })));
  const canopy = instanced(canopyGeo, new THREE.MeshStandardMaterial({ color: 0x737943, roughness: 1 }), treePoints.map((v) => ({ ...v, s: new THREE.Vector3(v.s.x * 2.2, v.s.y * .85, v.s.z * 2) })));
  scene.add(trunk, canopy);
  scene.add(instanced(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x777052, roughness: 1 }), rockPoints));
  scene.add(instanced(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x68733b, roughness: 1 }), shrubPoints));
  const blade = new THREE.ConeGeometry(.16, 1.05, 3);
  scene.add(instanced(blade, new THREE.MeshStandardMaterial({ color: 0x9b984c, roughness: 1, side: THREE.DoubleSide }), grassPoints, false));

  // Distant mesas frame the horizon and make the circuit feel embedded in a larger landscape.
  const mesaMat = new THREE.MeshStandardMaterial({ color: 0x98734e, roughness: 1 });
  for (let i = 0; i < 24; i++) {
    const mesa = new THREE.Mesh(new THREE.CylinderGeometry(18 + hash(i + 40) * 28, 28 + hash(i + 90) * 28, 16 + hash(i + 130) * 32, 6), mesaMat);
    const a = i / 24 * Math.PI * 2;
    const radius = 445 + hash(i + 8) * 45;
    mesa.position.set(Math.cos(a) * radius, 8, Math.sin(a) * radius);
    mesa.scale.y = .9;
    mesa.rotation.y = a;
    scene.add(mesa);
  }
}
