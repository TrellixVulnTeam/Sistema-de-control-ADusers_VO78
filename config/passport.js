const passport = require('passport');
const { users } = require('../models/users');
const LocalStrategy = require('passport-local').Strategy;


//username password
//passport por lo general, toma el campo de username como id,
passport.use(new LocalStrategy({
    usernameField: 'email'
}, async(email, password, done) => {
    try {
        //realizar la llamada hacia la base de datos users
        let results = await users.findOne({ where: { email } }); //sirve para buscar a un usuario con respecto al email
        //select * from users where email = email
        if (results && results.password === password) {
            return done(null, results);
        }
        return done(null, false);
    } catch (err) {
        done(err)
    }
}));

//funcion para firmir al usuario para guardar su session y estos utilizarlos para depues autorizar al usuario
passport.serializeUser((user, done) => {
    //retornar el id del usuario para guardarla como sesion
    return done(null, user.id);
})

//esta funcion recibe los datos ingresados por el usuario para empezar con la deserializacion
passport.deserializeUser(async(id, done) => {
    try {
        let user = users.findByPk(id, { raw: true });
        return done(null, user); //se coloca en el objetos request.user
    } catch (err) {
        return done(err);
    }
});