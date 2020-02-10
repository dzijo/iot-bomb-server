var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

//http requests
app.get('/', function (req, res) {
    res.send('Hi');
});

app.get('/leaderboard', function (req, res) {
    res.send('Leaderboard');
})

app.get('/current', function (req, res) {
    res.send('Current')
})

//socket
io.on('connection', function (socket) {
    console.log('a user connected');
    socket.on('install', function (location) {
        console.log(`This is the location ${location}`);
        io.emit('install', location);
    });
    socket.on('defuse', function (user) {
        io.emit('defuse', user);
        io.emit('start game', user);
    });
    socket.on('location', function (data) {
        io.emit('location', data);
    });
    socket.on('success', function (user) {
        //save win in db
        io.emit('success', user)
    })
    socket.on('fail', function (user) {
        //save win in db
        io.emit('fail', user)
    })
});

http.listen(process.env.PORT || 4000, function () {
    console.log('listening on *:4000');
});