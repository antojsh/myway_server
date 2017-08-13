"use strict";
var express = require("express"),
  router = express.Router(),
  mongoose = require("mongoose"),
  Fleet = mongoose.model("Fleet"),
  Route = mongoose.model("Route");
// const Graph = require('node-dijkstra')
const turf = require('turf');

module.exports = function (app) {
  app.use("/search", router);
};

function findNear(coors, limit, maxDistance, type) {
  coors = coors.map(Number)
  //console.log(coors)
  return new Promise(function (res, rej) {
    Route.find({
      loc: {
        $near:
        {
          $geometry: {
            type: "Point",
            coordinates: coors
          },
          $maxDistance: 160

        }
      }
    }
    )
      .lean()
      //.select("name photo")
      .populate('fleet')
      .limit(limit)
      .exec(function (err, locations) {
        if (err) {
          rej(err);
        }
        console.log(locations)

        res(locations);
      });
  });
}
router.get("/:origin/:destination", async function (req, res, next) {
  let maxDistance = req.params.distance || 10;
  maxDistance /= 6371;

  let limit = 5;

  let origin = req.params.origin.split(",");
  let destination = req.params.destination.split(",");



  try {
    Promise.all([
      findNear(origin, limit, maxDistance, 'origin'),
      findNear(destination, limit, maxDistance, 'destination')
    ]).then(values => {

      let filterRoutes = []
      for (var i = 0; i < values[0].length; i++) {
        for (var j = 0; j < values[1].length; j++) {
          if (values[0][i]._id == values[1][j]._id)
            values[0][i]['destination'] = values[1][j].destination
          values[0][i]['near_position_destination'] = values[1][j].near_position_destination
          filterRoutes.push(values[0][i])
          break;
        }
      }
      findTheBestNearPosition(filterRoutes, origin, destination, function (data) {
        data.forEach(function (route) {
          let Distance = null;
          for (var i = route.near_position_origin; i < route.near_position_destination; i++) {

            var from = turf.point([route.loc.coordinates[i][0], route.loc.coordinates[i][1]]);
            var to = turf.point([route.loc.coordinates[i + 1][0], route.loc.coordinates[i + 1][1]]);
            Distance += parseInt(turf.distance(from, to, "miles") * 1000)

          }
          route['distance'] = Distance;
        });

        data = data.sort(function (a, b) {
          return parseFloat(a.distance) - parseFloat(b.distance);
        });
        res.json(data)
      });


      //executeGrafo(filterRoutes, res)
    }).catch(err => {
      console.log("PROMSESA PCINCIOAL " + err)
      res.status(500).send(err);
    })
  } catch (err) {
    console.log(err)
    res.status(500).send(err);
  }


});

router.get('/center/:origin/:destination', (req, res) => {
  let origin = req.params.origin.split(",").map(Number)
  let destination = req.params.destination.split(",").map(Number)


  res.json(middlePoint(origin[0], origin[1], destination[0], destination[1]))


})



if (typeof (Number.prototype.toRad) === "undefined") {
  Number.prototype.toRad = function () {
    return this * Math.PI / 180;
  }
}

//-- Define degrees function
if (typeof (Number.prototype.toDeg) === "undefined") {
  Number.prototype.toDeg = function () {
    return this * (180 / Math.PI);
  }
}
function middlePoint(lat1, lng1, lat2, lng2) {

  //-- Longitude difference
  var dLng = (lng2 - lng1).toRad();

  //-- Convert to radians
  lat1 = lat1.toRad();
  lat2 = lat2.toRad();
  lng1 = lng1.toRad();

  var bX = Math.cos(lat2) * Math.cos(dLng);
  var bY = Math.cos(lat2) * Math.sin(dLng);
  var lat3 = Math.atan2(Math.sin(lat1) + Math.sin(lat2), Math.sqrt((Math.cos(lat1) + bX) * (Math.cos(lat1) + bX) + bY * bY));
  var lng3 = lng1 + Math.atan2(bY, Math.cos(lat1) + bX);

  //-- Return result
  return [lng3.toDeg(), lat3.toDeg()];
}




