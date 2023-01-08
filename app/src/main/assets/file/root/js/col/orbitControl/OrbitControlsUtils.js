// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';

/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 */

import { COL } from '../COL.js';
import { Model } from '../core/Model.js';

import {Vector2 as THREE_Vector2,
    Vector3 as THREE_Vector3,
} from '../../static/three.js/three.js-r135/build/three.module.js';


// ipad shows as OS: MAC (for Safari), Unknown (for Chrome) ???

COL.OrbitControlsUtils = {
    defaultRotationVal: 0,
    defaultFlipY: true,
};

COL.OrbitControlsUtils.printCameraData = function (camera) {

    console.log('camera: uuid, zoom:',
        camera.uuid, ',',
        camera.zoom
    );
    
    console.log('camera: left, right, top, bottom:',
        camera.left, ',',
        camera.right, ',',
        camera.top, ',',
        camera.bottom
    );

    let worldDirection = new THREE_Vector3();
    camera.getWorldDirection ( worldDirection );

    console.log('camera: position, worldDirection:',
        camera.position, ',',
        worldDirection);
};

// NDC_Coord (a.k.a. normalizedMouseCoord) - is normalized to [-1, 1]
COL.OrbitControlsUtils.NDC_Coord_to_WorldCoord = function (camera, NDC_Coord) {
    // console.log('BEG NDC_Coord_to_WorldCoord');
    
    // If you transform the camera in 3D space and you directly use Vector3.project() or Vector3.unproject(), you have to call updateMatrixWorld().
    // https://discourse.threejs.org/t/ortho-camera-pixel-to-world-coordinate-world-coordinate-to-pixel/20719
    // https://discourse.threejs.org/t/how-to-converting-world-coordinates-to-2d-mouse-coordinates-in-threejs/2251
    let point3d_inWorldCoord = new THREE_Vector3( NDC_Coord.x, NDC_Coord.y, -1 ).unproject( camera );

    return point3d_inWorldCoord;
};

// Normalized Device Coordinate (NDC)
// https://threejs.org/docs/#api/en/math/Vector3.unproject
COL.OrbitControlsUtils.worldCoord_to_NDC_coord = function (camera, worldCoord) {
    // console.log('BEG worldCoord_to_NDC_coord');
    
    // If you transform the camera in 3D space and you directly use Vector3.project() or Vector3.unproject(), you have to call updateMatrixWorld().
    // https://discourse.threejs.org/t/ortho-camera-pixel-to-world-coordinate-world-coordinate-to-pixel/20719
    let NDC_coord = new THREE_Vector3( worldCoord.x, worldCoord.y, worldCoord.z ).project( camera );

    return NDC_coord;
};

