////////////////////////////////////////////////////////////////
//
// The Model file is 
//
////////////////////////////////////////////////////////////////

import {WebGLRenderer as THREE_WebGLRenderer
       } from '../../static/three.js/three.js-r120/build/three.module.js';

import { COL } from  "../COL.js";
import { SiteInfo } from "../util/SiteInfo.js";
import { PlanInfo } from "../util/PlanInfo.js";
import { Scene3DtopDown } from "./Scene3DtopDown.js";
// import { Whiteboard } from "./Whiteboard.js";
import "../util/Util.js";
import "../util/Util.AssociativeArray.js";
import "./Core.js";
import { Layer } from "./Layer.js";
import { SceneBar } from "../gui/SceneBar.js";
import { BrowserDetect } from "../util/browser_detect.js";


/**
 * @file Defines the Model class
 */

/**         
 * @class Creates a new Model 
 * @param {String} name The name of the mesh file
 * @memberOf COL.core
 */

class Model {

    constructor(){
        this.modelVersion = undefined;
        this.minZipVersion = undefined;
        this.fileZip = undefined;

        if(COL.doWorkOnline)
        {
            this._urlBase = window.location.origin + '/';
        }
        else
        {
            this._urlBase = './';
        }
        this._sitesInfo = new COL.util.AssociativeArray();
        this._layers = new COL.util.AssociativeArray();
        this._selectedLayer = null;
        this._zipFileObj = null;
        this.sceneBar = undefined;
        this.isUserLoggedIn = false;
        this._renderer3DtopDown2 = undefined;
        this._rendererTexturePane = undefined;

        // container for the db operations that are executed in single request
        this.image_db_operations_array = [];

        this.csrf_token = COL.util.getCSRFToken();
    }

    initModel = async function (doSetupTopDownAndTextureGui) {
        console.log('BEG initModel');
        console.log('doSetupTopDownAndTextureGui', doSetupTopDownAndTextureGui);

        let getCurrentUserResultAsJson = {dummy_val: 'True'};
        if(COL.doWorkOnline)
        {
            let systemParamsAsJson = await this.getSystemParams();
            this.setSystemParams(systemParamsAsJson);

            ////////////////////////////////////////////////////////////////////////////////
            // check if the user is logged-on
            ////////////////////////////////////////////////////////////////////////////////

            // http://localhost/api/v1_2/get_current_user
            getCurrentUserResultAsJson = await this.get_current_user();
            if(getCurrentUserResultAsJson['user_email'])
            {
                COL.model.setLoggedInFlag(true);
            }
        }

        this._browserDetect = undefined;
        this.detectUserAgent();
        
        if(doSetupTopDownAndTextureGui)
        {
            this.sceneBar = new SceneBar(COL.component);

            let user_role = getCurrentUserResultAsJson['user_role'];
            console.log('user_role', user_role); 

            await this.sceneBar.initSceneBar(user_role, COL.component);

            ////////////////////////////////////////////////////////////////////////////////
            // Set renderers:
            // - this._renderer3DtopDown2
            // - this._rendererTexturePane
            ////////////////////////////////////////////////////////////////////////////////

            // https://stackoverflow.com/questions/21548247/clean-up-threejs-webgl-contexts
            // set the _renderer3DtopDown2 as a member of Model, so that it does
            // not get disposed when disposing Layer::scene3DtopDown.
            this._renderer3DtopDown2 = new THREE_WebGLRenderer();
            // Set the background color, and the opacity of the canvas
            // https://threejs.org/docs/#api/en/renderers/WebGLRenderer.setClearColor
            this._renderer3DtopDown2.setClearColor (0xffffff, 0.9);

            let topDownPaneEl = document.getElementById("topDownPaneId");

            // Add id and class to _renderer3DtopDown.domElement (the topDown canvas)
            let canvasTopDownEl = this._renderer3DtopDown2.domElement;
            canvasTopDownEl.id = 'canvasTopDownId';
            canvasTopDownEl.classList.add("canvasTopDownClass");
            
            topDownPaneEl.appendChild(this._renderer3DtopDown2.domElement);

            // texRenderer -> _rendererTexturePane
            this._rendererTexturePane = new THREE_WebGLRenderer({
                preserveDrawingBuffer: true,
                alpha: true});

            this._rendererTexturePane.domElement.id = 'canvasTex';
            this._rendererTexturePane.setPixelRatio(window.devicePixelRatio);
            this._rendererTexturePane.setClearColor(0XDBDBDB, 1); //Webgl canvas background color

            let rendererTexturePaneJqueryObject = $('#' + this._rendererTexturePane.domElement.id);
            rendererTexturePaneJqueryObject.addClass("showFullSize");

            let texCanvasWrapper = $('#texCanvasWrapperId');
            texCanvasWrapper.append(this._rendererTexturePane.domElement);


            if(COL.doEnableWhiteboard)
            {
                ////////////////////////////////////////////////////////////////////////////////
                // Set floorPlanWhiteboard
                ////////////////////////////////////////////////////////////////////////////////

                // let floorPlanWhiteboard = document.getElementById("floorPlanWhiteboardId");
                // topDownPaneEl.appendChild(floorPlanWhiteboard);
            }
            
            ////////////////////////////////////////////////////////////////////////////////
            // Report _renderer3DtopDown2 webGL capabilities
            ////////////////////////////////////////////////////////////////////////////////

            let isWebGL2 = this._renderer3DtopDown2.capabilities.isWebGL2;
            // console.log('isWebGL2', isWebGL2);
            
            // console.log('this._renderer3DtopDown2.capabilities', this._renderer3DtopDown2.capabilities);
            // console.log('this._renderer3DtopDown2.capabilities.maxTextureSize', this._renderer3DtopDown2.capabilities.maxTextureSize);

            await this.sceneBar.renderSelectedPlan(getCurrentUserResultAsJson);
        }

        this.detectWebGL(doSetupTopDownAndTextureGui);

    };

