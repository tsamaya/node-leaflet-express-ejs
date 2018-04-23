var L = require("leaflet");
var SunCalc = require("suncalc");
var LatLon = require("mt-latlon");
var jQuery = require('jquery');
var proxy = require('express-http-proxy');
var morgan = require('morgan')


var GeometryUtil = require("leaflet-geometryutil");

function getDirectionalLine(target, angle, distance) {
  // get position of the sun (azimuth and altitude) at today's sunrise
  var p1 = new LatLon(target[0], target[1]);
  var p2 = p1.destinationPoint(angle, distance);
  // create a red polyline from an array of LatLng points
  var latlngs = [
    [target[0], target[1]],
    [p2.lat(), p2.lon()]
  ];
  return latlngs;
}

var map = L.map('map').setView([53.3494, -1.5664], 12);
var target = [53.3797, -1.4744];
var times = SunCalc.getTimes(new Date(), target[0], target[1]);

var sunrisePos = SunCalc.getPosition(times.sunrise, target[0], target[1]);

// get sunrise azimuth in degrees
var sunriseAngle = sunrisePos.azimuth * 180 / Math.PI;

var aLine = getDirectionalLine(target, sunriseAngle, 10, "red");

var polyline = L.polyline(aLine, {
  color: 'red'
}).addTo(map);

function getPointsOnLine(map, aLine, steps){
  var aList = [];
  for (i=0; i<=10; i++){
    var P1 = GeometryUtil.interpolateOnLine(map, aLine, i*(1/steps));
    //console.log("P1", P1);
    L.marker(P1.latLng).addTo(map);
    aList.push(P1);
  }
  return aList;
}

var aPoints =  getPointsOnLine(map, aLine, 10);
jsondata = {"locations":aPoints.map(function(point){
  console.log('point', point);
  return {
          "latitude": point.latLng.lat,
          "longitude": point.latLng.lng
      };
})};
console.log("jsondata", JSON.stringify(jsondata))
console.log("jsondata",jsondata);
jQuery.ajax({
  type: "POST",
  //url: "/elevation/api/v1/lookup",
  url: "https://api.open-elevation.com/api/v1/lookup",
  dataType: "application/json",
  contentType: 'application/json',
  data:JSON.stringify(jsondata),//jsondata,
  success:function(data, textStatus) {
    console.log("returning", data, textStatus);
  },
  error:function(err){
    console.error(err);
  }
});


console.log("times.sunrise", times.sunrise, "sunrisePos", sunrisePos, "sunriseAngle", sunriseAngle);

var OpenStreetMap_Mapnik = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);



/*
const provider = new OpenStreetMapProvider();
const searchControl = new GeoSearchControl({
  provider: provider,
});

map.addControl(searchControl);*/
