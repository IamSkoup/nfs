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

function trackSamples(track: Track): THREE.Vector3[] {
  return Array.from({ length: 180 }, (_, i) => track.sample(i / 179));
}

function farFromTrack(samples: THREE.Vector3[], x: number, z: number, margin: number): boolean {
  for (const p of samples) if (Math.hypot(p.x - x, p.z - z) < margin) return false;
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

function sandstoneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 256, 512);
  gradient.addColorStop(0, '#92714d');
  gradient.addColorStop(.5, '#c29a69');
  gradient.addColorStop(1, '#76583e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 140; i++) {
    const y = i * 3.7 + hash(i + 701) * 3;
    ctx.globalAlpha = .06 + hash(i + 801) * .13;
    ctx.fillStyle = i % 2 ? '#f1d19c' : '#3e3026';
    ctx.fillRect(0, y, 256, 1 + hash(i + 901) * 2);
  }
  for (let i = 0; i < 1900; i++) {
    ctx.globalAlpha = .04 + hash(i + 1001) * .1;
    ctx.fillStyle = i % 2 ? '#f0d29d' : '#3b3028';
    ctx.fillRect(hash(i + 1101) * 256, hash(i + 1201) * 512, 1 + hash(i + 1301) * 3, 1 + hash(i + 1401) * 3);
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

function prideRockGeometry(): THREE.BufferGeometry {
  const rings = [[0, 28], [5, 32], [12, 30], [20, 23], [28, 20], [36, 22], [40, 29], [44, 27], [50, 23], [60, 17], [68, 13], [71, 12]];
  const radialSegments = 48;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  rings.forEach(([y, radius], ring) => {
    for (let i = 0; i <= radialSegments; i++) {
      const angle = i / radialSegments * Math.PI * 2;
      const wobble = 1 + Math.sin(angle * 5 + ring * .7) * .045 + Math.sin(angle * 11 - ring) * .018;
      positions.push(Math.cos(angle) * radius * wobble, y + Math.sin(angle * 3 + ring) * .65, Math.sin(angle) * radius * wobble * .78);
      uvs.push(i / radialSegments * 4, y / 12);
      if (ring < rings.length - 1 && i < radialSegments) {
        const a = ring * (radialSegments + 1) + i;
        const b = a + radialSegments + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createWorld(scene: THREE.Scene, track: Track): void {
  scene.background = new THREE.Color(0xc3a06d);
  scene.fog = new THREE.FogExp2(0xc3a06d, .0017);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800, 100, 100), new THREE.MeshStandardMaterial({ map: terrainTexture(), roughness: 1 }));
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
  const hemi = new THREE.HemisphereLight(0xffe8c2, 0x53552a, 1.5);
  scene.add(sun, hemi);

  const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(17, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffd793 }));
  sunDisc.position.set(-215, 112, -340);
  scene.add(sunDisc);
  const trackMesh = track.buildMesh();
  trackMesh.userData.track = true;
  scene.add(trackMesh);
  const sceneryTrackSamples = [track, new Track('sprint'), new Track('drag')].flatMap(trackSamples);

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
    if (!farFromTrack(sceneryTrackSamples, x, z, 16)) continue;
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
    if (!farFromTrack(sceneryTrackSamples, x, z, 12)) continue;
    const s = .42 + hash(i + 1402) * .9;
    grassPoints.push({ p: new THREE.Vector3(x, .35 * s, z), s: new THREE.Vector3(.5 * s, .55 * s, .5 * s), r: hash(i + 1601) * Math.PI * 2 });
  }

  const trunkGeo = new THREE.CylinderGeometry(.18, .36, 5.4, 7);
  const canopyGeo = new THREE.SphereGeometry(1, 24, 16);
  const trunk = instanced(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x59412a, roughness: 1 }), treePoints.map((v) => ({ ...v, p: new THREE.Vector3(v.p.x, v.p.y - 1.1 * v.s.y, v.p.z), s: new THREE.Vector3(v.s.x, v.s.y * .8, v.s.z) })));
  const canopy = instanced(canopyGeo, new THREE.MeshStandardMaterial({ color: 0x737943, roughness: 1 }), treePoints.map((v) => ({ ...v, s: new THREE.Vector3(v.s.x * 2.2, v.s.y * .85, v.s.z * 2) })));
  scene.add(trunk, canopy);
  const sandstone = sandstoneTexture();
  const stoneMaterial = new THREE.MeshStandardMaterial({ map: sandstone, color: 0xc4ad87, roughness: 1 });
  scene.add(instanced(new THREE.IcosahedronGeometry(1, 2), stoneMaterial, rockPoints));
  scene.add(instanced(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshStandardMaterial({ color: 0x68733b, roughness: 1 }), shrubPoints));
  const blade = new THREE.ConeGeometry(.16, 1.05, 3);
  scene.add(instanced(blade, new THREE.MeshStandardMaterial({ color: 0x9b984c, roughness: 1, side: THREE.DoubleSide }), grassPoints, false));

  const termitePoints: Array<{ p: THREE.Vector3; s: THREE.Vector3; r: number }> = [];
  for (let i = 0; i < 190; i++) {
    const a = hash(i + 1801) * Math.PI * 2;
    const radius = 55 + hash(i + 1901) * 350;
    const x = Math.cos(a) * radius, z = Math.sin(a) * radius;
    if (!farFromTrack(sceneryTrackSamples, x, z, 13)) continue;
    const size = .5 + hash(i + 2001) * 1.7;
    termitePoints.push({ p: new THREE.Vector3(x, .9 * size, z), s: new THREE.Vector3(size, size, size), r: a });
  }
  scene.add(instanced(new THREE.ConeGeometry(1, 2.2, 8), new THREE.MeshStandardMaterial({ color: 0x8b5e38, roughness: 1 }), termitePoints));

  // A sheltered watering hole adds a distinct landmark between the track and the rock.
  const shore = new THREE.Mesh(new THREE.CircleGeometry(24, 96), new THREE.MeshStandardMaterial({ color: 0xb3a06c, roughness: 1 }));
  shore.rotation.x = -Math.PI / 2;
  shore.position.set(40, .035, 22);
  scene.add(shore);
  const water = new THREE.Mesh(new THREE.CircleGeometry(17, 128), new THREE.MeshStandardMaterial({ color: 0x526f68, roughness: .2, metalness: .12 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(40, .07, 22);
  scene.add(water);
  for (let i = 0; i < 4; i++) {
    const ripple = new THREE.Mesh(new THREE.TorusGeometry(3.5 + i * 2.5, .055, 6, 96), new THREE.MeshBasicMaterial({ color: 0xc6d3ae, transparent: true, opacity: .24 - i * .035 }));
    ripple.rotation.x = Math.PI / 2;
    ripple.position.set(40, .09 + i * .002, 22);
    scene.add(ripple);
  }

  // Distant mesas frame the horizon and make the circuit feel embedded in a larger landscape.
  const mesaMat = new THREE.MeshStandardMaterial({ map: sandstone, color: 0xc4ad87, roughness: 1 });
  for (let i = 0; i < 24; i++) {
    const mesa = new THREE.Mesh(new THREE.CylinderGeometry(18 + hash(i + 40) * 28, 28 + hash(i + 90) * 28, 16 + hash(i + 130) * 32, 16, 3), mesaMat);
    const a = i / 24 * Math.PI * 2;
    const radius = 445 + hash(i + 8) * 45;
    mesa.position.set(Math.cos(a) * radius, 8, Math.sin(a) * radius);
    mesa.scale.y = .9;
    mesa.rotation.y = a;
    scene.add(mesa);
  }

  // A tall, layered Pride Rock landmark sits within the circuit's inner field.
  const prideRock = new THREE.Group();
  prideRock.position.set(-5, 0, -8);
  const body = new THREE.Mesh(prideRockGeometry(), new THREE.MeshStandardMaterial({ map: sandstone, color: 0xb99061, roughness: 1 }));
  body.castShadow = true;
  body.receiveShadow = true;
  prideRock.add(body);
  const summit = new THREE.Mesh(new THREE.DodecahedronGeometry(10, 3), new THREE.MeshStandardMaterial({ map: sandstone, color: 0xc49a68, roughness: 1 }));
  summit.position.set(-3, 67, -3);
  summit.scale.set(1.45, .52, .85);
  prideRock.add(summit);
  prideRock.userData.landmark = 'pride-rock';
  scene.add(prideRock);

  // High-resolution shader sky: a layered dusk gradient, sun glow, and soft drifting cloud fields.
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color(0x52748f) },
      uHorizon: { value: new THREE.Color(0xe9aa70) },
      uSun: { value: new THREE.Color(0xffe0a3) },
      uClouds: { value: .38 },
      uSunDirection: { value: new THREE.Vector3(-.52, .24, -.82).normalize() },
    },
    vertexShader: `varying vec3 vWorld; void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vWorld=wp.xyz; gl_Position=projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `
      varying vec3 vWorld;
      uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSun;
      uniform float uClouds; uniform vec3 uSunDirection;
      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y); }
      void main(){
        vec3 d=normalize(vWorld); float h=clamp(d.y*.82+.18,0.0,1.0);
        vec3 sky=mix(uHorizon,uTop,pow(h,.72));
        float sunGlow=pow(max(dot(d,normalize(uSunDirection)),0.0),30.0);
        sky=mix(sky,uSun,clamp(sunGlow*.9,0.0,.9));
        vec2 cloudUv=d.xz/(max(.16,d.y+1.12))*2.1;
        float n=noise(cloudUv)+noise(cloudUv*2.7)*.34+noise(cloudUv*5.1)*.12;
        float cloud=smoothstep(.62,.79,n)*uClouds*(1.0-smoothstep(.22,.88,d.y));
        sky=mix(sky,vec3(.94,.82,.68),cloud*.82);
        gl_FragColor=vec4(sky,1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 160, 96), skyMaterial);
  sky.frustumCulled = false;
  scene.add(sky);

  const rainCount = 700;
  const rainPositions = new Float32Array(rainCount * 2 * 3);
  for (let i = 0; i < rainCount; i++) {
    const x = (hash(i + 3001) - .5) * 90, y = hash(i + 3101) * 65, z = (hash(i + 3201) - .5) * 90;
    rainPositions.set([x, y, z, x - .8, y - 3.6, z + .2], i * 6);
  }
  const rainGeometry = new THREE.BufferGeometry();
  rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rain = new THREE.LineSegments(rainGeometry, new THREE.LineBasicMaterial({ color: 0xc9e3ed, transparent: true, opacity: .42 }));
  rain.visible = false;
  scene.add(rain);
  scene.userData.environment = { sun, hemi, sunDisc, sky, skyMaterial, rain };
  applyEnvironmentSettings(scene, 'golden', 'clear');
}

