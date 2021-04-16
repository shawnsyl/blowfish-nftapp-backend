
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
const cron = require('node-cron');
const express = require('express');
const path = require('path');
require('./database');
require('dotenv').config({path: path.resolve(__dirname+'/.env')});

const testContract = require('./abi/TestContract.json');

const app = express();

app.use(cors())
app.use(express.json());
app.use(express.urlencoded({extended: true}))


// userNfts api
const userNfts = require('./api/userNfts');
app.use('/api/cryptopuffs', userNfts);

app.use(express.static(path.join(__dirname, './build')))
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, './build'))
})


// start server
const port = process.env.PORT || 5000;
app.listen(port, async () => {
    console.log(`Server started on port ${port}`);
});

cron.schedule('* * * * *', () => {
    console.log('running a task every minute to update db');
});

console.log('hey', process.env.NODE_ENV);