'use strict';

// https://gist.github.com/2107/5529665

class BrowserDetect {

    // browser detect
    constructor(){
        this.dataBrowser = [{
	    string: navigator.userAgent,
	    subString: "Chrome",
	    identity: "Chrome"
        }, {
	    string: navigator.userAgent,
	    subString: "OmniWeb",
	    versionSearch: "OmniWeb/",
	    identity: "OmniWeb"
        }, {
	    string: navigator.vendor,
	    subString: "Apple",
	    identity: "Safari",
	    versionSearch: "Version"
        }, {
	    prop: window.opera,
	    identity: "Opera",
	    versionSearch: "Version"
        }, {
	    string: navigator.vendor,
	    subString: "iCab",
	    identity: "iCab"
        }, {
	    string: navigator.vendor,
	    subString: "KDE",
	    identity: "Konqueror"
        }, {
	    string: navigator.userAgent,
	    subString: "Firefox",
	    identity: "Firefox"
        }, {
	    string: navigator.vendor,
	    subString: "Camino",
	    identity: "Camino"
        }, { // for newer Netscapes (6+)
	    string: navigator.userAgent,
	    subString: "Netscape",
	    identity: "Netscape"
        }, {
	    string: navigator.userAgent,
	    subString: "MSIE",
	    identity: "Explorer",
	    versionSearch: "MSIE"
        }, {
	    string: navigator.userAgent,
	    subString: "Gecko",
	    identity: "Mozilla",
	    versionSearch: "rv"
        }, { // for older Netscapes (4-)
	    string: navigator.userAgent,
	    subString: "Mozilla",
	    identity: "Netscape",
	    versionSearch: "Mozilla"
        }];
        
        this.dataOS = [{
	    string: navigator.platform,
	    subString: "Win",
	    identity: "Windows"
        }, {
	    string: navigator.platform,
	    subString: "Mac",
	    identity: "Mac"
        }, {
	    string: navigator.userAgent,
	    subString: "iPhone",
	    identity: "iPhone/iPod"
        }, {
	    string: navigator.platform,
	    subString: "Linux",
	    identity: "Linux"
        }]
    };
    
    init = function () {
	this.browser = this.searchString(this.dataBrowser) || "An unknown browser";
	this.version = this.searchVersion(navigator.userAgent) || this.searchVersion(navigator.appVersion) || "an unknown version";
	this.OS = this.searchString(this.dataOS) || "an unknown OS";

        let isMobileAny = isMobile.any();
        // console.log('isMobileAny', isMobileAny);
        this.isMobileAndroid = isMobile.Android() ? true: false;
        if(this.isMobileAndroid)
        {
            this.OS = 'Android';
        }
        
        // console.log('this.isMobileAndroid', this.isMobileAndroid);

    };
    
    searchString = function (data) {
	for (var i = 0; i < data.length; i++) {
	    var dataString = data[i].string;
	    var dataProp = data[i].prop;
	    this.versionSearchString = data[i].versionSearch || data[i].identity;
	    if (dataString) {
		if (dataString.indexOf(data[i].subString) != -1) return data[i].identity;
	    } else if (dataProp) return data[i].identity;
	}
    };
    
    searchVersion = function(dataString) {
	var index = dataString.indexOf(this.versionSearchString);
	if (index == -1) return;
	return parseFloat(dataString.substring(index + this.versionSearchString.length + 1));
    };


    // BrowserDetect.init();

};

var isMobile = {
    Android: function() {
        // console.log('BEG isMobile.Android()');
        // console.log('navigator.userAgent', navigator.userAgent); 
        return navigator.userAgent.match(/Android/i);
    },
    BlackBerry: function() {
        return navigator.userAgent.match(/BlackBerry/i);
    },
    iOS: function() {
        return navigator.userAgent.match(/iPhone|iPad|iPod/i);
    },
    Opera: function() {
        return navigator.userAgent.match(/Opera Mini/i);
    },
    Windows: function() {
        return navigator.userAgent.match(/IEMobile/i);
    },
    any: function() {
        // console.log('BEG isMobile.any()'); 
        return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
    }
};

export { BrowserDetect };