COL.OrbitControlsUtils.getRotationParams = function (imageOrientation) {
    // console.log('BEG COL.OrbitControlsUtils.getRotationParams');
    // console.log('imageOrientation', imageOrientation);
    
    let rotationVal = COL.OrbitControlsUtils.defaultRotationVal;
    let flipY = COL.OrbitControlsUtils.defaultFlipY;

    let browserDetect = COL.model.getBrowserDetect();
    // console.log('browserDetect.OS', browserDetect.OS);
    // console.log('browserDetect.browser', browserDetect.browser);
    // console.log('browserDetect.version', browserDetect.version);
    
    switch (imageOrientation) {
        case -1:
        case 0:
        case 1:
        {
            // landscape
            switch (browserDetect.OS) {
                case 'Linux':
                case 'Android':
                case 'Windows':
                case 'Mac':
                case 'iOS':
                {
                    rotationVal = 0;
                    flipY = true;
                    break;
                }
                default:
                {
                    // console.log('OS is not supported: ', browserDetect.OS, '. Using the default image orientation' ); 
                    break;
                }
            }
            break;
        }
        case 2:
        {
            // landscape
            switch (browserDetect.OS) {
                case 'Linux':
                case 'Android':
                case 'Windows':
                case 'Mac':
                {
                    switch( browserDetect.browser ) {
                        case 'Chrome':
                        case 'Firefox':
                        case 'Safari':
                        {
                            rotationVal = (0);
                            flipY = true;
                            break;
                        }
                        default:
                        {
                            rotationVal = (-Math.PI);
                            flipY = false;
                            break;
                        }
                    }
                    break;
                }
                case 'iOS':
                {
                    rotationVal = 0;
                    flipY = true;
                    break;
                }
                default:
                {
                    // console.log('OS is not supported: ', browserDetect.OS, '. Using the default image orientation' ); 
                    break;
                }
            }
            break;
        }
        case 3:
        {
            // landscape
            switch (browserDetect.OS) {
                case 'Linux':
                case 'Android':
                case 'Windows':
                case 'Mac':
                {
                    switch( browserDetect.browser ) {
                        case 'Chrome':
                        case 'Firefox':
                        case 'Safari':
                        {
                            rotationVal = (0);
                            flipY = true;
                            break;
                        }
                        default:
                        {
                            rotationVal = (-Math.PI);
                            flipY = true;
                            break;
                        }
                    }
                    break;
                }
                case 'iOS':
                {
                    rotationVal = 0;
                    flipY = true;
                    break;
                }
                default:
                {
                    // console.log('OS is not supported: ', browserDetect.OS, '. Using the default image orientation' ); 
                    break;
                }
            }
            break;
        }
        case 4:
        {
            // landscape
            switch (browserDetect.OS) {
                case 'Linux':
                case 'Android':
                case 'Windows':
                case 'Mac':
                {
                    switch( browserDetect.browser ) {
                        case 'Chrome':
                        case 'Firefox':
                        case 'Safari':
                        {
                            rotationVal = (0);
                            flipY = true;
                            break;
                        }
                        default:
                        {
                            rotationVal = 0;
                            flipY = false;
                            break;
                        }
                    }
                    break;
                }
                case 'iOS':
                {
                    rotationVal = 0;
                    flipY = true;
                    break;
                }
                default:
                {
                    // console.log('OS is not supported: ', browserDetect.OS, '. Using the default image orientation' ); 
                    break;
                }
            }
            break;
        }
        case 5:
        {
            // portrait
            switch (browserDetect.OS) {
                case 'Linux':
                case 'Android':
                case 'Windows':
                case 'Mac':
                {
                    switch( browserDetect.browser ) {
                        case 'Chrome':
                        case 'Firefox':
                        case 'Safari':
                        {
                            rotationVal = (0);
                            flipY = true;
                            break;
                        }
                        default:
                        {
                            rotationVal = (-Math.PI / 2);
                            flipY = false;
                            break;
                        }
                    }
                    break;
                }
                case 'iOS':
                {
                    rotationVal = 0;
                    flipY = true;
                    break;
                }
                default:
                {
                    // console.log('OS is not supported: ', browserDetect.OS, '. Using the default image orientation' ); 
                    break;
                }
            }
            break;
        }
        case 6:
        {
            // portrait
            switch (browserDetect.OS) {
                case 'Linux':
                case 'Android':
                case 'Windows':
                case 'Mac':
                {
                    switch( browserDetect.browser ) {
                        case 'Chrome':
                        case 'Firefox':
                        case 'Safari':
                        {
                            rotationVal = (0);
                            flipY = true;
                            break;
                        }
                        default:
                        {
                            rotationVal = (-Math.PI / 2);
                            flipY = true;
                            break;
                        }
                    }
                    break;
                }
                case 'iOS':
                {
                    rotationVal = 0;
                    flipY = true;
                    break;
                }
                default:
                {
                    // console.log('OS is not supported: ', browserDetect.OS, '. Using the default image orientation' ); 
                    break;
                }
            }
            break;
        }
        case 7:
        {
            // portrait
            switch (browserDetect.OS) {
                case 'Linux':
                case 'Android':
                case 'Windows':
                case 'Mac':
                {
                    switch( browserDetect.browser ) {
                        case 'Chrome':
                        case 'Firefox':
                        case 'Safari':
                        {
                            rotationVal = (0);
                            flipY = true;
                            break;
                        }
                        default:
                        {
                            rotationVal = (Math.PI / 2);
                            flipY = false;
                            break;
                        }
                    }
                    break;
                }
                case 'iOS':
                {
                    rotationVal = 0;
                    flipY = true;
                    break;
                }
                default:
                {
                    // console.log('OS is not supported: ', browserDetect.OS, '. Using the default image orientation' ); 
                    break;
                }
            }
            break;
        }
        case 8:
        {
            // portrait
            switch (browserDetect.OS) {
                case 'Linux':
                case 'Android':
                case 'Windows':
                case 'Mac':
                {
                    switch( browserDetect.browser ) {
                        case 'Chrome':
                        case 'Firefox':
                        case 'Safari':
                        {
                            rotationVal = (0);
                            flipY = true;
                            break;
                        }
                        default:
                        {
                            rotationVal = (Math.PI / 2);
                            flipY = true;
                            break;
                        }
                    }
                    break;
                }
                case 'iOS':
                {
                    rotationVal = 0;
                    flipY = true;
                    break;
                }
                default:
                {
                    // console.log('OS is not supported: ', browserDetect.OS, '. Using the default image orientation' ); 
                    break;
                }
            }
            break;
        }
        default:
        {
            let msgStr = 'imageOrientation is not supported: ' + imageOrientation;
            console.error(msgStr); 
            console.error('Using the default orientation'); 
            rotationVal = 0;
            flipY = true;
            break;
        }
    }

    let rotationParams = {
        rotationVal: rotationVal,
        flipY: flipY
    };

    return rotationParams;
};

