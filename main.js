// Requires
var http = require('http');
var https = require('https');
var fs = require('fs');
var open = require('open');
var qparse = require('./qparse.js');

// SERVER TO GET OAUTH TOKEN

// PORT
const PORT=3000;
var token = -1;

// function to handle server requests
function handleRequest(request, response){
    console.log(request.url);
    if (request.url.substr(0,10) == "/groupnode") {
        var info = qparse.parse(request.url);

        // Check if we got the token
        if (info['access_token']) {
            token = info['access_token'];
            console.log("Token: " + token);
            var html = fs.readFileSync('success.html');
            response.end(html);
            listGroups();
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
    console.log("Server listening on: http://localhost:%s", PORT);
});

// Open GroupMe URL
var gmUrl = 'https://oauth.groupme.com/oauth/authorize?client_id=ZpEe5Yl2VnZAAOomwQ3SZFJ2TCsnGbKi51waJTZeQQZ6pSL5';
open(gmUrl);

// END SERVER

// GROUPS

function listGroups() {

    /*var getData = JSON.stringify({

    });*/

    var options = {
        hostname: 'api.groupme.com',
        path: '/v3/groups?token=' + token,
        method: 'GET'
    }

    var req = https.request(options, (res) => {
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            console.log(chunk);
        });
        res.on('end', () => {
            console.log('No more data in response');
        });
    });

    req.end();

}

// END GROUPS
