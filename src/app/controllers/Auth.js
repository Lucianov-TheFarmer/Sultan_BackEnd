// Importar Express
const express = require("express"); 
const router = express();
const path = require('path');

// Importar esquema de entrada do usuário
const User = require("../schemas/Users");

// Importar ferramentas de criptografia 
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const secret = require("../../config/auth");
const crypto = require("crypto");

// Importar ferramenta para mandar email de recuperação
const Mailer = require("../../modules/Mailer")

// Gerar token de autenticação
const generateToken = params => {
    return jwt.sign(
        params,
        secret.secret,
        {
            expiresIn: 86400,
        },
    );
}

// Fazer registro do usuário
router.post("/register", (req,res) => {
    const {email, name, password} = req.body;
    User.findOne({email}).then(userData => {
        if (userData) {
            return res.status(400).send({error: "User already exists"});
        } else {
            User.create({name, email, password})
                .then((user) => {
                    //user.password = undefined;
                    return res.send({user});
                })
                .catch((error) => {
                    console.error("Erro ao salvar usuário", error);
                    res.status(400).send({error: "Registration failed"});
                });
        }
    }).catch(error => {
        console.error("Erro ao consultar usuário no banco de dados", error);
        return res.status(500).send({error: "Registration failed"});
    });
});

// Fazer login
router.post("/login", (req,res) => {
    const {email, password} = req.body;

    User.findOne({email})
    .select("+password")
    .then(user => {
        if (user) {
            bcrypt.compare(password, user.password)
            .then(result => {
                if (result) {
                    const token = generateToken({uid: user.id})
                    return res.send({token: token, tokenExpiration: "1d"});
                } else {
                    return res.status(400).send({error: "Invalid password"});
                }
            }).catch(error => {
                console.error("Erro ao verificar senha", error);
                return res.status(500).send({error: "Internal server error"});
            });
        } else {
            res.status(404).send({error: "User not found"});
        }
    }).catch(error => {
        console.error("Login error", error);
        return res.status(500).send({èrror: "Internal server error"});
    })
})

// Enviar um email de recuperação de senha - Inoperante
router.post("/forgot-password", (req,res) => {
    const {email} = req.body;

    User.findOne({email}).then(user => {
        if (user) {
            const token = crypto.randomBytes(20).toString("hex");
            const expiration = new Date();
            expiration.setHours(new Date().getHours() + 3);

            User.findByIdAndUpdate(user.id, {
                $set: {
                    passwordResetToken: token,
                    passwordResetTokenExpiration: expiration
                }
            }).then(() => {
                Mailer.sendMail({
                    to: email,
                    from:"suporte@gandalf.com",
                    subject:"Recuperação de senha",
                    template: "auth/forgot_password",
                    context: {token}
                }, error => {
                    if (error) {
                        console.error("Erro ao enviar email", error);
                        return res.status(400).send({error: "Fail sending recover password mail"});
                    } else {
                        return res.send();
                    }
                })
            }).catch(error => {
                console.error("Erro ao salvar o token de recuperação de senha", error);
                return res.status(500).send({error: "Internal server error"});
            })

        } else {
            return res.status(404).send({error: "User not found"});
        }
    }).catch(error => {
        console.error("Erro no forgot password", error);
      return res.status(500).send({error: "internal server error"});
    })
})

// Alterar senha utilizando o token enviado por email - Inoperante
router.post("/reset-password", (req,res) => {
    const {email, token, newPassword} = req.body;

    User.findOne({email})
    .select("+passwordResetToken passwordResetTokenExpiration")
    .then(user => {
        if (user) {
            if (token != user.passwordResetToken || new Date().now > user.passwordResetTokenExpiration) {
                return res.status(400).send({error: "Invalid token"})
            } else {
                user.passwordResetToken = undefined;
                user.passwordResetTokenExpiration = undefined;
                user.password = newPassword;

                user.save().then(() => {
                    return res.send({message: "Senha alterada com sucesso!"});
                }).catch(error => {
                    console.error("Erro ao salvar nova senha do usuário", error);
                    return res.status(500).send({error: "Internal server error"});
                })
            }
        } else {
            return res.status(404).send({error: "User not found"});
        }
    }).catch(error => {
        console.error("Erro no forgot password", error);
        return res.status(500).send({error: "Internal server error"});
    });
})

module.exports = router;
