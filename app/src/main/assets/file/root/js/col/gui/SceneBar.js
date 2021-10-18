import { COL } from  "../COL.js";
import "./Component.js";
import "../core/Core.js";
import { FileZip_withJson } from "../loaders/FileZip_withJson.js";
import { Layer } from "../core/Layer.js";
import { Model } from "../core/Model.js";
import { Scene3DtopDown } from "../core/Scene3DtopDown.js";
import { EditOverlayRect_Scene3DtopDown_TrackballControls } from "../orbitControl/EditOverlayRect_Scene3DtopDown_TrackballControls.js";


class SceneBar {

    constructor(component){

        this._toolBar = new component.ToolBar();

        let iconPath = "";
        let iconDir = "V1/img/icons/IcoMoon-Free-master/PNG/48px";
        console.log('iconDir1', iconDir); 

        if(COL.doWorkOnline)
        {
            this._editOverlayRectButton = undefined;

            // tbd - _editOverlayRect -> _editMode
            
            if(COL.doEnableWhiteboard)
            {
                iconPath = iconDir + "/0345-make-group.png";
                this._editOverlayRect_editFloorPlanWhiteboard = new component.Button({
                    tooltip: "Edit Whiteboard",
                    icon: iconPath
                });
                $(this._editOverlayRect_editFloorPlanWhiteboard.$).addClass("ui-button");
            }

            iconPath = iconDir + "/0272-cross.png";
            this._editOverlayRect_deleteButton = new component.Button({
                tooltip: "Delete image / overlayRect",
                icon: iconPath
            });
            $(this._editOverlayRect_deleteButton.$).addClass("ui-button");

            iconPath = iconDir + "/0015-images.png";
            this._openImageFileButton = new component.FileButton({
                tooltip: "Open image file",
                icon: iconPath,
                multiple: true
            });
            $(this._openImageFileButton.$).addClass("ui-button");

            iconPath = iconDir + "/0102-undo.png";
            this._reconcileFrontEndButton = new component.Button({
                tooltip: "Reconcile front-end inconcitencies",
                icon: iconPath,
                multiple: true
            });
            $(this._reconcileFrontEndButton.$).addClass("ui-button");

            // this._mergeOverlayRectsButton = new component.Button({
            iconPath = iconDir + "/0141-shrink2.png";
            this._mergeOverlayRectsButton = new component.ToggleButton({
                tooltip: "Merge overlayRect",
                icon: iconPath,
                multiple: true
            });
            $(this._mergeOverlayRectsButton.$).addClass("ui-button");

            iconPath = iconDir + "/0140-enlarge2.png";
            this._splitOverlayRectButton = new component.Button({
                tooltip: "Split overlayRect",
                icon: iconPath,
                multiple: true
            });
            $(this._splitOverlayRectButton.$).addClass("ui-button");

            iconPath = iconDir + "/0152-magic-wand.png";
            this._editOverlayRect_syncWithBackendBtn = new component.Button({
                tooltip: "Sync to backend",
                icon: iconPath
            });
            $(this._editOverlayRect_syncWithBackendBtn.$).addClass("ui-button");

            iconPath = iconDir + "/0278-play2.png";
            this._playImagesInAllOverlayRectsButton = new component.ToggleButton({
                id: "playImagesInAllOverlayRectsButton",
                tooltip: "Play images in all overlayRects",
                icon: iconPath,
                on: false
            });
            let jqueryObj = $(this._playImagesInAllOverlayRectsButton.$);
            jqueryObj.addClass("ui-button");

            iconPath = iconDir + "/0303-loop2.png";
            this._reloadPageButton = new component.Button({
                tooltip: "Reload site",
                icon: iconPath,
                multiple: true
            });
            $(this._reloadPageButton.$).addClass("ui-button");

            // --------------------------------------------------------------
            // BEG Set the TopDown Settings Modal
            // --------------------------------------------------------------
            
            // define the TopDown Settings Modal button
            this._topDownSettingModalBtnEl = '<a href="#" class="ui-button" data-toggle="modal" data-target="#basicModal" id="topdown-settings-modal-btn"><img src="V1/img/icons/IcoMoon-Free-master/PNG/48px/0009-pen.png"/></a>';

            // --------------------------------------------------------------
            // END Set the TopDown Settings Modal
            // --------------------------------------------------------------
            
            
            this._addStickyNoteButton = undefined;

            iconPath = iconDir + "/0009-pen.png";
            this._syncFromZipFileToWebServerButton = new component.Button({
                tooltip: "Sync from zip file to web server",
                icon: iconPath,
                id: "syncFromZipFileToWebServerButton",
                disabled: true
            });
            $(this._syncFromZipFileToWebServerButton.$).addClass("ui-button");
            $(this._syncFromZipFileToWebServerButton.$).addClass("admin-feature");
        }
        else
        {
            // work offline
            iconPath = iconDir + "/0278-play2.png";
            this._playImagesInAllOverlayRectsButton = new component.ToggleButton({
                id: "playImagesInAllOverlayRectsButton",
                tooltip: "Play images in all overlayRects",
                icon: iconPath,
                on: false
            });
            let jqueryObj = $(this._playImagesInAllOverlayRectsButton.$);
            jqueryObj.addClass("ui-button");
        }
        
        
        this._isTexturePaneMaximized = false;

        // skipping row 0 (the header row)
        this._milestoneDatesRowNum = 1;
        
    };

