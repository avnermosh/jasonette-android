/* eslint-disable max-len */
// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';

import { COL } from  '../COL.js';
import { Model } from './Model.js';
import { Layer } from './Layer.js';
import { ImageInfo } from './ImageInfo.js';
import { ImageView } from './ImageView.js';
import { v4 as uuidv4 } from "../../static/uuid/9.0.0/dist/esm-browser/index.js"

class Annotation {

    constructor() {
        console.log('BEG Annotation::constructor. Annotation as an object instance is not implemented yet (only static access is implemented');

        // example for an instance member
        this.foo1;
    }

    static GetState(annotationObject){
        // console.log('BEG Annotation::GetState');

        let annotationState = annotationObject.get("annotationState")
        // console.log('annotationState1', Annotation.GetStateAsStr(annotationState));

        return annotationState;
    }

    static GetStateAsStr(state) {
        switch (state) {
            case Annotation.STATE.NONE:
                return 'Annotation.STATE.NONE';
            case Annotation.STATE.DELETE_ANNOTATION:
                return 'Annotation.STATE.DELETE_ANNOTATION';
            case Annotation.STATE.MOVE_ANNOTATION:
                return 'Annotation.STATE.MOVE_ANNOTATION';
            case Annotation.STATE.MOVED_ANNOTATION:
                return 'Annotation.STATE.MOVED_ANNOTATION';
            case Annotation.STATE.CONTEXT_MENU: 
                return 'Annotation.STATE.CONTEXT_MENU';
            default:
                throw new Error('Invalid orbitControls state: ' + state);
        }
    }

    static SetAnnotationObjectsState(otherState){
        // loop over the annotation objects.
        let annotationObjects = COL.model.fabricCanvas.getObjects();
        annotationObjects.forEach(async annotationObject=>{
            if (COL.util.isObjectValid(annotationObject.annotationState)) {
                // checking if the annotationObject.annotationState is valid because e.g. the background image does not have an annotationState, 
                // (only Rect annotation has annotationstate)
                //
                // Set features that are not stored in the .json file (e.g. lockMovementX)
                // based on the state (e.g. disable editing if the annotation state is Annotation.STATE.NONE)
                // Annotation.SetAnnotationEditing(annotationObject, annotationObject.annotationState);
                Annotation.SetState(annotationObject, otherState);
            }
        });
    
        let fabricjsActiveObject = COL.model.fabricCanvas.getActiveObject();
        if (COL.util.isObjectValid(fabricjsActiveObject)) {
            // console.log('fabricjsActiveObject', fabricjsActiveObject);
            Annotation.SetState(fabricjsActiveObject, otherState);
        }
    }

    static SetState(annotationObject, otherState){
        // console.log('BEG Annotation::SetState');

        // console.log('otherState', otherState);
        annotationObject.set("annotationState", otherState );
        Annotation.SetAnnotationEditing(annotationObject, otherState);

        // Render the canvas to reflect changes in the annotation state (e.g. strokeDashArray boundry for moving annotation)
        COL.model.fabricCanvas.renderAll();
        ImageView.Render2();
    }

    static SetAnnotationEditing(annotationObject, otherState){
        // console.log('BEG Annotation::SetAnnotationEditing');

        switch(otherState) {
            case Annotation.STATE.NONE: 
            {
                Annotation.DisableAnnotationObjectEditing(annotationObject, true);
                break;
            }

            case Annotation.STATE.DELETE_ANNOTATION:
            {
                // set "true" to disable editing of the object (i.e. can not be moved, rotated, scaled) 
                // but can still be deleted
                Annotation.DisableAnnotationObjectEditing(annotationObject, true);
                break;
            }

            case Annotation.STATE.MOVE_ANNOTATION:
            {
                Annotation.DisableAnnotationObjectEditing(annotationObject, false);
                break;
            }

            case Annotation.STATE.CONTEXT_MENU:
            {
                Annotation.DisableAnnotationObjectEditing(annotationObject, true);
                break;
            }

            default:
            {
                let msgStr = 'Edit mode is not supported: ' + this.state;
                throw new Error(msgStr);
            }
        }
    }

    static GetShape() {
        return Annotation.Shape;
    }

    static SetShape(shape) {
        Annotation.Shape = shape;
    }

    static GetBrushColor() {
        return Annotation.BrushColor;
    }

    static setAnnotationBrushColor(color) {
        Annotation.BrushColor = color;
    }

