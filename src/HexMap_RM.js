
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


    var stepThreshold = 0.25;
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
                        type: null,
                        quad: [],
                        vertices: [],
                        faces: [],
                        vtColor: []
                    },
                    SE: {
                        type: null,
                        quad: [],
                        vertices: [],
                        faces: [],
                        vtColor: []
                    },
                    SW: {
                        type: null,
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
            genBridgeFace(hexCells, x, z, hexMetric, stepThreshold);
            genJointFace(hexCells, x, z, hexMetric);
        }
    }


    var onChildClick = (e) => {

        // hexCells[e.z][e.x].mainColor = new THREE.Color('green');

        updateCell(hexCells, hexMetric, e.x, e.z, hexCells[e.z][e.x].core.vertices[0][1] + stepThreshold, stepThreshold);
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
    // return <group>
    //     {hc[1]}</group>
    return <group>
        {hc}</group>


}


function updateCell(arr, hexMetric, x, z, newY, stepThreshold) {

    //update cell core
    for (var i = 0; i < arr[z][x].core.vertices.length; i++) {
        arr[z][x].core.vertices[i][1] = newY;
        arr[z][x].elevation = newY;
    }
    genCoreFace(arr, x, z);
    genBridgeFace(arr, x, z, hexMetric, stepThreshold);
    console.log(arr)
    if (arr[z][x].neighbor.W !== null) {
        genBridgeFace(arr, arr[z][x].neighbor.W.x, arr[z][x].neighbor.W.z, hexMetric, stepThreshold);
    }
    if (arr[z][x].neighbor.NE !== null) {
        genBridgeFace(arr, arr[z][x].neighbor.NE.x, arr[z][x].neighbor.NE.z, hexMetric, stepThreshold);
    }
    if (arr[z][x].neighbor.NW !== null) {
        genBridgeFace(arr, arr[z][x].neighbor.NW.x, arr[z][x].neighbor.NW.z, hexMetric, stepThreshold);
    }


    genJointFace(arr, x, z, hexMetric);
    if (arr[z][x].neighbor.SW !== null) {
        genJointFace(arr, arr[z][x].neighbor.SW.x, arr[z][x].neighbor.SW.z, hexMetric)
    }
    if (arr[z][x].neighbor.W !== null) {
        genJointFace(arr, arr[z][x].neighbor.W.x, arr[z][x].neighbor.W.z, hexMetric)
    }
    if (arr[z][x].neighbor.NW !== null) {
        genJointFace(arr, arr[z][x].neighbor.NW.x, arr[z][x].neighbor.NW.z, hexMetric)
    }
}



function genCoreFace(arr, x, z) {
    arr[z][x].core.faces = triangulateHexCore(arr[z][x].core.vertices)
}