    createTopDownSettingModal = function () {
        // --------------------------------------------------------------
        // http://jsfiddle.net/Transformer/5KK5W/
        // for date setting
        
        // https://mdbootstrap.com/docs/standard/forms/checkbox/
        // for checkbox setting in table cell

        // define the TopDown Settings Modal, which includes:
        // - slider for the radius of the overlayRect
        // - milestoneDates table
        // - tbd - option to see cross-hair between the 2 fingers

        let dataSliderInitialValue = 2;
        let rowNum = this._milestoneDatesRowNum;
        
        // value="Remove1" sets the label inside the button (as opposed to setting it besides the button if used after the element)
        let topDownSettingModalEl = `
<div class="modal fade" id="basicModal" tabindex="-1" role="dialog" aria-labelledby="basicModal" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
        <h3 class="modal-title" id="myModalLabel">TopDown Settings Modal</h3>
      </div>
      <div id="modalBodyId" class="modal-body">
        <p>slider</p>
        <input id="overlayrect-size-slider-id" data-slider-id='overlayRectSizeDataSliderId' type="text" data-slider-ticks="[1, 2, 3]" data-slider-ticks-labels='["0.5", "1", "2"]' data-slider-ticks-positions="[0, 50, 100]" data-slider-value="${dataSliderInitialValue}"/>
      </div>
      <div id="datesId">
        <table id="date_table" class="table" data-toggle="table" data-height="300" data-url="https://api.github.com/users/wenzhixin/repos?type=owner&sort=full_name&direction=asc&per_page=100&page=1" data-pagination="true" data-search="true" data-show-refresh="true" data-show-toggle="true" data-show-columns="true" data-toolbar="#toolbar">
          <thead>
            <tr>
              <th data-field="date">Date</th>
              <th data-field="date_name">Event</th>
              <th Enable data-field="state" data-checkbox="true"></th>
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
        <input type="checkbox" id="enableMilestoneDatesId" class="checkbox-inline" value="" checked>
        <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
        <button type="button" id="topDownSettingSaveBtnId" class="btn btn-primary">Save changes</button>
      </div>
    </div>
  </div>
</div>
`;
        
        $('#grid-container1').append(topDownSettingModalEl);
    };
    
    initTopDownSettingModal = function () {
        // console.log('BEG initTopDownSettingModal');

        this.createTopDownSettingModal();
        
        $('#toolbarGroupId').append(this._topDownSettingModalBtnEl);

        $("#topdown-settings-modal-btn").click(function() {

            let selectedLayer = COL.model.getSelectedLayer();
            let scene3DtopDown = selectedLayer.getScene3DtopDown();
            let overlayRectScale = scene3DtopDown.getOverlayRectScale();
            let sliderVal = SceneBar.OverlayRectScale_to_sliderVal(overlayRectScale);

            let overlayrectSizeSlider = $("#overlayrect-size-slider-id").slider();
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
            if(this.checked)
            {
                isMilestoneDatesFilterEnabled = true;
            }
            selectedLayer.setIsMilestoneDatesFilterEnabled(isMilestoneDatesFilterEnabled);
            
            // This will disable all the children of the div
            var nodes = document.getElementById("datesId").getElementsByTagName('*');
            for(var i = 0; i < nodes.length; i++){
                nodes[i].disabled = !isMilestoneDatesFilterEnabled;
            }

            let sceneBar = COL.model.getSceneBar();
            sceneBar.validateMilestoneDatesAndUpdateScene();
        });

        
        document.getElementById('topDownSettingSaveBtnId').onclick = function() {
            // console.log('BEG topDownSettingSaveBtnId'); 
            let sceneBar = COL.model.getSceneBar();
            sceneBar.validateMilestoneDatesAndUpdateScene();
        };            

    };
    
    initOverlayRectSlider = function () {

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
    };

    
    validateMilestoneDatesAndUpdateScene = function () {
        console.log('BEG validateMilestoneDatesAndUpdateScene');
        
        // validate cells and update milestoneDates
        if(!this.validateMilstoneDateTable())
        {
            throw new Error('MilstoneDateTable is invalid');
        }
        this.filterOverlayRectsByMilestoneDates();
    };
    
