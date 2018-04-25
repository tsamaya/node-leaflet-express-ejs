var L = require("leaflet");
var SunCalc = require("suncalc");
var LatLon = require("mt-latlon");
var jQuery = require('jquery');
var proxy = require('express-http-proxy');
var morgan = require('morgan')
var GeometryUtil = require("leaflet-geometryutil");

L.TileLayer.ColorPickerWMS = L.TileLayer.WMS.extend({
  options: {
    crossOrigin: "anonymous"
  },
  getColor: function(latlng) {
    var size = this.getTileSize();
    var point = this._map.project(latlng, this._tileZoom).floor();
    var coords = point.unscaleBy(size).floor();
    var offset = point.subtract(coords.scaleBy(size));
    coords.z = this._tileZoom;
    var tile = this._tiles[this._tileCoordsToKey(coords)];
    if (!tile || !tile.loaded) return null;
    try {
      var canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      var context = canvas.getContext('2d');
      context.drawImage(tile.el, -offset.x, -offset.y, size.x, size.y);
      return context.getImageData(0, 0, 1, 1).data;
    } catch (e) {
      return null;
    }
  }
});
L.tileLayer.colorPickerWMS = function(url, options) {
  return new L.TileLayer.ColorPickerWMS(url, options);
};


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




console.log("times.sunrise", times.sunrise, "sunrisePos", sunrisePos, "sunriseAngle", sunriseAngle);


dtmOptions = {
  "layers":"LIDAR-DTM-TSR-2M-ENGLAND-EA-WMS",
  "format":"image/png"
}
var dtmLayer = L.tileLayer.colorPickerWMS('http://environment.data.gov.uk/ds/wms?SERVICE=WMS&INTERFACE=ENVIRONMENT&LC=4400000000000000000000000000000&', dtmOptions).addTo(map);



dsmOptions = {
  "layers":"LIDAR-DSM-TSR-2M-ENGLAND-EA-WMS",
  "format":"image/png"

}
var dsmLayer = L.tileLayer.colorPickerWMS('http://environment.data.gov.uk/ds/wms?SERVICE=WMS&INTERFACE=ENVIRONMENT&LC=4400000000000000000000000000000&', dsmOptions).addTo(map);

function isFullOn(element, index, array) {
  return element == 255;
}

aWhite = new Uint8Array(4);
aWhite.set( [ 255, 255, 255, 255 ]);

function isWhite(array){
  return false;
  aFull = array.filter(isFullOn)
  return 4 == aFull.length
}

function getHeightAtPoint(point, dsm, dtm, bDSM){

  var a = null;
  if(bDSM){
    a = dsm.getColor(point);
    if (isWhite(a)){
      a = null;
    }
  }
  if (a == null){
    a = dtm.getColor(point);
    if (isWhite(a)){
      a = null;
    }
  }

  var h = NaN;
  if (a !== null)
    h = -10000 + (((a[0] * 256 * 256) + (a[1] * 256 )+ a[2]) * 0.001);
  return h;
}


/*function getHeightAtPoint(point, dsm, dtm, bDSM){
  aWhite = new Uint8Array(4);
  aWhite.set( [ 255, 255, 255, 255 ]);
  var a = null;
  if(bDSM){
    a = dsm.getColor(point);
    if (isWhite(a)){
      a = null;
    }
  }
  if (a == null){
    a = dtm.getColor(point);
    if (isWhite(a)){
      a = null;
    }
  }

  var h = NaN;
  if (a !== null)
    h = -10000 + (((a[0] * 256 * 256) + (a[1] * 256 )+ a[2]) * 0.1);
  return h;
}

*/
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
  heights = [];
  for (i=0; i<aPoints.length; i++){
    heights.push(getHeightAtPoint(new L.LatLng(aPoints[i].latLng.lat, aPoints[i].latLng.lng) ,dsmLayer, dtmLayer, true));
  }
  console.log("heights",heights);
}
setTimeout(getHeights, 10000);

/*jsondata = {"locations":aPoints.map(function(point){
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
*/


/*
const provider = new OpenStreetMapProvider();
const searchControl = new GeoSearchControl({
  provider: provider,
});

map.addControl(searchControl);*/
