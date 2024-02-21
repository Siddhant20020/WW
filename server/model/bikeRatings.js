const mongoose = require('mongoose');

const bikeRatingSchema = new mongoose.Schema({
    bike: { type: mongoose.Schema.Types.ObjectId, ref: 'Bike', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 }
});

const BikeRatingModel = mongoose.model('BikeRating', bikeRatingSchema);

module.exports = BikeRatingModel;
