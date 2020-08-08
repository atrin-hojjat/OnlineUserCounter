# OnlineUserCounter
Simple Online user counter with nodejs and websocket


#Usage
First of all run `npm install`
set the enviorment variables in .env file (SECRET, REFRESH_INTERVAL) and run
```
npm start
```

clients need to pass information to `/session/login` to get a session id(and logout using `/session/logout`, clients can be distinguished using live_name parameter)
then they need to use a websocket to connect to server

You can get the online user info using `/data/` (or `/data/[live_name]` to filter users)
