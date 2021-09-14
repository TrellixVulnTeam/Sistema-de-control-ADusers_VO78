//import the express module
const express = require('express');
const Shell = require('node-powershell')
const bodyParser = require('body-parser');
const fs = require('fs');
const { exec, execSync } = require('child_process');
const psswdValiidator = require('password-validator'); //validate password
const path = require('path');
const _ = require('lodash');
const pathErrLog = path.resolve('./logs/errlog.txt');
const history = path.resolve('./logs/history.txt');
const successActions = path.resolve('./logs/successActions.txt');
const today = new Date();
const psswd = today.toLocaleString('default', { month: 'long' }) + today.getFullYear();
const passwd = psswd.charAt(0).toUpperCase() + psswd.slice(1);
let historial = [];

//passport control de login
const passport = require('passport');
const session = require('express-session');
const { render } = require('ejs');
require('./config/passport');

const passportLocalStrategy = passport.authenticate("local", {
    successRedirect: '/des_user',
    failureRedirect: '/login'
});

const titleUnlock = 'Desbloquear Usuario';
const titleAdd = 'Añadir un usuario de Dominio';
const titleSearch = 'Buscar Usuario';

const PORT = 8000;
const app = express();
const { users } = require('./models')


//control de mensajes al usuario
let status;
let statusAdd;
let alertColor;
let alertColorAdd;
let statusSearch= '';
let alertColorSearch= '';
let userInfo;

//path de errores
let pathNotFound = path.join(__dirname, "public", "404.html");

