const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userNftSchema = new Schema({
    puffId: {
        type: Number,
        required: true
    },
    puffOwner: {
        type: String,
        required: true
    },
    dateMinted: {
        type: Number,
        required: false
    }
})
module.exports = mongoose.model("UserNft", userNftSchema, "userNfts")