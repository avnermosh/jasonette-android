import {Object3D as THREE_Object3D,
        MeshBasicMaterial as THREE_MeshBasicMaterial,
        CircleGeometry as THREE_CircleGeometry,
        Mesh as THREE_Mesh,
        Vector3 as THREE_Vector3,
        MeshPhongMaterial as THREE_MeshPhongMaterial, 
        DoubleSide as THREE_DoubleSide,
        FrontSide as THREE_FrontSide,
        Geometry as THREE_Geometry,
        Face3 as THREE_Face3, 
        Box3 as THREE_Box3,
        Vector2 as THREE_Vector2,
        Vector4 as THREE_Vector4,
        TextureLoader as THREE_TextureLoader,
        RGBFormat as THREE_RGBFormat,
        ClampToEdgeWrapping as THREE_ClampToEdgeWrapping,
        LinearFilter as THREE_LinearFilter,
        SpriteMaterial as THREE_SpriteMaterial,
        CanvasTexture as THREE_CanvasTexture,
        Sprite as THREE_Sprite        
       } from '../../static/three.js/three.js-r120/build/three.module.js';

import {CSS2DObject, CSS2DRenderer} from "../../static/CSS2DRenderer.js";

import { COL } from  "../COL.js";
import { Model } from "./Model.js";
import { OverlayRect } from "./OverlayRect.js";
import { ApiService } from  "./ApiService.js";
import { BlobInfo } from "./BlobInfo.js";
import { Scene3DtopDown } from "./Scene3DtopDown.js";
import { TexturePanelPlugin } from "./TexturePanelPlugin.js";
import { Note } from "./Note.js";
import { ImageInfo } from "./ImageInfo.js";
import "./Core.js";
import "./FileNotes.js";
import "../util/Util.js";
import "../util/ThreejsUtil.js";

// whiteboard a.k.a. plan a.k.a. floor
class Whiteboard {
    constructor(){
        console.log('foo1');

        this.initializeWhiteboard();
    };

    // https://jsfiddle.net/u0vjL4d4/
    initializeWhiteboard = function ()
    {
        console.log('BEG initializeWhiteboard222222222222222'); 

        // var width = window.innerWidth;
        // var height = window.innerHeight - 45;

	// let floorPlanWhiteboard = document.getElementById('floorPlanWhiteboardId');
        let floorPlanWhiteboard = $('#floorPlanWhiteboardId');
        var width = floorPlanWhiteboard.innerWidth();
        var height = floorPlanWhiteboard.innerHeight();

        console.log('width', width);
        
        // <div id="container"></div>
        // <div id="menuWrapper">
        //   <input type='file' id="fileUpload" />
        //   Tool:
        //   <select id="tool">
        //     <option value="brush">Brush</option>
        //     <option value="eraser">Eraser</option>
        //   </select>
        // </div>
        //
        // ->
        //
        // <div id="floorPlanWhiteboardId"></div>
        // <div id="floorPlanWhiteboardMenuWrapperId">
        //   WhiteboardTool
        //   <select id="whiteboardToolId">
        //     <option value="brush">Brush</option>
        //     <option value="eraser">Eraser</option>
        //   </select>
        // </div>
        

        // --------------------------------------------------------------

        
        // CREATE KONVE STAGE AND LAYER
        var stage = new Konva.Stage({
            container: 'floorPlanWhiteboardId',
            width: width,
            height: height
        });

        var layer = new Konva.Layer();
        stage.add(layer);
        
        ////UPLOAD FILE AND RENDER IMAGE IN CANVAS
	function el(id) {
	    return document.getElementById(id);
	}// Get elem by ID

	var container = el("floorPlanWhiteboardId");

	// function readImage() {
	//     if (this.files && this.files[0]) {
	// 	var FR = new FileReader();
	// 	FR.onload = function(e) {
	// 	    var img = new Image();
	// 	    img.onload = function() {
        //                 // context.drawImage(img, 0,0, width/2, height / 2)
        //                 context.drawImage(img, 0,0, width, height)
	// 		layer.draw();
	// 	    };
	// 	    img.src = e.target.result;
	// 	};
	// 	FR.readAsDataURL(this.files[0]);
	//     }
	// }

	// el("fileUpload").addEventListener("change", readImage, false);
	

        // draw into dynacmic canvas element
        var canvas2 = document.createElement('canvas');
        // canvas2.width = stage.width() / 2;
        // canvas2.height = stage.height() / 2;
        canvas2.width = stage.width();
        canvas2.height = stage.height();

        console.log('stage.width()1111111111111111111111111111111', stage.width());
        
        // created canvas is added to layer as a "Konva.Image" element
        var image2 = new Konva.Image({
            image: canvas2,
            // x : stage.width() / 4,
            // y : stage.height() / 4,
            x : 0,
            y : 0,
            stroke: 'green'
        });
        layer.add(image2);
        stage.draw();

        //Now we need to get access to context element
        var context = canvas2.getContext('2d');
        context.strokeStyle = "#0099ee";
        context.lineJoin = "round";
        context.lineWidth = 20;

        var isPaint = false;
        var lastPointerPosition;
        var mode = 'brush';

        // now we need to bind some events
        // we need to start drawing on mousedown
        // and stop drawing on mouseup
        stage.on('touchstart mousedown', function() {
            isPaint = true;
            lastPointerPosition = stage.getPointerPosition();
        });

        stage.on('touchend mouseup', function() {
            isPaint = false;
        });

        // and core function - drawing
        stage.on('touchmove mousemove', function() {

            if (!isPaint) {
                return;
            }

            if (mode === 'brush') {
                context.globalCompositeOperation = 'source-over';
            }
            if (mode === 'eraser') {
                context.globalCompositeOperation = 'destination-out';
            }
	    context.shadowBlur = 15;
	    context.shadowColor = '#000000'; // inset border color
	    context.shadowOffsetX = -1;
	    context.shadowOffsetY = -1;
            context.beginPath();

            var localPos = {
                x: lastPointerPosition.x - image2.x(),
                y: lastPointerPosition.y - image2.y()
            };
            context.moveTo(localPos.x, localPos.y);
            var pos = stage.getPointerPosition();
            localPos = {
                x: pos.x - image2.x(),
                y: pos.y - image2.y()
            };
            context.lineTo(localPos.x, localPos.y);
            context.closePath();
            context.stroke();

            lastPointerPosition = pos;
            layer.draw();
        });

        // tool -> whiteboardToolId
        var select = document.getElementById('whiteboardToolId');
        select.addEventListener('change', function() {
            mode = select.value;
        });
        
        console.log('END initializeWhiteboard'); 
    }
};

export { Whiteboard };
