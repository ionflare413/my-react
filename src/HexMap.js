
import React, { useCallback, useImperativeHandle, useRef, useMemo, useState, useEffect, createRef } from 'react'
import ReactDOM from 'react-dom'
// import { HexCell } from './HexCell'
import * as THREE from 'three'
import { Vector3 } from 'three';
// import { HexCell } from './HexCell';



export const HexMap = React.forwardRef(
        (props, ref) => {
    //store method
    // vertrice => [ [1,2,3], [1,2,3], ...]
    // face => [ 1,2,3, ...]

    const [hexMetric, setHexMetric] = useState({
        outerRadius: props.outerRadius,
        innerRadius: props.outerRadius * 0.866025404,
        hexCoreScale: props.hexCoreScale,

        offset: {
            E: [2 * props.outerRadius * 0.866025404, 0, 0],
            SE: [props.outerRadius * 0.866025404, 0, 1.5 * props.outerRadius],
            SW: [-props.outerRadius * 0.866025404, 0, 1.5 * props.outerRadius],
            W: [-2 * props.outerRadius * 0.866025404, 0, 0],
            NW: [-props.outerRadius * 0.866025404, 0, -1.5 * props.outerRadius],
            NE: [props.outerRadius * 0.866025404, 0, -1.5 * props.outerRadius]
        }
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

    var brushColor = new THREE.Color(props.brushColor);
    var brushElevation = props.brushElevation;
    const setHexMapBrush = (e) => {
        //triggerUpdate(!update);
        brushColor = new THREE.Color(e.brushColor);
        brushElevation = Number(e.brushElevation)
    };

    
    useImperativeHandle(ref, () => ({ setHexMapBrush }));
 



    const [update, triggerUpdate] = useState(false)
    const [cellInfo, setCellInfo] = useState(false)


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
                        quadColor: [],
                        vertices: [],
                        faces: [],
                        vtColor: []
                    },
                    SE: {
                        type: null,
                        quad: [],
                        quadColor: [],
                        vertices: [],
                        faces: [],
                        vtColor: []
                    },
                    SW: {
                        type: null,
                        quad: [],
                        quadColor: [],
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

        }
    }
    for (var z = 0; z < props.size.z; z++) {
        for (var x = 0; x < props.size.x; x++) {
            genBridgeFace(hexCells, x, z, hexMetric, stepThreshold);
        }
    }
    for (var z = 0; z < props.size.z; z++) {
        for (var x = 0; x < props.size.x; x++) {
            genJointFace(hexCells, x, z, hexMetric);
        }
    }


    var onChildClick = (e) => {

        hexCells[e.z][e.x].mainColor = brushColor;

     

        updateCell(hexCells, hexMetric, e.x, e.z, hexCells[e.z][e.x].core.vertices[0][1] + brushElevation, stepThreshold);
       

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


})


function updateCell(arr, hexMetric, x, z, newY, stepThreshold) {

    //update cell core
    for (var i = 0; i < arr[z][x].core.vertices.length; i++) {
        arr[z][x].core.vertices[i][1] = newY;
        arr[z][x].elevation = newY;
    }

    arr[z][x].core.vertices[6][1] = arr[z][x].elevation - 0.25;
    arr[z][x].core.vertices[18][1] = arr[z][x].elevation - 0.25;


    genCoreFace(arr, x, z);
    genBridgeFace(arr, x, z, hexMetric, stepThreshold);
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
    arr[z][x].core.faces = triangulateHexCore(arr[z][x].core.vertices , arr[z][x].elevation )
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
                    var res = genFace_vtColor_FromQuad(
                        quadArr[i][0], colorArr[i][0],
                        quadArr[i][1], colorArr[i][1],
                        quadArr[i][2], colorArr[i][2],
                        quadArr[i][3], colorArr[i][3]);
                    res.faces.forEach(i => thisCell.bridge.E.faces.push(i));
                    res.vtColor.forEach(i => thisCell.bridge.E.vtColor.push(i));
                }
                thisCell.bridge.E.quad = quadArr;
                thisCell.bridge.E.quadColor = colorArr;
            }
        } else if (Math.abs(thisCell.elevation - neighborCell.elevation) == stepThreshold) {
            var resTerrace = genBridgeTarraceQuad(thisCell, neighborCell, p1, p2, p3, offset, thisCell.mainColor, neighborCell.mainColor, hexMetric);
            var quadArr = resTerrace.quad;
            var colorArr = resTerrace.vtColor;
            for (var i = 0; i < quadArr.length; i++) {
                var res = genFace_vtColor_FromQuad(
                    quadArr[i][0], colorArr[i][0],
                    quadArr[i][1], colorArr[i][1],
                    quadArr[i][2], colorArr[i][2],
                    quadArr[i][3], colorArr[i][3]);
                res.faces.forEach(i => thisCell.bridge.E.faces.push(i));
                res.vtColor.forEach(i => thisCell.bridge.E.vtColor.push(i));
            }
            thisCell.bridge.E.quad = quadArr;
            thisCell.bridge.E.quadColor = colorArr;
        }
        else {
            var quadArr = [];
            for (var i = 0; i < 4; i++) {
                var nb1 = [neighborCell.core.vertices[p4 - 1 - i][0] + offset[0],
                neighborCell.core.vertices[p4 - 1 - i][1] + offset[1],
                neighborCell.core.vertices[p4 - 1 - i][2] + offset[2]
                ]
                var nb2 = [neighborCell.core.vertices[p4 - i][0] + offset[0],
                neighborCell.core.vertices[p4 - i][1] + offset[1],
                neighborCell.core.vertices[p4 - i][2] + offset[2]
                ]
                quadArr.push([thisCell.core.vertices[p2 + i + 1], thisCell.core.vertices[p2 + i], nb1, nb2])
            }
            for (var i = 0; i < quadArr.length; i++) {
                var res = genFace_vtColor_FromQuad(
                    quadArr[i][0], colortoArr(thisCell.mainColor),
                    quadArr[i][1], colortoArr(thisCell.mainColor),
                    quadArr[i][2], colortoArr(neighborCell.mainColor),
                    quadArr[i][3], colortoArr(neighborCell.mainColor));

                res.faces.forEach(i => thisCell.bridge.E.faces.push(i));
                res.vtColor.forEach(i => thisCell.bridge.E.vtColor.push(i));
            }
            thisCell.bridge.E.quad = quadArr;
            thisCell.bridge.E.quadColor = colorArr;
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
                    var res = genFace_vtColor_FromQuad(
                        quadArr[i][0], colorArr[i][0],
                        quadArr[i][1], colorArr[i][1],
                        quadArr[i][2], colorArr[i][2],
                        quadArr[i][3], colorArr[i][3]);
                    res.faces.forEach(i => thisCell.bridge.SE.faces.push(i));
                    res.vtColor.forEach(i => thisCell.bridge.SE.vtColor.push(i));
                }
                thisCell.bridge.SE.quad = quadArr;
                thisCell.bridge.SE.quadColor = colorArr;
            }
        } else if (Math.abs(thisCell.elevation - neighborCell.elevation) == stepThreshold) {
            var resTerrace = genBridgeTarraceQuad(thisCell, neighborCell, p1, p2, p3, offset, thisCell.mainColor, neighborCell.mainColor, hexMetric);
            var quadArr = resTerrace.quad;
            var colorArr = resTerrace.vtColor;
            for (var i = 0; i < quadArr.length; i++) {
                var res = genFace_vtColor_FromQuad(
                    quadArr[i][0], colorArr[i][0],
                    quadArr[i][1], colorArr[i][1],
                    quadArr[i][2], colorArr[i][2],
                    quadArr[i][3], colorArr[i][3]);
                res.faces.forEach(i => thisCell.bridge.SE.faces.push(i));
                res.vtColor.forEach(i => thisCell.bridge.SE.vtColor.push(i));
            }
            thisCell.bridge.SE.quad = quadArr;
            thisCell.bridge.SE.quadColor = colorArr;
        }
        else {
            var quadArr = [];
            for (var i = 0; i < 4; i++) {
                var nb1 = [neighborCell.core.vertices[p4 - 1 - i][0] + offset[0],
                neighborCell.core.vertices[p4 - 1 - i][1] + offset[1],
                neighborCell.core.vertices[p4 - 1 - i][2] + offset[2]
                ]
                var nb2 = [neighborCell.core.vertices[p4 - i][0] + offset[0],
                neighborCell.core.vertices[p4 - i][1] + offset[1],
                neighborCell.core.vertices[p4 - i][2] + offset[2]
                ]
                quadArr.push([thisCell.core.vertices[p2 + i + 1], thisCell.core.vertices[p2 + i], nb1, nb2])
            }
            for (var i = 0; i < quadArr.length; i++) {
                var res = genFace_vtColor_FromQuad(
                    quadArr[i][0], colortoArr(thisCell.mainColor),
                    quadArr[i][1], colortoArr(thisCell.mainColor),
                    quadArr[i][2], colortoArr(neighborCell.mainColor),
                    quadArr[i][3], colortoArr(neighborCell.mainColor));

                res.faces.forEach(i => thisCell.bridge.SE.faces.push(i));
                res.vtColor.forEach(i => thisCell.bridge.SE.vtColor.push(i));
            }
            thisCell.bridge.SE.quad = quadArr;
            thisCell.bridge.SE.quadColor = colorArr;
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
                    var res = genFace_vtColor_FromQuad(
                        quadArr[i][0], colorArr[i][0],
                        quadArr[i][1], colorArr[i][1],
                        quadArr[i][2], colorArr[i][2],
                        quadArr[i][3], colorArr[i][3]);
                    res.faces.forEach(i => thisCell.bridge.SW.faces.push(i));
                    res.vtColor.forEach(i => thisCell.bridge.SW.vtColor.push(i));
                }
                thisCell.bridge.SW.quad = quadArr;
                thisCell.bridge.SW.quadColor = colorArr;
            }
        } else if (Math.abs(thisCell.elevation - neighborCell.elevation) == stepThreshold) {
            var resTerrace = genBridgeTarraceQuad(thisCell, neighborCell, p1, p2, p3, offset, thisCell.mainColor, neighborCell.mainColor, hexMetric);
            var quadArr = resTerrace.quad;
            var colorArr = resTerrace.vtColor;
            for (var i = 0; i < quadArr.length; i++) {
                var res = genFace_vtColor_FromQuad(
                    quadArr[i][0], colorArr[i][0],
                    quadArr[i][1], colorArr[i][1],
                    quadArr[i][2], colorArr[i][2],
                    quadArr[i][3], colorArr[i][3]);
                res.faces.forEach(i => thisCell.bridge.SW.faces.push(i));
                res.vtColor.forEach(i => thisCell.bridge.SW.vtColor.push(i));
            }
            thisCell.bridge.SW.quad = quadArr;
            thisCell.bridge.SW.quadColor = colorArr;
        }
        else {
            var quadArr = [];
            for (var i = 0; i < 4; i++) {
                var nb1 = [neighborCell.core.vertices[p4 - 1 - i][0] + offset[0],
                neighborCell.core.vertices[p4 - 1 - i][1] + offset[1],
                neighborCell.core.vertices[p4 - 1 - i][2] + offset[2]
                ]
                var nb2 = [neighborCell.core.vertices[p4 - i][0] + offset[0],
                neighborCell.core.vertices[p4 - i][1] + offset[1],
                neighborCell.core.vertices[p4 - i][2] + offset[2]
                ]
                quadArr.push([thisCell.core.vertices[p2 + i + 1], thisCell.core.vertices[p2 + i], nb1, nb2])
            }
            for (var i = 0; i < quadArr.length; i++) {
                var res = genFace_vtColor_FromQuad(
                    quadArr[i][0], colortoArr(thisCell.mainColor),
                    quadArr[i][1], colortoArr(thisCell.mainColor),
                    quadArr[i][2], colortoArr(neighborCell.mainColor),
                    quadArr[i][3], colortoArr(neighborCell.mainColor));

                res.faces.forEach(i => thisCell.bridge.SW.faces.push(i));
                res.vtColor.forEach(i => thisCell.bridge.SW.vtColor.push(i));
            }
            thisCell.bridge.SW.quad = quadArr;
            thisCell.bridge.SW.quadColor = colorArr;
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
    var optimizeInitFace = 20;
    /** Joint NE */

    if ((arr[z][x].neighbor.NE !== null) && (arr[z][x].neighbor.E !== null)) {

        var thisCell = arr[z][x];
        var thisJoint = thisCell.joint.NE;

        var neighborCell_NE = arr[thisCell.neighbor.NE.z][thisCell.neighbor.NE.x];
        var neighborCell_E = arr[thisCell.neighbor.E.z][thisCell.neighbor.E.x];

        /*  Points Description
                      p2                
                      /\
                     /  \
                    /    \
                   /______\                         
                 p1        p3
        */
        var p1 = thisCell.core.vertices[16];
        var p2 = array3_Plus(neighborCell_NE.core.vertices[0], hexMetric.offset.NE);
        var p3 = array3_Plus(neighborCell_E.core.vertices[8], hexMetric.offset.E);

        // 3 Flats
        if (thisCell.bridge.E.type == BridgeType.Flat && neighborCell_NE.bridge.SE.type == BridgeType.Flat && neighborCell_NE.bridge.SW.type == BridgeType.Flat) {
            thisJoint.faces = []; thisJoint.vtColor = [];
            var f = triangulateJoint(p1, p2, p3)
            var vt = createVertexColorJoint(colortoArr(thisCell.mainColor), colortoArr(neighborCell_NE.mainColor), colortoArr(neighborCell_E.mainColor));
            for (var i = 0; i < optimizeInitFace; i++) {
                f.forEach(a => thisJoint.faces.push(a));
                vt.forEach(a => thisJoint.vtColor.push(a));
            }
        }
        // 3 Cliffs
        else if (thisCell.bridge.E.type == BridgeType.Cliff && neighborCell_NE.bridge.SE.type == BridgeType.Cliff && neighborCell_NE.bridge.SW.type == BridgeType.Cliff) {

            thisJoint.faces = []; thisJoint.vtColor = [];
            var f = triangulateJoint(p1, p2, p3)
            var vt = createVertexColorJoint(colortoArr(thisCell.mainColor), colortoArr(neighborCell_NE.mainColor), colortoArr(neighborCell_E.mainColor));
            for (var i = 0; i < optimizeInitFace; i++) {
                f.forEach(a => thisJoint.faces.push(a));
                vt.forEach(a => thisJoint.vtColor.push(a));
            }
        }
        ////// 2 Steps 1 Flat (Case 1/3)
        else if ((thisCell.bridge.E.type == BridgeType.Flat) && (neighborCell_NE.bridge.SE.type == BridgeType.Step) && (neighborCell_NE.bridge.SW.type == BridgeType.Step)) {
            thisJoint.faces = []; thisJoint.vtColor = [];
            for (var i = 0; i < neighborCell_NE.bridge.SE.quad.length; i++) {
                var idx = i;
                var res = genFace_vtColor_FromQuad(
                    array3_Plus(neighborCell_NE.bridge.SW.quad[idx][1], hexMetric.offset.NE), neighborCell_NE.bridge.SW.quadColor[idx][1],
                    array3_Plus(neighborCell_NE.bridge.SE.quad[idx][0], hexMetric.offset.NE), neighborCell_NE.bridge.SE.quadColor[idx][0],
                    array3_Plus(neighborCell_NE.bridge.SW.quad[idx][3], hexMetric.offset.NE), neighborCell_NE.bridge.SW.quadColor[idx][3],
                    array3_Plus(neighborCell_NE.bridge.SE.quad[idx][2], hexMetric.offset.NE), neighborCell_NE.bridge.SE.quadColor[idx][2],
                )
                res.faces.forEach(i => thisJoint.faces.push(i));
                res.vtColor.forEach(i => thisJoint.vtColor.push(i));

            }
        }
        ////// 2 Steps 1 Flat (Case 2/3)
        else if ((neighborCell_NE.bridge.SE.type == BridgeType.Flat) && (thisCell.bridge.E.type == BridgeType.Step) && (neighborCell_NE.bridge.SW.type == BridgeType.Step)) {
            thisJoint.faces = []; thisJoint.vtColor = [];
            for (var i = 0; i < thisCell.bridge.E.quad.length; i++) {
                var idx = thisCell.bridge.E.quad.length - 1 - i;
                var res = genFace_vtColor_FromQuad(
                    thisCell.bridge.E.quad[i][1], thisCell.bridge.E.quadColor[i][1],
                    array3_Plus(neighborCell_NE.bridge.SW.quad[idx][3], hexMetric.offset.NE), neighborCell_NE.bridge.SW.quadColor[idx][3],
                    thisCell.bridge.E.quad[i][3], thisCell.bridge.E.quadColor[i][3],
                    array3_Plus(neighborCell_NE.bridge.SW.quad[idx][1], hexMetric.offset.NE), neighborCell_NE.bridge.SW.quadColor[idx][1],
                )
                res.faces.forEach(i => thisJoint.faces.push(i));
                res.vtColor.forEach(i => thisJoint.vtColor.push(i));
            }
        }
        ////// 2 Steps 1 Flat (Case 3/3)
        else if ((neighborCell_NE.bridge.SW.type == BridgeType.Flat) && (neighborCell_NE.bridge.SE.type == BridgeType.Step) && (thisCell.bridge.E.type == BridgeType.Step)) {
            thisJoint.faces = []; thisJoint.vtColor = [];
            for (var i = 0; i < neighborCell_NE.bridge.SE.quad.length; i++) {
                var idx = i;
                var res = genFace_vtColor_FromQuad(
                    thisCell.bridge.E.quad[i][1], thisCell.bridge.E.quadColor[i][1],
                    array3_Plus(neighborCell_NE.bridge.SE.quad[idx][0], hexMetric.offset.NE), neighborCell_NE.bridge.SE.quadColor[idx][0],
                    thisCell.bridge.E.quad[i][3], thisCell.bridge.E.quadColor[i][3],
                    array3_Plus(neighborCell_NE.bridge.SE.quad[idx][2], hexMetric.offset.NE), neighborCell_NE.bridge.SE.quadColor[idx][2],
                )
                res.faces.forEach(i => thisJoint.faces.push(i));
                res.vtColor.forEach(i => thisJoint.vtColor.push(i));
            }
        }
        //// 2 Cliffs 1 Flat
        else if (
            (thisCell.bridge.E.type == BridgeType.Flat && neighborCell_NE.bridge.SE.type == BridgeType.Cliff && neighborCell_NE.bridge.SW.type == BridgeType.Cliff)
            || (neighborCell_NE.bridge.SE.type == BridgeType.Flat && thisCell.bridge.E.type == BridgeType.Cliff && neighborCell_NE.bridge.SW.type == BridgeType.Cliff)
            || (neighborCell_NE.bridge.SW.type == BridgeType.Flat && neighborCell_NE.bridge.SE.type == BridgeType.Cliff && thisCell.bridge.E.type == BridgeType.Cliff)) {

            thisJoint.faces = []; thisJoint.vtColor = [];
            var f = triangulateJoint(p1, p2, p3)
            var vt = createVertexColorJoint(colortoArr(thisCell.mainColor), colortoArr(neighborCell_NE.mainColor), colortoArr(neighborCell_E.mainColor));
            f.forEach(a => thisJoint.faces.push(a));
            vt.forEach(a => thisJoint.vtColor.push(a));
        }

        //// 2 Steps  1 Cliff (1/3)
        else if (thisCell.bridge.E.type == BridgeType.Cliff && neighborCell_NE.bridge.SE.type == BridgeType.Step && neighborCell_NE.bridge.SW.type == BridgeType.Step) {
            thisJoint.faces = []; thisJoint.vtColor = [];
            var cliffPoint = thisCell.core.vertices[16];
            var stepPoint_1 = array3_Plus(neighborCell_NE.core.vertices[0], hexMetric.offset.NE);
            var stepPoint_2 = array3_Plus(neighborCell_E.core.vertices[8], hexMetric.offset.E);
            var dist_1 = calDistance(stepPoint_1, cliffPoint);
            var dist_2 = calDistance(stepPoint_2, cliffPoint);
            var cliffDirection = (dist_1 > dist_2) ? array3_Minus(stepPoint_1, cliffPoint) : array3_Minus(stepPoint_2, cliffPoint)
            var markPoint = array3_Plus(cliffPoint, array3_Multiply(cliffDirection, [0.5, 0.5, 0.5]));
            var markColor = array3_Multiply(array3_Plus(colortoArr(neighborCell_E.mainColor), colortoArr(thisCell.mainColor)),[0.5,0.5,0.5]);

            for (var idx = 0; idx < neighborCell_NE.bridge.SW.quad.length; idx++) {
                var f = triangulateJoint(markPoint, array3_Plus(neighborCell_NE.bridge.SW.quad[idx][3], hexMetric.offset.NE), array3_Plus(neighborCell_NE.bridge.SW.quad[idx][1], hexMetric.offset.NE));
                var vt = createVertexColorJoint(markColor, neighborCell_NE.bridge.SW.quadColor[idx][3], neighborCell_NE.bridge.SW.quadColor[idx][1]);
                f.forEach(a => thisJoint.faces.push(a));
                vt.forEach(a => thisJoint.vtColor.push(a));
            }
            for (var idx = 0; idx < neighborCell_NE.bridge.SE.quad.length; idx++) {
                var f = triangulateJoint(markPoint, array3_Plus(neighborCell_NE.bridge.SE.quad[idx][0], hexMetric.offset.NE), array3_Plus(neighborCell_NE.bridge.SE.quad[idx][2], hexMetric.offset.NE))
                var vt = createVertexColorJoint(markColor, neighborCell_NE.bridge.SE.quadColor[idx][0], neighborCell_NE.bridge.SE.quadColor[idx][2]);
                f.forEach(a => thisJoint.faces.push(a));
                vt.forEach(a => thisJoint.vtColor.push(a));
            }
        }
        //// 2 Steps  1 Cliff (2/3)
        else if (neighborCell_NE.bridge.SE.type == BridgeType.Cliff && thisCell.bridge.E.type == BridgeType.Step && neighborCell_NE.bridge.SW.type == BridgeType.Step) {
            thisJoint.faces = []; thisJoint.vtColor = [];
            var cliffPoint = array3_Plus(neighborCell_NE.core.vertices[0], hexMetric.offset.NE);
            var stepPoint_1 = thisCell.core.vertices[16];
            var stepPoint_2 = array3_Plus(neighborCell_E.core.vertices[8], hexMetric.offset.E);
            var dist_1 = calDistance(stepPoint_1, cliffPoint);
            var dist_2 = calDistance(stepPoint_2, cliffPoint);
            var cliffDirection = (dist_1 > dist_2) ? array3_Minus(stepPoint_1, cliffPoint) : array3_Minus(stepPoint_2, cliffPoint)
            var markPoint = array3_Plus(cliffPoint, array3_Multiply(cliffDirection, [0.5, 0.5, 0.5]));
            var markColor = array3_Multiply(array3_Plus(colortoArr(neighborCell_E.mainColor), colortoArr(neighborCell_NE.mainColor)),[0.5,0.5,0.5]);

            for (var idx = 0; idx < neighborCell_NE.bridge.SW.quad.length; idx++) {
                var f = triangulateJoint(markPoint, array3_Plus(neighborCell_NE.bridge.SW.quad[idx][3], hexMetric.offset.NE), array3_Plus(neighborCell_NE.bridge.SW.quad[idx][1], hexMetric.offset.NE));
                var vt = createVertexColorJoint(markColor, neighborCell_NE.bridge.SW.quadColor[idx][3], neighborCell_NE.bridge.SW.quadColor[idx][1]);
                f.forEach(a => thisJoint.faces.push(a));
                vt.forEach(a => thisJoint.vtColor.push(a));
            }
            for (var idx = 0; idx < thisCell.bridge.E.quad.length; idx++) {
                var f = triangulateJoint(markPoint, thisCell.bridge.E.quad[idx][3], thisCell.bridge.E.quad[idx][1])
                var vt = createVertexColorJoint(markColor, thisCell.bridge.E.quadColor[idx][3], thisCell.bridge.E.quadColor[idx][1]);
                f.forEach(a => thisJoint.faces.push(a));
                vt.forEach(a => thisJoint.vtColor.push(a));
            }
        }
        //// 2 Steps  1 Cliff (3/3)
        else if (neighborCell_NE.bridge.SW.type == BridgeType.Cliff && thisCell.bridge.E.type == BridgeType.Step && neighborCell_NE.bridge.SE.type == BridgeType.Step) {
            thisJoint.faces = []; thisJoint.vtColor = [];
            var cliffPoint = array3_Plus(neighborCell_NE.core.vertices[0], hexMetric.offset.NE);
            var stepPoint_1 = thisCell.core.vertices[16];
            var stepPoint_2 = array3_Plus(neighborCell_E.core.vertices[8], hexMetric.offset.E);
            var dist_1 = calDistance(stepPoint_1, cliffPoint);
            var dist_2 = calDistance(stepPoint_2, cliffPoint);
            var cliffDirection = (dist_1 > dist_2) ? array3_Minus(stepPoint_1, cliffPoint) : array3_Minus(stepPoint_2, cliffPoint)
            var markPoint = array3_Plus(cliffPoint, array3_Multiply(cliffDirection, [0.5, 0.5, 0.5]));
            var markColor = array3_Multiply(array3_Plus(colortoArr(thisCell.mainColor), colortoArr(neighborCell_NE.mainColor)),[0.5,0.5,0.5]);

            for (var idx = 0; idx < neighborCell_NE.bridge.SE.quad.length; idx++) {
                var f = triangulateJoint(markPoint, array3_Plus(neighborCell_NE.bridge.SE.quad[idx][0], hexMetric.offset.NE), array3_Plus(neighborCell_NE.bridge.SE.quad[idx][2], hexMetric.offset.NE));
                var vt = createVertexColorJoint(markColor, neighborCell_NE.bridge.SE.quadColor[idx][0], neighborCell_NE.bridge.SE.quadColor[idx][2]);
                f.forEach(a => thisJoint.faces.push(a));
                vt.forEach(a => thisJoint.vtColor.push(a));

            }
            for (var idx = 0; idx < thisCell.bridge.E.quad.length; idx++) {
                var f = triangulateJoint(markPoint, thisCell.bridge.E.quad[idx][3], thisCell.bridge.E.quad[idx][1])
                var vt = createVertexColorJoint(markColor, thisCell.bridge.E.quadColor[idx][3], thisCell.bridge.E.quadColor[idx][1]);
                f.forEach(a => thisJoint.faces.push(a));
                vt.forEach(a => thisJoint.vtColor.push(a));

            }
        }
        /////////////////////////////////////////////////////////////////////////////////////
        //// 2 Cliffs  1 Step (1/3)
        else if (thisCell.bridge.E.type == BridgeType.Step && neighborCell_NE.bridge.SE.type == BridgeType.Cliff && neighborCell_NE.bridge.SW.type == BridgeType.Cliff) {
            thisJoint.faces = []; thisJoint.vtColor = [];
            var stepEnd_p1 = thisCell.bridge.E.quad[0][1];
            var stepEnd_p2 = thisCell.bridge.E.quad[thisCell.bridge.E.quad.length-1][3];
            // Consider step side as a base
            var apexPoint = array3_Plus(neighborCell_NE.core.vertices[0], hexMetric.offset.NE);
            var apexColor = colortoArr(neighborCell_NE.mainColor);
            var cliffPoint_1 = array3_Plus(neighborCell_E.core.vertices[8], hexMetric.offset.E);
            var cliffColor_1 = colortoArr(neighborCell_E.mainColor);
            var cliffPoint_2 = thisCell.core.vertices[16];
            var cliffColor_2 = colortoArr(thisCell.mainColor);

            var dist_1 = calDistance(cliffPoint_1, apexPoint);
            var dist_2 = calDistance(cliffPoint_2, apexPoint);
            var markDirection, markSide_BasePoint, markSide_BaseColor, totalDist;
            if (dist_1 > dist_2) {
                totalDist = dist_1;
                markSide_BasePoint = cliffPoint_1;
                markSide_BaseColor = cliffColor_1;
                markDirection = array3_Divide(array3_Minus(cliffPoint_1, apexPoint), [dist_1 / dist_2, dist_1 / dist_2, dist_1 / dist_2])
            }
            else {
                totalDist = dist_2;
                markSide_BasePoint = cliffPoint_2;
                markSide_BaseColor = cliffColor_2;
                markDirection = array3_Divide(array3_Minus(cliffPoint_2, apexPoint), [dist_2 / dist_1, dist_2 / dist_1, dist_2 / dist_1])
            }
            var markPoint = array3_Plus(apexPoint, markDirection);
            var apexToMarkDist = calDistance(markPoint, apexPoint)
            var baseToMarkDist = calDistance(markPoint, markSide_BasePoint)
            var markColor = array3_Plus(array3_Multiply(apexColor,[Math.abs((totalDist - apexToMarkDist) / totalDist),Math.abs((totalDist - apexToMarkDist) / totalDist),Math.abs((totalDist - apexToMarkDist) / totalDist)]),
                array3_Multiply(markSide_BaseColor,[Math.abs((totalDist - baseToMarkDist) / totalDist), Math.abs((totalDist - baseToMarkDist) / totalDist), Math.abs((totalDist - baseToMarkDist) / totalDist)]));

            for (var idx = 0; idx < thisCell.bridge.E.quad.length; idx++) {
                var f = triangulateJoint(markPoint, thisCell.bridge.E.quad[idx][3], thisCell.bridge.E.quad[idx][1])
                var vt = createVertexColorJoint(markColor, thisCell.bridge.E.quadColor[idx][3], thisCell.bridge.E.quadColor[idx][1]);
                f.forEach(a => thisJoint.faces.push(a));
                vt.forEach(a => thisJoint.vtColor.push(a));
            }

            var f = (dist_1 > dist_2) ?
                triangulateJoint(markPoint, cliffPoint_2, apexPoint) : 
                triangulateJoint(markPoint, apexPoint, cliffPoint_1);
            var vt = (dist_1 > dist_2)?
                createVertexColorJoint(markColor, cliffColor_2, apexColor) :
                createVertexColorJoint(markColor, apexColor, cliffColor_2)
            f.forEach(a => thisJoint.faces.push(a));
            vt.forEach(a => thisJoint.vtColor.push(a));

        }
        //// 2 Cliffs  1 Step (2/3)
        else if (neighborCell_NE.bridge.SE.type == BridgeType.Step && thisCell.bridge.E.type == BridgeType.Cliff && neighborCell_NE.bridge.SW.type == BridgeType.Cliff) {

            thisJoint.faces = []; thisJoint.vtColor = [];
            var stepEnd_p1 = neighborCell_NE.bridge.SE.quad[0][0];
            var stepEnd_p2 = neighborCell_NE.bridge.SE.quad[neighborCell_NE.bridge.SE.quad.length-1][2];
            // Consider step side as a base
            var apexPoint = thisCell.core.vertices[16];
            var apexColor = colortoArr(thisCell.mainColor);
            var cliffPoint_1 = array3_Plus(neighborCell_E.core.vertices[8], hexMetric.offset.E);
            var cliffColor_1 = colortoArr(neighborCell_E.mainColor);
            var cliffPoint_2 = array3_Plus(neighborCell_NE.core.vertices[0], hexMetric.offset.NE);
            var cliffColor_2 = colortoArr(neighborCell_NE.mainColor);
            

            var dist_1 = calDistance(cliffPoint_1, apexPoint);
            var dist_2 = calDistance(cliffPoint_2, apexPoint);
            var markDirection, markSide_BasePoint, markSide_BaseColor, totalDist;
            if (dist_1 > dist_2) {
                totalDist = dist_1;
                markSide_BasePoint = cliffPoint_1;
                markSide_BaseColor = cliffColor_1;
                markDirection = array3_Divide(array3_Minus(cliffPoint_1, apexPoint), [dist_1 / dist_2, dist_1 / dist_2, dist_1 / dist_2])
            }
            else {
                totalDist = dist_2;
                markSide_BasePoint = cliffPoint_2;
                markSide_BaseColor = cliffColor_2;
                markDirection = array3_Divide(array3_Minus(cliffPoint_2, apexPoint), [dist_2 / dist_1, dist_2 / dist_1, dist_2 / dist_1])
            }
            var markPoint = array3_Plus(apexPoint, markDirection);
            var apexToMarkDist = calDistance(markPoint, apexPoint)
            var baseToMarkDist = calDistance(markPoint, markSide_BasePoint)
            var markColor = array3_Plus(array3_Multiply(apexColor,[Math.abs((totalDist - apexToMarkDist) / totalDist),Math.abs((totalDist - apexToMarkDist) / totalDist),Math.abs((totalDist - apexToMarkDist) / totalDist)]),
                array3_Multiply(markSide_BaseColor,[Math.abs((totalDist - baseToMarkDist) / totalDist), Math.abs((totalDist - baseToMarkDist) / totalDist), Math.abs((totalDist - baseToMarkDist) / totalDist)]));


            for (var idx = 0; idx < neighborCell_NE.bridge.SE.quad.length; idx++) {
                var f = triangulateJoint(markPoint, array3_Plus(neighborCell_NE.bridge.SE.quad[idx][0], hexMetric.offset.NE),  array3_Plus(neighborCell_NE.bridge.SE.quad[idx][2], hexMetric.offset.NE))
                var vt = createVertexColorJoint(markColor, neighborCell_NE.bridge.SE.quadColor[idx][0], neighborCell_NE.bridge.SE.quadColor[idx][2]);
                f.forEach(a => thisJoint.faces.push(a));
                vt.forEach(a => thisJoint.vtColor.push(a));
            }

            var f = (dist_1 > dist_2) ?
                triangulateJoint(markPoint, apexPoint, cliffPoint_2): 
                triangulateJoint(markPoint, cliffPoint_1, apexPoint);
            var vt = (dist_1 > dist_2)?
                createVertexColorJoint(markColor, apexColor, cliffColor_2) :
                createVertexColorJoint(markColor, cliffColor_1, apexColor)
            f.forEach(a => thisJoint.faces.push(a));
            vt.forEach(a => thisJoint.vtColor.push(a));


        }
        //// 2 Cliffs  1 Step (3/3)
        else if (neighborCell_NE.bridge.SW.type == BridgeType.Step && thisCell.bridge.E.type == BridgeType.Cliff && neighborCell_NE.bridge.SE.type == BridgeType.Cliff) {

            thisJoint.faces = []; thisJoint.vtColor = [];
            var stepEnd_p1 = neighborCell_NE.bridge.SW.quad[0][1];
            var stepEnd_p2 = neighborCell_NE.bridge.SW.quad[neighborCell_NE.bridge.SW.quad.length - 1][3];
            // Consider step side as a base
            var apexPoint = array3_Plus(neighborCell_E.core.vertices[8], hexMetric.offset.E);
            var apexColor = colortoArr(neighborCell_E.mainColor);

            var cliffPoint_1 = thisCell.core.vertices[16];
            var cliffColor_1 = colortoArr(thisCell.mainColor);

            var cliffPoint_2 = array3_Plus(neighborCell_NE.core.vertices[0], hexMetric.offset.NE);
            var cliffColor_2 = colortoArr(neighborCell_NE.mainColor);

            var dist_1 = calDistance(cliffPoint_1, apexPoint);
            var dist_2 = calDistance(cliffPoint_2, apexPoint);
            var markDirection, markSide_BasePoint, markSide_BaseColor, totalDist;
            if (dist_1 > dist_2) {
                totalDist = dist_1;
                markSide_BasePoint = cliffPoint_1;
                markSide_BaseColor = cliffColor_1;
                markDirection = array3_Divide(array3_Minus(cliffPoint_1, apexPoint), [dist_1 / dist_2, dist_1 / dist_2, dist_1 / dist_2])
            }
            else {
                totalDist = dist_2;
                markSide_BasePoint = cliffPoint_2;
                markSide_BaseColor = cliffColor_2;
                markDirection = array3_Divide(array3_Minus(cliffPoint_2, apexPoint), [dist_2 / dist_1, dist_2 / dist_1, dist_2 / dist_1])
            }
            var markPoint = array3_Plus(apexPoint, markDirection);
            var apexToMarkDist = calDistance(markPoint, apexPoint)
            var baseToMarkDist = calDistance(markPoint, markSide_BasePoint)
            var markColor = array3_Plus(array3_Multiply(apexColor,[Math.abs((totalDist - apexToMarkDist) / totalDist),Math.abs((totalDist - apexToMarkDist) / totalDist),Math.abs((totalDist - apexToMarkDist) / totalDist)]),
                array3_Multiply(markSide_BaseColor,[Math.abs((totalDist - baseToMarkDist) / totalDist), Math.abs((totalDist - baseToMarkDist) / totalDist), Math.abs((totalDist - baseToMarkDist) / totalDist)]));

            for (var idx = 0; idx < neighborCell_NE.bridge.SW.quad.length; idx++) {
                var f = triangulateJoint(markPoint, array3_Plus(neighborCell_NE.bridge.SW.quad[idx][3], hexMetric.offset.NE), array3_Plus(neighborCell_NE.bridge.SW.quad[idx][1], hexMetric.offset.NE))
                var vt = createVertexColorJoint(markColor, neighborCell_NE.bridge.SW.quadColor[idx][3], neighborCell_NE.bridge.SW.quadColor[idx][1]);
                f.forEach(a => thisJoint.faces.push(a));
                vt.forEach(a => thisJoint.vtColor.push(a));
            }
            var f = (dist_1 > dist_2) ?
                triangulateJoint(markPoint, cliffPoint_2, apexPoint) :
                triangulateJoint(markPoint, apexPoint, cliffPoint_1);
            var vt = (dist_1 > dist_2) ?
                createVertexColorJoint(markColor, cliffColor_2, apexColor) :
                createVertexColorJoint(markColor, apexColor, cliffColor_1)
            f.forEach(a => thisJoint.faces.push(a));
            vt.forEach(a => thisJoint.vtColor.push(a));

        }

    }

    /*************************************************** Joint SE  *****************************************************************/
    if ((arr[z][x].neighbor.E !== null) && (arr[z][x].neighbor.SE !== null)) {

        var thisCell = arr[z][x];
        var thisJoint = thisCell.joint.SE;

        var neighborCell_SE = arr[thisCell.neighbor.SE.z][thisCell.neighbor.SE.x];
        var neighborCell_E = arr[thisCell.neighbor.E.z][thisCell.neighbor.E.x];

        /*  Points Description

               p1  ________ p3
                   \      /
                    \    /
                     \  /
                      \/                      
                      p2
        */

        var p1 = thisCell.core.vertices[20];
        var p2 = array3_Plus(neighborCell_SE.core.vertices[12], hexMetric.offset.SE);
        var p3 = array3_Plus(neighborCell_E.core.vertices[4], hexMetric.offset.E);

        // 3 Flats
        if (thisCell.bridge.E.type == BridgeType.Flat && thisCell.bridge.SE.type == BridgeType.Flat && neighborCell_E.bridge.SW.type == BridgeType.Flat) {
            thisJoint.faces = []; thisJoint.vtColor = [];
            var f = triangulateJoint(p2, p1, p3)
            var vt = createVertexColorJoint(colortoArr(neighborCell_SE.mainColor), colortoArr(thisCell.mainColor), colortoArr(neighborCell_E.mainColor));
            for (var i = 0; i < optimizeInitFace; i++) {
                f.forEach(a => thisJoint.faces.push(a));
                vt.forEach(a => thisJoint.vtColor.push(a));
            }
        }
        // 3 Cliffs
        else if (thisCell.bridge.E.type == BridgeType.Cliff && thisCell.bridge.SE.type == BridgeType.Cliff && neighborCell_E.bridge.SW.type == BridgeType.Cliff) {
            thisJoint.faces = []; thisJoint.vtColor = [];
            var f = triangulateJoint(p2, p1, p3)
            var vt = createVertexColorJoint(colortoArr(neighborCell_SE.mainColor), colortoArr(thisCell.mainColor), colortoArr(neighborCell_E.mainColor));
            for (var i = 0; i < optimizeInitFace; i++) {
                f.forEach(a => thisJoint.faces.push(a));
                vt.forEach(a => thisJoint.vtColor.push(a));
            }
        }

        ////// 2 Steps 1 Flat (Case 1/3)
        else if ((thisCell.bridge.E.type == BridgeType.Flat) && (thisCell.bridge.SE.type == BridgeType.Step) && (neighborCell_E.bridge.SW.type == BridgeType.Step)) {
            thisJoint.faces = []; thisJoint.vtColor = [];
            for (var i = 0; i < thisCell.bridge.SE.quad.length; i++) {
                var idx = i;
                var res = genFace_vtColor_FromQuad(
                    thisCell.bridge.SE.quad[idx][1], thisCell.bridge.SE.quadColor[idx][1],
                    array3_Plus(neighborCell_E.bridge.SW.quad[idx][0], hexMetric.offset.E), neighborCell_E.bridge.SW.quadColor[idx][0],
                    thisCell.bridge.SE.quad[idx][3], thisCell.bridge.SE.quadColor[idx][3],
                    array3_Plus(neighborCell_E.bridge.SW.quad[idx][2], hexMetric.offset.E), neighborCell_E.bridge.SW.quadColor[idx][2],
                )
                res.faces.forEach(i => thisJoint.faces.push(i));
                res.vtColor.forEach(i => thisJoint.vtColor.push(i));
            }
        }
        ////// 2 Steps 1 Flat (Case 2/3)
        else if ((thisCell.bridge.SE.type == BridgeType.Flat) && (thisCell.bridge.E.type == BridgeType.Step) && (neighborCell_E.bridge.SW.type == BridgeType.Step)) {
            thisJoint.faces = []; thisJoint.vtColor = [];
            for (var i = 0; i < thisCell.bridge.E.quad.length; i++) {
                var idx = thisCell.bridge.E.quad.length - 1 - i;
                var res = genFace_vtColor_FromQuad(
                    thisCell.bridge.E.quad[i][0], thisCell.bridge.E.quadColor[i][0],
                    thisCell.bridge.E.quad[i][2], thisCell.bridge.E.quadColor[i][2],
                    array3_Plus(neighborCell_E.bridge.SW.quad[idx][2], hexMetric.offset.E), neighborCell_E.bridge.SW.quadColor[idx][2],
                    array3_Plus(neighborCell_E.bridge.SW.quad[idx][0], hexMetric.offset.E), neighborCell_E.bridge.SW.quadColor[idx][0],
                )
                res.faces.forEach(i => thisJoint.faces.push(i));
                res.vtColor.forEach(i => thisJoint.vtColor.push(i));
            }
        }
        ////// 2 Steps 1 Flat (Case 3/3)
        else if ((neighborCell_E.bridge.SW.type == BridgeType.Flat) && (thisCell.bridge.E.type == BridgeType.Step) && (thisCell.bridge.SE.type == BridgeType.Step)) {
            thisJoint.faces = []; thisJoint.vtColor = [];
            for (var i = 0; i < thisCell.bridge.E.quad.length; i++) {
                var idx = i;
                var res = genFace_vtColor_FromQuad(
                    thisCell.bridge.SE.quad[i][1], thisCell.bridge.SE.quadColor[i][1],
                    thisCell.bridge.E.quad[idx][0], thisCell.bridge.E.quadColor[idx][0],
                    thisCell.bridge.SE.quad[i][3], thisCell.bridge.SE.quadColor[i][3],
                    thisCell.bridge.E.quad[idx][2], thisCell.bridge.E.quadColor[idx][2]
                )
                res.faces.forEach(i => thisJoint.faces.push(i));
                res.vtColor.forEach(i => thisJoint.vtColor.push(i));
            }
        }
        //// 2 Cliffs 1 Flat
        else if (
            (thisCell.bridge.E.type == BridgeType.Flat && thisCell.bridge.SE.type == BridgeType.Cliff && neighborCell_E.bridge.SW.type == BridgeType.Cliff)
            || (thisCell.bridge.SE.type == BridgeType.Flat && thisCell.bridge.E.type == BridgeType.Cliff && neighborCell_E.bridge.SW.type == BridgeType.Cliff)
            || (neighborCell_E.bridge.SW.type == BridgeType.Flat && thisCell.bridge.SE.type == BridgeType.Cliff && thisCell.bridge.E.type == BridgeType.Cliff)) {

            thisJoint.faces = []; thisJoint.vtColor = [];
            var f = triangulateJoint(p2, p1, p3)
            var vt = createVertexColorJoint(colortoArr(neighborCell_SE.mainColor), colortoArr(thisCell.mainColor), colortoArr(neighborCell_E.mainColor));
            for (var i = 0; i < optimizeInitFace; i++) {
                f.forEach(a => thisJoint.faces.push(a));
                vt.forEach(a => thisJoint.vtColor.push(a));
            }
        }

        //// 2 Steps  1 Cliff (1/3)
        else if (thisCell.bridge.E.type == BridgeType.Cliff && thisCell.bridge.SE.type == BridgeType.Step && neighborCell_E.bridge.SW.type == BridgeType.Step) {
            thisJoint.faces = []; thisJoint.vtColor = [];
            var cliffPoint = thisCell.core.vertices[20];
            var stepPoint_1 = array3_Plus(neighborCell_E.core.vertices[4], hexMetric.offset.E);
            var stepPoint_2 = array3_Plus(neighborCell_SE.core.vertices[12], hexMetric.offset.SE);
            var dist_1 = calDistance(stepPoint_1, cliffPoint);
            var dist_2 = calDistance(stepPoint_2, cliffPoint);
            var cliffDirection = (dist_1 > dist_2) ? array3_Minus(stepPoint_1, cliffPoint) : array3_Minus(stepPoint_2, cliffPoint)
            var markPoint = array3_Plus(cliffPoint, array3_Multiply(cliffDirection, [0.5, 0.5, 0.5]));
            var markColor = array3_Multiply(array3_Plus(colortoArr(thisCell.mainColor), colortoArr(neighborCell_E.mainColor)),[0.5,0.5,0.5]);


            for (var idx = 0; idx < neighborCell_E.bridge.SW.quad.length; idx++) {
                var f = triangulateJoint(markPoint, array3_Plus(neighborCell_E.bridge.SW.quad[idx][0], hexMetric.offset.E), array3_Plus(neighborCell_E.bridge.SW.quad[idx][2], hexMetric.offset.E))
                var vt = createVertexColorJoint(markColor, neighborCell_E.bridge.SW.quadColor[idx][0], neighborCell_E.bridge.SW.quadColor[idx][2]);
                f.forEach(a => thisCell.joint.SE.faces.push(a));
                vt.forEach(a => thisCell.joint.SE.vtColor.push(a));
            }
            for (var idx = 0; idx < thisCell.bridge.SE.quad.length; idx++) {
                var f = triangulateJoint(markPoint, thisCell.bridge.SE.quad[idx][3], thisCell.bridge.SE.quad[idx][1])
                var vt = createVertexColorJoint(markColor, thisCell.bridge.SE.quadColor[idx][3], thisCell.bridge.SE.quadColor[idx][1]);
                f.forEach(a => thisJoint.faces.push(a));
                vt.forEach(a => thisJoint.vtColor.push(a));
            }

        }

        //// 2 Steps  1 Cliff (2/3)
        else if (thisCell.bridge.E.type == BridgeType.Step && thisCell.bridge.SE.type == BridgeType.Cliff && neighborCell_E.bridge.SW.type == BridgeType.Step) {
            thisJoint.faces = []; thisJoint.vtColor = [];
            var cliffPoint = array3_Plus(neighborCell_SE.core.vertices[12], hexMetric.offset.SE);
            var stepPoint_1 = array3_Plus(neighborCell_E.core.vertices[4], hexMetric.offset.E);
            var stepPoint_2 = thisCell.core.vertices[20];
            var dist_1 = calDistance(stepPoint_1, cliffPoint);
            var dist_2 = calDistance(stepPoint_2, cliffPoint);
            var cliffDirection = (dist_1 > dist_2) ? array3_Minus(stepPoint_1, cliffPoint) : array3_Minus(stepPoint_2, cliffPoint)
            var markPoint = array3_Plus(cliffPoint, array3_Multiply(cliffDirection, [0.5, 0.5, 0.5]));
            var markColor = array3_Multiply(array3_Plus(colortoArr(thisCell.mainColor), colortoArr(neighborCell_SE.mainColor)),[0.5,0.5,0.5]);

            for (var idx = 0; idx < neighborCell_E.bridge.SW.quad.length; idx++) {
                var f = triangulateJoint(markPoint, array3_Plus(neighborCell_E.bridge.SW.quad[idx][0], hexMetric.offset.E), array3_Plus(neighborCell_E.bridge.SW.quad[idx][2], hexMetric.offset.E))
                var vt = createVertexColorJoint(markColor, neighborCell_E.bridge.SW.quadColor[idx][0], neighborCell_E.bridge.SW.quadColor[idx][2]);
                f.forEach(a => thisJoint.faces.push(a));
                vt.forEach(a => thisJoint.vtColor.push(a));
            }
            for (var idx = 0; idx < thisCell.bridge.E.quad.length; idx++) {
                var f = triangulateJoint(markPoint, thisCell.bridge.E.quad[idx][0], thisCell.bridge.E.quad[idx][2])
                var vt = createVertexColorJoint(markColor, thisCell.bridge.E.quadColor[idx][0], thisCell.bridge.E.quadColor[idx][2]);
                f.forEach(a => thisJoint.faces.push(a));
                vt.forEach(a => thisJoint.vtColor.push(a));
            }

        }
        //// 2 Steps  1 Cliff (3/3)
        else if (thisCell.bridge.E.type == BridgeType.Step && thisCell.bridge.SE.type == BridgeType.Step && neighborCell_E.bridge.SW.type == BridgeType.Cliff) {
            thisJoint.faces = []; thisJoint.vtColor = [];
            var cliffPoint = array3_Plus(neighborCell_SE.core.vertices[12], hexMetric.offset.SE);
            var stepPoint_1 = array3_Plus(neighborCell_E.core.vertices[4], hexMetric.offset.E);
            var stepPoint_2 = thisCell.core.vertices[20];
            var dist_1 = calDistance(stepPoint_1, cliffPoint);
            var dist_2 = calDistance(stepPoint_2, cliffPoint);
            var cliffDirection = (dist_1 > dist_2) ? array3_Minus(stepPoint_1, cliffPoint) : array3_Minus(stepPoint_2, cliffPoint)
            var markPoint = array3_Plus(cliffPoint, array3_Multiply(cliffDirection, [0.5, 0.5, 0.5]));
            var markColor = array3_Multiply(array3_Plus(colortoArr(neighborCell_E.mainColor), colortoArr(neighborCell_SE.mainColor)),[0.5,0.5,0.5]);

            for (var idx = 0; idx < thisCell.bridge.SE.quad.length; idx++) {
                var f = triangulateJoint(markPoint, thisCell.bridge.SE.quad[idx][3], thisCell.bridge.SE.quad[idx][1])
                var vt = createVertexColorJoint(markColor, thisCell.bridge.SE.quadColor[idx][3], thisCell.bridge.SE.quadColor[idx][1]);
                f.forEach(a => thisJoint.faces.push(a));
                vt.forEach(a => thisJoint.vtColor.push(a));
            }
            for (var idx = 0; idx < thisCell.bridge.E.quad.length; idx++) {
                var f = triangulateJoint(markPoint, thisCell.bridge.E.quad[idx][0], thisCell.bridge.E.quad[idx][2])
                var vt = createVertexColorJoint(markColor, thisCell.bridge.E.quadColor[idx][0], thisCell.bridge.E.quadColor[idx][2]);
                f.forEach(a => thisJoint.faces.push(a));
                vt.forEach(a => thisJoint.vtColor.push(a));
            }

        }


        /////////////////////////////////////////////////////////////////////////////////////
        //// 2 Cliffs  1 Step (1/3)
        else if (thisCell.bridge.E.type == BridgeType.Step && thisCell.bridge.SE.type == BridgeType.Cliff && neighborCell_E.bridge.SW.type == BridgeType.Cliff) {

            thisJoint.faces = []; thisJoint.vtColor = [];
            var stepEnd_p1 = thisCell.bridge.E.quad[0][0];
            var stepEnd_p2 = thisCell.bridge.E.quad[thisCell.bridge.E.quad.length-1][2];

            // Consider step side as a base
            var apexPoint = array3_Plus(neighborCell_SE.core.vertices[12], hexMetric.offset.SE);
            var apexColor = colortoArr(neighborCell_SE.mainColor);
            var cliffPoint_1 = array3_Plus(neighborCell_E.core.vertices[4], hexMetric.offset.E);
            var cliffColor_1 = colortoArr(neighborCell_E.mainColor);
            var cliffPoint_2 = thisCell.core.vertices[20];
            var cliffColor_2 = colortoArr(thisCell.mainColor);

            var dist_1 = calDistance(cliffPoint_1, apexPoint);
            var dist_2 = calDistance(cliffPoint_2, apexPoint);
            var markDirection, markSide_BasePoint, markSide_BaseColor, totalDist;
            if (dist_1 > dist_2) {
                totalDist = dist_1;
                markSide_BasePoint = cliffPoint_1;
                markSide_BaseColor = cliffColor_1;
                markDirection = array3_Divide(array3_Minus(cliffPoint_1, apexPoint), [dist_1 / dist_2, dist_1 / dist_2, dist_1 / dist_2])
            }
            else {
                totalDist = dist_2;
                markSide_BasePoint = cliffPoint_2;
                markSide_BaseColor = cliffColor_2;
                markDirection = array3_Divide(array3_Minus(cliffPoint_2, apexPoint), [dist_2 / dist_1, dist_2 / dist_1, dist_2 / dist_1])
            }
            var markPoint = array3_Plus(apexPoint, markDirection);
            var apexToMarkDist = calDistance(markPoint, apexPoint)
            var baseToMarkDist = calDistance(markPoint, markSide_BasePoint)
            var markColor = array3_Plus(array3_Multiply(apexColor,[Math.abs((totalDist - apexToMarkDist) / totalDist),Math.abs((totalDist - apexToMarkDist) / totalDist),Math.abs((totalDist - apexToMarkDist) / totalDist)]),
                array3_Multiply(markSide_BaseColor,[Math.abs((totalDist - baseToMarkDist) / totalDist), Math.abs((totalDist - baseToMarkDist) / totalDist), Math.abs((totalDist - baseToMarkDist) / totalDist)]));


            for (var idx = 0; idx < thisCell.bridge.E.quad.length; idx++) {
                var f = triangulateJoint(markPoint, thisCell.bridge.E.quad[idx][0], thisCell.bridge.E.quad[idx][2])
                var vt = createVertexColorJoint(markColor, thisCell.bridge.E.quadColor[idx][0], thisCell.bridge.E.quadColor[idx][2]);
                f.forEach(a => thisJoint.faces.push(a));
                vt.forEach(a => thisJoint.vtColor.push(a));
            }

            var f = (dist_1 > dist_2) ?
                triangulateJoint(markPoint, apexPoint, cliffPoint_2) : 
                triangulateJoint(markPoint, cliffPoint_1, apexPoint);
            var vt = (dist_1 > dist_2)?
                createVertexColorJoint(markColor, apexColor, cliffColor_2 ) :
                createVertexColorJoint(markColor, cliffColor_1, apexColor )
            f.forEach(a => thisJoint.faces.push(a));
            vt.forEach(a => thisJoint.vtColor.push(a));
        }
        //// 2 Cliffs  1 Step (2/3)
        else if (thisCell.bridge.E.type == BridgeType.Cliff && thisCell.bridge.SE.type == BridgeType.Step && neighborCell_E.bridge.SW.type == BridgeType.Cliff) {

            thisJoint.faces = []; thisJoint.vtColor = [];
            var stepEnd_p1 = thisCell.bridge.SE.quad[0][1];
            var stepEnd_p2 = thisCell.bridge.SE.quad[thisCell.bridge.SE.quad.length-1][3];

            // Consider step side as a base
            var apexPoint = array3_Plus(neighborCell_E.core.vertices[4], hexMetric.offset.E);
            var apexColor = colortoArr(neighborCell_E.mainColor);
            var cliffPoint_1 = array3_Plus(neighborCell_SE.core.vertices[12], hexMetric.offset.SE);
            var cliffColor_1 = colortoArr(neighborCell_SE.mainColor);
            var cliffPoint_2 = thisCell.core.vertices[20];
            var cliffColor_2 = colortoArr(thisCell.mainColor);

            var dist_1 = calDistance(cliffPoint_1, apexPoint);
            var dist_2 = calDistance(cliffPoint_2, apexPoint);
            var markDirection, markSide_BasePoint, markSide_BaseColor, totalDist;
            if (dist_1 > dist_2) {
                totalDist = dist_1;
                markSide_BasePoint = cliffPoint_1;
                markSide_BaseColor = cliffColor_1;
                markDirection = array3_Divide(array3_Minus(cliffPoint_1, apexPoint), [dist_1 / dist_2, dist_1 / dist_2, dist_1 / dist_2])
            }
            else {
                totalDist = dist_2;
                markSide_BasePoint = cliffPoint_2;
                markSide_BaseColor = cliffColor_2;
                markDirection = array3_Divide(array3_Minus(cliffPoint_2, apexPoint), [dist_2 / dist_1, dist_2 / dist_1, dist_2 / dist_1])
            }
            var markPoint = array3_Plus(apexPoint, markDirection);
            var apexToMarkDist = calDistance(markPoint, apexPoint)
            var baseToMarkDist = calDistance(markPoint, markSide_BasePoint)
            var markColor = array3_Plus(array3_Multiply(apexColor,[Math.abs((totalDist - apexToMarkDist) / totalDist),Math.abs((totalDist - apexToMarkDist) / totalDist),Math.abs((totalDist - apexToMarkDist) / totalDist)]),
                array3_Multiply(markSide_BaseColor,[Math.abs((totalDist - baseToMarkDist) / totalDist), Math.abs((totalDist - baseToMarkDist) / totalDist), Math.abs((totalDist - baseToMarkDist) / totalDist)]));


            for (var idx = 0; idx < thisCell.bridge.SE.quad.length; idx++) {
                var f = triangulateJoint(markPoint, thisCell.bridge.SE.quad[idx][3], thisCell.bridge.SE.quad[idx][1])
                var vt = createVertexColorJoint(markColor, thisCell.bridge.SE.quadColor[idx][3], thisCell.bridge.SE.quadColor[idx][1]);
                f.forEach(a => thisJoint.faces.push(a));
                vt.forEach(a => thisJoint.vtColor.push(a));
            }

            var f = (dist_1 > dist_2) ?
                triangulateJoint(markPoint, cliffPoint_2, apexPoint) : 
                triangulateJoint(markPoint, apexPoint, cliffPoint_1);
            var vt = (dist_1 > dist_2)?
                createVertexColorJoint(markColor, cliffColor_2, apexColor) :
                createVertexColorJoint(markColor, apexColor, cliffColor_1)
            f.forEach(a => thisJoint.faces.push(a));
            vt.forEach(a => thisJoint.vtColor.push(a));
        }
        //// 2 Cliffs  1 Step (3/3)
        else if (thisCell.bridge.E.type == BridgeType.Cliff && thisCell.bridge.SE.type == BridgeType.Cliff && neighborCell_E.bridge.SW.type == BridgeType.Step) {

            thisJoint.faces = []; thisJoint.vtColor = [];
            var stepEnd_p1 = neighborCell_E.bridge.SW.quad[0][0];
            var stepEnd_p2 = neighborCell_E.bridge.SW.quad[neighborCell_E.bridge.SW.quad.length-1][2];

            // Consider step side as a base
            var apexPoint = thisCell.core.vertices[20];
            var apexColor = colortoArr(thisCell.mainColor);
            var cliffPoint_1 = array3_Plus(neighborCell_SE.core.vertices[12], hexMetric.offset.SE);
            var cliffColor_1 = colortoArr(neighborCell_SE.mainColor);
            var cliffPoint_2 = array3_Plus(neighborCell_E.core.vertices[4], hexMetric.offset.E);
            var cliffColor_2 = colortoArr(neighborCell_E.mainColor);

            var dist_1 = calDistance(cliffPoint_1, apexPoint);
            var dist_2 = calDistance(cliffPoint_2, apexPoint);
            var markDirection, markSide_BasePoint, markSide_BaseColor, totalDist;
            if (dist_1 > dist_2) {
                totalDist = dist_1;
                markSide_BasePoint = cliffPoint_1;
                markSide_BaseColor = cliffColor_1;
                markDirection = array3_Divide(array3_Minus(cliffPoint_1, apexPoint), [dist_1 / dist_2, dist_1 / dist_2, dist_1 / dist_2])
            }
            else {
                totalDist = dist_2;
                markSide_BasePoint = cliffPoint_2;
                markSide_BaseColor = cliffColor_2;
                markDirection = array3_Divide(array3_Minus(cliffPoint_2, apexPoint), [dist_2 / dist_1, dist_2 / dist_1, dist_2 / dist_1])
            }
            var markPoint = array3_Plus(apexPoint, markDirection);
            var apexToMarkDist = calDistance(markPoint, apexPoint)
            var baseToMarkDist = calDistance(markPoint, markSide_BasePoint)
            var markColor = array3_Plus(array3_Multiply(apexColor,[Math.abs((totalDist - apexToMarkDist) / totalDist),Math.abs((totalDist - apexToMarkDist) / totalDist),Math.abs((totalDist - apexToMarkDist) / totalDist)]),
                array3_Multiply(markSide_BaseColor,[Math.abs((totalDist - baseToMarkDist) / totalDist), Math.abs((totalDist - baseToMarkDist) / totalDist), Math.abs((totalDist - baseToMarkDist) / totalDist)]));


            for (var idx = 0; idx < neighborCell_E.bridge.SW.quad.length; idx++) {
                var f = triangulateJoint(markPoint, array3_Plus(neighborCell_E.bridge.SW.quad[idx][0], hexMetric.offset.E), array3_Plus(neighborCell_E.bridge.SW.quad[idx][2], hexMetric.offset.E))
                var vt = createVertexColorJoint(markColor, neighborCell_E.bridge.SW.quadColor[idx][0], neighborCell_E.bridge.SW.quadColor[idx][2]);
                f.forEach(a => thisJoint.faces.push(a));
                vt.forEach(a => thisJoint.vtColor.push(a));
            }

            var f = (dist_1 > dist_2) ?
                triangulateJoint(markPoint, apexPoint, cliffPoint_2) : 
                triangulateJoint(markPoint, cliffPoint_1, apexPoint);
            var vt = (dist_1 > dist_2)?
                createVertexColorJoint(markColor, apexColor, cliffColor_2) :
                createVertexColorJoint(markColor, cliffColor_1, apexColor)
            f.forEach(a => thisJoint.faces.push(a));
            vt.forEach(a => thisJoint.vtColor.push(a));
        }

    }

}

