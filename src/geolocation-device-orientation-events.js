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

        //Find direction
        event.XXorientation = null;
        if (event.webkitCompassHeading)
            // iOS
            event.XXorientation = event.webkitCompassHeading;
        else
            if (event.absolute && event.alpha)
                // Android
                event.XXorientation = 360 - event.alpha;

//HER        if (event.XXorientation !== null)
//HER            event.XXorientation = Math.round(event.XXorientation);

//MANGLER beta og gamma


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

