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

// Importar ferramentas de criptografia
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Importar ferramenta para validação de dados
const Joi = require("joi");

const schema = Joi.object({
  nome: Joi.string().required(),
  descricao: Joi.string().required(),
  telefone: Joi.string().required(),
  endereco: Joi.string().required(),
  categoria: Joi.string().required(),
  imagemPrincipal: Joi.string(), // tornar opcional
  outrasImagens: Joi.array().items(Joi.string()),
  password: Joi.string().required(),
});

// Middleware para verificar o token JWT e extrair o userId
function verifyToken(req, res, next) {
  // Obter o token do cabeçalho de autorização
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    // Verificar o token
    jwt.verify(token, secret.secret, (err, user) => {
      if (err) {
        console.log(err);
        return res.sendStatus(403);
      }
      // Definir o userId a partir do token
      req.userId = user.uid;
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
// app.post("/dados", AuthMiddleware, async (req, res) => {
//   const dados = new Dados({ ...req.body, criador: req.uid });
//   try {
//     await dados.save();
//     res.status(201).send(dados);
//   } catch (error) {
//     res.status(500).send(error);
//   }

//   // Inserir multiplas entradas simultaneamente:
//   //Dados.insertMany(req.body).then((Dados) => {
//   //    res.status(201).send(Dados);
//   //}).catch((error) => {
//   //    res.status(400).send(error);
//   //})
// });
app.post(
  "/dados",
  verifyToken,
  upload.fields([
    { name: "imagemPrincipal", maxCount: 1 },
    { name: "outrasImagens", maxCount: 10 },
  ]),
  async (req, res, next) => {
    if (req.files && req.files.imagemPrincipal) {
      req.body.imagemPrincipal = req.files.imagemPrincipal[0].path;
    }

    if (req.files && req.files.outrasImagens) {
      req.body.outrasImagens = req.files.outrasImagens.map((file) => file.path);
    } else {
      req.body.outrasImagens = [];
    }

    try {
      // Validar os dados
      const { error, value } = schema.validate(req.body);
      if (error) {
        throw new Error("Dados inválidos");
      }

      // Verificar a senha
      const user = await User.findById(req.userId).select("+password");
      const validPassword = await bcrypt.compare(
        req.body.password,
        user.password
      );
      if (!validPassword) {
        return res.status(400).send({ message: "Senha inválida" });
      }

      // Adicionar o userId ao objeto de dados
      value.criador = req.userId;
      console.log(value);
      // Salvar os dados no banco de dados
      const dados = new Dados(value);
      console.log(dados);
      await dados.save();
      console.log("Dados salvos");

      res.status(201).send(dados);
    } catch (error) {
      next(error);
    }
  }
);

// Recuperar todas as entradas da rota /dados
app.get("/dados", async (req, res) => {
  try {
    const searchQuery = req.query.search || "";
    const dados = await Dados.find({
      nome: { $regex: new RegExp(searchQuery, "i") },
    });
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
app.patch(
  "/dados/:id",
  verifyToken,
  upload.fields([
    { name: "imagemPrincipal", maxCount: 1 },
    { name: "outrasImagens", maxCount: 10 },
  ]),
  async (req, res) => {
    if (req.files && req.files.imagemPrincipal) {
      req.body.imagemPrincipal = req.files.imagemPrincipal[0].path;
    }

    if (req.files && req.files.outrasImagens) {
      req.body.outrasImagens = req.files.outrasImagens.map((file) => file.path);
    } else {
      req.body.outrasImagens = [];
    }
    try {
      const id = req.params.id;
      const userId = req.userId;
      const cadastro = await Dados.findById(id);

      if (!cadastro) {
        return res.status(404).send({ error: "Cadastro não encontrado" });
      }

      if (cadastro.criador !== userId) {
        return res
          .status(403)
          .send({ error: "Você não tem permissão para editar este cadastro" });
      }
      // Verificar a senha
      const user = await User.findById(req.userId).select("+password");
      const validPassword = await bcrypt.compare(
        req.body.password,
        user.password
      );
      if (!validPassword) {
        return res.status(400).send({ message: "Senha inválida" });
      }
      // Atualizar o cadastro com os dados do corpo da requisição
      Object.assign(cadastro, req.body);

      // Salvar o cadastro atualizado
      await cadastro.save();

      // Enviar o cadastro atualizado como resposta
      res.send(cadastro);
    } catch (error) {
      console.error(error);

      res.status(500).send(error);
    }
  }
);

// Deletar uma entrada específica da rota /dados, baseado no id da entrada
// Utilizar verificação middleware de autenticação para permitir a entrada na rota
app.delete("/dados/:id", verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    const password = req.body.password;

    const cadastro = await Dados.findById(id);
    if (!cadastro) {
      return res.status(404).send({ error: "Cadastro não encontrado" });
    }

    // Verificar a senha
    const user = await User.findById(req.userId).select("+password");
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).send({ message: "Senha inválida" });
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
