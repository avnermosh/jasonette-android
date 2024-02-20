// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';

import { COL } from '../COL.js';
import { Model } from './Model.js';
import { BlobInfo } from './BlobInfo.js';
import { FileZip_withJson } from '../loaders/FileZip_withJson.js';

COL.core.FileNotes = {
};

(function () {

    var _this = this;

    this.loadNotesFromJsonFile = async function (layer, notesFilename) {
        
        let selectedLayer = COL.model.getSelectedLayer();
        let metaDataBlobsInfo = selectedLayer.getMetaDataBlobsInfo();
        let metaDataBlobInfo = metaDataBlobsInfo.getByKey(notesFilename);
        
        let notesArray1 = await FileZip_withJson.loadFile_viaFetch(metaDataBlobInfo, 'json');

        let stickyNoteGroup = layer.getStickyNoteGroup();
        let imageView = layer.getImageView();
        var imageViewScene = imageView.getImageViewScene();
        var camera = imageView.getCamera();
        var labelRenderer = imageView.getlabelRenderer();

        var noteArray = layer.getNoteArray();
        
        for (var index = 0; index < notesArray1.length; index++) {

            let note = notesArray1[index];
            let noteData = notesArray1[index].data;
            let noteStyle = notesArray1[index].style;
            let imageFilename = notesArray1[index].imageFilename;
            
            let noteId = 'note' + Number(index);

            let newNote = new Note(noteId,
                noteData,
                noteStyle,
                imageFilename,
                index,
                layer,
                labelRenderer,
                imageViewScene,
                camera);

            noteArray.set(noteId, newNote);
        }

        imageViewScene.add( stickyNoteGroup );
        
        layer.setNoteArray(noteArray);
        
    };

    this.exportNotesToBlob = function(layer, metaDataBlobsInfo, notesFilename) {

        var noteArray = layer.getNoteArray();

        let notesExported = [];

        let iter = noteArray.iterator();
        while (iter.hasNext()) {
            let note = iter.next();
            
            let myDelta = note.getQuill().getContents();
            let notesDataExported = JSON.stringify(myDelta);
            
            let notes_style = {top: note.getStyle().top,
                left: note.getStyle().left};

            let noteExported = {data: notesDataExported,
                style: notes_style,
                imageFilename: note.getImageFilename()};

            notesExported.push(noteExported);
        }
        
        let notesExported2 = JSON.stringify(notesExported);
        var notesExportedBlob = new Blob([notesExported2], {type: 'application/json'});

        let metaDataBlobInfo = metaDataBlobsInfo.getByKey(notesFilename);
        if(COL.util.isObjectInvalid(metaDataBlobInfo)) {
            metaDataBlobInfo = new BlobInfo({filenameFullPath: notesFilename, 
                blobUrl: URL.createObjectURL(notesExportedBlob), 
                isDirty: true});
        }
        
        metaDataBlobsInfo.set(notesFilename, metaDataBlobInfo);
    };

    
}).call(COL.core.FileNotes);
