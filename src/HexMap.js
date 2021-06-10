
import React, { useCallback, useRef, useMemo, useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
//import { HexCell } from './HexCell'
import * as THREE from 'three'
import { Vector3 } from 'three';
// import { HexCell } from './HexCell';



export function HexMap(props) {

    const [hexMetric, setHexMetric] = useState({
        outerRadius: props.outerRadius,
        innerRadius: props.outerRadius * 0.866025404,
        hexCoreScale: props.hexCoreScale
    })

    var cell_outter_corner = [
        new Vector3(0, 0, hexMetric.outerRadius),
        new Vector3(-hexMetric.innerRadius, 0, 0.5 * hexMetric.outerRadius),
        new Vector3(-hexMetric.innerRadius, 0, -0.5 * hexMetric.outerRadius),
        new Vector3(0, 0, -hexMetric.outerRadius),
        new Vector3(hexMetric.innerRadius, 0, -0.5 * hexMetric.outerRadius),
        new Vector3(hexMetric.innerRadius, 0, 0.5 * hexMetric.outerRadius),
        new Vector3(0, 0, hexMetric.outerRadius)
    ]

    var cell_bridge_corner = [];
    for (var i = 0; i < cell_outter_corner.length - 1; i++) {
        var cb = getBridge_OutterPoints(cell_outter_corner[i], cell_outter_corner[i + 1], hexMetric.hexCoreScale);
        // console.log(cb);
        cell_bridge_corner.push(cb[0]);
        cell_bridge_corner.push(cb[1]);


    }

    var cell_core_corner = cell_outter_corner.map(a => new THREE.Vector3(
        a.x * hexMetric.hexCoreScale,
        a.y * hexMetric.hexCoreScale,
        a.z * hexMetric.hexCoreScale,
    ))


    //var cell_outer_face = [];
    var cell_core_face = [];
    for (var i = 0; i < cell_core_corner.length - 1; i++) {


        cell_core_face.push(cell_core_corner[i].x); cell_core_face.push(cell_core_corner[i].y); cell_core_face.push(cell_core_corner[i].z);
        cell_core_face.push(0, 0, 0);
        cell_core_face.push(cell_core_corner[i + 1].x); cell_core_face.push(cell_core_corner[i + 1].y); cell_core_face.push(cell_core_corner[i + 1].z);
    }

    var cell_bridge_face = [];
   
    for (var i = 0; i < cell_core_corner.length - 1; i++) {
        var bf = [];
        bf.push(cell_bridge_corner[i * 2].x); bf.push(cell_bridge_corner[i * 2].y); bf.push(cell_bridge_corner[i * 2].z);
        bf.push(cell_core_corner[i].x); bf.push(cell_core_corner[i].y); bf.push(cell_core_corner[i].z);
        bf.push(cell_bridge_corner[(i * 2) + 1].x); bf.push(cell_bridge_corner[(i * 2) + 1].y); bf.push(cell_bridge_corner[(i * 2) + 1].z);

        bf.push(cell_bridge_corner[(i * 2) + 1].x); bf.push(cell_bridge_corner[(i * 2) + 1].y); bf.push(cell_bridge_corner[(i * 2) + 1].z);
        bf.push(cell_core_corner[i].x); bf.push(cell_core_corner[i].y); bf.push(cell_core_corner[i].z);
        bf.push(cell_core_corner[i + 1].x); bf.push(cell_core_corner[i + 1].y); bf.push(cell_core_corner[i + 1].z);
        cell_bridge_face.push(bf);
    }

    /* face indices compare to sides
          
              /\
        2   /    \  3
          /        \
        /            \
       |              |
     1 |              |  4
        \            /
          \        /
        0   \    /  5
              \/

        SW  =   0  
        W   =   1
        NW  =   2
        NE  =   3
        E   =   4
        SE  =   5    
    */




    var hexCells = [];
    //shift  odd  z idx to the right(x -> +)
    for (var z = 0; z < props.size.z; z++) {
        var c = [];
        for (var x = 0; x < props.size.x; x++) {
            var info = {
                metric: hexMetric,
                idx: new THREE.Vector3(x, 0, z),
                position:
                    (z % 2 == 0) ?
                        [x * 2 * hexMetric.innerRadius, 0, z * 1.5 * hexMetric.outerRadius]
                        : [(x * 2 * hexMetric.innerRadius) + hexMetric.innerRadius, 0, z * 1.5 * hexMetric.outerRadius],
                vertrices: {
                    outer: cell_outter_corner,
                    core: cell_core_corner,
                    bridge: cell_bridge_corner
                },
                faces: {
                    core: cell_core_face,
                    bridge: {
                        SW: cell_bridge_face[0],
                        W: cell_bridge_face[1],
                        NW: cell_bridge_face[2],
                        NE: cell_bridge_face[3],
                        E: cell_bridge_face[4],
                        SE: cell_bridge_face[5]
                    }
                },
                neighbor: {
                    SW: null,
                    W: null,
                    NW: null,
                    NE: null,
                    E: null,
                    SE: null
                },

            }

            c.push(info)
        }
        hexCells.push(c)
    }
    setNeighbor(hexCells);
    const [cellArray, setCellArray] = useState({ hexCells });

    var hc = cellArray.hexCells.map(a => a.map(b => <HexCell info={b} />))
    return <group>{hc}</group>

}

function setNeighbor(arr) {
    console.log(arr.length);
    for (var z = 0; z < arr.length; z++) {
        for (var x = 0; x < arr[z].length; x++) {
            //set E and W
            if (x < arr[z].length - 1) {
                arr[z][x].neighbor.E = { x: x + 1, z: z }
                arr[z][x + 1].neighbor.W = { x: x, z: z }
            }

            //set N S
            if (z < arr.length - 1) {
                // inner cell
                if (x > 0 && x < arr[z].length - 1) {

                    if (z % 2 == 0) {
                        arr[z][x].neighbor.SE = { x: x, z: z + 1 }
                        arr[z + 1][x].neighbor.NW = { x: x, z: z }

                        arr[z][x].neighbor.SW = { x: x - 1, z: z + 1 }
                        arr[z + 1][x - 1].neighbor.NE = { x: x, z: z }
                    }
                    else {
                        arr[z][x].neighbor.SE = { x: x + 1, z: z + 1 }
                        arr[z + 1][x + 1].neighbor.NW = { x: x, z: z }

                        arr[z][x].neighbor.SW = { x: x, z: z + 1 }
                        arr[z + 1][x].neighbor.NE = { x: x, z: z }
                    }
                }
                // left edge cell
                else if (x == 0) {
                    if (z % 2 == 0) {
                        arr[z][x].neighbor.SE = { x: x, z: z + 1 }
                        arr[z + 1][x].neighbor.NW = { x: x, z: z }

                    }
                    else {
                        arr[z][x].neighbor.SE = { x: x + 1, z: z + 1 }
                        arr[z + 1][x + 1].neighbor.NW = { x: x, z: z }

                        arr[z][x].neighbor.SW = { x: x, z: z + 1 }
                        arr[z + 1][x].neighbor.NE = { x: x, z: z }
                    }
                }
                // right edge cell
                else if (x == arr[z].length - 1) {
                    if (z % 2 == 0) {
                        arr[z][x].neighbor.SE = { x: x, z: z + 1 }
                        arr[z + 1][x].neighbor.NW = { x: x, z: z }

                        arr[z][x].neighbor.SW = { x: x - 1, z: z + 1 }
                        arr[z + 1][x - 1].neighbor.NE = { x: x, z: z }
                    }
                    else {
                        arr[z][x].neighbor.SW = { x: x, z: z + 1 }
                        arr[z + 1][x].neighbor.NE = { x: x, z: z }
                    }
                }

            }
        }
    }

}


export function HexCell(props) {

    var ss = [];
    props.info.vertrices.outer.forEach(a => {
        ss.push(a.x); ss.push(a.y); ss.push(a.z);
    });

    const connerV = new Float32Array(ss);

    const vertices = new Float32Array(props.info.faces.core);


    const update = useCallback(self => {
        self.needsUpdate = true
        self.parent.computeBoundingSphere()
    }, [])

    const [hovered, setHover] = useState(false)
    return (
        <group position={props.info.position}>
            <mesh
                onClick={(e) => console.log(props.info.neighbor)}
                onPointerOver={(e) => setHover(true)}
                onPointerOut={(e) => setHover(false)} >
                <bufferGeometry attach="geometry" >
                    <bufferAttribute
                        attachObject={['attributes', 'position']}
                        array={vertices}
                        count={vertices.length / 3}
                        itemSize={3}
                        onUpdate={update}
                    />
                </bufferGeometry>
                <meshBasicMaterial attach="material" color={hovered ? 'hotpink' : 'orange'} />
            </mesh>
            {props.info.neighbor.SW &&<mesh>
                <bufferGeometry attach="geometry" >
                    <bufferAttribute
                        attachObject={['attributes', 'position']}
                        array={new Float32Array(props.info.faces.bridge.SW)}
                        count={props.info.faces.bridge.SW.length / 3}
                        itemSize={3}
                        onUpdate={update}
                    />
                </bufferGeometry>
                <meshBasicMaterial attach="material" color='red' />
            </mesh>}
            {props.info.neighbor.W &&<mesh>
                <bufferGeometry attach="geometry" >
                    <bufferAttribute
                        attachObject={['attributes', 'position']}
                        array={new Float32Array(props.info.faces.bridge.W)}
                        count={props.info.faces.bridge.W.length / 3}
                        itemSize={3}
                        onUpdate={update}
                    />
                </bufferGeometry>
                <meshBasicMaterial attach="material" color='red' />
            </mesh>}
            {props.info.neighbor.NW &&<mesh>
                <bufferGeometry attach="geometry" >
                    <bufferAttribute
                        attachObject={['attributes', 'position']}
                        array={new Float32Array(props.info.faces.bridge.NW)}
                        count={props.info.faces.bridge.NW.length / 3}
                        itemSize={3}
                        onUpdate={update}
                    />
                </bufferGeometry>
                <meshBasicMaterial attach="material" color='red' />
            </mesh>}
            {props.info.neighbor.NE &&<mesh>
                <bufferGeometry attach="geometry" >
                    <bufferAttribute
                        attachObject={['attributes', 'position']}
                        array={new Float32Array(props.info.faces.bridge.NE)}
                        count={props.info.faces.bridge.NE.length / 3}
                        itemSize={3}
                        onUpdate={update}
                    />
                </bufferGeometry>
                <meshBasicMaterial attach="material" color='red' />
            </mesh>}
            {props.info.neighbor.E &&<mesh>
                <bufferGeometry attach="geometry" >
                    <bufferAttribute
                        attachObject={['attributes', 'position']}
                        array={new Float32Array(props.info.faces.bridge.E)}
                        count={props.info.faces.bridge.E.length / 3}
                        itemSize={3}
                        onUpdate={update}
                    />
                </bufferGeometry>
                <meshBasicMaterial attach="material" color='red' />
            </mesh>}
            {props.info.neighbor.SE &&<mesh>
                <bufferGeometry attach="geometry" >
                    <bufferAttribute
                        attachObject={['attributes', 'position']}
                        array={new Float32Array(props.info.faces.bridge.SE)}
                        count={props.info.faces.bridge.SE.length / 3}
                        itemSize={3}
                        onUpdate={update}
                    />
                </bufferGeometry>
                <meshBasicMaterial attach="material" color='red' />
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



function getBridge_OutterPoints(outter_v1, outter_v2, hexcore_size_percent) {
    // v1 = less clock wise 
    // direction v1-> v2 clockwise
    // outter_v1 = hex cell edge of one side v1
    // outter_v1 = hex cell edge of one side v2
    // hexcore_size_percent = size of hexcore compare to max size hex cell (75% = 0.75)
    // var vector_out1_out2 = [(outter_v2[0] - outter_v1[0]) / 2, (outter_v2[1] - outter_v1[1]) / 2, (outter_v2[2] - outter_v1[2]) / 2];
    // var outter_mid_point = [outter_v1[0] + vector_out1_out2[0], outter_v1[1] + vector_out1_out2[1], outter_v1[2] + vector_out1_out2[2]];


    var vector_out1_out2 = new THREE.Vector3((outter_v2.x - outter_v1.x) / 2, (outter_v2.y - outter_v1.y) / 2, (outter_v2.z - outter_v1.z) / 2);
    var outter_mid_point = new THREE.Vector3(outter_v1.x + vector_out1_out2.x, outter_v1.y + vector_out1_out2.y, outter_v1.z + vector_out1_out2.z);

    var vector_midP_out1 = new THREE.Vector3(
        outter_v1.x - outter_mid_point.x,
        outter_v1.y - outter_mid_point.y,
        outter_v1.z - outter_mid_point.z
    );


    var vector_midP_out2 = new THREE.Vector3(
        outter_v2.x - outter_mid_point.x,
        outter_v2.y - outter_mid_point.y,
        outter_v2.z - outter_mid_point.z
    );

    var res_point_1 = new THREE.Vector3(
        outter_mid_point.x + (vector_midP_out1.x * hexcore_size_percent),
        outter_mid_point.y + (vector_midP_out1.y * hexcore_size_percent),
        outter_mid_point.z + (vector_midP_out1.z * hexcore_size_percent)
    )

    var res_point_2 = new THREE.Vector3(
        outter_mid_point.x + (vector_midP_out2.x * hexcore_size_percent),
        outter_mid_point.y + (vector_midP_out2.y * hexcore_size_percent),
        outter_mid_point.z + (vector_midP_out2.z * hexcore_size_percent)
    )

    return [res_point_1, res_point_2];
}

function HexCore(props) {

}





