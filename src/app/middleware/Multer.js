const multer = require("multer");
const Slugify = require("../../utils/Slugify")

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/images');
    },
    filename: (req, file, cb) => {
      const [filename, extension] = file.originalname.split('.');
      cb(null, `${Slugify(filename)}.${extension}`);
    },
});

const upload = multer({storage:storage})
  
module.exports = upload;
