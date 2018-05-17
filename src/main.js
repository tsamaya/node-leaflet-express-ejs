var L = require("leaflet");
var SunCalc = require("suncalc");
var LatLon = require("mt-latlon");
var jQuery = require('jquery');
var proxy = require('express-http-proxy');
var morgan = require('morgan')
var GeometryUtil = require("leaflet-geometryutil");

//require("leaflet-tilelayer");
require("leaflet-tilelayer-colorpicker");
require('leaflet-hotline')(L);


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

var map = L.map('map').setView([53.3494, -1.5664], 10);
var target = [53.3797, -1.4744];
var times = SunCalc.getTimes(new Date(), target[0], target[1]);

var sunrisePos = SunCalc.getPosition(times.sunrise, target[0], target[1]);

// get sunrise azimuth in degrees
var sunriseAngle = sunrisePos.azimuth * 180 / Math.PI;

var aLine = getDirectionalLine(target, sunriseAngle, 10, "red");

var polyline = L.polyline(aLine, {
  color: 'red'
}).addTo(map);




console.log("times.sunrise", times.sunrise, "sunrisePos", sunrisePos, "sunriseAngle", sunriseAngle);


function getHeightAtPoint(point, RGBLayer){
  var a = null;
  a = RGBLayer.getColor(point);
  
  var h = NaN;
  if (a !== null)
    h = Math.round(-10000 + (((a[0] * 256 * 256) + (a[1] * 256 )+ a[2]) * 0.1));
  return h;
}


var RGB_Terrain = L.tileLayer.colorPicker(
'https://api.mapbox.com/v4/mapbox.terrain-rgb/{z}/{x}/{y}.pngraw?access_token=pk.eyJ1Ijoic3RyZXRjaHlib3kiLCJhIjoiY2pmN3lieDgyMWtpcjJybzQyMDM1MXJ2aiJ9.d3ZCRlRRBklHjvuhHGtmtQ', {
  maxZoom: 15,
  attribution: '&copy; <a href="https://mapbox.com/">mapbox</a>'
}).addTo(map);

var OpenStreetMap_Mapnik = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
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


function getHeights(){
  console.log("aPoints",aPoints);
  var aLatLngs = [];
  var heights = [];
  
  for (i=0; i<aPoints.length; i++){
    aLatLngs[i]=[aPoints[i].latLng.lat, aPoints[i].latLng.lng];
    aLatLngs[i].push(getHeightAtPoint(new L.LatLng(aPoints[i].latLng.lat, aPoints[i].latLng.lng) ,RGB_Terrain, true));
    //console.log("aLatLngs[i]", aLatLngs[i]);
    heights.push(aLatLngs[i][2]);
  }
  console.log("heights",heights);
  
  //var hotlineLayer = L.hotline(aPoints, {}).addTo(map);

  
}
setTimeout(getHeights, 10000);
