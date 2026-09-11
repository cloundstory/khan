import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CanvasTexture, RepeatWrapping, type Group, type OrthographicCamera } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Book } from '../db/schema';
import { Volume } from './BookStudy';
import { bookShape } from './study';

type V = [number, number, number];
interface Props { books: Book[]; selectedId: string; onSelect: (id: string) => void; angle: number; mobile: boolean; onUnavailable: () => void }

export default function Diorama(props: Props) {
  const [motion, setMotion] = useState(() => !matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => { const q = matchMedia('(prefers-reduced-motion: reduce)'); const update = () => setMotion(!q.matches); q.addEventListener('change', update); return () => q.removeEventListener('change', update); }, []);
  return <><button className="room-motion" aria-pressed={motion} onClick={() => setMotion(v => !v)}>{motion ? 'พักการเคลื่อนไหว' : 'เปิดการเคลื่อนไหว'}</button><Boundary onUnavailable={props.onUnavailable}><Canvas orthographic shadows dpr={[1, 1.5]} frameloop={motion ? 'always' : 'demand'} camera={{ position: [6, 5, 11], near: .1, far: 50 }} gl={{ antialias: true }} fallback={<p>เปิดภาพสามมิติไม่ได้ เลือกดูแบบภาพแบนด้านบนได้ครับ</p>} aria-label="ห้องอ่านหนังสือสามมิติ เก้าอี้ โต๊ะ ชั้นสามระดับและหนังสือของคุณ">
    <color attach="background" args={['#e8dfcf']} /><Camera angle={props.angle} />
    <ambientLight intensity={1.2} /><hemisphereLight args={['#fff7e5', '#81715f', 1.2]} />
    <directionalLight position={[-3, 7, 5]} intensity={2.4} castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} shadow-bias={-.001} />
    <Room motion={motion} /><Books {...props} />
  </Canvas></Boundary></>;
}
class Boundary extends Component<{ children: ReactNode; onUnavailable: () => void }, { failed: boolean }> {
  state = { failed: false }; static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onUnavailable(); } render() { return this.state.failed ? null : this.props.children; }
}
function Camera({ angle }: { angle: number }) {
  const { camera, size, invalidate } = useThree();
  useEffect(() => { const c = camera as OrthographicCamera; const a = angle * Math.PI / 360; c.position.set(3 + Math.sin(a) * 5, 5.5, 12); c.lookAt(0, 1.7, 0); c.zoom = Math.min(size.width / 8.7, size.height / 6.8); c.updateProjectionMatrix(); invalidate(); }, [camera, size, angle, invalidate]);
  return null;
}
function Soft({ at, size, color = '#c4b59e', rotate = [0,0,0], fabric }: { at: V; size: V; color?: string; rotate?: V; fabric?: CanvasTexture }) {
  const geometry = useMemo(() => new RoundedBoxGeometry(...size, 3, Math.min(...size) * .22), [size[0],size[1],size[2]]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh position={at} rotation={rotate} geometry={geometry} castShadow receiveShadow><meshStandardMaterial color={color} roughness={.95} bumpMap={fabric} bumpScale={.035} /></mesh>;
}
function Ball({ at, size, color }: { at: V; size: V; color: string }) { return <mesh position={at} scale={size} castShadow receiveShadow><sphereGeometry args={[1,24,16]} /><meshStandardMaterial color={color} roughness={1} /></mesh>; }
function Plant({ at, motion, scale = 1 }: { at: V; motion: boolean; scale?: number }) {
  const leaves = useRef<Group>(null);
  useFrame(({ clock }) => { if (leaves.current) leaves.current.rotation.z = motion ? Math.sin(clock.elapsedTime * .65 + at[0]) * .035 : 0; });
  return <group position={at} scale={scale}><mesh position={[0,.2,0]} castShadow><cylinderGeometry args={[.23,.16,.4,24]} /><meshStandardMaterial color="#a47d61" roughness={1} /></mesh><group ref={leaves} position={[0,.4,0]}>{Array.from({length:7},(_,i) => <group key={i} rotation={[0,i*2.4,(i%2 ? 1 : -1)*.35]}><mesh position={[0,.19,0]}><cylinderGeometry args={[.009,.012,.38,5]} /><meshStandardMaterial color="#687153" /></mesh><mesh position={[.07,.35,0]} rotation={[0,0,-.55]} scale={[.105,.26,.04]} castShadow><sphereGeometry args={[1,12,8]} /><meshStandardMaterial color={i%2 ? '#72795a' : '#56654e'} roughness={1} /></mesh></group>)}</group></group>;
}
function Cat({ motion }: { motion: boolean }) {
  const body = useRef<Group>(null);
  useFrame(({ clock }) => { if (body.current) body.current.scale.y = motion ? 1 + Math.sin(clock.elapsedTime * 1.6) * .022 : 1; });
  return <group position={[.2,.12,1.15]} rotation={[0,-.4,0]}><group ref={body}><Ball at={[0,.15,0]} size={[.47,.22,.32]} color="#b7aa92" /><Ball at={[-.32,.17,.18]} size={[.22,.19,.19]} color="#c9bda6" />{[-.44,-.22].map(x => <mesh key={x} position={[x,.36,.15]} rotation={[0,0,x < -.3 ? -.2 : .2]} castShadow><coneGeometry args={[.09,.19,3]} /><meshStandardMaterial color="#a99a81" /></mesh>)}{[-.41,-.26].map(x => <Soft key={x} at={[x,.19,.351]} size={[.065,.012,.015]} color="#534c41" />)}<mesh position={[.1,.18,.15]} rotation={[Math.PI/2,0,.2]} castShadow><torusGeometry args={[.32,.085,10,24,Math.PI*1.5]} /><meshStandardMaterial color="#ab9a80" roughness={1} /></mesh></group></group>;
}
function Room({ motion }: { motion: boolean }) {
  const fabric = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d')!; x.fillStyle = '#999'; x.fillRect(0,0,128,128); for(let i=0;i<128;i+=4) { x.fillStyle = i%8 ? '#777' : '#bbb'; x.fillRect(i,0,1,128); x.fillRect(0,i,128,1); } const t = new CanvasTexture(c); t.wrapS=t.wrapT=RepeatWrapping; t.repeat.set(5,5); return t; }, []);
  useEffect(() => () => fabric.dispose(), [fabric]);
  return <group>
    <Soft at={[0,-.12,0]} size={[7.1,.22,4.8]} color="#9f8666" />
    {Array.from({length:12},(_,i) => <Soft key={i} at={[-3.25+i*.59,.005,0]} size={[.575,.025,4.65]} color={i%3 ? '#b49b7b' : '#aa9072'} />)}
    <Soft at={[0,2.25,-2.35]} size={[7.1,4.5,.16]} color="#d8cdb9" />
    <Soft at={[0,.14,-2.22]} size={[7,.22,.09]} color="#e6ddca" />
    <Soft at={[0,.055,.35]} size={[5.6,.065,3.35]} color="#c1b398" fabric={fabric} />
    {Array.from({length:23},(_,i) => <Soft key={i} at={[-2.64+i*.24,.094,.35]} size={[.013,.009,3.1]} color="#a3957e" />)}
    <Armchair><group position={[1.3,0,-.5]} rotation={[0,-.18,0]}>
      {[-.53,.53].flatMap(x => [-.45,.5].map(z => <Soft key={`${x}-${z}`} at={[x,.22,z]} size={[.16,.4,.16]} color="#715741" />))}
      <Soft at={[0,.58,0]} size={[1.55,.55,1.4]} fabric={fabric} />
      <Soft at={[0,1.32,-.48]} size={[1.5,1.45,.42]} rotate={[-.08,0,0]} fabric={fabric} />
      <Soft at={[0,.88,.09]} size={[1.04,.27,1.04]} color="#d1c3aa" fabric={fabric} />
      {[-.65,.65].map(x => <Soft key={x} at={[x,1.01,.08]} size={[.37,.62,1.38]} fabric={fabric} />)}
      <Soft at={[.06,1.27,-.16]} size={[.68,.62,.22]} rotate={[-.18,0,.09]} color="#61717b" fabric={fabric} />
    </group>
    </Armchair><group position={[-1.85,0,-1.85]}>{[-1.1,1.1].map(x => <Soft key={x} at={[x,1.5,0]} size={[.12,3,.5]} color="#89745b" />)}{[.48,1.42,2.36,3.08].map(y => <Soft key={y} at={[0,y,0]} size={[2.35,.12,.59]} color="#ad9474" />)}</group>
    <group position={[2.6,0,.72]}><Soft at={[0,.87,0]} size={[1.1,.13,1]} color="#987b59" />{[-.38,.38].flatMap(x=>[-.32,.32].map(z=><Soft key={`${x}-${z}`} at={[x,.43,z]} size={[.07,.8,.07]} color="#806449" />))}</group>
    <group position={[-.1,0,-1.35]}><mesh position={[0,.09,0]} castShadow><cylinderGeometry args={[.32,.35,.1,32]} /><meshStandardMaterial color="#6f6351" /></mesh><Soft at={[0,1.45,0]} size={[.045,2.8,.045]} color="#6c604b" /><mesh position={[0,2.73,0]} castShadow><cylinderGeometry args={[.29,.56,.73,40,1,true]} /><meshStandardMaterial color="#e1d2ad" roughness={1} side={2} /></mesh><pointLight position={[0,2.45,0]} color="#ffdfa6" intensity={1.4} distance={3} /></group>
    <Soft at={[2.05,3.12,-2.07]} size={[1.5,.1,.4]} color="#af9978" /><Plant at={[1.7,3.17,-2.03]} motion={motion} scale={.75} /><Plant at={[2.35,3.17,-2.03]} motion={motion} scale={.9} />
    <Cat motion={motion} />
    <mesh position={[-.35,3.61,-2.22]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.29,.29,.06,40]} /><meshStandardMaterial color="#eee5d2" /></mesh><Soft at={[-.35,3.69,-2.17]} size={[.015,.16,.018]} color="#5c574b" /><Soft at={[-.29,3.61,-2.17]} size={[.13,.015,.018]} color="#5c574b" />
  </group>;
}
function Books({ books, selectedId, onSelect }: Props) {
  const heights = new Map<string, number>();
  const counts = { pile:0, shelf:0, desk:0 };
  return <group>{books.map(book => {
    const i = counts[book.status]++; const scale = .65; const shape = bookShape(book.id); let position: V; let rotation: V;
    if(book.status === 'shelf') { const row = Math.floor(i/6); position = [-2.78+(i%6)*.34,.54+row*.94+shape.height*scale/2,-1.77]; rotation=[0,.55,0]; }
    else { const perStack = book.status === 'pile' ? 6 : 9; const col=Math.floor(i/perStack); const key=book.status+col; const beneath=heights.get(key) ?? 0; const d=shape.depth*scale; heights.set(key,beneath+d+.025); position=book.status==='pile' ? [-2.05+col*.72,.12+beneath+d/2,.65] : [2.38+col*.43,.945+beneath+d/2,.72]; rotation=[-Math.PI/2,0,Math.PI/2+(i%3-1)*.07]; }
    return <Volume key={book.id} book={book} position={position} rotation={rotation} scale={scale} selected={book.id===selectedId} onSelect={onSelect} toned={true} inspect={false} />;
  })}</group>;
}

function Armchair({ children }: { children: ReactNode }) {
  const [model, setModel] = useState<Group | null>(null);
  const { invalidate } = useThree();
  useEffect(() => {
    let active = true;
    let loaded: Group | null = null;
    const dispose = (root: Group) => root.traverse(object => {
      if ('isMesh' in object) {
        const mesh = object as import('three').Mesh;
        mesh.geometry.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach(material => material.dispose());
      }
    });
    new GLTFLoader().load(`${import.meta.env.BASE_URL}models/armchair-v1.glb`, gltf => {
      if (!active) { dispose(gltf.scene); return; }
      loaded = gltf.scene;
      loaded.traverse(object => { if ('isMesh' in object) { object.castShadow = true; object.receiveShadow = true; } });
      setModel(loaded); invalidate();
    }, undefined, () => { /* Retain the procedural chair if the optional model is unavailable. */ });
    return () => { active = false; if (loaded) dispose(loaded); };
  }, [invalidate]);
  return model ? <primitive object={model} position={[1.3,0,-.5]} rotation={[0,-.18,0]} /> : <>{children}</>;
}