export type TimeOfDay = 'dawn' | 'day' | 'golden' | 'night';
export type Weather = 'clear' | 'dust' | 'storm';

export function applyEnvironmentSettings(scene: THREE.Scene, time: TimeOfDay, weather: Weather): void {
  const env = scene.userData.environment as { sun: THREE.DirectionalLight; hemi: THREE.HemisphereLight; sunDisc: THREE.Mesh; skyMaterial: THREE.ShaderMaterial; rain: THREE.LineSegments } | undefined;
  if (!env) return;
  const presets: Record<TimeOfDay, { top: number; horizon: number; sun: number; light: number; hemi: number; fog: number }> = {
    dawn: { top: 0x6e7390, horizon: 0xd98c74, sun: 0xffbf87, light: 2.15, hemi: 1.08, fog: 0xd49a78 },
    day: { top: 0x4c91bd, horizon: 0xc9dfdf, sun: 0xfff0ca, light: 3.45, hemi: 1.65, fog: 0xacc4c3 },
    golden: { top: 0x52748f, horizon: 0xe9aa70, sun: 0xffe0a3, light: 3.0, hemi: 1.35, fog: 0xc3a06d },
    night: { top: 0x111e39, horizon: 0x786276, sun: 0xadbde9, light: .42, hemi: .68, fog: 0x31384c },
  };
  const preset = presets[time];
  const cloudAmount = weather === 'storm' ? .9 : weather === 'dust' ? .72 : time === 'day' ? .5 : .34;
  env.skyMaterial.uniforms.uTop!.value.setHex(preset.top);
  env.skyMaterial.uniforms.uHorizon!.value.setHex(preset.horizon);
  env.skyMaterial.uniforms.uSun!.value.setHex(preset.sun);
  env.skyMaterial.uniforms.uClouds!.value = cloudAmount;
  env.sun.intensity = weather === 'storm' ? preset.light * .58 : preset.light;
  env.hemi.intensity = weather === 'storm' ? preset.hemi * .72 : preset.hemi;
  env.sunDisc.visible = time !== 'night';
  env.rain.visible = weather === 'storm';
  const fogColor = new THREE.Color(weather === 'dust' ? 0xc59a64 : weather === 'storm' ? 0x727b83 : preset.fog);
  scene.fog = new THREE.FogExp2(fogColor, weather === 'dust' ? .003 : weather === 'storm' ? .0026 : .0017);
}

export function updateEnvironment(scene: THREE.Scene, camera: THREE.Camera, dt: number): void {
  const env = scene.userData.environment as { sky: THREE.Mesh; rain: THREE.LineSegments } | undefined;
  if (!env) return;
  env.sky.position.copy(camera.position);
  if (!env.rain.visible) return;
  env.rain.position.copy(camera.position);
  const position = env.rain.geometry.getAttribute('position') as THREE.BufferAttribute;
  const values = position.array as Float32Array;
  for (let i = 0; i < values.length; i += 6) {
    values[i + 1] -= dt * 55;
    values[i + 4] -= dt * 55;
    if (values[i + 1] < -18) { values[i + 1] += 70; values[i + 4] += 70; }
  }
  position.needsUpdate = true;
}