    detectUserAgent = function () {
        // console.log('BEG detectUserAgent');
        
        this._browserDetect = new BrowserDetect();
        this._browserDetect.init();

        // e.g. For Pixel3:
        // navigator.userAgent Mozilla/5.0 (Linux; Android 11; Pixel 3 XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.185 Mobile Safari/537.36
        // console.log('navigator.userAgent', navigator.userAgent); 
        console.log('this._browserDetect.OS', this._browserDetect.OS);
        console.log('this._browserDetect.browser', this._browserDetect.browser);
        console.log('this._browserDetect.version', this._browserDetect.version);

        // raise a toast to show the browser type
        let toastTitleStr = "BrowserDetect";
        let msgStr = navigator.userAgent + ', OS: ' +
            this._browserDetect.OS + ", Browser: " +
            this._browserDetect.browser + ", Version: " +
            this._browserDetect.version;
        // toastr.success(msgStr, toastTitleStr, COL.errorHandlingUtil.toastrSettings);
        console.log('msgStr', msgStr); 
    };

    getBrowserDetect = function () {
        return this._browserDetect;
    };

    detectWebGL = function (doSetupTopDownAndTextureGui) {
        // console.log('BEG detectWebGL');
        
        // https://stackoverflow.com/questions/23769780/how-to-get-opengl-version-using-javascript
        const gl = document.createElement("canvas").getContext("webgl");
        if(gl)
        {
            // console.log(gl.getParameter(gl.VERSION));
            // console.log(gl.getParameter(gl.SHADING_LANGUAGE_VERSION));
            // console.log(gl.getParameter(gl.VENDOR));
        }
        else
        {
            // console.log('webgl is not supported'); 
        }

        const gl2 = document.createElement("canvas").getContext("webgl2");
        if(gl2)
        {
            // console.log(gl2.getParameter(gl2.VERSION));
            // console.log(gl2.getParameter(gl2.SHADING_LANGUAGE_VERSION));
            // console.log(gl2.getParameter(gl2.VENDOR));
        }
        else
        {
            // console.log('webgl2 is not supported'); 
        }

    };

    getRenderer3DtopDown = function () {
        return this._renderer3DtopDown2;
    };

    getRendererTexturePane = function () {
        return this._rendererTexturePane;
    };
    
    getSceneBar = function () {
        return this.sceneBar;
    };

    getUrlImagePathBase = function () {
        return 'avner/img';
    };

    getUrlBase = function () {
        console.log('BEG getUrlBase');
        console.log('this._urlBase', this._urlBase);
        
        return this._urlBase;
    };
    
    static GetUrlBase = function () {
        console.log('BEG GetUrlBase');

        let urlBase = window.location.origin + '/';
        // console.log('urlBase', urlBase); 
        return urlBase;
    };

