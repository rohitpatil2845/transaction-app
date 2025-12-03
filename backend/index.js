const express = require("express");
const cors = require("cors");
const { sequelize } = require("./db");
const mainRouter = require("./router/index");
const { createServer } = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const httpServer = createServer(app);

// Configure allowed origins for production
const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL
].filter(Boolean);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Attach io to app for use in routes
app.set("io", io);

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

app.use("/api/v1", mainRouter);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully!");
    await sequelize.sync({ alter: true });
    console.log("Database tables synced!");
  } catch (err) {
    console.log("Database connection error:", err);
  }
};

connectDB();

app.get("/", (req, res) => {
  res.json("Server is up and running");
});

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  
  socket.on("authenticate", (userId) => {
    socket.userId = userId;
    socket.join(`user_${userId}`);
    console.log(`User ${userId} authenticated`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});