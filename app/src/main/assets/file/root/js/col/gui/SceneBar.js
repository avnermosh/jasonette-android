/* eslint-disable no-case-declarations */
/* eslint-disable new-cap */
/* eslint-disable max-len */
// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

'use strict';

import { COL } from  '../COL.js';
import './Component.js';
import '../core/Core.js';
import { FileZip_withJson } from '../loaders/FileZip_withJson.js';
import { Layer } from '../core/Layer.js';
import { Model } from '../core/Model.js';
import { PlanView } from '../core/PlanView.js';
import { OrbitControlsPlanView } from '../orbitControl/OrbitControlsPlanView.js';
import { ZipFileInfo } from '../core/ZipFileInfo.js';


class SceneBar {

    constructor(component){

        this._toolBar = new component.ToolBar();

        if(COL.isOldGUIEnabled) {
            let iconPath = '';
            let iconDir = 'V1/img/icons/IcoMoon-Free-master/PNG/48px';
            console.log('iconDir1', iconDir); 
    
            // --------------------------------------------------------------
    
            iconPath = iconDir + '/0278-play2.png';
            this.playImagesInAllOverlayRectsButton = new component.ToggleButton({
                id: 'playImagesInAllOverlayRectsButtonId',
                tooltip: 'Play images in all overlayRects',
                icon: iconPath,
                on: false
            });
            let jqueryObj = $(this.playImagesInAllOverlayRectsButton.$);
            jqueryObj.addClass('ui-button');
    
            // --------------------------------------------------------------
            
            iconPath = iconDir + '/0303-loop2.png';
            this._reloadPageButton = new component.Button({
                id: 'reloadPageButtonId',
                tooltip: 'Reload site',
                icon: iconPath,
                multiple: true
            });
            $(this._reloadPageButton.$).addClass('ui-button');
            
            if(COL.doWorkOnline) {
                this._editOverlayRectButton = undefined;
    
                // tbd - _editOverlayRect -> _editMode -> state
                
                if(COL.doEnableWhiteboard) {
                    iconPath = iconDir + '/0345-make-group.png';
                    this._editOverlayRect_editFloorPlanWhiteboard = new component.Button({
                        tooltip: 'Edit Whiteboard',
                        icon: iconPath
                    });
                    $(this._editOverlayRect_editFloorPlanWhiteboard.$).addClass('ui-button');
                }
    
                iconPath = iconDir + '/0272-cross.png';
                this._editOverlayRect_deleteButton = new component.Button({
                    tooltip: 'Delete image / overlayRect',
                    icon: iconPath
                });
                $(this._editOverlayRect_deleteButton.$).addClass('ui-button');
    
                iconPath = iconDir + '/0015-images.png';
                this.openImageFileButton = new component.FileButton({
                    tooltip: 'Open image file',
                    icon: iconPath,
                    multiple: true
                });
                $(this.openImageFileButton.$).addClass('ui-button');
    
                iconPath = iconDir + '/0102-undo.png';
                this._reconcileFrontEndButton = new component.Button({
                    tooltip: 'Reconcile front-end inconcitencies',
                    icon: iconPath,
                    multiple: true
                });
                $(this._reconcileFrontEndButton.$).addClass('ui-button');
    
                // --------------------------------------------------------------
                // BEG Set the PlanView Settings Modal
                // --------------------------------------------------------------
                
                // define the PlanView Settings Modal button
                this._planViewSettingModalBtnEl = '<a href="#" class="ui-button" data-bs-toggle="modal" data-bs-target="#basicModal" id="planview-settings-modal-btn"><img src="V1/img/icons/IcoMoon-Free-master/PNG/48px/0009-pen.png"/></a>';
    
                // --------------------------------------------------------------
                // END Set the PlanView Settings Modal
                // --------------------------------------------------------------
                
                
                this._addStickyNoteButton = undefined;
            }
            else {
                // work offline
            }
        }
        
        // skipping row 0 (the header row)
        this.milestoneDatesRowNum = 1;
    }

