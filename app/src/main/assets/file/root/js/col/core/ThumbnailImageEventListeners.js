/* eslint-disable max-len */
// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================
'use strict';
import { COL } from '../COL.js';
import { Model } from './Model.js';
import { Layer } from './Layer.js';
import { OverlayRect } from './OverlayRect.js';

export function onContextMenu_thumbnailImage( event ) {
    console.log('BEG onContextMenu_thumbnailImage');
    // prevent the default contextmenu, e.g. in chrome on long-touch, on image thumbnail 
    // that brings the options to preveiew the image, share the image via whatsapp, etc..
    event.preventDefault();
}

export async function onMouseDownOrTouchStart_thumbnailImage(event) {
    console.log('BEG onMouseDownOrTouchStart_thumbnailImage');

    let selectedLayer = COL.model.getSelectedLayer();
    if (!selectedLayer) {
        // Layer is not yet defined
        return;
    }

    // get elementId of event
    let elementId = event.target.id;

    let thumbnailImgEl = document.getElementById(elementId);

    if (COL.util.isTouchDevice()) {
        thumbnailImgEl.removeEventListener('touchstart', onMouseDownOrTouchStart_thumbnailImage, {
            capture: false,
            passive: false,
        });
        thumbnailImgEl.addEventListener('touchend', onMouseUpOrTouchEnd_thumbnailImage, {
            capture: false,
            passive: false,
        });
    }
    else{
        thumbnailImgEl.removeEventListener('mousedown', onMouseDownOrTouchStart_thumbnailImage, {
            capture: false,
            passive: false,
        });
        thumbnailImgEl.addEventListener('mouseup', onMouseUpOrTouchEnd_thumbnailImage, {
            capture: false,
            passive: false,
        });
    }

    let selectedOverlayRect = selectedLayer.getSelectedOverlayRect();
    let imageName=elementId;
    let retVal = selectedOverlayRect._imagesNames.getKeyValAndIndexByKey(imageName);
    selectedOverlayRect.setSelectedImage(retVal.index);

    // thumbnail image was clicked. Start the timer
    selectedOverlayRect.delayedMenuThumbnailImage(event);

    let overlayRectState = selectedOverlayRect.getState();
    console.log('overlayRectState1', selectedOverlayRect.getState());

    switch(overlayRectState) {
        case OverlayRect.STATE.NONE: 
            selectedOverlayRect.setState(OverlayRect.STATE.SELECT_IMAGE);
            break;

        case OverlayRect.STATE.SELECT_IMAGE:
        case OverlayRect.STATE.MOVE_OVERLAY_RECT: 
        case OverlayRect.STATE.MOVED_OVERLAY_RECT: 
        case OverlayRect.STATE.ADD_PHOTO: 
            break;

        case OverlayRect.STATE.CONTEXT_MENU:
            if (selectedOverlayRect.isMenuVisible) {
                selectedOverlayRect.clearMenuThumbnailImage();
            }
            selectedOverlayRect.setState(OverlayRect.STATE.NONE);
            break;
            
        default:
            let msgStr = 'OverlayRect state is not supported: ' + overlayRectState;
            throw new Error(msgStr);
    }
}

export async function onMouseUpOrTouchEnd_thumbnailImage(event) {
    console.log('BEG onMouseUpOrTouchEnd_thumbnailImage');

    let selectedLayer = COL.model.getSelectedLayer();
    if (!selectedLayer) {
        // Layer is not yet defined
        return;
    }

    let elementId = event.target.id;
    let thumbnailImgEl = document.getElementById(elementId);

    if (COL.util.isTouchDevice()) {
        // console.log('event.touches.length3', event.touches.length);

        if(COL.util.isObjectInvalid(event) || event.touches.length == 0) {
            // the event is invalid, i.e. this function was called without an event, e.g. when clicking on the menu of imageThumbnail,
            // to keep the correct state for addEventListener/removeEventListener, the function onMouseUpOrTouchEnd_thumbnailImage()
            // is called without an event.

            thumbnailImgEl.addEventListener('touchstart', onMouseDownOrTouchStart_thumbnailImage, {
                capture: false,
                passive: false,
            });
        
            thumbnailImgEl.removeEventListener('touchend', onMouseUpOrTouchEnd_thumbnailImage, {
                capture: false,
                passive: false,
            });
            handleMouseUp_orTouchEnd_thumbnailImage();
        }
        else{
            // there are more touch events.
            // For example, after removing one finger from 2-finger touch.
            // In such case keep responding to single-finger touchmove
        }
    }
    else{
        thumbnailImgEl.addEventListener('mousedown', onMouseDownOrTouchStart_thumbnailImage, {
            capture: false,
            passive: false,
        });
    
        thumbnailImgEl.removeEventListener('mouseup', onMouseUpOrTouchEnd_thumbnailImage, {
            capture: false,
            passive: false,
        });
        handleMouseUp_orTouchEnd_thumbnailImage();
    }
}


async function handleMouseUp_orTouchEnd_thumbnailImage() {
    console.log('BEG handleMouseUp_orTouchEnd_thumbnailImage');

    let selectedLayer = COL.model.getSelectedLayer();
    if (!selectedLayer) {
        // Layer is not yet defined
        return;
    }

    let selectedOverlayRect = selectedLayer.getSelectedOverlayRect();
    let overlayRectState = selectedOverlayRect.getState();
    console.log('overlayRectState2', selectedOverlayRect.getState());

    // clear the timeout for the context-menu
    // (mouseup cancels the delayed timer, to prevent the menu from being displayed if mousedown was not pressed long enough)
    console.log('selectedOverlayRect.timeoutID1', selectedOverlayRect.timeoutID);
    window.clearTimeout(selectedOverlayRect.timeoutID);
    if(overlayRectState !== OverlayRect.STATE.CONTEXT_MENU) {
        if(selectedOverlayRect.isMenuVisible) {
            // for each of the options in the context-menu, we make sure to close the context-menu
            selectedOverlayRect.clearMenuThumbnailImage();
        }
    }

    switch(overlayRectState) {
        case OverlayRect.STATE.NONE: 
            break;

        case OverlayRect.STATE.SELECT_IMAGE:
            // show the selected image
            let  selectedImageFilename = selectedOverlayRect.getSelectedImageFilename();
            let thumbnailImgEl = document.getElementById(selectedImageFilename);
            await COL.manageGUI.setPane(thumbnailImgEl);
            selectedOverlayRect.setState(OverlayRect.STATE.NONE);
            break;

        case OverlayRect.STATE.MOVE_OVERLAY_RECT: 
        case OverlayRect.STATE.MOVED_OVERLAY_RECT: 
        case OverlayRect.STATE.ADD_PHOTO: 
        case OverlayRect.STATE.CONTEXT_MENU:
            break;
            
        default:
            let msgStr = 'OverlayRect state is not supported: ' + overlayRectState;
            throw new Error(msgStr);
    }

    console.log('overlayRectState3', selectedOverlayRect.getState());

}
