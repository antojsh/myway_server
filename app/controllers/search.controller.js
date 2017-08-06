"use strict";
var express = require("express"),
  router = express.Router(),
  mongoose = require("mongoose"),
  Fleet = mongoose.model("Fleet"),
  Route = mongoose.model("Route");
const Graph = require('node-dijkstra')
const turf = require('turf');
// Route.find({}, function(err, routes) {
//   if (!err)
//     routes.forEach(function(element, index, array) {
//       for (var i = 0; i < element.loc.length; i++) {
//         for (var j = element.loc.length - 1; j >= 0; j--) {
//           training.push({
//             input: {
//               olat: element.loc[i][0],
//               olng: element.loc[i][1],
//               dlat: element.loc[j][0],
//               dlng: element.loc[j][1]
//             },
//             output: element._id
//           });
//         }
//       }
//       itemsProcessed++;
//       if (itemsProcessed === array.length) {
//         var MyWinnow = limdu.classifiers.Winnow.bind(0, { retrain_count: 10 });

//         var intentClassifier = new limdu.classifiers.multilabel
//           .BinaryRelevance({
//           binaryClassifierType: MyWinnow
//         });

//         intentClassifier.trainBatch(training);
//       }
//     }, this);
// });

// create a DataSet and add test items to appropriate categories
// this is 'curated' data for training

module.exports = function (app) {
  app.use("/search", router);
};

