//import the express module
const express = require('express');
const Shell = require('node-powershell')
const bodyParser = require('body-parser');
const fs = require('fs');
const os = require('os');
const { exec, execSync } = require('child_process');
const psswdValiidator = require('password-validator'); //validate password
const path = require('path');
const _ = require('lodash');
const pathErrLog = path.resolve('./logs/errlog.txt');
const history = path.resolve('./logs/history.txt');
const successActions = path.resolve('./logs/successActions.txt');
const today = new Date();
const psswd = today.toLocaleString('default', { month: 'long'}) + today.getFullYear();
const passwd = psswd.charAt(0).toUpperCase()+ psswd.slice(1);
let status;
let statusAdd;
let alertColor;
let alertColorAdd ;
const titleUnlock = 'Desbloquear Usuario';
const titleAdd = 'Añadir un usuario de Dominio';

//function to unlock User
const UnlockUser = (user, password) => {
    exec(`Unlock-ADAccount -Identity ${user}`, {'shell': 'powershell.exe'}, (err, stdout, stderr) => {
        if(err){
            fs.writeFile(pathErrLog, `${today} - El usuario: ${user} no se encontro en el directorio`, (err) =>{
                if(err){console.log(err.message)}
            })
            return status=`Usuario ${user} no encontrado`, alertColor='alert-danger';
        }else{
            if(stderr.indexOf('Cannot find an object with identity')===-1){
                fs.writeFile(successActions, `${today} - Se ah desbloqueado el usuario ${user}`, (err) => {if(err){console.log(err.message)}});
            }
        }
    });
    exec(`Set-AdAccountPassword -Identity ${user} -Reset -Newpassword (convertTo-SecureString -AsPlainText "${password}" -Force)`, {'shell': 'powershell'}, (err, stdout, stderr) => {
        if(err){
            fs.writeFile(pathErrLog, `${today} - ${stderr}`, (err) => {
                if(err){console.log(err.message)}
            });
            return status=`Usuario ${user} no existe, intentelo de nuevo`, alertColor='alert-danger';
        }
        fs.writeFile(history, `${today} - El usuario: ${user}, se ha debloqueado y se actualizo la contraseña`, (err) =>{
            if(err){console.log(err.message)}
        });
        console.log('desbloqueado ' + user)
        return status=`Usuario ${user} desbloqueado`, alertColor = 'alert-success';
    });
}

//Function to ADuser
const addUser = (user) => {
    const fullName = (user.firstName + ' '+ user.lastName);
    exec(`New-ADUser -Name "${fullName}" -Enable $True -GivenName "${user.firstName}" -SamAccountName "${user.employId}" -Surname "${user.lastName}" -UserPrincipalName "${user.employId}@ZGNE.NET" -LogonWorkstations "${user.employId}" -AccountPassword $(ConvertTo-SecureString '${user.password}' -AsPlainText -Force) -PasswordNeverExpires $true`, {'shell': 'powershell.exe'}, (err, stdout, stderr) => {
        if(err){
            console.log(stderr);
            fs.writeFile(pathErrLog, `${today} - ${stderr}`, (err) => {if(err){console.log(err.message)}});
            return statusAdd = `Error en registro de usuario: ${fullName}, verifique los datos`, alertColorAdd = 'alert-danger';
        }else{
            console.log(stdout);
            fs.writeFile(successActions, `${today} - El usuario ${user.employId} ah sido de alta`, (err)=>{if(err){console.log(err.message)}});
            return statusAdd = `Usuario ${fullName} Registrado`, alertColorAdd = 'alert-success'
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
    return res.render('pages/unlock', {title:titleUnlock, status, alertColor})
});

app.get('/des_user', (req, res) => {
    return res.render('pages/unlock', { title:titleUnlock, status,alertColor });
});

app.post('/des_user', async(req, res, next) => {
    status = '';
    alertColor = '';
    const user = req.body.username;
    const password = req.body.password;
    const rePassword = req.body.rePassword;
    try{
        if(password === rePassword || (password === '' && rePassword === '')) {
            if(password !== '') {
                const pass = schema.validate(password);
                if(pass){
                    await UnlockUser(user, password);
                    return new Promise((resolve, reject) => {
                        setTimeout(() => {
                            resolve(res.redirect('/des_user'));
                        },1500);
                    })
                }else{
                    status = 'Contraseña no cumple con los requisitos';
                    alertColor = 'alert-danger';
                    return res.redirect('/des_user');
                }
            }else{
                await UnlockUser(user, passwd);
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        resolve(res.redirect('/des_user'));
                    },1500);
                })
                
                
            } 
        }
        status = 'La contraseña no coinciden';
        alertColor = 'alert-warning';
        return res.redirect('/des_user');
    }catch(err) {
        next(err);
    }
});

app.get('/re_user', (req, res) => {
    return res.render('pages/register' , {title: 'Registro de Usuario', statusAdd , alertColorAdd });
});

app.post('/re_user', async (req, res) => {
    statusAdd='';
    alertColorAdd='';
    try{
        let user = {employId: req.body.employid, firstName: req.body.firstName, lastName: req.body.lastName, password: req.body.password, rePassword: req.body.rePassword, location: req.body.location}
        if(user.password === user.rePassword || (user.password === '' && user.rePassword === '')) {
            if(user.password !== '') {
                const pass = schema.validate(user.password);
                if(pass){
                    await addUser(user);
                    return new Promise((resolve, reject) =>{
                        setTimeout(() => {
                            resolve(res.redirect('/re_user'));
                        },1500)
                    })
                }else{
                    statusAdd = 'Contraseña no cumple con los requisitos';
                    alertColorAdd= 'alert-danger';
                    return res.redirect('/re_user');
                }
            }else{
                user.password = passwd;
                user.rePassword = passwd;  
                await addUser(user);
                return new Promise((resolve, reject) =>{
                    setTimeout(() => {
                        resolve(res.redirect('/re_user'));
                    },1500);
                });
            } 
        }
        statusAdd = 'Las contraseña no coinciden';
        alertColorAdd = 'alert-warning';
        return res.redirect('/re_user');
    }catch(err){
        console.log(err);
    }
})

app.listen(PORT, () => {
    console.log(`${PORT}`);
});