    createPlanViewSettingModal () {
        // --------------------------------------------------------------
        // http://jsfiddle.net/Transformer/5KK5W/
        // for date setting
        
        // https://mdbootstrap.com/docs/standard/forms/checkbox/
        // for checkbox setting in table cell

        // define the PlanView Settings Modal, which includes:
        // - slider for the radius of the overlayRect
        // - milestoneDates table
        // - tbd - option to see cross-hair between the 2 fingers

        let dataSliderInitialValue = 2;
        let rowNum = this.milestoneDatesRowNum;
        
        // value="Remove1" sets the label inside the button (as opposed to setting it besides the button if used after the element)
        let planViewSettingModalEl = `
<div class="modal fade" id="basicModal" tabindex="-1" role="dialog" aria-labelledby="basicModal" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-bs-dismiss="modal" aria-hidden="true">&times;</button>
        <h3 class="modal-title" id="myModalLabel">PlanView Settings Modal</h3>
      </div>
      <div id="modalBodyId" class="modal-body">
        <p>slider</p>
        <input id="overlayrect-size-slider-id" data-slider-id='overlayRectSizeDataSliderId' type="text" data-slider-ticks="[1, 2, 3]" data-slider-ticks-labels='["0.5", "1", "2"]' data-slider-ticks-positions="[0, 50, 100]" data-slider-value="${dataSliderInitialValue}"/>
      </div>
      <div id="datesId">
        <table id="date_table" class="table" data-bs-toggle="table" data-height="300" data-url="https://api.github.com/users/wenzhixin/repos?type=owner&sort=full_name&direction=asc&per_page=100&page=1" data-pagination="true" data-search="true" data-show-refresh="true" data-show-toggle="true" data-show-columns="true" data-toolbar="#toolbar">
          <thead>
            <tr>
              <th data-field="date">Date</th>
              <th data-field="date_name">Event Name</th>
              <th Enable data-field="state" data-checkbox="true">Active</th>
              <th data-field="button">Button</th>";
            </tr>
          </thead>
          <tbody id="date_table_body">    
            <tr id="rowNum${rowNum}" class="date_row_class">
                <td><input type="text" id="date_pickr_start_date" class="date_pickr" value=""/></td>
                <td><input type="text" id="date_name_${rowNum}" class="input date_name_class" value="Start Date"/></td>
                <td><input type="checkbox" id="checkbox_${rowNum}" class="checkbox-inline" value="" disabled></td>
                <td><input type="button" id="addRowBtnId" value="Add row"/></td>
            </tr>
          </tbody>    
        </table>
      </div>
      <div class="modal-footer">
        <input type="checkbox" id="enableMilestoneDatesId" class="checkbox-inline" value="" checked>Edit Dates</input>
        <button type="button" class="btn btn-default" data-bs-dismiss="modal">Cancel</button>
        <button type="button" id="planViewSettingSaveBtnId" class="btn btn-primary">Save changes</button>
      </div>
    </div>
  </div>
</div>
`;
        
        $('#main-container-id').append(planViewSettingModalEl);
    }
    
    initPlanViewSettingModal () {
        // console.log('BEG initPlanViewSettingModal');

        this.createPlanViewSettingModal();
        
        $('#toolbarGroupId').append(this._planViewSettingModalBtnEl);

        $('#planview-settings-modal-btn').click(function() {

            let planView = COL.getPlanView();
            let overlayRectScale = planView.getOverlayRectScale();
            let sliderVal = SceneBar.OverlayRectScale_to_sliderVal(overlayRectScale);

            let overlayrectSizeSlider = $('#overlayrect-size-slider-id').slider();
            overlayrectSizeSlider.slider('setValue', sliderVal, true, true);
            
            $('#overlayrect-size-slider-id').slider({
                formatter: function(value) {
                    return 'Current value: ' + value;
                },
                // change: function( event, ui ) {
                //     // ui.value is the slider value after the change.
                // }               
            });
        });

        this.initOverlayRectSlider();

        
        this.initMilstoneDateTable();

        // --------------------------------------------------------------

        $('#enableMilestoneDatesId').click( function() {
            // enable/disable date_table

            let selectedLayer = COL.model.getSelectedLayer();

            let isMilestoneDatesFilterEnabled = false;
            if(this.checked) {
                isMilestoneDatesFilterEnabled = true;
            }
            selectedLayer.setIsMilestoneDatesFilterEnabled(isMilestoneDatesFilterEnabled);
            
            // This will disable all the children of the div
            var nodes = document.getElementById('datesId').getElementsByTagName('*');
            for(var i = 0; i < nodes.length; i++){
                nodes[i].disabled = !isMilestoneDatesFilterEnabled;
            }

            let sceneBar = COL.model.getSceneBar();
            sceneBar.validateMilestoneDatesAndUpdateScene();
        });
        

        document.getElementById('planViewSettingSaveBtnId').onclick = function() {
            // console.log('BEG planViewSettingSaveBtnId'); 
            let sceneBar = COL.model.getSceneBar();
            sceneBar.validateMilestoneDatesAndUpdateScene();
        };            

    }
    
    initOverlayRectSlider () {

        // get the value of the slider after it stops moving
        $('#overlayrect-size-slider-id').slider().on('slideStop', function(ev){
            // Get the value of the slider
            //
            // // option1 - get the value via jquery
            // let sliderVal = $('#overlayrect-size-slider-id').val();
            //
            // // option2 - via slider api - call a method on the slider
            // let sliderVal = overlayrectSizeSlider.slider('getValue');
            //
            // // option3 - via jquery, via slider api 
            let sliderVal = $('#overlayrect-size-slider-id').data('slider').getValue();
            let overlayRectScale = SceneBar.SliderVal_to_overlayRectScale(sliderVal);

            // update the overlayRectScale value
            let selectedLayer = COL.model.getSelectedLayer();
            selectedLayer.updateOverlayRectScale(overlayRectScale);
        });
    }

    
    validateMilestoneDatesAndUpdateScene () {
        console.log('BEG validateMilestoneDatesAndUpdateScene');
        
        // validate cells and update milestoneDates
        if(!this.validateMilstoneDateTable()) {
            throw new Error('MilstoneDateTable is invalid');
        }
        this.filterOverlayRectsByMilestoneDates();
    }
    
