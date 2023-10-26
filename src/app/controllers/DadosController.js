// Importar Express
const express = require('express');
const app = express.Router();

// Importar Dados para inserção de dados
const Dados = require('../schemas/Dados');
const User = require("../schemas/Users");

// Importar Middleware de autenticação
const AuthMiddleware = require("../middleware/Auth");

// Importar Middleware de upload de imagens
const upload = require("../middleware/Multer")

//Enviar texto para a página inicial
app.get("/", (req,res) => {
    Dados.find({}).then((Dados) => {
        res.send("Server online!");
    }).catch((error) => {
        res.status(500).send(error);
    })
})

// Inserir novas entradas na rota /dados 
// Utilizar verificação middleware de autenticação para permitir a entrada na rota  
app.post("/dados", AuthMiddleware, async (req,res) => {
    const dados = new Dados(req.body);
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

})

// Recuperar todas as entradas da rota /dados
app.get("/dados", async (req,res) => {
    try{
        const dados = await Dados.find({})
        res.status(200).send(dados)

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
        
})

// Recuperar uma entrada específica da rota /dados, baseado no id da entrada
app.get("/dados/:id", async (req,res) => {
    try{
        const dados = await Dados.findById(req.params.id);
        if (!dados){
            return res.status(404)
        }
        res.status(200).send(dados);
    } catch(error) {
        res.status(500).send(error);
    }

    // Outra alternativa
    // Dados.findOne({_id: req.params.id}).then((Dados) => {
    //     if (!Dados) {
    //         return res.status(404).send();
    //     }
    //     res.send(Dados);

    // }).catch((error) => {
    //     res.status(500).send(error);
    // })
})

// Editar uma entrada específica da rota /dados, baseado no id da entrada
// Utilizar verificação middleware de autenticação para permitir a entrada na rota  
app.patch("/dados/:id", AuthMiddleware, async (req,res) => {
    try{
        const dados = await Dados.findByIdAndUpdate(req.params.id, req.body, {new: true});
        if (!dados){
            return res.status(404)
        }
        res.status(200).send(dados);
    } catch(error) {
        res.status(500).send(error);
    }
})

// Deletar uma entrada específica da rota /dados, baseado no id da entrada
// Utilizar verificação middleware de autenticação para permitir a entrada na rota  
app.delete("/dados/:id", AuthMiddleware, async (req,res) => {
    try{
        const dados = await Dados.findByIdAndDelete(req.params.id);
        if (!dados){
            return res.status(404).send();
        }
        res.send(dados);
    } catch(error) {
        res.status(500).send(error);
    }
})

// Receber imagens dos usuários
app.post("/featured-image/:id", [AuthMiddleware, upload.single("featuredImage")], (req,res) => {
    const {file} = req;
    if (file) {
        User.findByIdAndUpdate(req.params.id, {$set: {
            featuredImage: file.path
        }}, {new: true}).then(project => {
            return res.send({project});
        }).catch(error => {
            console.error("Erro ao associar imagem ao projeto", error);
            res.status(500).send({error: "Ocorreu um erro, tente novamente"})
        })
    } else {
        return res.status(400).send({error: "Nenhuma imagem enviada"})
    }
})

// Receber múltiplas imagens simultaneamente
app.post("/images/:id", upload.array("images"), (req,res) => {
    const {files} = req;

    if(files && files.length > 0) {
        const images = [];
        files.forEach(file => {
            images.push(file.path);
        });
        User.findByIdAndUpdate(req.params.id, {$set: {images}
        }, {new: true}).then(project => {
            return res.send({project});
        }).catch(error => {
            console.error("Erro ao associar imagens ao projeto", error);
            res.status(500).send({error: "Ocorreu um erro, tente novamente"})
        }) 
    } else {
        return res.status(400).send({error: "Nenhuma imagem enviada"})
    }
})

module.exports = app;
