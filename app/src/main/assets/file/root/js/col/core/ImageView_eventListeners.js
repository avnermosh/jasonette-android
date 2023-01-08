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

async function onMouseDownOrTouchStart_imageView(event) {
    console.log('BEG onMouseDownOrTouchStart_imageView');

    let selectedLayer = COL.model.getSelectedLayer();
    let imageView = selectedLayer.getImageView();
    let orbitControls = imageView.getControls();
    console.log('orbitControlsState1', orbitControls.getState());

    let imageViewPaneEl = document.getElementById('imageViewPaneId');

    if (COL.util.isTouchDevice()) {
        imageViewPaneEl.removeEventListener('touchstart', onMouseDownOrTouchStart_imageView, {
            capture: false,
            passive: false,
        });
        imageViewPaneEl.addEventListener('touchend', onMouseUpOrTouchEnd_imageView, {
            capture: false,
            passive: false,
        });
        imageViewPaneEl.addEventListener('touchmove', onMouseMoveOrTouchMove_imageView, {
            capture: false,
            passive: false,
        });
    }
    else{
        imageViewPaneEl.removeEventListener('mousedown', onMouseDownOrTouchStart_imageView, {
            capture: false,
            passive: false,
        });
        imageViewPaneEl.addEventListener('mouseup', onMouseUpOrTouchEnd_imageView, {
            capture: false,
            passive: false,
        });
        imageViewPaneEl.addEventListener('mousemove', onMouseMoveOrTouchMove_imageView, {
            capture: false,
            passive: false,
        });
    }

    event.preventDefault();
    if (((event instanceof MouseEvent) && (event.button == OrbitControlsImageView.mouseButtons.LEFT)) || 
        event instanceof TouchEvent)  {
        orbitControls.handleMouseDown_orTouchStart_imageView(event);
    }
}
  
async function onMouseUpOrTouchEnd_imageView(event) {
    // console.log('BEG onMouseUpOrTouchEnd_imageView');
  
    let selectedLayer = COL.model.getSelectedLayer();
    let imageView = selectedLayer.getImageView();
  
    let imageViewPaneEl = document.getElementById('imageViewPaneId');
    if (COL.util.isTouchDevice()) {
        imageViewPaneEl.addEventListener('touchstart', onMouseDownOrTouchStart_imageView, {
            capture: false,
            passive: false,
        });
        imageViewPaneEl.removeEventListener('touchmove', onMouseMoveOrTouchMove_imageView, {
            capture: false,
            passive: false,
        });
        imageViewPaneEl.removeEventListener('touchend', onMouseUpOrTouchEnd_imageView, {
            capture: false,
            passive: false,
        });
    }
    else{
        imageViewPaneEl.addEventListener('mousedown', onMouseDownOrTouchStart_imageView, {
            capture: false,
            passive: false,
        });
        imageViewPaneEl.removeEventListener('mousemove', onMouseMoveOrTouchMove_imageView, {
            capture: false,
            passive: false,
        });
        imageViewPaneEl.removeEventListener('mouseup', onMouseUpOrTouchEnd_imageView, {
            capture: false,
            passive: false,
        });
    }

    let orbitControls = imageView.getControls();
    switch (orbitControls.getState()) {
        case OrbitControlsImageView.STATE.NONE:
        {
            selectedLayer.toggleImageDisplay();
            break;
        }
        case OrbitControlsImageView.STATE.DOLLY:
        case OrbitControlsImageView.STATE.PAN:
        {
            break;
        }
        default:
        {
            throw new Error('Invalid orbitControls state: ' + orbitControls.getState());
        }
    }
    orbitControls.setState(OrbitControlsImageView.STATE.NONE);

    // // =-----
    // // tbd - from endTouchProcessing - remove ??
    // // is deltaPoint2d_inScreenCoord_start, centerPoint2d_inNDC_start being used ???

    // // reset the point anchors for zooming via two-finger touch
    // this.deltaPoint2d_inScreenCoord_start = new THREE_Vector2();
    // this.deltaPoint2d_inScreenCoord_end = new THREE_Vector2();

    // this.centerPoint2d_inNDC_start = new THREE_Vector2();
    // this.centerPoint2d_inNDC_end = new THREE_Vector2();

}

function onMouseMoveOrTouchMove_imageView(event) {
    // console.log('BEG onMouseMoveOrTouchMove_imageView');
  
    let selectedLayer = COL.model.getSelectedLayer();
    let imageView = selectedLayer.getImageView();
    let orbitControls = imageView.getControls();

    if (COL.util.isTouchDevice()) {
        // Prevent from applying the _default_, _generic_ browser scroll to the planViewPane
        // (in such case, refresh symbol icon appears at the center-top of the page)
        // Instead, the planViewPane is _panned_ with custom logic
        event.preventDefault();

        switch (event.touches.length) {
            case 1:
                // single-finger touch
                orbitControls.handleMouseMove_orOneFingerTouchMove_imageView(event);
                break;
        
            case 2:
                // two-finger touch
                if (event.targetTouches.length == 2) {
                    orbitControls.handleTwoFingerTouchMove_imageView(event);
                }
                break;
            default:
            {
                throw new Error('The value of event.targetTouches.length is invalid: ' + event.targetTouches.length);
            }
        }
    }
    else{
        orbitControls.handleMouseMove_orOneFingerTouchMove_imageView(event);
    }
}
  
function onMouseWheel_imageView(event) {
    // console.log('BEG onMouseWheel_imageView');
  
    let selectedLayer = COL.model.getSelectedLayer();
    let imageView = selectedLayer.getImageView();
    let orbitControls = imageView.getControls();
    orbitControls.handleMouseWheel_imageView(event);
}
  
function onKeyDown_imageView(event) {
    let selectedLayer = COL.model.getSelectedLayer();
    let imageView = selectedLayer.getImageView();
    let orbitControls = imageView.getControls();
    orbitControls.handleKey_imageView(event);
}
 
  
export { onMouseDownOrTouchStart_imageView, onMouseMoveOrTouchMove_imageView, 
    onMouseWheel_imageView, onKeyDown_imageView };
    