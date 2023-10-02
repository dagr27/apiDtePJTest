var express = require('express');
var router = express.Router();
var mhController = require('../controller/hacienda_controller');
router.get('/testConnection', (req,res)=>{
    res.status(200).send("El API esta en linea");
});

//Enviar factura consumidor final
router.post('/sendFc', mhController.postFacturaConsumidorFinal);

//Enviar anulacion
router.post('/sendAnul', mhController.postAnulacion);

router.post('/TestEmail', mhController.postFacturaConsumidorFinalTest);

//GetToken
//router.post('/token', mhController.getToken);

module.exports = router;