function calDistance(p1, p2) {
    return Math.sqrt(((p2[0] - p1[0]) * (p2[0] - p1[0])) + ((p2[1] - p1[1]) * (p2[1] - p1[1])) + ((p2[2] - p1[2]) * (p2[2] - p1[2])));
}

function array3_Plus(arr1, arr2) {
    return [arr1[0] + arr2[0], arr1[1] + arr2[1], arr1[2] + arr2[2]];
}

function array3_Minus(arr1, arr2) {
    return [arr1[0] - arr2[0], arr1[1] - arr2[1], arr1[2] - arr2[2]];
}

function array3_Multiply(arr1, arr2) {
    return [arr1[0] * arr2[0], arr1[1] * arr2[1], arr1[2] * arr2[2]];
}

function array3_Divide(arr1, arr2) {
    return [arr1[0] / arr2[0], arr1[1] / arr2[1], arr1[2] / arr2[2]];
}

function defineBridgeType(thisCell, targetCell, stepThreshold) {
    if (thisCell.elevation == targetCell.elevation) {
        return BridgeType.Flat;
    }
    else if (thisCell.elevation == targetCell.elevation + stepThreshold) {
        return BridgeType.Step;
    }
    else if (thisCell.elevation > targetCell.elevation) {
        return BridgeType.Cliff;
    }
    else if (targetCell.elevation == thisCell.elevation + stepThreshold) {
        return BridgeType.Step;
    }
    else if (targetCell.elevation > thisCell.elevation) {
        return BridgeType.Cliff;
    }
}

