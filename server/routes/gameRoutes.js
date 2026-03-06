const express = require("express");
const router = express.Router();
const { pool } = require("../db");

// Сохранить игру
router.post("/game", async (req, res) => {
  const { player, score, duration } = req.body;

  await pool.query(
    "INSERT INTO games (player, score, duration) VALUES ($1, $2, $3)",
    [player, score, duration]
  );

  res.json({ message: "game saved" });
});

// Топ 10 игроков
router.get("/leaderboard", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM games ORDER BY score DESC LIMIT 10"
  );

  res.json(result.rows);
});

// Все игры
router.get("/games", async (req, res) => {
  const result = await pool.query("SELECT * FROM games");

  res.json(result.rows);
});

module.exports = router;
