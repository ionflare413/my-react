
import React, { useCallback, useImperativeHandle, useRef, useMemo, useState, useEffect, createRef } from 'react'
import ReactDOM from 'react-dom'
// import { HexCell } from './HexCell'
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

    var vt = []
    vt.push(cell_outer_vt[0]);
    for (var i = 0; i < cell_outer_vt.length - 1; i++) {

        genAlignPoints(cell_outer_vt[i], cell_outer_vt[i + 1], 5).map(a => vt.push(a));
    }
    // vt.push(cell_outer_vt[cell_outer_vt.length - 1]);



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
                idx: { x: x, z: z },
                mainColor: (z % 2 == 0) ? new THREE.Color('orange') : new THREE.Color('green'),
                position:
                    (z % 2 == 0) ?
                        [x * 2 * hexMetric.innerRadius, 0, z * 1.5 * hexMetric.outerRadius]
                        : [(x * 2 * hexMetric.innerRadius) + hexMetric.innerRadius,
                            0
                            , z * 1.5 * hexMetric.outerRadius],

                elevation: (x % 2 == 0) ? 0 : 0, //elevation must be exact the same as core vertex Y
                outer: {
                    vertices: vt.map(a => a)
                },
                core: {
                    vertices: vt.map(a => [a[0] * props.hexCoreScale, (x % 2 == 0) ? 0 : 0, a[2] * props.hexCoreScale]),
                    faces: []
                },
                bridge: {
                    E: {
                        quad: [],
                        vertices: [],
                        faces: [],
                        vtColor: []
                    },
                    SE: {
                        quad: [],
                        vertices: [],
                        faces: [],
                        vtColor: []
                    },
                    SW: {
                        quad: [],
                        vertices: [],
                        faces: [],
                        vtColor: []
                    },
                },
                joint: {
                    NE: {
                        quad: [],
                        vertices: [],
                        faces: [],
                        vtColor: []
                    },
                    SE: {
                        quad: [],
                        vertices: [],
                        faces: [],
                        vtColor: []
                    },
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
            genJointFace(hexCells, x, z, hexMetric);
        }
    }

    var onChildClick = (e) => {

        // hexCells[e.z][e.x].mainColor = new THREE.Color('green');

        updateCell(hexCells, hexMetric, e.x, e.z, hexCells[e.z][e.x].core.vertices[0][1] + 1);
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
            hc.push(<HexCell ref={refArr[z][x]} key={'z_' + z + '_x_' + x} info={hexCells[z][x]} childClickEv={onChildClick} />)
        }
    }
    return <group>
    {hc[1]}</group>
    // return <group>
    //     {hc}</group>


}


function updateCell(arr, hexMetric, x, z, newY) {

    //update cell core
    for (var i = 0; i < arr[z][x].core.vertices.length; i++) {
        arr[z][x].core.vertices[i][1] = newY;
        arr[z][x].elevation = newY;
    }
    genCoreFace(arr, x, z);
    console.log(arr[z][x].elevation);

    genBridgeFace(arr, x, z, hexMetric);

    // if (arr[z][x].neighbor.W !== null) {
    //     genBridgeFace(arr, arr[z][x].neighbor.W.x, arr[z][x].neighbor.W.z, hexMetric);
    // }
    // if (arr[z][x].neighbor.NE !== null) {
    //     genBridgeFace(arr, arr[z][x].neighbor.NE.x, arr[z][x].neighbor.NE.z, hexMetric);
    // }
    // if (arr[z][x].neighbor.NW !== null) {
    //     genBridgeFace(arr, arr[z][x].neighbor.NW.x, arr[z][x].neighbor.NW.z, hexMetric);
    // }


    // genJointFace(arr, x, z, hexMetric);
    // if (arr[z][x].neighbor.SW !== null) {
    //     genJointFace(arr, arr[z][x].neighbor.SW.x, arr[z][x].neighbor.SW.z, hexMetric)
    // }
    // if (arr[z][x].neighbor.W !== null) {
    //     genJointFace(arr, arr[z][x].neighbor.W.x, arr[z][x].neighbor.W.z, hexMetric)
    // }
    // if (arr[z][x].neighbor.NW !== null) {
    //     genJointFace(arr, arr[z][x].neighbor.NW.x, arr[z][x].neighbor.NW.z, hexMetric)
    // }
}