    static DisableAnnotationObjectEditing = function(annotationObject, doDisable) {
        // console.log('BEG Annotation::DisableAnnotationObjectEditing');
        
        annotationObject.set({
            lockMovementX: doDisable,
            lockMovementY: doDisable,
            lockScalingX: doDisable,
            lockScalingY: doDisable,
            lockRotation: doDisable,
            // set the dash style ([] means solid line)
            // strokeDashArray: doDisable ? [] : [5, 5],
            // strokeWidth: doDisable ? 8 : 22,
            strokeWidth: 8,
            // opacity: 0.3,
            // opacity: doDisable ? 1 : 0.3,
            // opacity: 1,
        });

        if(doDisable)
        {
            // Remove the background fill.
            annotationObject.set('fill', '');
        }
        else
        {
            // Set background fill with smi-transparent diagonal stripes.
            let colorStops = [];
            let numStripes = 20;
            for (let i = 0; i <= numStripes; i++) {
              let colorStop = {offset: i / numStripes,
                               color: (i%2 === 0) ? "black" : "white"};

              colorStops[i*2] = colorStop;
              colorStops[(i*2)+1] = colorStop;
            }

            // https://stackoverflow.com/questions/68417719/rect-setgradient-is-not-a-function-in-fabricjs
            annotationObject.set('fill', new fabric.Gradient({
                type: 'linear',
                gradientUnits: 'pixels', // or 'percentage'
                coords: { x1: 0, y1: 0, x2: annotationObject.width, y2: annotationObject.height },
                colorStops: colorStops
              }));                  
        }

        // let lockScalingX_val = annotationObject.get('lockScalingX')
        // console.log('lockScalingX_val1', lockScalingX_val);
    };

    
    static AddAnnotationShape4 = function(shape) {
        // console.log('BEG AddAnnotationShape4');
        
        let annotationShape;
        switch (shape) {
            case Annotation.SHAPE.RECT:
                let width = 200;
                let height = 200;
                let top = COL.model.fabricCanvas.height /2 ;
                let left = COL.model.fabricCanvas.width / 2;

                annotationShape = new fabric.Rect({
                    top: top,
                    left: left,
                    fill: '', 
                    stroke: Annotation.BrushColor,
                    hasBorders:true,
                    strokeWidth: 100,
                    opacity: 1,
                    borderColor: Annotation.BrushColor,
                    width: width,
                    height: height,
                    transparentCorners: false,
                    centeredScaling: true,
                    // selectable: false,
                    name: 'annotationRect'
                });
                break;
                
            case Annotation.SHAPE.CIRCLE: 
                let radius = 200;
                
                annotationShape = new fabric.Circle({
                    // top: top,
                    // left: left,
                    fill: '', 
                    stroke: Annotation.BrushColor,
                    hasBorders:true,
                    strokeWidth: 100,
                    opacity: 1,
                    borderColor: Annotation.BrushColor,
                    radius: radius,
                    centeredScaling: true,
                    name: 'annotationCircle'
                });
                break;

            case Annotation.SHAPE.ELLIPSE: 
                let rx = 200;
                let ry = 200;
                annotationShape = new fabric.Ellipse({
                    fill: '', 
                    stroke: Annotation.BrushColor,
                    hasBorders:true,
                    strokeWidth: 100,
                    opacity: 1,
                    borderColor: Annotation.BrushColor,
                    rx: rx,
                    ry: ry,
                    centeredScaling: true,
                    name: 'annotationEllipse'
                });
                break;
                                
            default:
                throw new Error('Invalid shape: ' + shape);
        }

        annotationShape.set("uuid", uuidv4() );
        Annotation.SetState(annotationShape, Annotation.STATE.NONE);
        COL.model.fabricCanvas.add(annotationShape);
    };

}

Annotation.SHAPE = { 
    NONE: -1,
    RECT: 0,
    CIRCLE: 1,
    ELLIPSE: 2,
};

Annotation.BrushColor = 'blue';
Annotation.Shape = Annotation.SHAPE.RECT;

Annotation.STATE = { 
    NONE: -1,
    DELETE_ANNOTATION: 0,
    MOVE_ANNOTATION: 1,
    MOVED_ANNOTATION: 2,
    // The user selected the context-menu (but has not selected an option yet)
    CONTEXT_MENU: 3,
};

export { Annotation };
