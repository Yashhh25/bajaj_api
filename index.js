const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const validator = require("validator");
require("dotenv").config();
console.log(process.env.MONGO_URI);

const app = express();

app.use(cors());
app.use(express.json());

// ---------------- DB ----------------

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// ---------------- Schema ----------------

const ticketSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    customerEmail: {
      type: String,
      required: true,
      validate: {
        validator: validator.isEmail,
        message: "Invalid email format",
      },
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      required: true,
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const Ticket = mongoose.model("Ticket", ticketSchema);

// ---------------- Helpers ----------------

const slaHours = {
  urgent: 1,
  high: 4,
  medium: 24,
  low: 72,
};

function formatTicket(ticket) {
  const data = ticket.toObject();

  const endTime =
    data.status === "resolved" && data.resolvedAt
      ? new Date(data.resolvedAt)
      : new Date();

  const ageMinutes = Math.floor(
    (endTime - new Date(data.createdAt)) / (1000 * 60)
  );

  const targetMinutes = slaHours[data.priority] * 60;

  const slaBreached = ageMinutes > targetMinutes;

  return {
    ...data,
    ageMinutes,
    slaBreached,
  };
}

function isValidTransition(currentStatus, newStatus) {
  const order = ["open", "in_progress", "resolved", "closed"];

  const currentIndex = order.indexOf(currentStatus);
  const newIndex = order.indexOf(newStatus);

  // same status
  if (currentIndex === newIndex) return true;

  // next step
  if (newIndex === currentIndex + 1) return true;

  // backward one step only
  if (newIndex === currentIndex - 1) return true;

  return false;
}

// ---------------- Routes ----------------

app.get("/", (req, res) => {
  res.send("API Running Successfully");
});

// CREATE
app.post("/tickets", async (req, res) => {
  try {
    const ticket = await Ticket.create(req.body);

    res.status(201).json(formatTicket(ticket));
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

// GET ALL + FILTERS
app.get("/tickets", async (req, res) => {
  try {
    const { status, priority, breached } = req.query;

    const query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;

    const tickets = await Ticket.find(query);

    let formattedTickets = tickets.map(formatTicket);

    if (breached === "true") {
      formattedTickets = formattedTickets.filter(
        (ticket) => ticket.slaBreached
      );
    }

    res.json(formattedTickets);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// UPDATE STATUS
app.patch("/tickets/:id", async (req, res) => {
  try {
    const { status } = req.body;

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket not found",
      });
    }

    if (!status) {
      return res.status(400).json({
        message: "Status is required",
      });
    }

    const valid = isValidTransition(ticket.status, status);

    if (!valid) {
      return res.status(400).json({
        message: `Invalid transition from ${ticket.status} to ${status}`,
      });
    }

    // resolved logic
    if (status === "resolved") {
      ticket.resolvedAt = new Date();
    }

    // moved back from resolved
    if (
      ticket.status === "resolved" &&
      status === "in_progress"
    ) {
      ticket.resolvedAt = null;
    }

    ticket.status = status;

    await ticket.save();

    res.json(formatTicket(ticket));
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

// DELETE
app.delete("/tickets/:id", async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket not found",
      });
    }

    res.json({
      message: "Ticket deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

// STATS
app.get("/tickets/stats", async (req, res) => {
  try {
    const tickets = await Ticket.find();

    const stats = {
      status: {
        open: 0,
        in_progress: 0,
        resolved: 0,
        closed: 0,
      },
      priority: {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0,
      },
      breachedOpenTickets: 0,
    };

    tickets.forEach((ticket) => {
      stats.status[ticket.status]++;
      stats.priority[ticket.priority]++;

      const formatted = formatTicket(ticket);

      if (
        formatted.slaBreached &&
        ticket.status !== "resolved" &&
        ticket.status !== "closed"
      ) {
        stats.breachedOpenTickets++;
      }
    });

    res.json(stats);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;