const express = require("express");
const { authMiddleware } = require("./middleware");
const { Account, sequelize, Transaction, User } = require("../db");
const rateLimit = require("express-rate-limit");

const router = express.Router();

// Rate limiter for transfer endpoint
const transferLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: "Too many transfer requests, please try again later"
});

router.get("/balance", authMiddleware, async (req, res) => {
  const account = await Account.findOne({
    where: { userId: req.userId },
  });

  res.json({
    balance: account.balance,
  });
});

router.post("/transfer", transferLimiter, authMiddleware, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { amount, to } = req.body;

    // Don't allow transfer to oneself
    if (to == req.userId) {
      await transaction.rollback();
      return res.json({ message: "Cannot Transfer to yourself!" });
    }

    // Validation: amount must be positive and reasonable
    if (!amount || parseFloat(amount) <= 0) {
      await transaction.rollback();
      return res.status(400).json({ message: "Invalid amount" });
    }

    const MIN_TRANSFER = parseFloat(process.env.MIN_TRANSFER || "1");
    const MAX_TRANSFER = parseFloat(process.env.MAX_TRANSFER || "100000");
    
    if (parseFloat(amount) < MIN_TRANSFER || parseFloat(amount) > MAX_TRANSFER) {
      await transaction.rollback();
      return res.status(400).json({ 
        message: `Transfer must be between ₹${MIN_TRANSFER} and ₹${MAX_TRANSFER}` 
      });
    }

    // Fetch the accounts within transaction
    const account = await Account.findOne({
      where: { userId: req.userId },
      transaction,
      lock: true,
    });

    if (!account || parseFloat(account.balance) < parseFloat(amount)) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Insufficient balance",
      });
    }

    // Enforce daily transfer limit
    const DAILY_LIMIT = parseFloat(process.env.DAILY_LIMIT || "50000");
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date();
    endOfDay.setHours(23,59,59,999);

    const todaysTotal = await Transaction.sum('amount', {
      where: {
        senderId: req.userId,
        createdAt: { [sequelize.Sequelize.Op.between]: [startOfDay, endOfDay] }
      }
    });

    if ((parseFloat(todaysTotal || 0) + parseFloat(amount)) > DAILY_LIMIT) {
      await transaction.rollback();
      return res.status(400).json({ message: `Daily transfer limit of ₹${DAILY_LIMIT} exceeded` });
    }

    // Fetch the recipient account
    const toAccount = await Account.findOne({
      where: { userId: to },
      transaction,
      lock: true,
    });

    if (!toAccount) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Invalid account",
      });
    }

    // Perform the transfer within transaction
    await account.decrement("balance", { by: amount, transaction });
    await toAccount.increment("balance", { by: amount, transaction });

    // Record transaction history - single entry with sender and receiver info
    const txn = await Transaction.create({
      senderId: req.userId,
      receiverId: to,
      amount: amount,
      type: "transfer",
      status: "success",
    }, { transaction });

    // Commit Transaction
    await transaction.commit();

    // Send Socket.IO notification to receiver
    const io = req.app.get("io");
    if (io) {
      io.to(`user_${to}`).emit("notification", {
        type: "credit",
        amount: parseFloat(amount),
        from: req.userId,
        message: `You received ₹${parseFloat(amount).toFixed(2)}`,
        timestamp: new Date()
      });
    }

    res.json({
      message: "Transfer successful",
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({
      message: "Transfer failed",
      error: error.message,
    });
  }
});

