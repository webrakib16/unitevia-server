import express from "express";
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config'
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT =process.env.PORT || 5000;
const client = new MongoClient(process.env.MONGODB_URL,);
// http://localhost:5000/data-event

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

// Create new event route
app.post('/data-event',async(req,res) => {
  const result = await eventCollection.insertOne(req.body);
  const data = req.body;
  console.log(data);
  console.log("Data event received");
  res.send(result);

});

// Get all events route.
app.get('/upcoming-events', async(req,res) => {
  const result = await eventCollection.find({}).toArray();
  res.send(result);
})

// Get event by ID route.
app.get('/event/:id',async(req,res) => {
  const {id} = req.params;
  const result = await eventCollection.findOne({_id: new ObjectId(id)});
  console.log(result);
  res.send(result);
  
})

// Event update route.
app.patch('/event/:id',async(req,res) => {
  const {id} = req.params;
  const updatedData = req.body;
  const result = await eventCollection.updateOne(
    {_id: new ObjectId(id)}, 
    {$set: updatedData}
  );
  res.json(result);
})

// Event delete route.
app.delete('/event/:id',async(req,res) => {
  const {id} = req.params;
  const result = await eventCollection.deleteOne({_id: new ObjectId(id)});
  res.json(result);
})


// Get root route.
app.get("/",(req,res) => {
  res.send({message: 'Server running fine'})
})


// Start the server
app.listen(PORT,() => {
  console.log(`Server is running on port ${PORT}`)
})
