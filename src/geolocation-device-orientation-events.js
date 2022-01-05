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

