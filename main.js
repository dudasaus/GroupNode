// Requires
var http = require('http');
var https = require('https');
var fs = require('fs');
var open = require('open');
var Emitter = require('events');
var qparse = require('./qparse.js');
var screen = require('./screen.js');

// Custom emitter class
class actionEmitter extends Emitter {}

// MAIN

var main = {
    state: 'startUp',
    groupNames: [],
    groupIds: [],
    groupId: -1,
    token: -1,
    msgId: 0,
    server: {},
    lastId: -1,
    usrId: -1,
    actions: new actionEmitter(),
    dataFileName: 'data.json',
    updateFile: function () {
        var output = JSON.stringify({
            'token' : this.token,
            'msgId' : this.msgId
        });
        fs.writeFile(this.dataFileName, output, (err) => {
            if (err) throw err;
        });
    },
    step: function() {
        if (this.state == 'startUp') {
            startUp(this);
        }
        else if (this.state == 'addUser') {
            addUser(this);
        }
        else if (this.state == 'getUserInfo') {
            getUserInfo(this);
        }
        else if (this.state == 'selectUser') {
            selectUser(this);
        }
        else if (this.state == 'getGroups') {
            getGroups(this);
        }
        else if (this.state == 'selectGroup') {
            selectGroup(this)
        }
    }
}

screen.setEmitter(main.actions);

// Emitters for handling async stuff

// Occurs when you've loaded the users from local data
main.actions.once('startUp', (data) => {
    main.msgId = data.msgId;
    main.token = data.token;
    if (main.token == "none")
        main.state = 'addUser';
    else
        main.state = 'getUserInfo';
    main.step();
});

// Occurs when input for the select user screen is given
main.actions.on('selectUser', (num) => {
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
        main.step();
    }
});

// Occurs when the server attempts to add a user
main.actions.on('addUser', (token) => {
    if (token == -1) {
        console.log("Failed to authenticate new user, try again?");
    }
    else {
        main.token = token;
        main.state = 'getUserInfo';
        main.updateFile();
    }
    main.server.close();
    main.step();
});

// Occurs when we try to get the user info
main.actions.on('getUserInfo', (name) => {
    if (name == -1) {
        screen.showMessage("Authentication failed.");
        main.state = 'selectUser';
    }
    else {
        main.state = 'getGroups'
        screen.setName(name);
    }
    main.step();
});

// Occurs once the groups info has loaded from the https request
main.actions.once('getGroups', (names, ids) => {
    main.groupNames = names;
    main.groupIds = ids;
    main.state = 'selectGroup';
    main.step();
});

// Occurs when input for the select gorup screen is given
main.actions.on('selectGroup', (num) => {
    main.groupId = main.groupIds[num];
    main.state = 'sendMessages';
    screen.showMessagingScreen("Now messaging " + main.groupNames[num]);
    getMessages(main, 5);
    setInterval( () => {
        getMessages(main,20);
    }, 5000);
    main.step();
});

// Occurs when input is given when messaging a group
main.actions.on('sendMessages', (msg) => {
    if (msg == 'load') {
        getMessages(main);
    }
    else
        sendMessage(main, msg);
});

// Start doing stuff
main.step();

// END MAIN

// STARTUP

