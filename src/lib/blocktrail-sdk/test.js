exports = module.exports = {
    blocktrailSDK: require('./'),
    webworkifier: require('./test/webworkifier.test'),
    api_client: require('./test/api_client.test'),
    api_client_promises: require('./test/api_client-promises.test'),
    crypto: require('./test/crypto.test'),
    size_estimation: require('./test/size_estimation.test'),
    wallet: require('./test/wallet.test'),
    buffer: require('./test/buffer.test')
};
