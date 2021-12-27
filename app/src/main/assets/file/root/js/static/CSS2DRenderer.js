'use strict';

import {Object3D as THREE_Object3D,
        REVISION as THREE_REVISION,
        Vector3 as THREE_Vector3,
        Matrix4 as THREE_Matrix4
       } from './three.js/three.js-r135/build/three.module.js';

var CSS2DObject = function ( element ) {

    THREE_Object3D.call( this );

    this.element = element;
    this.element.style.position = 'absolute';

    this.addEventListener( 'removed', function ( event ) {

	if ( this.element.parentNode !== null ) {

	    this.element.parentNode.removeChild( this.element );

	}

    } );

};

CSS2DObject.prototype = Object.create( THREE_Object3D.prototype );
CSS2DObject.prototype.constructor = CSS2DObject;

//

var CSS2DRenderer = function () {

    console.log( 'CSS2DRenderer', THREE_REVISION );

    var _width, _height;
    var _widthHalf, _heightHalf;

    var vector = new THREE_Vector3();
    var viewMatrix = new THREE_Matrix4();
    var viewProjectionMatrix = new THREE_Matrix4();

    var cache = {
	objects: new WeakMap()
    };

    var domElement = document.createElement( 'div' );
    domElement.style.overflow = 'hidden';

    this.domElement = domElement;

    this.getSize = function () {

	return {
	    width: _width,
	    height: _height
	};

    };

    this.setSize = function ( width, height ) {

	_width = width;
	_height = height;

	_widthHalf = _width / 2;
	_heightHalf = _height / 2;

	domElement.style.width = width + 'px';
	domElement.style.height = height + 'px';

    };


    this.calcPositionFromTranslateAttribute = function ( object, transX, transY )
    {
        if ( object instanceof CSS2DObject ) {
            let x1 = (transX - _widthHalf) / _widthHalf;
            let y1 = - (transY - _heightHalf) / _heightHalf;

            var positionVec = new THREE_Vector3();
            positionVec.setFromMatrixPosition( object.matrixWorld );
            positionVec.applyMatrix4( viewProjectionMatrix );

            // let viewProjectionMatrixInv = new THREE_Matrix4().getInverse( viewProjectionMatrix );
            // positionVec.applyMatrix4( viewProjectionMatrixInv );

            let viewProjectionMatrixInv = new THREE_Matrix4().getInverse( viewProjectionMatrix );
	    var positionVec2 = new THREE_Vector3(x1, y1, vector.z);
	    positionVec2.applyMatrix4( viewProjectionMatrixInv );

            return positionVec2;
        }
    };

    var renderObject = function ( object, camera ) {

	if ( object instanceof CSS2DObject ) {

	    vector.setFromMatrixPosition( object.matrixWorld );
	    vector.applyMatrix4( viewProjectionMatrix );

            // let viewProjectionMatrixInv = new THREE_Matrix4().getInverse( viewProjectionMatrix );

            var transX = ( vector.x * _widthHalf + _widthHalf );
            var transY = ( - vector.y * _heightHalf + _heightHalf );

            let x1 = (transX - _widthHalf) / _widthHalf;
            let y1 = - (transY - _heightHalf) / _heightHalf;

	    var positionVec = new THREE_Vector3(x1, y1, vector.z);

            let viewProjectionMatrixInv = new THREE_Matrix4().getInverse( viewProjectionMatrix );
	    positionVec.applyMatrix4( viewProjectionMatrixInv );
            // console.log('positionVec2', positionVec); 

	    var element = object.element;

            // add scale - based on https://github.com/mrdoob/THREE_js/issues/9246
            // console.log('vector', vector); 
            var style = 'translate(-50%,-50%) translate(' + ( vector.x * _widthHalf + _widthHalf ) + 'px,' +
                ( - vector.y * _heightHalf + _heightHalf ) + 'px)  scale(' + camera.zoom + ', ' + camera.zoom + ')';

	    element.style.WebkitTransform = style;
	    element.style.MozTransform = style;
	    element.style.oTransform = style;
	    element.style.transform = style;

	    var objectData = {
		distanceToCameraSquared: getDistanceToSquared( camera, object )
	    };

	    cache.objects.set( object, objectData );

	    if ( element.parentNode !== domElement ) {

		domElement.appendChild( element );

	    }

	}

	for ( var i = 0, l = object.children.length; i < l; i ++ ) {

	    renderObject( object.children[ i ], camera );

	}

    };

    var getDistanceToSquared = function () {

	var a = new THREE_Vector3();
	var b = new THREE_Vector3();

	return function ( object1, object2 ) {

	    a.setFromMatrixPosition( object1.matrixWorld );
	    b.setFromMatrixPosition( object2.matrixWorld );

	    return a.distanceToSquared( b );

	};

    }();

    var filterAndFlatten = function ( scene ) {

	var result = [];

	scene.traverse( function ( object ) {

	    if ( object instanceof CSS2DObject ) result.push( object );

	} );

	return result;

    };

    var zOrder = function ( scene ) {

	var sorted = filterAndFlatten( scene ).sort( function ( a, b ) {

	    var distanceA = cache.objects.get( a ).distanceToCameraSquared;
	    var distanceB = cache.objects.get( b ).distanceToCameraSquared;

	    return distanceA - distanceB;

	} );

	var zMax = sorted.length;

	for ( var i = 0, l = sorted.length; i < l; i ++ ) {

	    sorted[ i ].element.style.zIndex = zMax - i;

	}

    };

    this.render = function ( scene, camera ) {

	scene.updateMatrixWorld();

	if ( camera.parent === null ) camera.updateMatrixWorld();

	viewMatrix.copy( camera.matrixWorldInverse );
	viewProjectionMatrix.multiplyMatrices( camera.projectionMatrix, viewMatrix );

	renderObject( scene, camera );
	zOrder( scene );

    };

};

export {CSS2DObject, CSS2DRenderer};
