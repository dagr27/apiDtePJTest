const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.strict = false;
//Creamos un schema que pueda recibir cualquier tipo de objeto sin seguir algun formato
const dteSchema = new mongoose.Schema({},
    {
        strict: false
    });

//Exportamos modelo para que pueda ser usado en toda la aplicacion
module.exports = mongoose.model('dte', dteSchema);