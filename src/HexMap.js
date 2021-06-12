
import React, { useCallback, useImperativeHandle, useRef, useMemo, useState, useEffect, createRef } from 'react'
import ReactDOM from 'react-dom'
//import { HexCell } from './HexCell'
import * as THREE from 'three'
import { Vector3 } from 'three';
// import { HexCell } from './HexCell';



export function HexMap(props) {

    //store method
    // vertrice => [ [1,2,3], [1,2,3], ...]
    // face => [ 1,2,3, ...]
    //const itemEls = useRef(new Array())
    // var itemEls =  useRef();
    // useEffect(() => {
    //     console.log(itemEls);
    //   }, []);

    const [hexMetric, setHexMetric] = useState({
        outerRadius: props.outerRadius,
        innerRadius: props.outerRadius * 0.866025404,
        hexCoreScale: props.hexCoreScale
    })

    var cell_outer_vt = [
        [0, 0, hexMetric.outerRadius],
        [-hexMetric.innerRadius, 0, 0.5 * hexMetric.outerRadius],
        [-hexMetric.innerRadius, 0, -0.5 * hexMetric.outerRadius],
        [0, 0, -hexMetric.outerRadius],
        [hexMetric.innerRadius, 0, -0.5 * hexMetric.outerRadius],
        [hexMetric.innerRadius, 0, 0.5 * hexMetric.outerRadius],
        [0, 0, hexMetric.outerRadius]
    ]

    /* bridge face indices compare to sides
          
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


    var refArr =[]
    var hexCells = [];
    //shift  odd  z idx to the right(x -> +)
    for (var z = 0; z < props.size.z; z++) {
        var ra = [];
        var c = [];
        for (var x = 0; x < props.size.x; x++) {
            var info = {
                metric: hexMetric,
                idx: new THREE.Vector3(x, 0, z),
                position:
                    (z % 2 == 0) ?
                        [x * 2 * hexMetric.innerRadius, 0, z * 1.5 * hexMetric.outerRadius]
                        : [(x * 2 * hexMetric.innerRadius) + hexMetric.innerRadius, 0, z * 1.5 * hexMetric.outerRadius],
                vertices: {
                    outer: cell_outer_vt.map(a => a),
                    core: cell_outer_vt.map(a => [
                        a[0] * hexMetric.hexCoreScale,
                        a[1] * hexMetric.hexCoreScale,
                        a[2] * hexMetric.hexCoreScale,
                    ])
                },
                faces: {
                    core: null,
                    bridge: {
                        E: null,
                        SE: null,
                        SW: null
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
            ra.push(createRef());

        }
        hexCells.push(c)
        refArr.push(ra);
    }
    setNeighbor(hexCells);

    for (var z = 0; z < props.size.z; z++) {
        for (var x = 0; x < props.size.x; x++) {
            genCoreFace(hexCells, x, z);
            genBridgeFace(hexCells, x, z, hexMetric);
        }
    }


    const [cellArray, setCellArray] = useState(hexCells);


    var onChildClick = (e) => {
        updateCell(hexCells, hexMetric, e.x, e.z, 1);
        //inputRef.current?.coolAlert()
        if(hexCells[e.z][e.x].neighbor.W !== null){
            refArr[hexCells[e.z][e.x].neighbor.W.z][hexCells[e.z][e.x].neighbor.W.x].current?.coolAlert();
        }
        if(hexCells[e.z][e.x].neighbor.NW !== null){
            refArr[hexCells[e.z][e.x].neighbor.NW.z][hexCells[e.z][e.x].neighbor.NW.x].current?.coolAlert();
        }
        if(hexCells[e.z][e.x].neighbor.NE !== null){
            refArr[hexCells[e.z][e.x].neighbor.NE.z][hexCells[e.z][e.x].neighbor.NE.x].current?.coolAlert();
        }
        //refArr[e.z][e.x].current?.coolAlert();

    }

    // var hc = [];
    // var i = 0;
    // for(var z =0; z< hexCells.length; z++ ){
    //     for(var x =0; x< hexCells[z].length; x++)
    //     {
    //         hc.push(<HexCell info={hexCells[z][x]} ref={(element) => itemEls.current.push(element)} key={i} childClickEv={onChildClick} />)
    //         i++;
    //     }
    // }
    // return <group>{hc}</group>

    // return (hexCells.map(a => a.map(b => {
    //             return <HexCell ref={itemEls} info={b} childClickEv={onChildClick} /> 
    //     } )))
    // const childRef = useRef([]);
    // childRef.current[0] = <HexCell  info={hexCells[0][0]} childClickEv={onChildClick} />
    // return <HexCell ref={childRef[0]}  info={hexCells[0][0]} childClickEv={onChildClick} />;

    //var inputRef = createRef();
    //inputRef = <HexCell info={hexCells[0][0]} childClickEv={onChildClick} />
    //return <HexCell ref={inputRef} info={hexCells[0][0]} childClickEv={onChildClick} />;

    var hc = [];
    for (var z = 0; z < hexCells.length; z++) {
        for (var x = 0; x < hexCells[z].length; x++) {
            hc.push(<HexCell ref={refArr[z][x]} info={hexCells[z][x]}  childClickEv={onChildClick} />)
           
        }
    }
    return <group>{hc}</group>

    // return (
    //     {hexCells.map((item) => {
    //       const getRef = (element) => (itemsEls.current.push(element))
    //       return <p key={getRef}>{item}</p>
    //     })}
    //   )


}


function updateCell(arr, hexMetric, x, z, newY) {

    //update cell core
    for (var i = 0; i < arr[z][x].vertices.core.length; i++) {
        arr[z][x].vertices.core[i][1] = newY;
    }
    genCoreFace(arr, x, z);


    genBridgeFace(arr, x, z, hexMetric);
    if (arr[z][x].neighbor.W !== null) {
        genBridgeFace(arr, arr[z][x].neighbor.W.x, arr[z][x].neighbor.W.z, hexMetric);
    }
    if (arr[z][x].neighbor.NE !== null) {
        genBridgeFace(arr, arr[z][x].neighbor.NE.x, arr[z][x].neighbor.NE.z, hexMetric);
    }
    if (arr[z][x].neighbor.NW !== null) {
        genBridgeFace(arr, arr[z][x].neighbor.NW.x, arr[z][x].neighbor.NW.z, hexMetric);
    }




}

function genCoreFace(arr, x, z) {
    arr[z][x].faces.core = triangulateHexCore(arr[z][x].vertices.core)
}


function genBridgeFace(arr, x, z, hexMetric) {
    if (arr[z][x].neighbor.E !== null) {
        arr[z][x].faces.bridge.E = triangulateBridge(
            arr[z][x].vertices.core[4],
            arr[z][x].vertices.core[5],
            arr[arr[z][x].neighbor.E.z][arr[z][x].neighbor.E.x].vertices.core[2],
            arr[arr[z][x].neighbor.E.z][arr[z][x].neighbor.E.x].vertices.core[1],
            [2 * hexMetric.innerRadius, 0, 0]
        )
    }
    if (arr[z][x].neighbor.SE !== null) {
        arr[z][x].faces.bridge.SE = triangulateBridge(
            arr[z][x].vertices.core[5],
            arr[z][x].vertices.core[6],
            arr[arr[z][x].neighbor.SE.z][arr[z][x].neighbor.SE.x].vertices.core[3],
            arr[arr[z][x].neighbor.SE.z][arr[z][x].neighbor.SE.x].vertices.core[2],
            [hexMetric.innerRadius, 0, 1.5 * hexMetric.outerRadius]
        )
    }
    if (arr[z][x].neighbor.SW !== null) {
        arr[z][x].faces.bridge.SW = triangulateBridge(
            arr[z][x].vertices.core[0],
            arr[z][x].vertices.core[1],
            arr[arr[z][x].neighbor.SW.z][arr[z][x].neighbor.SW.x].vertices.core[4],
            arr[arr[z][x].neighbor.SW.z][arr[z][x].neighbor.SW.x].vertices.core[3],
            [-hexMetric.innerRadius, 0, 1.5 * hexMetric.outerRadius]
        )
    }
}

function triangulateBridge(ori_idx_1, ori_idx_2, target_idx_1, target_idx_2, offset) {
    var bf = [];
    bf.push(target_idx_1[0] + offset[0]); bf.push(target_idx_1[1]); bf.push(target_idx_1[2] + offset[2]);
    bf.push(ori_idx_1[0]); bf.push(ori_idx_1[1]); bf.push(ori_idx_1[2]);
    bf.push(target_idx_2[0] + offset[0]); bf.push(target_idx_2[1]); bf.push(target_idx_2[2] + offset[2]);

    bf.push(target_idx_2[0] + offset[0]); bf.push(target_idx_2[1]); bf.push(target_idx_2[2] + offset[2]);
    bf.push(ori_idx_1[0]); bf.push(ori_idx_1[1]); bf.push(ori_idx_1[2]);
    bf.push(ori_idx_2[0]); bf.push(ori_idx_2[1]); bf.push(ori_idx_2[2]);

    return bf;
}


function triangulateHexCore(cell_core_vt) {
    var res = [];
    for (var i = 0; i < cell_core_vt.length - 1; i++) {
        res.push(cell_core_vt[i][0]); res.push(cell_core_vt[i][1]); res.push(cell_core_vt[i][2]);
        res.push(0, cell_core_vt[i][1], 0);
        res.push(cell_core_vt[i + 1][0]); res.push(cell_core_vt[i + 1][1]); res.push(cell_core_vt[i + 1][2]);
    }
    return res;
}



function setNeighbor(arr) {
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

function updatevertices() {

}
function updateFaces() {

}

//export function HexCell(props) {
const HexCell = React.forwardRef(
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


        const update = useCallback(self => {
            self.needsUpdate = true
            self.parent.computeBoundingSphere()
        }, [])

        const [hovered, setHover] = useState(false)
        return (
            <group position={props.info.position}>
                <mesh
                    onClick={(e) => { props.childClickEv(props.info.idx); setCellInfo(!cellInfo) }}
                // onPointerOver={(e) => setHover(true)}
                // onPointerOut={(e) => setHover(false)} 
                >
                    <bufferGeometry attach="geometry" >
                        <bufferAttribute
                            attachObject={['attributes', 'position']}
                            array={vertices}
                            count={vertices.length / 3}
                            itemSize={3}
                            onUpdate={update}
                        />
                    </bufferGeometry>
                    {/* <meshBasicMaterial attach="material" color={hovered ? 'hotpink' : 'orange'} /> */}
                    <meshBasicMaterial attach="material" color='orange' />
                </mesh>
                {props.info.neighbor.SW && <mesh>
                    <bufferGeometry attach="geometry" >
                        <bufferAttribute
                            attachObject={['attributes', 'position']}
                            array={new Float32Array(props.info.faces.bridge.SW)}
                            count={props.info.faces.bridge.SW.length / 3}
                            itemSize={3}
                            onUpdate={update}
                        />
                    </bufferGeometry>
                    <meshBasicMaterial attach="material" color='blue' />
                </mesh>}
                {/* {props.info.neighbor.W && <mesh>
                <bufferGeometry attach="geometry" >
                    <bufferAttribute
                        attachObject={['attributes', 'position']}
                        array={new Float32Array(props.info.faces.bridge.W)}
                        count={props.info.faces.bridge.W.length / 3}
                        itemSize={3}
                        onUpdate={update}
                    />
                </bufferGeometry>
                <meshBasicMaterial attach="material" color='blue' />
            </mesh>}
            {props.info.neighbor.NW && <mesh>
                <bufferGeometry attach="geometry" >
                    <bufferAttribute
                        attachObject={['attributes', 'position']}
                        array={new Float32Array(props.info.faces.bridge.NW)}
                        count={props.info.faces.bridge.NW.length / 3}
                        itemSize={3}
                        onUpdate={update}
                    />
                </bufferGeometry>
                <meshBasicMaterial attach="material" color='blue' />
            </mesh>}
            {props.info.neighbor.NE && <mesh>
                <bufferGeometry attach="geometry" >
                    <bufferAttribute
                        attachObject={['attributes', 'position']}
                        array={new Float32Array(props.info.faces.bridge.NE)}
                        count={props.info.faces.bridge.NE.length / 3}
                        itemSize={3}
                        onUpdate={update}
                    />
                </bufferGeometry>
                <meshBasicMaterial attach="material" color='blue' />
            </mesh>} */}
                {props.info.neighbor.E && <mesh>
                    <bufferGeometry attach="geometry" >
                        <bufferAttribute
                            attachObject={['attributes', 'position']}
                            array={new Float32Array(props.info.faces.bridge.E)}
                            count={props.info.faces.bridge.E.length / 3}
                            itemSize={3}
                            onUpdate={update}
                        />
                    </bufferGeometry>
                    <meshBasicMaterial attach="material" color='blue' />
                </mesh>}
                {props.info.neighbor.SE && <mesh>
                    <bufferGeometry attach="geometry" >
                        <bufferAttribute
                            attachObject={['attributes', 'position']}
                            array={new Float32Array(props.info.faces.bridge.SE)}
                            count={props.info.faces.bridge.SE.length / 3}
                            itemSize={3}
                            onUpdate={update}
                        />
                    </bufferGeometry>
                    <meshBasicMaterial attach="material" color='blue' />
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




function HexCore(props) {

}





