import L from "leaflet";
import SunCalc from "suncalc";
import LatLon from "mt-latlon";
import jQuery from 'jquery';
import proxy from 'express-http-proxy';
import morgan from 'morgan';
import GeometryUtil from "leaflet-geometryutil";

import "leaflet-search"; //The place search
import "leaflet-openweathermap";
import "leaflet-tilelayer-colorpicker";
import 'leaflet-sidebar-v2';

// TODO : Move to full screen map?

import "font-awesome/css/font-awesome.css";
import "bootstrap/dist/css/bootstrap.css";
import "leaflet/dist/leaflet.css";
import "leaflet-search/dist/leaflet-search.min.css";
import "leaflet-sidebar-v2/css/leaflet-sidebar.css";

import PouchDB from "pouchdb";
import PouchAuth from "pouchdb-authentication";
PouchDB.plugin(PouchAuth);
//https://github.com/pouchdb/add-cors-to-couchdb

var db = new PouchDB('https://couchdb-c866ea.smileupps.com/', {skip_setup: true});

//https://pouchdb.com/getting-started.html
var local = new PouchDB('local_db');
local.sync(db, {live: true, retry: true}).on('error', console.log.bind(console));

//https://www.npmjs.com/package/pouchdb-authentication
//https://github.com/pouchdb-community/pouchdb-authentication/blob/master/docs/api.md#dbsignupusername-password--options--callback
//Just a demo signup call it will fail as there is already a user
db.signUp('batman', 'brucewayne', function (err, response) {
  if (err) {
    console.log(err);
    if (err.name === 'conflict') {
      // "batman" already exists, choose another username
    } else if (err.name === 'forbidden') {
      // invalid username
    } else {
      // HTTP error, cosmic rays, etc.
    }
  }
});

//demo login
db.logIn('batman', 'brucewayne', function (err, response) {
  if (err) {
    console.log(err);
    if (err.name === 'unauthorized' || err.name === 'forbidden') {
      // name or password incorrect
    } else {
      // cosmic rays, a meteor, etc.
    }
  }
});




//https://jjwtay.github.io/Leaflet.draw-box/ target box  drawing
// locate me https://www.npmjs.com/package/leaflet.locatecontrol
// geo search

//elevation inspiration  https://www.solwise.co.uk/wireless-elevationtool.html
// sun calc http://suncalc.net/

//TODO : find area
//TODO : draw box or segment / select point
//TODO: get elevations
// TODO : find sectors you can see from
// TODO : thind road / parks you should be able to see from
// TODO : get google street maps images in that direction

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

var map = L.map('map').setView([53.3494, -1.5664], 13);

//Add the address search 
map.addControl( new L.Control.Search({
    //layer: searchLayer,
    url: '//nominatim.openstreetmap.org/search?format=json&q={s}',
		jsonpParam: 'json_callback',
		propertyName: 'display_name',
		propertyLoc: ['lat','lon'],
		marker: L.circleMarker([0,0],{radius:30}),
		autoCollapse: true,
		autoType: false,
		minLength: 2
  }) );

// TODO : make target a singleton marker which can be moved / replaced on a search
var target = [53.3797, -1.4744];

// TODO : Drawsunset as well
var times = SunCalc.getTimes(new Date(), target[0], target[1]);
var sunrisePos = SunCalc.getPosition(times.sunrise, target[0], target[1]);
// get sunrise azimuth in degrees
var sunriseAngle = sunrisePos.azimuth * 180 / Math.PI;
var aLine = getDirectionalLine(target, sunriseAngle, 10, "red");

var polyline = L.polyline(aLine, {
  color: 'red'
}).addTo(map);

// TODO : put all this info in the sidebar
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

var OWM_APPID = "448c266078b9dbbd59af7d77257e11be";
var clouds = L.OWM.clouds({showLegend: false, opacity: 0.5, appId: OWM_APPID});
var wind = L.OWM.wind({opacity: 0.5,appId: OWM_APPID});
var rain = L.OWM.rain({opacity: 0.5,appId: OWM_APPID});
var temp = L.OWM.temperature({opacity: 0.5,appId: OWM_APPID});
  
  
var baseMaps = { "Height Map":RGB_Terrain};
var overlayMaps = {"OSM Mapnik": OpenStreetMap_Mapnik , "Clouds": clouds, "Wind":wind, "Rain":rain, "Temp":temp};
var layerControl = L.control.layers(baseMaps, overlayMaps).addTo(map);



var sidebar = L.control.sidebar({
    autopan: true,       // whether to maintain the centered map point when opening the sidebar
    closeButton: true,    // whether t add a close button to the panes
    container: 'sidebar', // the DOM container or #ID of a predefined sidebar container that should be used
    position: 'left',     // left or right
}).addTo(map);




function getPointsOnLine(map, aLine, steps){
  var aList = [];
  for (var i=0; i<=steps; i++){
    var P1 = GeometryUtil.interpolateOnLine(map, aLine, i*(1/steps));
    //console.log("P1", P1);
    //L.marker(P1.latLng).addTo(map);
    aList.push(P1);
  }
  return aList;
}

// TODO : Draw graph or a heatline indicating where you should be able to see the target from
var aPoints =  getPointsOnLine(map, aLine, 100);

// TODO : Change day
// TODO : save plans
// TODO : scan along thesunset line etc. for it crossing a road where the veiw should be good 
// TODO : Get google streetview of that point in the right direction

// TODO : Login/ Register
// TODO : Change height of view for drone photgraphy (a how high too fly for a view of ???)
// TODO : Droneflight safety data
// TODO : Flightplanning
// TODO : Light condition timings (nautical twilight etc.)

// TODO : Offline first flight/shootoinig plan data (and map flight safety data storage ??)
// TODO : pouchdb and couchdb

// TODO : Site reece recording

// TODO : Will in work on phone / tablet
// TODO : cordova if it will


function getHeights(){
  console.log("aPoints",aPoints);
  var aLatLngs = [];
  var heights = [];
  
  for (var i=0; i<aPoints.length; i++){
    aLatLngs[i]=[aPoints[i].latLng.lat, aPoints[i].latLng.lng];
    aLatLngs[i].push(getHeightAtPoint(new L.LatLng(aPoints[i].latLng.lat, aPoints[i].latLng.lng) ,RGB_Terrain, true));
    //console.log("aLatLngs[i]", aLatLngs[i]);
    heights.push(aLatLngs[i][2]);
  }
  console.log("heights",heights);
  
}
setTimeout(getHeights, 10000);
