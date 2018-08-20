var Wallet = require('./wallet');
var blocktrail = require('./blocktrail');
var bitcoinJS = require('bitcoinjs-lib');

var BtccomConverter = function(network, useNewCashAddr) {
    this.network = network;
    this.useNewCashAddr = useNewCashAddr;
};

function getAddressScriptInfo(address, network, useNewCashAddr) {
    var addressScriptInfo;

    try {
        addressScriptInfo = bitcoinJS.address.toOutputScript(address, network, useNewCashAddr);
    } catch (e) {
        addressScriptInfo = null;
    }
    return addressScriptInfo;
}

function getScriptAsm(chunks) {
    var scriptAsm;

    try {
        scriptAsm = bitcoinJS.script.toASM(chunks);
    } catch (e) {
        scriptAsm = null;
    }
    return scriptAsm;
}

function prettifyAsm(asm) {
    if (!asm) {
        return asm;
    }

    return asm.replace(/^0 /, "OP_0 ");
}

function getType(script) {
    var type;

    try {
        type = bitcoinJS.script.classifyOutput(script);
    } catch (e) {
        type = null;
    }
    return type;
}

function getBase58AddressHash160(address, network, useNewCashAddr) {
    var addressInfo;
    try {
        addressInfo = Wallet.getAddressAndType(address, network, useNewCashAddr);
    } catch (e) {
        return null;
    }

    if (addressInfo.type === "base58") {
        return addressInfo.decoded.hash;
    } else if (addressInfo.type === "bech32") {
        if (addressInfo.data.length === 20) {
            return addressInfo.decoded.hash;
        }
        return null;
    } else if (addressInfo.type === "") {
        return addressInfo.decoded.hash;
    }

    return null;
}

function convertBtccomOutputScriptType(scriptType) {
    switch (scriptType) {
        case "P2PKH_PUBKEY":
            return "pubkey";
        case "P2PKH":
            return "pubkeyhash";
        case "P2SH":
            return "scripthash";
        case "P2WSH_V0":
            return "witnessscripthash";
        case "P2WPKH_V0":
            return "witnesspubkeyhash";
        case "NULL_DATA":
            return "op_return";
        case "coinbase":
            return "coinbase";
        default:
            throw new Error("Not implemented yet, script type: " + scriptType);
    }
}

function utcTimestampToISODateStr(time) {
    return (new Date(time * 1000)).toISOString().replace(/\.000Z$/, '+0000');
}

function flattenAddresses(addrs) {
    if (!addrs) {
        return addrs;
    } else if (addrs.length === 1) {
        return addrs[0];
    } else {
        return addrs;
    }
}

function convertBtccomTxToBlocktrail(tx) {
    /* jshint -W071, -W074 */
    var data = {};

    data.size = tx.vsize;
    data.hash = tx.hash;
    data.block_height = tx.block_height;
    data.time =
    data.block_time = utcTimestampToISODateStr(tx.block_time);
    data.block_hash = tx.block_hash;
    data.confirmations = tx.confirmations;
    data.is_coinbase = tx.is_coinbase;

    var totalInputValue;
    if (data.is_coinbase) {
        totalInputValue = tx.outputs[0].value - tx.fee;
    } else {
        totalInputValue = tx.inputs_value;
    }

    data.total_input_value = totalInputValue;
    data.total_output_value = tx.outputs.reduce(function(total, output) {
        return total + output.value;
    }, 0);
    data.total_fee = tx.fee;
    data.inputs = [];
    data.outputs = [];
    data.opt_in_rbf = false;

    for (var inputIdx in tx.inputs) {
        var input = tx.inputs[inputIdx];
        var scriptType;
        var inputValue;
        var inputTxid;
        var outpointIdx;

        if (input.sequence < bitcoinJS.Transaction.DEFAULT_SEQUENCE - 1) {
            data.opt_in_rbf = true;
        }

        if (data.is_coinbase && input.prev_position === -1 &&
            input.prev_tx_hash === "0000000000000000000000000000000000000000000000000000000000000000") {
            scriptType = "coinbase";
            inputTxid = null;
            inputValue = totalInputValue;
            outpointIdx = 0xffffffff;
        } else {
            scriptType = input.prev_type;
            inputValue = input.prev_value;
            inputTxid = input.prev_tx_hash;
            outpointIdx = input.prev_position;
        }

        data.inputs.push({
            index: parseInt(inputIdx, 10),
            output_hash: inputTxid,
            output_index: outpointIdx,
            value: inputValue,
            sequence: input.sequence,
            address: flattenAddresses(input.prev_addresses),
            type: convertBtccomOutputScriptType(scriptType),
            script_signature: input.script_hex
        });
    }

    for (var outIdx in tx.outputs) {
        var output = tx.outputs[outIdx];

        data.outputs.push({
            index: parseInt(outIdx, 10),
            value: output.value,
            address: flattenAddresses(output.addresses),
            type: convertBtccomOutputScriptType(output.type),
            script: prettifyAsm(output.script_asm),
            script_hex: output.script_hex,
            spent_hash: output.spent_by_tx,
            spent_index: output.spent_by_tx_position
        });
    }

    data.size = tx.size;
    data.is_double_spend = tx.is_double_spend;

    data.lock_time_timestamp = null;
    data.lock_time_block_height = null;
    if (tx.lock_time) {
        if (tx.lock_time < blocktrail.LOCK_TIME_TIMESTAMP_THRESHOLD) {
            data.lock_time_block_height = tx.lock_time;
        } else {
            data.lock_time_timestamp = tx.lock_time;
        }
    }

    // Extra fields from Btc.com
    data.is_sw_tx = tx.is_sw_tx;
    data.weight = tx.weight;
    data.witness_hash = tx.witness_hash;
    data.lock_time  = tx.lock_time;
    data.sigops = tx.sigops;
    data.version = tx.version;

    return data;
}

