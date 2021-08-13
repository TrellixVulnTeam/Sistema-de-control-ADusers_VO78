//import the express module
const express = require('express');
const Shell = require('node-powershell')
const bodyParser = require('body-parser');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');
const psswdValiidator = require('password-validator'); //validate password
const path = require('path');
const _ = require('lodash');
const pathErrLog = path.resolve('./logs/errlog.txt');
const history = path.resolve('./logs/history.txt')
const successActions = path.resolve('./logs/successActions.txt');
const today = new Date();
const psswd = today.toLocaleString('default', { month: 'long'}) + today.getFullYear();
const passwd = psswd.charAt(0).toUpperCase()+ psswd.slice(1);
let status;
let statusadd;
let alertColor = 'alert-success';
let alertColoradd = 'alert-success';
const titleUnlock = 'Desbloquear Usuario';


//function
const UnlockUser = async(user, password) => {
    await exec(`Unlock-ADAccount -Identity ${user}`, {'shell': 'powershell.exe'}, (err, stdout, stderr) => {
        if(err){
            fs.writeFile(pathErrLog, `${today} - El usuario: ${user} no se encontro en el directorio`, (err) =>{
                if(err){console.log(err.message)}
            })
            return status='Usuario no encontrado', alertColor='alert-danger';
        }else{
            if(stderr.indexOf('Cannot find an object with identity')===-1){
                fs.writeFile(successActions, `${today} - Se ah desbloqueado el usuario ${user}`, (err) => {if(err){console.log(err.message)}});
            }
        }
    });
    await exec(`Set-AdAccountPassword -Identity ${user} -Reset -Newpassword (convertTo-SecureString -AsPlainText "${password}" -Force)`, {'shell': 'powershell'}, (err, stdout, stderr) => {
        if(err){
            fs.writeFile(pathErrLog, `${today} - ${stderr}`, (err) => {
                if(err){console.log(err.message)}
            })
            return status='Usuario no encontrado', alertColor='alert-danger';
        }
        return status='Usuario desbloqueado', alertColor = 'alert-success';
    })
}


const addUser = async(user) => {
    console.log(user)
    const fullName = (user.firstName + ' '+ user.lastName);
    console.log(user.employId)
    console.log(fullName);
    await exec(`New-ADUser -Name ${fullName} -Enable True -GivenName ${user.firstName} -SamAccountName ${user.employId} -Surname ${user.lastName} -UserPrincipalName ${user.employId}@ZGNE.NET -LogonWorkstations ${employId} -AccountPassword $(ConvertTo-SecureString '${user.password}' -AsPlainText -Force) -PasswordNeverExpires $true`, {'shell': 'powershell.exe'}, (err, stdout, stderr) => {
        if(err){
            console.log(stderr);
            fs.writeFile(pathErrLog, `${today} - ${stderr}`, (err) => {if(err){console.log(err.message)}});
            return statusadd = 'Error al Registar el Usuario', alertColor = 'alert-danger';
        }else{
            fs.writeFile(successActions, `${today} - El usuario ${employId} ah sido de alta`, (err)=>{if(err){console.log(err.message)}});
            return statusadd = 'Usuario Registrado', alertColor = 'alert-success'
        }
    })
}

//create a schema object
let schema = new psswdValiidator();
//add schema propierties
schema
    .is().min(8)
    .is().max(16)
    .has().uppercase()
    .has().lowercase()
    .has().not().spaces()
    .is().not().oneOf(['Password123!','Password','P4ssw0rd']);



const PORT = 8000;
const app = express();


app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static('public'));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

const ps = new Shell({
    excutionPolicy: 'Bypass',
    noProfile: true,
})

app.get('/', (req, res) => {
    return res.render('pages/login', {title:'Iniciar Sesion'})
});

app.get('/login', (req,res) => {
    return res.render('pages/login', {title:'Iniciar Sesion'})
});

app.get('/des_user', (req, res) => {
    return res.render('pages/unlock', { title:titleUnlock, status,alertColor });
});

app.post('/des_user', async (req, res,next) => {
    const user = req.body.username;
    const password = req.body.password;
    const rePassword = req.body.rePassword;
    
    if(password === rePassword || (password === '' && rePassword === '')) {
        if(password !== '') {
            const pass = schema.validate(password);
            if(pass){
                await UnlockUser(user, password);
                return res.redirect('/des_user');
            }else{
                status = 'Contraseña no cumple con los requisitos';
                alertColor = 'alert-danger';
                return res.redirect('/des_user');
            }
        }else{
            await UnlockUser(user, passwd);
            return res.redirect('/des_user')
        } 
    }
    status = 'La contraseña no coinciden';
    alertColor = 'alert-warning';
    return res.redirect('/des_user');
    
});

app.get('/re_user', (req, res) => {
    return res.render('pages/register' , {title: 'Registro de Usuario', statusadd,alertColoradd });
});

app.post('/re_user', async (req, res) => {
    try{
        let user = {employId: req.body.employId, firstName: req.body.firstName, lastName: req.body.lastName, password: req.body.password, rePassword: req.body.rePassword, location: req.body.location}
        if(user.password === user.rePassword || (user.password === '' && user.rePassword === '')) {
            if(user.password !== '') {
                const pass = schema.validate(user.password);
                if(pass){
                    await addUser(user);
                    return res.redirect('/re_user');
                }else{
                    statusadd = 'Contraseña no cumple con los requisitos';
                    alertColoradd= 'alert-danger';
                    return res.redirect('/re_user');
                }
            }else{
                user.password = passwd;
                await addUser(user);
                return res.redirect('/re_user')
            } 
        }
        statusadd = 'Las contraseña no coinciden';
        alertColoradd = 'alert-warning';
        return res.redirect('/re_user');
    }catch(err){
        console.log(err)
    }
})

app.listen(PORT, () => {
    console.log(`${PORT}`);
});

//Nota me quede en la alta de los usuarios en el servidor de dominio, tengo el problema de que el employid no esta definido por un valor
//queda pendiente el resgistro de usuarios y mejorar una funcion para validad las contraseñas por medio de una funcion