function genCoreFace(arr, x, z) {
    arr[z][x].core.faces = triangulateHexCore(arr[z][x].core.vertices)
}

function genBridgeFace(arr, x, z, hexMetric) {
    // E


    if (arr[z][x].neighbor.E !== null) {

        var offset = [(2 * hexMetric.innerRadius), 0, 0];
        var targetCell_idx = arr[z][x].neighbor.E;
        var p1 = 20, p2 = 16, p3 = 4, p4 = 8;

        arr[z][x].bridge.E.faces = [];
        arr[z][x].bridge.E.vtColor = [];


        if ( Math.abs(arr[targetCell_idx.z][targetCell_idx.x].elevation - arr[z][x].elevation) <= 1
        && Math.abs(arr[targetCell_idx.z][targetCell_idx.x].elevation - arr[z][x].elevation) > 0
        )
        
        {
            var resTerrace = genBridgeTarraceQuad(arr[z][x], arr[targetCell_idx.z][targetCell_idx.x], p1, p2, p3, offset,
                arr[z][x].mainColor, arr[targetCell_idx.z][targetCell_idx.x].mainColor, hexMetric);
            var quadArr = resTerrace.quad;
            var colorArr = resTerrace.vtColor;
            console.log(quadArr);
            // for (var i = 0; i < quadArr.length; i++) {
            for (var i = 0; i < quadArr.length -1; i++) {
                var res = genFace_vtColor_FromQuad(quadArr[i][0], quadArr[i][1], quadArr[i][2], quadArr[i][3],
                    [0, 0, 0], colorArr[i][0],
                    colorArr[i][0]
                );
                res.faces.forEach(i => arr[z][x].bridge.E.faces.push(i));
                res.vtColor.forEach(i => arr[z][x].bridge.E.vtColor.push(i));
            }
        }
        else {
            var quadArr = [];
            for (var i = 0; i < 4; i++) {
                quadArr.push([arr[z][x].core.vertices[p2 + i + 1], arr[z][x].core.vertices[p2 + i],
                arr[targetCell_idx.z][targetCell_idx.x].core.vertices[p4 - 1 - i],
                arr[targetCell_idx.z][targetCell_idx.x].core.vertices[p4 - i]])
            }

            for (var i = 0; i < quadArr.length; i++) {
                var res = genFace_vtColor_FromQuad(quadArr[i][0], quadArr[i][1], quadArr[i][2], quadArr[i][3],
                    offset,
                    // colortoArr(arr[z][x].mainColor),
                    // colortoArr(arr[targetCell_idx.z][targetCell_idx.x].mainColor)
                    [1, 0, 0],
                    [1, 0, 0]

                );

                res.faces.forEach(i => arr[z][x].bridge.E.faces.push(i));
                res.vtColor.forEach(i => arr[z][x].bridge.E.vtColor.push(i));
            }
        }

    }


    /*
    //SE
    if (arr[z][x].neighbor.SE !== null) {
        var offset = [hexMetric.innerRadius, 0, 1.5 * hexMetric.outerRadius];
        var targetCell_idx = arr[z][x].neighbor.SE;
        var p1 = 24, p2 = 20, p3 = 8, p4 = 12;
        arr[z][x].bridge.SE.faces = [];
        arr[z][x].bridge.SE.vtColor = [];

        // if ((Math.abs(arr[targetCell_idx.z][targetCell_idx.x].elevation - arr[z][x].elevation) > 0)
        // &&(Math.abs(arr[targetCell_idx.z][targetCell_idx.x].elevation - arr[z][x].elevation) <= 1)
        // ) 
        if (Math.abs(arr[targetCell_idx.z][targetCell_idx.x].elevation - arr[z][x].elevation) == 1) {
            var resTerrace = genBridgeTarraceQuad(arr[z][x], arr[targetCell_idx.z][targetCell_idx.x], p1, p2, p3, offset,
                arr[z][x].mainColor, arr[targetCell_idx.z][targetCell_idx.x].mainColor, hexMetric);
            var quadArr = resTerrace.quad;
            var colorArr = resTerrace.vtColor;
            for (var i = 0; i < quadArr.length; i++) {
                var res = genFace_vtColor_FromQuad(quadArr[i][0], quadArr[i][1], quadArr[i][2], quadArr[i][3],
                    [0, 0, 0], colorArr[i][0],
                    colorArr[i][0]
                );
                res.faces.forEach(i => arr[z][x].bridge.SE.faces.push(i));
                res.vtColor.forEach(i => arr[z][x].bridge.SE.vtColor.push(i));
            }
        }
        else {
           
            var quadArr = [];
            for (var i = 0; i < 4; i++) {
                quadArr.push([arr[z][x].core.vertices[p2 + i + 1], arr[z][x].core.vertices[p2 + i],
                arr[targetCell_idx.z][targetCell_idx.x].core.vertices[p4 - 1 - i],
                arr[targetCell_idx.z][targetCell_idx.x].core.vertices[p4 - i]])
            }
            for (var i = 0; i < quadArr.length; i++) {
                var res = genFace_vtColor_FromQuad(quadArr[i][0], quadArr[i][1], quadArr[i][2], quadArr[i][3],
                    offset, colortoArr(arr[z][x].mainColor),
                    colortoArr(arr[targetCell_idx.z][targetCell_idx.x].mainColor)
                );
                res.faces.forEach(i => arr[z][x].bridge.SE.faces.push(i));
                res.vtColor.forEach(i => arr[z][x].bridge.SE.vtColor.push(i));
            }
        }

    }
    */

    /*
    //SW
    if (arr[z][x].neighbor.SW !== null) {
        var offset = [-hexMetric.innerRadius, 0, 1.5 * hexMetric.outerRadius]
        var targetCell_idx = arr[z][x].neighbor.SW;
        var p1 = 4, p2 = 0, p3 = 12, p4 = 16;
        arr[z][x].bridge.SW.faces = [];
        arr[z][x].bridge.SW.vtColor = [];

        // if ((Math.abs(arr[targetCell_idx.z][targetCell_idx.x].elevation - arr[z][x].elevation) > 0)
        // &&(Math.abs(arr[targetCell_idx.z][targetCell_idx.x].elevation - arr[z][x].elevation) <= 1)
        // ) 
        if (Math.abs(arr[targetCell_idx.z][targetCell_idx.x].elevation - arr[z][x].elevation) <= 1) {
            var resTerrace = genBridgeTarraceQuad(arr[z][x], arr[targetCell_idx.z][targetCell_idx.x], p1, p2, p3, offset,
                arr[z][x].mainColor, arr[targetCell_idx.z][targetCell_idx.x].mainColor, hexMetric);
            var quadArr = resTerrace.quad;
            var colorArr = resTerrace.vtColor;
            for (var i = 0; i < quadArr.length; i++) {
                var res = genFace_vtColor_FromQuad(quadArr[i][0], quadArr[i][1], quadArr[i][2], quadArr[i][3],
                    [0, 0, 0], colorArr[i][0],
                    colorArr[i][0]
                );
                res.faces.forEach(i => arr[z][x].bridge.SW.faces.push(i));
                res.vtColor.forEach(i => arr[z][x].bridge.SW.vtColor.push(i));
            }
        }
        else {
            var quadArr = [];
            for (var i = 0; i < 4; i++) {
                quadArr.push([arr[z][x].core.vertices[p2 + i + 1], arr[z][x].core.vertices[p2 + i],
                arr[targetCell_idx.z][targetCell_idx.x].core.vertices[p4 - 1 - i],
                arr[targetCell_idx.z][targetCell_idx.x].core.vertices[p4 - i]])
            }
            for (var i = 0; i < quadArr.length; i++) {
                var res = genFace_vtColor_FromQuad(quadArr[i][0], quadArr[i][1], quadArr[i][2], quadArr[i][3],
                    offset, colortoArr(arr[z][x].mainColor),
                    colortoArr(arr[targetCell_idx.z][targetCell_idx.x].mainColor)

                );
                res.faces.forEach(i => arr[z][x].bridge.SW.faces.push(i));
                res.vtColor.forEach(i => arr[z][x].bridge.SW.vtColor.push(i));
            }
        }

    }
    */
    function genBridgeTarraceQuad(thisCell, targetCell, thisCell_p1, thisCell_p2, targetCell_p1, targetCell_offset, thisCell_color, targetCell_color, hexMetric) {
        var totalStepLevel = 3;
        var stepHeight = (targetCell.elevation - thisCell.elevation) / totalStepLevel;
        var bridgeHorizontalLength = 2 * (hexMetric.outerRadius - hexMetric.innerRadius);
        var stepLength = bridgeHorizontalLength / (totalStepLevel)
        var stepRatio = (totalStepLevel * 2) - 1;

        var direction = [
            targetCell.core.vertices[targetCell_p1][0] + targetCell_offset[0] - thisCell.core.vertices[thisCell_p1][0],
            0,
            targetCell.core.vertices[targetCell_p1][2] + targetCell_offset[2] - thisCell.core.vertices[thisCell_p1][2],
        ]
        var quadArr = [];
        var startPoint_1 = thisCell_p1;
        var startPoint_2 = thisCell_p2;
        var currentP1 = arr[z][x].core.vertices[startPoint_1];
        var currentP2 = arr[z][x].core.vertices[startPoint_2];
        var nextP_1 = [];
        var nextP_2 = [];



        var blendedColor = [];




        for (var i = 0; i < stepRatio; i++) {
            //slope
            if (i % 2 == 0) {
                nextP_1 = [currentP1[0] + (direction[0] / stepRatio), currentP1[1] + stepHeight, currentP1[2] + (direction[2] / stepRatio)]
                nextP_2 = [currentP2[0] + (direction[0] / stepRatio), currentP2[1] + stepHeight, currentP2[2] + (direction[2] / stepRatio)]
            }
            //step
            else {
                nextP_1 = [currentP1[0] + (direction[0] / stepRatio), currentP1[1], currentP1[2] + (direction[2] / stepRatio)]
                nextP_2 = [currentP2[0] + (direction[0] / stepRatio), currentP2[1], currentP2[2] + (direction[2] / stepRatio)]
            }
            quadArr.push([currentP1, currentP2, nextP_1, nextP_2]);

            var blendC = [];

            blendC.push([
                targetCell_color.r * ((i) / stepRatio) + thisCell_color.r * ((stepRatio - i) / stepRatio),
                targetCell_color.g * ((i) / stepRatio) + thisCell_color.g * ((stepRatio - i) / stepRatio),
                targetCell_color.b * ((i) / stepRatio) + thisCell_color.b * ((stepRatio - i) / stepRatio),
            ]);
            blendC.push([
                targetCell_color.r * ((i) / stepRatio) + thisCell_color.r * ((stepRatio - i) / stepRatio),
                targetCell_color.g * ((i) / stepRatio) + thisCell_color.g * ((stepRatio - i) / stepRatio),
                targetCell_color.b * ((i) / stepRatio) + thisCell_color.b * ((stepRatio - i) / stepRatio),
            ]);
            blendC.push([
                targetCell_color.r * ((i) / stepRatio) + thisCell_color.r * ((stepRatio - i) / stepRatio),
                targetCell_color.g * ((i) / stepRatio) + thisCell_color.g * ((stepRatio - i) / stepRatio),
                targetCell_color.b * ((i) / stepRatio) + thisCell_color.b * ((stepRatio - i) / stepRatio),
            ]);
            blendC.push([
                targetCell_color.r * ((i) / stepRatio) + thisCell_color.r * ((stepRatio - i) / stepRatio),
                targetCell_color.g * ((i) / stepRatio) + thisCell_color.g * ((stepRatio - i) / stepRatio),
                targetCell_color.b * ((i) / stepRatio) + thisCell_color.b * ((stepRatio - i) / stepRatio),
            ]);
            blendedColor.push(blendC);




            currentP1 = nextP_1.map(a => a);
            currentP2 = nextP_2.map(a => a);
        }

        return { quad: quadArr, vtColor: blendedColor };
    }
    /*
    function genBridgeTarraceQuad(thisCell, targetCell, thisCell_p1, thisCell_p2, targetCell_p1, targetCell_offset, thisCell_color, targetCell_color, hexMetric) {
        var totalStepLevel = 3;
        var stepHeight = (targetCell.elevation - thisCell.elevation) / totalStepLevel;
        var bridgeHorizontalLength = 2 * (hexMetric.outerRadius - hexMetric.innerRadius);
        var stepLength = bridgeHorizontalLength / (totalStepLevel)
        var stepRatio = (totalStepLevel * 2) - 1;

        var direction = [
            targetCell.core.vertices[targetCell_p1][0] + targetCell_offset[0] - thisCell.core.vertices[thisCell_p1][0],
            0,
            targetCell.core.vertices[targetCell_p1][2] + targetCell_offset[2] - thisCell.core.vertices[thisCell_p1][2],
        ]
        var quadArr = [];
        var startPoint_1 = thisCell_p1;
        var startPoint_2 = thisCell_p2;
        var currentP1 = arr[z][x].core.vertices[startPoint_1];
        var currentP2 = arr[z][x].core.vertices[startPoint_2];
        var nextP_1 = [];
        var nextP_2 = [];



        var blendedColor = [];




        for (var i = 0; i < stepRatio; i++) {
            //slope
            if (i % 2 == 0) {
                nextP_1 = [currentP1[0] + (direction[0] / stepRatio), currentP1[1] + stepHeight, currentP1[2] + (direction[2] / stepRatio)]
                nextP_2 = [currentP2[0] + (direction[0] / stepRatio), currentP2[1] + stepHeight, currentP2[2] + (direction[2] / stepRatio)]
            }
            //step
            else {
                nextP_1 = [currentP1[0] + (direction[0] / stepRatio), currentP1[1], currentP1[2] + (direction[2] / stepRatio)]
                nextP_2 = [currentP2[0] + (direction[0] / stepRatio), currentP2[1], currentP2[2] + (direction[2] / stepRatio)]
            }
            quadArr.push([currentP1, currentP2, nextP_1, nextP_2]);

            var blendC = [];

            blendC.push([
                targetCell_color.r * ((i) / stepRatio) + thisCell_color.r * ((stepRatio - i) / stepRatio),
                targetCell_color.g * ((i) / stepRatio) + thisCell_color.g * ((stepRatio - i) / stepRatio),
                targetCell_color.b * ((i) / stepRatio) + thisCell_color.b * ((stepRatio - i) / stepRatio),
            ]);
            blendC.push([
                targetCell_color.r * ((i) / stepRatio) + thisCell_color.r * ((stepRatio - i) / stepRatio),
                targetCell_color.g * ((i) / stepRatio) + thisCell_color.g * ((stepRatio - i) / stepRatio),
                targetCell_color.b * ((i) / stepRatio) + thisCell_color.b * ((stepRatio - i) / stepRatio),
            ]);
            blendC.push([
                targetCell_color.r * ((i) / stepRatio) + thisCell_color.r * ((stepRatio - i) / stepRatio),
                targetCell_color.g * ((i) / stepRatio) + thisCell_color.g * ((stepRatio - i) / stepRatio),
                targetCell_color.b * ((i) / stepRatio) + thisCell_color.b * ((stepRatio - i) / stepRatio),
            ]);
            blendC.push([
                targetCell_color.r * ((i) / stepRatio) + thisCell_color.r * ((stepRatio - i) / stepRatio),
                targetCell_color.g * ((i) / stepRatio) + thisCell_color.g * ((stepRatio - i) / stepRatio),
                targetCell_color.b * ((i) / stepRatio) + thisCell_color.b * ((stepRatio - i) / stepRatio),
            ]);
            blendedColor.push(blendC);




            currentP1 = nextP_1.map(a => a);
            currentP2 = nextP_2.map(a => a);
        }

        return { quad: quadArr, vtColor: blendedColor };
    }
    */
}

