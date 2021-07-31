const Shell = require('node-powershell');

//route request
export function  unlockUser(){
    const ps = new Shell({
        executionPolicy: 'Bypass',
        noProfile: true
    });
    
    ps.addCommand(`WhoamI`);
    ps.invoke()
    .then(response => {
        res.send(response)
    })
        .catch(err => {
        res.json(err)
    });    
}
    
