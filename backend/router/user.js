const express = require("express");
const zod = require("zod");
const router = express.Router();
const {User, Account} = require("../db")
const jwt = require('jsonwebtoken');
const {authMiddleware} = require("./middleware")
const { JWT_SECRET } = require("./config");






const signupSchema = zod.object({
     username: zod.string().email(),
     password: zod.string().min(5),
     firstName: zod.string(),
     lastName: zod.string(),
})



//singup route
router.post("/signup", async (req , res ) => {
     const body = req.body;
     const {success }= signupSchema.safeParse(req.body);
     if(!success) {
        return res.json ({
            message: "Invalid input"
        })
     }

     const user  = await User.findOne ( {
        username: req.body.username
     })

     if (user) {
        return res.json ({
            message:"Email already exist"
        })
     }

    const dbuser = await User.create(body);

    await Account.create({
     userId: dbuser._id,
     balance: Math.floor(Math.random() * 10000),
});

    const token  = jwt.sign({
        userId: dbuser._id
    }, JWT_SECRET);

    res.json({
        message: "user created successfully",
        token: token
    })
})







// update user route
const updateBody = zod.object({
  password: zod.string().optional(),
  firstName: zod.string().optional(),
  lastName: zod.string().optional(),
});

router.put("/", authMiddleware, async (req , res ) => {
const {success} = updateBody.safeParse(req.body)
if(!success) {
    res.status(411).json({
        message: "error while updating information"
    })
}
 await User.updateOne(req.body , {
    id: req.userId
 })
  res.json({
    message: "Update sucessfully"
  })
})




//filter user route
router.get("/bulk", async (req, res) => {
  const filter = req.query.filter || "";

  const users = await User.find({
    $or: [
      {
        firstName: {
          $regex: filter,
        },
      },
      {
        lastName: {
          $regex: filter,
        },
      },
    ],
  });

  res.json({
    user: users.map((user) => ({
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      _id: user._id,
    })),
  });
});



//current user route
router.get("/getUser", authMiddleware, async (req, res) => {
  const user = await User.findOne({
    _id: req.userId,
  });
  res.json(user);
});

module.exports = router;





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
    username: req.body.username,
  });

  if (!user) {
    return res.status(404).json("User not found!");
  }

   if (user) {
    const match = await (req.body.password, user.password);
    if (!match) {
      return res.status(401).json("Wrong credentials!");
    }

    const token = jwt.sign(
      {
        userId: user._id,
      },
      JWT_SECRET
    );

    res.status(200).json({
      token: token,
    });
    return;
  }
});

module.exports = router;