    initMilstoneDateTable = function () {

        // // https://www.w3schools.com/jquery/event_on.asp
        // var checkedRows = [];

        // $('#date_table').on('check.bs.table', function (e, row) {
        //     console.log('BEG check.bs.table');
        
        //     checkedRows.push({id: row.id, name: row.name, forks: row.forks});
        //     console.log(checkedRows);
        // });        

        ////////////////////////////////////////////////////////////
        // interaction with any of the milestone rows
        // (with class .date_row_class)
        ////////////////////////////////////////////////////////////

        $("body").on("click", ".date_row_class", function () {
            // clicking anywhere in the row will trigger this function
            // console.log('BEG clicked on element with class date_row_class');
            let msg1 = `clicked on ${this.id}`;
            // console.log('msg1', msg1); 
        });


        ////////////////////////////////////////////////////////////
        // interaction with date_pickr_start_date
        ////////////////////////////////////////////////////////////

        var projectStartDate;

        // $("#date_pickr_start_date").datepicker('setDate', new Date(2020, 8, 1));
        // $("#date_pickr_start_date").datepicker('update');  //update the bootstrap datepicker
        
        // $("#date_pickr_start_date").datepicker({
        $(".date_pickr").datepicker({
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
            
            if(this.id === 'date_pickr_start_date')
            {
                // console.log('BEG date_pickr_start_date .changeDate');
                
                projectStartDate = new Date(selected.date.valueOf());
                // console.log('projectStartDate', projectStartDate);

                // loop over all the date rubrics and verify that the date is not earlier than projectStartDate
                let eventDates = $('.date_pickr');
                for (const eventDate of eventDates){
                    if(eventDate.id !== 'date_pickr_start_date')
                    {
                        let eventDate2 = $(`#${eventDate.id}`).val();
                        let eventDate2_date = new Date (eventDate2);

                        // Adjust the start date of all date rubrics
                        $(`#${eventDate.id}`).datepicker('setStartDate', projectStartDate);
                        
                        // https://poopcode.com/compare-two-dates-in-javascript-using-moment/
                        let isEventDateBeforeStartDate = moment(eventDate2_date).isBefore(selected.date);
                        if(isEventDateBeforeStartDate)
                        {
                            // The event date is earlier than projectStartDate.
                            // Adjust the event date - clamp it to be the projectStartDate
                            $(`#${eventDate.id}`).datepicker('setDate', projectStartDate);
                        }
                    }
                }            
            }
            
            // $('#enddate').datepicker('setStartDate', projectStartDate);
        });

        ////////////////////////////////////////////////////////////
        // interaction with any of the milestone date elements
        // (with class .date_pickr)
        ////////////////////////////////////////////////////////////
        
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

            if(COL.util.isObjectInvalid(projectStartDate))
            {
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



        ////////////////////////////////////////////////////////////
        // interaction with any of the chekboxes 
        ////////////////////////////////////////////////////////////

        // need to use existing element, e.g. "body" to bind the dynamically added 'checkbox' elements
        // (event delegation) so
        // - cannot use "$(".checkbox-inline").on('click'..."
        // - need to use e.g. "$("body").on("click"..."
        
        $("body").on("click", ".checkbox-inline", function () {
            // clicking anywhere in the row will trigger this function
            // console.log('BEG clicked on element with class checkbox-inline');
            let msg1 = `clicked on ${this.id}`;
            // console.log('msg1', msg1); 
        });

        $("#addRowBtnId").click(function() {
            // console.log('BEG addRowBtnId.click'); 

            let sceneBar = COL.model.getSceneBar();
            let retval = sceneBar.validateMilstoneDateTable();
            if(!retval)
            {
                console.error('table is invalid. Cannot add new row');
                return;
            }
            
            //add row with date_pickrs
            // rowNum++;
            sceneBar._milestoneDatesRowNum++;
            let rowNum = sceneBar._milestoneDatesRowNum

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
    };
    
    validateMilstoneDateTable = function () {
        // console.log('BEG validateMilstoneDateTable');

        let retval = true;
        let eventDates = $('.date_pickr');

        for (const eventDate of eventDates){
            let eventDate2 = $(`#${eventDate.id}`).val();
            // console.log('eventDate2', eventDate2);
            let eventDate2_date = new Date(eventDate2);
            // console.log('eventDate2_date', eventDate2_date);

            if(COL.util.isDateInvalid(eventDate2_date))
            {
                retval = false;
                break;
            }
        }
        return retval;
    };
    
    filterOverlayRectsByMilestoneDates = function () {
        // console.log('BEG filterOverlayRectsByMilestoneDates');
        
        // https://stackoverflow.com/questions/3072233/getting-value-from-table-cell-in-javascript-not-jquery
        var table = document.getElementById('date_table');

        let selectedLayer = COL.model.getSelectedLayer();
        selectedLayer._milestoneDatesInfo.clear();

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
            
            selectedLayer._milestoneDatesInfo.set(eventName, milestoneDateInfo);
        }

        // sort dates by date (enabled, and disabled)
        let milestoneDatesInfo_sortedByDate = selectedLayer._milestoneDatesInfo.sortByVal('date');

        ////////////////////////////////////////////////////////////////////
        // create the filter conditions
        ////////////////////////////////////////////////////////////////////

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

            if (milestoneDateInfoNext.isEnabled)
            {
                let startDate0 = new Date (milestoneDateInfoCurr.date);
                let endDate0 = new Date (milestoneDateInfoNext.date);

                console.log('startDate0', startDate0);
                console.log('endDate0', endDate0);
                
                // console.log('milestoneDateInfoNext.date', milestoneDateInfoNext.date);
                // console.log('endDate0', endDate0); 
                // var date_received = $("#id_date_received").datepicker('getDate');
                let type_milestoneDateInfoNext_date = typeof milestoneDateInfoNext.date;
                let type_endDate0 = typeof endDate0;

                if(isFirstTime)
                {
                    isFirstTime = false;
                }
                else
                {
                    conditionStr += ' || ';
                }
                conditionStr += `((milstoneDate >= ${startDate0.getTime()}) && (milstoneDate < ${endDate0.getTime()}))`;
            }
        }

        // update the attribute isImageInRange in imagesInfo
        selectedLayer.updateImagesInfoAttr_isImageInRange(conditionStr);
    };
    
    
    renderSelectedPlan = async function (getCurrentUserResultAsJson) {
        console.log('BEG renderSelectedPlan');
        
        ////////////////////////////////////////////////////////////////////////////////
        // - set the selected index for the option in optgroup (global running index throughout multiple optgroups)
        // - render the selected plan 
        ////////////////////////////////////////////////////////////////////////////////

        // console.log('set the selected index for the option in optgroup'); 
        if(getCurrentUserResultAsJson['selected_plan_id'])
        {
            // set the selected index for the option in optgroup according to selected_plan_id
            //
            // find (optionIndex, plan_id) in planInfoStr in all options
            // plan_id - search in planInfoStr for string "id": (e.g. "id":"3" -> 3
            //
            // match plan_id with selected_plan_id
            // when matched, set selectedIndex to optionIndex

            let selected_plan_id = getCurrentUserResultAsJson['selected_plan_id'];
            // console.log('selected_plan_id', selected_plan_id); 
            
            // https://stackoverflow.com/questions/5090103/javascript-regexp-dynamic-generation-from-variables
            // e.g. "id":"3"
            let matchPattern = '\\"id\\"\\:\\"' + selected_plan_id + '\\"'; 
            let optionIndex = this.findOptionIndexBySubstrInVal(matchPattern);
            if(COL.util.isObjectValid(optionIndex))
            {
                $('#sitesId')[0].selectedIndex = optionIndex;

                // render the selected plan
                await COL.colJS.onSitesChanged();
            }
        }
        else
        {
            // set the selected index for the option in optgroup to the first available plan
            let numPlans = $("#sitesId option").length;
            console.log('numPlans', numPlans);
            if(numPlans > 0)
            {
                // there is at least one plan - set to the first plan
                $('#sitesId')[0].selectedIndex = 0;

                // render the selected plan
                await COL.colJS.onSitesChanged();
            }
        }
    };
    

    initSceneBar = async function (user_role, component) {
        console.log('BEG SceneBar::initSceneBar');
        
        let zipFileOptions_admin = new component.Group({id: "zipFileOptions_adminId"});
        let editOptions = new component.Group({id: "editOptionsId"});

        let iconDir = "V1/img/icons/IcoMoon-Free-master/PNG/48px";
        console.log('iconDir2', iconDir); 
        
        let iconPath = iconDir + "/0049-folder-open.png";
        let openZipFileButton = new component.FileButton({
            tooltip: "Open zip file1",
            icon: iconPath,
            id: "openZipFileButton",
            multiple: true
        });

        let openZipFileButtonJqueryObject = $(openZipFileButton.$);
        openZipFileButtonJqueryObject.addClass("ui-button");
        openZipFileButtonJqueryObject.addClass("admin-feature");
        
        if(COL.doWorkOnline)
        {

            zipFileOptions_admin.add(openZipFileButton);
            
            zipFileOptions_admin.add(this._syncFromZipFileToWebServerButton);

            iconPath = iconDir + "/0146-wrench.png";
            this._editOverlayRectButton = new component.ToggleButton({
                tooltip: "Edit model overlay",
                icon: iconPath,
                on: false
            });
            let jqueryObj = $(this._editOverlayRectButton.$);
            jqueryObj.addClass("ui-button");
            this.disabledOnSceneEmpty(this._editOverlayRectButton);

            iconPath = iconDir + "/0035-file-text.png";
            this._addStickyNoteButton = new component.Button({
                tooltip: "Add sticky note",
                icon: iconPath
            });
            $(this._addStickyNoteButton.$).addClass("ui-button");
            this.disabledOnSceneEmpty(this._addStickyNoteButton);

            editOptions.add(this._editOverlayRectButton);
            if(COL.doEnableWhiteboard)
            {
                editOptions.add(this._editOverlayRect_editFloorPlanWhiteboard);
            }
            editOptions.add(this._editOverlayRect_deleteButton);
            editOptions.add(this._openImageFileButton);
            editOptions.add(this._reconcileFrontEndButton);
            editOptions.add(this._mergeOverlayRectsButton);
            editOptions.add(this._splitOverlayRectButton);       
            editOptions.add(this._editOverlayRect_syncWithBackendBtn);
            // editOptions.add(this._addStickyNoteButton);
        }
        else
        {
            zipFileOptions_admin.add(openZipFileButton);
        }

        ////////////////////////////////////////////////////////////////////////////////
        // - set the buttons (hide/show) according to the user role
        ////////////////////////////////////////////////////////////////////////////////

        let loggedInFlag = COL.model.getLoggedInFlag();
        // console.log('loggedInFlag', loggedInFlag); 
        if(loggedInFlag)
        {
            if(user_role === 'admin' )
            {
                // admin user
                this._toolBar.add(
                    zipFileOptions_admin,
                    editOptions,
                    this._playImagesInAllOverlayRectsButton,
                    this._reloadPageButton
                );
                
            }
            else
            {
                // non-admin user (e.g. group_owner, or regular user)
                // hide buttons group: zipFileOptions_admin
                this._toolBar.add(
                    editOptions,
                    this._playImagesInAllOverlayRectsButton,
                    this._reloadPageButton
                );
            }

        }
        else
        {
            // non logged-in user
	    // enable to load from zip file and read only
            this._toolBar.add(
                openZipFileButton
            );
        }


        ////////////////////////////////////////////////////////////////////////////////
        // SCENE BAR EVENT HANDLERS
        ////////////////////////////////////////////////////////////////////////////////

        openZipFileButton.onClick(async function (input) {
            console.log('BEG openZipFileButton.onClick');

            console.log('COL.util.isObjectValid(window.$agent)', COL.util.isObjectValid(window.$agent));
            
            if( COL.util.isObjectValid(window.$agent))
            {
                // window.$agent is defined, i.e. the client is the jasonette mobile app
                // trigger a request to add a zip file from the
                // file system on the mobile device
                window.$agent.trigger("media.pickerAndCamera");
            }
            

        });
        
        openZipFileButton.onChange(async function (input) {
            console.log('BEG openZipFileButton.onChange'); 

            console.log('COL.util.isObjectValid(window.$agent11111111)', COL.util.isObjectValid(window.$agent));
            
            if( COL.util.isObjectValid(window.$agent))
            {
                // window.$agent is defined, i.e. the client is the jasonette mobile app
                // trigger a request to add a zip file from the
                // file system on the mobile device
                window.$agent.trigger("media.pickerAndCamera");
            }



            COL.model.fileZip = new FileZip_withJson();
            await COL.model.fileZip.openZipFile(input.files);
            

            if(COL.doWorkOnline)
            {
                // Finished loading the zip file
                // Reload the url to reflect the sitesInfo
                let queryUrl = COL.model.getUrlBase() + 'view_sites';
                // console.log('queryUrl', queryUrl); 
                await fetch(queryUrl);

                // enable _syncFromZipFileToWebServerButton
                let sceneBar = COL.model.getSceneBar();
                sceneBar._syncFromZipFileToWebServerButton.disabled(false);
            }
            else
            {
                // looks like we are ok without reloading the file view_sites.html ???
                // (the file index.html is similar to view_sites.html ???)
            }
            
        });

        if(COL.doWorkOnline)
        {
            this._syncFromZipFileToWebServerButton.onClick(async function () {
                console.log('BEG _syncFromZipFileToWebServerButton'); 

                // let doUploadToWebServer = confirm("Uploading to the webserver will overwrite all pre-existing data for the site!");
                // if(!doUploadToWebServer)
                // {
                //     // The user cancelled the operation. Do not upload.
                //     return;
                // }

                let spinnerJqueryObj = $('#cssLoaderId');
                spinnerJqueryObj.addClass("is-active");
                
                let toastTitleStr = "Sync site plans from the zip file to the webserver";
                try {

                    ///////////////////////////////////////////
                    // sync the site to the webserver
                    // do
                    // - syncZipSitesWithWebServer2
                    //   - syncZipSiteWithWebServer2
                    //     - syncZipSitePlanWithWebServer2
                    //       - syncZipSitePlanEntryWithWebServer2
                    //       - syncZipSitePlanFilesWithWebServer2
                    //         - syncFilesOfTheCurrentZipFileLayer2(imagesInfo, imageFilenames, syncRetVals)
                    //         - syncFilesOfTheCurrentZipFileLayer2(metaDataFilesInfo, metaDataFilenames, syncRetVals)
                    ///////////////////////////////////////////

                    let retval1 = await COL.model.fileZip.syncZipSitesWithWebServer2();

                    let retval = retval1.retval;
                    let syncZipSitesWithWebServer_statusStr = retval1.syncZipSitesWithWebServer_statusStr;


                    // // Reload the page with the updated sitesInfo
                    // document.location.reload(true);

                    // disable the button
                    let sceneBar = COL.model.getSceneBar();
                    sceneBar._syncFromZipFileToWebServerButton.disabled(true);

                    //////////////////////////////////////////////////////
                    // raise a toast
                    //////////////////////////////////////////////////////
                    
                    if(COL.doEnableToastr)
                    {
                        if(retval)
                        {
                            let msgStr = "Succeeded to sync: " + syncZipSitesWithWebServer_statusStr;
                            toastr.success(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);

                            let msgStr1 = toastTitleStr + ': ' + msgStr;
                            console.log('msgStr1', msgStr1); 
                            // alert(msgStr1);
                        }
                        else
                        {
                            let msgStr = "Failed to sync:" + syncZipSitesWithWebServer_statusStr;
                            toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
                        }
                    }
                    else
                    {
                        if(retval)
                        {
                            let msgStr = "Succeeded to sync: " + syncZipSitesWithWebServer_statusStr;
                            console.log(msgStr);
                            // alert(msgStr);
                        }
                        else
                        {
                            let msgStr = "Failed to sync:" + syncZipSitesWithWebServer_statusStr;
                            console.error(msgStr);
                            // alert(msgStr);
                        }
                    }
                }
                catch(err) {
                    console.error('Error from _syncFromZipFileToWebServerButton:', err);

                    let msgStr = "Failed to sync. " + err;
                    if(COL.doEnableToastr)
                    {
                        toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
                    }
                    else
                    {
                        console.error(msgStr);
                        // alert(msgStr);
                    }

                    // enable the button
                    let sceneBar = COL.model.getSceneBar();
                    sceneBar._syncFromZipFileToWebServerButton.disabled(false);
                }

                spinnerJqueryObj.removeClass("is-active");
                
            });

            this._editOverlayRectButton.onClick( async function () {
                let sceneBar = COL.model.getSceneBar();
                await sceneBar.editOverlayRectButton_onClick();
            });

            if(COL.doEnableWhiteboard)
            {
                this._editOverlayRect_editFloorPlanWhiteboard.onClick(async function () {
                    console.log('BEG _editOverlayRect_editFloorPlanWhiteboard'); 
                    let selectedLayer = COL.model.getSelectedLayer();
                    let scene3DtopDown = selectedLayer.getScene3DtopDown();
                });
            }

            this._editOverlayRect_deleteButton.onClick(async function () {
                let selectedLayer = COL.model.getSelectedLayer();
                let scene3DtopDown = selectedLayer.getScene3DtopDown();
                let intersectedOverlayRectInfo = scene3DtopDown.getIntersectionOverlayRectInfo();
                let selectedOverlayRectObj = COL.util.getNestedObject(intersectedOverlayRectInfo, ['currentIntersection', 'object']);

                if(selectedOverlayRectObj)
                {
                    // disable editOverlayRect_syncWithBackendBtn
                    let sceneBar = COL.model.getSceneBar();
                    sceneBar.disable_editOverlayRect_syncWithBackendBtn(true);

                    // disable buttons related to editOverlayRect, so that while syncing to the backend, the user cannot make updates, e.g.
                    //   add a new overlayRect, change location of overlayRect, delete image from overlayRect etc...
                    sceneBar.disableEditOverlayRectRelatedButtons(true);
                    
                    let selectedOverlayRect = selectedLayer.getSelectedOverlayRect();
                    let imageFilenameToRemove = selectedOverlayRect.getSelectedImageFilename();
                    await selectedLayer.deleteImageFromLayer(selectedOverlayRect, imageFilenameToRemove);

                    sceneBar.disableEditOverlayRectRelatedButtons(false);
                    sceneBar.disable_editOverlayRect_syncWithBackendBtn(false);
                }
            });

            this._openImageFileButton.onClick(async function (input) {
                console.log('BEG _openImageFileButton.onClick');

                // the onClick event is fired when clicking on the button

                // avner: comment1_partA (see also comment1_partB in window.addEventListener("focus")):
                //  we may not need to disable the button here, because merely by
                //  openning the file-input-modal-dialog-box may not do anything (e.g. if we don't select any image)
                //  and in any case, before adding the image (the call to COL.core.ImageFile.openImageFiles) the button is disabled
                //
                // // disable enable editOverlayRect_syncWithBackendBtn
                // // (this button is re-enabled when editing operation is finished, e.g.
                // //  in "window.addEventListener(focus)" when the file modal dialog-box is closed)
                // let sceneBar = COL.model.getSceneBar();
                // sceneBar.disable_editOverlayRect_syncWithBackendBtn(true);

                if( COL.util.isObjectValid(window.$agent))
                {
                    // window.$agent is defined, i.e. the client is the jasonette mobile app
                    // trigger a request to add an image from the camera or from the
                    // file system on the mobile device
                    window.$agent.trigger("media.pickerAndCamera");
                }

            });
            
            this._openImageFileButton.onChange(async function (input) {
                // console.log('BEG _openImageFileButton.onChange');

                let inputType = (typeof input);

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

            this._mergeOverlayRectsButton.onClick(async function () {
                // console.log('BEG _mergeOverlayRectsButton.onClick');

                // disable editOverlayRect_syncWithBackendBtn
                let sceneBar = COL.model.getSceneBar();
                sceneBar.disable_editOverlayRect_syncWithBackendBtn(true);

                let selectedLayer = COL.model.getSelectedLayer();
                await selectedLayer.mergeOverlayRects();

                // enable editOverlayRect_syncWithBackendBtn
                sceneBar.disable_editOverlayRect_syncWithBackendBtn(false);
                
            });
            
            this._splitOverlayRectButton.onClick(async function () {
                // console.log('BEG _splitOverlayRectButton.onClick');

                let sceneBar = COL.model.getSceneBar();
                try {

                    // disable editOverlayRect_syncWithBackendBtn
                    sceneBar.disable_editOverlayRect_syncWithBackendBtn(true);
                    
                    // disable the button (successive clicks, before the first click is processed
                    // cause, e.g. to miss split images? (172 images in total but after rapid splitting shows only 162 images??))
                    sceneBar._splitOverlayRectButton.disabled(true);
                    
                    let selectedLayer = COL.model.getSelectedLayer();
                    await selectedLayer.splitOverlayRect();
                    Scene3DtopDown.render1();
                }
                catch(err) {
                    let toastTitleStr = "Split overlayRect";
                    let msgStr = "Failed to split the overlayRect. " + err;
                    if(COL.doEnableToastr)
                    {
                        toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
                    }
                    else
                    {
                        console.error(msgStr);
                        // alert(msgStr);
                    }
                }

                // enable the button
                sceneBar._splitOverlayRectButton.disabled(false);

                // enable editOverlayRect_syncWithBackendBtn
                sceneBar.disable_editOverlayRect_syncWithBackendBtn(false);
            });

            this._editOverlayRect_syncWithBackendBtn.onClick(async function () {
                // console.log('BEG _editOverlayRect_syncWithBackendBtn'); 

                let sceneBar = COL.model.getSceneBar();
                // disable buttons related to editOverlayRect, so that while syncing to the backend, the user cannot make updates, e.g.
                // add a new overlayRect, change location of overlayRect, delete image from overlayRect etc...
                sceneBar.disableEditOverlayRectRelatedButtons(true);

                // persist changes in layer.json (e.g. adding new circle)
                let selectedLayer = COL.model.getSelectedLayer();
                let syncStatus = await selectedLayer.syncBlobsWithWebServer();
                if(syncStatus)
                {
                    try {
                        // after update from memory to webserver re-render the plan with the new changes
                        await COL.colJS.onSitesChanged();
                    }
                    catch(err) {
                        console.error('Error from _syncWithBackendBtn:', err);
                        throw new Error('Error from _syncWithBackendBtn');
                    }
                }

                // enable buttons related to editOverlayRect
                sceneBar.disableEditOverlayRectRelatedButtons(false);
            });

            this._addStickyNoteButton.onClick(function () {
                let selectedLayer = COL.model.getSelectedLayer();
                selectedLayer.addStickyNote();
            });

            this._reloadPageButton.onClick(function () {
                // console.log('BEG _reloadPageButton.onClick');

                // https://www.freecodecamp.org/news/location-reload-method-how-to-reload-a-page-in-javascript/
                // True reloads the page from the server (e.g. does not store the data cached by the browser):
                // 
                // https://stackoverflow.com/questions/2099201/javascript-hard-refresh-of-current-page
                // When this method receives a true value as argument, it will cause the page to always be reloaded from the server.
                // If it is false or not specified, the browser may reload the page from its cache.

                window.location.reload(true);
            });

            // disable the button _syncFromZipFileToWebServerButton
            this._syncFromZipFileToWebServerButton.disabled(true);

            // buttons related to editSpecificOverlayRect
            this.disableEditOverlayRectRelatedButtons(true);
            
            // disable editOverlayRect_syncWithBackendBtn
            this.disable_editOverlayRect_syncWithBackendBtn(true);

            // create the topDownSetting modal (e.g. to filter dates, and overlayRect dot size)
            this.initTopDownSettingModal();
            
        }

        this._playImagesInAllOverlayRectsButton.onClick(async function () {
            // console.log('BEG _playImagesInAllOverlayRectsButton.onClick');

            let sceneBar = COL.model.getSceneBar();
            let selectedLayer = COL.model.getSelectedLayer();
            try {
                // disable the button (successive clicks, before the first click is processed
                // cause, e.g. to miss split images? (172 images in total but after rapid splitting shows only 162 images??))
                let playImagesState = sceneBar._playImagesInAllOverlayRectsButton.isOn() ? Layer.PLAY_IMAGES_STATE.PLAY_IMAGES_IN_ALL_OVERLAY_RECTS : Layer.PLAY_IMAGES_STATE.NONE
                // console.log('playImagesState1', playImagesState); 
                
                selectedLayer.setPlayImagesState(playImagesState);
                await selectedLayer.playImagesInAllOverlayRects();
            }
            catch(err) {
                console.error('err:', err);
                
                let toastTitleStr = "Play images in all overlayRects";
                let msgStr = "Failed to play images in all overlayRects. " + err;
                if(COL.doEnableToastr)
                {
                    toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
                }
                else
                {
                    console.error(msgStr);
                    // alert(msgStr);
                }
            }

            // reset the play button 
            selectedLayer.setPlayImagesState(Layer.PLAY_IMAGES_STATE.NONE);
            // change the state of scenebar::_playImagesInAllOverlayRectsButton without
            // trigerring a call to _playImagesInAllOverlayRectsButton.onClick
            let event = undefined;
            sceneBar._playImagesInAllOverlayRectsButton.toggle(null, event);
            
            // update the buttons: previousImageButton, nextImageButton, play Buttons to their default state
            // (e.g. enable if selectedOverlayRect is defined and has more than 1 image)
            selectedLayer.updatePreviousPlayNextImageButtons();
        });
        
        let toolBar = this._toolBar.$.attr("id", "col-scenebarId");
        
        let toolbarGroupJqueryElement = $('#toolbarGroupId');
        $('#grid-container1').append(toolbarGroupJqueryElement);
        toolBar.appendTo('#toolbarGroupId');

        return;
    };

    
    sync_editOverlayRectButton_toStateOf_selectedLayerEditOverlayRectFlag = function () {
        // console.log('BEG sync_editOverlayRectButton_toStateOf_selectedLayerEditOverlayRectFlag');
        
        let selectedLayer = COL.model.getSelectedLayer();
        let selectedLayer_editOverlayRectFlag = selectedLayer.getEditOverlayRectFlag();
        if(this._editOverlayRectButton.isOn() !== selectedLayer_editOverlayRectFlag)
        {
            // change the state of scenebar::editOverlayRectButton without
            // trigerring a call to editOverlayRectButton_onClick
            let event = undefined;
            this._editOverlayRectButton.toggle(null, event);

            let scene3DtopDown = selectedLayer.getScene3DtopDown();
            scene3DtopDown.enableEditTopDownOverlayControl(selectedLayer_editOverlayRectFlag);

            if(selectedLayer_editOverlayRectFlag)
            {
                // disable/enable editOverlayRect related buttons (openImageFileButton, editOverlayRect_deleteButton)
                // depending on if the overlayRect is empty or not
                let selectedOverlayRect = selectedLayer.getSelectedOverlayRect();
                let doDisableEditOverlayRectRelatedButtons = true;
                if( COL.util.isObjectValid(selectedOverlayRect))
                {
                    doDisableEditOverlayRectRelatedButtons = false;
                }
                
                this.disableEditOverlayRectRelatedButtons(doDisableEditOverlayRectRelatedButtons)
            }
            else
            {
                // disable editOverlayRect related buttons (openImageFileButton, editOverlayRect_deleteButton)
                this.disableEditOverlayRectRelatedButtons(true);
            }
        }
    };

    onChange_openImageFileButton = async function (filesToOpenArray) {
        console.log('BEG onChange_openImageFileButton111');

        // the onChange event is fired when selecting images
        // (if not selecting any images, and just canceling, the event s not fired..)

        // disable editOverlayRect_syncWithBackendBtn
        let sceneBar = COL.model.getSceneBar();
        sceneBar.disable_editOverlayRect_syncWithBackendBtn(true);
        
        try {
            
            await COL.core.ImageFile.openImageFiles(filesToOpenArray);
        }
        catch(err) {
            console.error('Error from ImageFile.openImageFiles:', err);

            let toastTitleStr = "Open image file";
            let msgStr = "Failed to open the image. " + err;
            if(COL.doEnableToastr)
            {
                toastr.error(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
            }
            else
            {
                console.error(msgStr);
                // alert(msgStr);
            }
        }

        // enable editOverlayRect_syncWithBackendBtn
        sceneBar.disable_editOverlayRect_syncWithBackendBtn(false);
    };
    
    editOverlayRectButton_onClick = async function () {
        console.log('BEG editOverlayRectButton_onClick');
        
        if(COL.doWorkOnline)
        {
            let selectedLayer = COL.model.getSelectedLayer();
            let isEditOverlayRectEnabled = this._editOverlayRectButton.isOn();

            selectedLayer.setEditOverlayRectFlag(isEditOverlayRectEnabled);
            let scene3DtopDown = selectedLayer.getScene3DtopDown();
            
            // reset, in case that scene3DtopDown is stuck waiting for the following events
            // tbd - move to e.g. scene3DtopDown.enableControls
            // scene3DtopDown.enableControls(!isEditOverlayRectEnabled);
            // scene3DtopDown.enableEditTopDownOverlayControl(isEditOverlayRectEnabled);
            scene3DtopDown.onMouseUpOrTouchUpStillProcessing = false;
            scene3DtopDown.onMouseDownOrTouchStartStillProcessing = false;
            let editOverlayRectControls = scene3DtopDown._editOverlayRect_Scene3DtopDown_TrackballControls;
            editOverlayRectControls.onMouseDownOrTouchStartEditOverlayStillProcessing = false;
            editOverlayRectControls.onMouseUpOrTouchUpEditOverlayStillProcessing = false;

            scene3DtopDown.enableControls(!isEditOverlayRectEnabled);
            
            scene3DtopDown.enableEditTopDownOverlayControl(isEditOverlayRectEnabled);

            if(isEditOverlayRectEnabled)
            {
                // Enable editOverlayRect related buttons only if selectedOverlayRect is not empty
                // (i.e. there is a selected, highlighted circle)
                let selectedOverlayRect = selectedLayer.getSelectedOverlayRect();
                let doDisableEditOverlayRectRelatedButtons = true;
                if( COL.util.isObjectValid(selectedOverlayRect) )
                {
                    doDisableEditOverlayRectRelatedButtons = false;
                }
                this.disableEditOverlayRectRelatedButtons(doDisableEditOverlayRectRelatedButtons);

                // enable editOverlayRect_syncWithBackendBtn
                this.disable_editOverlayRect_syncWithBackendBtn(false);
            }
            else
            {
                ///////////////////////////////////////////
                // edit mode is disabled
                ///////////////////////////////////////////
                
                // disable editOverlayRect related buttons
                this.disableEditOverlayRectRelatedButtons(true);

                // disable editOverlayRect_syncWithBackendBtn
                this.disable_editOverlayRect_syncWithBackendBtn(true);
            }
        }
    };

    getEditOverlayRectButton = function () {
        return this._editOverlayRectButton;
    }
    
    findOptionIndexBySubstrInVal = function (matchPattern) {
        // console.log('BEG findOptionIndexBySubstrInVal'); 
        let matchPatternRE = new RegExp(matchPattern);

        // let numPlans = $("#sitesId option").length;
        // console.log('numPlans', numPlans);
        
        // let sitePlans = $("#sitesId option");
        // console.log('sitePlans', sitePlans);
        
        let optionsMatched = $("#sitesId option").filter(function() {
            return $(this).val().match(matchPatternRE)
        });

        let optionIndex = undefined;
        if(optionsMatched.length >= 1)
        {
            optionIndex = optionsMatched[0].index;
        }
        return optionIndex;
    };
    
    disableEditOverlayRectRelatedButtons = function (doDisable) {
        console.log('BEG disableEditOverlayRectRelatedButtons');
        
        if(COL.doWorkOnline)
        {
            if(COL.doEnableWhiteboard)
            {
                this._editOverlayRect_editFloorPlanWhiteboard.disabled(doDisable);
            }
            this._editOverlayRect_deleteButton.disabled(doDisable);
            this._openImageFileButton.disabled(doDisable);
            this._reconcileFrontEndButton.disabled(doDisable);
            this._mergeOverlayRectsButton.disabled(doDisable);

            if(!doDisable)
            {
                // if the buttons are to be enabled, enable _splitOverlayRectButton 
                // only if the selectedOverlayRect is valid and has more than 1 image
                let selectedLayer = COL.model.getSelectedLayer();
                let selectedOverlayRect = selectedLayer.getSelectedOverlayRect();
                if(COL.util.isObjectValid(selectedOverlayRect))
                {
                    if (selectedOverlayRect.getNumImagesInOverlayRect() > 1)
                    {
                        // enable _splitOverlayRectButton
                        this._splitOverlayRectButton.disabled(false);
                    }
                    else
                    {
                        // disable _splitOverlayRectButton
                        this._splitOverlayRectButton.disabled(true);
                    }
                }
            }
            else
            {
                this._splitOverlayRectButton.disabled(doDisable);
            }
        }
    };

    // tbd - also disable/enable according to isDirty (i.e. if no change set to disabled)
    disable_editOverlayRect_syncWithBackendBtn = function (doDisable) {
        // console.log('BEG disable_editOverlayRect_syncWithBackendBtn');
        
        this._editOverlayRect_syncWithBackendBtn.disabled(doDisable);
    };

    disableNextAndPreviousImageButtons = function (doDisable) {
        // console.log('BEG disableNextAndPreviousImageButtons'); 
        let previousImageButton = COL.colJS.previousImageButton;
        previousImageButton.disabled(doDisable);

        let nextImageButton = COL.colJS.nextImageButton;
        nextImageButton.disabled(doDisable);
    };

    // * Utility function to make a component automatically disabled if the scene doesn't contains layers
    // * or automatically enabled if the scene contains at least one layer
    // * @param {COL.component.Component} component The component to disable/enable
    
    disabledOnSceneEmpty = function (component) {
        $(window).ready(function () {
            component.disabled(true);
        });

        $(document).on("SceneLayerAdded SceneLayerRemoved", function (ev, layer, layersNum) {
            if (layersNum > 0) {
                component.disabled(false);
            } else {
                component.disabled(true);
            }
        });
    };

    static SliderVal_to_overlayRectScale = function (sliderVal) {
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
    };

    static OverlayRectScale_to_sliderVal = function (overlayRectScale) {
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
    };
    
}

$(window).load(function () {
    // console.log('BEG Scenebar::window.load');
});

$(window).ready(function () {
    // console.log('BEG Scenebar::window.ready');
    
    // https://stackoverflow.com/questions/4628544/how-to-detect-when-cancel-is-clicked-on-file-input
    // focus event is one option to detect when the File Imput modal Dialog-box is closed
    // (e.g. by clicking on the 'Cancel' button in the dialog, or by clicking 'Escape')
    window.addEventListener("focus", function (e) {
        // console.log('BEG window focus');

        // avner: comment1_partB (see also comment1_partA in _openImageFileButton.onClick)
        // // enable editOverlayRect_syncWithBackendBtn
        // let sceneBar = COL.model.getSceneBar();
        // sceneBar.disable_editOverlayRect_syncWithBackendBtn(false);
    });
});



function savePhotoFromImageUrl(imageUrl) {
    console.log('BEG savePhotoFromImageUrl');

    // when operating from mobile app jasonette, this function is called from jasonette
    // after getting a photo from the camera or from the file system
    // to add the photo to the list of overlayRect files
    
    let sceneBar = COL.model.getSceneBar();
    console.log('sceneBar', sceneBar); 

    // https://stackoverflow.com/questions/35940290/how-to-convert-base64-string-to-javascript-file-object-like-as-from-file-input-f
    fetch(imageUrl)
        .then(res => res.blob())
        .then(blob => {
            // https://gist.github.com/hurjas/2660489
            let filename = COL.core.ImageFile.createFileNameWithTimestamp();
            console.log('filename', filename);
            
            const file = new File([blob], filename,{ type: "image/png" })
            // const file = new File([blob], filename,{ type: "image" })
            
            let filesToOpenArray = [];
            filesToOpenArray.push(file);
            console.log('filesToOpenArray', filesToOpenArray);
            console.log('filesToOpenArray.length', filesToOpenArray.length);
            
            sceneBar.onChange_openImageFileButton(filesToOpenArray);
        })

    
    console.log('imageUrl', imageUrl); 
};

// Expose savePhoto to Jasonette
window.savePhoto = savePhotoFromImageUrl;


export { SceneBar };
