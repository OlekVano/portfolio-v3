import './style.sass';

import * as THREE from 'three';
import TWEEN from '@tweenjs/tween.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);
import SplitType from 'split-type'
import Lenis from 'lenis'

import { LayerModel } from './rubiks-cube/layer-model';
import { debounce, randomNotation, sleep, toRotation } from './rubiks-cube/utils';
import { RubikCubeModel } from './rubiks-cube/rubik-cube-model';
import { Axis } from './rubiks-cube/types';

const MIN_CANVAS_HEIGHT = 768

initializeSmoothScroll();
initializeThree();
prepareAnimatedText();
manageGSAPAnimations();

function prepareAnimatedText() {
  SplitType.create('.hero > div > h1', {
    types: 'words'
  })

  const textElems = document.querySelectorAll('.scroll-animated-text, .scroll-animated-text-horizontal') as NodeListOf<HTMLDivElement>
  for (let elem of textElems) {
    SplitType.create(elem, {
      types: 'words'
    })
  }

}

function initializeSmoothScroll() {
  const lenis = new Lenis()

  lenis.on('scroll', ScrollTrigger.update)

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000)
  })

  gsap.ticker.lagSmoothing(0)
}

function manageGSAPAnimations() {
  setOnetimeGSAPAnimations()

  let animations: gsap.core.Tween[] = []

  updateGSAPAnimations(animations)

  window.addEventListener('resize', debounce(() => updateGSAPAnimations(animations)));
}

function setOnetimeGSAPAnimations() {
  gsap.set(':is(.scroll-animated-text, .scroll-animated-text-horizontal) > .word', {
    opacity: 0.1
  })

  gsap.fromTo('.hero > div > h1 .word',
    { 
      opacity: 0.1
    },
    {
      opacity: 1,
      stagger: 0.05,
      duration: 1,
      ease: 'power4.out',
    }
  )

  gsap.fromTo(
    '#canvas-container',
    {
      y: '50%',
      opacity: 0
    },
    {
      opacity: 1,
      y: 0,
      duration: 2,
      ease: 'power4.out'
    }
  )

  const scrollAnimatedTextElems = gsap.utils.toArray('.scroll-animated-text') as HTMLElement[]
  for (let elem of scrollAnimatedTextElems) {
    const words = elem.querySelectorAll('.word')
    gsap.to(
      words,
      {
        opacity: 1,
        stagger: 0.05,
        duration: 1,
        ease: 'power4.out',
        scrollTrigger: {
          trigger: elem,
          start: 'top 80%'
        }
      }
    )
  }
}

function updateGSAPAnimations(animations: gsap.core.Tween[]) {
  for (let animation of animations) {
    console.log(animation.revert())
  }

  // empties the array
  animations.splice(0, animations.length)

  const logo = document.querySelector('.logo') as HTMLParagraphElement
  const headerAnimationLogo = gsap.to(logo, {
    marginLeft: -200,
    startAt: { marginLeft: 0 },
    ease: 'none',
    scrollTrigger: {
      trigger: 'header',
      start: 'top top',
      endTrigger: '.hero > div > h1',
      end: 'top top',
      scrub: 1,
    }
  })

  const headerAnimationBtns = gsap.to('header > div', {
    marginRight: -200,
    startAt: { marginRight: 0 },
    ease: 'none',
    scrollTrigger: {
      trigger: 'header',
      start: 'top top',
      endTrigger: '.hero > div > h1',
      end: 'top top',
      scrub: 1,
    }
  })

  const heroParallaxAnimation = gsap.to('#canvas-container', {
    y: '-25%',
    startAt: { y: 0 },
    ease: 'none',
    scrollTrigger: {
      trigger: 'body',
      start: 'top top',
      endTrigger: '.values',
      end: 'top top',
      scrub: 1,
    }
  })

  const bigBrandsAnimation = gsap.timeline({
    scrollTrigger: {
      trigger: '.big-brands',
      start: 'top top',
      end: '+=1500',
      pin: true,
      scrub: 1
    }
  })
  const bigBrandCards = gsap.utils.toArray('.big-brands > div > div > div > div') as HTMLElement[]
  for (let card of bigBrandCards) {
    bigBrandsAnimation.fromTo(card, {
      yPercent: 100,
      opacity: 0
    },
    {
      yPercent: 0,
      opacity: 1,
      stagger: 1,
      ease: 'none',
    })
  }

  const workWrapper = document.querySelector('.work > div > div') as HTMLDivElement
  const workContainer = workWrapper.querySelector('.work-container') as HTMLDivElement
  const recentWorkAnimation = gsap.to(workContainer, {
    x: -(workContainer.clientWidth - workWrapper.clientWidth),
    ease: 'none',
    scrollTrigger: {
      trigger: '.work-container',
      pin: true,
      scrub: 0.1,
      end: '+=' + workContainer.clientWidth * 1.5,
    }
  })

  const scrollAnimatedTextElems = gsap.utils.toArray('.scroll-animated-text-horizontal') as HTMLElement[]
  for (let elem of scrollAnimatedTextElems) {
    const words = elem.querySelectorAll('.word')
    const animation = gsap.to(
      words,
      {
        opacity: 1,
        stagger: 0.05,
        duration: 1,
        ease: 'power4.out',
        scrollTrigger: {
          trigger: elem,
          start: 'left 80%',
          containerAnimation: recentWorkAnimation,
        }
      }
    )
    animations.push(animation)
  }

  animations.push(
    headerAnimationLogo,
    headerAnimationBtns,
    heroParallaxAnimation,
    recentWorkAnimation
  )
}

function initializeThree() {
  const layerGroup = new LayerModel();
  const box = new THREE.BoxHelper( layerGroup, '#fff' );
  box.onBeforeRender = function() {
    this.update();
  };

  const canvasContainer = document.getElementById('canvas-container') as HTMLDivElement;

  const [canvasWidth, canvasHeight] = getCanvasDimensions(canvasContainer)

  const [renderer, camera, rubikCube, cubeletModels, scene] = initializeScene(canvasContainer, layerGroup, canvasWidth, canvasHeight);

  animate(renderer, scene, camera);

  manageRubikCubeAnimation(rubikCube, layerGroup, cubeletModels)

  window.addEventListener('resize', debounce(() => updateThreeCanvas(canvasContainer, camera, renderer)));
}

function updateThreeCanvas(canvasContainer: HTMLDivElement, camera: THREE.PerspectiveCamera, renderer: THREE.Renderer) {
  const [canvasWidth, canvasHeight] = getCanvasDimensions(canvasContainer)
  camera.aspect = canvasWidth / canvasHeight;
  renderer.setSize(canvasWidth, canvasHeight);
  camera.updateProjectionMatrix();
}

function initializeScene(canvasContainer: HTMLDivElement, layerGroup: LayerModel, canvasWidth: number, canvasHeight: number):  [THREE.WebGLRenderer, THREE.PerspectiveCamera, RubikCubeModel, THREE.Object3D[], THREE.Scene] {
  const scene = new THREE.Scene();
  
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
    antialias: true,
    alpha: true
  });

  renderer.setClearColor(0x000000, 0);
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

function getCanvasDimensions(canvasContainer: HTMLDivElement) {
  const canvasWidth = canvasContainer.offsetWidth
  const canvasHeight = Math.max(canvasWidth, MIN_CANVAS_HEIGHT)

  return [canvasWidth, canvasHeight]
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