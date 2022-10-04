/****************************************************************************
geolocation-device-orientation.js

Define global events to handle device orientation and calibration

****************************************************************************/

(function ($, window/*, document, undefined*/) {
    "use strict";

    //Create namespaces
    var ns = window.geolocation = window.geolocation || {};

    /***********************************************************
    There are two events:
        deviceorientation
        compassneedscalibration - NOT USED FOR NOW

    To add events-handler to these events use
        window.geolocation.onDeviceorientation( fn: FUNCTION[, context: OBJECT] )
        NOT IMPLEMENTED: window.geolocation.onCompassneedscalibration( fn: FUNCTION[, context: OBJECT] )

    To remove events-handler to these events use
        window.geolocation.offDeviceorientation( fn: FUNCTION[, context: OBJECT] )
        NOT IMPLEMENTED: window.geolocation.offCompassneedscalibration( fn: FUNCTION[, context: OBJECT] )
    ***********************************************************/
    var lastId = 0;

    function stamp(obj) {
        /*eslint-disable */
        obj._gldo_id = obj._gldo_id || ++lastId;
        return obj._gldo_id;
        /* eslint-enable */
    }


    var EventList = function(){
            this.isActive = false;
            this.lastEvent = {};
            this.added = 0;
            this.list = {};
        };

    EventList.prototype = {
        add: function(fn, context){
            var id = stamp(fn) + (context ? '_' + stamp(context) : '');
            if (!this.list[id]){
                this.added++;
                this.list[id] = {fn: fn, context: context};
            }

            if (this.added == 1)
                this.activate();
            else
                this.list[id].fn.call(this.list[id].context, this.lastEvent);
        },

        remove: function(fn, context){
            var id = stamp(fn) + (context ? '_' + stamp(context) : '');
            if (this.list[id]){
                this.list[id] = null;
                this.added--;
                if (this.added == 0)
                    this.deactivate();
            }
        },

        trigger: function (event){
            this.lastEvent = event;
            $.each(this.list, function(id, fn_context){
                if (fn_context)
                    fn_context.fn.call(fn_context.context, event);
            });
        },

        activate  : function(){},
        deactivate: function(){}

    };



    /***********************************************************************
    DEVICE ORIENTATION

    Note:
    Safari on iOS doesn't implement the spec correctly, because alpha is arbitrary instead of relative to true north.
    Safari instead offers webkitCompassHeading`, which has the opposite sign to alpha and is also relative to magnetic north
    instead of true north. (see details)
    DeviceOrientationEvent.beta has values between -90 and 90 on mobile Safari and between 180 and -180 on Firefox.
    DeviceOrientationEvent.gamma has values between -180 and 180 on mobile Safari and between 90 and -90 on Firefox.

    Firefox, Chrome : https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent
    Safari          : https://developer.apple.com/documentation/webkitjs/deviceorientationevent#//apple_ref/javascript/instp/DeviceOrientationEvent/beta


    ***********************************************************************/
    var deviceOrientationEventName =
            'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' :
            'ondeviceorientation' in window ? 'deviceorientation' :
            null;

    var onDeviceorientationList = new EventList();
    $.extend(onDeviceorientationList, {
        activate: function(){
            if (deviceOrientationEventName){
                var self_event_handler = this.self_event_handler = this.self_event_handler || $.proxy(this.onDeviceorientation, this),
                    add_event_deviceorientation = function() {
                        $(window).on(deviceOrientationEventName, self_event_handler);
                    };

                if (DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function')
                    DeviceOrientationEvent.requestPermission().then(function (permissionState) {
                        if (permissionState === 'granted')
                            add_event_deviceorientation();
                    });
                else
                    add_event_deviceorientation();
            }
            else
                this.trigger({});
        },

        deactivate: function(){
            $(window).off(deviceOrientationEventName, this.self_event_handler);
        },

        onDeviceorientation: function(jquery_event) {
            var event    = jquery_event.originalEvent,
                newEvent = {},
                deviceorientation = null;

            if (event.webkitCompassHeading)
                // iOS
                deviceorientation = event.webkitCompassHeading;
            else
                if (event.absolute && event.alpha)
                    // Android
                    deviceorientation = 360 - parseInt(event.alpha);

            event.deviceorientation = deviceorientation;

            $.each(['absolute', 'deviceorientation', 'webkitCompassHeading', 'alpha', 'beta', 'gamma'], function(index, id){
                newEvent[id] = typeof event[id] == 'number' ? Math.round(event[id]) : event[id];
            });


            var screenOrientation = window.o9n.getOrientation();
            newEvent.angle = screenOrientation.angle;
            newEvent.type  = screenOrientation.type;

            this.trigger(newEvent);
        }
    });



    ns.onDeviceorientation = function( fn, context ){
        onDeviceorientationList.add( fn, context );
    };

    ns.offDeviceorientation = function( fn, context ){
        onDeviceorientationList.remove( fn, context );
    };


    /*******************************************************************
    COMPASS NEEDS CALIBRATION - NOT IMPLEMENTED
    *******************************************************************/
    /*
    var onCompassneedscalibrationList = new EventList();
    $.extend(onCompassneedscalibrationList, {
        activate: function(){

        },

        deactivate: function(){

        }
    }

    ns.offCompassneedscalibration = function( fn, context ){
        onCompassneedscalibrationList.add( fn, context );
    };
    ns.onCompassneedscalibration = function( fn, context ){
        onCompassneedscalibrationList.remove( fn, context );
    };
    */

    //$(window).on('compassneedscalibration', function(event){
    //    triggerList(onCompassneedscalibrationList, event);
    //});


}(jQuery, this/*, document*/));


;
/****************************************************************************
geolocation-provider-handler.js

The package contains definitions of two classes used to provide geo-positions and to handle this informations

1: A 'Provider' gets the positions-info from a source and provides them for a geolocation-handler
2: A 'Handlerø gets geolocation-info from a Provider and handles the data and errors

********************************
window.geolocation.GeolocationProvider:
    Abstract class that provides position, heading, speed etc. from a source.
    Different inherrited versions are created for geolocation, AIS, manual entering etc.

    new window.geolocation.GeolocationProvider( options )
    options = {
        maximumAge: DOUBLE - Maximum age of last coords before a update with coords = {}NULL is called. Defalut = 0 => no coords are to old
    }

********************************
window.geolocation.GeolocationHandler:
    Abstract class that must contain the following methods:

    setCoords         : function( coords )        - Called by the associated GeolocationProvider when the coordinates changeds
    onGeolocationError: function( error, coords ) - Called by the associated GeolocationProvider when an error occur

    coords = An extended version of GeolocationCoordinates (see https://developer.mozilla.org/en-US/docs/Web/API/GeolocationCoordinates) =
    {
        latitude         : Position's latitude in decimal degrees.
        lat              : As latitude
        longitude        : Position's longitude in decimal degrees.
        lng              : As longitude
        latLng           : Leaflet LatLng-object - only if Leaflet is included
        altitude         : Position's altitude in meters, relative to sea level. This value can be null if the implementation cannot provide the data.
        accuracy         : Accuracy of the latitude and longitude properties, expressed in meters.
        altitudeAccuracy : Accuracy of the altitude expressed in meters. This value can be null.
        heading          : Direction towards which the device is facing. This value, specified in degrees, indicates how far off from heading true north the device is.
                           0 degrees represents true north, and the direction is determined clockwise (which means that east is 90 degrees and west is 270 degrees).
                           If speed is 0, heading is NaN. If the device is unable to provide heading information, this value is null.
        speed            : Velocity of the device in meters per second. This value can be null.

    error = Must contain the following properties taken from GeolocationPositionError (see https://developer.mozilla.org/en-US/docs/Web/API/GeolocationPositionError)
        code: Returns an unsigned short representing the error code. The following values are possible:
            1   PERMISSION_DENIED       The acquisition of the geolocation information failed because the page didn't have the permission to do it.
            2   POSITION_UNAVAILABLE    The acquisition of the geolocation failed because at least one internal source of position returned an internal error.
            3   TIMEOUT                 The time allowed to acquire the geolocation was reached before the information was obtained.
            4   OLD                     The last coordinates are now to old acoording to options.maximumAge

        message: Returns a human-readable DOMString describing the details of the error

****************************************************************************/

(function ($, window/*, document, undefined*/) {
    "use strict";

    //Create namespaces and global id
    var ns = window.geolocation = window.geolocation || {},
        handlerId = 0;

    /***********************************************************
    GeolocationProvider
    Obejct that provides position, heading, speed etc. from
    a source. Differnet inherrited versions are created for
    geolocation, AIS, manual entering etc.
    Each GeolocationProvider has 0-N GeolocationHandler
    that gets its coords from this
    ***********************************************************/
    var GeolocationProvider = ns.GeolocationProvider = function( options = {}){
        this.options = options;
        this.maximumAge = this.options.maximumAge === 0 ? 0 : this.options.maximumAge || 0;

        //this.active = false;
        this.updateNo = 0;
        this.statusOk = true;

        this.coords = {
            latitude         : null,
            lat              : null,
            longitude        : null,
            lng              : null,
            latLng           : null,
            altitude         : null,
            accuracy         : null,
            altitudeAccuracy : null,
            heading          : null,
            speed            : null,

            deviceOrientation_absolute: null,
            deviceOrientation_alpha   : null,
            deviceOrientation_beta    : null,
            deviceOrientation_gamma   : null
        };

        this.geolocationHandlers = {};
        this.nrOfGeolocationHandlers = 0;
    };

    GeolocationProvider.prototype = {
        activate  : function(){},
        deactivate: function(){},


        add: function( geolocationHandler ){
            geolocationHandler.glh_id = geolocationHandler.glh_id || 'geolocationHandler' + handlerId++;

            if (!this.geolocationHandlers[geolocationHandler.glh_id]){
                this.geolocationHandlers[geolocationHandler.glh_id] = geolocationHandler;
                this.nrOfGeolocationHandlers++;
                if (this.nrOfGeolocationHandlers == 1){
                    this.activate();

                    //Set timeout to update coord every maximumAge
                    if (this.maximumAge){
                        this.timeoutId = window.setTimeout( $.proxy(this.timeout, this), this.maximumAge );
                    }
                }
                else
                    if (this.statusOk)
                        this.update( null, geolocationHandler );
                    else
                        this.onError( null, geolocationHandler );

            }
            return this;
        },

        remove: function( geolocationHandler ){
            if (geolocationHandler && geolocationHandler.glh_id && this.geolocationHandlers[geolocationHandler.glh_id]){
                this.nrOfGeolocationHandlers--;
                delete this.geolocationHandlers[geolocationHandler.glh_id];

                if (this.nrOfGeolocationHandlers == 0){
                    this.deactivate();

                    if (this.timeoutId){
                        window.clearTimeout(this.timeoutId);
                        this.timeoutId = null;
                    }
                }
            }
            return this;
        },


        timeout: function(){
            this.onError({
                code   : 4,
                message: 'The last coordinates are to old to be valid'
            });
        },


        roundToDecimals: {
            latitude        : 4, //Llatitude in decimal degrees.
            longitude       : 4, //Longitude in decimal degrees.
            altitude        : 0, //Altitude in meters
            accuracy        : 0, //Accuracy of the latitude and longitude properties, expressed in meters.
            altitudeAccuracy: 1, //Accuracy of the altitude expressed in meters. This value can be null.
            heading         : 0, //Specified in degrees
            speed           : 1  //Velocity of the device in meters per second.
        },

        update: function( coords = {}, onlyHandler ){
            var _this = this;
            if (coords){
                this.statusOk = true;

                //Prevent timeout form clearing coords
                if (this.timeoutId){
                    window.clearTimeout(this.timeoutId);
                    this.timeoutId = null;
                }


                var lastCoords = this.lastCoords = this.coords,
                    newCoords = this.coords = $.extend({}, coords),
                    changed = false;

                //Round all values
                $.each(this.roundToDecimals, function(id, decimals){
                    if (typeof newCoords[id] == 'number')
                        newCoords[id] = +(Math.round(newCoords[id] + "e+"+decimals)  + "e-"+decimals);
                });

                //Check if any is changed
                $.each(newCoords, function(id, value){
                    if (lastCoords[id] !== value){
                        changed = true;
                        return false;
                    }
                });

                if (changed)
                    this.updateNo++;

                //Update coords
                newCoords.latitude = newCoords.latitude || newCoords.lat || null;
                newCoords.lat      = newCoords.lat || newCoords.latitude || null;

                newCoords.longitude = newCoords.longitude || newCoords.lng || null;
                newCoords.lng       = newCoords.lng || newCoords.longitude || null;

                if (window.L && window.L.LatLng && (newCoords.lat !== null) && (newCoords.lng !== null))
                    newCoords.latLng = new window.L.LatLng(newCoords.lat, newCoords.lng);
                else
                    newCoords.latLng = null;


                //TODO: Needed? - Update all values. Value of id X is only updated if the new coords set the value to undefined by having coords.X === null, else the value is not changed
                /*
                $.each(this.coords, function(id){
                    if (coords[id] || (coords[id] === 0) || (coords[id] === null))
                        _this.coords[id] = coords[id];
                });
                */
            }

            //Update all or given handler(s)
            var handlers = onlyHandler ? [onlyHandler] : this.geolocationHandlers;

            $.each(handlers, function(id, geolocationHandler) {
                if (geolocationHandler.setCoords && (geolocationHandler.glh_updateNo != _this.updateNo)){
                    geolocationHandler.glh_updateNo = _this.updateNo;
                    geolocationHandler.setCoords( newCoords );
                }
            });

            if (coords && this.maximumAge)
                this.timeoutId = window.setTimeout( $.proxy(this.timeout, this), this.maximumAge );

            return this;
        },


        onError: function( error, onlyHandler ){
            if (error)
                this.statusOk = false;

            this.error = $.extend({
                code                : 0,
                message             : '',
                PERMISSION_DENIED   : 1,
                POSITION_UNAVAILABLE: 2,
                TIMEOUT             : 3,
                OLD                 : 4,
            }, error || {});

            var handlers = onlyHandler ? [onlyHandler] : this.geolocationHandlers,
                nullCoords = {};

            //Set all values of coords = null
            $.each(this.coords, function(id){
                nullCoords[id] = null;
            });

            $.each(handlers, function(id, geolocationHandler){
                if (geolocationHandler.onGeolocationError)
                    geolocationHandler.onGeolocationError( this.error, nullCoords );
            });

            return this;
        }
    };


}(jQuery, this/*, document*/));


;
/****************************************************************************
geolocation-standard_tilt.js

Creates window.geolocation.provider = version of GeolocationProvider that
provides location from the browser geolocation API

****************************************************************************/

(function ($, window/*, document, undefined*/) {
    "use strict";

    //Create namespaces
    var ns = window.geolocation = window.geolocation || {};

    var geolocationOptions = {
        /* From https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition */

        /*
        maximumAge:
            Is a positive long value indicating the maximum age in milliseconds of a possible cached position that is acceptable to return.
            If set to 0, it means that the device cannot use a cached position and must attempt to retrieve the real current position.
            If set to Infinity the device must return a cached position regardless of its age. Default: 0.
        */
        //maximumAge          : 10 * 1000, //Allow 10sec old position

        /*
        timeout:
            Is a positive long value representing the maximum length of time (in milliseconds) the device is allowed to take in order to return a position.
            The default value is Infinity, meaning that getCurrentPosition() won't return until the position is available.
        */
        //timeout             : 10 * 1000,

        /*
        enableHighAccuracy:
            Is a boolean value that indicates the application would like to receive the best possible results.
            If true and if the device is able to provide a more accurate position, it will do so.
            Note that this can result in slower response times or increased power consumption (with a GPS chip on a mobile device for example).
            On the other hand, if false, the device can take the liberty to save resources by responding more quickly and/or using less power. Default: false.
        */
        enableHighAccuracy  : true
    };

    /*
    GeolocationPosition = {
        coords   : GeolocationCoordinates
        timestamp: Millisecond

    From https://developer.mozilla.org/en-US/docs/Web/API/GeolocationCoordinates:
    GeolocationCoordinates = {
        latitude        : Position's latitude in decimal degrees.
        longitude       : Position's longitude in decimal degrees.
        altitude        : Position's altitude in meters, relative to sea level. This value can be null if the implementation cannot provide the data.
        accuracy        : Accuracy of the latitude and longitude properties, expressed in meters.
        altitudeAccuracy: Accuracy of the altitude expressed in meters. This value can be null.
        heading         : Direction towards which the device is facing. This value, specified in degrees, indicates how far off from heading true north the device is. 0 degrees represents true north, and the direction is determined clockwise (which means that east is 90 degrees and west is 270 degrees). If speed is 0, heading is NaN. If the device is unable to provide heading information, this value is null.
        speed           : Velocity of the device in meters per second. This value can be null.
    }
    All properties are double
    */

    //*****************************************************************
    //*****************************************************************
    // Obtain a new *world-oriented* Full Tilt JS DeviceOrientation Promise
    var promise = window.FULLTILT.getDeviceOrientation({ 'type': 'world' });

    // Wait for Promise result
    promise.then(function(deviceOrientation) { // Device Orientation Events are supported
        // Register a callback to run every time a new
        // deviceorientation event is fired by the browser.

//console.log(deviceOrientation);

        deviceOrientation.listen(function() {
            // Get the current *screen-adjusted* device orientation angles
            var currentOrientation = deviceOrientation.getScreenAdjustedEuler();

            // Calculate the current compass heading that the user is 'looking at' (in degrees)
            var compassHeading = 360 - currentOrientation.alpha;

            // Do something with `compassHeading` here...
            $('.tilt').html('compassHeading = ' + compassHeading);

        });

    }).catch(function(errorMessage) { // Device Orientation Events are not supported

        //console.log('FULLTILT-error', errorMessage);
            $('.tilt').html('Error = ' + errorMessage);

    // Implement some fallback controls here...

  });













    //*****************************************************************
    //*****************************************************************
    var Provider_tilt = function(){
            this.lastCoords = {};
            ns.GeolocationProvider.call(this, geolocationOptions);
        };

    Provider_tilt.prototype = Object.create(ns.GeolocationProvider.prototype);


    $.extend(Provider_tilt.prototype, {
        activate: function(){
            this._success = this._success || $.proxy(this.success, this);
            this._error   = this._error   || $.proxy(this.onError, this);

            if (navigator.geolocation)
                navigator.geolocation.watchPosition(this._success, this._error, geolocationOptions);
            else
                this.onError(4);
        },


        deactivate: function(){
            if (navigator.geolocation)
                navigator.clearWatch();
        },

        success: function( GeolocationPosition ){
            this.update( GeolocationPosition.coords );
        },

    });

    //Create window.geolocation.provider_tilt
    ns.provider_tilt = new Provider_tilt();

}(jQuery, this/*, document*/));


;
/****************************************************************************
geolocation-standard.js

Creates window.geolocation.provider = version of GeolocationProvider that
provides location from the browser geolocation API

****************************************************************************/

(function ($, window/*, document, undefined*/) {
    "use strict";

    //Create namespaces
    var ns = window.geolocation = window.geolocation || {};

    var geolocationOptions = {
        /* From https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition */

        /*
        maximumAge:
            Is a positive long value indicating the maximum age in milliseconds of a possible cached position that is acceptable to return.
            If set to 0, it means that the device cannot use a cached position and must attempt to retrieve the real current position.
            If set to Infinity the device must return a cached position regardless of its age. Default: 0.
        */
        //maximumAge          : 10 * 1000, //Allow 10sec old position

        /*
        timeout:
            Is a positive long value representing the maximum length of time (in milliseconds) the device is allowed to take in order to return a position.
            The default value is Infinity, meaning that getCurrentPosition() won't return until the position is available.
        */
        //timeout             : 10 * 1000,

        /*
        enableHighAccuracy:
            Is a boolean value that indicates the application would like to receive the best possible results.
            If true and if the device is able to provide a more accurate position, it will do so.
            Note that this can result in slower response times or increased power consumption (with a GPS chip on a mobile device for example).
            On the other hand, if false, the device can take the liberty to save resources by responding more quickly and/or using less power. Default: false.
        */
        enableHighAccuracy  : true
    };

    /*
    GeolocationPosition = {
        coords   : GeolocationCoordinates
        timestamp: Millisecond

    From https://developer.mozilla.org/en-US/docs/Web/API/GeolocationCoordinates:
    GeolocationCoordinates = {
        latitude        : Position's latitude in decimal degrees.
        longitude       : Position's longitude in decimal degrees.
        altitude        : Position's altitude in meters, relative to sea level. This value can be null if the implementation cannot provide the data.
        accuracy        : Accuracy of the latitude and longitude properties, expressed in meters.
        altitudeAccuracy: Accuracy of the altitude expressed in meters. This value can be null.
        heading         : Direction towards which the device is facing. This value, specified in degrees, indicates how far off from heading true north the device is. 0 degrees represents true north, and the direction is determined clockwise (which means that east is 90 degrees and west is 270 degrees). If speed is 0, heading is NaN. If the device is unable to provide heading information, this value is null.
        speed           : Velocity of the device in meters per second. This value can be null.
    }
    All properties are double
    */


    var Provider = function(){
            this.lastCoords = {};
            ns.GeolocationProvider.call(this, geolocationOptions);
        };

    Provider.prototype = Object.create(ns.GeolocationProvider.prototype);


    $.extend(Provider.prototype, {
        activate: function(){
            this._success = this._success || $.proxy(this.success, this);
            this._error   = this._error   || $.proxy(this.onError, this);

            if (navigator.geolocation)
                navigator.geolocation.watchPosition(this._success, this._error, geolocationOptions);
            else
                this.onError(4);
        },


        deactivate: function(){
            if (navigator.geolocation)
                navigator.clearWatch();
        },

        success: function( GeolocationPosition ){
            this.update( GeolocationPosition.coords );
        },

    });

    //Create window.geolocation.provider
    ns.provider = new Provider();

}(jQuery, this/*, document*/));


;
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.o9n = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

function getOrientation() {
  if (typeof window === 'undefined') return undefined;
  var screen = window.screen;
  var orientation;

  // W3C spec implementation
  if (
    typeof window.ScreenOrientation === 'function' &&
    screen.orientation instanceof ScreenOrientation &&
    typeof screen.orientation.addEventListener == 'function' &&
    screen.orientation.onchange === null &&
    typeof screen.orientation.type === 'string'
  ) {
    orientation = screen.orientation;
  } else {
    orientation = createOrientation();
  }

  return orientation;
}

module.exports = {
  orientation: getOrientation(),
  getOrientation: getOrientation,
  install: function install() {
    var screen = window.screen;
    if (
      typeof window.ScreenOrientation === 'function' &&
      screen.orientation instanceof ScreenOrientation
    ) {
      return screen.orientation;
    }
    window.screen.orientation = orientation;
    return orientation;
  },
};

function createOrientation() {
  var orientationMap = {
    '90': 'landscape-primary',
    '-90': 'landscape-secondary',
    '0': 'portrait-primary',
    '180': 'portrait-secondary',
  };

  function ScreenOrientation() {}
  var or = new ScreenOrientation();

  var found = findDelegate(or);

  ScreenOrientation.prototype.addEventListener = delegate(
    'addEventListener',
    found.delegate,
    found.event
  );
  ScreenOrientation.prototype.dispatchEvent = delegate(
    'dispatchEvent',
    found.delegate,
    found.event
  );
  ScreenOrientation.prototype.removeEventListener = delegate(
    'removeEventListener',
    found.delegate,
    found.event
  );
  ScreenOrientation.prototype.lock = getLock();
  ScreenOrientation.prototype.unlock = getUnlock();

  Object.defineProperties(or, {
    onchange: {
      get: function () {
        return found.delegate['on' + found.event] || null;
      },
      set: function (cb) {
        found.delegate['on' + found.event] = wrapCallback(cb, or);
      },
    },
    type: {
      get: function () {
        var screen = window.screen;
        return (
          screen.msOrientation ||
          screen.mozOrientation ||
          orientationMap[window.orientation + ''] ||
          (getMql().matches ? 'landscape-primary' : 'portrait-primary')
        );
      },
    },
    angle: {
      value: 0,
    },
  });

  return or;
}

function delegate(fnName, delegateContext, eventName) {
  var that = this;
  return function delegated() {
    var args = Array.prototype.slice.call(arguments);
    var actualEvent = args[0].type ? args[0].type : args[0];
    if (actualEvent !== 'change') {
      return;
    }
    if (args[0].type) {
      args[0] = getOrientationChangeEvent(eventName, args[0]);
    } else {
      args[0] = eventName;
    }
    var wrapped = wrapCallback(args[1], that);
    if (fnName === 'addEventListener') {
      addTrackedListener(args[1], wrapped);
    }
    if (fnName === 'removeEventListener') {
      removeTrackedListener(args[1]);
    }
    args[1] = wrapped;
    return delegateContext[fnName].apply(delegateContext, args);
  };
}

var trackedListeners = [];
var originalListeners = [];

function addTrackedListener(original, wrapped) {
  var idx = originalListeners.indexOf(original);
  if (idx > -1) {
    trackedListeners[idx] = wrapped;
  } else {
    originalListeners.push(original);
    trackedListeners.push(wrapped);
  }
}

function removeTrackedListener(original) {
  var idx = originalListeners.indexOf(original);
  if (idx > -1) {
    originalListeners.splice(idx, 1);
    trackedListeners.splice(idx, 1);
  }
}

function wrapCallback(cb, orientation) {
  var idx = originalListeners.indexOf(cb);
  if (idx > -1) {
    return trackedListeners[idx];
  }
  return function wrapped(evt) {
    if (evt.target !== orientation) {
      defineValue(evt, 'target', orientation);
    }
    if (evt.currentTarget !== orientation) {
      defineValue(evt, 'currentTarget', orientation);
    }
    if (evt.type !== 'change') {
      defineValue(evt, 'type', 'change');
    }
    cb(evt);
  };
}

function getLock() {
  var err = 'lockOrientation() is not available on this device.';
  var delegateFn;
  var screen = window.screen;
  if (typeof screen.msLockOrientation == 'function') {
    delegateFn = screen.msLockOrientation.bind(screen);
  } else if (typeof screen.mozLockOrientation == 'function') {
    delegateFn = screen.mozLockOrientation.bind(screen);
  } else {
    delegateFn = function () {
      return false;
    };
  }

  return function lock(lockType) {
    var Promise = window.Promise;
    if (delegateFn(lockType)) {
      return Promise.resolve(lockType);
    } else {
      return Promise.reject(new Error(err));
    }
  };
}

function getUnlock() {
  var screen = window.screen;
  return (
    (screen.orientation &&
      screen.orientation.unlock.bind(screen.orientation)) ||
    (screen.msUnlockOrientation && screen.msUnlockOrientation.bind(screen)) ||
    (screen.mozUnlockOrientation && screen.mozUnlockOrientation.bind(screen)) ||
    function unlock() {
      return;
    }
  );
}

function findDelegate(orientation) {
  var events = [
    'orientationchange',
    'mozorientationchange',
    'msorientationchange',
  ];

  for (var i = 0; i < events.length; i++) {
    if (screen['on' + events[i]] === null) {
      return {
        delegate: screen,
        event: events[i],
      };
    }
  }

  if (typeof window.onorientationchange != 'undefined') {
    return {
      delegate: window,
      event: 'orientationchange',
    };
  }

  return {
    delegate: createOwnDelegate(orientation),
    event: 'change',
  };
}

function getOrientationChangeEvent(name, props) {
  var orientationChangeEvt;

  try {
    orientationChangeEvt = new Event(name, props);
  } catch (e) {
    orientationChangeEvt = { type: 'change' };
  }
  return orientationChangeEvt;
}

function createOwnDelegate(orientation) {
  var ownDelegate = Object.create({
    addEventListener: function addEventListener(evt, cb) {
      if (!this.listeners[evt]) {
        this.listeners[evt] = [];
      }
      if (this.listeners[evt].indexOf(cb) === -1) {
        this.listeners[evt].push(cb);
      }
    },
    dispatchEvent: function dispatchEvent(evt) {
      if (!this.listeners[evt.type]) {
        return;
      }
      this.listeners[evt.type].forEach(function (fn) {
        fn(evt);
      });
      if (typeof orientation.onchange == 'function') {
        orientation.onchange(evt);
      }
    },
    removeEventListener: function removeEventListener(evt, cb) {
      if (!this.listeners[evt]) {
        return;
      }
      var idx = this.listeners[evt].indexOf(cb);
      if (idx > -1) {
        this.listeners[evt].splice(idx, 1);
      }
    },
  });

  ownDelegate.listeners = {};

  var mql = getMql();

  if (mql && typeof mql.matches === 'boolean') {
    mql.addListener(function () {
      ownDelegate.dispatchEvent(getOrientationChangeEvent('change'));
    });
  }

  return ownDelegate;
}

function getMql() {
  if (typeof window.matchMedia != 'function') {
    return {};
  }
  return window.matchMedia('(orientation: landscape)');
}

function defineValue(obj, key, val) {
  Object.defineProperty(obj, key, {
    value: val,
  });
}

},{}]},{},[1])(1)
});
