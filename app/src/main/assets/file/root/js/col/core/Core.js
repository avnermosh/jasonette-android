import { DirectionalLight as THREE_DirectionalLight, AmbientLight as THREE_AmbientLight
       } from '../../include/three.js/three.js-r120/build/three.module.js';

import { COL } from  "../COL.js";

var Module = {
    memoryInitializerPrefixURL: "js/generated/",
    preRun: [],
    postRun: [],
};

COL.core = {
    defaults: {},
    setDefaults: function(name, parameters) {        
        if(COL.util.isObjectValid(COL.core.defaults[name])) {
            console.warn("The default properties of "+name+" was overridden.");
        }    
        COL.core.defaults[name] = parameters;        
    },
    getDefaults: function(name) {        
        return COL.core.defaults[name];
    }
};


COL.core.AmbientLight = function (scene, camera, renderer) {

    var _on = true;
    var _light = new THREE_AmbientLight("#808080");
    
    this.isOn = function () {
        return _on;
    };
    
    this.setOn = function (on) {
        if (on === true) {
            scene.add(_light);
            _on = true;
        } else {
            scene.remove(_light);
            _on = false;
        }

        renderer.render(scene, camera);
    };

    //Init
    this.setOn(_on);
};


COL.core.Headlight = function (scene, camera, renderer) {
    var _on = true;
    var _light = new THREE_DirectionalLight("#ffffff",0.5);
    _light.position.set( 0, -1, 0 );

    this.setOn = function (on) {
        if (on) {
            camera.add(_light);
        } else {
            camera.remove(_light);
        }
        renderer.render(scene, camera);
    };

    //Init
    this.setOn(_on);
};
