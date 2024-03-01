const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const app = express();
const PORT = 3000;
const UserModel = require('./model/users');
const BikeRatingModel = require('./model/bikeRatings');
const BikeModel = require('./model/bikes');
const bikeRouter = require('./routes/bikes');

// Define fetchBikeRankings middleware
const fetchBikeRankings = async (req, res, next) => {
  try {
    const bikeRankings = await BikeRatingModel.aggregate([
      {
        $group: {
          _id: "$bike",
          averageRating: { $avg: "$rating" },
          totalRatings: { $sum: 1 }
        }
      },
      {
        $sort: {
          averageRating: -1, // Sort by average rating descending
          totalRatings: -1   // If average ratings are equal, sort by total ratings descending
        }
      },
      {
        $lookup: {
          from: "bikefeatures",
          localField: "_id",
          foreignField: "_id",
          as: "bike"
        }
      },
      {
        $unwind: "$bike"
      }
    ]);
    res.locals.bikeRankings = bikeRankings;
    next();
  } catch (error) {
    console.error('Error fetching bike rankings:', error);
    res.locals.bikeRankings = []; // Set an empty array if there's an error
    next();
  }
};

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));

mongoose.connect('mongodb://localhost:27017/WiselyWheel', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB', err));

app.use('/api/bikefeatures', bikeRouter);

// Use fetchBikeRankings middleware
app.use(fetchBikeRankings);

// Routes
app.get('/', async (req, res) => {
  res.render('login_signup_form', { error: null }); // Pass null as error when rendering login/signup form initially
});

app.get('/index', async (req, res) => {
  try {
    const bikeRankings = res.locals.bikeRankings;
    const username = req.session.user ? req.session.user.username : null;
    res.render('index', { bikeRankings, username });
  } catch (error) {
    console.error('Error fetching bike rankings:', error);
    res.render('index', { bikeRankings: [], username: null, error: 'Error fetching bike rankings' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await UserModel.findOne({ username });

    if (!user) {
      return res.render('login_signup_form', { error: 'User not found. Please register.' });
    }

    if (password !== user.password) {
      return res.render('login_signup_form', { error: 'Incorrect password. Please try again.' });
    }

    req.session.user = user;

    res.redirect('/index');
  } catch (error) {
    console.error('Error during login:', error);
    res.render('login_signup_form', { error: 'An error occurred during login.' });
  }
});

app.post('/signup', async (req, res) => {
  const { username, password } = req.body;

  try {
    const existingUser = await UserModel.findOne({ username });
    if (existingUser) {
      return res.render('login_signup_form', { error: 'Username already exists.' });
    }

    const newUser = new UserModel({ username, password });
    await newUser.save();

    req.session.user = newUser;

    res.redirect('/index');
  } catch (error) {
    console.error('Error during signup:', error);
    res.render('login_signup_form', { error: 'An error occurred during signup.' });
  }
});

app.get('/logout', (req, res) => {
  
  req.session.destroy(err => {
    if (err) {
      
      console.error('Error destroying session:', err);
    }
    res.redirect('/');
  });
});

app.get('/compare', (req, res) => {
  if (!req.session.user) {
    res.redirect('/');
    return;
  }
  const username = req.session.user.username;
  res.render("Comparebike", { username });
});

app.get('/browse', (req, res) => {
  if (!req.session.user) {
    res.redirect('/');
    return;
  }
  const username = req.session.user.username;
  res.render("Browsebike", { username });
});

app.get('/aboutus', (req, res) => {
  if (!req.session.user) {
    res.redirect('/');
    return;
  }
  const username = req.session.user.username;
  res.render("aboutUs", { username });
});

app.get('/api/bikefeatures/brand/:brandName', async (req, res) => {
  const brandName = req.params.brandName;
  try {
    const bikes = await BikeModel.find({ brand: brandName });
    res.json(bikes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Route to handle displaying bike details
app.get('/bikeDetails', async (req, res) => {
  const bikeId = req.query.id;
  try {
    const bike = await BikeModel.findById(bikeId);
    if (!bike) {
      return res.status(404).json({ message: "Bike not found" });
    }
    const username = req.session.user ? req.session.user.username : 'User';

    // Fetch user's Rating for this Bike
    let userRating = null;
    if (req.session.user) {
      const userRatingObj = await BikeRatingModel.findOne({ bike: bikeId, user: req.session.user._id });
      if (userRatingObj) {
        userRating = userRatingObj.rating;
      }
    }

    res.render('bikeDetails', { bike, username, userRating }); // Pass the bike object, username, and userRating to the template
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/bikefeatures/price', async (req, res) => {
  const minPrice = parseInt(req.query.minPrice) || 0;
  const maxPrice = parseInt(req.query.maxPrice) || Infinity;
  try {
    const bikes = await BikeModel.find({ price: { $gte: minPrice, $lte: maxPrice } });
    res.json(bikes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/searchResults', async (req, res) => {
  const searchTerm = req.query.searchTerm.toLowerCase();
  try {
    const filteredBikes = await BikeModel.find({
      $or: [
        { brand: { $regex: searchTerm, $options: 'i' } }, // Case-insensitive search by brand
        { model: { $regex: searchTerm, $options: 'i' } }, // Case-insensitive search by model
        { type: { $regex: searchTerm, $options: 'i' } } // Case-insensitive search by type
      ]
    });


    const username = req.session.user ? req.session.user.username : null;
    res.render('searchResults', { searchResults: filteredBikes, searchTerm, username }); // Pass the filteredBikes, searchTerm, and username to the template
  } catch (error) {
    console.error('Error in /searchResults route:', error);
    res.status(500).render('error', { message: 'Internal Server Error' }); // Render an error page
  }
});

// Route to fetch bike rating for a specific bike
app.get('/api/bike/rating/:bikeId', async (req, res) => {
  const bikeId = req.params.bikeId;
  try {
    const bikeRating = await BikeRatingModel.findOne({ bike: bikeId });
    if (!bikeRating) {
      return res.status(404).json({ message: "Bike rating not found" });
    }
    res.json(bikeRating);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Route to post bike rating
app.post('/api/bike/rate', async (req, res) => {
  const { bikeId, rating } = req.body;
  const userId = req.session.user._id; // Assuming user ID is stored in the session

  try {
    // Check if the user is authenticated
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized. Please log in to rate bikes." });
    }

    // Update the rating if the user has already rated the bike, otherwise create a new rating entry
    let bikeRating = await BikeRatingModel.findOne({ bike: bikeId, user: userId });
    if (bikeRating) {
      bikeRating.rating = rating;
    } else {
      bikeRating = new BikeRatingModel({ bike: bikeId, user: userId, rating });
    }
    await bikeRating.save();

    res.json(bikeRating); // Return the updated or newly created rating
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
