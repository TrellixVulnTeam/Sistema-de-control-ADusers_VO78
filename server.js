//import the express module
const express = require('express');
const path = require('path');
const Shell = require('node-powershell')
const bodyParser = require('body-parser');
const fs = require('fs');
// const { unlckusr } = require('./scripts/unlock')
const os = require('os');
const { exec } = require('child_process');
const psswdValiidator = require('password-validator'); //validate password

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
    return res.render('pages/unlock', { title: 'Desbloqueo de Cuenta' });
});

app.post('/des_user', (req, res) => {
    const user = req.body.usernames;
    if(user){
        
        return res.redirect('pages/unlock', {title:'Desbloquear Cuenta'});
    }
    return res.render('pages/unlock', {title: 'Desbloquear Cuenta'});   
});

app.get('/re_user', (req, res) => {
    return res.render('pages/register' , {title: 'Registro de Usuario'});
});

app.listen(PORT, () => {
    console.log(`${PORT}`);
    // console.log(date);
});
