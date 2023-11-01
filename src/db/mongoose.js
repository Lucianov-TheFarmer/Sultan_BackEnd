const mongoose = require("mongoose");
mongoose
  .connect("mongodb://127.0.0.1:27017/Capacitacao", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Conexão estabelecida");
  })
  .catch((error) => {
    console.log("Algo deu errado\n", error);
  });