BtccomConverter.prototype.paginationParams = function(params) {
    if (!params) {
        return params;
    }

    if (typeof params.limit !== "undefined") {
        params.pagesize = params.limit;
        delete params.limit;
    }

    return params;
};

BtccomConverter.prototype.getUrlForBlock = function(blockHash) {
    return "/block/" + blockHash;
};

BtccomConverter.prototype.getUrlForTransaction = function(txId) {
    return "/tx/" + txId + "?verbose=3";
};

BtccomConverter.prototype.getUrlForRawTransaction = function(txId) {
    return "/tx/" + txId + "/raw";
};

BtccomConverter.prototype.getUrlForTransactions = function(txIds) {
    return "/tx/" + txIds.join(",") + "?verbose=3";
};

BtccomConverter.prototype.getUrlForBlockTransaction = function(blockHash) {
    return "/block/" + blockHash + "/tx?verbose=3";
};

BtccomConverter.prototype.getUrlForAddress = function(address) {
    return "/address/" + address;
};

BtccomConverter.prototype.getUrlForAddressTransactions = function(address) {
    return "/address/" + address + "/tx?verbose=3";
};

BtccomConverter.prototype.getUrlForAddressUnspent = function(address) {
    return "/address/" + address + "/unspent";
};

BtccomConverter.prototype.getUrlForBatchAddressUnspent = function(addresses) {
    return "/multi-address/" + addresses.join(",") + "/unspent";
};


BtccomConverter.prototype.getUrlForAllBlocks = function() {
    return "/block/list";
};

BtccomConverter.prototype.handleErros = function(self, data) {
    if (data.err_no === 0 || data.data !== null) {
        return data;
    } else {
        return {
            err_no: data.err_no,
            err_msg: data.err_msg,
            data: data.data
        };
    }
};

BtccomConverter.prototype.convertBlock = function(oldData) {
    var data = {
        hash: oldData.hash,
        version: oldData.version,
        height: oldData.height,
        block_time: utcTimestampToISODateStr(oldData.timestamp),
        arrival_time: utcTimestampToISODateStr(oldData.timestamp),
        bits: oldData.bits,
        nonce: oldData.nonce,
        merkleroot: oldData.mrkl_root,
        prev_block: oldData.prev_block_hash,
        next_block: oldData.next_block_hash,
        byte_size: oldData.stripped_size,
        difficulty: Math.floor(oldData.difficulty),
        transactions: oldData.tx_count,
        reward_block: oldData.reward_block,
        reward_fees: oldData.reward_fees,
        created_at: oldData.created_at,
        confirmations: oldData.confirmations,
        is_orphan: oldData.is_orphan,
        is_sw_block: oldData.is_sw_block,
        weight: oldData.weight,
        miningpool_name: oldData.miningpool_name || null,
        miningpool_url: oldData.miningpool_url || null,
        miningpool_slug: oldData.miningpool_slug || null
    };

    return data;
};

BtccomConverter.prototype.convertBlocks = function(oldData) {
    return {
        data: oldData.data.list,
        current_page: oldData.data.page,
        per_page: oldData.data.pagesize,
        total: oldData.data.total_count
    };
};

BtccomConverter.prototype.convertBlockTxs = function(oldData) {
    var list = [];
    oldData.data.list.forEach(function(oldTx) {
        var resTx = convertBtccomTxToBlocktrail(oldTx);

        list.push(resTx);
    });

    return {
        data: list,
        current_page: oldData.data.page,
        per_page: oldData.data.pagesize,
        total: oldData.data.total_count
    };
};

