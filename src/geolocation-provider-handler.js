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
    a source. Different inherrited versions are created for
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