COL.OrbitControlsUtils.getScaleAndRatio = function (width, height, imageOrientation) {
    // console.log('BEG COL.OrbitControlsUtils.getScaleAndRatio');
    
    let browserDetect = COL.model.getBrowserDetect();
    // console.log('browserDetect.OS', browserDetect.OS);
    // console.log('browserDetect.browser', browserDetect.browser);
    // console.log('browserDetect.version', browserDetect.version);

    // console.log('imageOrientation', imageOrientation); 
    let scaleX = width;
    let scaleY = height;
    switch (imageOrientation) {
        case -1:
        case 0:
        case 1:
        case 2:
        case 3:
        case 4:
        {
            // landscape
            scaleX = width;
            scaleY = height;
            break;
        }
        case 5:
        {
            switch (browserDetect.OS) {
                case 'Linux':
                case 'Android':
                case 'Windows':
                case 'Mac':
                {
                    switch( browserDetect.browser ) {
                        case 'Chrome':
                        case 'Firefox':
                        case 'Safari':
                        {
                            scaleX = width;
                            scaleY = height;
                            break;
                        }
                        default:
                        {
                            scaleX = height;
                            scaleY = width;
                            break;
                        }
                    }
                    break;
                }
                case 'iOS':
                {
                    scaleX = width;
                    scaleY = height;
                    break;
                }
                default:
                {
                    // console.log('OS is not supported: ', browserDetect.OS, '. Using the default image orientation' ); 
                    break;
                }
            }
            break;
        }
        case 6:
        {
            // portrait
            switch (browserDetect.OS) {
                case 'Linux':
                case 'Android':
                case 'Windows':
                case 'Mac':
                {
                    switch( browserDetect.browser ) {
                        case 'Chrome':
                        case 'Firefox':
                        case 'Safari':
                        {
                            scaleX = width;
                            scaleY = height;
                            break;
                        }
                        default:
                        {
                            scaleX = height;
                            scaleY = width;
                            break;
                        }
                    }
                    break;
                }
                case 'iOS':
                {
                    scaleX = width;
                    scaleY = height;
                    break;
                }
                default:
                {
                    // console.log('OS is not supported: ', browserDetect.OS, '. Using the default image orientation' ); 
                    break;
                }
            }
            break;
        }
        case 7:
        {
            // portrait
            switch (browserDetect.OS) {
                case 'Linux':
                case 'Android':
                case 'Windows':
                case 'Mac':
                {
                    switch( browserDetect.browser ) {
                        case 'Chrome':
                        case 'Firefox':
                        case 'Safari':
                        {
                            scaleX = width;
                            scaleY = height;
                            break;
                        }
                        default:
                        {
                            scaleX = height;
                            scaleY = width;
                            break;
                        }
                    }
                    break;
                }
                case 'iOS':
                {
                    scaleX = width;
                    scaleY = height;
                    break;
                }
                default:
                {
                    // console.log('OS is not supported: ', browserDetect.OS, '. Using the default image orientation' ); 
                    break;
                }
            }
            break;
        }
        case 8:
        {
            // portrait
            switch (browserDetect.OS) {
                case 'Linux':
                case 'Android':
                case 'Windows':
                case 'Mac':
                {
                    switch( browserDetect.browser ) {
                        case 'Chrome':
                        case 'Firefox':
                        case 'Safari':
                        {
                            scaleX = width;
                            scaleY = height;
                            break;
                        }
                        default:
                        {
                            scaleX = height;
                            scaleY = width;
                            break;
                        }
                    }
                    break;
                }
                case 'iOS':
                {
                    scaleX = width;
                    scaleY = height;
                    break;
                }
                default:
                {
                    // console.log('OS is not supported: ', browserDetect.OS, '. Using the default image orientation' ); 
                    break;
                }
            }
            break;
        }
        default:
        {
            let msgStr = 'imageOrientation is not supported: ' + imageOrientation;
            console.error(msgStr); 
            console.error('Using the default orientation'); 
            // throw new Error(msgStr);

            scaleX = width;
            scaleY = height;
            break;
        }
    }

    let rotationParams = COL.OrbitControlsUtils.getRotationParams(imageOrientation);

    let retVal = {
        scaleX: scaleX,
        scaleY: scaleY,
        rotationVal: rotationParams.rotationVal,
        flipY: rotationParams.flipY
    };

    return retVal;
};

