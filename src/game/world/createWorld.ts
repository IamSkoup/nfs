import * as THREE from 'three';
import { Track } from '../tracks/track';

function tree(seed: number, x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.22, .45, 4.7, 7), new THREE.MeshStandardMaterial({ color: 0x59422a, roughness: 1 }));
  trunk.position.y = 2.35;
  trunk.rotation.z = Math.sin(seed * 1.3) * .09;
  trunk.castShadow = true;
  group.add(trunk);
  const crownMat = new THREE.MeshStandardMaterial({ color: seed % 2 ? 0x65713a : 0x798048, roughness: 1 });
  for (let i = 0; i < 5; i++) {
    const crown = new THREE.Mesh(new THREE.SphereGeometry(1.5 + ((seed + i) % 3) * .24, 8, 6), crownMat);
    const angle = i / 5 * Math.PI * 2;
    crown.position.set(Math.cos(angle) * 1.4, 4.8 + (i % 2) * .45, Math.sin(angle) * 1.1);
    crown.scale.y = .32;
    crown.castShadow = true;
    group.add(crown);
  }
  group.position.set(x, 0, z);
  return group;
}

export function createWorld(scene: THREE.Scene, track: Track): void {
  scene.background = new THREE.Color(0xe7a65e);
  scene.fog = new THREE.FogExp2(0xd19a5f, .0023);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.MeshStandardMaterial({ color: 0x7e773d, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const sun = new THREE.DirectionalLight(0xffd59a, 3.1);
  sun.position.set(-100, 160, -70);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -180;
  sun.shadow.camera.right = 180;
  sun.shadow.camera.top = 180;
  sun.shadow.camera.bottom = -180;
  scene.add(sun, new THREE.HemisphereLight(0xffe0ad, 0x5b5930, 1.35));

  const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(15, 20, 12), new THREE.MeshBasicMaterial({ color: 0xffd48b }));
  sunDisc.position.set(-150, 85, -250);
  scene.add(sunDisc);

  scene.add(track.buildMesh());
  const rng = (n: number) => {
    const x = Math.sin(n * 9283.7 + 17.12) * 43758.5453;
    return x - Math.floor(x);
  };
  for (let i = 0; i < 110; i++) {
    const angle = rng(i + 2) * Math.PI * 2;
    const radius = 145 + rng(i + 41) * 300;
    scene.add(tree(i, Math.cos(angle) * radius, Math.sin(angle) * radius));
  }
  for (let i = 0; i < 65; i++) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.5 + rng(i + 55) * 3, 0), new THREE.MeshStandardMaterial({ color: i % 2 ? 0x746247 : 0x927851, roughness: 1 }));
    rock.position.set((rng(i + 22) - .5) * 330, 1, (rng(i + 82) - .5) * 330);
    rock.rotation.set(rng(i + 15), rng(i + 16) * 3, rng(i + 17));
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
  }
}
