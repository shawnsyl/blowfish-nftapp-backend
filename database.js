const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({path: path.resolve(__dirname+'/.env')});
// production: blowf-nfts.nuccx.mongodb.net 
// staging: blowf-cluster.yp2un.mongodb.net

const dbUri = process.env.NODE_ENV == 'develop' || process.env.IS_STAGING === 'TRUE' ? process.env.DB_URI_TEST : process.env.DB_URI_PROD

const connection = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${dbUri}/blowf?retryWrites=true&w=majority`

mongoose.connect(connection,{ useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false})
    .then(() => console.log(dbUri, "Database Connected Successfully"))
    .catch(err => console.log(err));