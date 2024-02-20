/* eslint-disable max-len */
// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================
'use strict';

import {
    Vector2 as THREE_Vector2,
} from '../../static/three.js/three.js-r135/build/three.module.js';

import { COL } from '../COL.js';
import { Model } from './Model.js';
import { OrbitControlsImageView } from '../orbitControl/OrbitControlsImageView.js';
import { ImageView } from './ImageView.js';
import { ImageInfo } from './ImageInfo.js';
import { ImageTags } from './ImageTags.js';
import { Annotation } from './Annotation.js';

function pushPointerDownEventToCache(ev) {
    // console.log('BEG pushPointerDownEventToCache');
    
    // Save this event in the target's cache
    ImageView.pointerEventCache.push(ev);

    if(ImageView.pointerEventCache.length == 2){
        // save the current state and change the state to OrbitControlsImageView.STATE.DOLLY.
        // this is done to manage a usecase where the user does some annotation editing and then
        // enters a multi-touch (e.g. 2-finger touch) mode
        // (in 2-finger touch the editing is disabled, but when the user turns to single-touch mode,
        // restore the previous mode, e.d. add/move/delete an annotation)
        let imageView = COL.model.getImageView();
        let orbitControls = imageView.getOrbitControls();
        let orbitControlsImageViewState = orbitControls.getState();
        ImageView.orbitControlsImageViewStateCache.push(orbitControlsImageViewState);
        orbitControls.setState(OrbitControlsImageView.STATE.DOLLY);
    }
}

function removePointerDownEventFromCache(ev) {
    // console.log('BEG removePointerDownEventFromCache');

    // Remove this event from the target's cache
    const index = ImageView.pointerEventCache.findIndex(
        (cachedEv) => cachedEv.pointerId === ev.pointerId,
    );
    ImageView.pointerEventCache.splice(index, 1);

    if(ImageView.pointerEventCache.length == 1){
        // restore the state before it was set to OrbitControlsImageView.STATE.DOLLY
        let orbitControlsImageViewState = ImageView.orbitControlsImageViewStateCache.pop();
        let imageView = COL.model.getImageView();
        let orbitControls = imageView.getOrbitControls();
        // COL.model.fabricCanvas.discardActiveObject();
        orbitControls.setState(orbitControlsImageViewState);
    }
}

function updatePointerEventInCache(ev) {
    // console.log('BEG updatePointerEventInCache');

    const index = ImageView.pointerEventCache.findIndex(
        (cachedEv) => cachedEv.pointerId === ev.pointerId,
    );
    ImageView.pointerEventCache[index] = ev;
}

async function onResize_imageView(event) {
    // console.log('BEG onResize_imageView');
    let selectedLayer = COL.model.getSelectedLayer();
    if (COL.util.isObjectValid(selectedLayer)) {
        let imageView = COL.model.getImageView();
        let imageInfo = ImageInfo.getSelectedImageInfo(selectedLayer);
        imageView.setTheSpriteSurface(imageInfo);
        let doRescale = false;
        doRescale = true;
        imageView.updateCameraAndCanvas( imageInfo, doRescale );
    }
}

async function onPointerDown_imageView(event) {
    // console.log('BEG onPointerDown_imageView');

    if (event.target.id !== 'selectedImage3dCanvasId' && event.target.id !== 'imageViewPaneId') {
        // Clicked on an element which is not the image itself, e.g. addShapeIconId
        // avoid any response here
        return;
    }

    pushPointerDownEventToCache(event);

    let imageView = COL.model.getImageView();
    let orbitControls = imageView.getOrbitControls();

    if(ImageView.pointerEventCache.length == 1) {
        // single-pointerEvent
        let imageViewPaneEl = document.getElementById('imageViewPaneId');
        imageViewPaneEl.addEventListener('pointermove', onPointerMove_imageView, {
            capture: false,
            passive: false,
        });
    }
    else if(ImageView.pointerEventCache.length > 1) {
        // multi-pointerEvent
        orbitControls.initDolly();
    }
    else{
        throw new Error('The value of ImageView.pointerEventCache.length is invalid: ' + ImageView.pointerEventCache.length);
    }

    // console.log('orbitControlsState1', orbitControls.getStateAsStr());

    let point2d = ImageView.GetPointFromPointerEvent();
    imageView.mouse = imageView.screenPointCoordToNormalizedCoord(point2d);

    event.preventDefault();
    await orbitControls.handlePointerDown_imageView(event);

}
  
