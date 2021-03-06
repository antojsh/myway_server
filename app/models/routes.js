// Example model
var GeoJSON = require('mongoose-geojson-schema');
var mongoose = require("mongoose"),
  Schema = mongoose.Schema;

var FleetSchema = new Schema({
  fleet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Fleet"
  },
  name: String,
  photo: String,
  loc: {
    type: mongoose.Schema.Types.LineString,
    index: "2dsphere"
  },
});

//FleetSchema.index({ loc: '2dsphere' });

mongoose.model("Route", FleetSchema);
