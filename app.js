/**
 * Created by Gryzli on 24.01.2017.
 */
const express = require('express');
const morgan = require('morgan');
const path = require('path');

const app = express();

// Setup logger
app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] :response-time ms'));

// Serve static assets
app.use(express.static(path.resolve(__dirname, '..', 'build')));

// Always return the main index.html, so react-router render the route in the client
app.get('/', (req, res) => {
    let path2 = path.resolve(__dirname, '..', 'index.html');
    console.log(path2);
    res.sendFile(path2);
});
app.get('/test',(req,res)=>{
    res.send('hello world!');
});

module.exports = app;