app.use(passport.initialize()); //inicializar passport para poder utilizarlo
app.use(passport.session()); //para habilitar las sesiones con passport
//create a schema object
let schema = new psswdValiidator();
//add schema propierties
schema
    .is().min(8)
    .is().max(16)
    .has().uppercase()
    .has().lowercase()
    .has().not().spaces()
    .is().not().oneOf(['Password123!', 'Password', 'P4ssw0rd', 'admin', 'admin123', '12345678']);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(session({
    secret: "BajagasZGN",
    resave: false,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());


//function to unlock User
const UnlockUser = (user, password) => {

    exec(`Unlock-ADAccount -Identity ${user}`, { 'shell': 'powershell.exe' }, (err, stdout, stderr) => {
        if (err) {
            fs.writeFile(pathErrLog, `${today} - El usuario: ${user} no se encontro en el directorio`, (err) => {
                if (err) { console.log(err.message) }
            })
            return status = `Usuario ${user} no encontrado`, alertColor = 'alert-danger';
        } else {
            if (stderr.indexOf('Cannot find an object with identity') === -1) {
                fs.writeFile(successActions, `${today} - Se ah desbloqueado el usuario ${user}`, (err) => { if (err) { console.log(err.message) } });
            }
        }
    });
    exec(`Set-AdAccountPassword -Identity ${user} -Reset -Newpassword (convertTo-SecureString -AsPlainText "${password}" -Force)`, { 'shell': 'powershell' }, (err, stdout, stderr) => {
        if (err) {
            fs.writeFile(pathErrLog, `${today} - ${stderr}`, (err) => {
                if (err) { console.log(err.message) }
            });
            return status = `Usuario ${user} no existe, intentelo de nuevo`, alertColor = 'alert-danger';
        }
        fs.writeFile(history, `${today} - El usuario: ${user}, se ha debloqueado y se actualizo la contraseña`, (err) => {
            if (err) { console.log(err.message) }
        });
        return status = `Usuario ${user} desbloqueado`, alertColor = 'alert-success';
    });
}

//Function to ADuser
const addUser = (user) => {
        user.firstName = user.firstName.toUpperCase();
        user.lastName = user.lastName.toUpperCase();
        user.employId = user.employId.toUpperCase();
        user.location = user.location.toUpperCase();

        const fullName = (user.firstName + ' ' + user.lastName);

            exec(`New-ADUser -Name "${fullName}" -Enable $True -GivenName "${user.firstName}" -SamAccountName "${user.employId}" -Path "OU=Usuarios,OU=${user.location},DC=ZGNE,DC=NET" -Surname "${user.lastName}" -UserPrincipalName "${user.employId}@ZGNE.NET" -AccountPassword $(ConvertTo-SecureString '${user.password}' -AsPlainText -Force) -PasswordNeverExpires $true`, { 'shell': 'powershell.exe' }, (err, stdout, stderr) => {
                if (err) {
                    console.log(stderr);
                    fs.writeFile(pathErrLog, `${today} - ${stderr}`, (err) => { if (err) { console.log(err.message) } });
                    return statusAdd = `Error en registro de usuario: ${fullName}, verifique los datos`, alertColorAdd = 'alert-danger';
                } else {
                    console.log(stdout);
                    fs.writeFile(successActions, `${today} - El usuario ${user.employId} ah sido de alta`, (err) => { if (err) { console.log(err.message) } });
                    return statusAdd = `Usuario ${user.employId} Registrado`, alertColorAdd = 'alert-success'
                }
            })
    }

//function search
const search = async(user) => {
    if(user.fullName){
        exec(`Get-ADUser -Filte 'name -like "${user.fullName}*"'`, { 'shell': 'powershell.exe' }, (err, stdout, stderr) => {
            if(stdout === ''){
                return statusSearch = `Usuario ${user.fullName} no encontrado`, alertColorSearch = 'alert-danger'
            }
            console.log(stdout);
            const array = [];
            let employId;
            let fullName;
            let userResult;
            let bool1 = false;
            let bool2 = false;
            const result = stdout.toString().split("\n")
            const found = result.find(res =>{
                if(res.indexOf('DistinguishedName') !== -1){
                   fullName = res;
                    bool1 = true; 
                }
               if(res.indexOf('SamAccountName') !== -1){
                   employId = res;
                   bool2 = true;
               }
               if(bool1 && bool2){
                userResult = fullName + ' ' + employId;
                array.push(userResult);
                bool2 = false;
                bool1 = false;
               }
            });
            return historial = historial.concat(array);
        });
    }
    if(user.employId){
        exec(`Get-ADUser ${user.employId}`, { 'shell': 'powershell.exe' }, (err, stdout, stderr) => {
            const array = [];
            let employId;
            let fullName;
            let userResult;
            const result = stdout.toString().split("\n")
            const found = result.find(res =>{
                if(res.indexOf('DistinguishedName') !== -1){
                   fullName = res;
                }
               if(res.indexOf('SamAccountName') !== -1){
                   employId = res;
               }
            });
            userResult = fullName + ' ' + employId;
            array.push(userResult);
            return historial = historial.concat(array);
        })
    }
}

//Function to scroll the chatbox to the bottom.
function scrollToBottom(){
    let objDiv = new SimpleBar(document.getElementById('#simple'));
    objDiv.SimpleBar.getScrollElement()

    // These 2 lines of code did the trick when I didn't use Simplebar
    //var objDiv = document.getElementById("simple");
    objDiv.scrollTop = objDiv.scrollHeight;
}


    //home section
app.get('/', (req, res) => {
    return res.render('pages/login', { title: 'Iniciar sesion', status, alertColor });
});


//login section
app.get('/login', (req, res) => {
    return res.render('pages/login', { title: 'Iniciar sesion', status, alertColor });
});

app.post("/login", passportLocalStrategy, (error, req, res, next) => {
    if (error) return console.log(error.message);
});

// app.post('/login', passport.authenticate('local', { failureRedirect: '/login' }),
//     function(req, res) {
//         res.redirect('/des_user');
//     });

//search user
app.get('/search', (req,res) => {
    return res.render('pages/search', {title: 'Buscar Usuario', statusSearch, alertColorSearch, username: 'Jovanny',historial})
})

app.post('/search', async(req, res, next) => {
    historial = [];
    let user = {fullName: req.body.fullname, employId: req.body.employid };
    if(user.fullName === '' && user.employId ===''){
        statusSearch = 'Ingrese algun dato del Usuario (Nombre / Num.Empleado)';
        alertColorSearch = 'alert-warning';
        console.log('entro')
        return res.redirect('/search');
    }
    await search(user);
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(res.redirect('/search'));
        }, 3000);
    })
});

