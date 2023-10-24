const nodemailer = require("nodemailer");
const hbs = require("nodemailer-express-handlebars");
const path = require("path");
const mailConfig = require("../config/mail")

const transport = nodemailer.createTransport({
    host: mailConfig.host,
    port: mailConfig.port,
    auth: mailConfig.auth
});

transport.use("compile", hbs({
    viewEngine: {
        extName: ".hbs",
        partialsDir: "./src/resources/mail",
        layoutsDir: "./src/resources/mail",
        defaultLayout: null,
    },
    viewPath: path.resolve("./src/resources/mail"),
    extName: ".html"
}));

module.exports = transport;