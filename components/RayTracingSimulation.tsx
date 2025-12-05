import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import GUI from 'lil-gui';

const RayTracingSimulation: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mountRef.current) return;

    // --- 1. Setup Scene, Camera, Renderer ---
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Optimizing pixel ratio
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // Cinema-quality lighting
    renderer.toneMappingExposure = 1.0;
    
    // Append renderer to the DOM
    mountRef.current.appendChild(renderer.domElement);

    // --- 2. Controls (Mouse interaction) ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // --- 3. Load Environment (Street HDRI) ---
    const hdriLoader = new RGBELoader();
    const hdriUrl = 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/belfast_farmhouse_1k.hdr';

    let environmentTexture: THREE.DataTexture | null = null;

    hdriLoader.load(
      hdriUrl,
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.background = texture;
        scene.environment = texture;
        environmentTexture = texture;
        setLoading(false);
      },
      undefined,
      (err) => {
        console.error('An error occurred loading the HDRI:', err);
        setLoading(false); // Hide loading even if failed so user sees something
      }
    );

    // --- 4. Create Spheres ---
    const geometry = new THREE.SphereGeometry(1, 64, 64);

    // Material 1 (Left Sphere - Silver)
    const material1 = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 1.0,
      roughness: 0.05,
    });
    const sphere1 = new THREE.Mesh(geometry, material1);
    sphere1.position.x = -1.2;
    scene.add(sphere1);

    // Material 2 (Right Sphere - Gold)
    const material2 = new THREE.MeshStandardMaterial({
      color: 0xffaa00, // Gold tint
      metalness: 1.0,
      roughness: 0.2,
    });
    const sphere2 = new THREE.Mesh(geometry, material2);
    sphere2.position.x = 1.2;
    scene.add(sphere2);

    // --- 5. GUI Interface for Parameters ---
    const gui = new GUI({ title: 'Material Settings' });
    // Adjust GUI position to not overlap if needed, but default is top-right
    
    // Customize GUI container style slightly via JS if needed, but default is fine.
    
    const folder1 = gui.addFolder('Left Sphere (Silver)');
    folder1.add(material1, 'metalness', 0, 1).name('Metalness');
    folder1.add(material1, 'roughness', 0, 1).name('Roughness');
    folder1.addColor(material1, 'color').name('Color');

    const folder2 = gui.addFolder('Right Sphere (Gold)');
    folder2.add(material2, 'metalness', 0, 1).name('Metalness');
    folder2.add(material2, 'roughness', 0, 1).name('Roughness');
    folder2.addColor(material2, 'color').name('Color');

    const envFolder = gui.addFolder('Environment');
    const envParams = { exposure: 1.0, rotation: 0 };
    
    envFolder.add(envParams, 'exposure', 0, 2)
      .name('Brightness')
      .onChange((v: number) => {
        renderer.toneMappingExposure = v;
      });
      
    envFolder.add(envParams, 'rotation', 0, 360)
      .name('Rotate World')
      .onChange((v: number) => {
        const radians = v * (Math.PI / 180);
        scene.backgroundRotation.y = radians;
        scene.environmentRotation.y = radians;
      });

    // --- 6. Animation Loop ---
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Slow floating animation
      const time = Date.now() * 0.001;
      sphere1.position.y = Math.sin(time) * 0.1;
      sphere2.position.y = Math.sin(time + 2) * 0.1;

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // --- Handle Window Resize ---
    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onWindowResize, false);

    // --- Cleanup ---
    return () => {
      window.removeEventListener('resize', onWindowResize);
      cancelAnimationFrame(animationId);
      
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }

      // Dispose Three.js resources
      geometry.dispose();
      material1.dispose();
      material2.dispose();
      renderer.dispose();
      if (environmentTexture) environmentTexture.dispose();
      
      // Destroy GUI
      gui.destroy();
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-black">
      {/* Container for Three.js Canvas */}
      <div ref={mountRef} className="w-full h-full block" />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white font-sans text-2xl pointer-events-none z-10 flex flex-col items-center gap-4">
            <svg className="animate-spin h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Loading 3D Environment...</span>
        </div>
      )}
      
      {/* Informational overlay (optional polish) */}
      {!loading && (
        <div className="absolute bottom-4 left-4 text-white/50 text-xs font-sans pointer-events-none select-none">
          Use mouse to rotate (Left Click), zoom (Scroll), and pan (Right Click).
        </div>
      )}
    </div>
  );
};

export default RayTracingSimulation;