import express from "express";
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config';
import cors from "cors";
import { createRemoteJWKSet, jwtVerify } from 'jose-cjs';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const client = new MongoClient(process.env.MONGODB_URL);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const mongoClient = await connectToMongoDB();
const db = mongoClient.db("unitevia");
const eventCollection = db.collection("data-events");

// Token verification middleware
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ msg: "Unauthorized" });
  }

  // Bearer <token> 
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).send({ msg: "Unauthorized" });
  }

  const JWKS = createRemoteJWKSet(new URL('http://localhost:3000/api/auth/jwks'));

  try {
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(500).send({ msg: 'Server error !' });
  }
};

// 1. Create new event route 
app.post('/data-event', async (req, res) => {
  try {
    const result = await eventCollection.insertOne(req.body);
    console.log("Data event received:", req.body?.title);
    res.send(result);
  } catch (err) {
    res.status(500).send({ msg: "Failed to create event" });
  }
});

// 2. Get upcoming events route (USING MONGODB .limit() OPERATOR)

app.get('/upcoming-events', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit);
    let query = eventCollection.find({}).sort({ date: 1 });

    if (!isNaN(limit) && limit > 0) {
      query = query.limit(limit); // 👉 MongoDB-র .limit() অপারেটর
    }

    const result = await query.toArray();
    res.send(result);
  } catch (err) {
    res.status(500).send({ msg: "Failed to fetch events" });
  }
});

// 3. Get event by ID route
app.get('/event/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await eventCollection.findOne({ _id: new ObjectId(id) });
    res.send(result);
  } catch (err) {
    res.status(500).send({ msg: "Error fetching event" });
  }
});

// 4. Update event route
app.patch('/event/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;
    const result = await eventCollection.updateOne(
      { _id: new ObjectId(id) }, 
      { $set: updatedData }
    );
    res.json(result);
  } catch (err) {
    res.status(500).send({ msg: "Error updating event" });
  }
});

// 5. Event delete route
app.delete('/event/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await eventCollection.deleteOne({ _id: new ObjectId(id) });
    res.json(result);
  } catch (err) {
    res.status(500).send({ msg: "Error deleting event" });
  }
});

// Health check route
app.get("/", (req, res) => {
  res.send({ message: 'Server running fine' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});