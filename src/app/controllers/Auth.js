// Importar Express
const express = require("express");
const router = express();
const path = require("path");

// Importar esquema de entrada do usuário
const User = require("../schemas/Users");
const Dados = require("../schemas/Dados");

// Importar ferramentas de criptografia
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const secret = require("../../config/auth");
const crypto = require("crypto");

// Importar ferramenta para mandar email de recuperação
const Mailer = require("../../modules/Mailer");

// Importar Middleware de upload de imagens
const upload = require("../middleware/Multer");

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
      req.userId = user.uid;
      next();
    });
  } else {
    res.sendStatus(401);
  }
}

// Gerar token de autenticação
const generateToken = (params) => {
  return jwt.sign(params, secret.secret, {
    expiresIn: 86400,
  });
};

// Fazer registro do usuário
router.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  User.findOne({ email })
    .then((userData) => {
      if (userData) {
        alert("Email já cadastrado!");
        return res.status(400).send({ error: "User already exists" });
      } else {
        User.create({ name, email, password })
          .then((user) => {
            //user.password = undefined;
            return res.send({ user });
          })
          .catch((error) => {
            console.error("Erro ao salvar usuário", error);
            res.status(400).send({ error: "Registration failed" });
          });
      }
    })
    .catch((error) => {
      console.error("Erro ao consultar usuário no banco de dados", error);
      return res.status(500).send({ error: "Registration failed" });
    });
});

// Fazer login
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  User.findOne({ email })
    .select("+password")
    .then((user) => {
      if (user) {
        bcrypt
          .compare(password, user.password)
          .then((result) => {
            if (result) {
              const token = generateToken({ uid: user.id });
              return res.send({ token: token, tokenExpiration: "1d" });
            } else {
              return res.status(400).send({ error: "Invalid password" });
            }
          })
          .catch((error) => {
            console.error("Erro ao verificar senha", error);
            return res.status(500).send({ error: "Internal server error" });
          });
      } else {
        res.status(404).send({ error: "User not found" });
      }
    })
    .catch((error) => {
      console.error("Login error", error);
      return res.status(500).send({ error: "Internal server error" });
    });
});

// Rota para atualizar os dados do usuário atual
router.put("/update", upload.single("image"), (req, res) => {
  const { name, descricao, telefone, password } = req.body;
  const authHeader = req.headers.authorization;
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).send({ error: "No token provided" });
  }

  jwt.verify(token, secret.secret, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: "Token invalid" });
    }

    User.findById(decoded.uid)
      .then((user) => {
        if (!user) {
          return res.status(404).send({ error: "User not found" });
        }

        user.name = name || user.name;
        user.descricao = descricao || user.descricao;
        user.telefone = telefone || user.telefone;
        user.password = password || user.password;
        if (req.file) {
          user.image = req.file.path;
        }

        user
          .save()
          .then(() => {
            res.send({ message: "User updated successfully" });
          })
          .catch((error) => {
            console.error("Error updating user", error);
            res.status(500).send({ error: "Error updating user" });
          });
      })
      .catch((error) => {
        console.error("Error finding user", error);
        res.status(500).send({ error: "Error finding user" });
      });
  });
});

// Deletar usuário
router.delete("/delete", verifyToken, async (req, res) => {
  // Extrair o token do cabeçalho Authorization
  const userId = req.userId;

  try {
    // Deletar todos os dados do usuário
    await Dados.deleteMany({ criador: userId });

    // Deletar o usuário pelo ID
    await User.findByIdAndDelete(userId);

    res
      .status(200)
      .send({ message: "User and all associated data deleted successfully" });
  } catch (error) {
    console.error("Error deleting user and associated data", error);
    res.status(500).send({ error: "Error deleting user and associated data" });
  }
});

// Enviar um email de recuperação de senha
router.post("/forgot-password", (req, res) => {
  const { email } = req.body;

  User.findOne({ email })
    .then((user) => {
      if (user) {
        const token = crypto.randomBytes(20).toString("hex");
        const expiration = new Date();
        expiration.setHours(new Date().getHours() + 3);

        User.findByIdAndUpdate(user.id, {
          $set: {
            passwordResetToken: token,
            passwordResetTokenExpiration: expiration,
          },
        })
          .then(() => {
            Mailer.sendMail(
              {
                to: email,
                from: "suporte@sultan.com",
                subject: "Recuperação de senha",
                template: "auth/forgot_password",
                context: { token },
              },
              (error) => {
                if (error) {
                  console.error("Erro ao enviar email", error);
                  return res
                    .status(400)
                    .send({ error: "Fail sending recover password mail" });
                } else {
                  return res.send();
                }
              }
            );
          })
          .catch((error) => {
            console.error(
              "Erro ao salvar o token de recuperação de senha",
              error
            );
            return res.status(500).send({ error: "Internal server error" });
          });
      } else {
        return res.status(404).send({ error: "User not found" });
      }
    })
    .catch((error) => {
      console.error("Erro no forgot password", error);
      return res.status(500).send({ error: "internal server error" });
    });
});

// Alterar senha utilizando o token enviado por email
router.post("/reset-password", (req, res) => {
  const { email, token, newPassword } = req.body;

  // Verifique se todos os campos necessários estão presentes
  if (!email || !token || !newPassword) {
    return res.status(400).send({ error: "Missing required fields" });
  }

  User.findOne({ email })
    .select("+passwordResetToken passwordResetTokenExpiration")
    .then(async (user) => {
      if (user) {
        if (
          token != user.passwordResetToken ||
          Date.now() > user.passwordResetTokenExpiration
        ) {
          return res.status(400).send({ error: "Invalid token" });
        } else {
          // user.passwordResetToken = undefined;
          // user.passwordResetTokenExpiration = undefined;

          user.password = newPassword;

          user
            .save()
            .then(() => {
              return res.send({ message: "Senha alterada com sucesso!" });
            })
            .catch((error) => {
              console.error("Erro ao salvar nova senha do usuário", error);
              return res.status(500).send({ error: "Internal server error" });
            });
        }
      } else {
        return res.status(404).send({ error: "User not found" });
      }
    })
    .catch((error) => {
      console.error("Erro no reset password", error);
      return res.status(500).send({ error: "Internal server error" });
    });
});

// Rota para recuperar os dados do usuário atual
router.get("/user", verifyToken, async (req, res) => {
  // Extrair o token do cabeçalho Authorization

  try {
    // Verificar o token e obter o ID do usuário
    const userId = req.userId;

    // Buscar o usuário pelo ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Enviar os dados do usuário como resposta
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/verifyPassword", async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, secret.secret);
    const user = await User.findById(decoded.uid).select("+password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    const passwordIsValid = await bcrypt.compare(
      req.body.password,
      user.password
    );

    if (passwordIsValid == false) {
      return res
        .status(401)
        .json({ success: false, message: "Password is incorrect" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
