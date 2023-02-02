// =========================================================
// Copyright 2018-2022 Construction Overlay Inc.
// =========================================================

import packageInfo from '../../package.json' assert { type: "json" };

'use strict';

const COL = {
    doEnable_MemberOffset_inOrbitControlsImageViewPane: false,
    // doEnable_MemberOffset_inOrbitControlsImageViewPane: true,
    doUseRing: false,
    model: null,
    y0: 1.1,
    doWorkOnline: true,
    doEnableWhiteboard: false,
    doUseWebGL2: true,
    paneDivs: undefined,
    buttonDivs: undefined,
    clickedElements: [],
    isOldGUIEnabled: false,
    // tbd - softwareVersion should be read from package.json
    softwareVersion: '1.1.0'

};

COL.util = {};

COL.loaders = {};

COL.Error = function(errorCode, message) {
    this.code = errorCode;
    this.message = message;
};

(function($) {
    if (typeof $ === 'undefined') {
        console.error('jQuery library needed.');
    }

    this.getSoftwareVersion = function () {
        return COL.softwareVersion;
    }

    this.setSoftwareVersion = function (softwareVersion) {
        COL.softwareVersion = softwareVersion;
    }

    this.setError = function(error) {
        this.error = error;
    };

    this.getLastError = function() {
        return this.error;
    };

    /**
     * @function
     * @param {class} base The superclass
     * @param {class} sub The subclass
     * @memberOf COL
     * @description Utility function used to inherit from a superclass
     */
    this.extend = function(base, sub) {
    // Avoid instantiating the base class just to setup inheritance
    // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create
    // for a polyfill
    // Also, do a recursive merge of two prototypes, so we don't overwrite
    // the existing prototype, but still maintain the inheritance chain
    // Thanks to @ccnokes
        const origProto = sub.prototype;
        sub.prototype = Object.create(base.prototype);
        for (const key in origProto) {
            sub.prototype[key] = origProto[key];
        }
        // Remember the constructor property was set wrong, let's fix it
        sub.prototype.constructor = sub;
        // In ECMAScript5+ (all modern browsers), you can make the constructor property
        // non-enumerable if you define it like this instead
        Object.defineProperty(sub.prototype, 'constructor', {
            enumerable: false,
            value: sub,
        });
    };
}).call(COL, jQuery);

export {COL};