    initMilstoneDateTable () {

        // // https://www.w3schools.com/jquery/event_on.asp
        // var checkedRows = [];

        // $('#date_table').on('check.bs.table', function (e, row) {
        //     console.log('BEG check.bs.table');
        
        //     checkedRows.push({id: row.id, name: row.name, forks: row.forks});
        //     console.log(checkedRows);
        // });        

        // //////////////////////////////////////////////////////////
        // interaction with any of the milestone rows
        // (with class .date_row_class)
        // //////////////////////////////////////////////////////////

        $('body').on('click', '.date_row_class', function () {
            // clicking anywhere in the row will trigger this function
            // console.log('BEG clicked on element with class date_row_class');
            let msg1 = `clicked on ${this.id}`;
            // console.log('msg1', msg1); 
        });


        // //////////////////////////////////////////////////////////
        // interaction with date_pickr_start_date
        // //////////////////////////////////////////////////////////

        var projectStartDate;

        // $("#date_pickr_start_date").datepicker('setDate', new Date(2020, 8, 1));
        // $("#date_pickr_start_date").datepicker('update');  //update the bootstrap datepicker
        
        // $("#date_pickr_start_date").datepicker({
        $('.date_pickr').datepicker({
            format: 'yyyy/mm/dd',
            // setDate: setDate1,
            todayBtn:  1,
            autoclose: true,
        }).on('click', function () {
            // console.log('BEG .date_pickr .click4444');
            let msg1 = `clicked on ${this.id}`;
            // console.log('msg1', msg1);
            
        }).on('changeDate', function (selected) {
            // clicked on the projectStartDate milestoneDate rubric
            // Set the start date.
            
            if(this.id === 'date_pickr_start_date') {
                // console.log('BEG date_pickr_start_date .changeDate');
                
                projectStartDate = new Date(selected.date.valueOf());
                // console.log('projectStartDate', projectStartDate);

                // loop over all the date rubrics and verify that the date is not earlier than projectStartDate
                let eventDates = $('.date_pickr');
                for (const eventDate of eventDates){
                    if(eventDate.id !== 'date_pickr_start_date') {
                        let eventDate2 = $(`#${eventDate.id}`).val();
                        let eventDate2_date = new Date (eventDate2);

                        // Adjust the start date of all date rubrics
                        $(`#${eventDate.id}`).datepicker('setStartDate', projectStartDate);
                        
                        // https://poopcode.com/compare-two-dates-in-javascript-using-moment/
                        let isEventDateBeforeStartDate = moment(eventDate2_date).isBefore(selected.date);
                        if(isEventDateBeforeStartDate) {
                            // The event date is earlier than projectStartDate.
                            // Adjust the event date - clamp it to be the projectStartDate
                            $(`#${eventDate.id}`).datepicker('setDate', projectStartDate);
                        }
                    }
                }            
            }
            
            // $('#enddate').datepicker('setStartDate', projectStartDate);
        });

        // //////////////////////////////////////////////////////////
        // interaction with any of the milestone date elements
        // (with class .date_pickr)
        // //////////////////////////////////////////////////////////
        
        // https://stackoverflow.com/questions/203198/event-binding-on-dynamically-created-elements
        // event delegation - need to bind the event to a parent which already exists
        //   Event handlers are bound only to the currently selected elements;
        //   they must exist on the page at the time your code makes the call to .on().        
        //
        // need to use existing element, e.g. "body" to bind the dynamically added 'checkbox' elements
        // (event delegation) so
        // - cannot use "$(".checkbox-inline").on('click'..."
        // - need to use e.g. "$("body").on("click"..."
        // otherwise, the input field stays empty (datepicker is not coming up... :))

        $('body').on('focus','.date_pickr',function() {
            let msg1 = `clicked on ${this.id}`;
            // console.log('msg333333333333333333333333', msg1);
            // console.log('.date_pickr11', $('.date_pickr'));

            if(COL.util.isObjectInvalid(projectStartDate)) {
                throw new Error('Invalid projectStartDate');
            }
            
            // console.log('projectStartDate', projectStartDate); 
            // $(`#${this.id}`).datepicker('setStartDate', projectStartDate1);
            $(`#${this.id}`).datepicker({
                format: 'yyyy/mm/dd',
                todayBtn:  1,
                autoclose: true,
                startDate: projectStartDate,
            });
        });



        // //////////////////////////////////////////////////////////
        // interaction with any of the chekboxes 
        // //////////////////////////////////////////////////////////

        // need to use existing element, e.g. "body" to bind the dynamically added 'checkbox' elements
        // (event delegation) so
        // - cannot use "$(".checkbox-inline").on('click'..."
        // - need to use e.g. "$("body").on("click"..."
        
        $('body').on('click', '.checkbox-inline', function () {
            // clicking anywhere in the row will trigger this function
            // console.log('BEG clicked on element with class checkbox-inline');
            let msg1 = `clicked on ${this.id}`;
            // console.log('msg1', msg1); 
        });

        $('#addRowBtnId').click(function() {
            // console.log('BEG addRowBtnId.click'); 

            let sceneBar = COL.model.getSceneBar();
            let retval = sceneBar.validateMilstoneDateTable();
            if(!retval) {
                console.error('table is invalid. Cannot add new row');
                return;
            }
            
            // add row with date_pickrs
            // rowNum++;
            sceneBar.milestoneDatesRowNum++;
            let rowNum = sceneBar.milestoneDatesRowNum;

            let nu_row = `
<tr id="rowNum${rowNum}" class="date_row_class">
  <td><input type="text" id="date_pickr_${rowNum}" class="date_pickr" value=""/></td>
  <td><input type="text" id="date_name_${rowNum}" class="input date_name_class" value="eventName_${rowNum}"/></td>
  <td><input type="checkbox" id="checkbox_${rowNum}" class="checkbox-inline" value="" checked></td>
  <td><input type="button" id="removeRowBtnId_${rowNum}" value="Remove "/></td>
</tr>
`;

            $('#date_table_body').append(nu_row);

            document.getElementById(`removeRowBtnId_${rowNum}`).onclick = function() {
                let msg1 = `clicked on ${this.id}`;
                // console.log('msg1', msg1); 
                let selector = document.getElementById(this.id);

                // https://stackoverflow.com/questions/2727717/how-to-remove-the-parent-element-using-plain-javascript
                // delete the row
                selector.parentNode.parentNode.parentNode.removeChild(selector.parentNode.parentNode);
            };            
        });
    }
    
