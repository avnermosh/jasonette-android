
import {
    Vector2 as THREE_Vector2,
} from '../../static/three.js/three.js-r135/build/three.module.js';

import { COL } from  '../COL.js';
import { Model } from './Model.js';
import { ImageView } from './ImageView.js';

/**
* Item name is unique
*/
fabric.Canvas.prototype.getItemByName = function(name) {
    var object = null,
        objects = this.getObjects();
  
    for (var i = 0, len = this.size(); i < len; i++) {
        if (objects[i].name && objects[i].name === name) {
            object = objects[i];
            break;
        }
    }
  
    return object;
};


/**
* Fabric.js patch
*/
// code changes are based on:
// https://discourse.threejs.org/t/how-to-click-on-a-threejs-3dcanvas-to-select-and-modify-a-fabricjs-object/50719/2
// https://stackoverflow.com/questions/57423973/emit-click-events-by-coords-x-y-fabric-js/57627058#57627058
fabric.Canvas.prototype.getPointer = function (e, ignoreZoom) {
    // console.log('BEG getPointer');

    if (this._absolutePointer && !ignoreZoom) {
        return this._absolutePointer;
    }
    if (this._pointer && ignoreZoom) {
        return this._pointer;
    }
    var pointer = fabric.util.getPointer(e),
        upperCanvasEl = this.upperCanvasEl,
        bounds = upperCanvasEl.getBoundingClientRect(),
        boundsWidth = bounds.width || 0,
        boundsHeight = bounds.height || 0,
        cssScale;
  
    if (!boundsWidth || !boundsHeight ) {
        if ('top' in bounds && 'bottom' in bounds) {
            boundsHeight = Math.abs( bounds.top - bounds.bottom );
        }
        if ('right' in bounds && 'left' in bounds) {
            boundsWidth = Math.abs( bounds.right - bounds.left );
        }
    }
    this.calcOffset();
    pointer.x = pointer.x - this._offset.left;
    pointer.y = pointer.y - this._offset.top;
    /* BEGIN PATCH CODE */
    let selectedImage3dCanvasEl = document.getElementById('selectedImage3dCanvasId');
    // if (e.type == 'touchstart' || e.type == 'touchmove') {
    if (e.type !== 'mouseup' && e.type !== 'touchend' && e.type !== 'pointerup') {
        // console.log('e.type', e.type);
        // tbd - not clear why if the event type is any of the above, we should skip the PATCH CODE
        var positionOnImage = getPositionOnImage(e.target);
        if(positionOnImage == null) {
            // how can it be that positionOnImage is null if we hit the 'selectedImage3dCanvasEl' element ?
            console.warn('positionOnImage == null 1');
            return {x: null, y: null};
        }
        // console.log('positionOnImage:', positionOnImage);
        pointer.x = positionOnImage.x;
        pointer.y = positionOnImage.y;
    }
    // else{
    //     console.log('e.type:', e.type);
    // }

    /* END PATCH CODE */

    // console.log('pointer:', pointer);    
    if (!ignoreZoom) {
        pointer = this.restorePointerVpt(pointer);
    }
  
    if (boundsWidth === 0 || boundsHeight === 0) {
        cssScale = { width: 1, height: 1 };
    }
    else {
        cssScale = {
            width: upperCanvasEl.width / boundsWidth,
            height: upperCanvasEl.height / boundsHeight
        };
    }
  
    return {
        x: pointer.x * cssScale.width,
        y: pointer.y * cssScale.height
    };
};


/**
  * Three.js Helper functions
  */
export function getPositionOnImage(sceneContainer) {
    // console.log('BEG getPositionOnImage');

    // clientX, clientY - screen coordinates in pixel of the client window, e.g. 2461
    let imageView = COL.model.getImageView();
    var imageViewScene = imageView.getImageViewScene();
    
    imageView.raycasterImageView.setFromCamera(imageView.mouse, imageView.camera);
    let intersects = imageView.raycasterImageView.intersectObjects(imageViewScene.children);
    
    if (intersects.length > 0 && intersects[0].uv) {
        // https://threejs.org/docs/#api/en/core/Raycaster.intersectObject
        // The intesectionPoint intersects[0] contains:
        // point - point of interection in world coordinates
        // uv - U,V coordinates at point of intersection in respect to the object
        //      e.g. if intersecting with circle object (laid on a surface (sprite)) on the left part of the circle, then x will be 0
        //           and if intersecting with circle object on the right part of the circle, then x will be 1
        //           this is unrelated to the position of the circle on the surface (sprite)
        var uv = intersects[0].uv;
        // Transform the uv based on the value of this texture's 
        // .offset, .repeat, .wrapS, .wrapT and .flipY properties.
        // The value of uv changes in-place.
        intersects[0].object.material.map.transformUv(uv);

        // console.log('intersects[0]', intersects[0]);
        // console.log('uv2', uv);
      
        let point2d = new THREE_Vector2();
        point2d.x = imageView.currentViewportNormalized.z * uv.x;
        point2d.y = imageView.currentViewportNormalized.w * uv.y;

        return point2d;
    }

    return null;
}
