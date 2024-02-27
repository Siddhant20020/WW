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
  const username = req.session.user ? req.session.user.username : 'User'; // Get the username from the session
  res.render('logout', { username }); // Render the logout page with the username
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
  const username = req.session.user ? req.session.user.username : 'User'; // Get the username from the session
  res.render('index', { bikeRankings: res.locals.bikeRankings, username: username });
});



app.get('/compare', (req, res) => {
  const username = req.session.user ? req.session.user.username : 'User';
  res.render("Comparebike", { username: username });
});

app.get('/browse', (req, res) => {
  const username = req.session.user ? req.session.user.username : 'User';
  res.render("Browsebike", { username: username });
});

app.get('/aboutus', (req, res) => {
  const username = req.session.user ? req.session.user.username : 'User';
  res.render("aboutUs", { username: username });
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

app.post('/api/bike/rate', async (req, res) => {
  try {
    const { bikeId, rating } = req.body;

    if (!req.session.user || !req.session.user._id) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }
    const userId = req.session.user._id;

    let bikeRating = await BikeRatingModel.findOne({ bike: bikeId, user: userId });

    if (bikeRating) {
      bikeRating.rating = rating;
    } else {

      bikeRating = new BikeRatingModel({
        bike: bikeId,
        user: userId,
        rating: rating
      });
    }

    await bikeRating.save();

    res.status(201).send('Rating submitted successfully');
  } catch (error) {
    console.error('Error submitting rating:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/api/bike/rankings', async (req, res) => {
  try {
    const bikeRankings = res.locals.bikeRankings || [];


    res.setHeader('Cache-Control', 'no-cache');


    const etag = generateETag(bikeRankings);


    res.setHeader('ETag', etag);

    res.json(bikeRankings);
  } catch (error) {
    console.error('Error fetching bike rankings:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


function generateETag(data) {
  const hash = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
  return `"${hash}"`;
}

app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
