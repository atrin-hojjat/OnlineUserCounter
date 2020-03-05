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
var online = 0

var sessionParser = session({
	saveUninitialized: false,
	secret: process.env.SECRET,
	resave: false
});

var Login = (req, res) => {
	let id = req.params.id
	let live_name = req.params.live

	const sid = uuid.v4();
	console.log(live_name)
	console.log(id);

	req.session.sessionId = sid;
	req.session.uid = id;
	req.session.livename = live_name;

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
	let id = req.session.uid
	let live_name = req.session.livename
	console.log("upgrading");
	console.log(id);
	console.log(live_name);
	console.log(sessionId);

	online++
	let SS = {user: id, sid: sessionId};

	let x = users_in_live.get(live_name)
	if(x) {
		x.push(SS);
	} else {
		users_in_live.set(live_name, [SS]);
	}

	sock.on('message' , (data) =>{

	});

  sock.on( 'error', (err ) =>{
    console.log(err);
  });

	sock.on('close', () => {
		let x = users_in_live.get(live_name)
		if(x) {
			let ind = x.indexOf(SS);
			if(SS > -1) x.splice(ind, 1);
			if(x.length == 0) {
				users_in_live.delete(live_name)
			}
		}
		sockets.delete(sessionId);
		online--;
	});
  console.log('Client connected') ;
});

start();