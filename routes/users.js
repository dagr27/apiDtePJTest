var express = require('express');
var router = express.Router();

var user_controller = require('../controller/user_controller');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

//Agregamos el usuario
router.post('/add', user_controller.insertUser);


module.exports = router;
