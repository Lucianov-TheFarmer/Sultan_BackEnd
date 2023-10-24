// Importar banco de dados
require('./db/mongoose');

// Importar Express
const express = require('express');
const app = express();

// Importar controladores
const routesController = require("./app/controllers/routesController");
const Auth = require("./app/controllers/Auth");
const Uploads = require("./app/controllers/Uploads")

// Importar cors
const bodyParser = require("body-parser");
const cors = require("cors");
var corsOptions = {
    origin: "http://localhost:8081"
  };
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Definição de variáveis
//const port = 3000;
const port = process.env.port || 8080;

app.use(express.json());

app.use("/", routesController);
app.use("/auth", Auth);
app.use("/uploads", Uploads);

app.listen(port, (req,res) => {
    console.log(`Server rodando na porta ${port}`);
})

