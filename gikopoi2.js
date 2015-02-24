var express = require('express');
var app = express();
var http = require('http').Server(app);
var fs = require('fs');
var io = require("socket.io")(http);


function readCookie(cookies, cookieName)
{
    c = cookies.split(";");
    for (var i = 0; i < c.length; i++)
    {
        s = c[i].trim().split("=")
        if (s[0] == cookieName)
            return s[1];
    }
    return null;
}

io.on("connection", function(socket){
    try
    {
        console.log("Connection attempt");
        var token = readCookie(socket.handshake.headers.cookie, "token");
        
        if (users[token] === undefined)
        {
            console.log("Access denied to invalid token " + token);
            return;
        }
        
        console.log("token: " + token + " name: " + users[token]["name"]);
        
        io.emit("server_msg", "SYSTEM", users[token]["name"] + " connected");
        io.emit("new_user_login", token, users[token]["name"]);
        
        socket.on("user_msg", function(msg)
        {
            var user = users[token]["name"];
            console.log(user + ": " + msg);
            io.emit("server_msg", user, msg);
        });
        socket.on("disconnect", function()
        {
            console.log(users[token]["name"] + " disconnected");
            io.emit("server_msg", "system", "someone disconnected");
        });
        socket.on("user_move", function(x, z)
        {
            console.log(token + ", " + x + ", "+ z);
            io.emit("server_move", token, x, z);
        });
    }
    catch(e)
    {
        console.log(e.message);
    }
});

app.get("/", function (req, res) 
    {
    res.writeHead(200, {'Content-Type': 'text/html'});
    fs.readFile("index.htm", function(err, data) 
    {
        if (err) res.end(err);
        else res.end(data);
    });
});

var users = {};

function generateToken()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 16; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    
    return text;
}

function addNewUser(name)
{
    var token = generateToken();
    while (users[token] != undefined)
        token = generateToken();
    users[token] = {name: name};
    return token;
}

app.post("/", function (req, res) 
{
    var body = "";
    req.on("data", function (data) 
    {
        body += data;
    });
    req.on("end", function () 
    {
        var post = require("querystring").parse(body);
        var userName = post["name"];
        
        var token = addNewUser(userName);
        
        
        res.writeHead(200, {'Content-Type': 'text/html',
                            'Set-Cookie': "token=" + token});
        //fs.readFile("chat.htm", function(err, data) 
        fs.readFile("fps.htm", function(err, data) 
        {
            if (err) 
            {
                res.end(err);
                return;
            }

            data = String(data).replace(/@USER_NAME@/g, userName);
            res.end(data);
        });
    });
});

app.use(express.compress());
app.use(express.static('static'));

http.listen(1337);

console.log("Server running");
