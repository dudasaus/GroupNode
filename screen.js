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
    width: '100%',
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

var output = blessed.box({
    top: 0,
    left: 0,
    width: screen.cols,
    height: screen.rows - 3,
    padding: 1,
    content: 'hello world',
    style: {
        fg: 'white',
        bg: 'red'
    }
});

var listTest = blessed.list({
    top: 0,
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
listTest.setItems(['option 1', 'option 2', 'option 3', 'option 4', 'option 5']);

listTest.on('select', (a) => {
    ibox.setValue(listTest.value);
    screen.render();
});

var ibox = blessed.textbox({
    bottom: 0,
    left: 0,
    width: screen.cols,
    height: 3,
    padding: 1,
    value: 'hello',
    style: {
        fg: 'black',
        bg: 'white'
    }
});


//screen.append(ibox);
//screen.append(listTest);
//listTest.focus();
//screen.append(output);

/* showTitleScreen();
setTimeout(() => {
    showGroupsScreen(['option 1', 'option 2', 'option 3', 'option 4', 'option 5'])
}, 3000); */

function inputter() {
    ibox.setValue("");
    screen.render();
    ibox.readInput( () => {
        output.content += "\n" + ibox.value;
        ibox.setValue("Press / to type");
        screen.render();
    });
}

screen.key(['escape', 'C-c'], () => {
    return process.exit(0);
});

screen.key(['/'], () => {
    inputter();
});

module.exports = {
    setName,
    setEmitter,
    showMessage,
    showTitleScreen,
    showGroupsScreen
};
