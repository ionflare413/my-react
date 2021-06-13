
import React, { useCallback, useImperativeHandle, useRef, useMemo, useState, useEffect, createRef } from 'react'
import ReactDOM from 'react-dom'
import { HexCell } from './HexCell'
import * as THREE from 'three'
import { Vector3 } from 'three';
// import { HexCell } from './HexCell';



export function HexMap(props) {

    //store method
    // vertrice => [ [1,2,3], [1,2,3], ...]
    // face => [ 1,2,3, ...]

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


    var refArr = []
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
                mainColor: new THREE.Color('orange'),
                vertexColor: {
                    core: null,
                    bridge: {
                        E: null,
                        SE: null,
                        SW: null
                    },
                    joint: {
                        NE: null,
                        SE: null
                    }
                },
                faces: {
                    core: null,
                    bridge: {
                        E: null,
                        SE: null,
                        SW: null
                    },
                    joint: {
                        NE: null,
                        SE: null
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
            genBridge_Face_vtColor(hexCells, x, z, hexMetric);
            genJoint_Face_vtColor(hexCells, x, z, hexMetric);
        }
    }


    const [cellArray, setCellArray] = useState(hexCells);


    var onChildClick = (e) => {

        hexCells[e.z][e.x].mainColor = new THREE.Color('red');

        updateCell(hexCells, hexMetric, e.x, e.z, hexCells[e.z][e.x].vertices.core[0][1] + 1);
        //inputRef.current?.coolAlert()
        if (hexCells[e.z][e.x].neighbor.W !== null) {
            refArr[hexCells[e.z][e.x].neighbor.W.z][hexCells[e.z][e.x].neighbor.W.x].current?.coolAlert();
        }
        if (hexCells[e.z][e.x].neighbor.NW !== null) {
            refArr[hexCells[e.z][e.x].neighbor.NW.z][hexCells[e.z][e.x].neighbor.NW.x].current?.coolAlert();
        }
        if (hexCells[e.z][e.x].neighbor.NE !== null) {
            refArr[hexCells[e.z][e.x].neighbor.NE.z][hexCells[e.z][e.x].neighbor.NE.x].current?.coolAlert();
        }
        if (hexCells[e.z][e.x].neighbor.SW !== null) {
            refArr[hexCells[e.z][e.x].neighbor.SW.z][hexCells[e.z][e.x].neighbor.SW.x].current?.coolAlert();
        }
    }

    var hc = [];
    for (var z = 0; z < hexCells.length; z++) {
        for (var x = 0; x < hexCells[z].length; x++) {
            hc.push(<HexCell ref={refArr[z][x]} info={hexCells[z][x]} childClickEv={onChildClick} />)

        }
    }

    return <group>
        {hc}</group>

}


function updateCell(arr, hexMetric, x, z, newY) {

    //update cell core
    for (var i = 0; i < arr[z][x].vertices.core.length; i++) {
        arr[z][x].vertices.core[i][1] = newY;
    }
    genCoreFace(arr, x, z);


    genBridge_Face_vtColor(arr, x, z, hexMetric);
    if (arr[z][x].neighbor.W !== null) {
        genBridge_Face_vtColor(arr, arr[z][x].neighbor.W.x, arr[z][x].neighbor.W.z, hexMetric);
    }
    if (arr[z][x].neighbor.NE !== null) {
        genBridge_Face_vtColor(arr, arr[z][x].neighbor.NE.x, arr[z][x].neighbor.NE.z, hexMetric);
    }
    if (arr[z][x].neighbor.NW !== null) {
        genBridge_Face_vtColor(arr, arr[z][x].neighbor.NW.x, arr[z][x].neighbor.NW.z, hexMetric);
    }


    genJoint_Face_vtColor(arr, x, z, hexMetric);
    if (arr[z][x].neighbor.SW !== null) {
        genJoint_Face_vtColor(arr, arr[z][x].neighbor.SW.x, arr[z][x].neighbor.SW.z, hexMetric)
    }
    if (arr[z][x].neighbor.W !== null) {
        genJoint_Face_vtColor(arr, arr[z][x].neighbor.W.x, arr[z][x].neighbor.W.z, hexMetric)
    }
    if (arr[z][x].neighbor.NW !== null) {
        genJoint_Face_vtColor(arr, arr[z][x].neighbor.NW.x, arr[z][x].neighbor.NW.z, hexMetric)
    }
}

function genCoreFace(arr, x, z) {
    arr[z][x].faces.core = triangulateHexCore(arr[z][x].vertices.core)
}

