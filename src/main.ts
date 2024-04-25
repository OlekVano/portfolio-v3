import './style.sass';

import * as THREE from 'three';
import TWEEN from '@tweenjs/tween.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

import { LayerModel } from './rubiks-cube/layer-model';
import { debounce, randomNotation, sleep, toRotation } from './rubiks-cube/utils';
import { RubikCubeModel } from './rubiks-cube/rubik-cube-model';
import { Axis } from './rubiks-cube/types';

initializeThree();

manageGSAPAnimations();

function manageGSAPAnimations() {
  let animations: gsap.core.Tween[] = []

  updateGSAPAnimations(animations)

  window.addEventListener('resize', debounce(() => updateGSAPAnimations(animations)));
}

function updateGSAPAnimations(animations: gsap.core.Tween[]) {
  for (let animation of animations) {
    console.log(animation.revert())
  }

  // empties the array
  animations.splice(0, animations.length)

  const workWrapper = document.querySelector('.work > div > div') as HTMLDivElement
  const workContainer = workWrapper.querySelector('.work-container') as HTMLDivElement

  const recentWorkAnimation = gsap.to(workContainer, {
    x: -(workContainer.clientWidth - workWrapper.clientWidth),
    ease: 'none',
    scrollTrigger: {
      trigger: '.work-container',
      pin: true,
      scrub: 0.1,
      end: () => "+=" + workContainer.clientWidth * 1.5,
    }
  })

  animations.push(recentWorkAnimation)
}

function initializeThree() {
  const layerGroup = new LayerModel();
  const box = new THREE.BoxHelper( layerGroup, '#fff' );
  box.onBeforeRender = function() {
    this.update();
  };

  const canvasContainer = document.getElementById('canvas-container') as HTMLCanvasElement;

  const canvasWidth = canvasContainer.offsetWidth;
  const canvasHeight = canvasWidth;

  const [renderer, camera, rubikCube, cubeletModels, scene] = initializeScene(canvasContainer, layerGroup, canvasWidth, canvasHeight);

  animate(renderer, scene, camera);

  manageRubikCubeAnimation(rubikCube, layerGroup, cubeletModels)

  window.addEventListener('resize', debounce(() => updateThreeCanvas(canvasContainer, camera, renderer)));
}

function updateThreeCanvas(canvasContainer: HTMLCanvasElement, camera: THREE.PerspectiveCamera, renderer: THREE.Renderer) {
  const canvasWidth = canvasContainer.offsetWidth
  const canvasHeight = canvasWidth
  camera.aspect = canvasWidth / canvasHeight;
  renderer.setSize(canvasWidth, canvasHeight);
}

function initializeScene(canvasContainer: HTMLCanvasElement, layerGroup: LayerModel, canvasWidth: number, canvasHeight: number):  [THREE.WebGLRenderer, THREE.PerspectiveCamera, RubikCubeModel, THREE.Object3D[], THREE.Scene] {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#FFF');
  
  const directionalLight = new THREE.DirectionalLight('#FFF', 0.05);
  directionalLight.position.set(10, 10, 10);
  scene.add(directionalLight);
  
  const directionalLight2 = new THREE.DirectionalLight('#FFF', 0.05);
  directionalLight2.position.set(-10, -10, -10);
  scene.add(directionalLight2);

  const camera = new THREE.PerspectiveCamera(45, canvasWidth / canvasHeight, 0.1, 30);
  camera.position.set(6, 3, 6);
  camera.lookAt(0, 0, 0)
  camera.zoom = 1.4;
  camera.updateProjectionMatrix();

  let renderer = new THREE.WebGLRenderer({
    antialias: true
  });

  renderer.setSize(canvasWidth, canvasHeight);

  canvasContainer.appendChild(renderer.domElement);

  // const controls = new OrbitControls(camera, renderer.domElement);
  // controls.enablePan = false;
  // controls.enableDamping = true;
  // controls.rotateSpeed = 1.5;
  // controls.minDistance = debug ? 10 : 3;
  // controls.maxDistance = debug ? 200 : 100;
  // controls.enabled = false;

  let rubikCube = new RubikCubeModel();
  let cubeletModels = rubikCube.model.children;
  scene.add(rubikCube.model);
  scene.add(layerGroup);

  return [renderer, camera, rubikCube, cubeletModels, scene]
}

function animate(renderer: THREE.Renderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, time?: number) {
  requestAnimationFrame((time) => animate(renderer, scene, camera, time));
  // if (controls) {
  //   controls.update();
  // }
  TWEEN.update(time);
  // camera.position.lerp(targetCameraPosition, 0.05);
  renderer.render(scene, camera);
};

async function rotationTransition(rubikCube: RubikCubeModel, layerGroup: LayerModel, axis: Axis, endRad: number) {
  await layerGroup.rotationAnimation(axis, endRad);
  layerGroup.ungroup(rubikCube.model);
  layerGroup.initRotation();
}

function manageRubikCubeAnimation(rubikCube: RubikCubeModel, layerGroup: LayerModel, cubeletModels: THREE.Object3D[]) {
  (async () => {
    let lastNotation = '';
    while (true) {
      const notation = randomNotation();
      if (lastNotation && notation[0] === lastNotation[0]) {
        continue;
      }
      lastNotation = notation;
      const [layerRorationAxis, axisValue, rotationRad] = toRotation(notation);
      rubikCube.move(notation)
      layerGroup.group(layerRorationAxis, axisValue, cubeletModels);
      const promise = rotationTransition(rubikCube, layerGroup, layerRorationAxis, rotationRad);
      await promise
      await sleep(350)
    }
  })()
}