BtccomConverter.prototype.convertTx = function(oldData, rawTx) {
    var data = convertBtccomTxToBlocktrail(oldData.data);
    data.raw = rawTx;
    return data;
};

BtccomConverter.prototype.convertTxs = function(oldData) {
    var res = {};

    oldData.data
        .filter(function(tx) { return !!tx; })
        .forEach(function(oldTx) {
            var tx = convertBtccomTxToBlocktrail(oldTx);
            res[tx.hash] = tx;
        });

    return {data: res};
};

BtccomConverter.prototype.convertAddressTxs = function(oldData) {
    var data = oldData.data.list.map(function(tx) {
        var res = {};

        res.hash = tx.hash;
        res.time = utcTimestampToISODateStr(tx.block_time);
        res.confirmations = tx.confirmations;
        res.block_height = tx.block_height;
        res.block_hash = tx.block_hash;
        res.is_coinbase = tx.is_coinbase;
        res.total_input_value = tx.inputs_value;
        res.total_output_value = tx.outputs_value;
        res.total_fee = tx.fee;

        res.inputs = tx.inputs.map(function(input, inIdx) {
            return {
                index: inIdx,
                output_hash: input.prev_tx_hash,
                output_index: input.prev_position,
                value: input.prev_value,
                address: flattenAddresses(input.prev_addresses),
                type:  res.is_coinbase ? res.is_coinbase : convertBtccomOutputScriptType(input.prev_type),
                script_signature: input.script_hex
            };
        });

        res.outputs = tx.outputs.map(function(output, outIdx) {
            return {
                index: outIdx,
                value: output.value,
                address: flattenAddresses(output.addresses),
                type: convertBtccomOutputScriptType(output.type),
                script: prettifyAsm(output.script_asm),
                spent_hash: output.spent_by_tx || null,
                script_hex: output.script_hex,
                spent_index: output.spent_by_tx_position
            };
        });

        // Extra fields from Btc.com
        res.is_double_spend = tx.is_double_spend;
        res.is_sw_tx = tx.is_sw_tx;
        res.weight = tx.weight;
        res.witness_hash = tx.witness_hash;
        res.version = tx.version;

        return res;
    });

    return {
        data: data,
        current_page: oldData.data.page,
        per_page: oldData.data.pagesize,
        total: oldData.data.total_count
    };
};

BtccomConverter.prototype.convertAddress = function(oldData) {
    var data = {};

    data.address = oldData.data.address;
    data.hash160 = getBase58AddressHash160(oldData.data.address, this.network, this.useNewCashAddr).toString("hex").toUpperCase();
    data.balance = oldData.data.balance;
    data.received = oldData.data.received;
    data.sent = oldData.data.sent;
    data.transactions = oldData.data.tx_count;
    data.utxos = oldData.data.unspent_tx_count;
    data.unconfirmed_received = oldData.data.unconfirmed_received;
    data.unconfirmed_sent = oldData.data.unconfirmed_sent;
    data.unconfirmed_transactions = oldData.data.unconfirmed_tx_count;
    data.first_tx = oldData.data.first_tx;
    data.last_tx = oldData.data.last_tx;

    return data;
};

BtccomConverter.prototype.convertAddressUnspentOutputs = function(oldData, address) {
    var script = getAddressScriptInfo(address, this.network, this.useNewCashAddr);
    var script_hex = script.toString("hex");
    var script_asm = getScriptAsm(script);
    var type = getType(script);
    var data = oldData.data.list.map(function(utxo) {
        return {
            hash: utxo.tx_hash,
            confirmations: utxo.confirmations,
            value: utxo.value,
            index: utxo.tx_output_n,
            address: address,
            type: type,
            script: script_asm,
            script_hex: script_hex
        };
    });

    return {
        data: data,
        current_page: oldData.data.page,
        total: oldData.data.total_count
    };
};

BtccomConverter.prototype.convertBatchAddressUnspentOutputs = function(data) {
    var res = [];
    var total = 0;

    data.data.forEach(function(row) {
        var script = getAddressScriptInfo(row.address, this.network, this.useNewCashAddr);
        var script_hex = script.toString("hex");
        var script_asm = getScriptAsm(script);
        var type = getType(script);

        row.list.forEach(function(utxo) {
            total++;
            res.push({
                hash: utxo.tx_hash,
                index: utxo.tx_output_n,
                value: utxo.value,
                confirmations: utxo.confirmations,
                address: row.address,
                script: script_asm,
                script_hex: script_hex,
                type: type
            });
        });
    });

    return {
        data: res,
        current_page: null,
        per_page: null,
        total: total
    };
};

exports = module.exports = BtccomConverter;
