const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
    username: String,
    password: String,
    firstName: String,
    lastName: String,
})

const accountSchema =  mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId, // Reference to User model
    ref: "User",
    required: true,
  },
  balance: {
    type: Number,
    required: true,
  },
});


const Account = mongoose.model("Account", accountSchema);
const User = mongoose.model("user", userSchema);

module.exports = {
     User,
     Account,
};