function genBridge_Face_vtColor(arr, x, z, hexMetric) {
    if (arr[z][x].neighbor.E !== null) {
        arr[z][x].faces.bridge.E = triangulateBridge(
            arr[z][x].vertices.core[4],
            arr[z][x].vertices.core[5],
            arr[arr[z][x].neighbor.E.z][arr[z][x].neighbor.E.x].vertices.core[2],
            arr[arr[z][x].neighbor.E.z][arr[z][x].neighbor.E.x].vertices.core[1],
            [2 * hexMetric.innerRadius, 0, 0]
        )
        arr[z][x].vertexColor.bridge.E = createVertexColorBridge(arr[z][x].mainColor, arr[arr[z][x].neighbor.E.z][arr[z][x].neighbor.E.x].mainColor);
    }
    if (arr[z][x].neighbor.SE !== null) {
        arr[z][x].faces.bridge.SE = triangulateBridge(
            arr[z][x].vertices.core[5],
            arr[z][x].vertices.core[6],
            arr[arr[z][x].neighbor.SE.z][arr[z][x].neighbor.SE.x].vertices.core[3],
            arr[arr[z][x].neighbor.SE.z][arr[z][x].neighbor.SE.x].vertices.core[2],
            [hexMetric.innerRadius, 0, 1.5 * hexMetric.outerRadius]
        )
        arr[z][x].vertexColor.bridge.SE = createVertexColorBridge(arr[z][x].mainColor, arr[arr[z][x].neighbor.SE.z][arr[z][x].neighbor.SE.x].mainColor);
    }
    if (arr[z][x].neighbor.SW !== null) {
        arr[z][x].faces.bridge.SW = triangulateBridge(
            arr[z][x].vertices.core[0],
            arr[z][x].vertices.core[1],
            arr[arr[z][x].neighbor.SW.z][arr[z][x].neighbor.SW.x].vertices.core[4],
            arr[arr[z][x].neighbor.SW.z][arr[z][x].neighbor.SW.x].vertices.core[3],
            [-hexMetric.innerRadius, 0, 1.5 * hexMetric.outerRadius]
        )

        arr[z][x].vertexColor.bridge.SW = createVertexColorBridge(arr[z][x].mainColor, arr[arr[z][x].neighbor.SW.z][arr[z][x].neighbor.SW.x].mainColor);
    }
}

function genJoint_Face_vtColor(arr, x, z, hexMetric) {
    if ((arr[z][x].neighbor.NE !== null) && (arr[z][x].neighbor.E !== null)) {
        arr[z][x].faces.joint.NE = triangulateJoint(
            arr[z][x].vertices.core[4],
            arr[arr[z][x].neighbor.NE.z][arr[z][x].neighbor.NE.x].vertices.core[0],
            arr[arr[z][x].neighbor.E.z][arr[z][x].neighbor.E.x].vertices.core[2],
            [hexMetric.innerRadius, 0, -1.5 * hexMetric.outerRadius],
            [2 * hexMetric.innerRadius, 0, 0]
        )

        arr[z][x].vertexColor.joint.NE = createVertexColorJoint(arr[z][x].mainColor,
            arr[arr[z][x].neighbor.NE.z][arr[z][x].neighbor.NE.x].mainColor,
            arr[arr[z][x].neighbor.E.z][arr[z][x].neighbor.E.x].mainColor);
    }
    if ((arr[z][x].neighbor.E !== null) && (arr[z][x].neighbor.SE !== null)) {
        arr[z][x].faces.joint.SE = triangulateJoint(
            arr[z][x].vertices.core[5],
            arr[arr[z][x].neighbor.E.z][arr[z][x].neighbor.E.x].vertices.core[1],
            arr[arr[z][x].neighbor.SE.z][arr[z][x].neighbor.SE.x].vertices.core[3],
            [2 * hexMetric.innerRadius, 0, 0],
            [hexMetric.innerRadius, 0, 1.5 * hexMetric.outerRadius],
        )

        arr[z][x].vertexColor.joint.SE = createVertexColorJoint(arr[z][x].mainColor,
            arr[arr[z][x].neighbor.E.z][arr[z][x].neighbor.E.x].mainColor,
            arr[arr[z][x].neighbor.SE.z][arr[z][x].neighbor.SE.x].mainColor);
    }

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
function createVertexColorBridge(origin_color, target_color) {
    /** param type is THREE.Color */
    var bc = [];
    bc.push(target_color.r, target_color.g, target_color.b);
    bc.push(origin_color.r, origin_color.g, origin_color.b);
    bc.push(target_color.r, target_color.g, target_color.b);

    bc.push(target_color.r, target_color.g, target_color.b);
    bc.push(origin_color.r, origin_color.g, origin_color.b);
    bc.push(origin_color.r, origin_color.g, origin_color.b);

    return bc;
}

function triangulateJoint(ori_1, target_1, target_2, offset_target_1, offset_target_2) {
    var tf = [];
    tf.push(target_1[0] + offset_target_1[0]); tf.push(target_1[1]); tf.push(target_1[2] + + offset_target_1[2]);
    tf.push(ori_1[0]); tf.push(ori_1[1]); tf.push(ori_1[2]);
    tf.push(target_2[0] + offset_target_2[0]); tf.push(target_2[1]); tf.push(target_2[2] + + offset_target_2[2]);
    return tf;
}

function createVertexColorJoint(origin_color, target_1_color, target_2_color) {
    /** param type is THREE.Color */
    var bc = [];
    bc.push(target_1_color.r, target_1_color.g, target_1_color.b);
    bc.push(origin_color.r, origin_color.g, origin_color.b);
    bc.push(target_2_color.r, target_2_color.g, target_2_color.b);


    return bc;
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





