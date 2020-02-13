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
let currentBomber = null;
let currentState = states.PLANTING;
let bombLocation = undefined;
let defuser = null;

//http requests
app.get('/', function (req, res) {
    res.send('Hi');
});

app.get('/leaderboard', function (req, res) {
    let sql = `SELECT username, wins - losses AS diff FROM users ORDER BY diff DESC`
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
    const user = req.query.user;
    let sql = `SELECT * FROM users WHERE username = '${user}'`;
    con.query(sql, function (err, results, fields) {
        if (err) {
            console.log(err);
            return;
        }
        if (!results[0]) {
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
    socket.on('install', function (data) {
        console.log(`This is the data ${data}`);
        currentState = states.SEARCHING;
        bombLocation = data;
        io.emit('install', data);
    });
    socket.on('defuse', function (data) {
        currentState = states.DEFUSING;
        defuser = data.user;
        io.emit('defuse', data);
        io.emit('startgame', data);
    });
    socket.on('location', function (data) {
        io.emit('location', data);
    });
    socket.on('success', function (data) {
        let sql = `UPDATE users SET wins = wins + 1 WHERE username = '${defuser}';`
        con.query(sql, function (err, results, fields) {
            if (err) {
                console.log(err);
                return;
            }
        });
        currentState = states.PLANTING;
        bombLocation = undefined;
        currentBomber = defuser;
        io.emit('success', data)
    })
    socket.on('fail', function (data) {
        let sql = `UPDATE users SET losses = losses + 1 WHERE username = '${defuser}';`
        con.query(sql, function (err, results, fields) {
            if (err) {
                console.log(err);
                return;
            }
        });
        currentState = states.PLANTING;
        bombLocation = undefined;
        currentBomber = defuser;
        io.emit('fail', data)
    })
});

http.listen(process.env.PORT || 3306, function () {
    console.log('listening on *:3306');
});