// Example model

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var FleetSchema = new Schema({
  name: String,
  logo: String,
  address: String
});



mongoose.model('Fleet', FleetSchema);

