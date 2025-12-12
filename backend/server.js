// backend/index.js
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const upload = require("./upload");
const { MongoClient } = require('mongodb');

const SALT_ROUNDS = 10;
const SECRET_KEY = '9e7ae63e6d9e3654139277c630af4973';
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

        const role = 'User';
        const occupation = 'Student';
        const created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const newUser = {
            id,
            name: nickname,
            email: email_or_phone,
            password_hash: hashedPassword,
            role,
            occupation,
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
            { email: user.email, name: user.name, id: user.id, role: user.role, occupation: user.occupation },
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

// -------------Verify Old Password-------------
app.post('/users/verify-password', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { oldPassword } = req.body;

        if (!oldPassword) {
            return res.status(400).json({ error: 'Old password is required' });
        }

        // Find user in DB
        const user = await db.collection('users').findOne({ id: parseInt(userId) });
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Compare password
        const match = await bcrypt.compare(oldPassword, user.password_hash);
        if (!match) return res.status(401).json({ error: 'Old password is incorrect' });

        res.json({ message: 'Password verified' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to verify password' });
    }
});

// -------------Change Password Endpoint-------------
app.patch('/users/update-password', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id; // from JWT payload
        const { newPassword } = req.body;

        if (!newPassword) {
            return res.status(400).json({ error: 'New password is required' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

        // Update in DB
        const result = await db.collection('users').updateOne(
            { id: parseInt(userId) },
            { $set: { password_hash: hashedPassword } }
        );

        if (result.modifiedCount === 0) {
            return res.status(500).json({ error: 'Failed to update password' });
        }

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update password' });
    }
});

// ---------- Get ongoing events ----------
app.get('/events', async (req, res) => {
    try {
        const now = new Date(); // current date and time
        const events = await db.collection('events').find({
            $expr: { $gte: [ { $toDate: "$date" }, now ] } // only future events
        }).toArray();
        
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

//----------- Get History ----------
app.get('/history', verifyToken, async (req, res) => {
    try {
        const now = new Date();
        const history = await db.collection('events').aggregate([
            { 
                $lookup: { from: "applications", localField: "id", foreignField: "eventId", as: "apps" }
            },
            { 
                $match: { apps: { $elemMatch: { userEmail: req.user.email, status: 1 } },$expr: { $lt: [ { $toDate: "$date" }, now ] }}
            },
            { $project: { apps: 0 } }
        ]).toArray();
        res.json(history);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

//----------- Get Past Events ----------\
app.get('/past', async (req, res) => {
    try {
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const events = await db.collection('events').find({
            $expr: {
                $lte: [ { $toDate: "$date" }, todayEnd ]  // all events with date <= end of today
            }
        }).toArray();

        res.json(events);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch past events' });
    }
});

// ---------- Get all participant of an Event ----------
app.get('/eventParticipants/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const participants = await db.collection('applications').aggregate([
            { $match: {eventId: parseInt(id), status: 1} },
            { $lookup: {from: 'users', localField: 'userId', foreignField: 'id', as: 'user'}},
            { $unwind: '$user' },
            { $project: {_id: 0, name: '$user.name'}}
        ]).toArray();

        res.json({ participants });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch event participants' });
    }
});

// ---------- Create new event ----------
app.post('/events', verifyToken, upload.single('image'), async (req, res) => {
    try {
        const { title, date, location, participationLimit, description } = req.body;

        if (!title || !date || !location || !participationLimit) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Get next event ID
        const counter = await db.collection('counters').findOneAndUpdate(
            { _id: 'eventId' },
            { $inc: { seq: 1 } },
            { returnDocument: 'after', upsert: true }
        );

        const eventId = counter.value?.seq || (await db.collection('counters').findOne({ _id: 'eventId' })).seq;

        const newEvent = {
            id: eventId,
            title,
            date,
            location,
            participationLimit: parseInt(participationLimit),
            description: description || '',
            imagePath: req.file ? req.file.path : null,
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
app.put('/events/:id', verifyToken, upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, date, location, participationLimit, description, removeImage } = req.body;
        if (!title || !date || !location) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const updateData = {
            title,
            date,
            location,
            participationLimit: parseInt(participationLimit),
            description: description || '',
            updatedAt: new Date().toISOString()
        };
        if (req.file) {
            updateData.imagePath = req.file.path;
        } else if (removeImage === 'true') {
            updateData.imagePath = null;
        }
        
        const result = await db.collection('events').findOneAndUpdate(
            { id: parseInt(id) },
            { $set: updateData },
            { returnDocument: 'after' }
        );

        // Return the updated document under an `event` key instead of spreading
        res.json({ message: 'Event updated successfully', event: result.value });
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

// Check if current user has applied for an event
app.get('/events/:id/applied', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const application = await db.collection('applications').findOne({
            eventId: parseInt(id),
            userId: userId,
            status: 1
        });

        res.json({ applied: !!application });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to check application' });
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

        //Check participation limit
        const currentCount = await db.collection('applications').countDocuments({
            eventId: parseInt(id),
            status: 1 
        });
        if (currentCount >= event.participationLimit) {
            return res.status(400).json({ 
                error: 'Participation limit reached for this event' 
            });
        }

        // Create application record
        const application = {
            eventId: parseInt(id),
            userId: userId,
            appliedAt: new Date().toISOString(),
            status: 1
        };

        await db.collection('applications').insertOne(application);
        console.log(`User ${userId} applied for event ${id}`);
        res.json({ message: 'Application submitted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to apply for event' });
    }
});

// ---------- Retract application ----------
app.patch('/events/:id/apply', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // expected to be 0
        const userId = req.user.id;

        const result = await db.collection('applications').updateOne(
            { eventId: parseInt(id), userId: userId, status: { $ne: 0 } },
            { $set: { status: status } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ error: 'Application not found or already retracted' });
        }

        res.json({ message: 'Application retracted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to retract application' });
    }
});