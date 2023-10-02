const axios = require('axios');
const dte = require('../models/dte');
const { v4: uuidv4 } = require('uuid');

//Insertar dte
module.exports.insertDte = async (jsonToInsert) => {
    try {
        var dteToInsert = new dte(jsonToInsert);
        var response = await dteToInsert.save();
        console.log(response);
        return [true, response._id];
    } catch (err) {
        console.log(err);
        return false;
    }
}

//Obtener todos los dte
module.exports.getAllDte = async () => {
    try {
        var data = await dte.find();
        return data;
    } catch (err) {
        return false;
    }
}

//Armar el Json de anulacion y encriptar.
module.exports.getJsonSigned = async (idOrden) => {
    try {
        var jsonBd = await dte.find({ "_id": idOrden });
        var jsonOrden = jsonBd[0].jsonInserted;

        //Generamos el ROW GUID
        const rowguid = uuidv4();
        const fechaActual1 = new Date().toISOString().slice(0, 10); // Obtiene la fecha en formato "YYYY-MM-DD"
        const fechaActual = new Date()
        let hora = fechaActual.getHours() + 1; // Obtiene la hora actual
        var horaFormateada = "";
        // Si la hora es 0 (medianoche), la ajustamos a 24
        if (hora === 0) {
            horaFormateada = "00";
        }else{
            horaFormateada = hora.toString().padStart(2, '0');
        }

        const minutos = fechaActual.getMinutes();
        const segundos = fechaActual.getSeconds();

        // Formateamos la hora para que siempre tenga dos dígitos (incluyendo 0 adelante si es necesario)
        const minutosFormateados = minutos.toString().padStart(2, '0');
        const segundosFormateados = segundos.toString().padStart(2, '0');
        const horaCompletaFormateada = horaFormateada + ":" + minutosFormateados + ":" + segundosFormateados;
        var jsonToAnular = {
            identificacion: {
                version: 2,
                ambiente: jsonOrden.identificacion.ambiente,
                codigoGeneracion: rowguid.toUpperCase(),
                fecAnula: fechaActual1,
                horAnula: horaCompletaFormateada
            },
            emisor: {
                nit: jsonOrden.emisor.nit,
                nombre: jsonOrden.emisor.nombre,
                tipoEstablecimiento: jsonOrden.emisor.tipoEstablecimiento,
                telefono: jsonOrden.emisor.telefono,
                correo: jsonOrden.emisor.correo,
                codEstable: jsonOrden.emisor.codEstable,
                codPuntoVenta: jsonOrden.emisor.codPuntoVenta,
                nomEstablecimiento: jsonOrden.emisor.nombreComercial
            },
            documento: {
                tipoDte: '01',
                codigoGeneracion: jsonOrden.identificacion.codigoGeneracion,
                selloRecibido: jsonBd[0].sello,
                numeroControl: jsonOrden.identificacion.numeroControl,
                fecEmi: jsonOrden.identificacion.fecEmi,
                montoIva: Number(jsonOrden.resumen.totalIva),
                codigoGeneracionR: null,
                tipoDocumento: jsonOrden.receptor.tipoDocumento,
                numDocumento: jsonOrden.receptor.numDocumento,
                nombre: jsonOrden.receptor.nombre
            },
            motivo: {
                tipoAnulacion: 2,
                motivoAnulacion: 'Anulacion por REEMBOLSO (anulacion sencilla)',
                nombreResponsable: 'Area de IT',
                tipDocResponsable: '13',
                numDocResponsable: '123456789',
                nombreSolicita: jsonOrden.emisor.nombre,
                tipDocSolicita: '13',
                numDocSolicita: '123456789'
            }
        };
        console.log(jsonToAnular);
        let data = {
            nit: jsonOrden.emisor.nit,
            activo: true,
            passwordPri: process.env.firmador_password,
            dteJson: jsonToAnular
        }

        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'http://serviciodte.com:8113/firmardocumento/',
            headers: {
                'Content-Type': 'application/json'
            },
            data: data
        };

        var response = await axios.request(config)
        return response.data.body;
    } catch (err) {
        console.log(err);
        return false;
    }
}


//Insertar dte
module.exports.updateVoid = async (jsonToInsert, id) => {
    try {
        var response = await dte.updateOne({ "_id": id }, jsonToInsert);
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}