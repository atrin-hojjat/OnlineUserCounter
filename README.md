# OnlineUserCounter
Simple Online user counter with nodejs and websocket


#Usage
First of all run `npm install`
In order to run you need to set an enviromant variable named SECRET and then `npm start`.
In Linux/Unix/Mac run:
```
SECRET=secret npm start
```
In windows:
```
setx SECRET=secret
npm start
```

clients need to pass information to `/session/login` to get a session id(and logout using `/session/logout`, clients can be distinguished using live_name parameter)
then they need to use a websocket to connect to server

You can get the online user info using `/data/` (or `/data/[live_name]` to filter users)
