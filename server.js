const express = require('express')
const https = require('https')
const fs = require('fs')
const session = require('express-session');
const WS = require('ws') ;
const uuid = require('uuid');
const bodyparser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv").config()

const app = express();

const socketserver = new WS.Server({noServer:true, clientTracing: false});


var sockets = new Map(); // Session Id to socket
var users_in_live = new Map(); // live name to session
//var users_sessions = new Map();
const querystring = require("querystring");
var online = 0

var sessionParser = session({
	saveUninitialized: false,
	secret: process.env.SECRET,
	resave: false
});

var Login = (req, res) => {
	if(req.session.sessionId) {
		return res.status(200).send({ok: true, message: "already in"});
	}
	let id = req.params.id
	let live_name = req.params.live
//	let sid = users_sessions.get(id);

	const sid = uuid.v4();

	req.session.sessionId = sid;
	req.session.uid = id;
	req.session.livename = live_name;

	return res.status(200).send({ok: true, message: "Please Upgrade the connection"})
}

var Logout = (req, res) => {
	let s = sockets.get(req.session.sessionId);

	if(s) s.close();
	
//	users_sessions.delete(req.session.uid);
	
	sockets.delete(req.session.sessionId);
	
	req.session.destroy(() => {
		res.status(200).send({ok: true, message: "Logout Successful"});
	});
}

var get_data = (req, res) => {
	let lv = req.params.live
	let out = {online: online, users: []}
	if(lv) {
		out.online = 0;
		let x = users_in_live.get(lv)
		if(x) for(const val of x) {
			let zz = {id: val.user, sid: val.sid}
			out.users.push(zz);
		}
		out.online = out.users.length;
	} else {
		for(const key of users_in_live) {
			for(const val of key[1]) {
				let xx = {id: val.user, sid: val.sid, live_name: key[0]}
				out.users.push(xx);
			}
		}
	}
	console.log(out)
	return res.status(200).send(out)
}

var start = () => {

	var whitelist = ['http://localhost:2112', 'http://localhost:2112'] //TODO
	var corsOptions = {
		credentials: true,
		origin: function (origin, callback) {
			if (whitelist.indexOf(origin) !== -1) {
				callback(null, true)
			} else {
				callback(null, true)
				//callback(new Error('Not allowed by CORS'))
			}
		}
	}
	app.use(cors(corsOptions));

	app.use(sessionParser);
	app.use(bodyparser.urlencoded({extended: true}));
	app.use("/", express.static("./static"));
		
	//users
	app.post('/session/login/:live/:id', Login);
	app.delete('/session/logout', Logout);


	//admin
//	app.post('/admin/login');
//	app.post('/admin/logout');
	
	// Data
	app.get('/data/:live', get_data)
	app.get('/data/', get_data);

	const server = https.createServer({
		key: fs.readFileSync('./server.key'),
		cert: fs.readFileSync('./server.cert')
	}, app);

	server.on('upgrade', function(req, sock, head) {
		console.log("Upgrading session");

		sessionParser(req, {}, () => {
			console.log(req.session.sessionId);
			console.log(req.session.uid);
			console.log(req.session.livename);
			if(!req.session.sessionId) {
				sock.destroy();
				return ;
			}
			console.log("Sessions parsed.");
			socketserver.handleUpgrade(req, sock, head, (s) => {
				socketserver.emit('connection', s, req);
			});
		});
	});

	server.listen({host: "0.0.0.0", port: 2112}, () => {
		console.log("Listening on port 8080...");
	});
}

socketserver.on('error' , (err) =>{
  console.log( err );
});

function heartbeat() {
	this.isAlive = true;
}

socketserver.on('connection' , (sock, req) => {
	let sessionId = req.session.sessionId;
	sockets.set(sessionId, sock);
	let id = req.session.uid
	let live_name = req.session.livename
	console.log("upgrading");
	console.log(id);
	console.log(live_name);
	console.log(sessionId);
	sock.isAlive = true;

	sock.on('pong', heartbeat) 

	

	online++
	let SS = {user: id, sid: sessionId};

	let x = users_in_live.get(live_name)
	if(x) {
		x.push(SS);
	} else {
		users_in_live.set(live_name, [SS]);
	}

//	sock.setKeepAlive(true, 10000);

	sock.on('message' , (data) =>{

	});

  sock.on( 'error', (err ) =>{
    console.log(err);
  });

	sock.on('close', () => {
console.log("connection dropped");
		let x = users_in_live.get(live_name)
		if(x) {
			let ind = x.indexOf(SS);
			if(ind > -1) {
				x.splice(ind, 1);
				//console.log(x);
				//users_in_live.set(live_name, x);
			}
			if(x.length == 0) {
				users_in_live.delete(live_name)
			}
		}
		sockets.delete(sessionId);
		online--;
	});
  console.log('Client connected') ;
});

const interval = setInterval(() => {
	socketserver.clients.forEach((sock) => {
		console.log(sock.isAlive)
		if(sock.isAlive === false) return sock.terminate();
		
		sock.isAlive = false
		sock.ping(() => {});
	})	
}, process.env.REFRESH_INTERVAL);
start();
