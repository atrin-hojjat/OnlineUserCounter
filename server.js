const express = require('express')
const https = require('http')
const session = require('express-session');
const WS = require('ws') ;
const uuid = require('uuid');
const bodyparser = require("body-parser");
const cors = require("cors");

const app = express();
const socketserver = new WS.Server({noServer:true, clientTracing: false});
var sockets = new Map(); // Session Id to socket
var users_in_live = new Map(); // live name to session
const querystring = require("querystring");

var sessionParser = session({
	saveUninitialized: false,
	secret: "I'm gonna tell you a very important secret of the stars in the night that shine brighter than the light",
	resave: false
});

var Login = (req, res) => {
	let id = req.params.id
	let live_name = req.body.id

	const id = uuid.v4();

	req.session.sessionId = sid;
	req.session.id = id;
	req.session.live_name = live_name;

	return res.status(200).send({ok: true, message: "Please Upgrade the connection"})
}

var Logout = (req, res) => {
	let s = sockets.get(req.session.sessionId);

	if(s) s.close();
	
	sockets.delete(req.session.sessionId);
	
	req.session.destroy(() => {
		res.status(200).send({ok: true, message: "Logout Successful"});
	});
}

var get_data = (req, res) => {
	let lv = req.param.live_name
	let out = {online: online, users: []}
	if(lv == "") {
		for(key of users_in_live) {
			for(val of users_in_live.get(key)) {
				let xx = {id: val.id, sid: val.sid, live_name: key}
				out.users.push(xx);
			}
		}
	} else {
		out.online = 0;
		for(val of users_in_live.get(lv)) {
			let zz = {id: val.id, sid: val.sid}
			out.users.push(zz);
		}
		out.online = out.users.length();
	}
	return res.status(200).send(out)
}

var start = () => {
/*
	var whitelist = ['http://localhost:3000', 'http://localhost:8005']
	var corsOptions = {
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
*/
	app.use(sessionParser);
	app.use(bodyparser.urlencoded({extended: true}));
		
	//users
	app.post('/session/login', Login);
	app.delete('/session/logout', Logout);


	//admin
//	app.post('/admin/login');
//	app.post('/admin/logout');
	
	// Data
	app.get('/data/:live_name', get_data)

	const server = https.createServer(app);

	server.on('upgrade', function(req, sock, head) {
		console.log("Upgrading session");

		sessionParser(req, {}, () => {
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

	server.listen({host: "0.0.0.0", port: 8080}, () => {
		console.log("Listening on port 8080...");
	});
}

socketserver.on('error' , (err) =>{
  console.log( err );
});
socketserver.on('connection' , (sock, req) => {
	let sessionId = req.session.sessionId;
	sockets.set(sessionId, sock);
	let id = req.session.id
	let live_name = req.session.live_name

	online++
	let SS = {user: id, sid: sessoinId};

	let x = users_in_live.get(sessionId)
	if(x) {
		x.push(SS);
	} else {
		users_in_live.set(sessionId, [req.session]);
	}

	sock.on('message' , (data) =>{

	});

  sock.on( 'error', (err ) =>{
    console.log(err);
  });

	sock.on('close', () => {
		let x = users_in_live.get(sessionId)
		if(x) {
			let ind = t.indexOf(SS);
			if(SS > -1) x.splice(ind, 1);
			if(x.length == 0) {
				users_in_live.delete(sessionId)
			}
		}
		sockets.delete(sessionId);
		online--;
	});
  console.log('Client connected') ;
});

start();
