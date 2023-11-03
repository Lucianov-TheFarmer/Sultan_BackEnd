// Importar Express
const express = require("express");
const app = express.Router();

// Importar Dados para inserção de dados
const Dados = require("../schemas/Dados");
const User = require("../schemas/Users");

// Importar Middleware de autenticação
const AuthMiddleware = require("../middleware/Auth");
const secret = require("../../config/auth");

// Importar Middleware de upload de imagens
const upload = require("../middleware/Multer");

const jwt = require("jsonwebtoken");

// Middleware para verificar o token JWT e extrair o userId
function verifyToken(req, res, next) {
  // Obter o token do cabeçalho de autorização
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    // Verificar o token
    jwt.verify(token, secret.secret, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }

      // Definir o userId a partir do token
      req.userId = user.id;
      console.log(req.userId);
      next();
    });
  } else {
    res.sendStatus(401);
  }
}

//Enviar texto para a página inicial
app.get("/", (req, res) => {
  Dados.find({})
    .then((Dados) => {
      res.send("Server online!");
    })
    .catch((error) => {
      res.status(500).send(error);
    });
});

// Inserir novas entradas na rota /dados
// Utilizar verificação com middleware de autenticação para permitir a entrada na rota
// O ID do usuário é enviado também
app.post("/dados", AuthMiddleware, async (req, res) => {
  const dados = new Dados({ ...req.body, criador: req.uid });
  try {
    await dados.save();
    res.status(201).send(dados);
  } catch (error) {
    res.status(500).send(error);
  }

  // Inserir multiplas entradas simultaneamente:
  //Dados.insertMany(req.body).then((Dados) => {
  //    res.status(201).send(Dados);
  //}).catch((error) => {
  //    res.status(400).send(error);
  //})
});

// Recuperar todas as entradas da rota /dados
app.get("/dados", async (req, res) => {
  try {
    const dados = await Dados.find({});
    res.status(200).send(dados);

    // Definir quais parâmetros recuperar
    // .then(data => {
    //     const projects = data.map(project => {
    //         return {name:project.name, curso:project.curso, description:project.description, featuredImage:project.featuredImage, images:project.images}
    //     });
    //     res.send(projects);
    // }).catch(error => {
    //     console.error("Erro ao obter projeto no banco de dados", error);
    //     res.status(400).send({error: "Não foi possível obter os dados do projeto. Tente novamente"})
    // })
  } catch (error) {
    res.status(500).send(error);
  }
});

// Recupera todos os cadastros do usuário logado
app.get("/dados/profile", AuthMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.uid);
    const dados = await Dados.find({ criador: req.uid });
    res.send({ user: user.name, dados });
  } catch (error) {
    res.status(500).send(error);
  }
});

// Recuperar uma entrada específica da rota /dados, baseado no id da entrada
app.get("/dados/:id", async (req, res) => {
  try {
    const dados = await Dados.findById(req.params.id);
    if (!dados) {
      return res.status(404);
    }
    res.status(200).send(dados);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Editar uma entrada específica da rota /dados, baseado no id da entrada
// Utilizar verificação com middleware de autenticação para permitir a entrada na rota
// É recuperado o token com a função verifyToken e após sua decodificação é comparado com o userId
app.patch("/dados/:id", verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.userId;
    const cadastro = await Dados.findById(id);

    if (!cadastro) {
      return res.status(404).send({ error: "Cadastro não encontrado" });
    }
    // Se o usuário logado não for o criador do cadastro, enviar uma resposta de erro
    if (cadastro.userId !== userId) {
      return res
        .status(403)
        .send({ error: "Você não tem permissão para editar este cadastro" });
    }

    // Atualizar o cadastro com os dados do corpo da requisição
    Object.assign(cadastro, req.body);

    // Salvar o cadastro atualizado
    await cadastro.save();

    // Enviar o cadastro atualizado como resposta
    res.send(cadastro);
  } catch (error) {
    console.error(error); // Adicione este log

    res.status(500).send(error);
  }
});

// Deletar uma entrada específica da rota /dados, baseado no id da entrada
// Utilizar verificação middleware de autenticação para permitir a entrada na rota
app.delete("/dados/:id", verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.userId;

    const cadastro = await Dados.findById(id);

    if (!cadastro) {
      return res.status(404).send({ error: "Cadastro não encontrado" });
    }

    if (cadastro.userId !== userId) {
      return res
        .status(403)
        .send({ error: "Você não tem permissão para remover este cadastro" });
    }

    await Dados.deleteOne({ _id: id });

    res.send({ message: "Cadastro removido com sucesso" });
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
});

// Receber imagens dos usuários
app.post(
  "/featured-image/:id",
  [AuthMiddleware, upload.single("featuredImage")],
  (req, res) => {
    const { file } = req;
    if (file) {
      User.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            featuredImage: file.path,
          },
        },
        { new: true }
      )
        .then((project) => {
          return res.send({ project });
        })
        .catch((error) => {
          console.error("Erro ao associar imagem ao projeto", error);
          res.status(500).send({ error: "Ocorreu um erro, tente novamente" });
        });
    } else {
      return res.status(400).send({ error: "Nenhuma imagem enviada" });
    }
  }
);

// Receber múltiplas imagens simultaneamente
app.post("/images/:id", upload.array("images"), (req, res) => {
  const { files } = req;

  if (files && files.length > 0) {
    const images = [];
    files.forEach((file) => {
      images.push(file.path);
    });
    User.findByIdAndUpdate(req.params.id, { $set: { images } }, { new: true })
      .then((project) => {
        return res.send({ project });
      })
      .catch((error) => {
        console.error("Erro ao associar imagens ao projeto", error);
        res.status(500).send({ error: "Ocorreu um erro, tente novamente" });
      });
  } else {
    return res.status(400).send({ error: "Nenhuma imagem enviada" });
  }
});

module.exports = app;
