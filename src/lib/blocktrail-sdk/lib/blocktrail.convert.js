
var BlocktrailConverter = function() {

};

BlocktrailConverter.prototype.paginationParams = function(params) {
    return params;
};

BlocktrailConverter.prototype.getUrlForBlock = function(blockHash) {
    return "/block/" + blockHash;
};

BlocktrailConverter.prototype.getUrlForTransaction = function(txId) {
    return "/transaction/" + txId;
};

BlocktrailConverter.prototype.getUrlForBlockTransaction = function(blockHash) {
    return "/block/" + blockHash + "/transactions";
};

BlocktrailConverter.prototype.getUrlForAddress = function(address) {
    return "/address/" + address;
};

BlocktrailConverter.prototype.getUrlForAddressTransactions = function(address) {
    return "/address/" + address + "/transactions";
};

BlocktrailConverter.prototype.getUrlForAddressUnspent = function(address) {
    return "/address/" + address + "/unspent-outputs";
};

BlocktrailConverter.prototype.convertBlock = function(oldData) {
    return oldData;
};

BlocktrailConverter.prototype.convertBlockTxs = function(oldData) {
    return oldData;
};

BlocktrailConverter.prototype.convertTx = function(oldData) {
    return oldData;
};

BlocktrailConverter.prototype.convertAddressTxs = function(data) {
    return data;
};

BlocktrailConverter.prototype.convertAddress = function(data) {
    return data;
};

BlocktrailConverter.prototype.convertAddressUnspentOutputs = function(data) {
    return data;
};

BlocktrailConverter.prototype.convertBatchAddressUnspentOutputs = function(data) {
    return data;
};

BlocktrailConverter.prototype.getUrlForAllBlocks = function() {
    return "/all-blocks";
};

BlocktrailConverter.prototype.handleErros = function(self, data) {
    return data;
};


exports = module.exports = BlocktrailConverter;
