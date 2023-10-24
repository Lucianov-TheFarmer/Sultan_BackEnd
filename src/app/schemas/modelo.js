const mongoose = require("mongoose");

const ModeloSchema = new mongoose.Schema({
    name: String,
    curso: String,
    description: String     
});

const Modelo = mongoose.model("Modelo", ModeloSchema);

module.exports = Modelo;