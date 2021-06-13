

import React, { useImperativeHandle, useCallback, useRef, useMemo, useState } from 'react'
import ReactDOM from 'react-dom'
import { Canvas, useFrame } from '@react-three/fiber'

import * as THREE from 'three'
import { Html } from "@react-three/drei"

export const HexCell = React.forwardRef(
	(props, ref) => {
		const coolAlert = () => {
			//alert("x:" + props.info.idx.x + ", z:" + props.info.idx.z);
			setCellInfo(!cellInfo);
		};
		useImperativeHandle(ref, () => ({ coolAlert }));

		const [cellInfo, setCellInfo] = useState(false)
		var ss = [];
		props.info.vertices.outer.forEach(a => {
			ss.push(a[0]); ss.push(a[1]); ss.push(a[2]);
		});

		var connerV = new Float32Array(ss);

		var vertices = new Float32Array(props.info.faces.core);
		//var t_color = new Float32Array(props.info.faces.core.map(a => 1));


		// const colors = [];
		// const color = new THREE.Color();



		// colors.push(0, 0, 1);
		// colors.push(0, 0, 1);
		// colors.push(0.5, 0, 0.5);
		// colors.push(0.5, 0, 0.5);
		// colors.push(0, 0, 1);
		// colors.push(0.5, 0, 0.5);



		// props.info.faces.core.map(a=> {

		// 	colors.push( 1, 0, 0 );
		// 	colors.push( 0, 0, 1 );
		// 	colors.push( 1, 0, 0 );
		// });

		// var t_color = new Float32Array(props.info.faces.core.map((a,i) => {
		// 	if(i%2 ==0){
		// 		colors.push( 0, 1, 0 );
		// 	}
		// 	else{
		// 		colors.push( 1, 0, 0 );
		// 	}
		// 	//color.setHSL( i / 6, 1.0, 0.5 );
		// 	//colors.push( color.r, color.g, color.b );
		// 	colors.push( 0, 1, 0 );
		// }));


		const update = useCallback(self => {
			self.needsUpdate = true
			self.parent.computeBoundingSphere()
		}, [])

		const updateGeo = useCallback(self => {
			self.computeVertexNormals();
			// self.needsUpdate = true
			// self.parent.computeBoundingSphere()
		}, [])

		const updateBufferColor = useCallback(self => {
			self.needsUpdate = true
			// self.needsUpdate = true
			// self.parent.computeBoundingSphere()
		}, [])


		const [hovered, setHover] = useState(false)
		return (
			<group position={props.info.position}>
				<mesh receiveShadow castShadow
					onClick={(e) => { e.stopPropagation(); props.childClickEv(props.info.idx); setCellInfo(!cellInfo); }}
					onPointerOver={(e) => { e.stopPropagation(); setHover(true) }}
					onPointerOut={(e) => { e.stopPropagation(); setHover(false) }}
				>
					<bufferGeometry attach="geometry" onUpdate={updateGeo}>
						<bufferAttribute
							attachObject={['attributes', 'position']}
							array={vertices}
							count={vertices.length / 3}
							itemSize={3}
							onUpdate={update}
						/>
					</bufferGeometry>
					<meshBasicMaterial attach="material" color={props.info.mainColor} />
					{/* <meshStandardMaterial  attach="material" color='orange'/> */}
					{/* <meshBasicMaterial attach="material" color={hovered ? 'hotpink' : 'orange'}  /> */}
					{/* <meshBasicMaterial attach="material" color={props.info.color.outer} /> */}
					{/* <meshStandardMaterial attach="material" color={props.info.color.core} transparent /> */}
					{/* <meshPhongMaterial attach="material"  vertexColors={true} /> */}
					{/* <meshBasicMaterial attach="material" vertexColors={true} /> */}
				</mesh>
				{props.info.neighbor.SW && <mesh>
					<bufferGeometry attach="geometry"  onUpdate={updateGeo} >
						<bufferAttribute
							attachObject={['attributes', 'position']}
							array={new Float32Array(props.info.faces.bridge.SW)}
							count={props.info.faces.bridge.SW.length / 3}
							itemSize={3}
							onUpdate={update}
						/>
						<bufferAttribute
							attachObject={['attributes', 'color']}
							array={new Float32Array(props.info.vertexColor.bridge.SW)}
							count={props.info.vertexColor.bridge.SW.length / 3}
							itemSize={3}
							onUpdate={updateBufferColor}
						/>
					</bufferGeometry>
					<meshBasicMaterial attach="material" vertexColors={true} /> 
				</mesh>}
				{props.info.neighbor.E && <mesh>
					<bufferGeometry attach="geometry" onUpdate={updateGeo} >
						<bufferAttribute
							attachObject={['attributes', 'position']}
							array={new Float32Array(props.info.faces.bridge.E)}
							count={props.info.faces.bridge.E.length / 3}
							itemSize={3}
							onUpdate={update}
						/>
						<bufferAttribute
							attachObject={['attributes', 'color']}
							array={new Float32Array(props.info.vertexColor.bridge.E)}
							count={props.info.vertexColor.bridge.E.length / 3}
							itemSize={3}
							onUpdate={updateBufferColor}
						/>
					</bufferGeometry>
					
					<meshBasicMaterial attach="material" vertexColors={true} /> 
				</mesh>}
				{props.info.neighbor.SE && <mesh>
					<bufferGeometry attach="geometry" onUpdate={updateGeo} >
						<bufferAttribute
							attachObject={['attributes', 'position']}
							array={new Float32Array(props.info.faces.bridge.SE)}
							count={props.info.faces.bridge.SE.length / 3}
							itemSize={3}
							onUpdate={update}
						/>
						<bufferAttribute
							attachObject={['attributes', 'color']}
							array={new Float32Array(props.info.vertexColor.bridge.SE)}
							count={props.info.vertexColor.bridge.SE.length / 3}
							itemSize={3}
							onUpdate={updateBufferColor}
						/>
					</bufferGeometry>
					
					<meshBasicMaterial attach="material" vertexColors={true} /> 
				</mesh>}


				{props.info.faces.joint.NE && <mesh>
					<bufferGeometry attach="geometry" onUpdate={updateGeo}>
						<bufferAttribute
							attachObject={['attributes', 'position']}
							array={new Float32Array(props.info.faces.joint.NE)}
							count={props.info.faces.joint.NE.length / 3}
							itemSize={3}
							onUpdate={update}
						/>
						<bufferAttribute
							attachObject={['attributes', 'color']}
							array={new Float32Array(props.info.vertexColor.joint.NE)}
							count={props.info.vertexColor.joint.NE.length / 3}
							itemSize={3}
							onUpdate={updateBufferColor}
						/>
					</bufferGeometry>
					<meshBasicMaterial attach="material" vertexColors={true} /> 
				</mesh>}

				{props.info.faces.joint.SE && <mesh> 
					<bufferGeometry attach="geometry" onUpdate={updateGeo}>
						<bufferAttribute
							attachObject={['attributes', 'position']}
							array={new Float32Array(props.info.faces.joint.SE)}
							count={props.info.faces.joint.SE.length / 3}
							itemSize={3}
							onUpdate={update}
						/>
						<bufferAttribute
							attachObject={['attributes', 'color']}
							array={new Float32Array(props.info.vertexColor.joint.SE)}
							count={props.info.vertexColor.joint.SE.length / 3}
							itemSize={3}
							onUpdate={updateBufferColor}
						/>
					</bufferGeometry>
					<meshBasicMaterial attach="material" vertexColors={true} /> 
				</mesh>}








				<line>
					<bufferGeometry attach="geometry">
						<bufferAttribute
							attachObject={['attributes', 'position']}
							array={connerV}
							count={connerV.length / 3}
							itemSize={3}
							onUpdate={update}
						/>
					</bufferGeometry>
					<lineBasicMaterial name="material" color='green' />
				</line>
			</group>
		);
	}
);

