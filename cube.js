const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const rubiksCube = new THREE.Group();
scene.add(rubiksCube);
camera.position.z = 6;

const faceColors = [0xffffff, 0xffd500, 0x0051ba, 0x009e60, 0xff5800, 0xc41e3a]; // White, Yellow, Blue, Green, Orange, Red

const cubieSize = 0.97;
const roundedEdges = 0.05;

function createCubie(x, y, z) {
    const geometry = new THREE.BoxGeometry(cubieSize, cubieSize, cubieSize, 10, 10, 10);
    const materials = [
        new THREE.MeshPhongMaterial({ color: faceColors[0] }), 
        new THREE.MeshPhongMaterial({ color: faceColors[1] }), 
        new THREE.MeshPhongMaterial({ color: faceColors[2] }), 
        new THREE.MeshPhongMaterial({ color: faceColors[3] }), 
        new THREE.MeshPhongMaterial({ color: faceColors[4] }), 
        new THREE.MeshPhongMaterial({ color: faceColors[5] })  
    ];
    const cubie = new THREE.Mesh(geometry, materials);
    cubie.position.set(x, y, z);
    cubie.userData = { lastRotation: 0 };
    return cubie;
}

for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
            const cubie = createCubie(x, y, z);
            rubiksCube.add(cubie);
        }
    }
}

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 5, 5).normalize();
scene.add(directionalLight);

renderer.shadowMap.enabled = true;
rubiksCube.castShadow = true;
rubiksCube.receiveShadow = true;

let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
document.addEventListener('mousedown', () => isDragging = true);
document.addEventListener('mouseup', () => isDragging = false);
document.addEventListener('mousemove', (e) => {
    if (isDragging) {
        const deltaMove = { x: e.clientX - previousMousePosition.x, y: e.clientY - previousMousePosition.y };
        const rotationQuaternion = new THREE.Quaternion()
            .setFromEuler(new THREE.Euler(toRadians(deltaMove.y), toRadians(deltaMove.x), 0, 'XYZ'));
        rubiksCube.quaternion.multiplyQuaternions(rotationQuaternion, rubiksCube.quaternion);
    }
    previousMousePosition = { x: e.clientX, y: e.clientY };
});

function toRadians(angle) {
    return angle * (Math.PI / 180);
}

const turnQueue = [];
let isTurnInProgress = false;

function processTurnQueue() {
    if (turnQueue.length > 0 && !isTurnInProgress) {
        const { axis, layer, direction } = turnQueue.shift();
        rotateFace(axis, layer, direction);
    }
}

function rotateFace(axis, layer, direction) {
    isTurnInProgress = true;
    const rotationAngle = Math.PI / 2 * direction;
    const cubies = rubiksCube.children.filter(cubie => Math.round(cubie.position[axis]) === layer);
    new TWEEN.Tween({ rotation: 0 })
        .to({ rotation: rotationAngle }, 300) 
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(({ rotation }) => {
            cubies.forEach(cubie => {
                cubie.position.applyAxisAngle(new THREE.Vector3(...axisVector(axis)), rotation - cubie.userData.lastRotation);
                cubie.rotateOnWorldAxis(new THREE.Vector3(...axisVector(axis)), rotation - cubie.userData.lastRotation);
                cubie.userData.lastRotation = rotation;
            });
        })
        .onComplete(() => {
            cubies.forEach(cubie => cubie.userData.lastRotation = 0);
            isTurnInProgress = false;
            processTurnQueue(); 
        })
        .start();
    updateMoveCounter();
}

function axisVector(axis) {
    if (axis === 'x') return [1, 0, 0];
    if (axis === 'y') return [0, 1, 0];
    if (axis === 'z') return [0, 0, 1];
}

function scrambleCube() {
    const moves = 20;
    const axes = ['x', 'y', 'z'];
    const layers = [-1, 0, 1];
    const directions = [-1, 1];
    for (let i = 0; i < moves; i++) {
        const randomAxis = axes[Math.floor(Math.random() * axes.length)];
        const randomLayer = layers[Math.floor(Math.random() * layers.length)];
        const randomDirection = directions[Math.floor(Math.random() * directions.length)];
        turnQueue.push({ axis: randomAxis, layer: randomLayer, direction: randomDirection });
    }
    processTurnQueue();
    startTimer();
}

function solveCube(method = 'CFOP') {
    turnQueue.length = 0;
    let solutionMoves = [];

    if (method === 'CFOP') {
        solutionMoves = [
            { axis: 'x', layer: -1, direction: 1 },
            { axis: 'y', layer: 1, direction: -1 },
            { axis: 'z', layer: 0, direction: 1 },
        ];
    } else if (method === 'Roux') {
        solutionMoves = [
            { axis: 'y', layer: 1, direction: 1 },
            { axis: 'x', layer: 0, direction: -1 },
            { axis: 'z', layer: -1, direction: 1 },
        ];
    } else if (method === 'ZZ') {
        solutionMoves = [
            { axis: 'z', layer: 1, direction: -1 },
            { axis: 'x', layer: 1, direction: 1 },
            { axis: 'y', layer: -1, direction: -1 },
        ];
    } else if (method === 'Metha') {
        solutionMoves = [
            { axis: 'y', layer: 1, direction: -1 },
            { axis: 'z', layer: 0, direction: 1 },
            { axis: 'x', layer: 1, direction: -1 },
        ];
    }

    solutionMoves.forEach(move => turnQueue.push(move));
    processTurnQueue();
    stopTimer();
}

document.getElementById('scrambleButton').addEventListener('click', scrambleCube);
document.getElementById('solveButton').addEventListener('click', () => solveCube('CFOP'));
document.getElementById('solveRouxButton').addEventListener('click', () => solveCube('Roux'));
document.getElementById('solveZZButton').addEventListener('click', () => solveCube('ZZ'));
document.getElementById('solveMethaButton').addEventListener('click', () => solveCube('Metha'));

function updateMoveCounter() {
    const moveCounterElement = document.getElementById('moveCounter');
    moveCounterElement.innerHTML = `Moves: ${turnQueue.length}`;
}

let timerInterval;
let startTime = 0;

function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 100);
}

function updateTimer() {
    const timeElapsed = (Date.now() - startTime) / 1000;
    const timerElement = document.getElementById('timer');
    timerElement.innerHTML = `Time: ${timeElapsed.toFixed(1)}s`;
}

function stopTimer() {
    clearInterval(timerInterval);
}

function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    renderer.render(scene, camera);
}

animate();