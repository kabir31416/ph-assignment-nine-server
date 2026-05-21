const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const express = require("express");
const app = express();
const dotenv = require("dotenv");
dotenv.config();
const port = process.env.PORT;
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

app.use(express.json());
app.use(cors({ origin: "http://localhost:3000", credentials: true }));

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).send("Unauthorized");
    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).send("Unauthorized");
    req.token = token;
    next();
};

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");
        const database = client.db("IdeaVaultDb");
        const ideasCollection = database.collection("ideas");
        const commentsCollection = database.collection("comments");

        app.get("/", (req, res) => {
            res.send("Hello World!");
        });

        app.post("/ideas", async (req, res) => {
            const ideas = req.body;
            const result = await ideasCollection.insertOne(ideas);
            res.send(result);
        });

        app.get("/ideas/trending", async (req, res) => {
            const result = await ideasCollection.find().limit(6).toArray();
            res.send(result);
        });

        app.get("/ideas", async (req, res) => {
            const { search, category } = req.query;
            let query = {};
            if (search && search.trim() !== "") query.title = { $regex: search, $options: "i" };

            if (category && category !== "All Categories" && category.trim() !== "") 
                query.category = { $regex: `^${category}$`, $options: "i" };

            const result = await ideasCollection.find(query).toArray();
            res.send(result);
        });

        app.get("/ideas/:id", verifyToken, async (req, res) => {
            const id = req.params.id;
            const result = await ideasCollection.findOne(
                { _id: new ObjectId(id) }
            );
            res.send(result);
        });

        app.get("/my-ideas/:email", verifyToken, async (req, res) => {
            const email = req.params.email;
            const result = await ideasCollection.find(
                { userEmail: email }
            ).toArray();
            res.send(result);
        });

        app.put("/ideas/:id", verifyToken, async (req, res) => {
            const id = req.params.id;
            const updatedIdea = req.body;
            const result = await ideasCollection.updateOne(
                { 
                    _id: new ObjectId(id) 
                }, 
                { $set: updatedIdea });
            res.send(result);
        });

        app.delete("/ideas/:id", verifyToken, async (req, res) => {
            const id = req.params.id;
            const result = await ideasCollection.deleteOne(
                { 
                    _id: new ObjectId(id) 
                });
            res.send(result);
        });

        app.post("/comments", async (req, res) => {
            const comment = { ...req.body, 

                ideaId: new ObjectId(req.body.ideaId), 
                createdAt: new Date() };

            const result = await commentsCollection.insertOne(comment);
            res.send(result);
        });

        app.get("/comments/:ideaId", async (req, res) => {
            const { ideaId } = req.params;
            const result = await commentsCollection.find(
                { ideaId: new ObjectId(ideaId) }).sort({ createdAt: -1 }).toArray();
            res.send(result);
        });

        app.put("/comments/:id", async (req, res) => {
            const id = req.params.id;
            const { text } = req.body;
            const result = await commentsCollection.updateOne(
                { _id: new ObjectId(id) }, 
                { $set: { text } }
            );
            res.send(result);
        });

        app.delete("/comments/:id", async (req, res) => {
            const id = req.params.id;
            const result = await commentsCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        });

        app.get("/my-interactions/:email", verifyToken, async (req, res) => {
            const email = req.params.email;
            const result = await commentsCollection.aggregate([
                { $match: { userEmail: email } },

                { $lookup: { from: "ideas", localField: "ideaId", foreignField: "_id", as: "idea" } },

                { $unwind: "$idea" },

                { $project: { text: 1, createdAt: 1, ideaId: 1, "idea._id": 1, "idea.title": 1 } },
                
                { $sort: { createdAt: -1 } }
            ]).toArray();
            res.send(result);
        });
    } catch (error) {
        console.error(error);
    }
}

run();
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});