//import the express module
const express = require('express');
const Shell = require('node-powershell')
const bodyParser = require('body-parser');
const fs = require('fs');
// const { unlckusr } = require('./scripts/unlock')
const os = require('os');
const { exec } = require('child_process');
const psswdValiidator = require('password-validator'); //validate password
const path = require('path');
const _ = require('lodash');
const pathErrLog = path.resolve('./logs/errlog.txt');
const historyAction = path.resolve('./logs/history.txt')
const successActions = path.resolve('./logs/successActions.txt');
const today = new Date();
const psswd = today.toLocaleString('default', { month: 'long'}) + today.getFullYear();
let status

//function
const verifyUser = async(user) => {
    await exec(`get-aduser -filter 'name -like "${user}*"'`, {'shell': 'powershell.exe'}, (err, stdout, stderr) => {
        if(stderr){
            return console.log(stderr.message);
        }else {
            console.log(stdout)
            let resultToUpper = _.toUpper(user);
            const userExist = stdout.indexOf(`${resultToUpper}`);
            if(userExist == -1){
                fs.writeFile(historyAction, `${today} -El usuario a sido verificado ${user}, ${check}`);
            }else{
                fs.writeFile(pathErrLog,`${today} Error user ${user} ya se encuentra registrado`, (err) => {
                    if(err){
                        fs.writeFile('errlog.txt',`${today} Ocurrio un error a la hora de registrar el error ${user}`);
                    }else{
                        console.log(err)
                    }
                })   
            }
        }
    });
}

const UnlockUser = async(user) => {
    await exec(`Unlock-ADAccount -Identity ${user}`, {'shell': 'powershell.exe'});
    await exec(`Set-AdAccount -Identity ${user} -Reset -Newpassword (convertTo-SecureString -AsPlainText "${psswd}" -Force)`, {'shell': 'powershell'}, (err, stdout, stderr) => {
        if(err){
            return console.log(stderr);
        }
        fs.writeFile('history.txt',`${today} el Usuario ${user}`)
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
    .has().digits(1)
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
    return res.render('pages/unlock', { title: 'Desbloqueo de Usuario' });
});

app.post('/des_user', async (req, res,next) => {
    const user = req.body.username;
    console.log(user)
    try{
        status = 'desbloqueo'
        await verifyUser(user);
        return res.redirect('/des_user');
    }catch(err){
        next(err);
        return res.render('pages/unlock', {title: 'Desbloquear Usuario'})
    }
});

app.get('/re_user', (req, res) => {
    return res.render('pages/register' , {title: 'Registro de Usuario'});
});

app.listen(PORT, () => {
    console.log(`${PORT}`);
});
