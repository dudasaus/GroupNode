// Requires
var http = require('http');
var https = require('https');
var fs = require('fs');
var open = require('open');
var Emitter = require('events');
var qparse = require('./qparse.js');

// Custom emitter class
class actionEmitter extends Emitter {}

// SERVER TO GET OAUTH TOKEN
/*
// PORT
const PORT=3000;
var token = -1;

// function to handle server requests
function handleRequest(request, response){
    if (request.url.substr(0,10) == "/groupnode") {
        var info = qparse.parse(request.url);

        // Check if we got the token
        if (info['access_token']) {
            token = info['access_token'];
            // console.log("Token: " + token);
            var html = fs.readFileSync('success.html');
            response.end(html);
            main.step();
        }
        else {
            var html = fs.readFileSync('error.html');
            response.end(html);
        }
    }
    else {
        response.end("404");
    }
}

// Create the server
var server = http.createServer(handleRequest);

// Start the server
server.listen(PORT, function(){
    // console.log("Server listening on: http://localhost:%s", PORT);
});

// Open GroupMe URL
var gmUrl = 'https://oauth.groupme.com/oauth/authorize?client_id=ZpEe5Yl2VnZAAOomwQ3SZFJ2TCsnGbKi51waJTZeQQZ6pSL5';
open(gmUrl);
*/
// END SERVER

/* PLAN

    0. startUp: load saved users (1)
    1. Select an existing user (3) or add a new user (2)
    2. Set up server and stuff to add a user and get a token (3)
    3. Authenticate the user by getting their user info (4)
        - if authentication fails, go to (2)
    4. get the user groups (5)
    5. select a user group (6)
    6. send messages, or type '.exit' to quit the application

*/

// MAIN

var main = {
    state: 'startUp',
    users: [],
    user: [],
    groups: [],
    groupId: -1,
    msgId: 0,
    actions: new actionEmitter(),
    step: function() {
        if (this.state == 'startUp') {
            startUp(this);
        }
        else if (this.state == 'selectUser') {
            selectUser(this);
        }
        else if (this.state == 'gettingGroups') {
            getGroups(this);
        }
        else if (this.state == 'selectGroup') {
            selectGroup(this)
        }
    }
}

// Emitters for handling async stuff

main.actions.once('startUp', (arr) => {
    main.users = arr;
    main.state = 'selectUser';
    main.step();
});
main.actions.once('selectUser', (num) => {
    num = parseInt(num);
    if (isNaN(num) || num < 0 || num > main.users.length) {
        console.log('Invalid value');
        selectUser(main);
    }
    else {
        if (num == 0) {
            // Add user
            main.state = 'addUser';
        }
        else {
            main.user = main.users[num - 1];
            main.state = 'getUserInfo';
        }
    }
});
main.actions.once('getGroups', (arr) => {
    main.groups = arr;
    main.state = 'selectGroup';
    main.step();
});
main.actions.on('selectGroup', (num) => {
    num = parseInt(num);
    if (isNaN(num) || num < 0 || num >= main.groups.length) {
        console.log('Invalid value');
        selectGroup(main);
    }
    else {
        main.groupId = main.groups[num][0];
        main.msgId = main.groups[num][2];
        main.state = 'sendMessages';
        console.log('Entering group ' + main.groups[num][1]);
        console.log('Message ID: ' + main.msgId);
        main.step();
    }
});
main.actions.on('sendMessages', (msg) => {
    if (msg + '' == ".exit\n") {
        process.exit(0);
    }
    else {
        sendMessage(main, msg);
    }
});

// Start doing stuff
main.step();

// END MAIN

// STARTUP

function startUp(m) {
    var dataJson = 'data.json';
    fs.readFile(dataJson, 'utf8', (err, data) => {
        if (err) {
            console.log(err);
        }
        else {
            m.actions.emit('startUp', JSON.parse(data).users);
        }
    });
}

// END STARTUP

// USERS

function selectUser(m) {
    console.log('(0) Add new user');
    for (var i = 0; i < m.users.length; i++) {
        console.log(`(${i + 1}) ${m.users[i][0]}`);
    }

    console.log('Select a user by entering the choice number');
}

// END USERS

// GROUPS

function getGroups(m) {

    var resultString = '';
    var groupDataFull;
    var groupData = [];

    var options = {
        hostname: 'api.groupme.com',
        path: '/v3/groups?token=' + token,
        method: 'GET'
    }

    var req = https.request(options, (res) => {
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            resultString += chunk;
        });
        res.on('end', () => {
            groupDataFull = JSON.parse(resultString).response;
            for (var i = 0; i < groupDataFull.length; i++) {
                groupData.push([groupDataFull[i].id, groupDataFull[i].name,
                groupDataFull[i].messages.count]);
            }
            m.actions.emit('getGroups', groupData);
        });
    });

    req.end();
}

function selectGroup(m) {
    for (var i = 0; i < m.groups.length; i++) {
        console.log(`(${i}) ${m.groups[i][1]}`);
    }
    console.log('Select a group by entering its number');
}

// END GROUPS

// MESSAGING

function sendMessage(m, msg) {
    // Data to post
    var data = JSON.stringify({
        'message': {
            'source_guid': m.msgId++,
            'text': msg + ''
        }
    });

    var options = {
        hostname: 'api.groupme.com',
        path: '/v3/groups/' + m.groupId + '/messages?token=' + token,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    }

    // POST request
    var req = https.request(options, (res) => {
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            console.log("BODY: " + chunk);
        });
        res.on('end', () => {
            console.log('no more data');
        });
    });
    req.on('error', (e) => {
        console.log(e.message);
    });
    req.end(data);
}

// END MESSAGING

// INPUT

process.stdin.on('readable', () => {
    var chunk = process.stdin.read();
    if (chunk !== null) {
        if (main.state == 'selectUser') {
            main.actions.emit('selectUser', chunk);
        }
        else if (main.state == 'selectGroup') {
            main.actions.emit('selectGroup', chunk);
        }
        else if (main.state == 'sendMessages') {
            main.actions.emit('sendMessages', chunk);
        }
    }
});

// END INPUT