//Unlock user section
app.get('/des_user', async(req, res) => {
    //sif (req.isAuthenticated()) {
        return res.render('pages/unlock', { title: titleUnlock, status, alertColor, username: 'Jovanny' });
    //} else { return res.render('pages/login', { title: 'Iniciar sesion', status, alertColor }) }
});

app.post('/des_user', async(req, res, next) => {
    status = '';
    alertColor = '';
    let user = req.body.username;
    const password = req.body.password;
    const rePassword = req.body.rePassword;

    try {
        if (user === 'ADMIN') {
            status = 'Usuario No permitido';
            alertColor = 'alert-danger';
            return res.redirect('/des_user');
        }
        if (password === rePassword || (password === '' && rePassword === '')) {
            if (password !== '') {
                const pass = schema.validate(password);
                if (pass) {
                   await UnlockUser(user, password);
                    return new Promise((resolve, reject) => {
                        setTimeout(() => {
                            resolve(res.redirect('/des_user'));
                        }, 3000);
                    })
                } else {
                    status = 'Contraseña no cumple con los requisitos';
                    alertColor = 'alert-danger';
                    return res.redirect('/des_user');
                }
            } else {
                UnlockUser(user, passwd);
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        resolve(res.redirect('/des_user'));
                    }, 3000);
                })
            }
        }
        status = 'La contraseña no coincide';
        alertColor = 'alert-warning';
        return res.redirect('/des_user');
    } catch (err) {
        next(err);
    }
});

//Register an User section
app.get('/re_user', (req, res) => {
    // if (req.isAuthenticated()) {
        return res.render('pages/register', { title: 'Registro de Usuario', statusAdd, alertColorAdd,username: 'Jovanny' });
    // } else { return res.render('pages/login', { title: 'Iniciar sesion', status, alertColor }) }
});

app.post('/re_user', async(req, res) => {
    statusAdd = '';
    alertColorAdd = '';
    try {
        let user = { employId: req.body.employid, firstName: req.body.firstName, lastName: req.body.lastName, password: req.body.password, rePassword: req.body.rePassword, location: req.body.location }
        if(user.location ==='Selecione Locacion...'){return statusAdd = 'Selececcione la locacion del usuario', alertColorAdd = 'alert-warning', res.redirect('re_user')};
        if (user.password === user.rePassword || (user.password === '' && user.rePassword === '')) {
            if (user.password !== '') {
                const pass = schema.validate(user.password);
                if (pass) {
                    await addUser(user);
                    return new Promise((resolve, reject) => {
                        setTimeout(() => {
                            resolve(res.redirect('/re_user'));
                        }, 3000)
                    })
                } else {
                    statusAdd = 'Contraseña no cumple con los requisitos';
                    alertColorAdd = 'alert-danger';
                    return res.redirect('/re_user');
                }
            } else {
                user.password = passwd;
                user.rePassword = passwd;
                await addUser(user);
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        resolve(res.redirect('/re_user'));
                    }, 3000);
                });
            }
        }
        statusAdd = 'Las contraseña no coincide';
        alertColorAdd = 'alert-warning';
        return res.redirect('/re_user');
    } catch (err) {
        console.log(err);
    }
})

//logout actions
app.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/login");
})

// Middleware para el manejo de errores
app.use((err, req, res, next) => {
    res.status(404).sendFile('./public/404.html');
    if (err) {
        res.redirect("/login");
        alert(err.message);
    }
});




//run app express server
app.listen(PORT, () => {
    console.log(`${PORT}`);
});