const express = require('express');
const cors = require('cors');

require('dotenv').config();
const stripe = require('stripe')(process.env.PaymentSecreatKey)
const { MongoClient, ServerApiVersion, ObjectId, Admin } = require('mongodb');
const app = express()
const port = process.env.PORT || 1515
const jwt = require('jsonwebtoken');


// Middleware
app.use(express.json())
app.use(cors({
  origin:['http://localhost:5173',
          'https://real-state-management-client-side.vercel.app'
  ],
}))



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
    // await client.connect();
    const userCollection = client.db('real-State-management').collection('user')
    const propertyCollection = client.db('real-State-management').collection('property')
    const reviewCollection = client.db('real-State-management').collection('review')
    const wishlistCollection = client.db('real-State-management').collection('wishlist')
    const offerCollection = client.db('real-State-management').collection('offer')
    const paymentCollection = client.db('real-State-management').collection('payment')
    app.post('/jwt', async (req, res) => {
      const info = req.body
      const token = jwt.sign(info, process.env.Acces_Token, { expiresIn: '5h' })
      res.send({ token })
    })
    const varifyToken = (req, res, next) => {
      // console.log('riyal',req.headers.authorization)

      const Acces_Token = req.headers.authorization.split(' ')[1]
      jwt.verify(Acces_Token, process.env.Acces_Token, function (err, decoded) {
        if (err) { return res.status(401).send({ message: 'unauthorized access' }) }

        req.decoded = decoded;
        next()
      });

    }
    const AgentToken = async (req, res, next) => {
      const email = req.decoded?.email
      const query = { email: email }
      const user = await userCollection.findOne(query)
      // //console.log(user?.role)

      const isAgent = user?.role === 'Agent'
      if (!isAgent) { res.status(403).send({ message: "Forbiden Access" }) }
      // //console.log(isAdmin)

      next()
    }
    const adminToken = async (req, res, next) => {
      const email = req.decoded?.email
      const query = { email: email }
      const user = await userCollection.findOne(query)
      // //console.log(user?.role)

      const isAdmin = user?.role === 'Admin'
      if (!isAdmin) { res.status(403).send({ message: "Forbiden Access" }) }
      // //console.log(isAdmin)

      next()

    }

    app.get('/user/:email', async (req, res) => {
      const email = req.params.email
      const query = { email }
      const result = await userCollection.findOne(query)
      res.send(result)
    })
    app.get('/payment/:email', async (req, res) => {
      const email = req.params.email
      const query = { agentEmail: email }
      const result = await paymentCollection.find(query).toArray()
      res.send(result)
    })
    app.get('/alluser', varifyToken, adminToken, async (req, res) => {

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
      const { search, max, min, range,skip,limit } = req.query
      //console.log(search,max,min,range)
    
      const query = { varifyStatus: "verified" }
      const query2 = {
        $and: [
          {
            varifyStatus: "verified",
            location: { $regex: search, $options: "i" }
          }
        ]
      }
      if (search) {
        const result = await propertyCollection.find(query2).skip(parseInt(skip)).limit(parseInt(limit)).toArray()
        res.send(result)
      }
      else if (range === 'range') {
        const result = await propertyCollection.find(query).sort({ maxPrice: -1, minPrice: 1 }).skip(parseInt(skip)).limit(parseInt(limit)).toArray()
        res.send(result)
      }
      else if (max === 'max') {
        const result = await propertyCollection.find(query).sort({ maxPrice: -1 }).skip(parseInt(skip)).limit(parseInt(limit)).toArray()
        res.send(result)
      }
      else if (min === 'min') {
        const result = await propertyCollection.find(query).sort({ minPrice: 1 }).skip(parseInt(skip)).limit(parseInt(limit)).toArray()
        res.send(result)
      }
      else {
        const result = await propertyCollection.find(query).skip(parseInt(skip)).limit(parseInt(limit)).toArray()
        res.send(result)
      }



    })
    app.get('/advertise', async (req, res) => {
      // const {search}=req.query

      // const query = { varifyStatus: "verified" }
      const query2 = {
        $and: [
          {
            varifyStatus: "verified",
            activity: "advertise"
          }
        ]
      }

      // if(search){
      //   const result=await propertyCollection.find(query2).toArray()
      //     res.send(result)
      // }

      const result = await propertyCollection.find(query2).sort({ count: -1 }).toArray()
      res.send(result)


      
    })
    app.get('/Properties', async (req, res) => {
      const query = { varifyStatus: "verified" }
      const result = await propertyCollection.find(query).toArray()
      res.send(result)

    })
    app.get('/property/:email', async (req, res) => {
      const email = req.params?.email
      // //console.log(email)
      const filter = { agentEmail: email }
      const result = await propertyCollection.find(filter).toArray()
      res.send(result)

    })
    app.get('/agentOffer/:email', async (req, res) => {
      const email = req.params?.email
      const query = { agentEmail: email }
      const result = await offerCollection.find(query).toArray()
      res.send(result)
    })
    app.get('/offer/:email', async (req, res) => {
      const email = req.params?.email

      const result = await offerCollection.aggregate([
        {

          $match: { customerEmail: email }

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
            as: "offerProperty"
          }
        },
        {
          $unwind: "$offerProperty"

        },
        {
          $addFields: {

            image: '$offerProperty.image',

          }
        },
        {
          $project: {
            offerProperty: 0
          }
        }

      ]).toArray()
      res.send(result)
    })

    app.get('/oneproperty/:id', async (req, res) => {
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
    app.get('/offer1/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }

      const result = await offerCollection.findOne(query)
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
    app.get('/offer', async (req, res) => {
      const result = await offerCollection.find().toArray()
      res.send(result)
    })
    app.get('/latestreview', async (req, res) => {
      const count = await reviewCollection.estimatedDocumentCount()
      let skip = count - 4

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
        },
        {
          $unwind: "$reviewProperty"

        },
        {
          $addFields: {
            propertyName: '$reviewProperty.propertyName',
            // image:'$reviewProperty.image',
            // agentName: '$reviewProperty.agentName',
            // agentImage: '$reviewProperty.agentImage'
          }
        },
        // {
        //   $project: {
        //     reviewProperty: 0
        //   }
        // }



      ]).skip(skip).limit(count).toArray()
      console.log(result)
      res.send(result)

    })
    app.get("/adminOverAll",async (req,res) => {
    const  reviewNum = await reviewCollection.countDocuments()
    const  wishListNum = await wishlistCollection.countDocuments()
       const paymentNum = await paymentCollection.countDocuments()
       const PropertyNum = await propertyCollection.countDocuments()
       const PaymentData= await paymentCollection.find().toArray()
       let sum=0;
       for(n of PaymentData){
           sum+=n?.totalPrice
       }
       const info={
        reviewNum,
        wishListNum,paymentNum,PropertyNum,sum
       }
       console.log(PaymentData)
       res.send(info)
      

    })
    app.get('/customerOverWall/:email', async (req, res) => {
      const email = req.params.email;
      const query = {
        reviewerEmail: email
      }
      const query3 = {

        buyerEmail: email
      }
      const query2 = {

        customerEmail: email
      }
      const query1 = {

        buyerEmail: email
      }
      const reviewNum = await reviewCollection.countDocuments(query)
      const wishListNum = await wishlistCollection.countDocuments(query2)
      const offerNum = await offerCollection.countDocuments(query2)
      const paymentNum = await paymentCollection.countDocuments(query3)

      const clientAllData = [
        reviewNum, wishListNum, offerNum, paymentNum
      ]


      res.send(clientAllData)

    })
    app.get('/AgentOverWall/:email', async (req, res) => {
      const email = req.params.email;

      const query3 = {

        agentEmail: email
      }
      const query2 = {


        agentEmail: email
      }
      const query1 = {

        agentEmail: email
      }
      const query = { agentEmail: email }
      const result = await paymentCollection.find(query).toArray()
      const addedPropertyNum = await propertyCollection.countDocuments(query1)
      const requestNum = await offerCollection.countDocuments(query2)
      const soldNum = await paymentCollection.countDocuments(query3)
      const revenue = await paymentCollection.find(query).toArray()
      let sum = 0
      const taka = revenue.map(revenue => {
        sum = sum + revenue?.totalPrice
        return sum
      })
      const clientAllData = [
        addedPropertyNum, requestNum, soldNum, taka[taka?.length - 1]
      ]


      res.send(clientAllData)

    })
    app.get('/AdminOverWall', async (req, res) => {

      const admin = await userCollection.countDocuments({ role: "Admin" })
      const agent = await userCollection.countDocuments({ role: "Agent" })
      const fraud = await userCollection.countDocuments({ role: "Fraud" })
      const Customer = await userCollection.countDocuments({ role: "Customer" })

      // const addedPropertyNum=await propertyCollection.countDocuments(query1)
      // const requestNum=await offerCollection.countDocuments(query2)
      // const soldNum=await paymentCollection.countDocuments(query3)

      const AdminAllData = {
        "user": [admin, agent, fraud, Customer],
      }


      res.send(AdminAllData)

    })
    app.get('/myWishlist/:email', async (req, res) => {
      const email = req.params.email
      // //console.log(email)
      const result = await wishlistCollection.aggregate([
        {
          $match: { customerEmail: email }
        },
        {
          $addFields: { propertyId: { $toObjectId: "$propertyId" } }
        },
        {
          $lookup: {
            from: 'property',
            localField: "propertyId",
            foreignField: "_id",
            as: "property"
          }
        },
        {
          $unwind: "$property"
        },
        {
          $addFields: {
            maxPrice: "$property.maxPrice",
            minPrice: "$property.minPrice",
            location: "$property.location",
            propertyName: "$property.propertyName",
            agentName: "$property.agentName",
            varifyStatus: "$property.varifyStatus",
            agentEmail: "$property.agentEmail"

          },
        },
        {
          $project: {
            property: 0
          }
        }, {
          $lookup: {
            from: 'user',
            localField: "agentEmail",
            foreignField: "email",
            as: "property"
          }

        },
        {
          $unwind: "$property"
        }, {
          $addFields: {
            agentImage: "$property.image"
          }
        },
        {
          $project: {
            property: 0
          }
        }
      ]).toArray()
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
    app.post('/offer', async (req, res) => {
      const reviewInfo = req.body
      const result = await offerCollection.insertOne(reviewInfo)
      res.send(result)

    })
    app.post('/added-wishlist', async (req, res) => {
      const info = req.body

      const query = { email: info?.customerEmail }
      const result = await userCollection.findOne(query)

      const query1 = {
        $and: [
          { propertyId: info?.propertyId },
          {
            customerEmail: info?.customerEmail
          }
        ]
      }
      const result2 = await wishlistCollection.findOne(query1)

      if (result.role === 'Admin' || result.role === "Agent") { return res.send({ message: `${result.role} can not add property in wishList and buy` }) }
      else if (result2) {
        return res.send({ message: 'Already added wishlit' })
      }
      else {
        const result1 = await wishlistCollection.insertOne(info)
        res.send(result1)
      }

    })
    app.post('/payment-order', async (req, res) => {
      const info = req.body
      const { propertyId, offerId } = info
      const queryForPropertyUpdate = { _id: new ObjectId(propertyId) }
      const updateDoc1 = {
        $set: {
          varifyStatus: 'sold',
        }
      }
      const updateDoc2 = {
        $set: {

          buyingStatus: 'sold',
        }
      }
      const queryForOfferUpdate = { _id: new ObjectId(offerId) }
      const propertyUpdate = await propertyCollection.updateOne(queryForPropertyUpdate, updateDoc1)
      const offerUpdate = await offerCollection.updateOne(queryForOfferUpdate, updateDoc2)
      const result = await paymentCollection.insertOne(info)
      res.send(result)
    })
    app.put('/propertyUpdate/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const info = req.body
      const updateDoc = {
        $set: {

          varifyStatus: info?.varifyStatus,

          agentImage: info?.agentImage,

          image: info?.image,
          description: info?.description,
          agentName: info?.agentName,

          agentEmail: info?.agentEmail,
          location: info?.location,
          propertyName: info?.propertyName,

          maxPrice: info?.maxPrice,
          minPrice: info?.minPrice,

        }
      }
      const result = await propertyCollection.updateOne(query, updateDoc)
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
    app.patch('/userUpdate/:id', async (req, res) => {
      const id = req.params?.id
      const status = req.body
      const query = { _id: new ObjectId(id) }
      if (status?.role === "Fraud") {
        const result1 = await userCollection.findOne(query)
        const query2 = {
          agentEmail: result1?.email
        }
        const result2 = await propertyCollection.deleteMany(query2)
      }
      const updateDoc = {
        $set: {
          role: status?.role
        },
      };
      const options = { upsert: true };
      const result = await userCollection.updateOne(query, updateDoc, options)
      res.send(result)

    })
    app.put('/allProperty1/:id', async (req, res) => {
      const id = req.params?.id

      const status = req.body
      const query = { _id: new ObjectId(id) }

      //console.log(status)
      const updateDoc = {
        $set: {

          activity: status?.activity,
          count: (parseInt(status?.count)) + 1,
        }
      };
      const options = { upsert: true };
      const result = await propertyCollection.updateOne(query, updateDoc, options)
      res.send(result)

    })
    app.patch('/offerStatusChange', async (req, res) => {

      const { id, customerEmail, status } = req.body

      const query = {
        $and:

          [
            { propertyId: id },
            { customerEmail: customerEmail }
          ]

      }
      const updateDoc = {
        $set: {
          buyingStatus: status
        },
      };
      const query1 = {

        $and:
          [
            { propertyId: id },
            {
              customerEmail:
              {
                $ne: customerEmail
              }
            }
          ]

      }
      const updateDoc1 = {
        $set: {
          buyingStatus: 'rejected'
        },
      };
      const options = { upsert: true };
      const result = await offerCollection.updateMany(query, updateDoc)
      const result1 = await offerCollection.updateMany(query1, updateDoc1)

      res.send(result)


    })
    app.delete('/user/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.deleteOne(query)
      res.send(result)
    })
    app.delete('/propertyDelete/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await propertyCollection.deleteOne(query)
      res.send(result)
    })
    app.delete('/reviewDelete/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await reviewCollection.deleteOne(query)
      res.send(result)
    })
    app.delete('/wishlistDelete/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await wishlistCollection.deleteOne(query)
      res.send(result)
    })
    app.post('/create-Intent-server1', async (req, res) => {
      const info = req?.body
      //console.log(info)
      amount = parseFloat(info?.price * 100)
      console.log(info)
      const paymentIntent = await stripe.paymentIntents.create({


        currency: 'usd',

        amount: amount,

        payment_method_types: [
          "card"
        ]




      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })

    })






    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    //console.log("Pinged your deployment. You successfully connected to MongoDB!");
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
