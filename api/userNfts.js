const express = require('express');
const Web3 = require('web3');
const router = express.Router();

const UserNft = require('./../models/userNft')

const testContract = require('./../abi/TestContract.json');

// web 3 setup
const web3ProviderUrl = process.env.NODE_ENV === 'develop' ? 'https://data-seed-prebsc-1-s1.binance.org:8545' : 'https://bsc-dataseed1.binance.org:443'
const web3 = new Web3(web3ProviderUrl);

router.get('/', (req, res) => {
    const {
        user
    } = req.query;

    const contract = new web3.eth.Contract(
        testContract,
        process.env.TEST_PUFF_CONTRACT, // contract address here
        {
            from: user
        }
    );

    UserNft.find()
        .then(users => res.json(users))
        .catch(err => console.log(err))
})

router.post('/add', (req, res) => {
    const { puffOwner, puffId } = req.body;
    console.log(req.body);
    const newCryptoPuff = new UserNft({
        puffId: puffId, puffOwner: puffOwner
    })

    console.log(newCryptoPuff);

    newCryptoPuff.save()
        .then(() => res.json({
            message: 'Added crypto puff to db succesfully'
        }))
        .catch(err => res.status(400).json({
            "error":  err,
            "message": "Error adding crypto puff to db!"
        }))
})

module.exports = router 