    get_current_user = async function () {
        // console.log('BEG get_current_user'); 

        // console.log('COL.model', COL.model); 
        let queryUrl = Model.GetUrlBase() + 'api/v1_2/get_current_user';
        let dataAsJson = await fetch(queryUrl).then(response => response.json());
        return dataAsJson;
    };

    getZipFileObj = function () {
        return this._zipFileObj;
    };

    setZipFileObj = function (zipFileObj) {
        this._zipFileObj = zipFileObj;
    };

    getModelVersion = function () {
        return this.modelVersion;
    };

    setModelVersion = function (modelVersion) {
        this.modelVersion = modelVersion;
    };

    getMinZipVersion = function () {
        return this.minZipVersion;
    };

    setMinZipVersion = function (minZipVersion) {
        this.minZipVersion = minZipVersion;
    };
    
    createLayer = function (planInfo) {
        // console.log('BEG createLayer');

        let layerName = Layer.CreateLayerName(planInfo);
        let layer = this._layers.getByKey(layerName);
        if(COL.util.isObjectValid(layer))
        {
            // tbd - currently - removing the existing layer - still leaves the existing layer in the sitePlan menu
            //       Remove from the site plan as well? or only after syncing to the webserver ??
            //       Add a warning that syncing to the webserver will wipe previous data of the layer ??
            //
            // console.log('remove the existing layer before creating the new layer'); 
            // remove the existing layer before creating the new layer
            this.removeLayerByName(layerName);
            // throw('Layer already exists');
        }

        // console.log('this._layers.size()', this._layers.size()); 
        layer = new Layer(layerName, planInfo);
        layer.initLayer();
        return layer;
    };

    getLayerByName = function (name) {
        // this.printLayersInfo2();
        return this._layers.getByKey(name);
    };

    getLayerByPlanInfo = function (planInfo) {

        if(COL.util.isObjectInvalid(planInfo))
        {
            // at this point planInfo must be defined
            throw new Error('planInfo is invalid');
        }
        
        let layer = undefined;
        let iter = this._layers.iterator();
        while (iter.hasNext()) {
            let keyVal = iter.nextKeyVal();
            let layerKey = keyVal[0];
            let layerVal = keyVal[1];

            // console.log('layerKey', layerKey); 
            // console.log('layerVal', layerVal);

            let layerPlanInfo = layerVal.getPlanInfo();
            if(layerPlanInfo && (layerPlanInfo.siteId == planInfo.siteId) && (layerPlanInfo.id == planInfo.id))
            {
                layer = layerVal;
                break;
            }
        }
        
        return layer;
    };
    
    printLayersInfo2 = function () {

        console.log('_layers.size()', this._layers.size());
        
        let iter = this._layers.iterator();
        while (iter.hasNext()) {
            let keyVal = iter.nextKeyVal();
            let layerName = keyVal[0];
            let layerObj = keyVal[1];

            console.log('layerName', layerName); 
            console.log('layerObj', layerObj);
            // let imagesInfo = layer.getImagesInfo();
            // imagesInfo.printKeysAndValues();
        }
    };
    
    addLayer = function (layer) {
	// console.log('BEG addLayer'); 
        // TBD - why add Layer is called multiple times
        
        if (!(layer instanceof Layer)) {
            console.error("The parameter must be an instance of Layer");
            return;
        }

        //Add/update layer to _layers            
        this._layers.set(layer.name, layer);
    };

    selectLayerByName = function (layerName) {
        let layer = this._layers.getByKey(layerName);
        this.setSelectedLayer(layer);
    };

    removeLayerByName = function (name) {
        // console.log('BEG removeLayerByName');

	// console.log('this._layers', this._layers);
        // this._layers.printKeysAndValues();
        
        let layer = this.getLayerByName(name);

        // https://www.tutorialrepublic.com/faq/how-to-determine-if-variable-is-undefined-or-null-in7-javascript.php
        // check for both undefined, null with the "equality operator" "==" (as opposed to the "strict equality operator" "===" )
        if(COL.util.isObjectValid(layer)) {
            layer = this._layers.remove(layer.name);
            if (layer) {

                console.log('layer', layer); 
                
                layer.dispose();
                layer = null;
                // delete layer;
            }
            if (COL.util.isObjectValid(this._selectedLayer) && (this._selectedLayer.name == name)) {
                // The removed layer was the selected layer. Clear the selected layer
                this._selectedLayer = undefined;
            }
        }
    };

