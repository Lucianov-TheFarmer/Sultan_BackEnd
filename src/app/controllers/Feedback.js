// Importar Express
const express = require("express");
const app = express.Router();

const Feedback = require("../schemas/Feedback");

app.post("/enviar", (req, res) => {
  const { nome, telefone, email, mensagem } = req.body;
  const newFeedback = new Feedback({ nome, telefone, email, mensagem });
  newFeedback
    .save()
    .then(() => res.json("Feedback adicionado!"))
    .catch((err) => res.status(400).json("Erro: " + err));
});

module.exports = app;