function genBridgeFace(arr, x, z, hexMetric, stepThreshold) {
    // E
    if (arr[z][x].neighbor.E !== null) {
        // ref var;
        var thisCell = arr[z][x];
        var neighborCell = arr[arr[z][x].neighbor.E.z][arr[z][x].neighbor.E.x];
        var offset = [(2 * hexMetric.innerRadius), 0, 0];
        var p1 = 20, p2 = 16, p3 = 4, p4 = 8;
        thisCell.bridge.E.faces = [];
        thisCell.bridge.E.vtColor = [];
        thisCell.bridge.E.type = defineBridgeType(thisCell, neighborCell, stepThreshold);

        if (thisCell.elevation == 0 && neighborCell.elevation == 0) {
            for (var idx = 0; idx < 4; idx++) {
                var resTerrace = genBridgeTarraceQuad(thisCell, neighborCell, p1 - idx, p1 - idx - 1, p3 + idx, offset, thisCell.mainColor, neighborCell.mainColor, hexMetric);
                var quadArr = resTerrace.quad;
                var colorArr = resTerrace.vtColor;
                for (var i = 0; i < quadArr.length; i++) {
                    var res = genFace_vtColor_FromQuad(quadArr[i][0], quadArr[i][1], quadArr[i][2], quadArr[i][3], [0, 0, 0], colorArr[i][0], colorArr[i][0]);
                    res.faces.forEach(i => thisCell.bridge.E.faces.push(i));
                    res.vtColor.forEach(i => thisCell.bridge.E.vtColor.push(i));
                }
                thisCell.bridge.E.quad = quadArr;
            }
        } else if (Math.abs(thisCell.elevation - neighborCell.elevation) == stepThreshold) {
            var resTerrace = genBridgeTarraceQuad(thisCell, neighborCell, p1, p2, p3, offset, thisCell.mainColor, neighborCell.mainColor, hexMetric);
            var quadArr = resTerrace.quad;
            var colorArr = resTerrace.vtColor;
            for (var i = 0; i < quadArr.length; i++) {
                var res = genFace_vtColor_FromQuad(quadArr[i][0], quadArr[i][1], quadArr[i][2], quadArr[i][3], [0, 0, 0], colorArr[i][0], colorArr[i][0]);
                res.faces.forEach(i => thisCell.bridge.E.faces.push(i));
                res.vtColor.forEach(i => thisCell.bridge.E.vtColor.push(i));
            }
            thisCell.bridge.E.quad = quadArr;
        }
        else {
            var quadArr = [];
            for (var i = 0; i < 4; i++) {
                quadArr.push([thisCell.core.vertices[p2 + i + 1], thisCell.core.vertices[p2 + i],
                neighborCell.core.vertices[p4 - 1 - i], neighborCell.core.vertices[p4 - i]])
            }
            for (var i = 0; i < quadArr.length; i++) {
                var res = genFace_vtColor_FromQuad(quadArr[i][0], quadArr[i][1], quadArr[i][2], quadArr[i][3],
                    offset, colortoArr(thisCell.mainColor), colortoArr(neighborCell.mainColor));
                res.faces.forEach(i => thisCell.bridge.E.faces.push(i));
                res.vtColor.forEach(i => thisCell.bridge.E.vtColor.push(i));
            }
            thisCell.bridge.E.quad = quadArr;
        }
    }
    //SE
    if (arr[z][x].neighbor.SE !== null) {
        // ref var;
        var thisCell = arr[z][x];
        var neighborCell = arr[arr[z][x].neighbor.SE.z][arr[z][x].neighbor.SE.x];
        var offset = [hexMetric.innerRadius, 0, 1.5 * hexMetric.outerRadius];
        var p1 = 24, p2 = 20, p3 = 8, p4 = 12;
        thisCell.bridge.SE.faces = [];
        thisCell.bridge.SE.vtColor = [];
        thisCell.bridge.SE.type = defineBridgeType(thisCell, neighborCell, stepThreshold);

        if (thisCell.elevation == 0 && neighborCell.elevation == 0) {
            for (var idx = 0; idx < 4; idx++) {
                var resTerrace = genBridgeTarraceQuad(thisCell, neighborCell, p1 - idx, p1 - idx - 1, p3 + idx, offset, thisCell.mainColor, neighborCell.mainColor, hexMetric);
                var quadArr = resTerrace.quad;
                var colorArr = resTerrace.vtColor;
                for (var i = 0; i < quadArr.length; i++) {
                    var res = genFace_vtColor_FromQuad(quadArr[i][0], quadArr[i][1], quadArr[i][2], quadArr[i][3], [0, 0, 0], colorArr[i][0], colorArr[i][0]);
                    res.faces.forEach(i => thisCell.bridge.SE.faces.push(i));
                    res.vtColor.forEach(i => thisCell.bridge.SE.vtColor.push(i));
                }
                thisCell.bridge.SE.quad = quadArr;
            }
        } else if (Math.abs(thisCell.elevation - neighborCell.elevation) == stepThreshold) {
            var resTerrace = genBridgeTarraceQuad(thisCell, neighborCell, p1, p2, p3, offset, thisCell.mainColor, neighborCell.mainColor, hexMetric);
            var quadArr = resTerrace.quad;
            var colorArr = resTerrace.vtColor;
            for (var i = 0; i < quadArr.length; i++) {
                var res = genFace_vtColor_FromQuad(quadArr[i][0], quadArr[i][1], quadArr[i][2], quadArr[i][3], [0, 0, 0], colorArr[i][0], colorArr[i][0]);
                res.faces.forEach(i => thisCell.bridge.SE.faces.push(i));
                res.vtColor.forEach(i => thisCell.bridge.SE.vtColor.push(i));
            }
            thisCell.bridge.SE.quad = quadArr;
        }
        else {
            var quadArr = [];
            for (var i = 0; i < 4; i++) {
                quadArr.push([thisCell.core.vertices[p2 + i + 1], thisCell.core.vertices[p2 + i],
                neighborCell.core.vertices[p4 - 1 - i], neighborCell.core.vertices[p4 - i]])
            }
            for (var i = 0; i < quadArr.length; i++) {
                var res = genFace_vtColor_FromQuad(quadArr[i][0], quadArr[i][1], quadArr[i][2], quadArr[i][3],
                    offset, colortoArr(thisCell.mainColor), colortoArr(neighborCell.mainColor));
                res.faces.forEach(i => thisCell.bridge.SE.faces.push(i));
                res.vtColor.forEach(i => thisCell.bridge.SE.vtColor.push(i));
            }
            thisCell.bridge.SE.quad = quadArr;
        }

    }
    //SW
    if (arr[z][x].neighbor.SW !== null) {

        var thisCell = arr[z][x];
        var neighborCell = arr[arr[z][x].neighbor.SW.z][arr[z][x].neighbor.SW.x];
        var offset = [-hexMetric.innerRadius, 0, 1.5 * hexMetric.outerRadius]
        var p1 = 4, p2 = 0, p3 = 12, p4 = 16;
        thisCell.bridge.SW.faces = [];
        thisCell.bridge.SW.vtColor = [];
        thisCell.bridge.SW.type = defineBridgeType(thisCell, neighborCell, stepThreshold);

        if (thisCell.elevation == 0 && neighborCell.elevation == 0) {
            for (var idx = 0; idx < 4; idx++) {
                var resTerrace = genBridgeTarraceQuad(thisCell, neighborCell, p1 - idx, p1 - idx - 1, p3 + idx, offset, thisCell.mainColor, neighborCell.mainColor, hexMetric);
                var quadArr = resTerrace.quad;
                var colorArr = resTerrace.vtColor;
                for (var i = 0; i < quadArr.length; i++) {
                    var res = genFace_vtColor_FromQuad(quadArr[i][0], quadArr[i][1], quadArr[i][2], quadArr[i][3], [0, 0, 0], colorArr[i][0], colorArr[i][0]);
                    res.faces.forEach(i => thisCell.bridge.SW.faces.push(i));
                    res.vtColor.forEach(i => thisCell.bridge.SW.vtColor.push(i));
                }
                thisCell.bridge.SW.quad = quadArr;
            }
        } else if (Math.abs(thisCell.elevation - neighborCell.elevation) == stepThreshold) {
            var resTerrace = genBridgeTarraceQuad(thisCell, neighborCell, p1, p2, p3, offset, thisCell.mainColor, neighborCell.mainColor, hexMetric);
            var quadArr = resTerrace.quad;
            var colorArr = resTerrace.vtColor;
            for (var i = 0; i < quadArr.length; i++) {
                var res = genFace_vtColor_FromQuad(quadArr[i][0], quadArr[i][1], quadArr[i][2], quadArr[i][3], [0, 0, 0], colorArr[i][0], colorArr[i][0]);
                res.faces.forEach(i => thisCell.bridge.SW.faces.push(i));
                res.vtColor.forEach(i => thisCell.bridge.SW.vtColor.push(i));
            }
            thisCell.bridge.SW.quad = quadArr;
        }
        else {
            var quadArr = [];
            for (var i = 0; i < 4; i++) {
                quadArr.push([thisCell.core.vertices[p2 + i + 1], thisCell.core.vertices[p2 + i],
                neighborCell.core.vertices[p4 - 1 - i], neighborCell.core.vertices[p4 - i]])
            }
            for (var i = 0; i < quadArr.length; i++) {
                var res = genFace_vtColor_FromQuad(quadArr[i][0], quadArr[i][1], quadArr[i][2], quadArr[i][3],
                    offset, colortoArr(thisCell.mainColor), colortoArr(neighborCell.mainColor));
                res.faces.forEach(i => thisCell.bridge.SW.faces.push(i));
                res.vtColor.forEach(i => thisCell.bridge.SW.vtColor.push(i));
            }
            thisCell.bridge.SW.quad = quadArr;
        }


    }


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
}

