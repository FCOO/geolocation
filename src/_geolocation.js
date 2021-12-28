/****************************************************************************
	geolocation.js, 

	(c) 2021, FCOO

	https://github.com/FCOO/geolocation
	https://github.com/FCOO

****************************************************************************/

(function ($, window, document, undefined) {
	"use strict";
	
	//Create fcoo-namespace
	window.fcoo = window.fcoo || {};

	//If fcoo.namespace() is defined create a name-space
	var ns = window.fcoo.namespace ? window.fcoo.namespace(''/*Enter the fcoo-namespace here*/) : window.fcoo; 
	//or var ns = window;

	var plugin_count = 1000;

	function Geolocation( $elem, options, plugin_count) {
		this.plugin_count = plugin_count;
		this.VERSION = "{VERSION}";
		this.options = $.extend({
			//Default options
		}, options || {} );


		//If Geolocation is a extention of class "ParentClass" include the next line 
		//window.ParentClass.call(this, input, options, plugin_count );

	
	}
  
  // expose access to the constructor
  ns.Geolocation = Geolocation;


	//geolocation as jQuery prototype
	$.fn.geolocation = function (options) {
		return this.each(function() {
			if (!$.data(this, "geolocation"))
				$.data(this, "geolocation", new window.Geolocation(this, options, plugin_count++));
		});
	};


	//Extend the prototype
	ns.Geolocation.prototype = {

		//myMethod
		myMethod: function( /*arg1, arg2*/ ){
		},
		


	};

	//If Geolocation is a extention of class "ParentClass" include the next line 
	//window.Geolocation.prototype = $.extend( {}, window.ParentClass.prototype, window.Geolocation.prototype );


	/******************************************
	Initialize/ready 
	*******************************************/
	$(function() { //"$( function() { ... });" is short for "$(document).ready( function(){...});"

	
	}); //End of initialize/ready
	//******************************************



}(jQuery, this, document));