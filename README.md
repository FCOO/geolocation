# geolocation
>
<!--
Have tryed implementing fulltilt^0.5.3
-->

## Description
Contains tree parts regarding geolocation and device orientation

- Events for device orientation
- Classes for geolocation-provider and -handler
- geolocation-provider for standard geolocation API


## Installation
### bower
`bower install https://github.com/FCOO/geolocation.git --save`

## Demo
http://FCOO.github.io/geolocation/demo/

## Usage

### Device orientation events
There are two events regarding device orientation

- [deviceorientation](https://developer.mozilla.org/en-US/docs/Web/Events/Detecting_device_orientation)
- [compassneedscalibration](https://www.w3.org/TR/orientation-event/#compassneedscalibration) ** NOT IMPLEMENTED **

The different browser do not handle this events the same way. Therefor there are methods to add and remove event-handlers for this events.
Safari on iOS doesn't implement the spec correctly, because alpha is arbitrary instead of relative to true north.
Safari instead offers `webkitCompassHeading`, which has the opposite sign to alpha and is also relative to magnetic north instead of true north.
`DeviceOrientationEvent.beta` has values between -90 and 90 on mobile Safari and between 180 and -180 on Firefox.
`DeviceOrientationEvent.gamma` has values between -180 and 180 on mobile Safari and between 90 and -90 on Firefox.

Se details for
[Firefox, Chrome](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent) and
[Safari](https://developer.apple.com/documentation/webkitjs/deviceorientationevent#//apple_ref/javascript/instp/DeviceOrientationEvent/beta)


#### Screen Orientation

The record returned by the event-handler includes two values from [The Screen Orientation API](https://w3c.github.io/screen-orientation/#widl-ScreenOrientation-lock-Promise-void--OrientationLockType-orientation): `angle` and `type`



This package using the ponyfill [o9n v. 2.1.1](https://github.com/chmanie/o9n) by [Christian Maniewski](https://github.com/chmanie) to get the values on different browsers

#### Use and formats
     To add events-handler to these events use
        window.geolocation.onDeviceorientation( fn: FUNCTION(EVENT)[, context: OBJECT] )
        window.geolocation.onCompassneedscalibration( fn: FUNCTION(EVENT)[, context: OBJECT] )

    To remove events-handler to these events use
        window.geolocation.offDeviceorientation( fn: FUNCTION[, context: OBJECT] )
        window.geolocation.offCompassneedscalibration( fn: FUNCTION[, context: OBJECT] )

    EVENT = {
        absolute            : BOOLEAN,
        deviceorientation   : NUMBER or null,   //Calculated
        webkitCompassHeading: NUMBER or null,
        alpha               : NUMBER or null,
        beta                : NUMBER or null,
        gamma               : NUMBER or null,

        angle               : NUMBER or null,
        type                : STRING or null    //Values = "portrait-primary", "portrait-secondary",
                                                //         "landscape-primary", or "landscape-secondary"
    }

See [description of EVENT elements](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent)

### Geolocation-provider and Geolocation-Handler
The package contains definitions of two classes used to provide geo-positions and to handle this information

- A *'Provider'* gets the positions-info from a source and provides them for a geolocation-handler
- A *'Handler'* gets geolocation-info from a Provider and handles the data and errors


#### `window.geolocation.GeolocationProvider`
Abstract class that provides position, heading, speed etc. from a source.
Different inherrited versions are created for geolocation, AIS, manual entering etc.

        new window.geolocation.GeolocationProvider( options )
        options = {
            maximumAge: DOUBLE - Maximum age of last coords before a update with coords = {}NULL is called.
                                 Defalut = 0 => no coords are to old
        }

        Methods:
            .add   : function( geolocationHandler ) //Add geolocationHandler to the handler
            .remove: function( geolocationHandler ) //Remove geolocationHandler from the handler



#### `window.geolocation.GeolocationHandler`
Abstract class that must contain the following methods:

    setCoords         : function( coords )        - Called by the associated GeolocationProvider when the coordinates changeds
    onGeolocationError: function( error, coords ) - Called by the associated GeolocationProvider when an error occur

#### `coords`
`coords` = An extended version of [GeolocationCoordinates](https://developer.mozilla.org/en-US/docs/Web/API/GeolocationCoordinates)

    coords = {
        latitude         : Position's latitude in decimal degrees.
        lat              : As latitude
        longitude        : Position's longitude in decimal degrees.
        lng              : As longitude
        latLng           : Leaflet LatLng-object - only if Leaflet is included
        altitude         : Position's altitude in meters, relative to sea level. This value can be null if the
                            implementation cannot provide the data.
        accuracy         : Accuracy of the latitude and longitude properties, expressed in meters.
        altitudeAccuracy : Accuracy of the altitude expressed in meters. This value can be null.
        heading          : Direction towards which the device is facing. This value, specified in degrees, indicates how far
                            off from heading true north the device is.
                           0 degrees represents true north, and the direction is determined clockwise (which means that east
                            is 90 degrees and west is 270 degrees).
                           If speed is 0, heading is NaN. If the device is unable to provide heading information,
                            this value is null.
        speed            : Velocity of the device in meters per second. This value can be null.

#### `error`
`error` = Must contain the following properties taken from [GeolocationPositionError](https://developer.mozilla.org/en-US/docs/Web/API/GeolocationPositionError)

    error = {
        code: Returns an unsigned short representing the error code. The following values are possible:
            1   PERMISSION_DENIED       The acquisition of the geolocation information failed because
                                        the page didn't have the permission to do it.
            2   POSITION_UNAVAILABLE    The acquisition of the geolocation failed because at least one internal
                                        source of position returned an internal error.
            3   TIMEOUT                 The time allowed to acquire the geolocation was reached before the information
                                        was obtained.
            4   OLD                     The last coordinates are now to old acoording to options.maximumAge

        message: Returns a human-readable DOMString describing the details of the error
    }


### Standard Geolocation-provider for browser geolocation API

    window.geolocation.provider: GeolocationProvider

A `GeolocationProvider` that provides location, altitude, speed, and heading from the browser standard geolocation API

#### Exsample
    var myHandler = {
            setCoords: function( coords ){
                //De something with coords
            }
        };
    window.geolocation.provider.add( myHandler );



## Copyright and License
This plugin is licensed under the [MIT license](https://github.com/FCOO/geolocation/LICENSE).

Copyright (c) 2021 [FCOO](https://github.com/FCOO)

## Contact information

Niels Holt nho@fcoo.dk