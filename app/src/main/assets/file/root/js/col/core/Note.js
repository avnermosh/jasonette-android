/*
 * Running this will allow you to edit notes in the texture pane:
 * - translate note
 * - add new note
 * - delete existing note
 * - edit existing note
 */

import {MOUSE as THREE_MOUSE, Vector3 as THREE_Vector3
       } from '../../static/three.js/three.js-r120/build/three.module.js';

import {CSS2DObject, CSS2DRenderer} from "../../static/CSS2DRenderer.js";

import { COL } from  "../COL.js";
import { Model } from "./Model.js";

var Note = function (noteId,
                 noteData,
                 noteStyle,
                 imageFilename,
                 index,
                 layer,
                 texLabelRenderer,
                 texScene,
                 texCamera) {

    var _noteId = noteId;
    var _noteData = noteData;
    var _noteStyle = noteStyle;
    var _imageFilename = imageFilename;
    var _index = index;
    var _layer = layer;
    var _texLabelRenderer = texLabelRenderer;
    var _texScene = texScene;
    var _texCamera = texCamera;
    
    var _selectedNote = null;
    var _hovered = null;
    var scope = this;

    
    ////////////////////////////////////////////////
    // BEG add noteElement
    ////////////////////////////////////////////////

    let noteElementId = _noteId;
    let editorElementId = "editor" + index;
    let html = '<div id="' + editorElementId + '">';
    let noteClass = 'note';

    // // Get all elements with class "note"
    // let texCanvasWrapperDirectChildren4 = document.getElementById( 'texCanvasWrapperId' ).getElementsByClassName( 'note' );
    // console.log('texCanvasWrapperDirectChildren4', texCanvasWrapperDirectChildren4); 
    
    // https://www.abeautifulsite.net/adding-and-removing-elements-on-the-fly-using-javascript
    COL.util.addElement('texCanvasWrapperId', 'div', noteElementId, html, noteClass);

    let noteElement = document.getElementById(noteElementId);
    if(!noteElement)
    {
        console.error( 'noteElement is not defined for noteElementId:', noteElementId );
        return;
    }

    var _domElement = noteElement;

    ////////////////////////////////////////////////
    // BEG set Quill
    ////////////////////////////////////////////////

    let editorElement = document.getElementById(editorElementId);

    var _quill = new Quill(editorElement, {
        theme: 'snow'
    });

    let notes_dataAsJson = JSON.parse( _noteData );
    _quill.setContents(notes_dataAsJson);
    
    ////////////////////////////////////////////////
    // BEG set noteElementLabel
    ////////////////////////////////////////////////

    let noteElementLabel = new CSS2DObject( noteElement );
    noteElementLabel.position.set( _noteStyle.left, _noteStyle.top, 0 );
    noteElementLabel.scale.x = 1
    noteElementLabel.scale.y = 1;
    noteElementLabel.name = _noteId;
    
    _layer.addToStickyNoteGroup(noteElementLabel);
    
    
    function getNoteId() {
        return _noteId;
    };

    
    function getImageFilename() {
        return _imageFilename;
    };

    function getStyle() {
        return _noteStyle;
    };
    
    function getQuill() {
        return _quill;
    };
    
    function activate() {
        _domElement.addEventListener( 'mousemove', onDocumentMouseMove1, {capture: false, passive: false} );
        _domElement.addEventListener( 'mousedown', onDocumentMouseDown1, {capture: false, passive: false} );
        _domElement.addEventListener( 'mouseup', onDocumentMouseUp1, {capture: false, passive: false} );
        _domElement.addEventListener( 'mouseleave', onDocumentMouseCancel1, {capture: false, passive: false} );
    }

    function deactivate() {
        _domElement.removeEventListener( 'mousemove', onDocumentMouseMove1, {capture: false, passive: false} );
        _domElement.removeEventListener( 'mousedown', onDocumentMouseDown1, {capture: false, passive: false} );
        _domElement.removeEventListener( 'mouseup', onDocumentMouseUp1, {capture: false, passive: false} );
        _domElement.removeEventListener( 'mouseleave', onDocumentMouseCancel1, {capture: false, passive: false} );
    }

    function onDocumentMouseDown1( event ) {
        // console.log('BEG onDocumentMouseDown1');
        
        event.preventDefault();
        // // tbd - try to remove stopPropagation() - it is not recommended to use it..
        // event.stopPropagation();

        let selectedLayer = COL.model.getSelectedLayer();
        if( !selectedLayer.getEditOverlayRectFlag() )
        {
            // Make the note read only
            // Disable the editing area. Not in editing mode.

            _quill.disable();
            return;
        }

        console.log('event', event); 
        console.log('_domElement', _domElement);

        // Mouse buttons
        let mouseButtons = { LEFT: THREE_MOUSE.LEFT, MIDDLE: THREE_MOUSE.MIDDLE, RIGHT: THREE_MOUSE.RIGHT };

        console.log('event.button', event.button);
        switch ( event.button ) {
            case mouseButtons.LEFT:
                console.log('In mouseButtons.LEFT');

                // Set ability for user to edit
                _quill.enable();
                
                // focuses the editor and restores its last range.
                _quill.focus();
                
                break;
                
            case mouseButtons.RIGHT:
                dispose(_domElement);
                
                break;
        }

        _domElement.removeEventListener( 'mousedown', onDocumentMouseDown1, {capture: false, passive: false} );
        _domElement.addEventListener( 'mousedown', onDocumentMouseMove1, {capture: false, passive: false} );
        _domElement.addEventListener( 'mousedown', onDocumentMouseUp1, {capture: false, passive: false} );
        
    };

    function onDocumentMouseUp1( event ) {
        // console.log('BEG onDocumentMouseUp1'); 

        let layer = COL.model.getSelectedLayer();
        if( !layer.getEditOverlayRectFlag() )
        {
            // Do nothing. Not in editing mode.
            return;
        }
        
        event.preventDefault();

        let stickyNoteGroup = layer.getStickyNoteGroup();

        if(!_domElement)
        {
            console.error( '_domElement is not defined' );
            return;
        }
        
        // The noteCss2DObject position was updated, so the top, left offsets need to be reset
        _domElement.style.top = 0;
        _domElement.style.left = 0;
        _texLabelRenderer.render(_texScene, _texCamera);

        // _domElement.addEventListener( 'mousedown', onDocumentMouseDown1, {capture: false, passive: false} );
        _domElement.removeEventListener( 'mousedown', onDocumentMouseMove1, {capture: false, passive: false} );
        _domElement.removeEventListener( 'mousedown', onDocumentMouseUp1, {capture: false, passive: false} );
        
    };


    function calcPositionFromTranslateAttribute2( noteElement ) {

        let layer = COL.model.getSelectedLayer();

        let noteElementStyle = noteElement.style;
        let noteElementStyleTransform = noteElementStyle.transform;
        
        // https://stackoverflow.com/questions/11477415/why-does-javascripts-regex-exec-not-always-return-the-same-value
        // get attribute transform from style, e.g.
        // transform: translate(-50%, -50%) translate(727.167px, 347.307px) scale(1, 1)
        // ->
        // 727.167 347.307
        var re1 = /([-+]?[0-9]*\.?[0-9]*)px/g;
        var match1;
        var results = [];
        while (match1 = re1.exec(noteElementStyleTransform))
        {
            results.push(+match1[1]);    
        }

        let x1 = results[0];
        let y1 = results[1];

        // https://stackoverflow.com/questions/8690463/get-a-number-for-a-style-value-without-the-px-suffix
        // get attribute transform from style, e.g.
        // top: 1px; left: -11px; -> 1 -11
        let top = 0;
        if(noteElementStyle.top)
        {
            let noteElementStyleTop = noteElementStyle.top;
            // top = parseInt(noteElementStyleTop);
            top = parseFloat(noteElementStyleTop);
        }

        let left = 0;
        if(noteElementStyle.left)
        {
            let noteElementStyleLeft = noteElementStyle.left;
            // left = parseInt(noteElementStyleLeft);
            left = parseFloat(noteElementStyleLeft);
        }

        // <div id="note1" class="note active-note" style="position: absolute; transform: translate(-50%, -50%) translate(727.167px, 347.307px) scale(1, 1); z-index: 1; top: 1px; left: -11px;">
        // extract top, left
        // calc x2,y2 : offset x1, y1 by top, left
        let x2 = x1 + left;
        let y2 = y1 + top;
        
        let stickyNoteGroup = layer.getStickyNoteGroup();

        // // ChangeME. Use find to search for the noteCss2DObject that matches note.noteId
        // let noteCss2DObject = stickyNoteGroup.children[_index];
        let noteCss2DObject = stickyNoteGroup.getObjectByName( noteId, true );

        
        let positionVec = new THREE_Vector3();
        positionVec = _texLabelRenderer.calcPositionFromTranslateAttribute(noteCss2DObject, x2, y2);

        // update noteCss2DObject position (later, when the on mouse up and the top, left offsets are reset)
        noteCss2DObject.position.set(positionVec.x, positionVec.y, 0.0);
        
        _noteStyle.left = positionVec.x;
        _noteStyle.top = positionVec.y;
    };

    function onDocumentMouseMove1( event ) {
        // console.log('BEG onDocumentMouseMove1'); 

        let selectedLayer = COL.model.getSelectedLayer();
        if( !selectedLayer.getEditOverlayRectFlag() )
        {
            // Do nothing. Not in editing mode.
            return;
        }

        event.preventDefault();

        if(!_domElement)
        {
            console.error( '_domElement is not defined' );
            return;
        }
        calcPositionFromTranslateAttribute2( _domElement );
    }

    function dragElement(elmnt) {
        // console.log('BEG dragElement'); 

        var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        if (document.getElementById(elmnt.id + "header")) {
            /* if present, the header is where you move the DIV from:*/
            document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
        } else {
            /* otherwise, move the DIV from anywhere inside the DIV:*/
            elmnt.onmousedown = dragMouseDown;
            // console.log('elmnt', elmnt); 
        }

        function dragMouseDown(e) {
            // console.log('BEG dragMouseDown'); 

            let selectedLayer = COL.model.getSelectedLayer();
            if( !selectedLayer.getEditOverlayRectFlag() )
            {
                // Do nothing. Not in editing mode.
                return;
            }
            
            e = e || window.event;
            e.preventDefault();
            // get the mouse cursor position at startup:
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            // call a function whenever the cursor moves:
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {

            e = e || window.event;
            e.preventDefault();
            // calculate the new cursor position:
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            // set the element's new position:
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
            elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            /* stop moving when mouse button is released:*/
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    function onDocumentMouseCancel1( event ) {
        // console.log('BEG onDocumentMouseCancel1'); 

        let selectedLayer = COL.model.getSelectedLayer();
        if( !selectedLayer.getEditOverlayRectFlag() )
        {
            // Do nothing. Not in editing mode.
            return;
        }

        event.preventDefault();

        if ( _selectedNote ) {

            scope.dispatchEvent( { type: 'dragend', object: _selectedNote } );

            _selectedNote = null;

        }

        _domElement.style.cursor = _hovered ? 'pointer' : 'auto';

    }

    function dispose( noteElement ) {
        let layer = COL.model.getSelectedLayer();

        // remove the note from stickyNoteGroup (also removes the noteElement from the DOM)
        let stickyNoteGroup = layer.getStickyNoteGroup();
        stickyNoteGroup.remove(stickyNoteGroup.children[_index])

        // remove the note from noteArray
        let noteArray = layer.getNoteArray();
        noteArray.remove(_noteId);
    };

    dragElement(_domElement);
    // deactivate();
    
    // API

    this.activate = activate;
    this.deactivate = deactivate;
    this.dispose = dispose;
    this.getNoteId = getNoteId;
    this.getImageFilename = getImageFilename;
    this.getStyle = getStyle;
    this.getQuill = getQuill;
    
};

Note.prototype.constructor = Note;

export { Note };