    validateMilstoneDateTable () {
        // console.log('BEG validateMilstoneDateTable');

        let retval = true;
        let eventDates = $('.date_pickr');

        for (const eventDate of eventDates){
            let eventDate2 = $(`#${eventDate.id}`).val();
            // console.log('eventDate2', eventDate2);
            let eventDate2_date = new Date(eventDate2);
            // console.log('eventDate2_date', eventDate2_date);

            if(COL.util.isDateInvalid(eventDate2_date)) {
                retval = false;
                break;
            }
        }
        return retval;
    }
    
    filterOverlayRectsByMilestoneDates () {
        // console.log('BEG filterOverlayRectsByMilestoneDates');
        
        // https://stackoverflow.com/questions/3072233/getting-value-from-table-cell-in-javascript-not-jquery
        var table = document.getElementById('date_table');

        let selectedLayer = COL.model.getSelectedLayer();
        selectedLayer.milestoneDatesInfo.clear();

        // start at row 1 to skip row0 (the header row)
        for (let rowIndex = 1, numRows = table.rows.length; rowIndex < numRows; rowIndex++) {

            let cellIndex = 0;
            let milstoneDate = table.rows[rowIndex].cells[cellIndex].firstChild.value;

            cellIndex = 1;
            let eventName = table.rows[rowIndex].cells[cellIndex].firstChild.value;
            let checkboxId = `#checkbox_${rowIndex}`;
            let isEnabled = $(`#checkbox_${rowIndex}`).is(':checked');
            
            let milestoneDateInfo = {
                eventName: eventName,
                date: milstoneDate,
                isEnabled: isEnabled,
            };
            
            selectedLayer.milestoneDatesInfo.set(eventName, milestoneDateInfo);
        }

        // sort dates by date (enabled, and disabled)
        let milestoneDatesInfo_sortedByDate = selectedLayer.milestoneDatesInfo.sortByVal('date');

        // //////////////////////////////////////////////////////////////////
        // create the filter conditions
        // //////////////////////////////////////////////////////////////////

        // create the filter conditions, e.g.
        //   ((milstoneDate >= startDate0) && (milstoneDate < endDate0)) ||
        //   ((milstoneDate >= startDate1) && (milstoneDate < endDate1)) || ...
        //
        // create initial condition
        // let condition = "";
        // loop over milestoneDatesInfo_sortedByDate
        // if the nextRow is enabled mark
        // - currentRow as startDate0
        // - nextRow as endDate0
        // - create (milstoneDate >= startDate0) && (milstoneDate < endDate0)
        // - append to previous condition, e.g.

        let conditionStr = '';
        let milestoneDateInfoNext;
        let iter = milestoneDatesInfo_sortedByDate.iterator();
        if (iter.hasNext()) {
            milestoneDateInfoNext = iter.next();
        }
        let isFirstTime = true;
        while (iter.hasNext()) {
            let milestoneDateInfoCurr = milestoneDateInfoNext;
            milestoneDateInfoNext = iter.next();

            if (milestoneDateInfoNext.isEnabled) {
                let startDate0 = new Date (milestoneDateInfoCurr.date);
                let endDate0 = new Date (milestoneDateInfoNext.date);

                console.log('startDate0', startDate0);
                console.log('endDate0', endDate0);
                
                // console.log('milestoneDateInfoNext.date', milestoneDateInfoNext.date);
                // console.log('endDate0', endDate0); 
                // var date_received = $("#id_date_received").datepicker('getDate');
                let type_milestoneDateInfoNext_date = typeof milestoneDateInfoNext.date;
                let type_endDate0 = typeof endDate0;

                if(isFirstTime) {
                    isFirstTime = false;
                }
                else {
                    conditionStr += ' || ';
                }
                conditionStr += `((milstoneDate >= ${startDate0.getTime()}) && (milstoneDate < ${endDate0.getTime()}))`;
            }
        }

        // update the attribute isImageInRange in imagesInfo
        selectedLayer.updateImagesInfoAttr_isImageInRange(conditionStr);
    }
    

