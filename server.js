const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use("/uploads", express.static(path.join(__dirname, "/uploads")));

// this is for connection with mongoatlas
mongoose
  .connect(process.env.MONGOURL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("Error connecting to MongoDB:", err));

// Schema define here
const documentSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  fileType: {
    type: String,
    enum: ["image/jpeg", "image/png", "application/pdf"],
    required: true,
  },
  filePath: { type: String, required: true },
});

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  residentialAddress: {
    street1: { type: String },
    street2: { type: String },
  },
  permanentAddress: {
    street1: { type: String },
    street2: { type: String },
  },
  isSameAsResidential: { type: Boolean },
  documents: [documentSchema],
});

const User = mongoose.model("XiComform", userSchema);

//upload prt start here
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}


// Multer  login for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

//  upload part end

app.get("/getFormData", async (req, res) => {
  try {
    let data = await User.find();
    res.status(200).json({
      message: "Successfully fetched",
      data: data,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching form data", error });
  }
});

app.post("/submit", upload.array("documents", 10), async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      dateOfBirth,
      residentialAddress,
      permanentAddress,
      isSameAsResidential,
    } = req.body;

    const dob = new Date(dateOfBirth);
    const age = new Date().getFullYear() - dob.getFullYear();
    if (age < 18)
      return res.status(400).json({ message: "Age must be 18 or older" });

    const documents = req.files.map((file) => {
      return {
        fileName: file.originalname,
        fileType: file.mimetype,
        filePath: `/uploads/${file.filename}`,
      };
    });

    const user = new User({
      firstName,
      lastName,
      email,
      dateOfBirth,
      residentialAddress: JSON.parse(residentialAddress),
      permanentAddress:
        isSameAsResidential === "true" ? null : JSON.parse(permanentAddress),
      isSameAsResidential: isSameAsResidential === "true",
      documents: documents,
    });

    await user.save();
    res.status(200).json({ message: "User submitted successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Error submitting user data", error });
  }
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