function startUp(m) {
    var dataJson = 'data.json';
    screen.showTitleScreen();
    fs.readFile(dataJson, 'utf8', (err, data) => {
        if (err) {
            var stuff = {
                "token" : "none",
                "msgId" : "0"
            }
            fs.writeFile(dataJson, JSON.stringify(stuff), (err) => {
                if (err) screen.showMessage("Error creating " + dataJson);
            });
            m.actions.emit('startUp', stuff);
        }
        else {
            m.actions.emit('startUp', JSON.parse(data));
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

function addUser(m) {
    // Port for the server
    var PORT = 3000;

    // Server
    main.server = http.createServer( (request, response) => {
        if (request.url.substr(0,10) == "/groupnode") {
            var info = qparse.parse(request.url);

            // Check if we got the token
            if (info['access_token']) {
                var tempToken = info['access_token'];
                var html = fs.readFileSync('success.html');
                response.end(html);
                m.actions.emit('addUser', tempToken);
            }
            else {
                var html = fs.readFileSync('error.html');
                response.end(html);
                m.actions.emit('addUser', -1);
            }

        }
        else {
            response.end("404");
        }

    });

    // Start listening
    main.server.listen(PORT);

    // Open the GroupMe URL
    var gmUrl = 'https://oauth.groupme.com/oauth/authorize?client_id=ZpEe5Yl2VnZAAOomwQ3SZFJ2TCsnGbKi51waJTZeQQZ6pSL5';
    open(gmUrl);

}

function getUserInfo(m) {

    var resultString = '';

    var options = {
        hostname: 'api.groupme.com',
        path: '/v3/users/me?token=' + m.token,
        method: 'GET'
    }

    var req = https.request(options, (res) => {
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            resultString += chunk;
        });
        res.on('end', () => {
            var response = JSON.parse(resultString).response;
            if (response) {
                m.usrId = response.id;
                m.actions.emit('getUserInfo', response.name);
            }
            else {
                m.actions.emit('getUserInfo', -1);
            }
        });
    });

    req.end();

}

// END USERS

// GROUPS

function getGroups(m) {

    var resultString = '';
    var groupDataFull;
    var groupNames = [];
    var groupIds = [];

    var options = {
        hostname: 'api.groupme.com',
        path: '/v3/groups?token=' + m.token,
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
                groupNames.push(groupDataFull[i].name);
                groupIds.push(groupDataFull[i].id);
            }
            m.actions.emit('getGroups', groupNames, groupIds);
        });
    });

    req.end();
}

function selectGroup(m) {
    screen.showGroupsScreen(m.groupNames);
}

// END GROUPS

// MESSAGING

function sendMessage(m, msg) {

    var resultString = ''

    // Data to post
    var data = JSON.stringify({
        'message': {
            'source_guid': m.msgId++,
            'text': msg + ''
        }
    });

    var options = {
        hostname: 'api.groupme.com',
        path: '/v3/groups/' + m.groupId + '/messages?token=' + m.token,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    }

    // POST request
    var req = https.request(options, (res) => {
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            resultString += chunk;
        });
        res.on('end', () => {
            var result = JSON.parse(resultString);
            if (result.meta.code == '201') {
                var msgData = result.response.message;
                screen.addMessage(msgData.text, msgData.name, 'green');
            }
            else {
                screen.showMessage(result.meta.errors.toString());
            }
            m.msgId++;
            m.updateFile();
        });
    });
    req.on('error', (e) => {
        screen.showMessage(e.message);
    });
    req.end(data);
}

function getMessages(m, limit = -1) {

    var resultString = '';

    var lid = '';
    if (m.lastId != -1) lid = `&since_id=${m.lastId}`;
    if (limit != -1) lid += `&limit=${limit}`;

    var options = {
        hostname: 'api.groupme.com',
        path: '/v3/groups/' + m.groupId + '/messages?token=' + m.token + lid,
        method: 'GET'
    }

    var req = https.request(options, (res) => {
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            resultString += chunk;
        });
        res.on('end', () => {
            if (resultString != '') {
                var result = JSON.parse(resultString);
                if (result.meta.code == '200') {
                    var msgData = result.response.messages;
                    for (var i = 0; i < msgData.length; i++) {
                        var j = msgData.length - 1 - i;
                        if (msgData[j].user_id != m.usrId && limit > 5)
                            screen.addMessage(msgData[j].text, msgData[j].name);
                        m.lastId = msgData[j].id;
                    }
                }
                else {
                    screen.showMessage(JSON.stringify(result));
                }
            }
        });
    });

    req.end();
}


// END MESSAGING
