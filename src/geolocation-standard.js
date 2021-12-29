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

