// Example model

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
    type: [], // [<longitude>, <latitude>]
  }
});

//FleetSchema.index({ loc: '2dsphere' });

mongoose.model("Route", FleetSchema);
