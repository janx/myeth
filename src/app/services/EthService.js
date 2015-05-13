var assign = require('object-assign');
var EthPanelActions = require('../actions/EthPanelActions');

function EthService(url, options) {
  this.options = assign({
    blocksLimit: 20
  }, options||{});

  this.web3 = require('web3');
  this.web3.setProvider(new this.web3.providers.HttpProvider(url));

  this.pollers = {};
}

assign(EthService.prototype, {
  getNumber: function() {
    return this.web3.eth.blockNumber;
  },

  start: function() {
    var number = this.getNumber();
    this.lastNumber = number - this.options.blocksLimit;

    this.blocks = [];
    this.network = {};
    this.myAccounts = {};

    this.slowCallback();
    this.fastCallback();

    this.pollers.slow = window.setInterval(this.slowCallback.bind(this), 10000);
    this.pollers.fast = window.setInterval(this.fastCallback.bind(this), 2000);
  },

  stop: function() {
    for(var name in this.pollers) {
      window.clearInterval(this.pollers[name]);
    }
  },

  fastCallback: function() {
    this.updateBlocks();
    this.updateMyAccounts();
    this.updateMining();

    EthPanelActions.ethServiceUpdate({
      lastNumber: this.lastNumber,
      blocks:     this.blocks,
      network:    this.network,
      mining:     this.mining,
      myAccounts: this.myAccounts
    });
  },

  slowCallback: function() {
    this.updateNetwork();
  },

  updateBlocks: function() {
    var number = this.getNumber();
    while(this.lastNumber <= number) {
      this.blocks.unshift(this.web3.eth.getBlock(this.lastNumber, false))
      this.lastNumber++;
    }
    this.blocks = this.blocks.slice(0, this.options.blocksLimit);
  },

  updateNetwork: function() {
    this.network = {
      listening: this.web3.net.listening,
      peerCount: this.web3.net.peerCount
    };
  },

  updateMyAccounts: function() {
    this.myAccounts = {
      default: this.web3.eth.defaultAccount,
      accounts: this.web3.eth.accounts.map(function(addr) {
        return {address: addr, balance: this.web3.eth.getBalance(addr)};
      })
    };
  },

  updateMining: function() {
    this.mining = {
      mining: this.web3.eth.mining
    };

    if(this.mining.mining) {
      var coinbase = this.web3.eth.coinbase || '';
      var coinbaseBalance = coinbase ? this.web3.eth.getBalance(coinbase) : 0;

      assign(this.mining, {
        coinbase: coinbase,
        coinbaseBalance: coinbaseBalance,
        hashrate: this.web3.eth.hashrate,
        gasPrice: this.web3.eth.gasPrice
      });
    };
  }

});

module.exports = EthService;
