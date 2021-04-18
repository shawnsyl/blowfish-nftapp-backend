const mongoose = require('mongoose');
// production: blowf-nfts.nuccx.mongodb.net
const connection = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@blowf-cluster.yp2un.mongodb.net/blowf?retryWrites=true&w=majority`

mongoose.connect(connection,{ useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false})
    .then(() => console.log("Database Connected Successfully"))
    .catch(err => console.log(err));