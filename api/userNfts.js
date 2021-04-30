const express = require('express');
const Web3 = require('web3');
const router = express.Router();

const UserNft = require('./../models/userNft')
const testContract = require('./../abi/TestContract.json');
const mainContract = require('./../abi/MainContract.json');

// web 3 setup
// prod should be https://bsc-dataseed1.binance.org:443
const web3ProviderUrl = process.env.IS_STAGING === 'TRUE' || process.env.NODE_ENV == 'develop' ? 'https://data-seed-prebsc-1-s1.binance.org:8545' : 'https://bsc-dataseed1.binance.org:443' 
const web3 = new Web3(web3ProviderUrl);
const contractAbi = process.env.IS_STAGING === 'TRUE' || process.env.NODE_ENV == 'develop' ? testContract : mainContract;
const contractAddress = process.env.IS_STAGING === 'TRUE' || process.env.NODE_ENV == 'develop' ? process.env.TEST_PUFF_CONTRACT : process.env.MAIN_PUFF_CONTRACT;

const PAGE_SIZE = 12;

const getTokenByOwnerIndex = async (user, i, contract) => {
    const puffId = await contract.methods.tokenOfOwnerByIndex(user, i).call()

    if (puffId)
        return parseInt(puffId);
}

const findInDb = async (user, puffId) => {
    const result = await UserNft.find({puffOwner: user, puffId: puffId})
    
    if (result)
        return result;
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

const getUpdatedCryptoPuffs = (user, numPuffs, contract, page, sortBy, res) => {
    let helper = [];
    for (let i = 0; i < numPuffs; i++) {
        helper.push(i);
     }
    
    const requests = helper.map(i => getTokenByOwnerIndex(user, i, contract));

    Promise.all(requests)
        .then(responses => {
            const findInDbRequests = responses.map(puffId => findInDb(user, puffId));

            Promise.all(findInDbRequests)
                .then(dbMatches => {
                    const puffsInDb = dbMatches.map(dbMatch => dbMatch[0] ? dbMatch[0] : null).filter(item => item !== null);

                    let missingPuffIds = [];
                    responses.map(response => {
                        if (!puffsInDb.find(puff => {
                            return puff.puffId === response;
                        })) {
                            missingPuffIds.push(response);
                        }
                    })

                    const addPuffIdToDbRequests = missingPuffIds.map(puffId => addPuffIdToDb(user, puffId));
                    Promise.all(addPuffIdToDbRequests)
                        .then(addPuffIdToDbResults => {
                            newPuffs = addPuffIdToDbResults.map(result => {
                                if (result === false) {
                                    return res.status(400).json({
                                        "error": "CryptoPuff Sad :(",
                                        "message": "Error adding crypto puff to db!"
                                    })
                                }
                                return result;
                            }) 

                            const paginatedResults = getPaginated([...puffsInDb, ...newPuffs], page, sortBy);
                            return res.json({
                                cryptopuffs: paginatedResults
                            })

                        })
                        .catch(err => res.status(400).json({
                            "error":  err,
                            "message": "Error adding crypto puff to db!"
                        }));
                
                })
                .catch(err => res.status(400).json({
                    "error": err,
                    "message": "Error validating crypto puff with db!"
                }));
            
        })
        .catch(err => res.status(400).json({
            "error": err,
            "message": "Error fetching crypto puff data from blockchain!"
        }));
}

const getPaginated = (results, page, sortBy, pageSize = PAGE_SIZE) => {
    let sortedResults = results.filter((puff, index, self) =>
        index === self.findIndex((t) => (
            t.puffId === puff.puffId
        ))
    )
        
    if (sortBy === 'puffId' || !sortBy) {
        sortedResults = sortedResults.sort((a, b) => {
            return a.puffId - b.puffId
        });
    }

    if (sortBy === 'puffId-desc') {
        sortedResults = sortedResults.sort((a, b) => {
            return b.puffId - a.puffId
        });
    }

    if (sortBy === 'dateMinted') {
        sortedResults = sortedResults.sort((a, b) => {
            return a.dateMinted - b.dateMinted
        });
    }
    
    if (!page) {
        return sortedResults;
    } else {
        const startingPage = pageSize * (page - 1)
    
        const paginatedResults = sortedResults.slice(startingPage, pageSize * page);
        return paginatedResults;
    }
}

router.get('/', (req, res) => {
    const {
        page,
        puffId,
        sortBy,
        puffOwner,
        pageSize
    } = req.query;

    let queryObj = {};
    if (!!puffOwner) {
        queryObj = {...queryObj, puffOwner: puffOwner}
        const contract = new web3.eth.Contract(
            contractAbi,
            contractAddress,
            {
                from: puffOwner
            }
        );

        console.log(puffOwner)
    
        contract.methods.balanceOf(puffOwner).call()
            .then(numPuffs => {
                console.log(numPuffs);
                UserNft.find(queryObj)
                    .then(puffs => {
                        if (puffs.length !== parseInt(numPuffs)) {
                            // hopefully this never happens - db is not synced to blockchain
                            getUpdatedCryptoPuffs(puffOwner, numPuffs, contract, page, sortBy, res)
                        } else {
                            console.log(puffs);
                            const paginatedResults = getPaginated(puffs, page, sortBy);
                            return res.json({
                                cryptopuffs: paginatedResults
                            })
                        }
                    })
                    .catch(err => res.status(400).json({
                        "error":  err,
                        "message": "Error fetching crypto puff from db!"
                    }))
            })
            .catch(err => res.status(400).json({
                "error":  err,
                "message": "Error fetching crypto puff data blockchain!"
            }))
    } else {
        UserNft.countDocuments({})
            .then(numDocs => {
                if (!!page && !!numDocs) {
                    let startId, endId;
                    const size = !!pageSize ? pageSize : PAGE_SIZE;
                    if (sortBy === 'puffId-desc') {
                        endId = numDocs - size * (page - 1) - 1;
                        if (endId <= 0) {
                            return res.json({
                                cryptopuffs: []
                            })
                        }
                        startId = endId + 1 - size <= 0 ? 0 : endId + 1 - size;
                    } else {
                        startId = size * (page - 1);
                        if (startId >= numDocs) {
                            return res.json({
                                cryptopuffs: []
                            })
                        }
                        endId = startId + size - 1 >= numDocs ?  numDocs : startId + size - 1;
                    }
                    queryObj = {...queryObj, puffId: { $gte : startId, $lte : endId}};
                }

                if (!!puffId) {
                    queryObj = {...queryObj, puffId: puffId}
                }
        
                UserNft.find(queryObj).sort({"puffId": 1})
                    .then(puffs => {
                        return res.json({
                            cryptopuffs: puffs
                            // cryptopuffs: getPaginated(puffs, page, sortBy, pageSize)
                        })
                    })
                    .catch(err => res.status(400).json({
                        "error":  err,
                        "message": "Error fetching crypto puffs from db!"
                    }))
            })
    }
});
router.post('/add', (req, res) => {
    const { puffOwner, puffId, dateMinted } = req.body;

    const newCryptoPuff = new UserNft({
        puffId: puffId, puffOwner: puffOwner, dateMinted: dateMinted
    })

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