async function onPointerUp_imageView(event) {
    // console.log('BEG onPointerUp_imageView');

    if (event.target.id !== 'selectedImage3dCanvasId' && event.target.id !== 'imageViewPaneId') {
        // Clicked on an element which is not the image itself, e.g. addShapeIconId
        // avoid any response here
        return;
    }

    removePointerDownEventFromCache(event);

    let imageView = COL.model.getImageView();
    let orbitControls = imageView.getOrbitControls();
    // console.log('orbitControls.getState()', orbitControls.getStateAsStr());

    if(ImageView.pointerEventCache.length == 0) {
        let imageViewPaneEl = document.getElementById('imageViewPaneId');
        imageViewPaneEl.removeEventListener('pointermove', onPointerMove_imageView, {
            capture: false,
            passive: false,
        });
    }
    else{
        if (ImageTags.Is360Image()) {
            orbitControls.initPan360(event);
        }
        else{
            // set the start to where the first pointer is (in case that the first pointer has changed)
            let point2d = ImageView.GetPointFromPointerEvent();
            orbitControls.initPanNon360(point2d);
        }
    }

    await orbitControls.handlePointerUp_imageView();
}

function onPointerMove_imageView(event) {
    // console.log('BEG onPointerMove_imageView');

    if (event.target.id !== 'selectedImage3dCanvasId' && event.target.id !== 'imageViewPaneId') {
        // Clicked on an element which is not the image itself, e.g. addShapeIconId
        // avoid any processing here
        return;
    }

    let imageView = COL.model.getImageView();
    let orbitControls = imageView.getOrbitControls();

    updatePointerEventInCache(event);
            
    let point2d = ImageView.GetPointFromPointerEvent();
    imageView.mouse = imageView.screenPointCoordToNormalizedCoord(point2d);

    if (COL.util.isTouchDevice()) {
        // // Prevent from applying the _default_, _generic_ browser scroll to the planViewPane
        // // (in such case, refresh symbol icon appears at the center-top of the page)
        // // Instead, the planViewPane is _panned_ with custom logic
        // event.preventDefault();
    
        // console.log('ImageView.pointerEventCache.length', ImageView.pointerEventCache.length);
        if(ImageView.pointerEventCache.length == 1) {
            // single-pointerEvent (e.g. one-finger touch)
            orbitControls.handleSinglePointerEventMove_imageView(event);
        }
        else if(ImageView.pointerEventCache.length > 1) {
            // multi-pointerEvent (e.g. two-finger touch)
            orbitControls.handleMultiPointerEventMove_imageView();
        }
        else {
            throw new Error('The value of ImageView.pointerEventCache.length is invalid: ' + ImageView.pointerEventCache.length);
        }
    }
    else{
        orbitControls.handleSinglePointerEventMove_imageView(event);
    }
}
  
function onWheel_imageView(event) {
    // console.log('BEG onWheel_imageView');
  
    let imageView = COL.model.getImageView();
    let orbitControls = imageView.getOrbitControls();
    orbitControls.handleWheel_imageView(event);
}
  
function onKeyDown_imageView(event) {
    let imageView = COL.model.getImageView();
    let orbitControls = imageView.getOrbitControls();
    orbitControls.handleKey_imageViewNon360(event);
}


export { onPointerDown_imageView, onPointerMove_imageView, onPointerUp_imageView,
    onWheel_imageView, onKeyDown_imageView, onResize_imageView };
    