    async initSceneBar (user_role, component) {
        console.log('BEG SceneBar::initSceneBar1');
        
        if(COL.isOldGUIEnabled) {
            let zipFileOptions_admin = new component.Group({id: 'zipFileOptions_adminId'});
            let editOptions = new component.Group({id: 'editOptionsId'});

            let iconDir = 'V1/img/icons/IcoMoon-Free-master/PNG/48px';
            console.log('iconDir2', iconDir); 
        
            let iconPath = iconDir + '/0049-folder-open.png';

            if(COL.doWorkOnline) {
            
                iconPath = iconDir + '/0146-wrench.png';
                this._editOverlayRectButton = new component.ToggleButton({
                    tooltip: 'Edit model overlay',
                    icon: iconPath,
                    on: false
                });
                let jqueryObj = $(this._editOverlayRectButton.$);
                jqueryObj.addClass('ui-button');
                this.disabledOnSceneEmpty(this._editOverlayRectButton);

                iconPath = iconDir + '/0035-file-text.png';
                this._addStickyNoteButton = new component.Button({
                    tooltip: 'Add sticky note',
                    icon: iconPath
                });
                $(this._addStickyNoteButton.$).addClass('ui-button');
                this.disabledOnSceneEmpty(this._addStickyNoteButton);

                editOptions.add(this._editOverlayRectButton);
                if(COL.doEnableWhiteboard) {
                    editOptions.add(this._editOverlayRect_editFloorPlanWhiteboard);
                }
                editOptions.add(this._editOverlayRect_deleteButton);
                editOptions.add(this.openImageFileButton);
                editOptions.add(this._reconcileFrontEndButton);
            // editOptions.add(this._addStickyNoteButton);
            }

            // //////////////////////////////////////////////////////////////////////////////
            // - set the buttons (hide/show) according to the user role
            // //////////////////////////////////////////////////////////////////////////////

            let loggedInFlag = COL.model.getLoggedInFlag();
            // console.log('loggedInFlag', loggedInFlag); 
            if(loggedInFlag) {
                if(user_role === 'admin' ) {
                // admin user
                    this._toolBar.add(
                        zipFileOptions_admin,
                        editOptions,
                        this.playImagesInAllOverlayRectsButton,
                        this._reloadPageButton
                    );
                
                }
                else {
                // non-admin user (e.g. group_owner, or regular user)
                // hide buttons group: zipFileOptions_admin
                    this._toolBar.add(
                        editOptions,
                        this.playImagesInAllOverlayRectsButton,
                        this._reloadPageButton
                    );
                }

            }

            // //////////////////////////////////////////////////////////////////////////////
            // SCENE BAR EVENT HANDLERS
            // //////////////////////////////////////////////////////////////////////////////

            if(COL.doWorkOnline) {

                if(COL.doEnableWhiteboard) {
                    this._editOverlayRect_editFloorPlanWhiteboard.onClick(async function () {
                        console.log('BEG _editOverlayRect_editFloorPlanWhiteboard'); 
                        let planView = COL.getPlanView();
                    });
                }

                this._editOverlayRect_deleteButton.onClick(async function () {
                    let selectedLayer = COL.model.getSelectedLayer();
                    let planView = COL.getPlanView();
                    let intersectedOverlayRectInfo = planView.getIntersectionOverlayRectInfo();
                    let selectedOverlayRectObj = COL.util.getNestedObject(intersectedOverlayRectInfo, ['currentIntersection', 'object']);
    
                    if(selectedOverlayRectObj) {
    
                        // disable buttons related to editOverlayRect, so that while syncing to the backend, the user cannot make updates, e.g.
                        //   add a new overlayRect, change location of overlayRect, delete image from overlayRect etc...
                        sceneBar.disableEditOverlayRectRelatedButtons(true);
                        
                        let selectedOverlayRect = selectedLayer.getSelectedOverlayRect();
                        let imageFilenameToRemove = selectedOverlayRect.getSelectedImageFilename();
                        await selectedLayer.deleteImageFromLayer(selectedOverlayRect, imageFilenameToRemove);
                    }
                });

                this.openImageFileButton.onClick(async function (input) {
                    console.log('BEG openImageFileButton.onClick');
    
                    // the onClick event is fired when clicking on the button
    
                    if( COL.util.isObjectValid(window.$agent_jasonette_android) ) {
                        // window.$agent_jasonette_android is defined, i.e. the client is the jasonette mobile app
                        // trigger a request to add an image from the camera or from the
                        // file system on the mobile device
                        console.log('Before trigger media.pickerAndCamera'); 
                        window.$agent_jasonette_android.trigger('media.pickerAndCamera');
                    }
                });

            
                this.openImageFileButton.onChange(async function (input) {
                // console.log('BEG openImageFileButton.onChange');

                    // let inputType = (typeof input);

                    let sceneBar = COL.model.getSceneBar();
                    // Convert from FileList to array
                    // https://stackoverflow.com/questions/25333488/why-isnt-the-filelist-object-an-array
                    let filesToOpenArray = Array.from(input.files);

                    sceneBar.onChange_openImageFileButton(filesToOpenArray);
                });

                this._reconcileFrontEndButton.onClick(async function () {
                    console.log('BEG _reconcileFrontEndButton.onClick');
                    let selectedLayer = COL.model.getSelectedLayer();
                    await selectedLayer.reconcileFrontEndInconcitencies();
                });

                this._addStickyNoteButton.onClick(function () {
                    let selectedLayer = COL.model.getSelectedLayer();
                    selectedLayer.addStickyNote();
                });
            
                // buttons related to editSpecificOverlayRect
                this.disableEditOverlayRectRelatedButtons(true);

            }

            
            // create the planViewSetting modal (e.g. to filter dates, and overlayRect dot size)
            this.initPlanViewSettingModal();
            
            this._reloadPageButton.onClick(function () {
                console.log('BEG _reloadPageButton.onClick');
    
                // https://www.freecodecamp.org/news/location-reload-method-how-to-reload-a-page-in-javascript/
                // True reloads the page from the server (e.g. does not store the data cached by the browser):
                // 
                // https://stackoverflow.com/questions/2099201/javascript-hard-refresh-of-current-page
                // When this method receives a true value as argument, it will cause the page to always be reloaded from the server.
                // If it is false or not specified, the browser may reload the page from its cache.
    
                window.location.reload(true);
            });

            this.playImagesInAllOverlayRectsButton.onClick(async function () {
                // console.log('BEG playImagesInAllOverlayRectsButton.onClick');
    
                let sceneBar = COL.model.getSceneBar();
                let selectedLayer = COL.model.getSelectedLayer();
                try {
                    // disable the button (successive clicks, before the first click is processed
                    // cause, e.g. to miss split images? (172 images in total but after rapid splitting shows only 162 images??))
                    let playImagesState = sceneBar.playImagesInAllOverlayRectsButton.isOn() ? Layer.PLAY_IMAGES_STATE.PLAY_IMAGES_IN_ALL_OVERLAY_RECTS : Layer.PLAY_IMAGES_STATE.NONE;
                    // console.log('playImagesState1', playImagesState); 
                    
                    selectedLayer.setPlayImagesState(playImagesState);
                    await selectedLayer.playImagesInAllOverlayRects();
                }
                catch(err) {
                    console.error('err:', err);
                    
                    let toastTitleStr = 'Play images in all overlayRects';
                    let msgStr = 'Failed to play images in all overlayRects. ' + err;
                    toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
                }
    
                // reset the play button 
                selectedLayer.setPlayImagesState(Layer.PLAY_IMAGES_STATE.NONE);
                // change the state of scenebar::playImagesInAllOverlayRectsButton without
                // trigerring a call to playImagesInAllOverlayRectsButton.onClick
                let event = undefined;
                sceneBar.playImagesInAllOverlayRectsButton.toggle(null, event);
                
                // update the buttons: previousImageButton, nextImageButton, play Buttons to their default state
                // (e.g. enable if selectedOverlayRect is defined and has more than 1 image)
                selectedLayer.updatePreviousPlayNextImageButtons();
            });
            
            let toolBar = this._toolBar.$.attr('id', 'col-scenebarId');
            
            let toolbarGroupJqueryElement = $('#toolbarGroupId');
            $('#main-container-id').append(toolbarGroupJqueryElement);
            toolBar.appendTo('#toolbarGroupId');
        }

        return;
    }

