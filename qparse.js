
function parse(url) {
    var result = [];

    // Find the start of the query
    var qStart = url.search("\\?");

    if (qStart != -1) {
        var qString = url.substr(qStart + 1);
        // Split at every &
        keyVals = qString.split('&');
        // Put key vals into result array 
        for (var i = 0; i < keyVals.length; i++) {
            keyVals[i] = keyVals[i].split('=');
            result[keyVals[i][0]] = decodeURIComponent(keyVals[i][1]);
        }
    }
    return result;
}

module.exports.parse = parse;
