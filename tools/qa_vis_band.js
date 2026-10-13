// Minimal point-light gradient render inside the game page (separate renderer) to tell SwiftShader banding from game banding.
const c = document.createElement('canvas'); c.width = 600; c.height = 400; c.style.cssText = 'position:fixed;left:0;top:0;z-index:999;width:600px;height:400px';
document.body.appendChild(c);
const r = new THREE.WebGLRenderer({ canvas: c, antialias: true });
r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.12;
const sc = new THREE.Scene(); sc.background = new THREE.Color('#141c35');
const cam = new THREE.PerspectiveCamera(40, 1.5, 0.1, 100); cam.position.set(0, 6, 6); cam.lookAt(0, 0, 0);
const plane = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial({ color: new THREE.Color('#5fae3c').convertSRGBToLinear(), roughness: 0.95 }));
plane.rotation.x = -Math.PI / 2; sc.add(plane);
const wall = new THREE.Mesh(new THREE.BoxGeometry(4, 2.6, 0.1), new THREE.MeshStandardMaterial({ color: new THREE.Color('#efe9dc').convertSRGBToLinear(), roughness: 0.9 }));
wall.position.set(1, 1.3, -1.5); sc.add(wall);
sc.add(new THREE.HemisphereLight(new THREE.Color('#3c5288').convertSRGBToLinear(), new THREE.Color('#141a28').convertSRGBToLinear(), 0.42));
const pl = new THREE.PointLight(0xffc98a, 1.55, 4.3, 2); pl.position.set(0, 1.4, -1); sc.add(pl);
r.render(sc, cam);
const gl = r.getContext();
const hp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
return { prec: [hp.precision, hp.rangeMin], renderer: gl.getParameter(gl.RENDERER), gameCaps: window.__morada.M.render.renderer.capabilities.precision };
