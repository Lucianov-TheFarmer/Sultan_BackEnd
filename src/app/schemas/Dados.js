const mongoose = require("mongoose");

const DadosSchema = new mongoose.Schema({
  nome: String,
  criador: String,
  descricao: String,
  telefone: String,
  endereco: String,
  categoria: String,
  imagemPrincipal: {
    type: String,
    //required: true
  },
  outrasImagens: [{ type: String }],
});

const Dados = mongoose.model("Dados", DadosSchema);

module.exports = Dados;
