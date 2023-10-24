const express = require('express');
const app = express.Router();

const Modelo = require('../schemas/modelo');
const User = require("../schemas/Users");

const AuthMiddleware = require("../middleware/Auth");

const upload = require("../middleware/Multer")

//Enviar texto para a página inicial
app.get("/", (req,res) => {
    Modelo.find({}).then((modelos) => {
        res.send("Server online!");
    }).catch((error) => {
        res.status(500).send(error);
    })
})

// Inserir novas entradas na rota /modelo 
// Utilizar verificação middleware de autenticação para permitir a entrada na rota  
app.post("/modelo", AuthMiddleware, async (req,res) => {
    const modelo = new Modelo(req.body);
    try {
        await modelo.save();
        res.status(201).send(modelo);
    } catch (error) {
        res.status(500).send(error);
    }
    //Modelo.create(req.body).then((modelo) => {
    //    res.status(201).send(modelo);
    //}).catch((error) => {
    //    res.status(400).send(error);
    //})

    // Inserir multiplas entradas simultaneamente:
    //Modelo.insertMany(req.body).then((modelos) => {
    //    res.status(201).send(modelos);
    //}).catch((error) => {
    //    res.status(400).send(error);
    //})

})

// Recuperar todas as entradas da rota /modelo
app.get("/modelo", async (req,res) => {
    try{
        const modelos = await Modelo.find({})
        res.status(200).send(modelos)
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

// Recuperar uma entrada específica da rota /modelo, baseado no id da entrada
app.get("/modelo/:id", async (req,res) => {
    try{
        const modelo = await Modelo.findById(req.params.id);
        if (!modelo){
            return res.status(404)
        }
        res.status(200).send(modelo);
    } catch(error) {
        res.status(500).send(error);
    }

    // Modelo.findOne({_id: req.params.id}).then((modelo) => {
    //     if (!modelo) {
    //         return res.status(404).send();
    //     }
    //     res.send(modelo);

    // }).catch((error) => {
    //     res.status(500).send(error);
    // })
})

// Editar uma entrada específica da rota /modelo, baseado no id da entrada
// Utilizar verificação middleware de autenticação para permitir a entrada na rota  
app.patch("/modelo/:id", AuthMiddleware, async (req,res) => {
    try{
        const modelo = await Modelo.findByIdAndUpdate(req.params.id, req.body, {new: true});
        if (!modelo){
            return res.status(404)
        }
        res.status(200).send(modelo);
    } catch(error) {
        res.status(500).send(error);
    }
})

// Deletar uma entrada específica da rota /modelo, baseado no id da entrada
// Utilizar verificação middleware de autenticação para permitir a entrada na rota  
app.delete("/modelo/:id", AuthMiddleware, async (req,res) => {
    try{
        const modelo = await Modelo.findByIdAndDelete(req.params.id);
        if (!modelo){
            return res.status(404).send();
        }
        res.send(modelo);
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
