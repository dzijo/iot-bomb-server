const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mysql = require('mysql');

//database
let con = mysql.createPool({
    host: process.env.HOST,
    user: process.env.DBUSERNAME,
    password: process.env.DBPASSWORD,
    database: process.env.DATABASE,
    multipleStatements: true
});

//state
const states = {
    PLANTING: "planting",
    SEARCHING: "searching",
    DEFUSING: "defusing"
}
let currentBomber;
let currentState = states.PLANTING;
let bombLocation = {};

//http requests
app.get('/', function (req, res) {
    res.send('Hi');
});

app.get('/leaderboard', function (req, res) {
    let sql = `SELECT username, wins - losses AS diff FROM users`
    con.query(sql, function (err, results, fields) {
        if (err) {
            console.log(err);
            return;
        }
        if (results[0])
            res.send(results);
        else
            res.send([]);
    })
})

app.get('/current', function (req, res) {
    const user = req.query.user
    let sql = `SELECT * FROM users WHERE username = '${user}'`;
    con.query(sql, function (err, results, fields) {
        if (err) {
            console.log(err);
            return;
        }
        if (!results) {
            currentBomber = user;
            let sql = `INSERT INTO users (username) VALUES ('${user}')`;
            con.query(sql, function (err, results, fields) {
                if (err) {
                    console.log(err);
                    return;
                }
            });
        }
        if (!currentBomber) {
            currentBomber = user;
        }
        res.send({ state: currentState, bomber: currentBomber, bombLocation: bombLocation });
    });

})

app.get('/deleteall', function (req, res) {
    const pin = req.query.pin;
    if (pin === process.env.PIN) {
        let sql = `DELETE FROM users`;
        con.query(sql, function (err, results, fields) {
            if (err) {
                console.log(err);
                return;
            }
            bombLocation = {};
            currentBomber = null;
            res.send('Successfully deleted all users.');
        });
    }
    else {
        res.send('Wrong pin.');
    }
})

//socket
io.on('connection', function (socket) {
    console.log('a user connected');
    socket.on('install', function (location) {
        //console.log(`This is the location ${location}`);
        currentState = states.SEARCHING;
        bombLocation = JSON.parse(location);
        io.emit('install', location);
    });
    socket.on('defuse', function (user) {
        currentState = states.DEFUSING;
        io.emit('defuse', user);
        io.emit('startgame', user);
    });
    socket.on('location', function (data) {
        io.emit('location', data);
    });
    socket.on('success', function (user) {
        //save win in db
        currentState = states.PLANTING;
        io.emit('success', user)
    })
    socket.on('fail', function (user) {
        //save loss in db
        currentState = states.PLANTING;
        io.emit('fail', user)
    })
});

http.listen(process.env.PORT || 3306, function () {
    console.log('listening on *:3306');
});