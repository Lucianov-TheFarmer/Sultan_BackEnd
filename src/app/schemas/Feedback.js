const mongoose = require("mongoose");

const FeedbackSchema = new mongoose.Schema({
  nome: String,
  telefone: String,
  email: String,
  mensagem: String,
});

const Feedback = mongoose.model("Feedback", FeedbackSchema);

module.exports = Feedback;
