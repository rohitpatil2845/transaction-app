const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const mainRouter = require("./router/index");

const app = express();

app.use(cors());
app.use(express.json());


app.use("/api/v1", mainRouter);


const connectDB = async () => {
  try {
    await mongoose.connect("mongodb+srv://rohitpatil200528:98239823@cluster0.pxhrdb4.mongodb.net/");
    console.log("database is connected successfully!");
  } catch (err) {
    console.log(err);
  }
};

connectDB();

app.get("/", (req, res) => {
  res.json("Server is up and running");
});

app.listen(3000);