import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import bcrypt from "bcryptjs";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB connection failed:", err));

// ✅ Define User Schema
const userSchema = new mongoose.Schema({
  nickname: String,
  email_or_phone: { type: String, unique: true },
  password: String,
});

const User = mongoose.model("User", userSchema);

// ✅ Register Route
app.post("/register", async (req, res) => {
  try {
    const { nickname, email_or_phone, password } = req.body;
    if (!nickname || !email_or_phone || !password) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const existingUser = await User.findOne({ email_or_phone });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ nickname, email_or_phone, password: hashedPassword });
    await newUser.save();

    res.json({ message: "Registration successful!" });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
});

// ✅ Login Route
app.post("/login", async (req, res) => {
  try {
    const { email_or_phone, password } = req.body;
    const user = await User.findOne({ email_or_phone });
    if (!user) return res.status(400).json({ error: "User not found." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid password." });

    res.json({ message: "Login successful!" });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
});

// ✅ Start Server
app.listen(process.env.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${process.env.PORT}`);
});