    async onClick_openZipFileButton(input) {
        console.log('BEG onClick_openZipFileButton');

        if( COL.util.isObjectValid(window.$agent_jasonette_android)) {
            // in mobile app (e.g. jasonette), 
            // read the file headers in the .zip file from the mobile device
            window.$agent_jasonette_android.trigger('media.loadZipFileHeaders');
        }
    }
    
    // onChange_openZipFileButton1 is NOT called from mobile app - android
    async onChange_openZipFileButton1(input) {
        console.log('BEG onChange_openZipFileButton1'); 

        let sceneBar = COL.model.getSceneBar();
        // Convert from FileList to array
        // https://stackoverflow.com/questions/25333488/why-isnt-the-filelist-object-an-array
        let filesToOpenArray = Array.from(input.files);
        let fileToOpen = filesToOpenArray[0];

        console.log('COL.util.isObjectValid(window.$agent_jasonette_ios)4', COL.util.isObjectValid(window.$agent_jasonette_ios)); 
        if(COL.util.isObjectValid(window.$agent_jasonette_ios)) {
            // In mobile app jasonette-ios, 
            // read the file headers in the .zip file from the mobile device
            // window.$agent_jasonette_ios.trigger("media.loadZipFileHeaders1");

            console.log('fileToOpen', fileToOpen);
            
            let options = {'filename1': fileToOpen.name};
            window.$agent_jasonette_ios.trigger('media.loadZipFileHeaders2', options);
        }
        else {
            // In webapp (a.k.a. "native webapp" i.e. not mobile app)
            // (cannot be in mobile app jasonette-android because onChange_openZipFileButton1 is NOT called from mobile app - android)
            await sceneBar.onChange_openZipFileButton(fileToOpen);
        }
    }

