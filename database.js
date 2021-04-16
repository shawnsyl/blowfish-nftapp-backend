const mongoose = require('mongoose');

// move these to env lol
// blowfAdmin
// rv3Fk1dsrZZw5w60 

const connection = "mongodb+srv://blowfAdmin:rv3Fk1dsrZZw5w60@blowf-cluster.yp2un.mongodb.net/blowf?retryWrites=true&w=majority";
mongoose.connect(connection,{ useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false})
    .then(() => console.log("Database Connected Successfully"))
    .catch(err => console.log(err));