    setSelectedLayer = async function (layer) {
        // console.log('BEG setSelectedLayer'); 

        ////////////////////////////////////////////////////////////////////////////////
        // Setup the new selectedLayer
        ////////////////////////////////////////////////////////////////////////////////

        if(COL.util.isObjectInvalid(layer))
        {
            // sanity check
            throw new Error('layer is invalid');
        }
        this._selectedLayer = layer;

        await this._selectedLayer.updateLayerImageRelatedRenderring();
        if(COL.doWorkOnline)
        {
            ////////////////////////////////////////////////////////////////////////////////
            // Sync the buttons in the scenebar to the state of the layer.
            // For example, if the new selectedLayer is in edit mode
            // make the editOverlayRect button in the scenbar reflect that.
            // (the scenbar maybe out of sync if the previous select layer was not in editing mode)
            ////////////////////////////////////////////////////////////////////////////////

            let sceneBar = this.getSceneBar();
            sceneBar.sync_editOverlayRectButton_toStateOf_selectedLayerEditOverlayRectFlag();
        }

        ////////////////////////////////////////////////////////////////////////////////
        // Adjust the camera, canvas, renderer, and viewport1 to the selected topDown pane
        ////////////////////////////////////////////////////////////////////////////////

        let scene3DtopDown = this._selectedLayer.getScene3DtopDown();
        // Set doRescale so that the camera position is restored from the layer.json file
        let doRescale = false;
        scene3DtopDown.set_camera_canvas_renderer_and_viewport1(doRescale);
        $(document).trigger("SceneLayerSelected", [this._selectedLayer]);
        
    };

    getSelectedLayer = function () {
        return this._selectedLayer;
    };
    
    getLayers = function () {
        return this._layers;
    };

    getSitesInfo = function () {
        // console.log('BEG getSitesInfo'); 
        return this._sitesInfo;
    };

    setSitesInfo = function (sitesInfo) {
        // console.log('BEG setSitesInfo'); 
        this._sitesInfo = sitesInfo;
    };

    getSiteByName = async function (siteName) {
        
        // ////////////////////////////////////////////////
        // Query - get_site_by_name
        // ////////////////////////////////////////////////

        // http://localhost/api/v1_2/get_site_by_name/modelWith4Images
        console.log('Query - get_site_by_name'); 
        
        let queryUrl = this.getUrlBase() + 'api/v1_2/get_site_by_name/' + siteName;
        console.log('queryUrl', queryUrl);

        let response = await fetch(queryUrl);
        await COL.errorHandlingUtil.handleErrors(response);

        let dataAsJson = await response.json();
        return dataAsJson;
    };
    
    getPlanInfoBySiteIdAndPlanId = function (siteId, planId) {
        // console.log('BEG getPlanInfoBySiteIdAndPlanId'); 

        let planInfo = undefined;
        let foundPlanInfo = false;

        let iter = this._sitesInfo.iterator();
        while (iter.hasNext()) {
            let siteInfo = iter.next();

            let iterPlans = siteInfo.getPlans().iterator();
            while (iterPlans.hasNext()) {
                let planInfo2 = iterPlans.next();
                if((planInfo2.siteId == siteId) && (planInfo2.id == planId))
                {
                    foundPlanInfo = true;
                    planInfo = planInfo2;
                    break;
                }
            }

            if(foundPlanInfo)
            {
                break;
            }
        }

        return planInfo;
    };
    