    async onChange_openImageFileButton (filesToOpenArray) {
        console.log('BEG onChange_openImageFileButton111');

        // the onChange event is fired when selecting images
        // (if not selecting any images, and just canceling, the event s not fired..)
        try {
            await COL.core.ImageFile.openImageFiles(filesToOpenArray);
        }
        catch(err) {
            console.error('Error from ImageFile.openImageFiles:', err);

            let toastTitleStr = 'Open image file';
            let msgStr = 'Failed to open the image. ' + err;
            toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
        }
    }

    // The variable zipFile is only used in non-mobile webapp.
    // In mobile app (android), the zipfile info is taken from model.selectedZipFileInfo
    // (therefore, for mobile app the value of zipFile is 'undefined' and it does not make any impact)
    async onChange_openZipFileButton (zipFile = undefined) {
        console.log('BEG onChange_openZipFileButton');

        COL.model.fileZip = new FileZip_withJson();
        await COL.model.fileZip.openSingleZipFile(zipFile);

        if(COL.doWorkOnline) {
            // Finished loading the zip file
            // Reload the url to reflect the sitesInfo
            let queryUrl = Model.GetUrlBase() + 'view_sites';
            // console.log('queryUrl', queryUrl); 
            await fetch(queryUrl);
        }
        else {
            // looks like we are ok without reloading the file view_sites.html ???
            // (the file index.html is similar to view_sites.html ???)
        }

        // set the pane to show the loaded zip file.
        let hamburgerBtnEl = document.getElementById('hamburgerBtnId');
        console.log('hamburgerBtnEl: ', hamburgerBtnEl);
        COL.manageGUI.setPane(hamburgerBtnEl);
        COL.manageGUI.toggleProjectMenu(false);
        
        let selectedLayer = COL.model.getSelectedLayer();
        let selectedOverlayRect = selectedLayer.getSelectedOverlayRect();
        if(COL.util.isObjectValid(selectedOverlayRect)){
            selectedLayer.showSelectedOverlayRect();
            // selectedOverlayRect.setState(OverlayRect.STATE.ADD_PHOTO);
        }
    }
    

    handleEditOverlayRect (isEditOverlayRectEnabled) {

        if(COL.doWorkOnline) {
            let selectedLayer = COL.model.getSelectedLayer();
            let planView = COL.getPlanView();
            let orbitControls = planView.getOrbitControls();
            // planView.enableControls(isEditOverlayRectEnabled);
        
            if(isEditOverlayRectEnabled) {
                // Enable editOverlayRect related buttons only if selectedOverlayRect is not empty
                // (i.e. there is a selected, highlighted circle)
                let selectedOverlayRect = selectedLayer.getSelectedOverlayRect();
                let doDisableEditOverlayRectRelatedButtons = true;
                if( COL.util.isObjectValid(selectedOverlayRect) ) {
                    doDisableEditOverlayRectRelatedButtons = false;
                }
                this.disableEditOverlayRectRelatedButtons(doDisableEditOverlayRectRelatedButtons);
            }
            else {
                // /////////////////////////////////////////
                // edit mode is disabled
                // /////////////////////////////////////////
                
                // disable editOverlayRect related buttons
                this.disableEditOverlayRectRelatedButtons(true);
            }
        }
    }
    // editOverlayRectButton_onClick () {
    //     let isEditOverlayRectEnabled = this._editOverlayRectButton.isOn();
    //     this.handleEditOverlayRect(isEditOverlayRectEnabled);
    // }

    getEditOverlayRectButton () {
        return this._editOverlayRectButton;
    }

    // tbd - remove the function - only used for COL.isOldGUIEnabled
    disableEditOverlayRectRelatedButtons (doDisable) {
        // console.log('BEG disableEditOverlayRectRelatedButtons');
        
        if(COL.doWorkOnline) {
            if(COL.doEnableWhiteboard) {
                this._editOverlayRect_editFloorPlanWhiteboard.disabled(doDisable);
            }
            this._editOverlayRect_deleteButton.disabled(doDisable);
            this.openImageFileButton.disabled(doDisable);
            this._reconcileFrontEndButton.disabled(doDisable);
        }
    }

    disableNextAndPreviousImageButtons (doDisable) {
        // console.log('BEG disableNextAndPreviousImageButtons'); 
        COL.colJS.previousImageButton.disabled(doDisable);
        COL.colJS.nextImageButton.disabled(doDisable);
    }

    // * Utility function to make a component automatically disabled if the scene doesn't contains layers
    // * or automatically enabled if the scene contains at least one layer
    // * @param {COL.component.Component} component The component to disable/enable
    
    disabledOnSceneEmpty (component) {
        $(window).ready(function () {
            component.disabled(true);
        });
    }

