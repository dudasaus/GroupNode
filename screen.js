// Requires
var blessed = require('blessed');

// Variables
var name = "null";
var emitter;
function setName(n) {
    name = n;
}
function setEmitter(e) {
    emitter = e;
}

// Screen
var screen = blessed.screen({
    smartCSR: true
});
screen.title = 'GroupNode';
function clearScreen() {
    while (screen.children.length > 0) {
        screen.remove(screen.children[0]);
    }
}

// Message
var message = blessed.Message({
    width: '50%',
    height: '50%',
    top: 'center',
    left: 'center',
    style: {
        bg: 'red',
        fg: 'white'
    }
});
function showMessage(msg) {
    screen.append(message);
    message.display(msg);
}

// Title screen
var titleScreen = blessed.box({
    top: 0,
    left: 0,
    height: '100%',
    width: '100%',
    style: {
        bg: 'blue',
        fg:  'white'
    }
});

var tsContent = blessed.BigText({
    content: 'Group Node',
    left: 'center',
    top: 'center',
    width: 8 * ('Group Node').length,
    height: 14,
    style: {
        bg: 'blue',
        fg: 'white'
    }
});

titleScreen.append(tsContent);

function showTitleScreen() {
    clearScreen();
    screen.append(titleScreen);
    screen.render();
}

// Groups screen
var groupsScreen = blessed.box({
    top: 0,
    left: 0,
    height: '100%',
    width: '100%'
});

var groupsList = blessed.list({
    top: 4,
    left: 0,
    width: screen.cols,
    height: screen.rows - 3,
    padding: 1,
    keys: true,
    style: {
        selected: {
            bg: 'white',
            fg: 'black'
        }
    }
});
groupsList.on('select', (item, index)=> {
    //showMessage(item + ' ' + index);
    emitter.emit('selectGroup', index);
});

var groupsText = blessed.box({
    top: 0,
    left: 0,
    height: 4,
    padding: 1,
    width: '100%',
    content: 'Select a group to chat in:'
});

groupsScreen.append(groupsList);
groupsScreen.append(groupsText);

function showGroupsScreen(arr) {
    clearScreen();
    groupsList.setItems(arr);
    groupsText.content = `Welcome, ${name}!\nSelect a group to chat in`;
    screen.append(groupsScreen);
    groupsList.focus();
    screen.render();
}

// Messaging screen
var messagingScreen = blessed.box({
    top: 0,
    left: 0,
    height: '100%',
    width: '100%'
});

var messagingOutput = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: screen.rows - 3,
    scrollable: true,
    //alwaysScroll: true,
    //scrollbar: true,
    padding: 1,
    tags: true,
    style: {
        bg: 'black',
        fg: 'white'
    }
});

var inputText = "Press / to send a message";
var messageTyping = false;
var messagingInput = blessed.textbox({
    width: '100%',
    height: 3,
    top: screen.rows - 3,
    left: 0,
    padding: 1,
    value: inputText,
    style: {
        bg: 'white',
        fg: 'black'
    }
});
messagingInput.key(['/'], () => {
    if (!messageTyping) {
        messageTyping = true;
        messagingInput.value = '';
        screen.render();
        messagingInput.readInput( () => {
            //messagingOutput.content += messagingInput.value + '\n';
            emitter.emit('sendMessages', messagingInput.value);
            messagingInput.setValue(inputText);
            messagingInput.focus();
            messageTyping = false;
            screen.render();
        });
    }
});

function addMessage(msg, usr) {
    messagingOutput.content += (`{blue-fg}{bold}${usr}:{/} ${msg}\n`);
    messagingOutput.setScrollPerc(100);
    screen.render();
}

messagingScreen.append(messagingOutput);
messagingScreen.append(messagingInput);

function showMessagingScreen(msg) {
    clearScreen();
    if (msg) {
        messagingOutput.content += (`{red-fg}{bold}${msg}{/}\n`);
    }
    screen.append(messagingScreen);
    messagingInput.focus();
    screen.render();
}

// Other stuff
screen.key(['escape', 'C-c'], () => {
    return process.exit(0);
});

module.exports = {
    setName,
    setEmitter,
    showMessage,
    showTitleScreen,
    showGroupsScreen,
    showMessagingScreen,
    addMessage
};
