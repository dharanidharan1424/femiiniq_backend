const express = require("express");
const router = express.Router();
const pool = require("../config/db.js");

// --- Start a Chat / Send Chat Request ---
router.post("/request", async (req, res) => {
    const { user_id, agent_id, message } = req.body;

    if (!user_id || !agent_id) {
        return res.status(400).json({ status: "error", message: "Missing required fields" });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // Check if chat already exists
        const [existing] = await conn.execute(
            "SELECT id, status FROM chats WHERE user_id = ? AND agent_id = ?",
            [user_id, agent_id]
        );

        let chatId;
        if (existing.length > 0) {
            chatId = existing[0].id;
            // If rejected, maybe reopen it as pending?
            if (existing[0].status === 'rejected') {
                await conn.execute("UPDATE chats SET status = 'pending' WHERE id = ?", [chatId]);
            }
        } else {
            const [result] = await conn.execute(
                "INSERT INTO chats (user_id, agent_id, status) VALUES (?, ?, 'pending')",
                [user_id, agent_id]
            );
            chatId = result.insertId;
        }

        // Insert initial message if provided
        if (message) {
            await conn.execute(
                "INSERT INTO messages (chat_id, sender_id, sender_type, message) VALUES (?, ?, 'user', ?)",
                [chatId, user_id, message]
            );
        }

        await conn.commit();
        res.json({ status: "success", chatId });
    } catch (error) {
        if (conn) await conn.rollback();
        console.error("Chat request error:", error);
        res.status(500).json({ status: "error", message: error.message });
    } finally {
        if (conn) conn.release();
    }
});

// --- Update Chat Status (Accept/Reject) ---
router.post("/status", async (req, res) => {
    const { chat_id, status } = req.body; // status: 'accepted' or 'rejected'

    if (!chat_id || !['accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ status: "error", message: "Invalid params" });
    }

    try {
        const [result] = await pool.execute(
            "UPDATE chats SET status = ? WHERE id = ?",
            [status, chat_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ status: "error", message: "Chat not found" });
        }

        res.json({ status: "success", message: `Chat ${status}` });
    } catch (error) {
        console.error("Update chat status error:", error);
        res.status(500).json({ status: "error", message: error.message });
    }
});

// --- Get Chat List for User ---
router.get("/list/user/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        const [rows] = await pool.execute(`
      SELECT 
        c.id as chat_id, 
        c.status,
        c.agent_id,
        a.name as agent_name,
        a.image as agent_image,
        m.message as last_message,
        m.created_at as last_timestamp,
        (SELECT COUNT(*) FROM messages WHERE chat_id = c.id AND is_read = 0 AND sender_type = 'agent') as unread_count
      FROM chats c
      JOIN agents a ON c.agent_id = a.id
      LEFT JOIN messages m ON m.id = (
        SELECT id FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1
      )
      WHERE c.user_id = ?
      ORDER BY last_timestamp DESC
    `, [userId]);

        res.json({ status: "success", data: rows });
    } catch (error) {
        console.error("Fetch user chat list error:", error);
        res.status(500).json({ status: "error", message: error.message });
    }
});

// --- Get Chat List for Agent ---
router.get("/list/agent/:agentId", async (req, res) => {
    const { agentId } = req.params;

    try {
        // Find numeric agent ID if it's alphanumeric
        let numericAgentId = agentId;
        console.log(`[CHAT] Fetching list for agentId: ${agentId}`);

        if (agentId && isNaN(parseInt(agentId)) && agentId.startsWith('FP')) {
            const [agentRows] = await pool.execute("SELECT id FROM agents WHERE agent_id = ?", [agentId]);
            if (agentRows.length > 0) {
                numericAgentId = agentRows[0].id;
                console.log(`[CHAT] Resolved ${agentId} to numeric ID: ${numericAgentId}`);
            } else {
                console.error(`[CHAT] Could not resolve ${agentId} to a numeric ID`);
            }
        }

        const [rows] = await pool.execute(`
      SELECT 
        c.id as chat_id, 
        c.status,
        c.user_id,
        u.name as user_name,
        u.image as user_image,
        m.message as last_message,
        m.created_at as last_timestamp,
        (SELECT COUNT(*) FROM messages WHERE chat_id = c.id AND is_read = 0 AND sender_type = 'user') as unread_count
      FROM chats c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN messages m ON m.id = (
        SELECT id FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1
      )
      WHERE c.agent_id = ?
      ORDER BY last_timestamp DESC
    `, [numericAgentId]);

        console.log(`[CHAT] Found ${rows.length} chats for agent ${numericAgentId}`);

        res.json({
            status: "success",
            data: rows,
            _debuginfo: { // Using a distinct key to ensure it's visible
                received_agent_id: agentId,
                resolved_numeric_id: numericAgentId,
                chats_found: rows.length,
                db_host: process.env.DB_HOST // Helpful for environment verification
            }
        });
    } catch (error) {
        console.error("Fetch agent chat list error:", error);
        res.status(500).json({ status: "error", message: error.message });
    }
});

// --- Get Messages for a Chat ---
router.get("/messages/:chatId", async (req, res) => {
    const { chatId } = req.params;

    try {
        const [chat] = await pool.execute("SELECT status FROM chats WHERE id = ?", [chatId]);
        if (chat.length === 0) return res.status(404).json({ status: "error", message: "Chat not found" });

        const [rows] = await pool.execute(
            "SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC",
            [chatId]
        );

        res.json({ status: "success", data: rows, chatStatus: chat[0].status });
    } catch (error) {
        console.error("Fetch messages error:", error);
        res.status(500).json({ status: "error", message: error.message });
    }
});

// --- Send a Message ---
router.post("/message", async (req, res) => {
    let { chat_id, sender_id, sender_type, message } = req.body;

    if (!chat_id || !sender_id || !sender_type || !message) {
        return res.status(400).json({ status: "error", message: "Missing required fields" });
    }

    try {
        // Resolve alphanumeric agent sender_id
        if (sender_type === 'agent' && isNaN(parseInt(sender_id)) && typeof sender_id === 'string' && sender_id.startsWith('FP')) {
            const [agentRows] = await pool.execute("SELECT id FROM agents WHERE agent_id = ?", [sender_id]);
            if (agentRows.length > 0) {
                sender_id = agentRows[0].id;
            }
        }
        // Check if chat is still active (not rejected)
        const [chat] = await pool.execute("SELECT status FROM chats WHERE id = ?", [chat_id]);
        if (chat.length === 0) return res.status(404).json({ status: "error", message: "Chat not found" });

        // Allow sending messages only if accepted OR if it's the first pending request from user
        if (chat[0].status === 'rejected') {
            return res.status(403).json({ status: "error", message: "Chat has been rejected" });
        }

        const [result] = await pool.execute(
            "INSERT INTO messages (chat_id, sender_id, sender_type, message) VALUES (?, ?, ?, ?)",
            [chat_id, sender_id, sender_type, message]
        );

        res.json({ status: "success", messageId: result.insertId });
    } catch (error) {
        console.error("Send message error:", error);
        res.status(500).json({ status: "error", message: error.message });
    }
});

module.exports = router;
