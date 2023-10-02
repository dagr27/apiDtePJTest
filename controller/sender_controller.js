const Device = require('../models/keys');
var dteOrder = require('../models/dte');
var qrcode = require('qrcode');

//Funcion para insertar terminal
module.exports.insertDevice = async (req, res) => {
    var terminalId = "a$p" + req.body.terminalId + "tr0";
    var jsonToInsert = {
        "sucursal": req.body.sucursal,
        "terminalId": terminalId,
        "isActive": Number(req.body.isActive)
    }
    const device = new Device(jsonToInsert);
    device.save()
        .then((data) => {
            return res.status(200).json({
                status: true,
                message: "El equipo ha sido registrado satisfactoriamente."
            })
        }).catch(
            (err) => {
                console.log(err);
                return res.status(400).json({
                    status: false,
                    message: "Error al intentar registrar el equipo"
                });
            }
        );
}

//Funcion para obtener todas las terminales registradas y su estado
module.exports.getAllTerminal = async (req,res)=>{
    try{
        var data = await Device.find();
        return res.status(200).json(data);
    }catch(err){
        return res.status(400).json({
            status:false,
            message:"No se pudieron obtener todas las terminales"
        });
    }
}

//Actualizar el estado de la terminal
module.exports.updateStatus = async(req,res) =>{
    try{
        var activate = Number(req.params.action);
        var id = req.params.id;

        //Realizamos de forma asinctrona la busqueda por id, y posteriormente actualizamos con la nueva información
        const data = await Device.findOneAndUpdate({ _id: id }, {
            "isActive": activate
        });
        var mensaje = "enabled";
        if(activate == 0){
            mensaje="disabled"
        }
        //Si no falla entonces retornamos ok y un mensaje, con la información actualizada
        return res.status(200).json({
            "status":true,
            "isActive":mensaje,
            "Message": "La informacion se recibio corectamente"
        });
    }catch(err){
        return res.status(400).json({
            status:false,
            message:"No se pudo realizar la actualización ",
            err: err
        });
    }
}

//Validar si existe la terminal y esta activa
module.exports.getTerminals = async (terminalId) =>{
    var terminal = "a$p" + terminalId + "tr0";
    var result = await Device.find({"terminalId":terminal});
    if(result.length > 0){
        if(result[0].isActive == 1) return true;
    }
    
    return false;
}

//retornamos los documentos emitidos
module.exports.getSubmitted = async (req,res) =>{
    var username = req.cookies.username;
    if (!username && !req.session.isLoggedIn && !req.session.idSucursal) res.redirect('/portal');
    var dataTable = null;
    if(req.session.isAdmin == true){
        dataTable = await dteOrder.find({ isAnul: { $exists: false }});
    }else{
        dataTable = await dteOrder.find({idSucursal:req.params.idSucursal, isAnul: { $exists: false }});
    }
    res.render('portal/submitted', {
        fullname: "admin",
        data: dataTable,
        idSucursal:req.session.idSucursal
    });

}

//retornamos los documentos anulados
module.exports.getVoided = async (req,res) =>{
    var username = req.cookies.username;
    if (!username && !req.session.isLoggedIn && !req.session.idSucursal) res.redirect('/portal');
    var dataTable = null;
    if(req.session.isAdmin == true){
        dataTable = await dteOrder.find({ isAnul: { $exists: true }});
    }else{
        dataTable = await dteOrder.find({idSucursal:req.params.idSucursal, isAnul: { $exists: true }});
    }
    res.render('portal/void', {
        fullname: "admin",
        data: dataTable,
        idSucursal:req.session.idSucursal
    });
}


module.exports.singleDocument = async (req,res) =>{
    var username = req.cookies.username;
    if (!username && !req.session.isLoggedIn && !req.session.idSucursal) res.redirect('/portal');
    var document = await dteOrder.findById(req.params.idOrden);
    console.log(document);

    const url = "https://admin.factura.gob.sv/consultaPublica?ambiente=" + document.jsonInserted.identificacion.ambiente + "&codGen=" + document.jsonInserted.identificacion.codigoGeneracion + "&fechaEmi=" + document.jsonInserted.identificacion.fecEmi;


    qrcode.toDataURL(url, (err, dataUrl) => {
        if (err) return res.status(500).json({
            "message": err
        });
        var response = {}
        var htmlImg = dataUrl;
        response = document.jsonInserted;

        res.render('portal/documento', {
            qrHtml: htmlImg,
            documento: response,
            idInterno: document.idInterno,
            selloRecibido:document.sello,
            tipoDocumento: "FACTURA"
        });
    });
}