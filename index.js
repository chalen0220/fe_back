const port = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");

app.use(express.json());
app.use(cors());


//Use .env file 
require("dotenv").config({
    path: './.env'
})


//Database Connection With MongoDB
mongoose.connect(process.env.MONGODB_URI);



//API Creation
app.get("/", (request,response)=>{
    response.send("Express App is Running!");
})



//Image Storage Engine
const storage = multer.diskStorage({
    destination: "./upload/images",
    filename:(request, file, callback) => {
        return callback(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
        }
    })

const upload = multer({storage:storage});




//Creating Upload Endpoint for Images
app.use("/images", express.static("upload/images"))

app.post("/upload", upload.single("product"),(request,response)=>{
    response.json({
        success:1,
        image_url:`http://localhost:${port}/images/${request.file.filename}`
    })
})




//Schema for Creating Products
const Product = mongoose.model("Product", {
    id:{
        type: Number,
        required:true,   
    },
    title:{
        type: String,
        required:true,
    },
    cat:{
        type:String,
        required:true,
    }, 
    price:{
        type:Number,
        required:true,
    },
    image:{
        type:String,
        required:true,
    }, 
    description:{
        type:String,
        required:true,
    }, 
    date:{
        type:Date,
        default:Date.now,
    },
    available:{
        type:Boolean,
        default:true,
    }
})

app.post("/addproduct", async (request,response)=>{
    let products = await Product.find({});
    let id;
    if(products.length > 0){
        let last_product_array = products.slice(-1)
        let last_product = last_product_array[0];
        id = last_product.id + 1;
    } else {
        id = 1;
    }
    const product = new Product({
        id:id,
        title:request.body.title,
        cat:request.body.cat,
        price:request.body.price,
        image:request.body.image,  
        description:request.body.description
    });
    console.log(product);
    await product.save();
    console.log("Saved");
    response.json({
        success:true,
        title:request.body.title,
    })
})




// Creating API For Deleting Products

app.post("/removeproduct", async (request,response)=> {
    await Product.findOneAndDelete({id:request.body.id});
    console.log("Removed");
    response.json({
        success:true,
        title:request.body.title,
    })
})



// Creating API for Getting All Products
app.get("/allproducts", async (request,response)=>{
    let products = await Product.find({});
    console.log("All Products Fetched");
    response.send(products);
})



//Schema creation for User Model

const Users = mongoose.model("Users", {
    name:{
        type:String,
    },
    email:{
        type:String,
        unique:true,
    },
    password:{
        type:String,
    },
    cartData:{
        type:Object,
    },
    date:{
        type:Date,
        default:Date.now,
    },
})

//Endpoint for registering the user
app.post("/signup", async (request,response)=>{
    let check = await Users.findOne({email:request.body.email});
    if (check){
        return response.status(400).json({success:false, errors:"Existing user found with the same email address."})
    }
    let cart = {};
    for (let i = 0; i < 300; i++){
        cart[i] = 0;
    }
    const user = new Users({
        name:request.body.username,
        email:request.body.email,
        password:request.body.password,
        cartData:cart,
    })

    await user.save();

    const data = {
        user:{
            id:user.id
        }
    }

    const token = jwt.sign(data,"secret_ecom");
    response.json({success:true,token})


})

//Creating Endpoint for User Login
app.post("/login", async (request,response)=> {
    let user = await Users.findOne({email:request.body.email});
    if (user) {
        const passCompare = request.body.password === user.password;
        if (passCompare) {
            const data = {
                user:{
                    id:user.id
                }
            }
            const token = jwt.sign(data, "secret_ecom");
            response.json({success:true, token});
        }
        else {
            response.json({success:false, errors:"Wrong Password"});
        }
    }
    else {
        response.json({success:false, errors:"Wrong Email ID"})
    }
})

//Endpoint for New Item Data
app.get("/newitems", async (request,response)=>{
    let products = await Product.find({});
    let newItems = products.slice(1).slice(-4);
    console.log("NewItems Fetched");
    response.send(newItems);
})


//Middleware for Fetching the User
    const fetchUser = async(request,response,next)=>{
        const token = request.header("auth-token");
        if(!token){
            response.status(401).send({errors:"Please authenticate using a valid token."})
        } else {
            try {
                const data = jwt.verify(token,"secret_ecom");
                request.user = data.user;
                next();
            } catch (error){
                response.status(401).send({errors:"Please authenticate using a valid token."})
            }
        }
    }


//Endpoint for Adding Products in CartData
app.post("/addtocart", fetchUser, async (request,response)=>{
    console.log("Added", request.body.itemId);
    let userData = await Users.findOne({_id:request.user.id});
    userData.cartData[request.body.itemId] +=1;
    await Users.findOneAndUpdate({_id:request.user.id},{cartData:userData.cartData});
    response.send("Added")
})

//Endpoint for Removing Products in CartData
app.post("/removefromcart", fetchUser, async (request,response)=>{
    console.log("Removed", request.body.itemId);
    let userData = await Users.findOne({_id:request.user.id});
        if(userData.cartData[request.body.itemId] > 0)
        userData.cartData[request.body.itemId] -=1;
        await Users.findOneAndUpdate({_id:request.user.id},{cartData:userData.cartData});
        response.send("Removed")
})

//Endpoint for getting CartData
app.post("/getcart", fetchUser, async (request,response)=>{
    console.log("GetCart");
    let userData = await Users.findOne({_id:request.user.id});
    response.json(userData.cartData);
})


app.listen(port, (error)=>{
    if (!error) {
        console.log("Server is Running on Port "+ port);
    } else {
        console.log("Error : "+ error);
    } 
})