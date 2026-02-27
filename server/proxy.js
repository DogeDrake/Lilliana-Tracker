// proxy.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const API_URL =
  "https://script.google.com/macros/s/AKfycbzZK88oC1nMRT_pDpnOXEfkHZNUhDPKXmJk-71mExOGw2HHw-0IfOxjXlMg45MM2MSY/exec";

app.get("/sheet/:name", async (req, res) => {
  const response = await fetch(`${API_URL}?sheet=${req.params.name}`);
  const data = await response.json();
  res.json(data);
});

app.post("/sheet/:name", async (req, res) => {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sheet: req.params.name, values: req.body }),
  });
  const data = await response.json();
  res.json(data);
});

app.listen(5173, () => console.log("Proxy corriendo en localhost:5173"));
