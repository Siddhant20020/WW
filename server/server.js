const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;
const UserModel = require('./model/users');
const BikeRatingModel = require('./model/bikeRatings');
const BikeModel = require('./model/bikes');
const bikeRouter = require('./routes/bikes');

// Middleware function to fetch bike rankings
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
        $lookup: {
          from: "bikefeatures",
          localField: "_id",
          foreignField: "_id",
          as: "bike"
        }
      },
      {
        $unwind: "$bike"
      },
      {
        $sort: { totalRatings: -1 }
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

// Register the middleware to fetch bike rankings
app.use(fetchBikeRankings);

// Landing page route (login/signup)
app.get('/', (req, res) => {
  if (req.session.user) {
    res.render('index', { bikeRankings: res.locals.bikeRankings });
  } else {
    res.render('login_signup_form', { error: null });
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
    res.status(500).json({ error: 'An error occurred during login.' });
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
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ error: 'An error occurred during logout.' });
    }
    res.redirect('/');
  });
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.get('/signup', (req, res) => {
  res.render('login_signup_form');
});

app.get('/index', (req, res) => {
  res.render('index', { bikeRankings: res.locals.bikeRankings });
});

app.get('/compare', (req, res) => {
  res.render("Comparebike");
});

app.get('/browse', (req, res) => {
  res.render("Browsebike");
});
app.get('/aboutus', (req, res) => {
  res.render("aboutUs")
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
    res.render('bikeDetails', { bike: bike }); // Pass the bike object directly to the template
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
        { brand: { $regex: searchTerm, $options: 'i' } },
        { variant_name: { $regex: searchTerm, $options: 'i' } }
      ]
    });
    res.render('searchResults', { searchResults: filteredBikes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Route to handle rating submission
app.post('/api/bike/rate', async (req, res) => {
  try {
    const { bikeId, rating } = req.body;

    // Check if user is authenticated and user id exists
    if (!req.session.user || !req.session.user._id) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }

    const userId = req.session.user._id;

    // Check if the user has already rated this bike
    let bikeRating = await BikeRatingModel.findOne({ bike: bikeId, user: userId });

    // If the user has already rated the bike, update the existing rating
    if (bikeRating) {
      bikeRating.rating = rating;
    } else {
      // Otherwise, create a new instance of BikeRating
      bikeRating = new BikeRatingModel({
        bike: bikeId,
        user: userId,
        rating: rating
      });
    }

    // Save the rating to the database
    await bikeRating.save();

    res.status(201).send('Rating submitted successfully');
  } catch (error) {
    console.error('Error submitting rating:', error);
    res.status(500).send('Internal Server Error');
  }
});
// Route to get bike rankings based on popularity
app.get('/api/bike/rankings', async (req, res) => {
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

    // Sort the bike rankings based on average rating (descending order)
    bikeRankings.sort((a, b) => b.averageRating - a.averageRating);

    res.json(bikeRankings);
  } catch (error) {
    console.error('Error fetching bike rankings:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});




app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