function genJointFace(arr, x, z, hexMetric) {
    // if ((arr[z][x].neighbor.NE !== null) && (arr[z][x].neighbor.E !== null)) {
    //     arr[z][x].joint.NE.faces = triangulateJoint(
    //         arr[z][x].core.vertices[16],
    //         arr[arr[z][x].neighbor.NE.z][arr[z][x].neighbor.NE.x].core.vertices[0],
    //         arr[arr[z][x].neighbor.E.z][arr[z][x].neighbor.E.x].core.vertices[8],
    //         [hexMetric.innerRadius, 0, -1.5 * hexMetric.outerRadius],
    //         [2 * hexMetric.innerRadius, 0, 0]
    //     )

    //     arr[z][x].joint.NE.vtColor = createVertexColorJoint(arr[z][x].mainColor,
    //         arr[arr[z][x].neighbor.NE.z][arr[z][x].neighbor.NE.x].mainColor,
    //         arr[arr[z][x].neighbor.E.z][arr[z][x].neighbor.E.x].mainColor);
    // }

    if ((arr[z][x].neighbor.E !== null) && (arr[z][x].neighbor.SE !== null)) {
        var thisCell = arr[z][x];
        var neighborCell_E = arr[arr[z][x].neighbor.E.z][arr[z][x].neighbor.E.x];
        var neighborCell_SE = arr[arr[z][x].neighbor.SE.z][arr[z][x].neighbor.SE.x];
        var offset1 = [2 * hexMetric.innerRadius, 0, 0];
        var offset2 = [hexMetric.innerRadius, 0, 1.5 * hexMetric.outerRadius];
        thisCell.joint.SE.faces = [];
        thisCell.joint.SE.vtColor = [];

        if (thisCell.bridge.E.type == BridgeType.Flat && thisCell.bridge.SE.type == BridgeType.Flat && neighborCell_E.bridge.SW.type == BridgeType.Flat) {
            // thisCell.joint.SE.faces = triangulateJoint(thisCell.core.vertices[20], neighborCell_E.core.vertices[4], neighborCell_SE.core.vertices[12], offset1, offset2)
            // thisCell.joint.SE.vtColor = createVertexColorJoint(thisCell.mainColor, neighborCell_E.mainColor, neighborCell_SE.mainColor);
        }
        if (thisCell.bridge.E.type == BridgeType.Flat && thisCell.bridge.SE.type == BridgeType.StepUp && neighborCell_E.bridge.SW.type == BridgeType.StepUp) {
            // thisCell.joint.SE.faces = triangulateJoint(thisCell.core.vertices[20], neighborCell_E.core.vertices[4], neighborCell_SE.core.vertices[12], offset1, offset2)
            // thisCell.joint.SE.vtColor = createVertexColorJoint(thisCell.mainColor, neighborCell_E.mainColor, neighborCell_SE.mainColor);
            // var res = genFace_vtColor_FromQuad(
            //     thisCell.bridge.SE.quad[0][1], 
            //     [
            //         neighborCell_E.bridge.SW.quad[0][0][0] +offset1[0],
            //         neighborCell_E.bridge.SW.quad[0][0][1] +offset1[1],
            //         neighborCell_E.bridge.SW.quad[0][0][2] +offset1[2],
            //     ],

            //     thisCell.bridge.SE.quad[0][3],
            //     [
            //         neighborCell_E.bridge.SW.quad[0][2][0] +offset1[0],
            //         neighborCell_E.bridge.SW.quad[0][2][1] +offset1[1],
            //         neighborCell_E.bridge.SW.quad[0][2][2] +offset1[2],
            //     ],   
            //     [0,0,0], [1,0,0], [1,0,0]);
            //         res.faces.forEach(i => thisCell.joint.SE.faces.push(i));
            //         res.vtColor.forEach(i => thisCell.joint.SE.vtColor.push(i));
            var count = 0;
            for (var i = 0; i < 4; i++) {
                count = 0;

                var res = genFace_vtColor_FromQuad(
                    thisCell.bridge.SE.quad[i][1],
                    [
                        neighborCell_E.bridge.SW.quad[i][0][0] + offset1[0],
                        neighborCell_E.bridge.SW.quad[i][0][1] + offset1[1],
                        neighborCell_E.bridge.SW.quad[i][0][2] + offset1[2],
                    ],

                    thisCell.bridge.SE.quad[i][3],
                    [
                        neighborCell_E.bridge.SW.quad[i][2][0] + offset1[0],
                        neighborCell_E.bridge.SW.quad[i][2][1] + offset1[1],
                        neighborCell_E.bridge.SW.quad[i][2][2] + offset1[2],
                    ],
                    [0, 0, 0], [

                    thisCell.bridge.SW.vtColor[(i * 36)], thisCell.bridge.SW.vtColor[(i * 36) + 1], thisCell.bridge.SW.vtColor[(i * 36) + 2]
                ], [

                    neighborCell_E.bridge.SW.vtColor[(i * 36)], neighborCell_E.bridge.SW.vtColor[(i * 36) + 1], neighborCell_E.bridge.SW.vtColor[(i * 36) + 2]
                ]);
                res.faces.forEach(a => thisCell.joint.SE.faces.push(a));
                res.vtColor.forEach(a => thisCell.joint.SE.vtColor.push(a));

                if ((i + 1) % 2 == 0) {
                    count++;
                }
            }


        }

    }

}

function defineBridgeType(thisCell, targetCell, stepThreshold) {
    if (thisCell.elevation == targetCell.elevation) {
        return BridgeType.Flat;
    }
    else if (thisCell.elevation == targetCell.elevation + stepThreshold) {
        return BridgeType.StepDown;
    }
    else if (thisCell.elevation > targetCell.elevation) {
        return BridgeType.CliffDown;
    }
    else if (targetCell.elevation == thisCell.elevation + stepThreshold) {
        return BridgeType.StepUp;
    }
    else if (targetCell.elevation > thisCell.elevation) {
        return BridgeType.CliffUp;
    }
}

const BridgeType = {
    Flat: "Flat",
    StepUp: "StepUp",
    StepDown: "StepDown",
    CliffUp: "CliffUp",
    CliffDown: "CliffDown",
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

                    <meshPhongMaterial attach="material" color={hovered ? 'hotpink' : props.info.mainColor} />
                </mesh>
                {(props.info.bridge.E.faces.length > 0) && <mesh >
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



