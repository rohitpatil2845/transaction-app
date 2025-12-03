const express = require("express");
const zod = require("zod");
const router = express.Router();
const { User, Account, LoginHistory } = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { authMiddleware } = require("./middleware");
const { JWT_SECRET } = require("./config");
const { Op } = require("sequelize");

const signupSchema = zod.object({
  username: zod.string().email(),
  password: zod.string().min(5),
  firstName: zod.string(),
  lastName: zod.string(),
});

//signup route
router.post("/signup", async (req, res) => {
  const body = req.body;
  const { success } = signupSchema.safeParse(req.body);
  if (!success) {
    return res.json({
      message: "Invalid input",
    });
  }

  const user = await User.findOne({
    where: { username: req.body.username },
  });

  if (user) {
    return res.json({
      message: "Email already exist",
    });
  }

  // hash password before storing
  const hashed = await bcrypt.hash(body.password, 10);
  const dbuser = await User.create({
    username: body.username,
    password: hashed,
    firstName: body.firstName,
    lastName: body.lastName,
  });

  await Account.create({
    userId: dbuser.id,
    balance: Math.floor(Math.random() * 10000),
  });

  const token = jwt.sign(
    {
      userId: dbuser.id,
    },
    JWT_SECRET
  );

  res.json({
    message: "user created successfully",
    token: token,
  });
});

// update user route
const updateBody = zod.object({
  password: zod.string().optional(),
  firstName: zod.string().optional(),
  lastName: zod.string().optional(),
});

router.put("/", authMiddleware, async (req, res) => {
  const { success } = updateBody.safeParse(req.body);
  if (!success) {
    res.status(411).json({
      message: "error while updating information",
    });
  }
  await User.update(req.body, {
    where: { id: req.userId },
  });
  res.json({
    message: "Update sucessfully",
  });
});

//filter user route - search by email
router.get("/bulk", async (req, res) => {
  const filter = req.query.filter || "";

  const users = await User.findAll({
    where: {
      username: { [Op.like]: `%${filter}%` }
    },
  });

  res.json({
    user: users.map((user) => ({
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      _id: user.id,
    })),
  });
});

//current user route
router.get("/getUser", authMiddleware, async (req, res) => {
  const user = await User.findOne({
    where: { id: req.userId },
  });
  res.json(user);
});

//signin route
const signinBody = zod.object({
  username: zod.string().email(),
  password: zod.string(),
});

router.post("/signin", async (req, res) => {
  const { success } = signinBody.safeParse(req.body);
  if (!success) {
    return res.status(411).json({
      message: "Incorrect inputs",
    });
  }

  const user = await User.findOne({
    where: { username: req.body.username },
  });

  if (!user) {
    return res.status(404).json("User not found!");
  }

  const match = await bcrypt.compare(req.body.password, user.password);
  if (!match) {
    return res.status(401).json("Wrong credentials!");
  }

  // record login history
  try {
    await LoginHistory.create({
      userId: user.id,
      ip: req.ip || req.headers["x-forwarded-for"] || null,
      userAgent: req.headers["user-agent"] || null,
    });
  } catch (e) {
    console.error("LoginHistory error:", e.message);
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET);

  res.status(200).json({ token: token });
});

// change password
router.post("/change-password", authMiddleware, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword || newPassword.length < 5) {
    return res.status(400).json({ message: "Invalid input" });
  }
  const user = await User.findOne({ where: { id: req.userId } });
  const match = await bcrypt.compare(oldPassword, user.password);
  if (!match) return res.status(401).json({ message: "Wrong old password" });
  const hashed = await bcrypt.hash(newPassword, 10);
  await User.update({ password: hashed }, { where: { id: req.userId } });
  res.json({ message: "Password changed" });
});

module.exports = router;