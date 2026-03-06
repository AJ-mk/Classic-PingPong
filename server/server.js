require("dotenv").config();

const express = require("express");
const path = require("path");
const { connectDB } = require("./db");

const app = express();
app.use(express.json());

// Подключение к PostgreSQL
connectDB();

// API роуты
app.use("/api", require("./routes/gameRoutes"));

// Статические файлы
app.use(express.static(path.join(__dirname, "../public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/admin.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
