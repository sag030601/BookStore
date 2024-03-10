// const express = require("express");
// const app = express();
// const port = 5000;
// const multer = require("multer");
// const path = require("path");
// const fs = require("fs").promises;
// const Item = require("./model/booksModel");
// const mongoose = require("mongoose");
// const cors = require("cors");
// app.use(cors({
//     origin: "http://localhost:3000", // Update this with the actual origin of your React app
//     credentials: true,
//   }));

//   mongoose.connect("mongodb://localhost:27017/images", { useNewUrlParser: true, useUnifiedTopology: true })
//   .then(() => {
//     console.log("Connected to MongoDB");
//   })
//   .catch((error) => {
//     console.error("Error connecting to MongoDB:", error);
//   });

// const uploadFolderPath = path.join(__dirname, "uploads");

// // Configure multer for file uploads
// const storage = multer.memoryStorage();
// const upload = multer({ storage: storage });

// // Serve uploaded images as static files from the 'uploads' folder
// // Serve uploaded images as static files from the 'uploads' folder
// // app.use("/image", express.static(uploadFolderPath));

// // Express route for uploading an image and adding an item to the database
// app.post("/upload", upload.single("image"), async (req, res) => {
//   try {
//     const newItem = new Item({
//       title: req.body.title,
//       author: req.body.author,
//       description: req.body.description,
//       genre: req.body.genre,
//       img: {
//         data: req.file.buffer,
//         contentType: req.file.mimetype,
//       },
//       price: req.body.price,
//     });

//     await newItem.save();
//     res.send("Item added to the database.");
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Internal Server Error");
//   }
// });

// const sizeOf = require('image-size');

// app.get("/image/:itemId", async (req, res) => {
//   try {
//     const item = await Item.findById(req.params.itemId);
//     if (!item) {
//       return res.status(404).send("Image not found");
//     }

//     // Detect image dimensions (width and height) from the image data
//     const dimensions = sizeOf(Buffer.from(item.img.data, 'base64'));

//     // If image dimensions are detected, use them to set the content type
//     const contentType = dimensions ? `image/${dimensions.type}` : 'application/octet-stream';

//     // Set the content type and send the image data
//     res.type(contentType);
//     res.send(Buffer.from(item.img.data, 'base64'));
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Internal Server Error");
//   }
// });

// app.get("/images/:genre", async (req, res) => {
//     const { genre } = req.params;

//     try {
//       const items = await Item.find({ genre });
//       res.json(items);
//     } catch (error) {
//       console.error(error);
//       res.status(500).send("Internal Server Error");
//     }
//   });

// app.get("/", (req, res) => {
//   res.send("Hello, World!");
// });

// app.listen(port, () => {
//   console.log(`Server is running on http://localhost:${port}`);
// });




const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const cors = require("cors");
const crypto = require("crypto");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const sizeOf = require("image-size");

const User = require("./model/userModel");
const Item = require("./model/booksModel");

const app = express();
const PORT = 5000;

const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;

app.use(express.json());

// Generate a random secret key for session
const secretKey = crypto.randomBytes(32).toString("hex");

app.use(
  session({
    secret: secretKey,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60 * 60, // Session timeout in milliseconds (1 hour in this example)
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await User.findOne({ username }).exec();

      if (!user) {
        return done(null, false, { message: "Incorrect username." });
      }

      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return done(null, false, { message: "Incorrect password." });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    if (!user) {
      return done(null, false);
    }
    return done(null, user);
  } catch (error) {
    console.error("Error in deserializeUser:", error);
    done(error);
  }
});



mongoose.connect("mongodb://localhost:27017/MyAppDatabase", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const allowedOrigins = [
  "http://localhost:3000",
  "https://your-react-app-domain.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Registration route
app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if the username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Username already taken." });
    }

    // Create a new user
    const newUser = new User({ username, password });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully!" });
  } catch (err) {
    console.error("Error during registration:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Check login status using express-session
app.get("/checkLoginStatus", (req, res) => {
  if (req.isAuthenticated()) {
    return res.json({ loggedIn: true, user: req.user });
  } else {
    return res.json({ loggedIn: false });
  }
});

// Login route
app.post("/login", passport.authenticate("local"), (req, res) => {
  // const token = jwt.sign({ userId: req.user._id }, secretKey, {
  //   expiresIn: "1h",
  // });

  req.session.isLoggedIn = true;

  return res.status(200).json({ message: "Login successful!" });
});

// Image-related operations
const uploadFolderPath = path.join(__dirname, "uploads");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const newItem = new Item({
      title: req.body.title,
      author: req.body.author,
      description: req.body.description,
      genre: req.body.genre,
      img: {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      },
      price: req.body.price,
    });

    await newItem.save();
    res.send("Item added to the database.");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/image/:itemId", async (req, res) => {
  try {
    const item = await Item.findById(req.params.itemId).exec();
    if (!item) {
      return res.status(404).send("Image not found");
    }

    const dimensions = sizeOf(Buffer.from(item.img.data, "base64"));
    const contentType = dimensions
      ? `image/${dimensions.type}`
      : "application/octet-stream";

    res.type(contentType);
    res.send(Buffer.from(item.img.data, "base64"));
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/images/:genre", async (req, res) => {
  const { genre } = req.params;

  try {
    const items = await Item.find({ genre });
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
