const express = require("express");
const { authenticateJWT } = require("../middleware/auth");

const router = express.Router();

// Protect all ticket routes with authentication
router.use(authenticateJWT);

// GET /api/tickets - Get all tickets for authenticated user with optional filters
router.get("/", async (req, res) => {
  try {
    const db = global.db;
    const userId = req.user.id;
    const { status, priority } = req.query;

    let sql = "SELECT * FROM tickets WHERE user_id = ?";
    const params = [userId];

    // Apply filters with case-insensitive handling
    if (status) {
      sql += " AND LOWER(status) = LOWER(?)";
      params.push(status);
    }

    if (priority) {
      sql += " AND LOWER(priority) = LOWER(?)";
      params.push(priority);
    }

    sql += " ORDER BY created_at DESC";

    const tickets = await db.all(sql, params);

    res.json({ tickets });
  } catch (err) {
    console.error("Get tickets error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/tickets - Create new ticket
router.post("/", async (req, res) => {
  try {
    const db = global.db;
    const userId = req.user.id;
    const {
      title,
      description,
      priority = "Medium",
      status = "Open",
    } = req.body;

    // Validation
    if (!title || !description) {
      return res
        .status(400)
        .json({ error: "Title and description are required" });
    }

    // Normalize input for case-insensitive validation
    const normalizedPriority = priority.toLowerCase();
    const normalizedStatus = status.toLowerCase().replace("-", " ");

    const validPriorities = ["low", "medium", "high"];
    if (!validPriorities.includes(normalizedPriority)) {
      return res.status(400).json({ error: "Invalid priority" });
    }

    const validStatuses = ["open", "in progress", "resolved", "closed"];
    if (!validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Insert ticket
    await db.run(
      "INSERT INTO tickets (user_id, title, description, priority, status) VALUES (?, ?, ?, ?, ?)",
      [userId, title.trim(), description.trim(), priority, status],
    );

    // Fetch newly created ticket
    const ticket = await db.get(
      "SELECT * FROM tickets WHERE user_id = ? ORDER BY id DESC LIMIT 1",
      [userId],
    );

    res.status(201).json({ ticket });
  } catch (err) {
    console.error("Create ticket error:", err);
    res.status(500).json({ error: "Internal server error creating ticket" });
  }
});

// PUT /api/tickets/:id - Update ticket
router.put("/:id", async (req, res) => {
  try {
    const db = global.db;
    const userId = req.user.id;
    const ticketId = req.params.id;
    const { title, description, priority, status } = req.body;

    // Check if ticket exists and belongs to user
    const ticket = await db.get(
      "SELECT * FROM tickets WHERE id = ? AND user_id = ?",
      [ticketId, userId],
    );
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push("title = ?");
      params.push(title.trim());
    }

    if (description !== undefined) {
      updates.push("description = ?");
      params.push(description.trim());
    }

    if (priority !== undefined) {
      const validPriorities = ["low", "medium", "high"];
      if (!validPriorities.includes(priority.toLowerCase())) {
        return res.status(400).json({ error: "Invalid priority" });
      }
      updates.push("priority = ?");
      params.push(priority);
    }

    if (status !== undefined) {
      const normalizedStatus = status.toLowerCase().replace("-", " ");
      const validStatuses = ["open", "in progress", "resolved", "closed"];
      if (!validStatuses.includes(normalizedStatus)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      updates.push("status = ?");
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    params.push(ticketId, userId);

    const sql = `UPDATE tickets SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`;
    await db.run(sql, params);

    // Get updated ticket
    const updatedTicket = await db.get("SELECT * FROM tickets WHERE id = ?", [
      ticketId,
    ]);

    res.json({ ticket: updatedTicket });
  } catch (err) {
    console.error("Update ticket error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/tickets/:id - Delete ticket
router.delete("/:id", async (req, res) => {
  try {
    const db = global.db;
    const userId = req.user.id;
    const ticketId = req.params.id;

    // Check if ticket exists and belongs to user
    const ticket = await db.get(
      "SELECT * FROM tickets WHERE id = ? AND user_id = ?",
      [ticketId, userId],
    );
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    // Delete ticket
    await db.run("DELETE FROM tickets WHERE id = ? AND user_id = ?", [
      ticketId,
      userId,
    ]);

    res.json({ message: "Ticket deleted successfully" });
  } catch (err) {
    console.error("Delete ticket error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
