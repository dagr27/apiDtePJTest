var axios = require('axios');
var sender_controller = require('../controller/sender_controller');
var dte_controller = require('../controller/dte_controller');

const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
var qrcode = require('qrcode');
var dteOrder = require('../models/dte');
const { loggers } = require('winston');


async function validateSender(token) {
    if (await sender_controller.getTerminals(token)) return true;
    return false;
}

async function emailProces(emailTo, jsonFactura, id) {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        // Renderiza el HTML utilizando EJS y almacena el resultado en una variable "htmlContent"
        const htmlContent = await renderMyEJS(id);
        console.log(htmlContent);
        // Establece el contenido HTML en la página
        await page.setContent(htmlContent);

        // Genera un PDF a partir del contenido HTML
        const pdfBuffer = await page.pdf({ format: 'Letter' });

        await browser.close();

        // Tu JSON como una variable
        jsonFactura.jsonInserted.documento = jsonFactura.documento;
        jsonFactura.jsonInserted.sello = jsonFactura.sello;
        const jsonData = jsonFactura.jsonInserted;

        // Configura el transporte de correo con nodemailer
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: 'dtefacturasv@gmail.com',
                pass: 'hugspveyjrwtdjip'
            }
        });
        const mailOptions = {
            from: 'dtefacturasv@gmail.com',
            to: emailTo,
            subject: 'NOTIFICACION FACTURA ELECTRONICA',
            text:  "Estimado/a cliente, \n \n" +
            "Adjunto encontrará factura electronica de su reciente compra. Por favor, revise los detalles. \n\n" +
            "Agradecemos su preferencia y quedamos a su disposición para cualquier consulta adicional. \n\n" +
            "Atentamente, \n\n" +
            "Sistema de Facturación Electrónica.",
            attachments: [
                {
                    filename: jsonFactura.codigoGeneracion+'_Factura.pdf',
                    content: pdfBuffer,
                },
                {
                    filename: jsonFactura.codigoGeneracion+'_Factura.json',
                    content: JSON.stringify(jsonData, null, 2), // Convierte el JSON a una cadena
                },
            ],
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error al enviar el correo electrónico: ', error);
            } else {
                console.log('Correo electrónico enviado: ', info.response);
            }
        });
    } catch (err) {
        console.log(err);
    }
}

async function renderMyEJS(id) {
    var document = await dteOrder.findById(id);

    const url = "https://admin.factura.gob.sv/consultaPublica?ambiente=" + document.jsonInserted.identificacion.ambiente + "&codGen=" + document.jsonInserted.identificacion.codigoGeneracion + "&fechaEmi=" + document.jsonInserted.identificacion.fecEmi;

    var htmlImg = await qrcode.toDataURL(url);

    const ejs = require('ejs');
    var response = {}
    response = document.jsonInserted;

    const template = await ejs.renderFile('./views/portal/documento.ejs', {
        qrHtml: htmlImg,
        documento: response,
        idInterno: document.idInterno,
        selloRecibido: document.sello,
        tipoDocumento: "FACTURA"
    });
    return template;

}

async function getToken() {
    try {
        const FormData = require('form-data');
        let data = new FormData();
        data.append('user', process.env.userToken);
        data.append('pwd', process.env.userPassword);

        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: process.env.mh_urlTest + '/seguridad/auth/',
            headers: {
                ...data.getHeaders()
            },
            data: data
        };

        var response = await axios.request(config);
        return response.data.body.token;
    } catch (err) {
        console.log(err);
        return false;
    }
}