    static SliderVal_to_overlayRectScale (sliderVal) {
        let overlayRectScale = 1;
        switch (sliderVal) {
            case 1:
                overlayRectScale = 0.5;
                break;
            case 2:
                overlayRectScale = 1;
                break;
            case 3:
                overlayRectScale = 2;
                break;
            default:
                let msgStr = 'sliderVal: ' + sliderVal + ' is not supported';
                console.warn(msgStr);
        }
        return overlayRectScale;
    }

    static OverlayRectScale_to_sliderVal (overlayRectScale) {
        let sliderVal = 1;
        switch (overlayRectScale) {
            case 0.5:
                sliderVal = 1;
                break;
            case 1:
                sliderVal = 2;
                break;
            case 2:
                sliderVal = 3;
                break;
            default:
                let msgStr = 'overlayRectScale: ' + overlayRectScale + ' is not supported';
                console.warn(msgStr);
        }
        return sliderVal;
    }
    
}

$(window).on('load', function () {
    // console.log('BEG Scenebar::window.load');
});

$(window).ready(function () {
    // console.log('BEG Scenebar::window.ready');
    
    // https://stackoverflow.com/questions/4628544/how-to-detect-when-cancel-is-clicked-on-file-input
    // focus event is one option to detect when the File Imput modal Dialog-box is closed
    // (e.g. by clicking on the 'Cancel' button in the dialog, or by clicking 'Escape')
    window.addEventListener('focus', function (e) {
        // console.log('BEG window focus');
    });
});


function savePhotoFromImageUrl(imageUrl) {
    console.log('BEG savePhotoFromImageUrl');

    // when operating from mobile app jasonette, this function is called from jasonette
    // after getting a photo from the camera or from the file system
    // to add the photo to the list of overlayRect files
    
    console.log('imageUrl', imageUrl); 
    let sceneBar = COL.model.getSceneBar();

    // https://stackoverflow.com/questions/35940290/how-to-convert-base64-string-to-javascript-file-object-like-as-from-file-input-f
    fetch(imageUrl)
        .then(res => res.blob())
        .then(blob => {
            // https://gist.github.com/hurjas/2660489
            let filename = COL.core.ImageFile.createFileNameWithTimestamp();
            console.log('filename', filename);
            
            const file = new File([blob], filename,{ type: 'image/png' });
            // const file = new File([blob], filename,{ type: "image" })
            
            let filesArray = [];
            filesArray.push(file);
            console.log('filesArray', filesArray);
            console.log('filesArray.length', filesArray.length);
            
            sceneBar.onChange_openImageFileButton(filesArray);
        });
}


async function callbackLoadZipFileHeaders(param) {
    console.log('BEG callbackLoadZipFileHeaders');

    let toastTitleStr = 'Callback load model from zip file';
    try {
        // in mobile app - this function is called from jasonette
        // after getting a zipfile from the file system, with the file headers.
    
        // populate zipFileInfo with the file headers in the .zip file 
        let zipFileInfoFiles_asJson = JSON.parse( param.zipFileInfoFiles_asJsonStr );
        console.log('zipFileInfoFiles_asJson', zipFileInfoFiles_asJson); 
    
        if(COL.util.isObjectValid(param.isJasonette_iOS)) {
            console.log('In jasonette-ios'); 
            // populate the fields in zipFileInfo
            for (const filenameFullPath of Object.keys(zipFileInfoFiles_asJson)) {
                let zipFileInfoFile = zipFileInfoFiles_asJson[filenameFullPath];
                zipFileInfoFile.sliceBeg = 0;
                zipFileInfoFile.sliceEnd = 0;
                zipFileInfoFile.headerSize = 0;
            }
        }
        else {
            console.log('In jasonette-android'); 
            // populate the fields sliceBeg, sliceEnd in zipFileInfo
            for (const filenameFullPath of Object.keys(zipFileInfoFiles_asJson)) {
                let zipFileInfoFile = zipFileInfoFiles_asJson[filenameFullPath];
                zipFileInfoFile.sliceBeg = zipFileInfoFile.offsetInZipFile;
                zipFileInfoFile.sliceEnd = zipFileInfoFile.offsetInZipFile +
                    zipFileInfoFile.headerSize +
                    zipFileInfoFile.compressedSize;
            }
        }
        
        let zipFileInfo = new ZipFileInfo({zipFile: null,
            zipFileName: param.colZipPath,
            zipFileUrl: null,
            files: zipFileInfoFiles_asJson});
        
        COL.model.setZipFilesInfo(zipFileInfo);
        COL.model.setSelectedZipFileInfo(zipFileInfo);
    
        // load the rest of the zip file (e.g. individual files within the .zip file)
        let sceneBar = COL.model.getSceneBar();
        await sceneBar.onChange_openZipFileButton();

        let msgStr = 'Callback succeeded';
        toastr.success(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
    }
    catch (err) {
        console.error('Error from callbackLoadZipFileHeaders:', err);
        let msgStr = err;
        toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
    }
}
    
// Expose savePhoto to Jasonette
window.callbackLoadZipFileHeaders = callbackLoadZipFileHeaders;
window.savePhotoFromImageUrl = savePhotoFromImageUrl;

export { SceneBar };