function genJointFace(arr, x, z, hexMetric) {
    if ((arr[z][x].neighbor.NE !== null) && (arr[z][x].neighbor.E !== null)) {
        arr[z][x].joint.NE.faces = triangulateJoint(
            arr[z][x].core.vertices[16],
            arr[arr[z][x].neighbor.NE.z][arr[z][x].neighbor.NE.x].core.vertices[0],
            arr[arr[z][x].neighbor.E.z][arr[z][x].neighbor.E.x].core.vertices[8],
            [hexMetric.innerRadius, 0, -1.5 * hexMetric.outerRadius],
            [2 * hexMetric.innerRadius, 0, 0]
        )

        arr[z][x].joint.NE.vtColor = createVertexColorJoint(arr[z][x].mainColor,
            arr[arr[z][x].neighbor.NE.z][arr[z][x].neighbor.NE.x].mainColor,
            arr[arr[z][x].neighbor.E.z][arr[z][x].neighbor.E.x].mainColor);
    }

    if ((arr[z][x].neighbor.E !== null) && (arr[z][x].neighbor.SE !== null)) {
        arr[z][x].joint.SE.faces = triangulateJoint(
            arr[z][x].core.vertices[20],
            arr[arr[z][x].neighbor.E.z][arr[z][x].neighbor.E.x].core.vertices[4],
            arr[arr[z][x].neighbor.SE.z][arr[z][x].neighbor.SE.x].core.vertices[12],
            [2 * hexMetric.innerRadius, 0, 0],
            [hexMetric.innerRadius, 0, 1.5 * hexMetric.outerRadius],
        )

        arr[z][x].joint.SE.vtColor = createVertexColorJoint(arr[z][x].mainColor,
            arr[arr[z][x].neighbor.E.z][arr[z][x].neighbor.E.x].mainColor,
            arr[arr[z][x].neighbor.SE.z][arr[z][x].neighbor.SE.x].mainColor);
    }

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



function colortoArr(threeColor) {
    return [threeColor.r, threeColor.g, threeColor.b];
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



function genFace_vtColor_FromQuad(tl, tr, bl, br, offset, topColor, botColor) {

    //top mean this hex 
    //bot mean neighbor /// clockwise

    var bf = [];
    var bc = [];
    //faces
    bf.push(br[0] + offset[0]); bf.push(br[1] + offset[1]); bf.push(br[2] + offset[2]);
    bf.push(tr[0]); bf.push(tr[1]); bf.push(tr[2]);
    bf.push(bl[0] + offset[0]); bf.push(bl[1] + offset[1]); bf.push(bl[2] + offset[2]);

    bf.push(bl[0] + offset[0]); bf.push(bl[1] + + offset[1]); bf.push(bl[2] + + offset[2]);
    bf.push(tr[0]); bf.push(tr[1]); bf.push(tr[2]);
    bf.push(tl[0]); bf.push(tl[1]); bf.push(tl[2]);

    //color
    bc.push(botColor[0]); bc.push(botColor[1]); bc.push(botColor[2]);
    bc.push(topColor[0]); bc.push(topColor[1]); bc.push(topColor[2]);
    bc.push(botColor[0]); bc.push(botColor[1]); bc.push(botColor[2]);

    bc.push(botColor[0]); bc.push(botColor[1]); bc.push(botColor[2]);
    bc.push(topColor[0]); bc.push(topColor[1]); bc.push(topColor[2]);
    bc.push(topColor[0]); bc.push(topColor[1]); bc.push(topColor[2]);

    return { faces: bf, vtColor: bc }
}

function genAlignPoints(p1, p2, expectPointsNum) {
    //var eachPointPercent = 100/expectPointsNum;
    var direction = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
    var lengthRatio = direction.map(a => a / (expectPointsNum - 1));
    var res = [];
    for (var i = 1; i < expectPointsNum; i++) {
        res.push([p1[0] + (i * lengthRatio[0]), p1[1] + (i * lengthRatio[1]), p1[2] + (i * lengthRatio[2])])
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



const HexCell = React.forwardRef(
    (props, ref) => {

        const coolAlert = () => {
            //alert("x:" + props.info.idx.x + ", z:" + props.info.idx.z);
            setCellInfo(!cellInfo);
        };
        useImperativeHandle(ref, () => ({ coolAlert }));

        const [cellInfo, setCellInfo] = useState(false)



        var ss = [];
        props.info.outer.vertices.forEach((a, i) => {
            ss.push(a[0]); ss.push(a[1]); ss.push(a[2]);
        });

        var connerV = new Float32Array(ss);

        console.log(props.info.bridge.E.faces);

        var vertices = new Float32Array(props.info.core.faces);

        const update = useCallback(self => {
            self.needsUpdate = true
            self.parent.computeBoundingSphere()
            self.parent.computeVertexNormals();
        }, [])
        const updateBufferColor = useCallback(self => {
			self.needsUpdate = true
			// self.needsUpdate = true
			// self.parent.computeBoundingSphere()
		}, [])


        const [hovered, setHover] = useState(false)

        return (
            <group position={props.info.position}>
                <mesh
                    onClick={(e) => { e.stopPropagation(); props.childClickEv(props.info.idx); setCellInfo(!cellInfo); }}
                    // onPointerOver={(e) => { e.stopPropagation(); setHover(true) }}
                    // onPointerOut={(e) => { e.stopPropagation(); setHover(false) }}
                >
                    <bufferGeometry attach="geometry">
                        <bufferAttribute
                            attachObject={['attributes', 'position']}
                            array={vertices}
                            count={vertices.length / 3}
                            itemSize={3}
                            onUpdate={update}
                        />
                    </bufferGeometry>

                    <meshBasicMaterial attach="material" color={hovered ? 'hotpink' : props.info.mainColor} />
                </mesh>
                {(props.info.bridge.E.faces.length>0) && <mesh >
                    <bufferGeometry attach="geometry" >
                        <bufferAttribute
                            attachObject={['attributes', 'position']}
                            array={new Float32Array(props.info.bridge.E.faces)}
                            count={props.info.bridge.E.faces.length / 3}
                            itemSize={3}
                            onUpdate={update}
                        />
                        <bufferAttribute
                            attachObject={['attributes', 'color']}
                            array={new Float32Array(props.info.bridge.E.vtColor)}
                            count={props.info.bridge.E.vtColor.length / 3}
                            itemSize={3}
                            onUpdate={updateBufferColor}
                        />
                    </bufferGeometry>
                    <meshPhongMaterial attach="material" vertexColors={true} />
                    {/* <meshBasicMaterial attach="material" color='blue' /> */}
                </mesh>}
                {props.info.neighbor.SE && <mesh >
                    <bufferGeometry attach="geometry" >
                        <bufferAttribute
                            attachObject={['attributes', 'position']}
                            array={new Float32Array(props.info.bridge.SE.faces)}
                            count={props.info.bridge.SE.faces.length / 3}
                            itemSize={3}
                            onUpdate={update}
                        />
                        <bufferAttribute
                            attachObject={['attributes', 'color']}
                            array={new Float32Array(props.info.bridge.SE.vtColor)}
                            count={props.info.bridge.SE.vtColor.length / 3}
                            itemSize={3}
                            onUpdate={update}
                        />
                    </bufferGeometry>
                    <meshPhongMaterial attach="material" vertexColors={true} />
                    {/* <meshBasicMaterial attach="material" color='blue' /> */}
                </mesh>}
                {props.info.neighbor.SW && <mesh >
                    <bufferGeometry attach="geometry" >
                        <bufferAttribute
                            attachObject={['attributes', 'position']}
                            array={new Float32Array(props.info.bridge.SW.faces)}
                            count={props.info.bridge.SW.faces.length / 3}
                            itemSize={3}
                            onUpdate={update}
                        />
                        <bufferAttribute
                            attachObject={['attributes', 'color']}
                            array={new Float32Array(props.info.bridge.SW.vtColor)}
                            count={props.info.bridge.SW.vtColor.length / 3}
                            itemSize={3}
                            onUpdate={update}
                        />
                    </bufferGeometry>
                    <meshPhongMaterial attach="material" vertexColors={true} />
                    {/* <meshBasicMaterial attach="material" color='blue' /> */}
                </mesh>}
                {(props.info.joint.NE.faces.length > 0) && <mesh >
                    <bufferGeometry attach="geometry">
                        <bufferAttribute
                            attachObject={['attributes', 'position']}
                            array={new Float32Array(props.info.joint.NE.faces)}
                            count={props.info.joint.NE.faces.length / 3}
                            itemSize={3}
                            onUpdate={update}
                        />
                        <bufferAttribute
                            attachObject={['attributes', 'color']}
                            array={new Float32Array(props.info.joint.NE.vtColor)}
                            count={props.info.joint.NE.vtColor.length / 3}
                            itemSize={3}
                            onUpdate={update}
                        />
                    </bufferGeometry>
                    <meshPhongMaterial attach="material" vertexColors={true} />
                </mesh>}
                {(props.info.joint.SE.faces.length > 0) && <mesh >
                    <bufferGeometry attach="geometry">
                        <bufferAttribute
                            attachObject={['attributes', 'position']}
                            array={new Float32Array(props.info.joint.SE.faces)}
                            count={props.info.joint.SE.faces.length / 3}
                            itemSize={3}
                            onUpdate={update}
                        />
                        <bufferAttribute
                            attachObject={['attributes', 'color']}
                            array={new Float32Array(props.info.joint.SE.vtColor)}
                            count={props.info.joint.SE.vtColor.length / 3}
                            itemSize={3}
                            onUpdate={update}
                        />
                    </bufferGeometry>
                    <meshPhongMaterial attach="material" vertexColors={true} />
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



