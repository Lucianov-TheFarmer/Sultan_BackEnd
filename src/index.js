// Importar banco de dados
require("./db/mongoose");

// Importar Express
const express = require("express");
const app = express();

// Importar controladores
const DadosController = require("./app/controllers/DadosController");
const Auth = require("./app/controllers/Auth");
const Uploads = require("./app/controllers/Uploads");

// Importar cors
const bodyParser = require("body-parser");
const cors = require("cors");
var corsOptions = {
  origin: "http://localhost:8080",
};
app.use(cors(corsOptions));

// Parsear requisições de diferentes conteúdos
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Definição de porta
const port = process.env.port || 8081;

// Acessar rotas
app.use("/", DadosController);
app.use("/auth", Auth);
app.use("/uploads", Uploads);

// Inicializar server
app.listen(port, (req, res) => {
  console.log(`Server rodando na porta ${port}`);
});
