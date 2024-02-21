const express = require('express');
const router = express.Router();
const BikeModel = require('../model/bikes');

router.get('/', async (req, res) => {
  try {
    const bikeFeatures = await BikeModel.find();
    res.json(bikeFeatures);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/compare', async (req, res) => {
  const { bikeIds } = req.body;

  try {
    const bikes = await Promise.all(bikeIds.map((bikeId) => BikeModel.findById(bikeId)));
    res.json(bikes);
  } catch (error) {
    console.error('Error comparing bikes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