function findNear(coors, limit, maxDistance, type) {
  coors = coors.map(Number)
  //console.log(coors)
  return new Promise(function (res, rej) {
    Route.find({
      loc: {
        $near: coors,
        $maxDistance: maxDistance
      }
    }
    )
      .lean()
      //.select("name photo")
      .limit(limit)
      .exec(function (err, locations) {
        if (err) {
          rej(err);
        }
        //console.log(locations)

        // let rutasEncontradas = locations
        // var targetPoint = turf.point([coors[0], coors[1]]);

        // for (var i = 0; i < rutasEncontradas.length; i++) {
        //   let point = []
        //   if (rutasEncontradas[i].loc)
        //     for (var j = 0; j < rutasEncontradas[i].loc.length; j++) {
        //       point.push(turf.point([rutasEncontradas[i].loc[j][0], rutasEncontradas[i].loc[j][1]]))
        //     }
        //   var points = turf.featureCollection(point);
        //   var nearest = turf.nearest(targetPoint, points);

        //   rutasEncontradas[i]['near_position_' + type] = rutasEncontradas[i].loc.findIndex((x) => {
        //     return x[0] == nearest.geometry.coordinates[0]
        //   });
        //   rutasEncontradas[i][type] = nearest.geometry.coordinates;
        //   rutasEncontradas[i].type = type
        //   //console.log(rutasEncontradas[i].near_position )
        //   //console.log(type)
        // }
        // //console.log(rutasEncontradas[0].near)
        res(locations);
      });
  });
}
router.get("/:origin/:destination", function (req, res, next) {
  let maxDistance = req.params.distance || 1000;
  maxDistance /= 6371;

  let limit = 3;

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

      res.json(findTheBestNearPosition(filterRoutes, origin, destination))

      //executeGrafo(filterRoutes, res)
    }).catch(err => {
      console.log(err)
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


function executeGrafo(routes, res) {
  let finalGraph = []
  let resultGraph = {}
  for (var i = 0; i < routes.length; i++) {

    let countLoc = routes[i].loc.length
    //console.log(countLoc)
    for (var j = 0; j < countLoc; j++) {
      if (j == countLoc - 1) break;

      var from = turf.point([routes[i].loc[j][0], routes[i].loc[j][1]]);
      var to = turf.point([routes[i].loc[j + 1][0], routes[i].loc[j + 1][1]]);

      var distance = turf.distance(from, to, "kilometers");
      if (parseInt(distance * 1000) !== 0) {
        let next = {}
        next[j + 1] = parseInt(distance * 1000)
        resultGraph[j] = next
      }
    }
    let route = new Graph(resultGraph);

    let RooutePosible = {
      graph: route.path(String(routes[i].near_position_origin), String(routes[i].near_position_destination), { cost: true }),
      route: routes[i]
    }

    console.log("ANTIGUA " + RooutePosible.route.near_position_destination);
    RooutePosible.route.near_position_destination = optimizeRoute(RooutePosible)
    // console.log("LA QUE DEVUELVE "+optimizeRoute(RooutePosible))
    // console.log('La nueva '+RooutePosible.route.near_position_destination)
    console.log('NUEVA ' + RooutePosible.route.near_position_destination)
    finalGraph.push(RooutePosible)

  }
  res.json(finalGraph)
}

function findTheBestNearPosition(routes, origin, destination) {

  let rutasEncontradas = routes
  var targetPointOrigin = turf.point([origin[0], origin[1]]);
  var targetPointDestination = turf.point([destination[0], destination[1]]);

  for (var i = 0; i < rutasEncontradas.length; i++) {
    let points = []

    if (rutasEncontradas[i].loc)
      for (var j = 0; j < rutasEncontradas[i].loc.length; j++) {
        points.push(turf.point([rutasEncontradas[i].loc[j][0], rutasEncontradas[i].loc[j][1]]))
      }

    let pointsTurf = turf.featureCollection(points);
    let nearestOrigin = turf.nearest(targetPointOrigin, pointsTurf);
    let nearestDestination = turf.nearest(targetPointDestination, pointsTurf);


    let indexNearOrigin = rutasEncontradas[i].loc.findIndex((x) => {
      return x[0] == nearestOrigin.geometry.coordinates[0]
    });

    let indexNearDestination = rutasEncontradas[i].loc.findIndex((x) => {
      return x[0] == nearestDestination.geometry.coordinates[0]
    });



    let _indexNearOrigin = indexNearOrigin;
    let _indexNearDestination = indexNearDestination

    console.log('ANTIGUO ORIGIN ' + _indexNearOrigin)
    console.log('ANTIGUO DESTINATION ' + _indexNearDestination)
    if (_indexNearOrigin > _indexNearDestination) {
      optimizeRoute(rutasEncontradas[i], function (err, optimize) {
        if (!err) {
          _indexNearOrigin = optimize.origin
          _indexNearDestination = optimize.destination
          console.log('PARCIAL ' + _indexNearOrigin)
        }


      })

    }
    console.log('NUEVA ORIGIN ' + _indexNearOrigin)
    console.log('NUEVA DESTINATION  ' + _indexNearDestination)


    rutasEncontradas[i]['near_position_origin'] = _indexNearOrigin
    rutasEncontradas[i]['near_position_destination'] = _indexNearDestination

  }


  return rutasEncontradas;
}




function optimizeRoute(route, callback) {
  let menor;
  let posiblesDestination = []
  let posiblesOrigin = []
  let coordsFinla;
  try {

    var fromDestination = turf.point([route.loc[parseInt(route.near_position_destination)][0], route.loc[parseInt(route.near_position_destination)][1]]);
    var fromOrigin = turf.point([route.loc[parseInt(route.near_position_origin)][0], route.loc[parseInt(route.near_position_origin)][1]]);

    for (var i = 0; i < route.loc.length; i++) {
      var to = turf.point([route.loc[i][0], route.loc[i][1]]);
      var distanceDestination = parseInt(turf.distance(fromDestination, to, "miles") * 1000)
      var distanceOrigin = parseInt(turf.distance(fromOrigin, to, "miles") * 1000)

      //console.log(distanceOrigin)
      if (distanceDestination < 60) {
        //console.log('distanceDestination')
        posiblesDestination.push({
          position: route.loc.findIndex((x) => {
            return x == route.loc[i]
          }), distance: distanceDestination
        });
      }
      if (distanceOrigin < 60) {
        //console.log('distanceOrigin')
        posiblesOrigin.push({
          position: route.loc.findIndex((x) => {
            return x == route.loc[i]
          }), distance: distanceOrigin
        });
      }
    }



    posiblesOrigin = posiblesOrigin.sort(function (a, b) {
      return parseFloat(a.distance) - parseFloat(b.distance);
    });

    posiblesOrigin.forEach(function (element) {
      if (element.destination < route.near_position_destination) {
        route.near_position_origin = element.position;
        callback(false, { origin: element.position, destination: route.near_position_destination })
        return;
      }
    }, this);


  } catch (err) {

    callback(err)
  }


  return { origin: route.near_position_origin, destination: route.near_position_destination };
}





