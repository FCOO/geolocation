# geolocation
>


## Description
Contains tree parts regarding geolocation and device orientation
Events for device orientation
Classes for geolocation-provider and -handler
geolocation-provider for standard geolocation API


## Installation
### bower
`bower install https://github.com/FCOO/geolocation.git --save`

## Demo
http://FCOO.github.io/geolocation/demo/

## Usage

### Device orientation events
There are two events regarding device orientation

- [deviceorientation](https://developer.mozilla.org/en-US/docs/Web/Events/Detecting_device_orientation)
- [compassneedscalibration](https://www.w3.org/TR/orientation-event/#compassneedscalibration)

The different browser do not handle this events the same way. Therefor there are methods to add and remove event-handlers for this events.
Safari on iOS doesn't implement the spec correctly, because alpha is arbitrary instead of relative to true north.
Safari instead offers `webkitCompassHeading`, which has the opposite sign to alpha and is also relative to magnetic north instead of true north.
`DeviceOrientationEvent.beta` has values between -90 and 90 on mobile Safari and between 180 and -180 on Firefox.
`DeviceOrientationEvent.gamma` has values between -180 and 180 on mobile Safari and between 90 and -90 on Firefox.

Se details for 
[Firefox, Chrome](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent) and 
[Safari](https://developer.apple.com/documentation/webkitjs/deviceorientationevent#//apple_ref/javascript/instp/DeviceOrientationEvent/beta)



     To add events-handler to these events use
        window.geolocation.onDeviceorientation( fn: FUNCTION(EVENT)[, context: OBJECT] )
        window.geolocation.onCompassneedscalibration( fn: FUNCTION(EVENT)[, context: OBJECT] )

    To remove events-handler to these events use
        window.geolocation.offDeviceorientation( fn: FUNCTION[, context: OBJECT] )
        window.geolocation.offCompassneedscalibration( fn: FUNCTION[, context: OBJECT] )

    EVENT = {
        absolute: BOOLEAN,
        deviceorientation   : NUMBER or null,   //Calculated
        webkitCompassHeading: NUMBER or null,
        alpha               : NUMBER or null,
        beta                : NUMBER or null,
        gamma               : NUMBER or null,
    }

See [description of EVENT elements](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent)

### Geolocation-




## Copyright and License
This plugin is licensed under the [MIT license](https://github.com/FCOO/geolocation/LICENSE).

Copyright (c) 2021 [FCOO](https://github.com/FCOO)

## Contact information

Niels Holt nho@fcoo.dk