router.get("/history", authMiddleware, async (req, res) => {
  try {
    const { type, from, to, minAmount, maxAmount, limit } = req.query;
    const where = {
      [sequelize.Sequelize.Op.or]: [
        { senderId: req.userId },
        { receiverId: req.userId }
      ]
    };

    if (type === 'credit') {
      where.receiverId = req.userId;
      delete where[sequelize.Sequelize.Op.or];
    } else if (type === 'debit') {
      where.senderId = req.userId;
      delete where[sequelize.Sequelize.Op.or];
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt[sequelize.Sequelize.Op.gte] = new Date(from);
      if (to) where.createdAt[sequelize.Sequelize.Op.lte] = new Date(to);
    }

    if (minAmount || maxAmount) {
      where.amount = {};
      if (minAmount) where.amount[sequelize.Sequelize.Op.gte] = parseFloat(minAmount);
      if (maxAmount) where.amount[sequelize.Sequelize.Op.lte] = parseFloat(maxAmount);
    }

    const transactions = await Transaction.findAll({
      where,
      include: [
        { model: User, as: "Sender", attributes: ["firstName", "lastName", "username"] },
        { model: User, as: "Receiver", attributes: ["firstName", "lastName", "username"] }
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit || 50, 10)
    });

    const formattedTransactions = transactions.map(txn => {
      const isSender = txn.senderId === req.userId;
      return {
        id: txn.id,
        amount: parseFloat(txn.amount),
        type: isSender ? "debit" : "credit",
        status: txn.status,
        date: txn.createdAt,
        otherParty: isSender 
          ? `${txn.Receiver.firstName} ${txn.Receiver.lastName}`
          : `${txn.Sender.firstName} ${txn.Sender.lastName}`,
        otherPartyEmail: isSender ? txn.Receiver.username : txn.Sender.username
      };
    });

    res.json({ transactions: formattedTransactions });
  } catch (error) {
    res.status(500).json({ message: "Error fetching transaction history", error: error.message });
  }
});

// export CSV
const { Parser } = require('json2csv');
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const transactionsRes = await Transaction.findAll({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { senderId: req.userId },
          { receiverId: req.userId }
        ]
      },
      include: [
        { model: User, as: "Sender", attributes: ["firstName", "lastName", "username"] },
        { model: User, as: "Receiver", attributes: ["firstName", "lastName", "username"] }
      ],
      order: [["createdAt", "DESC"]]
    });

    const rows = transactionsRes.map(txn => ({
      id: txn.id,
      date: txn.createdAt,
      amount: parseFloat(txn.amount),
      sender: `${txn.Sender.firstName} ${txn.Sender.lastName}`,
      senderEmail: txn.Sender.username,
      receiver: `${txn.Receiver.firstName} ${txn.Receiver.lastName}`,
      receiverEmail: txn.Receiver.username,
      status: txn.status
    }));

    const parser = new Parser();
    const csv = parser.parse(rows);
    res.header('Content-Type', 'text/csv');
    res.attachment('transactions.csv');
    return res.send(csv);
  } catch (error) {
    res.status(500).json({ message: 'Error exporting', error: error.message });
  }
});

// analytics - spending patterns
router.get('/analytics', authMiddleware, async (req, res) => {
  try {
    const { period = '7days' } = req.query;
    let startDate = new Date();
    
    if (period === '7days') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === '30days') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (period === '12months') {
      startDate.setMonth(startDate.getMonth() - 12);
    }

    const transactions = await Transaction.findAll({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { senderId: req.userId },
          { receiverId: req.userId }
        ],
        createdAt: { [sequelize.Sequelize.Op.gte]: startDate }
      },
      order: [["createdAt", "ASC"]]
    });

    const dailyData = {};
    transactions.forEach(txn => {
      const date = new Date(txn.createdAt).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { date, sent: 0, received: 0 };
      }
      if (txn.senderId === req.userId) {
        dailyData[date].sent += parseFloat(txn.amount);
      } else {
        dailyData[date].received += parseFloat(txn.amount);
      }
    });

    const chartData = Object.values(dailyData);

    // Summary stats
    const totalSent = await Transaction.sum('amount', {
      where: { senderId: req.userId, createdAt: { [sequelize.Sequelize.Op.gte]: startDate } }
    }) || 0;

    const totalReceived = await Transaction.sum('amount', {
      where: { receiverId: req.userId, createdAt: { [sequelize.Sequelize.Op.gte]: startDate } }
    }) || 0;

    res.json({
      chartData,
      summary: {
        totalSent: parseFloat(totalSent),
        totalReceived: parseFloat(totalReceived),
        netFlow: parseFloat(totalReceived) - parseFloat(totalSent)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching analytics', error: error.message });
  }
});

module.exports = router;