module.exports.postFacturaConsumidorFinal = async (req, res) => {
    try {
        //Validamos si el dispositivo esta registrado para poder procesar las peticiones
        if (await validateSender(req.body.key) == false) return res.status(400).json({
            "status": false,
            "message": "No se ha proporcionado token para validar, o el dispositivo donde se esta realizando la petición no está registrado."
        });

        var jsonFactura = {
            ambiente: req.body.ambiente,
            idEnvio: 2,
            version: req.body.version,
            tipoDte: "01",
            documento: req.body.documento,
            codigoGeneracion: req.body.codigoGeneracion
        };

        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: process.env.mh_urlTest + '/fesv/recepciondte/',
            headers: {
                'Authorization': await getToken(),
                'Content-Type': 'application/json'
            },
            data: jsonFactura
        };

        var response = await axios.request(config);

        var jsonRespuesta = {
            "status": true,
            "estado": response.data.estado,
            "codigoGeneracion": response.data.codigoGeneracion,
            "sello": response.data.selloRecibido,
            "fechaRecibido": response.data.fhProcesamiento,
            "mensaje": response.data.descripcionMsg,
            "observaciones": response.data.observaciones,
            "urlHacienda": "https://admin.factura.gob.sv/consultaPublica?ambiente=" + response.data.ambiente + "&codGen=" + response.data.codigoGeneracion + "&fechaEmi=" + req.body.fecEmi
        }

        var jsonBackup = {
            idSucursal: req.body.idSucursal,
            jsonInserted: req.body.jsonInserted,
            codigoGeneracion: jsonFactura.codigoGeneracion,
            sello: jsonRespuesta.sello,
            fechaRecibido: jsonRespuesta.fechaRecibido,
            orderType: req.body.orderType,
            documento: req.body.documento
        };

        var status = dte_controller.insertDte(jsonBackup);
        //Guardamos la información en la base para poder respaldarla
        if (status[0]) {
            var emailTo = jsonBackup.jsonInserted.receptor.correo;
            if(emailTo === null || emailTo===''){
                emailTo = jsonBackup.jsonInserted.emisor.correo;
            }
            console.log("Se inserto la orden con codigo de generación: " + jsonFactura.codigoGeneracion);
            console.log("La respuesta fue: \n" + jsonRespuesta);
            await emailProces(emailTo,jsonBackup,status[1]);
            res.status(200).json(jsonRespuesta);
        }


    } catch (err) {
        console.log(err);
        return res.status(400).json({
            "status": false,
            "message": err.response.data
        });
    }
}

module.exports.postAnulacion = async (req, res) => {
    try {
        var idOrden = req.params.idOrden;
        var jsonFirmado = await dte_controller.getJsonSigned(idOrden);

        var jsonAnulacion = {
            ambiente: process.env.ambiente,
            idEnvio: "3",
            version: "2",
            documento: jsonFirmado
        };
        console.log(jsonAnulacion);
        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: process.env.mh_urlTest + '/fesv/anulardte/',
            headers: {
                'Authorization': await getToken(),
                'Content-Type': 'application/json'
            },
            data: jsonAnulacion
        };

        var response = await axios.request(config);
        console.log(response);

        var jsonRespuesta = {
            "status": true,
            "estado": response.data.estado,
            "codigoGeneracion": response.data.codigoGeneracion,
            "sello": response.data.selloRecibido,
            "fechaRecibido": response.data.fhProcesamiento,
            "mensaje": response.data.descripcionMsg,
            "observaciones": response.data.observaciones
        }

        console.log(jsonRespuesta);

        var jsonBackup = {
            isAnul: 1,
            jsonVoidResponse: jsonRespuesta
        }

        await dte_controller.updateVoid(jsonBackup, idOrden);

        return res.redirect('/portal/dte/' + req.session.idSucursal + '/submitted');


    } catch (err) {
        return res.status(400).json({
            "status": false,
            "message": err
        });
    }
}



//TEST
module.exports.postFacturaConsumidorFinalTest = async (req, res) => {
    try {
        var jsonBackup = {
            idSucursal: req.body.idSucursal,
            jsonInserted: req.body.jsonInserted,
            codigoGeneracion: req.body.codigoGeneracion,
            sello: req.body.sello,
            fechaRecibido: req.body.fechaRecibido,
            orderType: req.body.orderType,
            documento: req.body.documento
        };
        logger.log('asd');
        //Validamos que se envie por correo
        await emailProces(req.body.emailTest, jsonBackup, '650951d413458faed7035362');

        res.send("Holi");
    } catch (err) {
        console.log(err);
        return res.status(400).json({
            "status": false,
            "message": err.response.data
        });
    }
}