    getPlanInfoBySelectId_sitesLoadedFromZipFile = function (selectIdStr) {
        console.log('BEG getPlanInfoBySelectId_sitesLoadedFromZipFile'); 

        // Populate planInfo2;
        let planInfo2 = {};
        let foundPlanInfo = false;

        let iter = this._sitesInfo.iterator();
        while (iter.hasNext()) {
            let siteInfo = iter.next();

            // let siteInfoStr = siteInfo.toString();
            // console.log('siteInfoStr', siteInfoStr);
            
            let iterPlans = siteInfo.getPlans().iterator();
            while (iterPlans.hasNext()) {
                planInfo2 = iterPlans.next();
                let planInfo2_val = planInfo2.siteId + ":" + planInfo2.id + ":" + planInfo2.siteName + ":" + planInfo2.name;
                
                if(COL.util.isStringInvalid(selectIdStr))
                {
                    // selectIdStr is invalid. Get the first planInfo
                    foundPlanInfo = true;
                    break;
                }
                else
                {
                    // selectIdStr is defined. Get planInfo that matches selectIdStr
                    if(planInfo2_val === selectIdStr)
                    {
                        foundPlanInfo = true;
                        break;
                    }
                }
            }

            if(foundPlanInfo)
            {
                break;
            }
        }

        let planInfo = "";
        if(foundPlanInfo)
        {
            let siteId;
            if(planInfo2.newSiteId)
            {
                siteId = planInfo2.newSiteId;
            }
            else
            {
                siteId = planInfo2.siteId;
            }
            
            let planId;
            if(planInfo2.newPlanId)
            {
                planId = planInfo2.newPlanId;
            }
            else
            {
                planId = planInfo2.id;
            }

            planInfo = new PlanInfo({id: planId,
                                     name: planInfo2.name,
                                     url: planInfo2.url,
                                     planFilename: planInfo2.planFilename,
                                     siteId: siteId,
                                     siteName: planInfo2.siteName,
                                     files: planInfo2.files});
        }
        else
        {
            planInfo = undefined;
        }

        return planInfo;
    };
    
    /**
     * Removes the object from memory
     */
    dispose = function () {
        console.log('BEG Model::dispose()');
        throw('Not implemented yet');

        // https://github.com/mrdoob/three.js/blob/master/examples/webgl_test_memory2.html
        // renderer -> _renderer3DtopDown
        // this._renderer3DtopDown.forceContextLoss();
        // this._renderer3DtopDown.context = null;
        // this._renderer3DtopDown.domElement = null;
        // this._renderer3DtopDown = null;
        // this._renderer3DtopDown.dispose();
        
        this.name = null;
    };

    isStickyNotesEnabled = function () {
        return false;
        // return true;
    }

    getLoggedInFlag = function () {
        return this.isUserLoggedIn;
    }

    setLoggedInFlag = function (isUserLoggedIn) {
        this.isUserLoggedIn = isUserLoggedIn;
    }

    getSystemParams = async function () {
        // console.log('BEG getSystemParams');
        
        let queryUrl = this.getUrlBase() + 'api/v1_2/get_system_params';
        // https://localhost/api/v1_2/get_system_params
        // console.log('queryUrl', queryUrl); 
        let response = await fetch(queryUrl);
        await COL.errorHandlingUtil.handleErrors(response);
        let systemParamsAsJson = await response.json();
        // console.log('systemParamsAsJson', systemParamsAsJson); 
        return systemParamsAsJson;
    };

    setSystemParams = function (systemParamsAsJson) {
        // console.log('systemParamsAsJson', systemParamsAsJson);

        this.setModelVersion( parseFloat(systemParamsAsJson['modelVersion']) )
        this.setMinZipVersion( parseFloat(systemParamsAsJson['minZipVersion']) );
    }
    
    
    createSiteInfoFromJson = function (siteInfo_asJson, modelVersionInZipFile) {
        console.log('BEG createSiteInfoFromJson');

        // console.log('siteInfo_asJson', siteInfo_asJson); 

        // console.log('modelVersionInZipFile', modelVersionInZipFile); 

        let siteInfo;
        switch(modelVersionInZipFile) {
            case 1.1: {
                siteInfo = new SiteInfo({siteId: siteInfo_asJson.id,
                                         siteName: siteInfo_asJson.name,
                                         plans: new COL.util.AssociativeArray()});
                
                for (let planName in siteInfo_asJson.plans) {
                    let planInfo2 = siteInfo_asJson.plans[planName];
                    let planInfo = new PlanInfo({id: planInfo2.id,
                                                 name: planInfo2.name,
                                                 url: planInfo2.url,
                                                 planFilename: planInfo2.plan_filename,
                                                 siteId: planInfo2.site_id,
                                                 siteName: planInfo2.site_name,
                                                 files: planInfo2.files});
                    siteInfo.addPlan(planName, planInfo);
                }
                
                break;
            }
            default: {
                console.error('modelVersionInZipFile: ' + modelVersionInZipFile + ', is not supported');
                break;
            }
        }

        // console.log('siteInfo_asJson.id', siteInfo_asJson.id);
        // let siteInfoStr = siteInfo.toString();
        // console.log('siteInfoStr', siteInfoStr); 
        
        return siteInfo;
    };
    
};

export { Model };

