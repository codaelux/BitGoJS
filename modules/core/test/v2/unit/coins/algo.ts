import * as Promise from 'bluebird';
import * as crypto from 'crypto';
import * as algosdk from 'algosdk';
import 'should';

const algoFixtures = require('../../fixtures/algo');
const co = Promise.coroutine;
const Wallet = require('../../../../src/v2/wallet');
const TestV2BitGo = require('../../../lib/test_bitgo');
const nock = require('nock');

describe('ALGO:', function() {
  let bitgo;
  let basecoin;
  let fixtures;

  before(function() {
    bitgo = new TestV2BitGo({ env: 'mock' });
    bitgo.initializeTestVars();
    basecoin = bitgo.coin('talgo');
  });

  after(function() {
    nock.cleanAll();
  });

  it('should generate a keypair from random seed', function() {
    const keyPair = basecoin.generateKeyPair();
    keyPair.should.have.property('pub');
    keyPair.should.have.property('prv');

    const address = keyPair.pub;
    basecoin.isValidAddress(address).should.equal(true);

    basecoin.isValidPub(keyPair.pub).should.equal(true);
    basecoin.isValidPrv(keyPair.prv).should.equal(true);
  });

  it('should generate a keypair from seed', function() {
    const seed = crypto.randomBytes(32);
    const keyPair = basecoin.generateKeyPair(seed);
    keyPair.should.have.property('pub');
    keyPair.should.have.property('prv');

    const address = keyPair.pub;
    basecoin.isValidAddress(address).should.equal(true);
    basecoin.isValidPub(keyPair.pub).should.equal(true);
    basecoin.isValidPrv(keyPair.prv).should.equal(true);

    // verify regenerated keyPair from seed
    const decodedSeed = algosdk.Seed.decode(keyPair.prv).seed;
    const regeneratedKeyPair = basecoin.generateKeyPair(decodedSeed);

    keyPair.pub.should.equal(regeneratedKeyPair.pub);
    keyPair.prv.should.equal(regeneratedKeyPair.prv);
  });

  it('should validate address', function() {
    const keyPair = basecoin.generateKeyPair();
    basecoin.isValidAddress(keyPair.pub).should.equal(true);
    basecoin.isValidPub(keyPair.pub).should.equal(true);
    basecoin.isValidAddress('UMYEHZ2NNBYX43CU37LMINSHR362FT4GFVWL6V5IHPRCJVPZ46H6CBYLYX').should.equal(false);
  });

  it('should validate seed', function() {
    const keyPair = basecoin.generateKeyPair();
    basecoin.isValidPrv(keyPair.prv).should.equal(true);
    basecoin.isValidPrv('UMYEHZ2NNBYX43CU37LMINSHR362FT4GFVWL6V5IHPRCJVPZ46H6CBYLYX').should.equal(false);
  });

  it('should sign message', function() {
    const keyPair = basecoin.generateKeyPair();
    const message = Buffer.from('message');
    const signature = basecoin.signMessage(keyPair, message);
    const pub = algosdk.Address.decode(keyPair.pub).publicKey;
    algosdk.NaclWrapper.verify(message, signature, pub).should.equal(true);
  });
  
  describe('Transaction Verification', function() {
    let basecoin;
    let wallet;
    let halfSignedTransaction;

    before(co(function *() {
      basecoin = bitgo.coin('talgo');
      fixtures = algoFixtures.prebuild();
      wallet = new Wallet(bitgo, basecoin, fixtures.walletData);
    }));

    it('should sign a prebuild', co(function *() {
      // sign transaction
      halfSignedTransaction = yield wallet.signTransaction({
        txPrebuild: { txData: fixtures.txData },
        prv: fixtures.userKeychain.prv,
        keychain: fixtures.userKeychain,
        backupKeychain: fixtures.backupKeychain,
        bitgoKeychain: fixtures.bitgoKeychain,
        wallet: { addressVersion: fixtures.walletData.coinSpecific.addressVersion }
      });

      Buffer.compare(Buffer.from(halfSignedTransaction.halfSigned), fixtures.signedTxBase64).should.equal(0);
    }));
  });
});
