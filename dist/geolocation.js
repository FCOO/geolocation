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
        compassneedscalibration

    To add events-handler to these events use
        window.geolocation.onDeviceorientation( fn: FUNCTION[, context: OBJECT] )
        window.geolocation.onCompassneedscalibration( fn: FUNCTION[, context: OBJECT] )

    To remove events-handler to these events use
        window.geolocation.offDeviceorientation( fn: FUNCTION[, context: OBJECT] )
        window.geolocation.offCompassneedscalibration( fn: FUNCTION[, context: OBJECT] )
    ***********************************************************/
    var onDeviceorientationList = {},
        onCompassneedscalibrationList = {},
        lastId = 0;

    function stamp(obj) {
        /*eslint-disable */
        obj._gldo_id = obj._gldo_id || ++lastId;
        return obj._gldo_id;
        /* eslint-enable */
    }

    function addToList(list, fn, context){
        var id = stamp(fn) + (context ? '_' + stamp(context) : '');
        list[id] = list[id] || {fn: fn, context: context};
    }

    function removeFromList(list, fn, context){
        var id = stamp(fn) + (context ? '_' + stamp(context) : '');
        list[id] = null;
    }


    function triggerList(list, event){
        $.each(list, function(id, fn_context){
            if (fn_context)
                fn_context.fn.call(fn_context.context, event);
        });
    }

    ns.onDeviceorientation       = function( fn, context ){ addToList( onDeviceorientationList,       fn, context ); };
    ns.onCompassneedscalibration = function( fn, context ){ addToList( onCompassneedscalibrationList, fn, context ); };

    ns.offDeviceorientation       = function( fn, context ){ removeFromList( onDeviceorientationList,       fn, context ); };
    ns.offCompassneedscalibration = function( fn, context ){ removeFromList( onCompassneedscalibrationList, fn, context ); };


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
    function onDeviceOrientation(jquery_event) {
        var event = jquery_event.originalEvent;

        //Find device orientation
        event.deviceorientation = null;
        if (event.webkitCompassHeading)
            // iOS
            event.deviceorientation = event.webkitCompassHeading;
        else
            if (event.absolute && event.alpha)
                // Android
                event.deviceorientation = 360 - parseInt(event.alpha);

        $.each(['deviceorientation', 'webkitCompassHeading', 'alpha', 'beta', 'gamma'], function(index, id){
            if (event[id] !== null)
                event[id] = Math.round(event[id]);
        });

        triggerList(onDeviceorientationList, event);
    }

    //Set correct event
    var oriAbs = 'ondeviceorientationabsolute' in window;
    if (oriAbs || ('ondeviceorientation' in window)) {

        var add_event_deviceorientation = function() {
//HER            L.DomEvent.on(window, oriAbs ? 'deviceorientationabsolute' : 'deviceorientation', onDeviceOrientation);
            $(window).on(oriAbs ? 'deviceorientationabsolute' : 'deviceorientation', onDeviceOrientation);
        };

        if (DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function')
            DeviceOrientationEvent.requestPermission().then(function (permissionState) {
                if (permissionState === 'granted')
                    add_event_deviceorientation();
            });
        else
            add_event_deviceorientation();
    }




    /**********************************
    COMPASS NEEDS CALIBRATION
    ***********************************/
    $(window).on('compassneedscalibration', function(event){
        triggerList(onCompassneedscalibrationList, event);
    });


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

        If the GeolocationProvider also detects device orientation the following values are included.
        See https://developers.google.com/web/fundamentals/native-hardware/device-orientation for details.
        deviceOrientation_absolute: See https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/absolute
        deviceOrientation_alpha   : See https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/alpha
        deviceOrientation_beta    : See https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/beta
        deviceOrientation_gamma   : See https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/gamma
    }
    All properties are double

    error = Must contain the following properites taken from GeolocationPositionError (see https://developer.mozilla.org/en-US/docs/Web/API/GeolocationPositionError)
        code: Returns an unsigned short representing the error code. The following values are possible:
            1     PERMISSION_DENIED        The acquisition of the geolocation information failed because the page didn't have the permission to do it.
            2    POSITION_UNAVAILABLE    The acquisition of the geolocation failed because at least one internal source of position returned an internal error.
            3    TIMEOUT                    The time allowed to acquire the geolocation was reached before the information was obtained.

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

            if (!geolocationHandler.glh_id){
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
                code: 4,
                message: 'The last coordinates are to old to be valid'
            });
        },

        update: function( coords = {}, onlyHandler ){
            if (coords){
                this.statusOk = true;

                //Prevent timeout form clearing coords
                if (this.timeoutId){
                    window.clearTimeout(this.timeoutId);
                    this.timeoutId = null;
                }

                //Update coords
                coords.latitude = coords.latitude || coords.lat || null;
                coords.lat      = coords.lat || coords.latitude || null;

                coords.longitude = coords.longitude || coords.lng || null;
                coords.lng       = coords.lng || coords.longitude || null;

                if (window.L && window.L.LatLng && (coords.lat !== null) && (coords.lng !== null))
                    coords.latLng = new window.L.LatLng(coords.lat, coords.lng);
                else
                    coords.latLng = null;

                //Update all values. Value of id X is only updated if the new coords set the value to undefined by having coords.X === null, else the value is not changed
                var _this = this;
                $.each(this.coords, function(id){
                    if (coords[id] || (coords[id] === 0) || (coords[id] === null))
                        _this.coords[id] = coords[id];
                });

            }

            //Update all or given handler(s)
            var handlers = onlyHandler ? [onlyHandler] : this.geolocationHandlers,
                this_coords = this.coords;

            $.each(handlers, function(id, geolocationHandler) {
                if (geolocationHandler.setCoords)
                    geolocationHandler.setCoords( this_coords );
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

