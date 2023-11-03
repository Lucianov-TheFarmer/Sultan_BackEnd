const jwt = require("jsonwebtoken");
const authConfig = require("../../config/auth");

function Verificar(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const tokenData = authHeader.split(" ");
    if (tokenData.length !== 2) {
      return res.status(401).send({ error: "No valid token provided" });
    }

    const [scheme, token] = tokenData;
    if (scheme.indexOf("Bearer") < 0) {
      return res.status(401).send({ error: "No valid token provided" });
    }

    jwt.verify(token, authConfig.secret, (err, decoded) => {
      console.log(decoded);
      if (err) {
        return res.status(401).send({ error: "No valid token provided" });
      } else {
        req.uid = decoded.uid;
        return next();
      }
    });
  } else {
    return res.status(401).send({ error: "No valid token provided" });
  }
}

module.exports = Verificar;
