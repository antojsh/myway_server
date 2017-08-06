var express = require("express"),
  router = express.Router(),
  mongoose = require("mongoose"),
  Fleet = mongoose.model("Fleet");

module.exports = function(app) {
  app.use("/fleet", router);
};

router.get("/", function(req, res, next) {
  Fleet.find({}, function(err, data) {
    if (!err) return res.send(data);
  });
});

router.post("/", (req, res) => {
  let fleetParams = req.body;
  let fleet = new Fleet(fleetParams);
  fleet.save((err, fleet) => {
    if (!err) res.send(fleet);
  });
});
