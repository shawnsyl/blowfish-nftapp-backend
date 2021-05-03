
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
const cron = require('node-cron');
const express = require('express');
const Web3 = require('web3');
const path = require('path');
require('./database');
const UserNft = require('./models/userNft')
const testContract = require('./abi/TestContract.json');
const mainContract = require('./abi/MainContract.json');

const web3ProviderUrl = process.env.IS_STAGING === 'TRUE' || process.env.NODE_ENV == 'develop' ? 'https://data-seed-prebsc-1-s1.binance.org:8545' : 'https://bsc-dataseed1.binance.org:443' 
const web3 = new Web3(web3ProviderUrl);
const contractAbi = process.env.IS_STAGING === 'TRUE' || process.env.NODE_ENV == 'develop' ? testContract : mainContract;
const contractAddress = process.env.IS_STAGING === 'TRUE' || process.env.NODE_ENV == 'develop' ? process.env.TEST_PUFF_CONTRACT : process.env.MAIN_PUFF_CONTRACT;

require('dotenv').config({path: path.resolve(__dirname+'/.env')});

const app = express();

app.use(cors())
app.use(express.json());
app.use(express.urlencoded({extended: true}))


// userNfts api
const userNfts = require('./api/userNfts');
app.use('/api/cryptopuffs', userNfts);

app.use(express.static(path.join(__dirname, './build')))

// start server
const port = process.env.PORT || 5000;
app.listen(port, async () => {
    console.log(`Server started on port ${port}`);
});

const contract = new web3.eth.Contract(
    contractAbi,
    contractAddress
);

const queryBlockchain = async (method, args) => {
    if (args !== undefined) {
        console.log(...Object.values(args));
        const result = await contract.methods[method](...Object.values(args)).call()
        if (result)
            return result;
    } else {
        const result = await contract.methods[method].call()
        if (result)
            return result;
    }
}

const addPuffIdToDb = async (user, puffId) => {
    const newCryptoPuff = new UserNft({
        puffId: puffId, puffOwner: user, dateMinted: Date.now()
    });

    const result = await newCryptoPuff.save()
    if (result) {
        return result;
    } else {
        return false;
    }
}

const cronJob = () => {
    UserNft.find({})
        .then(nfts => {
            contract.methods.totalSupply().call()
                .then(result => {
                    if (nfts.length !== parseInt(result)) {
                        const dbNftIds = nfts.map(nft => nft.puffId);
                        const liveNftIds = Array.from(Array(parseInt(result)).keys());

                        const missingIds = liveNftIds.filter(id => {
                            return !dbNftIds.includes(id);
                        })
                        const queryMissing = missingIds.map(id => queryBlockchain('ownerOf', {id: id}));
                        Promise.all(queryMissing)
                            .then(owners => {
                                console.log(owners);
                                const addPuffIdToDbRequests = owners.map((owner, index) => addPuffIdToDb(owner, missingIds[index]))
                                Promise.all(addPuffIdToDbRequests)
                                    .then(result => {
                                        console.log(result);
                                    })
                            })
                            .catch(e => {
                                console.error(e);
                            })
                    }
                })
                .catch(e => {
                    console.error(e);
                })

        })
        .catch(e => {
            console.error(e);
        })
}

cron.schedule('0,5,10,15,20,25,30,35,40,45,50,55 * * * *', () => {
    console.log('running a task every 5 minutes to update db');
    cronJob();

});