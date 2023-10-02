const User = require('../models/user');

module.exports.insertUser = async (req, res) =>{
    try{
        var userJsonToInsert = {
            "username":req.body.username,
            "password":req.body.password,
            "name":req.body.name,
            "role":Number(req.body.role),
            "isActive":Number(req.body.isActive)
        };
        var user = new User(userJsonToInsert);
        var response = await user.save();
        return res.status(200).json({
            status:true,
            message:"EL usuario se ingreso de forma correcta",
            data: response.data
        });
    } catch(err){
        console.log(err);
        return res.status(400).json({
            status:true,
            message:"No se pudo registrar el usuario por: " + err
        });
    }
}

module.exports.auth = async (req,res) =>{
    try{
        var username = req.body.username;
        var password = req.body.password;

        var data = await User.find({"username":username});
        if(data[0].username == username && data[0].password == password){
            res.cookie('username', username);
            res.cookie('fullname', data[0].name)
            req.session.idSucursal = data[0].idSucursal;
            req.session.isLoggedIn = true;
            if(data[0].role == 0){
                req.session.isAdmin = true;
            }

            return res.redirect('/portal/'+data[0].idSucursal+'/home');
        }else{
            return res.render('portal/login', {"message":"Sus credenciales son incorrectas, revise e intente nuevamente."});
        }
    }catch(err){
        return res.status(200).json({
            status:false,
            message:"No se pudo validar la información, " + err
        });
    }
}

module.exports.activateUser = async (req, res) =>{
    try{
        var userId = req.params.id; 
        var action = req.params.action;
        const user = await User.findOneAndUpdate({ _id: id }, {
            "isActive": action
        });
        
    }catch(err){
        console.log(err);
    }
} 