async function findTheBestNearPosition(routes, origin, destination, callback) {

  let rutasEncontradas = routes
  var targetPointOrigin = turf.point([origin[0], origin[1]]);
  var targetPointDestination = turf.point([destination[0], destination[1]]);

  for (var i = 0; i < rutasEncontradas.length; i++) {
    let points = []

    if (rutasEncontradas[i].loc)
      for (var j = 0; j < rutasEncontradas[i].loc.coordinates.length; j++) {
        points.push(turf.point([rutasEncontradas[i].loc.coordinates[j][0], rutasEncontradas[i].loc.coordinates[j][1]]))

      }

    let pointsTurf = turf.featureCollection(points);
    let nearestOrigin = turf.nearest(targetPointOrigin, pointsTurf);
    let nearestDestination = turf.nearest(targetPointDestination, pointsTurf);


    let indexNearOrigin = rutasEncontradas[i].loc.coordinates.findIndex((x) => {
      return x[0] == nearestOrigin.geometry.coordinates[0]
    });

    let indexNearDestination = rutasEncontradas[i].loc.coordinates.findIndex((x) => {
      return x[0] == nearestDestination.geometry.coordinates[0]
    });




    rutasEncontradas[i]['near_position_origin'] = indexNearOrigin
    rutasEncontradas[i]['near_position_destination'] = indexNearDestination
    console.log('********************************************************')
    console.log("ANTIGUO ORIGEN " + rutasEncontradas[i]['near_position_origin'])
    console.log("ANTIGUO DESTINO " + rutasEncontradas[i]['near_position_destination'])
    // if (rutasEncontradas[i]['near_position_origin'] > rutasEncontradas[i]['near_position_destination']) {

    if (rutasEncontradas[i]['near_position_origin'] > rutasEncontradas[i]['near_position_destination']) {
      let routesOpimizet = await optimizeRoute(rutasEncontradas[i], destination)
      rutasEncontradas[i]['near_position_origin'] = routesOpimizet.origin
      rutasEncontradas[i]['near_position_destination'] = routesOpimizet.destination
    }
    //  }
    console.log("NUEVO ORIGEN " + rutasEncontradas[i]['near_position_origin'])
    console.log("NUEVO DESTINO " + rutasEncontradas[i]['near_position_destination'])
    console.log('************************************************************')
    console.log(rutasEncontradas[i])

  }
  callback(rutasEncontradas)

}




async function optimizeRoute(route, user_destination) {
  return new Promise(function (res, rej) {
    let menor;
    let posiblesDestination = []
    let posiblesOrigin = []
    let coordsFinla;


    var fromDestination = turf.point([route.loc.coordinates[parseInt(route.near_position_destination)][0], route.loc.coordinates[parseInt(route.near_position_destination)][1]]);
    var fromOrigin = turf.point([route.loc.coordinates[parseInt(route.near_position_origin)][0], route.loc.coordinates[parseInt(route.near_position_origin)][1]]);

    for (var i = 0; i < route.loc.coordinates.length; i++) {
      var to = turf.point([route.loc.coordinates[i][0], route.loc.coordinates[i][1]]);
      var distanceDestination = parseInt(turf.distance(fromDestination, to, "miles") * 1000)
      var distanceOrigin = parseInt(turf.distance(fromOrigin, to, "miles") * 1000)

      //console.log(distanceOrigin)
      if (distanceDestination < 30 && distanceDestination != 0) {
        //console.log('distanceDestination')
        posiblesDestination.push({
          position: route.loc.coordinates.findIndex((x) => {
            return x == route.loc.coordinates[i]
          }), distance: distanceDestination
        });
      }
      if (distanceOrigin < 30 && distanceOrigin != 0) {
        //console.log('distanceOrigin')
        posiblesOrigin.push({
          position: route.loc.coordinates.findIndex((x) => {
            return x == route.loc.coordinates[i]
          }), distance: distanceOrigin
        });
      }
    }


    //console.log(posiblesOrigin)
    posiblesOrigin = posiblesOrigin.sort(function (a, b) {
      return parseFloat(a.distance) - parseFloat(b.distance);
    });

    posiblesOrigin.forEach(function (element) {
      if (element.position < route.near_position_destination) {
        //console.log(element.position)
        route.near_position_origin = element.position;
        return;
      }
    }, this);


    posiblesDestination = posiblesDestination.sort(function (a, b) {
      return parseFloat(a.distance) + parseFloat(b.distance);
    });
    // OPTIMIZE DESTINATION
    let Destination = [];
    posiblesDestination.forEach(function (element, i) {
      let resta = element.position - route.near_position_origin
      console.log(resta)
      if (resta > 0)

        Destination.push({
          resta: resta,
          position: element.position
        })
    });

    console.log('RESTA')
    console.log(Destination)

    Destination = Destination.sort(function (a, b) {
      return a.resta - b.resta;
    })

    let MenosDistance = []
    for (var i = 0; i < Destination.length; i++) {
      var from = turf.point([user_destination[0], user_destination[i]]);
      var to = turf.point([route.loc.coordinates[Destination[i].position][0], route.loc.coordinates[Destination[i].position][1]]);
      var distanceDestination = parseInt(turf.distance(from, to, "miles") * 1000)
      MenosDistance.push({
        distance: distanceDestination,
        position: Destination[i].position
      })
    }
    console.log('MENOS DISTANCE')
    console.log(MenosDistance)
    MenosDistance = MenosDistance.sort(function (a, b) {
      return a.distance - b.distance
    })

    if (MenosDistance.length > 0)
      route.near_position_destination = MenosDistance[0].position
    console.log('LO QUE RETORNA LA PROMESA origin ' + route.near_position_origin + '  DESTINATION ' + route.near_position_destination)
    res({ origin: route.near_position_origin, destination: route.near_position_destination })

  })


}





