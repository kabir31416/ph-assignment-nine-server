const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require('express');
const app = express();
const dotenv = require('dotenv');
dotenv.config();
const port = process.env.PORT;

const cors = require('cors');

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// Middleware
app.use(express.json())
app.use(cors());

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");

        const database = client.db("IdeaVaultDb");
        const ideasCollection = database.collection("ideas");

        app.post('/ideas', async (req, res) => {
            const ideas = req.body;
            const result = await ideasCollection.insertOne(ideas);
            res.send(result);
        });


        app.get('/', (req, res) => {
            res.send('Hello World!');
        });


        app.get('/ideas', async (req, res) => {
            const result = await ideasCollection.find().toArray();
            res.send(result);
        });

        app.get('/ideas/:id', async (req, res) => {
            const id = req.params.id;
            const result = await ideasCollection.findOne({
                _id: new ObjectId(id)
            });
            res.send(result);
        });


    } catch (error) {
        console.error(error);
    }
}

run();

app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
});