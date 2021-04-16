const express = require('express');
const Web3 = require('web3');
const router = express.Router();

const UserNft = require('./../models/userNft')
const testContract = require('./../abi/TestContract.json');

// web 3 setup
const web3ProviderUrl = process.env.NODE_ENV === 'develop' ? 'https://data-seed-prebsc-1-s1.binance.org:8545' : 'https://bsc-dataseed1.binance.org:443'
const web3 = new Web3(web3ProviderUrl);

console.log(process.env.NODE_ENV, web3ProviderUrl)

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
                                puffs: paginatedResults
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

const getPaginated = (results, page, sortBy) => {
    let sortedResults = results;
        
    if (sortBy === 'puffId' || !sortBy) {
        sortedResults = results.sort((a, b) => {
            return a.puffId - b.puffId
        });
    }

    if (sortBy === 'dateMinted') {
        sortedResults = results.sort((a, b) => {
            return a.dateMinted - b.dateMinted
        });
    }
    
    if (!page) {
        return sortedResults;
    } else {
        const startingPage = PAGE_SIZE * (page - 1)
    
        const paginatedResults = sortedResults.slice(startingPage, PAGE_SIZE * page);
        return paginatedResults;
    }
}

router.get('/', (req, res) => {
    const {
        user,
        page,
        sortBy
    } = req.query;

    if (user) {
        const contract = new web3.eth.Contract(
            testContract,
            process.env.TEST_PUFF_CONTRACT,
            {
                from: user
            }
        );
    
        contract.methods.balanceOf(user).call()
            .then(numPuffs => {
                UserNft.find({puffOwner: user})
                    .then(puffs => {
                        if (puffs.length !== parseInt(numPuffs)) {
                            getUpdatedCryptoPuffs(user, numPuffs, contract, page, sortBy, res)
                        } else {
                            const paginatedResults = getPaginated(puffs, page, sortBy);
                            return res.json({
                                puffs: paginatedResults
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
        UserNft.find()
            .then(puffs => {
                return res.json({
                    puffs: getPaginated(puffs, page, sortBy)
                })
            })
            .catch(err => res.status(400).json({
                "error":  err,
                "message": "Error fetching crypto puffs from db!"
            }))
    }
})

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