COL.OrbitControlsUtils.calcCanvasParams = function (guiWindowWidth,
    guiWindowHeight,
    imageWidth,
    imageHeight,
    isImageViewPane) {
    // console.log('BEG calcCanvasParams');

    if(isImageViewPane) {
        // console.log('calcCanvasParams for imageView pane');
    }

    // canvasWidth, canvasHeight - the canvas size that preserves the aspectRatio of the image.
    // The canvas size exceeds the gui window, i.e. canvasWidth>=guiWindowWidth, canvasHeight>=guiWindowHeight
    // canvasWidth, canvasHeight is also the size of the viewport.
    let canvasWidth = 0;
    let canvasHeight = 0;

    // canvasOffsetLeft, canvasOffsetTop - offset from the orgin of the gui window to the origin of the canvas and the viewport
    let canvasOffsetLeft = 0;
    let canvasOffsetTop = 0;

    let guiWindow_w_h_ratio = guiWindowWidth / guiWindowHeight;
    let image_w_h_ratio = imageWidth / imageHeight;
    let viewportExtendsOnX = false;

    if(guiWindow_w_h_ratio > image_w_h_ratio) {
        // canvasHeight is bigger than guiWindowHeight
        canvasWidth = guiWindowWidth;
        canvasHeight = canvasWidth / image_w_h_ratio;
        
        canvasOffsetTop = (canvasHeight - guiWindowHeight) / 2;
        viewportExtendsOnX = false;
    }
    else {
        // canvasWidth is bigger than guiWindowWidth
        canvasHeight = guiWindowHeight;
        canvasWidth = canvasHeight * image_w_h_ratio;
        
        canvasOffsetLeft = (canvasWidth - guiWindowWidth) / 2;
        viewportExtendsOnX = true;
    }

    let canvasParams = {
        viewportExtendsOnX: viewportExtendsOnX,
        canvasOffsetLeft: canvasOffsetLeft,
        canvasOffsetTop: canvasOffsetTop,
        canvasWidth: canvasWidth,
        canvasHeight: canvasHeight
    };

    return canvasParams;
};
