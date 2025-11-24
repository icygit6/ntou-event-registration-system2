// backend/index.js
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;
const SECRET_KEY = '9e7ae63e6d9e3654139277c630af4973';
const { MongoClient } = require('mongodb');
const app = express();
const port = 5500;

app.use(cors());
app.use(express.json());

const client = new MongoClient('mongodb://127.0.0.1:27017');
const dbName = 'eventRegistration';
let db;

// Connect to MongoDB
async function connectDB() {
    try {
        await client.connect();
        db = client.db(dbName);
        console.log(`Connected to DB: ${dbName}`);
    } catch (err) {
        console.error("❌ Database connection failed:", err);
        process.exit(1); // stop if DB fails
    }
}

// Wait for DB connection before starting server
connectDB().then(() => {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}).catch(err => {
    console.error("❌ Could not start server:", err);
});

// ---------- Endpoint to get next incremental ID ----------
app.get('/nextId', async (req, res) => {
    try {
        const result = await db.collection('counters').findOneAndUpdate(
            { _id: 'userId' },
            { $inc: { seq: 1 } },
            { returnDocument: 'after', upsert: true }
        );

        let nextId;
        if (result.value && typeof result.value.seq === 'number') {
            nextId = result.value.seq;
        } else {
            const doc = await db.collection('counters').findOne({ _id: 'userId' });
            nextId = doc.seq;
        }

        res.json({ nextId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to get next ID' });
    }
});

// ---------- Register endpoint ----------
app.post('/register', async (req, res) => {
    try {
        const { id, nickname, email_or_phone, password } = req.body;

        // Check if email or phone already exists
        const existingUser = await db.collection('users').findOne({ email: email_or_phone });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Get next user ID
        if (!id || !nickname || !email_or_phone || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const role = 'user';
        const created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const newUser = {
            id,
            name: nickname,
            email: email_or_phone,
            password_hash: hashedPassword,
            role,
            created_at
        };

        const result = await db.collection('users').insertOne(newUser);

        console.log('User registered successfully:', result.insertedId);
        res.json({ message: 'Registration successful', id: result.insertedId });

    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// -------------Sign In Endpoint-------------
app.post('/signin', async (req, res) => {
    try {
        const { email_or_phone, password } = req.body;

        const user = await db.collection('users').findOne({ email: email_or_phone });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ error: 'Incorrect password' });

        // Create JWT token (valid for 1 hour)
        const token = jwt.sign(
            { email: user.email, name: user.name, id: user.id, role: user.role },
            SECRET_KEY,
            { expiresIn: '1h' }
        );

        res.json({ message: 'Sign In successful', token});
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ---------- Middleware to verify JWT token ----------
function verifyToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// ---------- Get all events ----------
app.get('/events', async (req, res) => {
    try {
        const events = await db.collection('events').find({}).toArray();
        res.json(events);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

// ---------- Get single event by ID ----------
app.get('/events/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const event = await db.collection('events').findOne({ id: parseInt(id) });
        if (!event) return res.status(404).json({ error: 'Event not found' });
        res.json(event);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch event' });
    }
});

// ---------- Create new event ----------
app.post('/events', verifyToken, async (req, res) => {
    try {
        const { title, date, location, description } = req.body;

        if (!title || !date || !location) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Get next event ID
        const counter = await db.collection('counters').findOneAndUpdate(
            { _id: 'eventId' },
            { $inc: { seq: 1 } },
            { returnDocument: 'after', upsert: true }
        );

        let eventId;
        if (counter.value && typeof counter.value.seq === 'number') {
            eventId = counter.value.seq;
        } else {
            const doc = await db.collection('counters').findOne({ _id: 'eventId' });
            eventId = doc.seq;
        }

        const newEvent = {
            id: eventId,
            title,
            date,
            location,
            description: description || '',
            createdBy: req.user.id,
            createdAt: new Date().toISOString()
        };

        const result = await db.collection('events').insertOne(newEvent);
        console.log('Event created with id:', eventId);
        res.json({ message: 'Event created successfully', id: eventId, ...newEvent });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create event' });
    }
});

// ---------- Update event ----------
app.put('/events/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, date, location, description } = req.body;
        if (!title || !date || !location) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const updateData = {
            title,
            date,
            location,
            description: description || '',
            updatedAt: new Date().toISOString()
        };
        
        const result = await db.collection('events').findOneAndUpdate(
            { id: parseInt(id) },
            { $set: updateData },
            { returnDocument: 'after' }
        );

        if (!result) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Return the updated document under an `event` key instead of spreading
        res.json({ message: 'Event updated successfully', event: result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update event' });
    }
});

// ---------- Delete event ----------
app.delete('/events/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.collection('events').deleteOne({ id: parseInt(id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        res.json({ message: 'Event deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete event' });
    }
});

// ---------- Apply for an event ----------
app.post('/events/:id/apply', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check if event exists
        const event = await db.collection('events').findOne({ id: parseInt(id) });
        if (!event) return res.status(404).json({ error: 'Event not found' });

        // Check if user already applied
        const existingApplication = await db.collection('applications').findOne({
            eventId: parseInt(id),
            userId: userId
        });

        if (existingApplication) {
            return res.status(400).json({ error: 'You have already applied for this event' });
        }

        // Create application record
        const application = {
            eventId: parseInt(id),
            userId: userId,
            userEmail: req.user.email,
            userName: req.user.name,
            appliedAt: new Date().toISOString(),
            status: 'pending'
        };

        await db.collection('applications').insertOne(application);
        console.log(`User ${userId} applied for event ${id}`);
        res.json({ message: 'Application submitted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to apply for event' });
    }
});