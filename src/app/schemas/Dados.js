const mongoose = require("mongoose");

const DadosSchema = new mongoose.Schema({
    name: String,
    curso: String,
    description: String     
});

const Dados = mongoose.model("Dados", DadosSchema);

module.exports = Dados;