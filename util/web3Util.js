const Web3 = require('web3');

const TestContract = require('./../abi/TestContract.json');
const contractAddress = process.env.NODE_ENV === 'development' ? process.env.REACT_APP_TEST_PUFF_CONTRACT : process.env.REACT_APP_TEST_PUFF_CONTRACT;

const getWeb3 = () =>
    new Promise(async(resolve, reject) => {
    //window.addEventListener("load", async () => {
        let web3;
        try {
            web3 = new Web3('https://data-seed-prebsc-1-s1.binance.org:8545');
            resolve(web3);
        } catch (e) {
            reject(e);
        }
    if (window.ethereum) {
        try {
        await window.ethereum.enable();
        resolve(web3);
        } catch (error) {
        reject(error);
        }
    } else if (window.web3) {
        // load metamask provider
        const web3 = window.web3;
        console.log("Injected web3 detected.");
        resolve(web3);
    } else {
        console.log(process.env.PUBLIC_URL)
        const provider = new Web3.providers.HttpProvider("http://127.0.0.1:7545");
        const web3 = new Web3(provider);
        console.log("No web3 instance injected, using Local web3.");
        resolve(web3);
    }
    //});
});

const getContract = async (web3) => {
    const contractAbi = process.env.NODE_ENV === 'development' ? TestContract : TestContract
    window.user = (await web3.eth.getAccounts())[0];
    
    window.instance = new web3.eth.Contract(
        contractAbi,
        contractAddress, // contract address here
        {
            from: window.user
        }
    );
    return window.instance;
}

const fromWei = value => {
    return (value / (1000000000000000000)).toString();
}

const toWei = value => {
    return (value * (1000000000000000000)).toString();
}

module.exports = {
    getWeb3: getWeb3,
    getContract: getContract,
    fromWei: fromWei,
    toWei: toWei
};