"use strict";

import { COL } from  "./COL.js";
import { ColJS } from "./ColJS.js";
import { Model } from "./core/Model.js";
import { FileZipUtils } from "./loaders/FileZipUtils.js";


let doUseServiceWorker = true;
doUseServiceWorker = false;
if(doUseServiceWorker)
{
    // Check that service workers are supported
    if ('serviceWorker' in navigator) {
        // Use the window load event to keep the page load performant
        window.addEventListener('load', () => {
            ///////////////////////////////
            // register a service worker
            ///////////////////////////////

            // 3 dirs up (("../../../sw.js")) because this script (main.js) is in /usr/src/app/web/V1/js/col
            //   and sw.js is in /usr/src/app/web/sw.js
            // flask@3fa393e88ee2:/usr/src/app/web$ ls -l /usr/src/app/web/V1/js/col/../../../sw.js
            // -rw-rw-r-- 1 flask flaskgroup 2416 Jun 24 02:18 /usr/src/app/web/V1/js/col/../../../sw.js

            navigator.serviceWorker.register("../../../sw.js")
                .then(regisration => console.log('SW Registered'))
                .catch(console.error);
        });
    }
}

function overrideEventListenerPrototypes() {
    // console.log('BEG overrideEventListenerPrototypes'); 
    
    EventTarget.prototype._addEventListener = EventTarget.prototype.addEventListener;

    EventTarget.prototype.addEventListener = function(a, b, c) {
        if (c==undefined) c=false;
        this._addEventListener(a,b,c);
        if (! this.eventListenerList) this.eventListenerList = {};
        if (! this.eventListenerList[a]) this.eventListenerList[a] = [];
        this.eventListenerList[a].push({listener:b,options:c});
    };

    EventTarget.prototype._getEventListeners = function(a) {
        if (! this.eventListenerList) this.eventListenerList = {};
        if (a==undefined)  { return this.eventListenerList; }
        return this.eventListenerList[a];
    };

    EventTarget.prototype._removeEventListener = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.removeEventListener = function(a, b ,c) {
        if (c==undefined) c=false;
        this._removeEventListener(a,b,c);
        if (! this.eventListenerList) this.eventListenerList = {};
        if (! this.eventListenerList[a]) this.eventListenerList[a] = [];

        for(let i=0; i < this.eventListenerList[a].length; i++){
            if(this.eventListenerList[a][i].listener==b, this.eventListenerList[a][i].options==c){
                this.eventListenerList[a].splice(i, 1);
                break;
            }
        }
        if(this.eventListenerList[a].length==0) delete this.eventListenerList[a];
    };
};

async function main() {
    // console.log('BEG main');

    // override e.g. addEventListener so we can list all event-listeners
    // https://www.sqlpac.com/en/documents/javascript-listing-active-event-listeners.html
    overrideEventListenerPrototypes();
    
    // separate construction and intialization of COL.colJS based on:
    // https://stackoverflow.com/questions/43431550/async-await-class-constructor
    COL.colJS = new ColJS(COL.component);

    await COL.colJS.initColJS(COL.component);
    // console.log('COL.model2', COL.model); 

    // COL.util.listAllEventListeners();
    
    // console.log('COL.colJS1', COL.colJS);
    // console.log('COL111', COL);

    // console.log('END main');   
};

main();

// console.log('After instantiation of ColJS');
// console.log('COL222', COL); 

export { COL, FileZipUtils };
