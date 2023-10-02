var express = require('express');
var router = express.Router();
var sender_controller = require('../controller/sender_controller');
var user_controller = require('../controller/user_controller');
var hacienda_controller = require('../controller/hacienda_controller');
var dte = require('../models/dte');


//Inicio
router.get('/', async (req, res)=>{
    res.render('portal/index');
});

//Registramos la terminal
router.post('/insertTerminal',sender_controller.insertDevice);

//Obtenemos todas las terminales registradas en el sistema
router.get('/getAllTerminals', sender_controller.getAllTerminal);

//Activar o desactivar terminales
router.get('/action/:id/:action', sender_controller.updateStatus);


// -------------------------------------- VISTAS --------------------------------------
//Login, Inicio de sesión
router.get('/login', async (req,res)=>{
    res.render('portal/login', {message:""});
});
//Accion de iniciar sesion
router.post('/login', user_controller.auth);

//home
router.get('/:idSucursal/home', async (req, res)=>{
    var username = req.cookies.username;
    if (!username && !req.session.isLoggedIn && !req.session.idSucursal) res.redirect('/portal');

    var documentosEmitidos = await dte.countDocuments({isAnul: { $exists: false }});
    var documentosAnulados = await dte.countDocuments({isAnul: { $exists: true }});

    res.render('portal/home',{
        fullname: req.cookies.fullname,
        nFac:documentosEmitidos,
        nAnul:documentosAnulados,
        idSucursal:req.session.idSucursal
    });
});


//Documentos emitidos
router.get('/dte/:idSucursal/submitted', sender_controller.getSubmitted);

//Documentos anulados
router.get('/dte/:idSucursal/voided', sender_controller.getVoided);


//Cerrar Sesion
router.get('/logout', (req, res)=>{
    req.session.destroy();
    res.clearCookie('username');
    res.clearCookie('fullname');
    res.redirect('/portal');
});


//Petición para anular orden
router.get('/dte/void/:idOrden', hacienda_controller.postAnulacion);

//Petición para visualizar orden
router.get('/dte/watch/:idOrden', sender_controller.singleDocument);


module.exports = router;
