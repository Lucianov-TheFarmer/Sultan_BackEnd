const mongoose = require("mongoose");

const DadosSchema = new mongoose.Schema({
  name: String,
  criador: String,
  descricao: String,
  contato: String,
  endereco: String,
  featuredImage: {
    type: String,
    //required: true
  },
  images: [{ type: String }],
});

const Dados = mongoose.model("Dados", DadosSchema);

module.exports = Dados;
