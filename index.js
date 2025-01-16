const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 1506


// Middleware
app.use(express.json())
app.use(cors())


const uri = `mongodb+srv://${process.env.NAME}:${process.env.PASS}@nurealamriyal.adrs4.mongodb.net/?retryWrites=true&w=majority&appName=nurealamriyal`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const userCollection = client.db('real-State-management').collection('user')
    const propertyCollection = client.db('real-State-management').collection('property')
    const reviewCollection = client.db('real-State-management').collection('review')

    app.get('/user/:email', async (req, res) => {
      const email = req.params.email
      const query = { email }
      const result = await userCollection.findOne(query)
      res.send(result)
    })
    app.get('/alluser', async (req, res) => {

      const query = {
        role: {
          $ne: "Admin"
        }
      }
      const result = await userCollection.find(query).toArray()
      res.send(result)
    })
    app.get('/property', async (req, res) => {
      const result = await propertyCollection.find().toArray()
      res.send(result)
    })
    app.get('/allProperties', async (req, res) => {
      const query = { varifyStatus: "verified" }
      const result = await propertyCollection.find(query).toArray()
      res.send(result)
    })
    app.get('/Property/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await propertyCollection.findOne(query)
      res.send(result)
    })
    app.get('/review/:id', async (req, res) => {
      const id = req.params.id
      const query = { propertyId: id }

      const result = await reviewCollection.find(query).toArray()
      res.send(result)
    })
    app.get('/myreview/:email', async (req, res) => {
      const email = req.params.email


      const result = await reviewCollection.aggregate([
        {
          $match: { reviewerEmail: email }
        },
        {
          $addFields: {
            propertId: { $toObjectId: "$propertyId" }
          }
        },
        {
          $lookup: {
            from: "property",
            localField: 'propertId',
            foreignField: '_id',
            as: "reviewProperty"
          }
        }, {
          $unwind: "$reviewProperty"
        }, {
          $addFields: {
            propertyName: '$reviewProperty.propertyName',
            image: '$reviewProperty.image',
            agentName: '$reviewProperty.agentName',
            agentImage: '$reviewProperty.agentImage'
          }
        },
        {
          $project: {
            reviewProperty: 0
          }
        }


      ]).toArray()
      res.send(result)
    })
    app.get('/allreview', async (req, res) => {
      const result = await reviewCollection.find().toArray()
      res.send(result)
    })
    app.get('/latestreview', async (req, res) => {
      const count = await reviewCollection.estimatedDocumentCount()

      const result = await reviewCollection.aggregate([
        {
          $match: {}
        },
        {
          $addFields: {
            propertId: { $toObjectId: "$propertyId" }
          }
        },
        {
          $lookup: {
            from: "property",
            localField: 'propertId',
            foreignField: '_id',
            as: "reviewProperty"
          }
        }, {
          $unwind: "$reviewProperty"
        }, {
          $addFields: {
            propertyName:'$reviewProperty.propertyName',
            // image:'$reviewProperty.image',
            // agentName: '$reviewProperty.agentName',
            // agentImage: '$reviewProperty.agentImage'
          }
        },
        {
          $project: {
            reviewProperty: 0
          }
        }


      ]).skip(count - 3).limit(count).toArray()
      res.send(result)
    })

    app.post('/user', async (req, res) => {
      const user = req.body
      const query = { email: user?.email }
      const isExist = await userCollection.findOne(query)
      if (isExist)
        return
      const result = await userCollection.insertOne(user)
      res.send(result)
    })
    app.post('/property', async (req, res) => {
      const property = req.body
      const result = await propertyCollection.insertOne(property)
      res.send(result)
    })
    app.post('/review', async (req, res) => {
      const reviewInfo = req.body
      const result = await reviewCollection.insertOne(reviewInfo)
      res.send(result)

    })
    app.patch('/property-varification/:id', async (req, res) => {
      const id = req.params.id
      const status = req.body
      const query = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          varifyStatus: status?.varification
        },
      };
      const options = { upsert: true };
      const result = await propertyCollection.updateOne(query, updateDoc, options)
      res.send(result)

    })





    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Serrver in running')
})

app.listen(port, () => {
  console.log(`server in running on the Port is ${port}`)
})