const mongoose = require('mongoose');
const bikefeatureSchema = new mongoose.Schema({
  "_id": "ObjectId",
  "variant_name": "String",
  "price": "Number",
  "engine_type": "String",
  "displacement": "String",
  "max_torque": "String",
  "no_of_cylinders": "String",
  "cooling_system": "String",
  "valve_per_cylinder": "String",
  "starting": "String",
  "fuel_supply": "String",
  "clutch": "String",
  "ignition": "String",
  "mileage": "String",
  "bodytype": "String",
  "zero_100Kmph_sec": "String",
  "peak_power": "String",
  "transmission": "String",
  "brand": "String",
  "url": "String"
});

const BikeFeature = mongoose.model('BikeFeature', bikefeatureSchema);

module.exports = BikeFeature;
