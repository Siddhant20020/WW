const mongoose = require('mongoose');

const bikefeatureSchema = new mongoose.Schema({
  "_id": "ObjectId",
  "variant_name": "String",
  "price": "Number",
  "engine_type": "String",
  "displacement": "Number",
  "max_torque": "String",
  "no_of_cylinders": "Number",
  "cooling_system": "String",
  "valve_per_cylinder": "Number",
  "reserve_fuel": "Number",
  "fuel_tank": "Number",
  "riding_range": "Number",
  "top_speed": "Number",
  "gearbox": "String",
  "bore": "Number",
  "stroke": "Number",
  "mileage": "Number",
  "bodytype": "String",
  "zeroto100Kmph_sec": "Number",
  "peak_power": "String",
  "kerb_weight": "Number",
  "compression_ratio": "String",
  "brand": "String",
  "url": "String"
});

const BikeFeature = mongoose.model('BikeFeature', bikefeatureSchema);

module.exports = BikeFeature;