const BridgeType = {
    Flat: "Flat",
    Step: "Step",
    Cliff: "Cliff"
}




function triangulateJoint(ori_1, target_1, target_2, offset_target_1, offset_target_2) {
    var tf = [];
    tf.push(target_1[0]); tf.push(target_1[1]); tf.push(target_1[2]);
    tf.push(ori_1[0]); tf.push(ori_1[1]); tf.push(ori_1[2]);
    tf.push(target_2[0]); tf.push(target_2[1]); tf.push(target_2[2]);
    return tf;
}

function createVertexColorJoint(origin_color, target_1_color, target_2_color) {
    /** param type is THREE.Color */
    // var bc = [];
    // bc.push(target_1_color.r, target_1_color.g, target_1_color.b);
    // bc.push(origin_color.r, origin_color.g, origin_color.b);
    // bc.push(target_2_color.r, target_2_color.g, target_2_color.b);

    var bc = [];
    bc.push(target_1_color[0], target_1_color[1], target_1_color[2]);
    bc.push(origin_color[0], origin_color[1], origin_color[2]);
    bc.push(target_2_color[0], target_2_color[1], target_2_color[2]);



    return bc;
}



function colortoArr(threeColor) {
    return [threeColor.r, threeColor.g, threeColor.b];
}


function triangulateHexCore(cell_core_vt, elevation) {
    var res = [];
    for (var i = 0; i < cell_core_vt.length - 1; i++) {
        res.push(cell_core_vt[i][0]); res.push(cell_core_vt[i][1]); res.push(cell_core_vt[i][2]);
        res.push(0, elevation, 0);
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



function genFace_vtColor_FromQuad(tl_p, tl_c, tr_p, tr_c, bl_p, bl_c, br_p, br_c) {

    //top mean this hex 
    //bot mean neighbor /// clockwise

    var bf = [];
    var bc = [];
    //faces
    bf.push(br_p[0]); bf.push(br_p[1]); bf.push(br_p[2]);
    bf.push(tr_p[0]); bf.push(tr_p[1]); bf.push(tr_p[2]);
    bf.push(bl_p[0]); bf.push(bl_p[1]); bf.push(bl_p[2]);

    bf.push(bl_p[0]); bf.push(bl_p[1]); bf.push(bl_p[2]);
    bf.push(tr_p[0]); bf.push(tr_p[1]); bf.push(tr_p[2]);
    bf.push(tl_p[0]); bf.push(tl_p[1]); bf.push(tl_p[2]);

    //color
    bc.push(br_c[0]); bc.push(br_c[1]); bc.push(br_c[2]);
    bc.push(tr_c[0]); bc.push(tr_c[1]); bc.push(tr_c[2]);
    bc.push(bl_c[0]); bc.push(bl_c[1]); bc.push(bl_c[2]);

    bc.push(bl_c[0]); bc.push(bl_c[1]); bc.push(bl_c[2]);
    bc.push(tr_c[0]); bc.push(tr_c[1]); bc.push(tr_c[2]);
    bc.push(tl_c[0]); bc.push(tl_c[1]); bc.push(tl_c[2]);

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
                <mesh receiveShadow castShadow
                    onClick={(e) => { e.stopPropagation(); props.childClickEv(props.info.idx); setCellInfo(!cellInfo); }}
                    onPointerOver={(e) => { e.stopPropagation(); setHover(true) }}
                    onPointerOut={(e) => { e.stopPropagation(); setHover(false) }}
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

                {(props.info.bridge.E.faces.length > 0) && <mesh receiveShadow castShadow>
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
                </mesh>}
                {props.info.neighbor.SE && <mesh receiveShadow castShadow>
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
                </mesh>}
                {props.info.neighbor.SW && <mesh receiveShadow castShadow>
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
                </mesh>}

                {(props.info.joint.NE.faces.length > 0) && <mesh receiveShadow castShadow>
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
                {(props.info.joint.SE.faces.length > 0) && <mesh receiveShadow castShadow>
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



